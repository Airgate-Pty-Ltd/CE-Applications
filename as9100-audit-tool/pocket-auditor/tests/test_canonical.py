"""Tests for engine/pa_canonical.py: reconciliation gate, lettered rows, snapshot, interview, sampling."""
import json
import shutil
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def scratch_dir():
    """Scratch folder inside the product folder only (no writes outside it)."""
    import uuid
    d = ROOT / "tests" / "_scratch" / uuid.uuid4().hex
    d.mkdir(parents=True)
    return d
sys.path.insert(0, str(ROOT / "engine"))
import pa_canonical as pc  # noqa: E402


class ReconciliationGateTests(unittest.TestCase):
    def test_both_standards_reconciled_with_zero_unresolved(self):
        for std in ("AS9100D", "AS9110C"):
            ok, reasons = pc.reconciliation_gate(std)
            self.assertTrue(ok, reasons)

    def test_gate_blocks_when_unresolved_rows_exist(self):
        path = ROOT / "content" / "reconciliation" / "AS9100D-reconciliation.json"
        original = path.read_text(encoding="utf-8")
        try:
            rep = json.loads(original)
            rep["status"] = "BLOCKED"
            rep["unresolved"] = [{"ref": "9.9", "status": "UNRESOLVED"}]
            path.write_text(json.dumps(rep), encoding="utf-8")
            ok, reasons = pc.reconciliation_gate("AS9100D")
            self.assertFalse(ok)
            self.assertTrue(any("unresolved" in r for r in reasons))
        finally:
            path.write_text(original, encoding="utf-8")

    def test_missing_report_blocks(self):
        ok, reasons = pc.reconciliation_gate("NOT-A-STANDARD")
        self.assertFalse(ok)
        self.assertTrue(any("missing" in r for r in reasons))


class LetteredRowTests(unittest.TestCase):
    def test_8_5_1_letters_match_licensed_sequence(self):
        rows = pc.select_rows("AS9100D", ["8.5.1"])
        letters = [r["ref"].split("(")[1][:-1] for r in rows if r["ref"].startswith("8.5.1(")]
        self.assertEqual(letters, list("abcdefghijklmnopq"))

    def test_lettered_rows_carry_locator_not_copied_wording(self):
        rows = pc.select_rows("AS9110C", ["10.2.1"])
        lettered = [r for r in rows if r.get("type") == "lettered_subparagraph"]
        self.assertTrue(lettered)
        for r in lettered:
            self.assertIn("licensed-private", r["locator"])
            self.assertIsNone(r.get("intent"))


class SnapshotTests(unittest.TestCase):
    def test_snapshot_records_source_hash_and_is_write_once(self):
        d = scratch_dir()
        try:
            pc.build_audit_snapshot("DEMO-AUDIT", "AS9110C", ["8.5.1", "10.2.1"], d, 1)
            snap = json.loads((d / "DEMO-AUDIT-AS9110C-v1.json").read_text(encoding="utf-8"))
            self.assertEqual(snap["clauses_selected"], ["8.5.1", "10.2.1"])
            self.assertEqual(len(snap["licensed_source_sha256"]), 64)
            self.assertEqual(snap["reconciliation_status"], "RECONCILED")
            with self.assertRaises(FileExistsError):
                pc.build_audit_snapshot("DEMO-AUDIT", "AS9110C", ["8.5.1"], d, 1)
        finally:
            shutil.rmtree(d)


class InterviewTests(unittest.TestCase):
    good = {"interviewee_role": "Technician", "interviewer": "Auditor B", "date_time": "2026-10-08T10:00:00",
            "location": "Bay 2", "method": "in person", "consent_state": "NOTIFIED", "notes": "n",
            "evidence_class": "direct_statement"}

    def test_complete_interview_is_valid(self):
        self.assertEqual(pc.validate_interview(self.good), [])

    def test_missing_notes_rejected(self):
        self.assertIn("missing field: notes", pc.validate_interview(dict(self.good, notes="")))

    def test_recording_requires_recorded_consent(self):
        self.assertTrue(pc.validate_interview(dict(self.good, recording=True)))

    def test_transcript_not_authoritative_until_reviewed(self):
        self.assertTrue(any("not authoritative" in e for e in pc.validate_interview(dict(self.good, transcript="t"))))


class SamplingTests(unittest.TestCase):
    good = {"population_basis": "all jobs in Q3", "selection_method": "random", "sample_identity": "J-101",
            "period": "Q3", "result": "CONFORMING", "evidence_refs": ["EV-1"], "expanded": False,
            "expansion_reason": "single conforming sample"}

    def test_complete_sample_is_valid(self):
        self.assertEqual(pc.validate_sampling(self.good), [])

    def test_nonconforming_sample_needs_expansion_decision(self):
        bad = dict(self.good, result="NONCONFORMING", expanded=None)
        self.assertTrue(any("expansion decision" in e for e in pc.validate_sampling(bad)))

    def test_no_expansion_needs_reason(self):
        self.assertTrue(any("documented reason" in e for e in pc.validate_sampling(dict(self.good, expansion_reason=""))))


if __name__ == "__main__":
    unittest.main()
