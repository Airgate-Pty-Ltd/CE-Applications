"""Tests for engine/pa_qm.py: manual import, proposed exclusions, review, manual completion, lock gate."""
import copy
import json
import sys
import unittest
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def scratch_dir():
    """Scratch folder inside the product folder only (no writes outside it)."""
    import uuid
    d = ROOT / "tests" / "_scratch" / uuid.uuid4().hex
    d.mkdir(parents=True)
    return d
sys.path.insert(0, str(ROOT / "engine"))
import pa_engine as pa  # noqa: E402
import pa_qm as qm  # noqa: E402

FIX = ROOT / "tests" / "fixtures"
TODAY = date(2026, 10, 8)
UNIVERSE = json.loads((ROOT / "content" / "audit-rule" / "clause-universe.json").read_text(encoding="utf-8"))["rows"]
VALID = {"AS9110C": {r["clause_ref"] for r in UNIVERSE if r["standard"] == "AS9110C"}}
VALID_ALL = set().union(*VALID.values())
V1 = (FIX / "SYNTHETIC-quality-manual-v1.txt")
V2 = (FIX / "SYNTHETIC-quality-manual-v2.txt")


def manual(path=V1):
    return qm.import_manual(path, "Synthetic QM Author", "SYNTHETIC_FIXTURE", "2026-10-08T09:00:00")


def proposals(path=V1, m=None):
    m = m or manual(path)
    props, errs = qm.extract_exclusions(Path(path).read_text(encoding="utf-8"), VALID_ALL, m)
    return m, props, errs


class ImportTests(unittest.TestCase):
    def test_hash_and_label_recorded(self):
        m = manual()
        self.assertEqual(len(m["sha256"]), 64)
        self.assertTrue(m["label"].startswith("SYNTHETIC"))
        self.assertEqual(m["status"], "uploaded_unreviewed")

    def test_unknown_source_class_rejected(self):
        with self.assertRaises(ValueError):
            qm.import_manual(V1, "U", "UNKNOWN", "2026-10-08T09:00:00")

    def test_missing_uploader_rejected(self):
        with self.assertRaises(ValueError):
            qm.import_manual(V1, "", "SYNTHETIC_FIXTURE", "2026-10-08T09:00:00")


class ExtractionTests(unittest.TestCase):
    def test_invalid_reference_is_kept_visible_and_reported(self):
        _, props, errs = proposals()
        self.assertEqual([p["status"] for p in props], ["proposed", "invalid_ref", "proposed"])
        self.assertEqual(len(errs), 1)
        self.assertIn("8.6.1", errs[0])

    def test_each_proposal_carries_manual_hash(self):
        m, props, _ = proposals()
        self.assertTrue(all(p["manual_sha256"] == m["sha256"] for p in props))


class ReviewTests(unittest.TestCase):
    def test_reviewer_must_differ_from_proposer(self):
        _, props, _ = proposals()
        with self.assertRaises(ValueError):
            qm.review_exclusion(props[0], "accept", "system-extraction", "2026-10-08T09:30:00")

    def test_reject_needs_note(self):
        _, props, _ = proposals()
        with self.assertRaises(ValueError):
            qm.review_exclusion(props[0], "reject", "Reviewer A", "2026-10-08T09:30:00")

    def test_amend_only_allowed_fields(self):
        _, props, _ = proposals()
        with self.assertRaises(ValueError):
            qm.review_exclusion(props[2], "amend", "Reviewer A", "2026-10-08T09:30:00",
                                amended={"status": "accepted"}, note="x")

    def test_invalid_reference_cannot_be_accepted(self):
        _, props, _ = proposals()
        with self.assertRaises(ValueError):
            qm.review_exclusion(props[1], "accept", "Reviewer A", "2026-10-08T09:30:00")

    def test_cannot_review_twice(self):
        _, props, _ = proposals()
        qm.review_exclusion(props[0], "accept", "Reviewer A", "2026-10-08T09:30:00")
        with self.assertRaises(ValueError):
            qm.review_exclusion(props[0], "reject", "Reviewer A", "2026-10-08T09:31:00", note="n")


class ManualCompletionTests(unittest.TestCase):
    def test_completion_refused_while_invalid_item_open(self):
        m, props, _ = proposals()
        for p in props:
            if p["status"] == "proposed":
                qm.review_exclusion(p, "accept", "Reviewer A", "2026-10-08T09:30:00")
        with self.assertRaises(ValueError):
            qm.complete_manual_review(m, props, "Reviewer A", "2026-10-08T09:40:00")

    def test_completion_refused_when_reviewer_is_uploader(self):
        m, props, _ = proposals(V2)
        for p in props:
            qm.review_exclusion(p, "accept", "Reviewer A", "2026-10-08T10:10:00")
        with self.assertRaises(ValueError):
            qm.complete_manual_review(m, props, "Synthetic QM Author", "2026-10-08T10:20:00")

    def test_completion_allowed_when_all_resolved(self):
        m, props, _ = proposals(V2)
        for p in props:
            qm.review_exclusion(p, "accept", "Reviewer A", "2026-10-08T10:10:00")
        qm.complete_manual_review(m, props, "Reviewer A", "2026-10-08T10:20:00")
        self.assertEqual(m["status"], "reviewed")


class LockGateTests(unittest.TestCase):
    def registry(self, **kw):
        reg = copy.deepcopy(pa.load_registry()["sources"])
        reg["AS9110C"].update(kw)
        return reg

    def reviewed_audit(self, path=V2):
        m, props, _ = proposals(path)
        for p in props:
            if p["status"] == "proposed":
                qm.review_exclusion(p, "accept", "Reviewer A", "2026-10-08T10:10:00")
        if m["status"] != "reviewed" and all(p["status"] != "invalid_ref" for p in props):
            qm.complete_manual_review(m, props, "Reviewer A", "2026-10-08T10:20:00")
        return {"sources": ["AS9110C"], "manual": m, "exclusions": props}

    def test_refused_without_manual(self):
        ok, reasons = qm.audit_lock_gate({"sources": ["AS9110C"]}, self.registry(), VALID, TODAY)
        self.assertFalse(ok)
        self.assertIn("no quality manual recorded", reasons)

    def test_refused_while_manual_unreviewed(self):
        m, props, _ = proposals(V2)
        ok, reasons = qm.audit_lock_gate({"sources": ["AS9110C"], "manual": m, "exclusions": props},
                                         self.registry(), VALID, TODAY)
        self.assertFalse(ok)
        self.assertIn("quality manual review not complete", reasons)

    def test_refused_for_unapproved_source(self):
        ok, reasons = qm.audit_lock_gate(self.reviewed_audit(), self.registry(), VALID, TODAY)
        self.assertFalse(ok)
        self.assertTrue(any("is not approved" in r for r in reasons))

    def test_refused_when_review_cycle_not_started(self):
        reg = self.registry(status="approved", licence_scope_owner="Burrana Inc.", next_review_due=None)
        ok, reasons = qm.audit_lock_gate(self.reviewed_audit(), reg, VALID, TODAY)
        self.assertFalse(ok)
        self.assertTrue(any("review cycle not started" in r for r in reasons))

    def test_refused_when_review_overdue(self):
        reg = self.registry(status="approved", licence_scope_owner="Burrana Inc.", next_review_due="2026-01-01")
        ok, reasons = qm.audit_lock_gate(self.reviewed_audit(), reg, VALID, TODAY)
        self.assertFalse(ok)
        self.assertTrue(any("overdue" in r for r in reasons))

    def test_allowed_only_when_every_condition_met(self):
        reg = self.registry(status="approved", licence_scope_owner="Burrana Inc.", next_review_due="2027-10-08")
        ok, reasons = qm.audit_lock_gate(self.reviewed_audit(), reg, VALID, TODAY)
        self.assertTrue(ok, reasons)
        self.assertEqual(reasons, [])

    def test_unresolved_exclusion_blocks_lock_even_if_everything_else_passes(self):
        reg = self.registry(status="approved", licence_scope_owner="Burrana Inc.", next_review_due="2027-10-08")
        a = self.reviewed_audit()
        a["exclusions"].append({"id": "PX-999", "ref": "8.3", "status": "proposed", "proposed_by": "system-extraction"})
        ok, reasons = qm.audit_lock_gate(a, reg, VALID, TODAY)
        self.assertFalse(ok)
        self.assertTrue(any("PX-999" in r for r in reasons))

    def test_registry_is_not_modified_by_gate(self):
        reg = self.registry(status="approved", licence_scope_owner="Burrana Inc.", next_review_due="2027-10-08")
        before = json.dumps(reg, sort_keys=True)
        qm.audit_lock_gate(self.reviewed_audit(), reg, VALID, TODAY)
        self.assertEqual(before, json.dumps(reg, sort_keys=True))


class ApprovedExclusionTests(unittest.TestCase):
    def test_accepted_exclusion_becomes_valid_na_record(self):
        m, props, _ = proposals(V2)
        for p in props:
            qm.review_exclusion(p, "accept", "Reviewer A", "2026-10-08T10:10:00")
        recs, errs = qm.approved_exclusions(props, VALID_ALL, m)
        self.assertEqual(errs, [])
        self.assertEqual(len(recs), len(props))
        self.assertTrue(all(r["status"] == "NOT_APPLICABLE" and r["approved"] for r in recs))
        self.assertTrue(all(m["sha256"] in r["evidence_links"][0] for r in recs))

    def test_rejected_exclusion_is_not_applied(self):
        m, props, _ = proposals(V2)
        qm.review_exclusion(props[0], "reject", "Reviewer A", "2026-10-08T10:10:00", note="not justified")
        qm.review_exclusion(props[1], "accept", "Reviewer A", "2026-10-08T10:12:00")
        recs, _ = qm.approved_exclusions(props, VALID_ALL, m)
        self.assertEqual([r["ref"] for r in recs], [props[1]["ref"]])


if __name__ == "__main__":
    unittest.main()
