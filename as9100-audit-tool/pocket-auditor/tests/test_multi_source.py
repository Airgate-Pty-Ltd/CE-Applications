"""Tests: multi-source selection, customer checklist ingestion, publication, the combined data flow, the 19-key
contract, and the multi-source endpoints of the 5173 recorder.

Customer checklists are written to a scratch folder (pa_selection.CUSTOMERS is pointed there for each test).
Scratch files live only in tests/_scratch inside the product folder.
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
import pa_selection as ps  # noqa: E402
import pa_qsa as qsa  # noqa: E402
import pa_qsa_records as qr  # noqa: E402
import pa_ledger as lg  # noqa: E402
import pa_export as pe  # noqa: E402
import pa_local_server as srv  # noqa: E402
import build_combined_sample as bc  # noqa: E402

CHECKLIST = qsa.load_checklist()
FAA_ORG = "REG:FAA QSA 1.0:Organizational Management:101"
STD_9110 = "STD:SAE AS9110C:8.5.1"
STD_9100 = "STD:SAE AS9100D:8.5.1"
WHEN = "2026-10-08T14:00:00"
CSV_OK = "ref,question,evidence\nC-1,Is the customer tag scheme applied?,Tag log;Bench photo\nC-2,Is first article approved?,FAI report\n"


def scratch():
    d = ROOT / "tests" / "_scratch" / uuid.uuid4().hex
    d.mkdir(parents=True)
    return d


class CustomerIngestionTests(unittest.TestCase):
    def setUp(self):
        self.root = scratch()
        self.original = ps.CUSTOMERS
        ps.CUSTOMERS = self.root / "customers"

    def tearDown(self):
        ps.CUSTOMERS = self.original
        shutil.rmtree(self.root, ignore_errors=True)

    def csv(self, text):
        p = self.root / "in.csv"
        p.write_text(text, encoding="utf-8")
        return p

    def test_valid_checklist_is_imported_with_hash_and_rows(self):
        r = ps.import_customer_checklist("CUST-A", self.csv(CSV_OK), "Customer A", "PO-123", WHEN)
        self.assertEqual(r["rows"], 2)
        data = json.loads((ps.CUSTOMERS / "CUST-A" / "checklist.json").read_text(encoding="utf-8"))
        self.assertEqual(len(data["sha256"]), 64)
        self.assertEqual(data["rows"][0]["evidence"], ["Tag log", "Bench photo"])

    def test_duplicate_reference_is_refused(self):
        with self.assertRaises(ValueError) as ctx:
            ps.import_customer_checklist("CUST-A", self.csv(CSV_OK + "C-1,Another question,Log\n"), "A", "PO", WHEN)
        self.assertIn("duplicate ref C-1", str(ctx.exception))

    def test_missing_evidence_or_question_is_refused(self):
        bad = "ref,question,evidence\nC-1,,Log\nC-2,Question?,\n"
        with self.assertRaises(ValueError) as ctx:
            ps.import_customer_checklist("CUST-A", self.csv(bad), "A", "PO", WHEN)
        self.assertIn("missing question", str(ctx.exception))
        self.assertIn("missing evidence prompt", str(ctx.exception))

    def test_existing_checklist_is_not_overwritten(self):
        ps.import_customer_checklist("CUST-A", self.csv(CSV_OK), "A", "PO", WHEN)
        with self.assertRaises(ValueError):
            ps.import_customer_checklist("CUST-A", self.csv(CSV_OK), "A", "PO", WHEN)

    def test_identifier_cannot_escape_the_customer_folder(self):
        for bad in ("../x", "a/b", "", ".hidden"):
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                ps.import_customer_checklist(bad, self.csv(CSV_OK), "A", "PO", WHEN)

    def test_owner_and_citation_are_required(self):
        with self.assertRaises(ValueError):
            ps.import_customer_checklist("CUST-A", self.csv(CSV_OK), "", "PO", WHEN)


class MultiSourceSelectionTests(unittest.TestCase):
    audit = "MULTI"

    def setUp(self):
        self.root = scratch()
        self.original = ps.CUSTOMERS
        ps.CUSTOMERS = self.root / "customers"
        p = self.root / "in.csv"
        p.write_text(CSV_OK, encoding="utf-8")
        ps.import_customer_checklist("CUST-A", p, "Customer A", "PO-123", WHEN)
        self.cust = ps.customer_criteria("CUST-A")[0]["criterion_id"]

    def tearDown(self):
        ps.CUSTOMERS = self.original
        shutil.rmtree(self.root, ignore_errors=True)

    def test_catalogue_holds_all_four_sources(self):
        cat = ps.catalogue_all(self.root, self.audit, CHECKLIST)
        labels = {c["source_label"] for c in cat}
        self.assertTrue({"FAA QSA 1.0", "SAE AS9100D", "SAE AS9110C", "CUSTOMER CUST-A"} <= labels)
        self.assertIn("14 CFR Part 145", labels)  # regulators are selectable too
        self.assertTrue(all(c["licence_use"] for c in cat))

    def test_select_across_sources_then_publish_lists_each_source_with_its_hash(self):
        ps.write_draft(self.root, self.audit, {"selected": sorted([FAA_ORG, STD_9110, STD_9100, self.cust]), "additions": []})
        pub = ps.publish(self.root, self.audit, now=WHEN)
        self.assertEqual(pub["selected_count"], 4)
        names = {s["source"] for s in pub["sources"]}
        self.assertEqual(names, {"FAA QSA 1.0", "SAE AS9110C", "SAE AS9100D", "CUSTOMER CUST-A"})
        snap = json.loads((self.root / self.audit / pub["file"]).read_text(encoding="utf-8"))
        cust_row = next(c for c in snap["criteria"] if c["criterion_id"] == self.cust)
        self.assertEqual(cust_row["licence_use"], "CUSTOMER_PRIVATE_LICENSED")
        self.assertEqual(cust_row["licence_owner"], "Customer A")

    def test_publication_refused_when_nothing_is_selected(self):
        ps.write_draft(self.root, self.audit, {"selected": [], "additions": []})
        with self.assertRaises(ValueError) as ctx:
            ps.publish(self.root, self.audit, now=WHEN)
        self.assertIn("nothing selected", str(ctx.exception))

    def test_start_audit_uses_the_combined_publication_and_draft_edits_do_not_change_it(self):
        ps.write_draft(self.root, self.audit, {"selected": sorted([FAA_ORG, STD_9110]), "additions": []})
        pub = ps.publish(self.root, self.audit, now=WHEN)
        ps.write_draft(self.root, self.audit, {"selected": [], "additions": []})
        start = qsa.start_audit(self.root, self.audit, CHECKLIST)
        self.assertEqual({c["criterion_id"] for c in start["criteria"]}, {FAA_ORG, STD_9110})
        self.assertEqual(start["sha256"], pub["sha256"])
        self.assertFalse(start["source_changed_since_publication"])

    def test_assessment_and_finding_work_on_standard_and_customer_criteria(self):
        ps.write_draft(self.root, self.audit, {"selected": sorted([STD_9110, self.cust]), "additions": []})
        ps.publish(self.root, self.audit, now=WHEN)
        ev = lg.append(self.root, self.audit, "evidence", {"evidence_type": "record_review", "description": "Record",
                       "timestamp": "2026-10-08T09:00", "location": "Office", "auditor": "A", "source_ref": "R-1"}, now=WHEN)["id"]
        qr.record_assessment(self.root, self.audit, CHECKLIST, {"criterion_id": self.cust, "applicability": "APPLICABLE",
                             "assessment": "CONFORMING", "assessor": "A", "assessed_at": WHEN, "evidence_ids": [ev]}, now=WHEN)
        qr.record_assessment(self.root, self.audit, CHECKLIST, {"criterion_id": STD_9110, "applicability": "APPLICABLE",
                             "assessment": "CONFORMING", "assessor": "A", "assessed_at": WHEN, "evidence_ids": [ev]}, now=WHEN)
        st = qr.status(self.root, self.audit, CHECKLIST)
        self.assertEqual(st["counts"]["assessed"], 2)

    def test_tampered_combined_publication_refuses_start(self):
        ps.write_draft(self.root, self.audit, {"selected": [STD_9110], "additions": []})
        pub = ps.publish(self.root, self.audit, now=WHEN)
        path = self.root / self.audit / pub["file"]
        path.write_bytes(path.read_bytes().replace(b"SAE AS9110C", b"SAE AS9110X"))
        with self.assertRaises(ValueError) as ctx:
            qsa.start_audit(self.root, self.audit, CHECKLIST)
        self.assertIn("does not match the ledger", str(ctx.exception))

    def test_unknown_criterion_is_refused_across_sources(self):
        with self.assertRaises(ValueError):
            ps.apply_action(self.root, self.audit, "select", ids=["STD:SAE AS9999:1.1"])


class CombinedFlowTests(unittest.TestCase):
    def test_combined_sample_builds_verifies_and_withholds_correctly(self):
        base = scratch()
        try:
            out = bc.build(base / "out", customers_dir=base / "customers")
            owner = json.loads((out / "owner" / "package.json").read_text(encoding="utf-8"))
            ext = json.loads((out / "external" / "package.json").read_text(encoding="utf-8"))
            for pkg in (owner, ext):
                self.assertEqual(pe.check_package(pkg), [])
                self.assertEqual(set(pkg), set(pe.PACKAGE_REQUIRED))
            self.assertEqual(pe.verify_export(out / "owner"), (True, None))
            self.assertEqual(pe.verify_export(out / "external"), (True, None))
            self.assertIn("CUST-SYNTHETIC-CUSTOMER-01", owner["sources_withheld_for_licence"])
            self.assertNotIn("REG:CUSTOMER", json.dumps(owner))
            self.assertEqual(ext["checklist_items"], [])
            self.assertEqual(set(ext["sources_withheld_for_licence"]),
                             {"AS9100D", "AS9110C", "FAA-QSA-1.0", "CUST-SYNTHETIC-CUSTOMER-01"})
        finally:
            shutil.rmtree(base, ignore_errors=True)

    def test_combined_sample_refuses_to_overwrite(self):
        base = scratch()
        try:
            (base / "out").mkdir()
            with self.assertRaises(SystemExit):
                bc.build(base / "out", customers_dir=base / "customers")
        finally:
            shutil.rmtree(base, ignore_errors=True)


class MultiSourceEndpointTests(unittest.TestCase):
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

    def test_criteria_endpoint_lists_every_source(self):
        status, view = self.call("GET", "/api/selection/criteria?audit=DEMO")
        self.assertEqual(status, 200)
        labels = {s["source"] for s in view["sources"]}
        self.assertIn("SAE AS9100D", labels)
        self.assertIn("FAA QSA 1.0", labels)
        self.assertTrue(all("condition_text" not in c for c in view["criteria"]))

    def test_select_publish_and_start_across_sources(self):
        status, _ = self.call("POST", "/api/audits/DEMO/selection/action", {"action": "select", "ids": [FAA_ORG, STD_9110]})
        self.assertEqual(status, 200)
        status, pub = self.call("POST", "/api/audits/DEMO/selection/publish", {})
        self.assertEqual(status, 201)
        self.assertEqual(pub["selected_count"], 2)
        status, start = self.call("GET", "/api/audits/DEMO/selection/start")
        self.assertEqual(status, 200)
        self.assertEqual(len(start["criteria"]), 2)

    def test_publish_with_nothing_selected_is_refused(self):
        status, body = self.call("POST", "/api/audits/DEMO/selection/publish", {})
        self.assertEqual(status, 422)
        self.assertIn("nothing selected: publication refused", body["errors"])

    def test_root_opens_the_pocket_auditor_entry_page(self):
        req = urllib.request.Request(f"http://127.0.0.1:{self.port}/", method="GET")
        with urllib.request.urlopen(req) as r:
            self.assertTrue(r.geturl().endswith("/prototype/index.html"))
            self.assertIn(b"Setup", r.read())  # the stepper starts at Setup


if __name__ == "__main__":
    unittest.main()
