"""Tests for engine/pa_mike_export.py: the audit package for Mike's import with the FAA QSA section.

Checks: schema v1.0 unchanged (exactly the 18 top-level keys); the owner (Burrana Inc.) receives the QSA section;
any other recipient does not, and the FAA source is listed as withheld; question and condition text are never
exported; evidence cited by QSA items must be in the snapshot; the written package verifies and detects tampering.
Scratch files live only in tests/_scratch inside the product folder.
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
import pa_qsa as qsa  # noqa: E402
import pa_qsa_records as qr  # noqa: E402
import pa_ledger as lg  # noqa: E402
import pa_audit_record as ar  # noqa: E402
import pa_report as pr  # noqa: E402
import pa_export as pe  # noqa: E402
import pa_mike_export as mx  # noqa: E402
from pa_engine import load_registry  # noqa: E402

CHECKLIST = qsa.load_checklist()
ORG_101 = "REG:FAA QSA 1.0:Organizational Management:101"
MP_1 = "REG:FAA QSA 1.0:Manufacturing Processes:1"
TODAY = date(2026, 10, 8)
WHEN = "2026-10-08T15:00:00"
OWNER = "Burrana Inc."


def scratch():
    d = ROOT / "tests" / "_scratch" / uuid.uuid4().hex
    d.mkdir(parents=True)
    return d


def question(ref_id):
    return next(c["question"] for c in CHECKLIST["criteria"] if c["criterion_id"] == ref_id)


class PackageTestBase(unittest.TestCase):
    audit = "DEMO"

    def setUp(self):
        self.root = scratch()
        self.audits = self.root / "audits"
        self.out = self.root / "snapshots"
        qsa.write_draft(self.audits, self.audit, {"selected": sorted([ORG_101, MP_1]), "additions": []})
        self.pub = qsa.publish(self.audits, self.audit, CHECKLIST, now=WHEN)
        ev = lg.append(self.audits, self.audit, "evidence", {
            "evidence_type": "record_review", "description": "Production certificate copy",
            "timestamp": "2026-10-08T09:30", "location": "Quality office", "auditor": "Auditor B",
            "source_ref": "CERT-2026"}, now=WHEN)
        self.evid = ev["id"]
        cid = lg.append(self.audits, self.audit, "car", {
            "car_id": "CAR-101", "source_system": "QMS export", "linked_requirement": ORG_101,
            "problem_statement": "Certificate not on file", "owner": "O", "due_date": "2026-12-01",
            "status": "open"}, now=WHEN)["id"]
        self.car = cid
        qr.record_assessment(self.audits, self.audit, CHECKLIST, {
            "criterion_id": ORG_101, "applicability": "APPLICABLE", "assessment": "NONCONFORMING",
            "assessor": "Auditor B", "assessed_at": WHEN, "evidence_ids": [self.evid]}, now=WHEN)
        self.fid = qr.record_finding(self.audits, self.audit, CHECKLIST, {
            "criterion_id": MP_1, "statement": "Tooling tag missing at Bay 2.", "proposed_by": "Auditor B",
            "proposed_classification": "MINOR_NC", "car_id": cid, "evidence_ids": [self.evid]}, now=WHEN)["id"]
        qr.classify_finding(self.audits, self.audit, CHECKLIST, self.fid, "MINOR_NC", "Lead L", "LEAD_AUDITOR", WHEN)
        self.result = ar.build_linked_snapshot(self.audit, "AS9110C", ["8.5.1"], None, [], self.out, 1, TODAY,
                                               audits_root=self.audits)
        self.snap = json.loads((ROOT / self.result["path"]).read_text(encoding="utf-8"))
        self.report = pr.build_report(self.snap, self.result["sha256"], [], pr.evidence_register(self.snap),
                                      [], OWNER, "2026-10-08T16:00:00")

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def package(self, recipient=OWNER, snap=None, report=None):
        return mx.build_audit_package(snap or self.snap, report or self.report, self.audits, self.audit,
                                      CHECKLIST, recipient, "EXP-1", "2026-10-08T16:05:00",
                                      registry=load_registry()["sources"])


class OwnerPackageTests(PackageTestBase):
    def test_schema_v1_0_has_exactly_the_nineteen_required_keys(self):
        pkg = self.package()
        self.assertEqual(len(pe.PACKAGE_REQUIRED), 19)
        self.assertEqual(set(pkg.keys()), set(pe.PACKAGE_REQUIRED))
        self.assertEqual(pkg["package_version"], "1.0")

    def test_missing_withheld_list_is_refused_by_the_package_check(self):
        pkg = self.package()
        del pkg["sources_withheld_for_licence"]
        self.assertIn("missing top-level key: sources_withheld_for_licence", pe.check_package(pkg))

    def test_owner_receives_the_qsa_assessment_and_finding_in_the_existing_keys(self):
        pkg = self.package()
        self.assertIn(ORG_101, {a["requirement_id"] for a in pkg["assessments"]})
        f = next(f for f in pkg["findings"] if f["id"] == self.fid)
        self.assertEqual(f["checklist_item_ref"], MP_1)
        self.assertEqual(f["requirement_ids"], [MP_1])
        self.assertEqual(f["lead_classification"], "MINOR_NC")
        self.assertEqual(f["lead_role"], "LEAD_AUDITOR")

    def test_qsa_checklist_items_carry_identifiers_and_sheet_only(self):
        pkg = self.package()
        items = [i for i in pkg["checklist_items"] if str(i.get("requirement_id", "")).startswith("REG:FAA QSA 1.0")]
        self.assertEqual({i["requirement_id"] for i in items}, {ORG_101, MP_1})
        self.assertTrue(all(set(i) <= {"ref", "requirement_id", "title", "origin"} for i in items))

    def test_owner_package_includes_the_faa_source_entry_with_its_hash(self):
        pkg = self.package()
        src = next(s for s in pkg["sources"] if s["source_id"] == mx.FAA_SOURCE_ID)
        self.assertEqual(src["sha256"], CHECKLIST["data"]["source_sha256"])
        self.assertEqual(src["licence_scope_owner"], OWNER)

    def test_snapshot_block_identifies_the_qsa_publication(self):
        pkg = self.package()
        self.assertEqual(pkg["snapshot"]["qsa_publication"], {"version": 1, "sha256": self.pub["sha256"]})

    def test_evidence_is_mapped_to_the_contract_vocabulary(self):
        pkg = self.package()
        ev = next(e for e in pkg["evidence"] if e["id"] == self.evid)
        self.assertEqual(ev["evidence_type"], "record")

    def test_question_and_condition_text_are_never_exported(self):
        pkg = self.package()
        text = json.dumps(pkg)
        q = question(ORG_101)
        self.assertNotIn(q[:60], text)
        cond = next(c for c in CHECKLIST["criteria"] if c["criterion_id"] == ORG_101)["condition_text"]
        if cond and cond[0]:
            self.assertNotIn(cond[0][:40], text)

    def test_unassessed_published_criteria_appear_in_not_assessed(self):
        pkg = self.package()
        ids = {n["requirement_id"] for n in pkg["not_assessed"] if "requirement_id" in n}
        self.assertNotIn(ORG_101, ids)


class OtherRecipientTests(PackageTestBase):
    def test_other_recipient_gets_no_qsa_section(self):
        pkg = self.package(recipient="Customer Ltd")
        self.assertNotIn("REG:FAA QSA 1.0", json.dumps(pkg))
        self.assertIsNone(pkg["snapshot"]["qsa_publication"])

    def test_faa_source_is_listed_as_withheld_for_other_recipients(self):
        pkg = self.package(recipient="Customer Ltd")
        self.assertIn(mx.FAA_SOURCE_ID, pkg["sources_withheld_for_licence"])
        self.assertFalse(any(s["source_id"] == mx.FAA_SOURCE_ID for s in pkg["sources"]))

    def test_no_question_text_for_other_recipients(self):
        pkg = self.package(recipient="Customer Ltd")
        self.assertNotIn(question(ORG_101)[:60], json.dumps(pkg))


class ConsistencyTests(PackageTestBase):
    def test_qsa_evidence_recorded_after_the_snapshot_refuses_the_package(self):
        late = lg.append(self.audits, self.audit, "evidence", {
            "evidence_type": "record_review", "description": "Late record", "timestamp": "2026-10-08T17:00",
            "location": "Office", "auditor": "Auditor B", "source_ref": "LATE-1"}, now="2026-10-08T17:01:00")["id"]
        qr.record_assessment(self.audits, self.audit, CHECKLIST, {
            "criterion_id": MP_1, "applicability": "APPLICABLE", "assessment": "CONFORMING",
            "assessor": "Auditor B", "assessed_at": "2026-10-08T17:02:00", "evidence_ids": [late]},
            now="2026-10-08T17:02:00")
        with self.assertRaises(ValueError) as ctx:
            self.package()
        self.assertIn("not in this snapshot", str(ctx.exception))

    def test_non_owner_package_is_not_affected_by_qsa_evidence_gaps(self):
        lg.append(self.audits, self.audit, "evidence", {
            "evidence_type": "record_review", "description": "Late record", "timestamp": "2026-10-08T17:00",
            "location": "Office", "auditor": "Auditor B", "source_ref": "LATE-1"}, now="2026-10-08T17:01:00")
        pkg = self.package(recipient="Customer Ltd")
        self.assertTrue(pkg)


class WriteAndVerifyTests(PackageTestBase):
    def test_written_owner_package_verifies_and_detects_tampering(self):
        pkg = self.package()
        out = self.root / "export"
        pe.write_export(pkg, out, self.root)
        self.assertEqual(pe.verify_export(out), (True, None))
        body = (out / "package.json").read_bytes()
        changed = body.replace(b"CERT-2026", b"CERT-2999")
        self.assertNotEqual(changed, body)
        (out / "package.json").write_bytes(changed)
        ok, reason = pe.verify_export(out)
        self.assertFalse(ok)
        self.assertIn("does not match", reason)


if __name__ == "__main__":
    unittest.main()
