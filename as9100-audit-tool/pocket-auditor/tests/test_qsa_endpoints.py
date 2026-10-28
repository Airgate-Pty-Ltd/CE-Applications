"""Tests: the FAA QSA selection endpoints of the local recorder (engine/pa_local_server.py).

Real server on 127.0.0.1 with an ephemeral port and a scratch audits root. Covers the criteria view, select and
clear, select all per element, additions, refusal of an empty publication, publication, Start Audit before and
after publication, and the origin check. Scratch files live only in tests/_scratch inside the product folder.
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
import pa_local_server as srv  # noqa: E402
import pa_qsa as qsa  # noqa: E402

CHECKLIST = qsa.load_checklist()

ORG_101 = "REG:FAA QSA 1.0:Organizational Management:101"


class QsaEndpointTests(unittest.TestCase):
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

    def call(self, method, path, body=None, origin="default"):
        data = None if body is None else json.dumps(body).encode("utf-8")
        req = urllib.request.Request(f"http://127.0.0.1:{self.port}{path}", data=data, method=method)
        if data is not None:
            req.add_header("Content-Type", "application/json")
        if origin == "default":
            req.add_header("Origin", self.origin)
        elif origin:
            req.add_header("Origin", origin)
        try:
            with urllib.request.urlopen(req) as r:
                return r.status, json.loads(r.read())
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read())

    def test_criteria_view_has_126_rows_seven_elements_and_no_condition_text(self):
        status, view = self.call("GET", "/api/qsa/criteria?audit=DEMO")
        self.assertEqual(status, 200)
        self.assertEqual(len(view["criteria"]), 126)
        self.assertEqual(len(view["elements"]), 7)
        self.assertNotIn("condition_text", json.dumps(view))
        self.assertIsNone(view["published"])

    def test_select_and_select_all_per_element(self):
        status, view = self.call("POST", "/api/audits/DEMO/qsa/selection", {"action": "select", "ids": [ORG_101]})
        self.assertEqual(status, 200)
        self.assertEqual(view["selected"], [ORG_101])
        status, view = self.call("POST", "/api/audits/DEMO/qsa/selection",
                                 {"action": "select_all", "element": "Design Control"})
        self.assertEqual(len([c for c in view["criteria"] if c["criterion_id"] in view["selected"]
                              and c["source_sheet"] == "Design Control"]), sum(1 for c in CHECKLIST["criteria"] if c["source_sheet"] == "Design Control"))

    def test_unknown_action_is_refused(self):
        status, body = self.call("POST", "/api/audits/DEMO/qsa/selection", {"action": "invert"})
        self.assertEqual(status, 422)
        self.assertIn("unknown action invert", body["errors"])

    def test_addition_without_source_is_refused(self):
        status, body = self.call("POST", "/api/audits/DEMO/qsa/additions",
                                 {"label": "ADD-0001", "question": "Is the bench label current?", "source_citation": ""})
        self.assertEqual(status, 422)
        self.assertIn("addition needs a source citation", body["errors"])

    def test_addition_is_listed_separately_and_marked(self):
        self.call("POST", "/api/audits/DEMO/qsa/additions",
                  {"label": "ADD-0001", "question": "Is the bench label current?", "source_citation": "Bench walk"})
        _, view = self.call("GET", "/api/qsa/criteria?audit=DEMO")
        add = [c for c in view["criteria"] if c["origin"] == "ADDED_BY_AUDITOR"]
        self.assertEqual(len(add), 1)
        self.assertEqual(add[0]["source_citation"], "Bench walk")

    def test_publication_refused_when_nothing_is_selected(self):
        status, body = self.call("POST", "/api/audits/DEMO/qsa/publish", {})
        self.assertEqual(status, 422)
        self.assertIn("nothing selected: publication refused", body["errors"])

    def test_start_audit_refused_before_publication(self):
        status, body = self.call("GET", "/api/audits/DEMO/qsa/start")
        self.assertEqual(status, 400)
        self.assertIn("no published selection: publish a selection before starting the audit", body["errors"])

    def test_publish_then_start_audit_uses_the_published_selection(self):
        self.call("POST", "/api/audits/DEMO/qsa/selection", {"action": "select", "ids": [ORG_101]})
        status, pub = self.call("POST", "/api/audits/DEMO/qsa/publish", {})
        self.assertEqual(status, 201)
        self.assertEqual(pub["selected_count"], 1)
        # change the draft after publishing: the audit must not change
        self.call("POST", "/api/audits/DEMO/qsa/selection", {"action": "clear_all"})
        status, start = self.call("GET", "/api/audits/DEMO/qsa/start")
        self.assertEqual(status, 200)
        self.assertEqual([c["criterion_id"] for c in start["criteria"]], [ORG_101])
        self.assertEqual(start["sha256"], pub["sha256"])

    def test_criteria_view_shows_the_latest_publication(self):
        self.call("POST", "/api/audits/DEMO/qsa/selection", {"action": "select", "ids": [ORG_101]})
        self.call("POST", "/api/audits/DEMO/qsa/publish", {})
        _, view = self.call("GET", "/api/qsa/criteria?audit=DEMO")
        self.assertEqual(view["published"]["version"], 1)

    def test_cross_origin_selection_is_refused_and_nothing_is_written(self):
        status, _ = self.call("POST", "/api/audits/DEMO/qsa/selection", {"action": "select_all"},
                              origin="http://evil.example")
        self.assertEqual(status, 403)
        self.assertFalse((self.audits / "DEMO" / "qsa" / "draft.json").exists())

    def test_tampered_published_file_refuses_start_audit(self):
        self.call("POST", "/api/audits/DEMO/qsa/selection", {"action": "select", "ids": [ORG_101]})
        self.call("POST", "/api/audits/DEMO/qsa/publish", {})
        path = self.audits / "DEMO" / "qsa" / "published-v1.json"
        path.write_bytes(path.read_bytes().replace(b"Organizational Management", b"Organisational Management"))
        status, body = self.call("GET", "/api/audits/DEMO/qsa/start")
        self.assertEqual(status, 400)
        self.assertIn("published selection does not match the ledger (changed or replaced)", body["errors"])

    def publish_one(self):
        self.call("POST", "/api/audits/DEMO/qsa/selection", {"action": "select", "ids": [ORG_101]})
        return self.call("POST", "/api/audits/DEMO/qsa/publish", {})[1]

    def evidence(self):
        status, entry = self.call("POST", "/api/audits/DEMO/records", {"record_type": "evidence", "record": {
            "evidence_type": "record_review", "description": "Certificate copy", "timestamp": "2026-10-08T09:30",
            "location": "Office", "auditor": "Auditor B", "source_ref": "CERT-2026"}})
        return entry["id"]

    def test_assessment_endpoint_records_against_the_published_criterion(self):
        self.publish_one()
        eid = self.evidence()
        status, entry = self.call("POST", "/api/audits/DEMO/qsa/assessments", {
            "criterion_id": ORG_101, "applicability": "APPLICABLE", "assessment": "CONFORMING",
            "assessor": "Auditor B", "assessed_at": "2026-10-08T15:00:00", "evidence_ids": [eid]})
        self.assertEqual(status, 201)
        self.assertEqual(entry["record"]["publication_version"], 1)

    def test_assessment_on_an_unpublished_criterion_is_refused(self):
        self.publish_one()
        status, body = self.call("POST", "/api/audits/DEMO/qsa/assessments", {
            "criterion_id": "REG:FAA QSA 1.0:Design Control:3", "applicability": "UNDECIDED",
            "assessment": "NOT_ASSESSED", "assessor": "Auditor B", "assessed_at": "2026-10-08T15:00:00"})
        self.assertEqual(status, 422)
        self.assertIn("is not in the published selection", body["errors"][0])

    def test_nonconformity_finding_without_a_car_is_refused(self):
        self.publish_one()
        eid = self.evidence()
        status, body = self.call("POST", "/api/audits/DEMO/qsa/findings", {
            "criterion_id": ORG_101, "statement": "Certificate not on file.", "proposed_by": "Auditor B",
            "proposed_classification": "MINOR_NC", "evidence_ids": [eid]})
        self.assertEqual(status, 422)
        self.assertIn("nonconformity needs a CAR reference (ledger ID, e.g. CAR-0004)", body["errors"])

    def test_lead_classification_by_the_proposer_is_refused(self):
        self.publish_one()
        eid = self.evidence()
        _, finding = self.call("POST", "/api/audits/DEMO/qsa/findings", {
            "criterion_id": ORG_101, "statement": "Certificate not on file.", "proposed_by": "Auditor B",
            "proposed_classification": "OBSERVATION", "evidence_ids": [eid]})
        status, body = self.call("POST", "/api/audits/DEMO/qsa/findings/classify", {
            "finding_id": finding["id"], "classification": "OBSERVATION", "classified_by": "Auditor B",
            "role": "LEAD_AUDITOR"})
        self.assertEqual(status, 422)
        self.assertIn("lead classifier must differ from the proposer", body["errors"])

    def test_status_endpoint_reports_counts(self):
        self.publish_one()
        eid = self.evidence()
        self.call("POST", "/api/audits/DEMO/qsa/assessments", {
            "criterion_id": ORG_101, "applicability": "APPLICABLE", "assessment": "CONFORMING",
            "assessor": "Auditor B", "assessed_at": "2026-10-08T15:00:00", "evidence_ids": [eid]})
        status, st = self.call("GET", "/api/audits/DEMO/qsa/status")
        self.assertEqual(status, 200)
        self.assertEqual(st["counts"]["published"], 1)
        self.assertEqual(st["counts"]["assessed"], 1)

    def test_non_object_body_is_a_bad_request_not_a_server_error(self):
        status, body = self.call("POST", "/api/audits/DEMO/qsa/assessments", [1, 2, 3])
        self.assertEqual(status, 400)


if __name__ == "__main__":
    unittest.main()
