"""Tests for engine/pa_report.py: the audit report package built from one snapshot.

Snapshot, findings and evidence are in-memory fixtures. Only the write-once test touches disk,
inside tests/_scratch in the product folder.
"""
import copy
import shutil
import sys
import unittest
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "engine"))
import pa_report as pr  # noqa: E402
import pa_findings as pf  # noqa: E402
from pa_engine import sha256_file  # noqa: E402

SHA = "c" * 64
SNAPSHOT = {
    "record_type": "audit_snapshot_with_car",
    "audit_id": "DEMO-AUDIT",
    "standard": "AS9110C",
    "snapshot_version": 1,
    "as_of_date": "2026-10-08",
    "licensed_source_sha256": "0" * 64,
    "reconciliation_status": "RECONCILED",
    "clauses_selected": ["8", "8.5.1", "10.2.1"],
    "rows": [
        {"ref": "8", "type": "group"},
        {"ref": "8.5.1", "type": "subclause"},
        {"ref": "8.5.1(a)", "type": "lettered_subparagraph"},
        {"ref": "10.2.1", "type": "subclause"},
    ],
    "car_records": [{"car_id": "CAR-101", "linked_requirement": "STD:SAE AS9110C:8.5.1", "status": "open",
                     "state": "ACTIVE", "auditor_result": None, "flags": [], "owner": "Maintenance lead",
                     "due_date": "2026-12-01", "sampling_expansion_recommended": False}],
    "ready_for_export": True,
    "blocking_issues": [],
}
EVIDENCE = [
    {"id": "EV-1", "evidence_type": "record"},
    {"id": "EV-2", "evidence_type": "interview"},
]
FINDING = {
    "id": "F-1", "audit_id": "DEMO-AUDIT", "checklist_item_ref": "8.5.1(a)",
    "requirement_ids": ["STD:SAE AS9110C:8.5.1(a)"],
    "statement": "Tooling tag missing at Bay 2 on job J-101.",
    "proposed_by": "Auditor A", "status": "SUBMITTED",
    "evidence_ids": ["EV-1"], "proposed_classification": "MINOR_NC",
    "car_id": "CAR-101", "snapshot_sha256": SHA,
}
NONCONFORMING = {"ref": "8.5.1(a)", "result": "NONCONFORMING", "evidence_ids": ["EV-1"]}
NOT_APPLICABLE = {
    "ref": "10.2.1", "result": "NOT_APPLICABLE", "reason": "No external provider in scope",
    "qm_section_ref": "QM 4.4", "evidence_links": ["EV-QM-1"], "reviewer": "Reviewer R",
    "auditor": "Auditor A", "timestamp": "2026-10-08T09:00:00",
}


def report(snapshot=None, findings=None, assessments=None, evidence=None, sha=SHA):
    return pr.build_report(snapshot or SNAPSHOT, sha,
                           [FINDING] if findings is None else findings,
                           EVIDENCE if evidence is None else evidence,
                           [NONCONFORMING] if assessments is None else assessments,
                           "Burrana Inc.", "2026-10-08T12:00:00")


def walk_keys(o):
    if isinstance(o, dict):
        for k, v in o.items():
            yield k
            yield from walk_keys(v)
    elif isinstance(o, list):
        for v in o:
            yield from walk_keys(v)


class ReportContentTests(unittest.TestCase):
    def test_report_is_always_draft_never_approved(self):
        r = report()
        self.assertTrue(r["package_status"].startswith("DRAFT"), r["package_status"])
        self.assertNotIn("APPROVED", r["package_status"].replace("NOT APPROVED", ""))

    def test_not_assessed_lists_unassessed_rows_with_reason_and_skips_group_headings(self):
        r = report()
        self.assertEqual({x["ref"] for x in r["not_assessed"]}, {"8.5.1", "10.2.1"})
        self.assertTrue(all(x["reason"] == "no assessment recorded" for x in r["not_assessed"]))

    def test_valid_not_applicable_is_reported_and_removes_row_from_not_assessed(self):
        r = report(assessments=[NONCONFORMING, NOT_APPLICABLE])
        self.assertEqual({x["ref"] for x in r["not_assessed"]}, {"8.5.1"})
        self.assertIn("10.2.1", {a["ref"] for a in r["assessments"]})

    def test_lead_and_proposed_classification_are_shown_separately(self):
        f = pf.classify(FINDING, "MAJOR_NC", "Lead L", "LEAD_AUDITOR", "2026-10-08T11:00:00")
        r = report(findings=[f])
        shown = r["findings"][0]
        self.assertEqual(shown["proposed_classification"], "MINOR_NC")
        self.assertEqual(shown["lead_classification"], "MAJOR_NC")

    def test_report_carries_no_body_text_keys(self):
        forbidden = {"body", "body_text", "clause_text", "verbatim", "rows"}
        self.assertFalse(forbidden & set(walk_keys(report())))

    def test_report_carries_the_snapshot_identity(self):
        r = report()
        self.assertEqual(r["snapshot"]["sha256"], SHA)
        self.assertEqual(r["snapshot"]["reconciliation_status"], "RECONCILED")
        self.assertEqual(r["car_review"][0]["state"], "ACTIVE")


class RefusalTests(unittest.TestCase):
    def assertRefused(self, fragment, **kwargs):
        with self.assertRaises(ValueError) as ctx:
            report(**kwargs)
        self.assertIn(fragment, str(ctx.exception))

    def test_snapshot_not_ready_refuses_report(self):
        snap = copy.deepcopy(SNAPSHOT)
        snap["ready_for_export"] = False
        snap["blocking_issues"] = ["nonconformity NC-1: missing CAR reference"]
        self.assertRefused("snapshot: nonconformity NC-1: missing CAR reference", snapshot=snap)

    def test_finding_against_another_snapshot_hash_refuses_report(self):
        self.assertRefused("not linked to this snapshot hash", sha="d" * 64)

    def test_nonconformity_finding_without_car_refuses_report(self):
        f = dict(FINDING, car_id=None)
        self.assertRefused("nonconformity needs a CAR reference", findings=[f])

    def test_conforming_assessment_without_evidence_refuses_report(self):
        self.assertRefused("assessment needs evidence",
                           assessments=[{"ref": "8.5.1(a)", "result": "CONFORMING", "evidence_ids": []}])

    def test_assessment_citing_missing_evidence_refuses_report(self):
        self.assertRefused("EV-404 is not in the evidence register",
                           assessments=[{"ref": "8.5.1(a)", "result": "CONFORMING", "evidence_ids": ["EV-404"]}])

    def test_not_applicable_reviewed_by_the_auditor_refuses_report(self):
        na = dict(NOT_APPLICABLE, reviewer="Auditor A")
        self.assertRefused("reviewer must differ", assessments=[na])

    def test_assessment_for_row_outside_snapshot_refuses_report(self):
        self.assertRefused("ref 9.9 is not a row in this snapshot",
                           assessments=[{"ref": "9.9", "result": "CONFORMING", "evidence_ids": ["EV-1"]}])

    def test_duplicate_assessment_refuses_report(self):
        self.assertRefused("duplicate assessment", assessments=[NONCONFORMING, NONCONFORMING])

    def test_every_problem_is_listed_not_just_the_first(self):
        with self.assertRaises(ValueError) as ctx:
            report(findings=[dict(FINDING, car_id=None)], assessments=[{"ref": "8.5.1(a)", "result": "CONFORMING"}])
        msg = str(ctx.exception)
        self.assertIn("nonconformity needs a CAR reference", msg)
        self.assertIn("assessment needs evidence", msg)


class WriteOnceTests(unittest.TestCase):
    def test_report_is_written_once_and_hash_matches_bytes_on_disk(self):
        d = ROOT / "tests" / "_scratch" / uuid.uuid4().hex
        d.mkdir(parents=True)
        try:
            written = pr.write_report(report(), d, "DEMO-AUDIT-report-v1")
            path = ROOT / written["path"]
            self.assertEqual(sha256_file(path), written["sha256"])
            with self.assertRaises(FileExistsError):
                pr.write_report(report(), d, "DEMO-AUDIT-report-v1")
        finally:
            shutil.rmtree(d, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
