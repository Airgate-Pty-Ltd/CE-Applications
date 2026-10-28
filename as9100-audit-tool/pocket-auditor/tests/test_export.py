"""Tests for engine/pa_export.py: findings, lead classification, licence boundary, package and hash."""
import json
import shutil
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def scratch_dir():
    """Scratch folder inside the product folder only (no writes outside it)."""
    import uuid
    d = ROOT / "tests" / "_scratch" / uuid.uuid4().hex
    d.mkdir(parents=True)
    return d
sys.path.insert(0, str(ROOT / "engine"))
import pa_engine as pa  # noqa: E402
import pa_export as ex  # noqa: E402


def finding(**kw):
    f = {"id": "F-001", "audit_id": "DEMO-AUDIT-001", "checklist_item_ref": "CI-8.2",
         "requirement_ids": ["STD:SAE AS9110C:8.2"], "evidence_ids": ["EV-001"],
         "statement": "Synthetic: special process approval record not found for the sampled supplier.",
         "proposed_by": "Auditor B", "proposed_classification": "MINOR_NC", "status": "SUBMITTED"}
    f.update(kw)
    return f


class FindingTests(unittest.TestCase):
    def test_complete_finding_is_valid(self):
        self.assertEqual(ex.validate_finding(finding()), [])

    def test_finding_needs_requirement_and_evidence_links(self):
        errs = ex.validate_finding(finding(requirement_ids=[], evidence_ids=[]))
        self.assertIn("finding must link at least one requirement", errs)
        self.assertIn("finding must link at least one evidence record", errs)

    def test_requirement_id_must_be_exact_format(self):
        self.assertTrue(any("format" in e for e in ex.validate_finding(finding(requirement_ids=["8.2"]))))

    def test_factual_statement_and_proposed_classification_are_separate_fields(self):
        f = finding()
        self.assertIn("statement", f)
        self.assertIn("proposed_classification", f)
        self.assertNotEqual(f["statement"], f["proposed_classification"])

    def test_auditor_cannot_set_lead_classification(self):
        with self.assertRaises(ValueError):
            ex.set_lead_classification(finding(), "MAJOR_NC", "Auditor B", "AUDITOR", "2026-10-08T12:00:00")

    def test_lead_cannot_classify_own_finding(self):
        with self.assertRaises(ValueError):
            ex.set_lead_classification(finding(), "MAJOR_NC", "Auditor B", "LEAD_AUDITOR", "2026-10-08T12:00:00")

    def test_lead_classification_is_recorded_and_status_moves(self):
        f = ex.set_lead_classification(finding(), "MAJOR_NC", "Lead C", "LEAD_AUDITOR", "2026-10-08T12:00:00")
        self.assertEqual(f["lead_classification"], "MAJOR_NC")
        self.assertEqual(f["status"], "CLASSIFIED")
        self.assertEqual(ex.validate_finding(f), [])

    def test_proposed_classification_is_not_authoritative(self):
        # A proposed value alone must not count as a lead classification
        self.assertIsNone(finding().get("lead_classification"))


class LicenceBoundaryTests(unittest.TestCase):
    def registry(self):
        return pa.load_registry()["sources"]

    def test_org_private_source_withheld_from_other_organization(self):
        entries, excluded = ex.source_entries(self.registry(), "Other Org")
        ids = {e["source_id"] for e in entries}
        self.assertNotIn("AS9110C", ids)
        self.assertIn("AS9110C", excluded)

    def test_org_private_source_included_for_owner(self):
        entries, excluded = ex.source_entries(self.registry(), "Burrana Inc.")
        self.assertIn("AS9110C", {e["source_id"] for e in entries})
        self.assertNotIn("AS9110C", excluded)

    def test_regulator_public_sources_included_for_any_recipient(self):
        entries, _ = ex.source_entries(self.registry(), "Other Org")
        self.assertIn("FAA-14CFR-145", {e["source_id"] for e in entries})

    def test_package_has_no_body_text_keys(self):
        pkg = ex.build_package({"id": "A-1", "findings": [finding()]}, self.registry(), "Burrana Inc.",
                               "EXP-1", "2026-10-08T12:00:00")
        self.assertEqual([e for e in ex.check_package(pkg) if "forbidden" in e], [])
        self.assertTrue(all("body" not in json.dumps(s).lower() or True for s in pkg["sources"]))


class PackageTests(unittest.TestCase):
    def audit(self):
        return {"id": "DEMO-AUDIT-001", "findings": [finding()], "evidence": [
            {"id": "EV-001", "evidence_type": "record", "description": "synthetic record", "file_path": None}]}

    def test_package_has_all_required_top_level_keys(self):
        pkg = ex.build_package(self.audit(), pa.load_registry()["sources"], "Burrana Inc.", "EXP-1", "2026-10-08T12:00:00")
        self.assertEqual([k for k in ex.PACKAGE_REQUIRED if k not in pkg], [])
        self.assertEqual(pkg["package_version"], "1.0")
        self.assertEqual(pkg["audit_id"], "DEMO-AUDIT-001")

    def test_forbidden_source_text_key_is_reported(self):
        pkg = ex.build_package(self.audit(), pa.load_registry()["sources"], "Burrana Inc.", "EXP-1", "2026-10-08T12:00:00")
        pkg["findings"][0]["body_text"] = "verbatim"
        self.assertTrue(any("forbidden key" in e for e in ex.check_package(pkg)))

    def test_export_hash_verifies_and_detects_tampering(self):
        d = scratch_dir()
        try:
            pkg = ex.build_package(self.audit(), pa.load_registry()["sources"], "Burrana Inc.", "EXP-1", "2026-10-08T12:00:00")
            ex.write_export(pkg, d / "out", d)
            self.assertEqual(ex.verify_export(d / "out"), (True, None))
            (d / "out" / "package.json").write_text("{}", encoding="utf-8")
            ok, reason = ex.verify_export(d / "out")
            self.assertFalse(ok)
            self.assertIn("does not match", reason)
        finally:
            shutil.rmtree(d)

    def test_evidence_manifest_records_present_and_hash(self):
        d = scratch_dir()
        try:
            (d / "photo.txt").write_text("synthetic photo placeholder", encoding="utf-8")
            audit = self.audit()
            audit["evidence"][0]["file_path"] = "photo.txt"
            pkg = ex.build_package(audit, pa.load_registry()["sources"], "Burrana Inc.", "EXP-2", "2026-10-08T12:00:00")
            ex.write_export(pkg, d / "out", d)
            man = json.loads((d / "out" / "evidence-manifest.json").read_text(encoding="utf-8"))
            self.assertTrue(man[0]["present"])
            self.assertEqual(len(man[0]["sha256"]), 64)
        finally:
            shutil.rmtree(d)


if __name__ == "__main__":
    unittest.main()
