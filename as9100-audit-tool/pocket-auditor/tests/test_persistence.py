"""Tests: capture records persisted from the ledger into snapshots, reports and the export package.

Covers reload (rebuild from disk gives the same records), snapshot and ledger tamper detection, cross-record
checks (a sampling record must cite evidence in the ledger), draft status, and IDs and hashes carried into the
report and export. Scratch files live only in tests/_scratch inside the product folder.
"""
import copy
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
import pa_ledger as lg  # noqa: E402
import pa_report as pr  # noqa: E402
import pa_export as pe  # noqa: E402
from pa_engine import load_registry, sha256_file  # noqa: E402

TODAY = date(2026, 10, 8)
CLAUSES = ["8.5.1"]
GOOD_EVIDENCE = {"evidence_type": "record_review", "description": "Calibration log for gauge G-4",
                 "timestamp": "2026-10-08T09:30", "location": "Quality office", "auditor": "Auditor B",
                 "source_ref": "CAL-LOG-2026"}
GOOD_PHOTO = {"caption": "Bench 2 tooling tag", "what_it_proves": "tool is tagged", "area_or_location": "Bay 2",
              "auditor": "Auditor B", "timestamp": "2026-10-08T11:00", "requirement_id": "STD:SAE AS9110C:8.5.1",
              "file_name": "bench.jpg", "sha256": "ab" * 32}
GOOD_INTERVIEW = {"interviewee_role": "Technician", "interviewer": "Auditor B", "date_time": "2026-10-08T10:00",
                  "location": "Bay 2", "method": "in person", "consent_state": "CONSENT_RECORDED", "notes": "n",
                  "evidence_class": "direct_statement"}
CAR = {"car_id": "CAR-101", "source_system": "QMS export", "linked_requirement": "STD:SAE AS9110C:8.5.1",
       "problem_statement": "Tooling tag missing at Bay 2", "owner": "Maintenance lead",
       "due_date": "2026-12-01", "status": "closed", "auditor_result": "effective",
       "effectiveness_evidence": "EV-9 follow-up audit 2026-09-20"}


def scratch():
    d = ROOT / "tests" / "_scratch" / uuid.uuid4().hex
    d.mkdir(parents=True)
    return d


def populate(audits_root, audit="DEMO-AUDIT"):
    """Record evidence, photo, interview, CAR and a sampling record that cites the evidence. Returns the IDs."""
    ids = {}
    ids["evidence"] = lg.append(audits_root, audit, "evidence", GOOD_EVIDENCE, now="2026-10-08T09:31:00")["id"]
    ids["photo"] = lg.append(audits_root, audit, "photo", GOOD_PHOTO, now="2026-10-08T11:01:00")["id"]
    ids["interview"] = lg.append(audits_root, audit, "interview", GOOD_INTERVIEW, now="2026-10-08T10:01:00")["id"]
    ids["car"] = lg.append(audits_root, audit, "car", CAR, now="2026-10-08T12:00:00")["id"]
    sampling = {"population_basis": "all jobs in Q3", "selection_method": "random", "sample_identity": "J-101",
                "period": "Q3", "result": "CONFORMING", "evidence_refs": [ids["evidence"]], "expanded": False,
                "expansion_reason": "single conforming sample"}
    ids["sampling"] = lg.append(audits_root, audit, "sampling", sampling, now="2026-10-08T12:05:00")["id"]
    return ids


def snapshot(audits_root, out_dir, version=1, audit="DEMO-AUDIT"):
    return ar.build_linked_snapshot(audit, "AS9110C", CLAUSES, None, [], out_dir, version, TODAY,
                                    audits_root=audits_root)


def read_snapshot(out_dir, result, audit="DEMO-AUDIT"):
    return json.loads((ROOT / result["path"]).read_text(encoding="utf-8"))


class SnapshotPersistenceTests(unittest.TestCase):
    def setUp(self):
        self.root = scratch()
        self.audits = self.root / "audits"
        self.out = self.root / "snapshots"
        self.ids = populate(self.audits)

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def test_snapshot_carries_every_capture_record_with_its_id_and_hashes(self):
        result = snapshot(self.audits, self.out)
        self.assertTrue(result["ready_for_export"], result["blocking_issues"])
        snap = read_snapshot(self.out, result)
        ids = [e["id"] for e in snap["capture_records"]]
        self.assertEqual(sorted(ids), sorted(self.ids.values()))
        for e in snap["capture_records"]:
            self.assertEqual(len(e["record_sha256"]), 64)
            self.assertEqual(len(e["entry_sha256"]), 64)
        self.assertEqual(snap["capture_ledger_length"], 5)
        self.assertEqual(snap["capture_ledger_head"], lg.verify(lg.read_entries(lg.ledger_path(self.audits, "DEMO-AUDIT")))[1])

    def test_car_in_the_ledger_drives_the_snapshot_car_section(self):
        snap = read_snapshot(self.out, snapshot(self.audits, self.out))
        car = snap["car_records"][0]
        self.assertEqual(car["car_id"], "CAR-101")
        self.assertEqual(car["state"], "CLOSED_EFFECTIVE")

    def test_reload_from_disk_rebuilds_the_same_records(self):
        first = read_snapshot(self.out, snapshot(self.audits, self.out, version=1))
        second = read_snapshot(self.out, snapshot(self.audits, self.out, version=2))
        self.assertEqual(first["capture_records"], second["capture_records"])
        self.assertEqual(first["capture_ledger_head"], second["capture_ledger_head"])
        self.assertEqual(first["rows"], second["rows"])

    def test_snapshot_file_tamper_is_detected(self):
        result = snapshot(self.audits, self.out)
        path = ROOT / result["path"]
        tampered = self.root / "tampered.json"
        tampered.write_bytes(path.read_bytes().replace(b"Calibration log for gauge G-4", b"Calibration log for gauge G-9"))
        self.assertFalse(ar.verify_snapshot(tampered, result["sha256"]))
        self.assertTrue(ar.verify_snapshot(path, result["sha256"]))

    def test_edited_ledger_blocks_a_new_snapshot(self):
        path = lg.ledger_path(self.audits, "DEMO-AUDIT")
        text = path.read_text(encoding="utf-8").replace("Calibration log for gauge G-4", "Edited description")
        path.write_text(text, encoding="utf-8")
        result = snapshot(self.audits, self.out)
        self.assertFalse(result["ready_for_export"])
        self.assertTrue(any("capture ledger:" in b and "does not match its hash" in b for b in result["blocking_issues"]))

    def test_sampling_citing_evidence_outside_the_ledger_blocks_export(self):
        bad = {"population_basis": "all jobs", "selection_method": "random", "sample_identity": "J-202",
               "period": "Q3", "result": "CONFORMING", "evidence_refs": ["EVD-9999"], "expanded": False,
               "expansion_reason": "single conforming sample"}
        lg.append(self.audits, "DEMO-AUDIT", "sampling", bad, now="2026-10-08T13:00:00")
        result = snapshot(self.audits, self.out)
        self.assertFalse(result["ready_for_export"])
        self.assertTrue(any("cites EVD-9999, which is not in the ledger" in b for b in result["blocking_issues"]))

    def test_truncated_ledger_is_detected_against_the_snapshot_head(self):
        result = snapshot(self.audits, self.out)
        head = read_snapshot(self.out, result)["capture_ledger_head"]
        path = lg.ledger_path(self.audits, "DEMO-AUDIT")
        lines = path.read_text(encoding="utf-8").splitlines()
        path.write_text("\n".join(lines[:-1]) + "\n", encoding="utf-8")
        self.assertEqual(lg.verify(lg.read_entries(path))[0], [])  # the shorter chain is internally consistent
        self.assertTrue(lg.check_head(lg.read_entries(path), head))  # but it is not the ledger the snapshot recorded

    def test_snapshot_stays_draft_while_checklist_review_is_pending(self):
        snap = read_snapshot(self.out, snapshot(self.audits, self.out))
        self.assertEqual(snap["reconciliation_status"], "RECONCILED")
        self.assertNotIn("APPROVED", json.dumps(snap).replace("NOT APPROVED", ""))


class ReportAndExportTests(unittest.TestCase):
    def setUp(self):
        self.root = scratch()
        self.audits = self.root / "audits"
        self.out = self.root / "snapshots"
        self.ids = populate(self.audits)
        self.result = snapshot(self.audits, self.out)
        self.snap = read_snapshot(self.out, self.result)

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def assessment(self):
        return {"ref": "8.5.1(a)", "result": "CONFORMING", "evidence_ids": [self.ids["evidence"]]}

    def test_evidence_register_lists_evidence_photo_and_interview_records(self):
        reg = pr.evidence_register(self.snap)
        self.assertEqual({e["id"] for e in reg}, {self.ids["evidence"], self.ids["photo"], self.ids["interview"]})
        self.assertEqual({e["id"]: e["evidence_type"] for e in reg}[self.ids["photo"]], "photo_file")

    def test_report_carries_capture_ids_and_hashes(self):
        report = pr.build_report(self.snap, self.result["sha256"], [], pr.evidence_register(self.snap),
                                 [self.assessment()], "Burrana Inc.", "2026-10-08T14:00:00")
        index = {e["id"]: e for e in report["capture_index"]}
        self.assertEqual(set(index), set(self.ids.values()))
        self.assertEqual(report["capture_ledger"]["length"], 5)
        self.assertTrue(report["package_status"].startswith("DRAFT"))

    def test_report_refuses_an_assessment_citing_evidence_not_in_the_register(self):
        bad = {"ref": "8.5.1(a)", "result": "CONFORMING", "evidence_ids": ["EVD-0404"]}
        with self.assertRaises(ValueError) as ctx:
            pr.build_report(self.snap, self.result["sha256"], [], pr.evidence_register(self.snap),
                            [bad], "Burrana Inc.", "2026-10-08T14:00:00")
        self.assertIn("EVD-0404 is not in the evidence register", str(ctx.exception))

    def test_export_package_carries_ids_and_hashes_and_passes_the_package_checks(self):
        report = pr.build_report(self.snap, self.result["sha256"], [], pr.evidence_register(self.snap),
                                 [self.assessment()], "Burrana Inc.", "2026-10-08T14:00:00")
        audit = pr.export_audit(self.snap, report)
        pkg_audit = dict(audit)
        package = pe.build_package(pkg_audit, load_registry()["sources"], "Burrana Inc.", "EXP-1", "2026-10-08T14:05:00")
        self.assertEqual(pe.check_package(package), [])
        self.assertEqual(package["snapshot"]["sha256"], self.result["sha256"])
        self.assertEqual(package["snapshot"]["capture_ledger_head"], self.snap["capture_ledger_head"])
        self.assertIn(self.ids["evidence"], {e["id"] for e in package["evidence"]})
        self.assertIn(self.ids["sampling"], {s["id"] for s in package["sampling"]})
        self.assertEqual(package["prior_car_reviews"][0]["state"], "CLOSED_EFFECTIVE")
        self.assertTrue(all(len(e["record_sha256"]) == 64 for e in package["evidence"]))

    def test_export_contains_no_licensed_source_text(self):
        report = pr.build_report(self.snap, self.result["sha256"], [], pr.evidence_register(self.snap),
                                 [self.assessment()], "Burrana Inc.", "2026-10-08T14:00:00")
        audit = pr.export_audit(self.snap, report)
        forbidden = {"body", "body_text", "clause_text", "verbatim", "rows"}
        keys = set()

        def walk(o):
            if isinstance(o, dict):
                for k, v in o.items():
                    keys.add(k)
                    walk(v)
            elif isinstance(o, list):
                for v in o:
                    walk(v)
        walk(audit)
        self.assertFalse(forbidden & keys)

    def test_export_file_tamper_is_detected(self):
        report = pr.build_report(self.snap, self.result["sha256"], [], pr.evidence_register(self.snap),
                                 [self.assessment()], "Burrana Inc.", "2026-10-08T14:00:00")
        package = pe.build_package(pr.export_audit(self.snap, report), load_registry()["sources"],
                                   "Burrana Inc.", "EXP-1", "2026-10-08T14:05:00")
        out = self.root / "export"
        pe.write_export(package, out, self.root)
        self.assertEqual(pe.verify_export(out), (True, None))
        original = (out / "package.json").read_bytes()
        body = original.replace(b"CAL-LOG-2026", b"CAL-LOG-2999")
        self.assertNotEqual(body, original)  # the tamper must actually change the file
        (out / "package.json").write_bytes(body)
        ok, reason = pe.verify_export(out)
        self.assertFalse(ok)
        self.assertIn("does not match", reason)


if __name__ == "__main__":
    unittest.main()
