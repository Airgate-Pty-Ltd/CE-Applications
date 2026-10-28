"""Tests for engine/pa_findings.py: findings linked to the snapshot, its checklist row and its evidence.

The snapshot and evidence register are in-memory fixtures, so nothing is written to disk.
"""
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "engine"))
import pa_findings as pf  # noqa: E402

SHA = "a" * 64
SNAPSHOT = {
    "standard": "AS9110C",
    "rows": [{"ref": "8.5.1"}, {"ref": "8.5.1(a)"}, {"ref": "10.2.1"}],
    "car_records": [{"car_id": "CAR-101"}],
}
EVIDENCE = [
    {"id": "EV-1", "evidence_type": "record"},
    {"id": "EV-2", "evidence_type": "interview"},
    {"id": "EV-3", "evidence_type": "observation"},
]
BASE = {
    "id": "F-1", "audit_id": "DEMO-AUDIT", "checklist_item_ref": "8.5.1(a)",
    "requirement_ids": ["STD:SAE AS9110C:8.5.1(a)"],
    "statement": "Tooling tag missing at Bay 2 on job J-101.",
    "proposed_by": "Auditor A", "status": "SUBMITTED",
    "evidence_ids": ["EV-1"], "proposed_classification": "MINOR_NC",
    "car_id": "CAR-101", "snapshot_sha256": SHA,
}


def check(**over):
    f = dict(BASE, **over)
    return pf.check_finding(f, SNAPSHOT, EVIDENCE, SHA)


class LinkTests(unittest.TestCase):
    def test_valid_linked_finding_has_no_errors(self):
        self.assertEqual(check(), [])

    def test_checklist_row_not_in_snapshot_is_refused(self):
        errs = check(checklist_item_ref="9.9", requirement_ids=["STD:SAE AS9110C:9.9"])
        self.assertTrue(any("9.9 is not a row in this snapshot" in e for e in errs), errs)

    def test_requirement_outside_snapshot_is_refused(self):
        errs = check(requirement_ids=["STD:SAE AS9110C:8.5.1(a)", "STD:SAE AS9110C:9.9"])
        self.assertTrue(any("9.9 is not in this snapshot" in e for e in errs), errs)

    def test_finding_must_link_its_own_checklist_row(self):
        errs = check(requirement_ids=["STD:SAE AS9110C:10.2.1"])
        self.assertTrue(any("does not link its own checklist row" in e for e in errs), errs)

    def test_unknown_evidence_id_is_refused(self):
        errs = check(evidence_ids=["EV-404"])
        self.assertTrue(any("EV-404 is not in the evidence register" in e for e in errs), errs)

    def test_finding_raised_against_another_snapshot_hash_is_refused(self):
        errs = check(snapshot_sha256="b" * 64)
        self.assertTrue(any("not linked to this snapshot hash" in e for e in errs), errs)


class NonconformityTests(unittest.TestCase):
    def test_nonconformity_without_car_is_refused(self):
        errs = check(car_id=None)
        self.assertIn("nonconformity needs a CAR reference", errs)

    def test_nonconformity_citing_car_outside_snapshot_is_refused(self):
        errs = check(car_id="CAR-999")
        self.assertTrue(any("CAR CAR-999 is not in this snapshot" in e for e in errs), errs)

    def test_nonconformity_with_only_interview_evidence_is_refused(self):
        errs = check(evidence_ids=["EV-2"])
        self.assertTrue(any("record, controlled document or system data" in e for e in errs), errs)

    def test_observation_does_not_need_car_or_strong_evidence(self):
        errs = check(proposed_classification="OBSERVATION", car_id=None, evidence_ids=["EV-2"])
        self.assertEqual(errs, [])


class ClassificationTests(unittest.TestCase):
    def test_lead_classification_is_recorded_separately_from_proposal(self):
        f = pf.classify(BASE, "MAJOR_NC", "Lead L", "LEAD_AUDITOR", "2026-10-08T12:00:00")
        self.assertEqual(f["proposed_classification"], "MINOR_NC")
        self.assertEqual(f["lead_classification"], "MAJOR_NC")
        self.assertEqual(f["status"], "CLASSIFIED")
        self.assertNotIn("lead_classification", BASE, "the original finding is not mutated")

    def test_proposer_cannot_classify_their_own_finding(self):
        with self.assertRaises(ValueError):
            pf.classify(BASE, "MAJOR_NC", "Auditor A", "LEAD_AUDITOR", "2026-10-08T12:00:00")

    def test_only_lead_auditor_may_classify(self):
        with self.assertRaises(ValueError):
            pf.classify(BASE, "MAJOR_NC", "Lead L", "AUDITOR", "2026-10-08T12:00:00")

    def test_lead_classification_is_not_overwritten(self):
        f = pf.classify(BASE, "MINOR_NC", "Lead L", "LEAD_AUDITOR", "2026-10-08T12:00:00")
        with self.assertRaises(ValueError):
            pf.classify(f, "MAJOR_NC", "Lead M", "LEAD_AUDITOR", "2026-10-08T13:00:00")

    def test_classified_status_without_lead_classification_is_refused(self):
        self.assertIn("CLASSIFIED status needs a lead classification", check(status="CLASSIFIED"))

    def test_lead_major_nc_is_checked_for_car_and_evidence(self):
        f = pf.classify(dict(BASE, car_id=None), "MAJOR_NC", "Lead L", "LEAD_AUDITOR", "2026-10-08T12:00:00")
        errs = pf.check_finding(f, SNAPSHOT, EVIDENCE, SHA)
        self.assertIn("nonconformity needs a CAR reference", errs)


if __name__ == "__main__":
    unittest.main()
