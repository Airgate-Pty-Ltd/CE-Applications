"""Tests for engine/pa_qsa_records.py and engine/pa_qsa_rules.py: FAA QSA assessments, findings and lead classification.

Covers: recording against published criteria only, evidence that must exist in the ledger, not-applicable
reviewer rule, latest-assessment-wins with history kept, nonconformity rules (CAR and strong evidence), lead
classification separate from the proposal, set once, lead differs from proposer, LEAD_AUDITOR role, status
counts, tamper detection on the ledger and the published file, and reload from disk.
Scratch audits live only in tests/_scratch inside the product folder.
"""
import json
import shutil
import sys
import unittest
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "engine"))
import pa_qsa as qsa  # noqa: E402
import pa_qsa_records as qr  # noqa: E402
import pa_ledger as lg  # noqa: E402
import pa_qsa_rules as rules  # noqa: E402

CHECKLIST = qsa.load_checklist()
ORG_101 = "REG:FAA QSA 1.0:Organizational Management:101"
MP_1 = "REG:FAA QSA 1.0:Manufacturing Processes:1"
NOT_PUBLISHED = "REG:FAA QSA 1.0:Design Control:3"
WHEN = "2026-10-08T15:00:00"


def scratch():
    d = ROOT / "tests" / "_scratch" / uuid.uuid4().hex
    d.mkdir(parents=True)
    return d


def ev(root, audit, kind="record_review", now="2026-10-08T09:31:00", **over):
    rec = {"evidence_type": kind, "description": "Production certificate copy", "timestamp": "2026-10-08T09:30",
           "location": "Quality office", "auditor": "Auditor B", "source_ref": "CERT-2026"}
    rec.update(over)
    return lg.append(root, audit, "evidence", rec, now=now)


def car(root, audit):
    rec = {"car_id": "CAR-101", "source_system": "QMS export", "linked_requirement": ORG_101,
           "problem_statement": "p", "owner": "O", "due_date": "2026-12-01", "status": "open"}
    return lg.append(root, audit, "car", rec, now=WHEN)


def interview(root, audit):
    rec = {"interviewee_role": "Technician", "interviewer": "Auditor B", "date_time": "2026-10-08T10:00",
           "location": "Bay 2", "method": "in person", "consent_state": "NOTIFIED", "notes": "n",
           "evidence_class": "direct_statement"}
    return lg.append(root, audit, "interview", rec, now="2026-10-08T10:01:00")


class RecordsTestBase(unittest.TestCase):
    audit = "DEMO"

    def setUp(self):
        self.root = scratch()
        q_draft = {"selected": sorted([ORG_101, MP_1]), "additions": []}
        qsa.write_draft(self.root, self.audit, q_draft)
        self.pub = qsa.publish(self.root, self.audit, CHECKLIST, now=WHEN)
        self.evid = ev(self.root, self.audit)["id"]

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def assess(self, **over):
        rec = {"criterion_id": ORG_101, "applicability": "APPLICABLE", "assessment": "CONFORMING",
               "assessor": "Auditor B", "assessed_at": WHEN, "evidence_ids": [self.evid]}
        rec.update(over)
        return qr.record_assessment(self.root, self.audit, CHECKLIST, rec, now=WHEN)

    def finding(self, **over):
        rec = {"criterion_id": ORG_101, "statement": "Certificate not on file at the time of audit.",
               "proposed_by": "Auditor B", "proposed_classification": "OBSERVATION",
               "evidence_ids": [self.evid]}
        rec.update(over)
        return qr.record_finding(self.root, self.audit, CHECKLIST, rec, now=WHEN)


class AssessmentTests(RecordsTestBase):
    def test_assessment_is_recorded_against_the_published_criterion(self):
        entry = self.assess()
        self.assertEqual(entry["id"], "QAS-0003")
        self.assertEqual(entry["record"]["publication_version"], 1)
        self.assertEqual(entry["record"]["publication_sha256"], self.pub["sha256"])

    def test_assessment_against_an_unpublished_criterion_is_refused(self):
        with self.assertRaises(ValueError) as ctx:
            self.assess(criterion_id=NOT_PUBLISHED)
        self.assertIn("is not in the published selection", str(ctx.exception))

    def test_assessment_citing_evidence_not_in_the_ledger_is_refused(self):
        with self.assertRaises(ValueError) as ctx:
            self.assess(evidence_ids=["EVD-9999"])
        self.assertIn("evidence EVD-9999 is not in the ledger", str(ctx.exception))

    def test_conforming_assessment_without_evidence_is_refused(self):
        with self.assertRaises(ValueError) as ctx:
            self.assess(evidence_ids=[])
        self.assertIn("CONFORMING assessment needs evidence", str(ctx.exception))

    def test_not_applicable_needs_a_reviewer_other_than_the_assessor(self):
        na = dict(applicability="NOT_APPLICABLE", assessment="NOT_APPLICABLE", reason="No such operation",
                  evidence_ids=[], reviewer="Auditor B")
        with self.assertRaises(ValueError) as ctx:
            self.assess(**na)
        self.assertIn("reviewer must differ from the assessor", str(ctx.exception))
        self.assess(**dict(na, reviewer="Lead L"))

    def test_applicability_and_assessment_must_agree_on_not_applicable(self):
        with self.assertRaises(ValueError):
            self.assess(applicability="APPLICABLE", assessment="NOT_APPLICABLE", reason="x", reviewer="Lead L", evidence_ids=[])

    def test_latest_assessment_is_current_and_earlier_ones_remain_in_the_ledger(self):
        self.assess(assessment="NONCONFORMING")
        self.assess(assessment="CONFORMING")
        st = qr.status(self.root, self.audit, CHECKLIST)
        row = next(r for r in st["criteria"] if r["criterion_id"] == ORG_101)
        self.assertEqual(row["assessment"], "CONFORMING")
        entries = lg.read_entries(lg.ledger_path(self.root, self.audit))
        self.assertEqual(sum(1 for e in entries if e["record_type"] == "qsa_assessment"), 2)


class FindingTests(RecordsTestBase):
    def test_observation_needs_evidence_but_no_car(self):
        entry = self.finding()
        self.assertEqual(entry["id"], "QFN-0003")

    def test_nonconformity_without_a_car_is_refused(self):
        with self.assertRaises(ValueError) as ctx:
            self.finding(proposed_classification="MINOR_NC")
        self.assertIn("nonconformity needs a CAR", str(ctx.exception))

    def test_nonconformity_with_interview_evidence_only_is_refused(self):
        cid = car(self.root, self.audit)["id"]
        iv = interview(self.root, self.audit)["id"]
        with self.assertRaises(ValueError) as ctx:
            self.finding(proposed_classification="MINOR_NC", car_id=cid, evidence_ids=[iv])
        self.assertIn("needs record or controlled-document evidence", str(ctx.exception))

    def test_nonconformity_with_car_and_record_evidence_is_accepted(self):
        cid = car(self.root, self.audit)["id"]
        entry = self.finding(proposed_classification="MINOR_NC", car_id=cid)
        self.assertEqual(entry["record"]["car_id"], cid)

    def test_car_not_in_the_ledger_is_refused(self):
        with self.assertRaises(ValueError) as ctx:
            self.finding(proposed_classification="MINOR_NC", car_id="CAR-0099")
        self.assertIn("CAR CAR-0099 is not in the ledger", str(ctx.exception))

    def test_finding_on_an_unpublished_criterion_is_refused(self):
        with self.assertRaises(ValueError):
            self.finding(criterion_id=NOT_PUBLISHED)

    def test_finding_with_no_statement_is_refused_by_the_rules(self):
        with self.assertRaises(ValueError) as ctx:
            self.finding(statement="")
        self.assertIn("missing field: statement", str(ctx.exception))


class ClassificationTests(RecordsTestBase):
    def setUp(self):
        super().setUp()
        self.fid = self.finding()["id"]

    def test_lead_classification_is_recorded_and_the_proposal_is_unchanged(self):
        entry = qr.classify_finding(self.root, self.audit, CHECKLIST, self.fid, "OBSERVATION", "Lead L", "LEAD_AUDITOR", WHEN)
        self.assertEqual(entry["record"]["classification"], "OBSERVATION")
        st = qr.status(self.root, self.audit, CHECKLIST)
        f = next(r for r in st["criteria"] if r["criterion_id"] == ORG_101)["findings"][0]
        self.assertEqual(f["proposed_classification"], "OBSERVATION")
        self.assertEqual(f["lead_classification"], "OBSERVATION")
        self.assertEqual(f["lead_classified_by"], "Lead L")

    def test_proposer_cannot_classify_their_own_finding(self):
        with self.assertRaises(ValueError) as ctx:
            qr.classify_finding(self.root, self.audit, CHECKLIST, self.fid, "OBSERVATION", "Auditor B", "LEAD_AUDITOR", WHEN)
        self.assertIn("must differ from the proposer", str(ctx.exception))

    def test_only_a_lead_auditor_may_classify(self):
        with self.assertRaises(ValueError) as ctx:
            qr.classify_finding(self.root, self.audit, CHECKLIST, self.fid, "OBSERVATION", "Lead L", "AUDITOR", WHEN)
        self.assertIn("only a LEAD_AUDITOR", str(ctx.exception))

    def test_lead_classification_is_set_once(self):
        qr.classify_finding(self.root, self.audit, CHECKLIST, self.fid, "OBSERVATION", "Lead L", "LEAD_AUDITOR", WHEN)
        with self.assertRaises(ValueError) as ctx:
            qr.classify_finding(self.root, self.audit, CHECKLIST, self.fid, "OFI", "Lead M", "LEAD_AUDITOR", WHEN)
        self.assertIn("is not overwritten", str(ctx.exception))

    def test_lead_nonconformity_needs_a_car(self):
        with self.assertRaises(ValueError) as ctx:
            qr.classify_finding(self.root, self.audit, CHECKLIST, self.fid, "MAJOR_NC", "Lead L", "LEAD_AUDITOR", WHEN)
        self.assertIn("nonconformity needs a CAR", str(ctx.exception))

    def test_classifying_an_unknown_finding_is_refused(self):
        with self.assertRaises(ValueError):
            qr.classify_finding(self.root, self.audit, CHECKLIST, "QFN-0099", "OBSERVATION", "Lead L", "LEAD_AUDITOR", WHEN)


class StatusAndIntegrityTests(RecordsTestBase):
    def test_status_counts_published_assessed_and_unclassified(self):
        self.assess()
        self.finding()
        st = qr.status(self.root, self.audit, CHECKLIST)
        self.assertEqual(st["counts"]["published"], 2)
        self.assertEqual(st["counts"]["assessed"], 1)
        self.assertEqual(st["counts"]["not_assessed"], 1)
        self.assertEqual(st["counts"]["findings"], 1)
        self.assertEqual(st["counts"]["findings_unclassified"], 1)

    def test_status_is_the_same_after_a_reload_from_disk(self):
        self.assess()
        first = qr.status(self.root, self.audit, CHECKLIST)
        again = qr.status(self.root, self.audit, CHECKLIST)
        self.assertEqual(first, again)

    def test_recording_is_refused_when_the_ledger_has_been_edited(self):
        path = lg.ledger_path(self.root, self.audit)
        path.write_text(path.read_text(encoding="utf-8").replace("CERT-2026", "CERT-XXXX"), encoding="utf-8")
        with self.assertRaises(ValueError) as ctx:
            self.assess()
        self.assertIn("nothing recorded", str(ctx.exception))

    def test_recording_is_refused_when_the_published_file_has_been_changed(self):
        path = self.root / self.audit / self.pub["file"]
        path.write_bytes(path.read_bytes().replace(b"Organizational Management", b"Organisational Management"))
        with self.assertRaises(ValueError) as ctx:
            self.assess()
        self.assertIn("does not match the ledger", str(ctx.exception))

    def test_source_change_is_visible_in_status(self):
        changed = dict(CHECKLIST, file_sha256="0" * 64)
        st = qr.status(self.root, self.audit, changed)
        self.assertTrue(st["source_changed_since_publication"])

    def test_assessment_cannot_be_recorded_without_a_publication(self):
        other = scratch()
        try:
            qsa.write_draft(other, "NEW", {"selected": [], "additions": []})
            ev(other, "NEW")
            with self.assertRaises(ValueError) as ctx:
                qr.record_assessment(other, "NEW", CHECKLIST, {"criterion_id": ORG_101, "applicability": "UNDECIDED",
                                     "assessment": "NOT_ASSESSED", "assessor": "A", "assessed_at": WHEN}, now=WHEN)
            self.assertIn("no published selection", str(ctx.exception))
        finally:
            shutil.rmtree(other, ignore_errors=True)


class RulesTests(unittest.TestCase):
    def test_rules_reject_unknown_vocabulary(self):
        self.assertTrue(rules.validate_assessment({"criterion_id": "x", "applicability": "MAYBE", "assessment": "OK",
                                                   "assessor": "A", "assessed_at": WHEN}))

    def test_classification_must_come_from_lead_role(self):
        errs = rules.validate_classification({"finding_id": "QFN-0001", "classification": "OFI", "classified_by": "L",
                                              "role": "AUDITOR", "classified_at": WHEN})
        self.assertIn("only a LEAD_AUDITOR may set the lead classification", errs)


if __name__ == "__main__":
    unittest.main()
