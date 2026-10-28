"""Tests for engine/pa_local_server.py: the local recorder for the capture screens.

Runs a real server on 127.0.0.1 with an ephemeral port. Checks record intake (valid, invalid, cross-origin,
oversized), reload after a restart, and that licensed-private/, engine/ and audits/ are never served.
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
import pa_local_server as srv  # noqa: E402

GOOD_EVIDENCE = {"evidence_type": "record_review", "description": "Calibration log for gauge G-4",
                 "timestamp": "2026-10-08T09:30", "location": "Quality office", "auditor": "Auditor B",
                 "source_ref": "CAL-LOG-2026"}


class RecorderTests(unittest.TestCase):
    def setUp(self):
        self.root = ROOT / "tests" / "_scratch" / uuid.uuid4().hex
        self.audits = self.root / "audits"
        self.audits.mkdir(parents=True)
        self.server = srv.make_server(0, product_root=ROOT, audits_root=self.audits)
        self.port = self.server.server_address[1]
        self.origin = f"http://127.0.0.1:{self.port}"
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        shutil.rmtree(self.root, ignore_errors=True)

    def request(self, method, path, body=None, origin="default"):
        data = None if body is None else (body if isinstance(body, bytes) else json.dumps(body).encode("utf-8"))
        req = urllib.request.Request(f"http://127.0.0.1:{self.port}{path}", data=data, method=method)
        if data is not None:
            req.add_header("Content-Type", "application/json")
        if origin == "default":
            req.add_header("Origin", self.origin)
        elif origin:
            req.add_header("Origin", origin)
        try:
            with urllib.request.urlopen(req) as r:
                return r.status, r.read()
        except urllib.error.HTTPError as e:
            return e.code, e.read()

    def post_record(self, record_type, record, origin="default"):
        status, body = self.request("POST", "/api/audits/DEMO-AUDIT/records",
                                    {"record_type": record_type, "record": record}, origin=origin)
        return status, json.loads(body)

    def test_valid_record_is_appended_with_an_id_and_hashes(self):
        status, entry = self.post_record("evidence", GOOD_EVIDENCE)
        self.assertEqual(status, 201)
        self.assertEqual(entry["id"], "EVD-0001")
        self.assertEqual(len(entry["entry_sha256"]), 64)
        self.assertTrue((self.audits / "DEMO-AUDIT" / "ledger.jsonl").exists())

    def test_invalid_record_is_refused_with_every_error(self):
        status, body = self.post_record("evidence", {"description": "x"})
        self.assertEqual(status, 422)
        self.assertIn("missing field: location", body["errors"])
        self.assertFalse((self.audits / "DEMO-AUDIT" / "ledger.jsonl").exists())

    def test_cross_origin_post_is_refused_and_nothing_is_written(self):
        status, body = self.post_record("evidence", GOOD_EVIDENCE, origin="http://evil.example")
        self.assertEqual(status, 403)
        self.assertFalse((self.audits / "DEMO-AUDIT" / "ledger.jsonl").exists())

    def test_request_without_origin_header_is_accepted_for_local_scripts(self):
        status, _ = self.post_record("evidence", GOOD_EVIDENCE, origin=None)
        self.assertEqual(status, 201)

    def test_oversized_body_is_refused(self):
        big = b'{"record_type":"evidence","record":{"description":"' + b"x" * (srv.MAX_BODY + 10) + b'"}}'
        status, _ = self.request("POST", "/api/audits/DEMO-AUDIT/records", big)
        self.assertEqual(status, 413)

    def test_malformed_json_is_refused(self):
        status, _ = self.request("POST", "/api/audits/DEMO-AUDIT/records", b"{not json")
        self.assertEqual(status, 400)

    def test_path_traversal_audit_id_is_refused(self):
        status, body = self.request("POST", "/api/audits/..%2Foutside/records",
                                    json.dumps({"record_type": "evidence", "record": GOOD_EVIDENCE}).encode(),
                                    origin=self.origin)
        self.assertEqual(status, 422)
        self.assertFalse((self.root / "outside").exists())

    def test_records_read_back_verified_and_survive_a_restart(self):
        self.post_record("evidence", GOOD_EVIDENCE)
        self.post_record("evidence", dict(GOOD_EVIDENCE, source_ref="CAL-LOG-2027"))
        status, body = self.request("GET", "/api/audits/DEMO-AUDIT/records")
        data = json.loads(body)
        self.assertEqual(status, 200)
        self.assertTrue(data["verified"])
        self.assertEqual([r["id"] for r in data["records"]], ["EVD-0001", "EVD-0002"])
        # restart: a new server on the same audits folder reads the same records
        self.server.shutdown()
        self.server.server_close()
        self.server = srv.make_server(0, product_root=ROOT, audits_root=self.audits)
        self.port = self.server.server_address[1]
        self.origin = f"http://127.0.0.1:{self.port}"
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        status2, body2 = self.request("GET", "/api/audits/DEMO-AUDIT/records")
        self.assertEqual(json.loads(body2)["records"], data["records"])
        status3, entry = self.post_record("evidence", dict(GOOD_EVIDENCE, source_ref="CAL-LOG-2028"))
        self.assertEqual(entry["id"], "EVD-0003")

    def test_listing_reports_a_tampered_ledger_as_not_verified(self):
        self.post_record("evidence", GOOD_EVIDENCE)
        path = self.audits / "DEMO-AUDIT" / "ledger.jsonl"
        path.write_text(path.read_text(encoding="utf-8").replace("Quality office", "Elsewhere"), encoding="utf-8")
        _, body = self.request("GET", "/api/audits/DEMO-AUDIT/records")
        data = json.loads(body)
        self.assertFalse(data["verified"])
        self.assertTrue(data["errors"])

    def test_capture_page_and_checklist_extracts_are_served(self):
        self.assertEqual(self.request("GET", "/prototype/capture.html")[0], 200)
        self.assertEqual(self.request("GET", "/prototype/capture-rules.js")[0], 200)
        self.assertEqual(self.request("GET", "/content/checklists/AS9110C.json")[0], 200)

    def test_licensed_private_engine_tests_and_audits_are_never_served(self):
        for path in ("/licensed-private/AS9110C.pdf", "/engine/pa_engine.py", "/tests/test_engine.py",
                     "/audits/DEMO-AUDIT/ledger.jsonl", "/prototype/../licensed-private/AS9110C.pdf",
                     "/prototype/../engine/pa_engine.py", "/prototype/%2e%2e/licensed-private/AS9110C.pdf",
                     "/content/checklists/"):
            with self.subTest(path=path):
                status, _ = self.request("GET", path, origin=None)
                self.assertIn(status, (302, 404), path)


if __name__ == "__main__":
    unittest.main()
