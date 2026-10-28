"""Tests for engine/pa_audit_record.py: CAR review linked into the write-once audit snapshot.

Required cases: active CAR, closed and effective CAR, closed but ineffective CAR, missing CAR
reference, snapshot immutability, source-hash preservation. Scratch files live only in
tests/_scratch inside the product folder.
"""
import json
import shutil
import sys
import unittest
import uuid
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "engine"))
import pa_audit_record as ar  # noqa: E402
from pa_engine import sha256_file  # noqa: E402

TODAY = date(2026, 10, 8)
REQ = "STD:SAE AS9110C:8.5.1"
CLAUSES = ["8.5.1"]


def scratch():
    d = ROOT / "tests" / "_scratch" / uuid.uuid4().hex
    d.mkdir(parents=True)
    return d


def car(**over):
    base = {"car_id": "CAR-101", "source_system": "QMS export", "linked_requirement": REQ,
            "problem_statement": "Tooling tag missing at Bay 2", "owner": "Maintenance lead",
            "due_date": "2026-12-01", "status": "open"}
    base.update(over)
    return base


def build(cars, ncs=(), version=1, licensed_file=None, d=None):
    d = d or scratch()
    result = ar.build_linked_snapshot("DEMO-AUDIT", "AS9110C", CLAUSES, list(cars), list(ncs),
                                      d, version, TODAY, licensed_file=licensed_file)
    path = ROOT / result["path"] if not Path(result["path"]).is_absolute() else Path(result["path"])
    snap = json.loads(path.read_text(encoding="utf-8"))
    return result, snap, path, d


class ActiveCarTests(unittest.TestCase):
    def test_active_car_is_recorded_without_blocking(self):
        d = scratch()
        try:
            result, snap, _, _ = build([car()], d=d)
            self.assertEqual(snap["car_records"][0]["state"], "ACTIVE")
            self.assertEqual(snap["car_records"][0]["problem_statement"], "Tooling tag missing at Bay 2")
            self.assertEqual(snap["car_records"][0]["owner"], "Maintenance lead")
            self.assertTrue(result["ready_for_export"], result["blocking_issues"])
        finally:
            shutil.rmtree(d, ignore_errors=True)

    def test_overdue_active_car_carries_overdue_flag(self):
        d = scratch()
        try:
            _, snap, _, _ = build([car(due_date="2026-09-01")], d=d)
            rec = snap["car_records"][0]
            self.assertEqual(rec["state"], "ACTIVE")
            self.assertIn("OVERDUE", rec["flags"])
        finally:
            shutil.rmtree(d, ignore_errors=True)


class ClosedCarTests(unittest.TestCase):
    def test_closed_and_effective_car_is_recorded_with_evidence(self):
        d = scratch()
        try:
            c = car(status="closed", auditor_result="effective", effectiveness_evidence="EV-9 follow-up audit 2026-09-20")
            result, snap, _, _ = build([c], d=d)
            rec = snap["car_records"][0]
            self.assertEqual(rec["state"], "CLOSED_EFFECTIVE")
            self.assertFalse(rec["sampling_expansion_recommended"])
            self.assertTrue(result["ready_for_export"], result["blocking_issues"])
        finally:
            shutil.rmtree(d, ignore_errors=True)

    def test_closed_as_effective_without_evidence_is_not_assumed_effective(self):
        d = scratch()
        try:
            _, snap, _, _ = build([car(status="closed", auditor_result="effective")], d=d)
            rec = snap["car_records"][0]
            self.assertEqual(rec["state"], "CLOSED_NOT_VERIFIED")
            self.assertTrue(any("CLOSED WITHOUT EFFECTIVENESS" in f for f in rec["flags"]))
        finally:
            shutil.rmtree(d, ignore_errors=True)

    def test_closed_but_ineffective_car_recommends_sampling_expansion(self):
        d = scratch()
        try:
            c = car(status="closed", auditor_result="ineffective", effectiveness_evidence="EV-10")
            result, snap, _, _ = build([c], d=d)
            rec = snap["car_records"][0]
            self.assertEqual(rec["state"], "CLOSED_INEFFECTIVE")
            self.assertTrue(rec["sampling_expansion_recommended"])
            self.assertTrue(any("INEFFECTIVE" in f for f in rec["flags"]))
            self.assertTrue(result["ready_for_export"], result["blocking_issues"])
        finally:
            shutil.rmtree(d, ignore_errors=True)


class MissingReferenceTests(unittest.TestCase):
    def test_nonconformity_without_car_reference_blocks_export(self):
        d = scratch()
        try:
            result, _, _, _ = build([car()], [{"nc_id": "NC-1", "requirement_id": REQ}], d=d)
            self.assertFalse(result["ready_for_export"])
            self.assertTrue(any("NC-1: missing CAR reference" in b for b in result["blocking_issues"]))
        finally:
            shutil.rmtree(d, ignore_errors=True)

    def test_nonconformity_citing_unknown_car_blocks_export(self):
        d = scratch()
        try:
            result, _, _, _ = build([car()], [{"nc_id": "NC-2", "car_id": "CAR-999", "requirement_id": REQ}], d=d)
            self.assertFalse(result["ready_for_export"])
            self.assertTrue(any("CAR-999 is not in the supplied" in b for b in result["blocking_issues"]))
        finally:
            shutil.rmtree(d, ignore_errors=True)

    def test_car_linked_outside_the_snapshot_blocks_export(self):
        d = scratch()
        try:
            result, _, _, _ = build([car(linked_requirement="STD:SAE AS9110C:9.2.1")], d=d)
            self.assertFalse(result["ready_for_export"])
            self.assertTrue(any("not in the selected rows" in b for b in result["blocking_issues"]))
        finally:
            shutil.rmtree(d, ignore_errors=True)

    def test_nonconformity_linked_to_a_car_with_a_different_requirement_blocks(self):
        d = scratch()
        try:
            result, _, _, _ = build([car()], [{"nc_id": "NC-3", "car_id": "CAR-101", "requirement_id": "STD:SAE AS9110C:8.5.1(a)"}], d=d)
            self.assertFalse(result["ready_for_export"])
            self.assertTrue(any("does not match CAR" in b for b in result["blocking_issues"]))
        finally:
            shutil.rmtree(d, ignore_errors=True)

    def test_valid_nonconformity_link_is_recorded(self):
        d = scratch()
        try:
            result, snap, _, _ = build([car()], [{"nc_id": "NC-4", "car_id": "CAR-101", "requirement_id": REQ}], d=d)
            self.assertTrue(result["ready_for_export"], result["blocking_issues"])
            self.assertEqual(snap["nonconformity_links"], [{"nc_id": "NC-4", "car_id": "CAR-101", "requirement_id": REQ}])
        finally:
            shutil.rmtree(d, ignore_errors=True)


class ImmutabilityTests(unittest.TestCase):
    def test_second_write_of_same_version_is_refused_and_file_unchanged(self):
        d = scratch()
        try:
            result, _, path, _ = build([car()], d=d)
            before = path.read_bytes()
            with self.assertRaises(FileExistsError):
                build([car(status="closed")], d=d, version=1)
            self.assertEqual(path.read_bytes(), before)
        finally:
            shutil.rmtree(d, ignore_errors=True)

    def test_new_version_leaves_earlier_snapshot_unchanged(self):
        d = scratch()
        try:
            r1, _, p1, _ = build([car()], d=d, version=1)
            before = p1.read_bytes()
            build([car(status="closed", auditor_result="effective", effectiveness_evidence="EV-1")], d=d, version=2)
            self.assertEqual(p1.read_bytes(), before)
        finally:
            shutil.rmtree(d, ignore_errors=True)


class SourceHashTests(unittest.TestCase):
    def test_snapshot_records_the_reconciled_licensed_hash(self):
        d = scratch()
        try:
            rec = json.loads((ROOT / "content" / "reconciliation" / "AS9110C-reconciliation.json").read_text(encoding="utf-8"))
            result, snap, _, _ = build([car()], d=d)
            self.assertEqual(snap["licensed_source_sha256"], rec["licensed_sha256"])
            self.assertEqual(snap["licensed_source_sha256_on_disk"], rec["licensed_sha256"])
            self.assertTrue(result["ready_for_export"], result["blocking_issues"])
        finally:
            shutil.rmtree(d, ignore_errors=True)

    def test_changed_licensed_file_blocks_export(self):
        d = scratch()
        try:
            other = d / "other-copy.pdf"
            other.write_bytes(b"different bytes")
            result, snap, _, _ = build([car()], d=d, licensed_file=other)
            self.assertFalse(result["ready_for_export"])
            self.assertTrue(any("differs from the reconciliation record" in b for b in result["blocking_issues"]))
            self.assertNotEqual(snap["licensed_source_sha256_on_disk"], snap["licensed_source_sha256"])
        finally:
            shutil.rmtree(d, ignore_errors=True)

    def test_missing_licensed_file_blocks_export(self):
        d = scratch()
        try:
            result, _, _, _ = build([car()], d=d, licensed_file=d / "absent.pdf")
            self.assertFalse(result["ready_for_export"])
            self.assertTrue(any("not found on disk" in b for b in result["blocking_issues"]))
        finally:
            shutil.rmtree(d, ignore_errors=True)

    def test_returned_hash_matches_bytes_on_disk(self):
        d = scratch()
        try:
            result, _, path, _ = build([car()], d=d)
            self.assertTrue(ar.verify_snapshot(path, result["sha256"]))
            self.assertEqual(sha256_file(path), result["sha256"])
        finally:
            shutil.rmtree(d, ignore_errors=True)

    def test_tampered_copy_fails_verification(self):
        d = scratch()
        try:
            result, _, path, _ = build([car()], d=d)
            tampered = d / "tampered.json"
            tampered.write_bytes(path.read_bytes().replace(b"Tooling tag missing", b"Tooling tag present"))
            self.assertFalse(ar.verify_snapshot(tampered, result["sha256"]))
        finally:
            shutil.rmtree(d, ignore_errors=True)


class ValidationTests(unittest.TestCase):
    def test_car_missing_required_field_is_a_blocker_not_a_record(self):
        d = scratch()
        try:
            bad = car()
            del bad["owner"]
            result, snap, _, _ = build([bad], d=d)
            self.assertEqual(snap["car_records"], [])
            self.assertFalse(result["ready_for_export"])
            self.assertTrue(any("missing field: owner" in b for b in result["blocking_issues"]))
        finally:
            shutil.rmtree(d, ignore_errors=True)

    def test_duplicate_car_id_is_a_blocker(self):
        d = scratch()
        try:
            result, snap, _, _ = build([car(), car()], d=d)
            self.assertEqual(len(snap["car_records"]), 1)
            self.assertTrue(any("duplicate car_id" in b for b in result["blocking_issues"]))
        finally:
            shutil.rmtree(d, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
