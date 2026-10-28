"""Tests for raising findings and CARs from criteria, and for the snapshot standards taken from the scope.
Scratch audits live only in tests/_scratch inside the product folder.
"""
import shutil
import sys
import unittest
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "engine"))
import pa_ledger as lg  # noqa: E402
import pa_qsa as qsa  # noqa: E402
import pa_qsa_records as qr  # noqa: E402
import pa_review as rv  # noqa: E402
import pa_selection as sel  # noqa: E402

CHECKLIST = qsa.load_checklist()
ORG_101 = "REG:FAA QSA 1.0:Organizational Management:101"
AS9100D_851 = "STD:SAE AS9100D:8.5.1"
WHEN = "2026-10-08T11:00:00"


def scratch():
    d = ROOT / "tests" / "_scratch" / uuid.uuid4().hex
    d.mkdir(parents=True)
    return d


class RaiseFromCriterionTests(unittest.TestCase):
    audit = "RAISE"

    def setUp(self):
        self.root = scratch()
        qsa.write_draft(self.root, self.audit, {"selected": [ORG_101], "additions": []})
        qsa.publish(self.root, self.audit, CHECKLIST, now=WHEN)

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def evidence(self, evidence_type="record_review"):
        rec = {"evidence_type": evidence_type, "description": "Calibration log", "timestamp": WHEN,
               "location": "Bay 2", "auditor": "Auditor B", "source_ref": "CAL-1"}
        return lg.append(self.root, self.audit, "evidence", rec, now=WHEN)["id"]

    def car(self):
        rec = {"car_id": "RAISE-C1", "source_system": "Pocket Auditor", "linked_requirement": ORG_101,
               "problem_statement": "Calibration record missing", "owner": "Maria Quality",
               "due_date": "2026-11-30", "status": "open"}
        return lg.append(self.root, self.audit, "car", rec, now=WHEN)["id"]

    def finding(self, cls, evidence_ids, car_id=None):
        rec = {"criterion_id": ORG_101, "statement": "Calibration record missing", "proposed_by": "Auditor B",
               "proposed_classification": cls, "evidence_ids": evidence_ids}
        if car_id:
            rec["car_id"] = car_id
        return qr.record_finding(self.root, self.audit, CHECKLIST, rec, WHEN)

    def test_nonconformity_without_a_car_is_refused(self):
        with self.assertRaises(ValueError) as ctx:
            self.finding("MAJOR_NC", [self.evidence()])
        self.assertIn("nonconformity needs a CAR reference", str(ctx.exception))

    def test_nonconformity_with_a_car_and_record_evidence_is_recorded(self):
        car_id = self.car()
        entry = self.finding("MAJOR_NC", [self.evidence()], car_id)
        self.assertTrue(entry["id"].startswith("QFN-"))
        status = qr.status(self.root, self.audit, CHECKLIST)
        row = next(c for c in status["criteria"] if c["criterion_id"] == ORG_101)
        self.assertEqual(row["findings"][0]["proposed_classification"], "MAJOR_NC")
        self.assertEqual(row["findings"][0]["car_id"], car_id)

    def test_nonconformity_needs_record_evidence_not_just_observation(self):
        with self.assertRaises(ValueError) as ctx:
            self.finding("MINOR_NC", [self.evidence("observation")], self.car())
        self.assertIn("nonconformity needs record or controlled-document evidence", str(ctx.exception))

    def test_observation_needs_evidence_but_no_car(self):
        entry = self.finding("OBSERVATION", [self.evidence("observation")])
        self.assertTrue(entry["id"].startswith("QFN-"))


class SnapshotStandardsTests(unittest.TestCase):
    def setUp(self):
        self.root = scratch()

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def test_no_standard_is_offered_until_a_clause_is_selected(self):
        self.assertEqual(rv.scoped_standards(self.root, "NOSCOPE"), [])

    def test_only_the_standard_with_a_selected_clause_is_offered(self):
        sel.apply_action(self.root, "SCOPED", "select", ids=[AS9100D_851])
        self.assertEqual(rv.scoped_standards(self.root, "SCOPED"), ["AS9100D"])


if __name__ == "__main__":
    unittest.main()
