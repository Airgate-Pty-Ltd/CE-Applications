"""Tests for engine/pa_ledger.py: append-only, hash-chained capture ledger.

Covers append and reload, refusal of invalid records, and tamper detection (edit, delete, reorder,
truncate). Every file is written under tests/_scratch in the product folder.
"""
import json
import shutil
import sys
import unittest
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "engine"))
import pa_ledger as lg  # noqa: E402

GOOD_EVIDENCE = {"evidence_type": "record_review", "description": "Calibration log for gauge G-4",
                 "timestamp": "2026-10-08T09:30", "location": "Quality office", "auditor": "Auditor B",
                 "source_ref": "CAL-LOG-2026"}
GOOD_INTERVIEW = {"interviewee_role": "Technician", "interviewer": "Auditor B", "date_time": "2026-10-08T10:00",
                  "location": "Bay 2", "method": "in person", "consent_state": "NOTIFIED", "notes": "n",
                  "evidence_class": "direct_statement"}
GOOD_PHOTO = {"caption": "Bench 2 tooling tag", "what_it_proves": "tool is tagged", "area_or_location": "Bay 2",
              "auditor": "Auditor B", "timestamp": "2026-10-08T11:00", "requirement_id": "STD:SAE AS9110C:7.1.5.2",
              "file_name": "bench.jpg", "sha256": "ab" * 32}


def scratch():
    d = ROOT / "tests" / "_scratch" / uuid.uuid4().hex
    d.mkdir(parents=True)
    return d


def fill(root, audit="DEMO-AUDIT"):
    lg.append(root, audit, "evidence", GOOD_EVIDENCE, now="2026-10-08T09:31:00")
    lg.append(root, audit, "interview", GOOD_INTERVIEW, now="2026-10-08T10:01:00")
    lg.append(root, audit, "photo", GOOD_PHOTO, now="2026-10-08T11:01:00")
    return lg.ledger_path(root, audit)


def lines(path):
    return path.read_text(encoding="utf-8").splitlines()


def rewrite(path, new_lines):
    path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")


class AppendAndReloadTests(unittest.TestCase):
    def setUp(self):
        self.root = scratch()

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def test_ids_are_sequential_by_type_and_the_chain_verifies(self):
        path = fill(self.root)
        entries = lg.read_entries(path)
        self.assertEqual([e["id"] for e in entries], ["EVD-0001", "INT-0002", "PHO-0003"])
        errors, head = lg.verify(entries)
        self.assertEqual(errors, [])
        self.assertEqual(head, entries[-1]["entry_sha256"])

    def test_reload_from_disk_gives_the_same_records_and_head(self):
        path = fill(self.root)
        first = lg.read_entries(path)
        again = lg.read_entries(path)  # a fresh read, as after a restart
        self.assertEqual(first, again)
        self.assertEqual(lg.verify(again)[1], first[-1]["entry_sha256"])

    def test_appending_after_reload_continues_the_chain(self):
        path = fill(self.root)
        lg.append(self.root, "DEMO-AUDIT", "evidence", dict(GOOD_EVIDENCE, source_ref="CAL-LOG-2027"))
        entries = lg.read_entries(path)
        self.assertEqual(entries[-1]["id"], "EVD-0004")
        self.assertEqual(lg.verify(entries)[0], [])

    def test_invalid_record_is_refused_and_nothing_is_written(self):
        path = fill(self.root)
        before = path.read_bytes()
        with self.assertRaises(ValueError) as ctx:
            lg.append(self.root, "DEMO-AUDIT", "interview", dict(GOOD_INTERVIEW, consent_state="VERBAL_OK"))
        self.assertIn("consent_state not recognised", str(ctx.exception))
        self.assertEqual(path.read_bytes(), before)

    def test_unknown_record_type_is_refused(self):
        with self.assertRaises(ValueError):
            lg.append(self.root, "DEMO-AUDIT", "note", {"text": "x"})

    def test_audit_id_cannot_escape_the_audits_root(self):
        for bad in ("../outside", "a/b", "", "..", ".hidden"):
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                lg.ledger_path(self.root, bad)

    def test_an_empty_ledger_verifies_with_the_genesis_head(self):
        self.assertEqual(lg.verify([]), ([], lg.GENESIS))


class TamperTests(unittest.TestCase):
    def setUp(self):
        self.root = scratch()
        self.path = fill(self.root)
        self.original = lines(self.path)

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def test_edited_record_is_detected(self):
        edited = json.loads(self.original[1])
        edited["record"]["notes"] = "edited after the fact"
        rewrite(self.path, [self.original[0], json.dumps(edited, sort_keys=True, separators=(",", ":")), self.original[2]])
        errors, _ = lg.verify(lg.read_entries(self.path))
        self.assertTrue(any("INT-0002: record does not match its hash" in e for e in errors), errors)

    def test_edit_with_recomputed_record_hash_is_still_detected_by_the_entry_hash(self):
        entry = json.loads(self.original[1])
        entry["record"]["notes"] = "edited"
        entry["record_sha256"] = lg.sha_text(lg.canonical(entry["record"]))
        rewrite(self.path, [self.original[0], json.dumps(entry, sort_keys=True, separators=(",", ":")), self.original[2]])
        errors, _ = lg.verify(lg.read_entries(self.path))
        self.assertTrue(any("entry does not match its hash" in e for e in errors), errors)

    def test_deleted_middle_entry_is_detected(self):
        rewrite(self.path, [self.original[0], self.original[2]])
        errors, _ = lg.verify(lg.read_entries(self.path))
        self.assertTrue(any("sequence break" in e for e in errors), errors)
        self.assertTrue(any("chain broken" in e for e in errors), errors)

    def test_reordered_entries_are_detected(self):
        rewrite(self.path, [self.original[1], self.original[0], self.original[2]])
        errors, _ = lg.verify(lg.read_entries(self.path))
        self.assertTrue(errors)

    def test_append_refuses_to_extend_a_broken_ledger(self):
        rewrite(self.path, [self.original[0], self.original[2]])
        before = self.path.read_bytes()
        with self.assertRaises(ValueError) as ctx:
            lg.append(self.root, "DEMO-AUDIT", "evidence", GOOD_EVIDENCE)
        self.assertIn("nothing appended", str(ctx.exception))
        self.assertEqual(self.path.read_bytes(), before)

    def test_truncated_tail_verifies_but_fails_against_a_recorded_head(self):
        head_before = lg.verify(lg.read_entries(self.path))[1]
        rewrite(self.path, self.original[:2])
        entries = lg.read_entries(self.path)
        self.assertEqual(lg.verify(entries)[0], [])  # the chain itself is intact
        errors = lg.check_head(entries, head_before)  # but the recorded head no longer matches
        self.assertTrue(errors)
        self.assertIn("does not match the head recorded", errors[0])

    def test_untouched_ledger_matches_its_head(self):
        head = lg.verify(lg.read_entries(self.path))[1]
        self.assertEqual(lg.check_head(lg.read_entries(self.path), head), [])


if __name__ == "__main__":
    unittest.main()
