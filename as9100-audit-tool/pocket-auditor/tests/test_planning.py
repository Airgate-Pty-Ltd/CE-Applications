"""Tests for quality-manual-first planning: manual before exclusions, exclusions only in the published scope, reviewer
rules, completion gate, the not-applicable link to an accepted exclusion, and the start gate on the recorder.
Scratch audits live only in tests/_scratch inside the product folder.
"""
import json
import shutil
import sys
import threading
import unittest
import urllib.error
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "engine"))
import pa_qsa as qsa  # noqa: E402
import pa_qsa_records as qr  # noqa: E402
import pa_planning as pl  # noqa: E402
import pa_planning_rules as rules  # noqa: E402
import pa_local_server as srv  # noqa: E402

CHECKLIST = qsa.load_checklist()
ORG_101 = "REG:FAA QSA 1.0:Organizational Management:101"
MP_1 = "REG:FAA QSA 1.0:Manufacturing Processes:1"
WHEN = "2026-10-08T11:00:00"
SHA = "ab" * 32


def scratch():
    d = ROOT / "tests" / "_scratch" / uuid.uuid4().hex
    d.mkdir(parents=True)
    return d


def manual(**over):
    rec = {"file_name": "QM rev 7.pdf", "sha256": SHA, "uploader": "QM owner", "uploaded_on": "2026-10-08T10:00:00",
           "source_class": "CUSTOMER_UPLOAD"}
    rec.update(over)
    return rec


def exclusion(criterion=ORG_101, **over):
    rec = {"criterion_id": criterion, "qm_section_ref": "QM 4.4", "reason": "No such operation",
           "proposed_by": "Auditor B"}
    rec.update(over)
    return rec


class PlanningRuleTests(unittest.TestCase):
    def test_manual_needs_a_hash_and_a_known_class(self):
        self.assertEqual(rules.validate_manual(manual()), [])
        self.assertIn("sha256 is not a SHA-256 hex digest", rules.validate_manual(manual(sha256="xyz")))
        self.assertIn("source_class must be CUSTOMER_UPLOAD or SYNTHETIC_FIXTURE", rules.validate_manual(manual(source_class="X")))

    def test_reject_needs_a_note_and_amend_only_changes_section_or_reason(self):
        self.assertIn("rejection needs a note", rules.validate_exclusion_review(
            {"exclusion_id": "QEX-1", "action": "reject", "reviewer": "L", "reviewed_at": WHEN}, "Auditor B"))
        self.assertIn("only qm_section_ref, reason can be amended", rules.validate_exclusion_review(
            {"exclusion_id": "QEX-1", "action": "amend", "reviewer": "L", "reviewed_at": WHEN, "note": "n",
             "amended": {"criterion_id": "x"}}, "Auditor B"))

    def test_reviewer_must_differ_from_proposer_and_uploader(self):
        self.assertIn("reviewer must differ from the proposer", rules.validate_exclusion_review(
            {"exclusion_id": "QEX-1", "action": "accept", "reviewer": "Auditor B", "reviewed_at": WHEN}, "Auditor B"))
        self.assertIn("manual reviewer must differ from the uploader", rules.validate_review_complete(
            {"reviewer": "QM owner", "completed_at": WHEN}, "QM owner"))


class PlanningServiceTests(unittest.TestCase):
    audit = "PLAN"

    def setUp(self):
        self.root = scratch()
        qsa.write_draft(self.root, self.audit, {"selected": sorted([ORG_101, MP_1]), "additions": []})
        qsa.publish(self.root, self.audit, CHECKLIST, now=WHEN)

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def test_exclusion_needs_the_manual_first(self):
        with self.assertRaises(ValueError) as ctx:
            pl.propose_exclusion(self.root, self.audit, exclusion(), WHEN)
        self.assertIn("quality-manual-first", str(ctx.exception))

    def test_exclusion_must_be_in_the_published_scope(self):
        pl.record_manual(self.root, self.audit, manual(), WHEN)
        with self.assertRaises(ValueError) as ctx:
            pl.propose_exclusion(self.root, self.audit, exclusion("REG:FAA QSA 1.0:Design Control:3"), WHEN)
        self.assertIn("is not in the published scope", str(ctx.exception))

    def test_manual_is_recorded_once(self):
        pl.record_manual(self.root, self.audit, manual(), WHEN)
        with self.assertRaises(ValueError):
            pl.record_manual(self.root, self.audit, manual(), WHEN)

    def test_full_planning_path_reaches_ready(self):
        pl.record_manual(self.root, self.audit, manual(), WHEN)
        ex = pl.propose_exclusion(self.root, self.audit, exclusion(), WHEN)["id"]
        self.assertFalse(pl.planning_state(self.root, self.audit)["ready"])
        pl.review_exclusion(self.root, self.audit, ex, "accept", "Lead L", None, None, WHEN)
        pl.complete_review(self.root, self.audit, "Reviewer R", WHEN)
        state = pl.planning_state(self.root, self.audit)
        self.assertTrue(state["ready"], state["reasons"])
        self.assertIn(ORG_101, pl.accepted_exclusion_criteria(self.root, self.audit))

    def test_completion_is_blocked_by_an_unresolved_exclusion(self):
        pl.record_manual(self.root, self.audit, manual(), WHEN)
        pl.propose_exclusion(self.root, self.audit, exclusion(), WHEN)
        with self.assertRaises(ValueError) as ctx:
            pl.complete_review(self.root, self.audit, "Reviewer R", WHEN)
        self.assertIn("unresolved exclusions", str(ctx.exception))

    def test_a_reviewed_exclusion_is_not_reviewed_again(self):
        pl.record_manual(self.root, self.audit, manual(), WHEN)
        ex = pl.propose_exclusion(self.root, self.audit, exclusion(), WHEN)["id"]
        pl.review_exclusion(self.root, self.audit, ex, "reject", "Lead L", "Not justified", None, WHEN)
        with self.assertRaises(ValueError):
            pl.review_exclusion(self.root, self.audit, ex, "accept", "Lead L", None, None, WHEN)

    def test_not_applicable_needs_an_accepted_exclusion_once_a_manual_exists(self):
        pl.record_manual(self.root, self.audit, manual(), WHEN)
        na = {"criterion_id": ORG_101, "applicability": "NOT_APPLICABLE", "assessment": "NOT_APPLICABLE",
              "assessor": "Auditor B", "assessed_at": WHEN, "reason": "No such operation", "reviewer": "Lead L"}
        with self.assertRaises(ValueError) as ctx:
            qr.record_assessment(self.root, self.audit, CHECKLIST, na, now=WHEN)
        self.assertIn("accepted quality-manual exclusion", str(ctx.exception))
        ex = pl.propose_exclusion(self.root, self.audit, exclusion(), WHEN)["id"]
        pl.review_exclusion(self.root, self.audit, ex, "accept", "Lead L", None, None, WHEN)
        qr.record_assessment(self.root, self.audit, CHECKLIST, na, now=WHEN)


class StartGateTests(unittest.TestCase):
    def setUp(self):
        self.root = ROOT / "tests" / "_scratch" / uuid.uuid4().hex
        self.audits = self.root / "audits"
        self.audits.mkdir(parents=True)
        self.server = srv.make_server(0, product_root=ROOT, audits_root=self.audits)
        self.port = self.server.server_address[1]
        self.origin = f"http://127.0.0.1:{self.port}"
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        shutil.rmtree(self.root, ignore_errors=True)

    def call(self, method, path, body=None):
        data = None if body is None else json.dumps(body).encode("utf-8")
        req = urllib.request.Request(f"http://127.0.0.1:{self.port}{path}", data=data, method=method)
        if data is not None:
            req.add_header("Content-Type", "application/json")
        req.add_header("Origin", self.origin)
        try:
            with urllib.request.urlopen(req) as r:
                return r.status, json.loads(r.read())
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read())

    def test_audit_cannot_start_until_planning_is_complete(self):
        self.call("POST", "/api/audits/GATE/selection/action", {"action": "select", "ids": [ORG_101]})
        self.call("POST", "/api/audits/GATE/selection/publish", {})
        self.call("POST", "/api/audits/GATE/setup", {"audit_type": "SUPPLIER", "audit_id": "GATE", "title": "T",
                  "objectives": "O", "lead_auditor": "A", "team": [], "auditee_contact": "M",
                  "independence": {"conflict": False, "statement": "none"}, "site": "S", "method": "ON_SITE",
                  "start": "2026-11-02T09:00:00", "end": "2026-11-03T16:00:00", "report_due": "2026-11-10",
                  "sponsor_approver": "Q", "permissions": {"safety": "x", "confidentiality": "x", "access": "x", "photos": False}})
        status, body = self.call("POST", "/api/audits/GATE/status", {"status": "IN_PROGRESS", "changed_by": "Lead"})
        self.assertEqual(status, 422)
        self.assertIn("planning is not complete", body["errors"][0])
        status, state = self.call("GET", "/api/audits/GATE/planning")
        self.assertFalse(state["ready"])
        self.assertIn("quality manual not recorded", state["reasons"])


    def test_report_summary_counts_conduct_assessments_for_the_snapshot_standard(self):
        std = "STD:SAE AS9100D:8.5.1"
        self.call("POST", "/api/audits/REP/selection/action", {"action": "select", "ids": [std]})
        self.call("POST", "/api/audits/REP/selection/publish", {})
        status, ev = self.call("POST", "/api/audits/REP/records", {"record_type": "evidence", "record": {
            "evidence_type": "record_review", "description": "Calibration log", "timestamp": "2026-11-02T10:00",
            "location": "Bay 2", "auditor": "Auditor B", "source_ref": "CAL-LOG-1"}})
        status, _ = self.call("POST", "/api/audits/REP/qsa/assessments", {"criterion_id": std, "applicability": "APPLICABLE",
                              "assessment": "NONCONFORMING", "assessor": "Auditor B", "assessed_at": "2026-11-02T11:00:00",
                              "evidence_ids": [ev["id"]]})
        self.assertEqual(status, 201)
        status, snap = self.call("POST", "/api/audits/REP/snapshot", {"standard": "AS9100D"})
        self.assertEqual(status, 201, snap)
        status, rep = self.call("GET", "/api/audits/REP/report")
        self.assertEqual(status, 200, rep)
        self.assertEqual(rep["counts"]["assessed"], 1)
        self.assertEqual(rep["counts"]["not_assessed"], rep["counts"]["snapshot_rows"] - 1)


if __name__ == "__main__":
    unittest.main()
