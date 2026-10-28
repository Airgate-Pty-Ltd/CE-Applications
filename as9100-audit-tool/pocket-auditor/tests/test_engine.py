"""Tests for engine/pa_engine.py. Run from the product root:
  python -I -m unittest discover -s tests -p "test_*.py" -v
"""
import copy
import csv
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


class HierarchyTests(unittest.TestCase):
    def test_numeric_clause_chain(self):
        self.assertEqual(pa.parse_ref("8.1.1", "clause"), ["8", "8.1", "8.1.1"])

    def test_regulatory_paragraph_chain(self):
        self.assertEqual(pa.parse_ref("145.55(a)(1)", "section"), ["145.55", "145.55(a)", "145.55(a)(1)"])

    def test_faa_21_137_identifier_preserved(self):
        self.assertEqual(pa.parse_ref("21.137(a)", "section"), ["21.137", "21.137(a)"])

    def test_easa_identifier_preserved(self):
        self.assertEqual(pa.parse_ref("145.A.25(a)", "section"), ["145.A.25", "145.A.25(a)"])

    def test_parent(self):
        self.assertEqual(pa.parent_of("8.1.1"), "8.1")
        self.assertIsNone(pa.parent_of("8"))


class RenderingTests(unittest.TestCase):
    def setUp(self):
        self.registry = pa.load_registry()

    def test_unapproved_sources_render_but_package_is_draft(self):
        out = pa.render_checklist(["AS9100D"], self.registry)
        self.assertGreater(out["line_count"], 0)
        self.assertEqual(out["package_status"], "DRAFT - NOT FOR AUDIT USE")
        self.assertTrue(all(l["type"] == "controlled clause item" for l in out["lines"]))
        self.assertTrue(all(l["source_status"] == "proposed" for l in out["lines"]))

    def test_every_line_has_exact_ref_and_hierarchy_level(self):
        out = pa.render_checklist(["AS9110C"], self.registry)
        refs = [l["ref"] for l in out["lines"]]
        self.assertTrue(all(r for r in refs))
        for l in out["lines"]:
            self.assertEqual(l["level"], len(pa.parse_ref(l["ref"])))

    def test_unavailable_source_is_visible_and_blocks_package(self):
        out = pa.render_checklist(["MX-AFAC-RAC145"], self.registry)
        self.assertEqual(out["package_status"], "DRAFT - NOT FOR AUDIT USE")
        self.assertEqual(out["lines"][0]["type"], "UNAVAILABLE")
        self.assertIn("unavailable", out["pending_sources"][0]["reason"])

    def test_multi_standard_selection_renders_both(self):
        out = pa.render_checklist(["FAA-14CFR-145", "AS9110C"], self.registry)
        sources = {l["source"] for l in out["lines"]}
        self.assertEqual(sources, {"FAA-14CFR-145", "AS9110C"})

    def test_approved_source_renders_approved_package(self):
        reg = copy.deepcopy(self.registry)
        reg["sources"]["AS9110C"].update({"status": "approved", "licence_scope_owner": "Test Org"})
        out = pa.render_checklist(["AS9110C"], reg)
        self.assertEqual(out["package_status"], "APPROVED")
        self.assertEqual(out["pending_sources"], [])

    def test_approved_question_text_is_used_only_when_supplied(self):
        reg = copy.deepcopy(self.registry)
        reg["sources"]["AS9110C"]["status"] = "approved"
        out = pa.render_checklist(["AS9110C"], reg, approved_text={("AS9110C", "8.1.1"): "Example approved question"})
        hit = [l for l in out["lines"] if l["ref"] == "8.1.1"][0]
        self.assertEqual(hit["type"], "approved question")
        self.assertIsNone(hit["instruction"])


class ReconciliationTests(unittest.TestCase):
    def test_invalid_seed_reference_counts_match_findings(self):
        rep = pa.reconcile(ROOT / "content" / "AS-licensed-clause-register.json",
                           ROOT / "content" / "library-seed.json")
        # 25 (not 26): 10.2 exists in the licensed standard; the earlier finding was an extraction error
        self.assertEqual(len(rep["AS9100D"]["invalid_seed_refs"]), 25)
        self.assertEqual(len(rep["AS9110C"]["invalid_seed_refs"]), 6)
        self.assertTrue(rep["AS9100D"]["status"].startswith("UNRESOLVED"))


class ApplicabilityAndNATests(unittest.TestCase):
    def good_na(self, **over):
        d = {"ref": "8.3", "status": "NOT_APPLICABLE", "reason": "Design not performed by the organization",
             "qm_section_ref": "QM 1.2 Scope, exclusion (c)", "evidence_links": ["evidence/qm-rev-7.pdf"],
             "reviewer": "Reviewer A", "auditor": "Auditor B", "timestamp": "2026-10-08T10:00:00"}
        d.update(over)
        return d

    def test_complete_na_is_valid(self):
        self.assertEqual(pa.validate_na(self.good_na()), [])

    def test_na_without_qm_reference_is_rejected(self):
        errs = pa.validate_na(self.good_na(qm_section_ref=""))
        self.assertIn("missing field: qm_section_ref", errs)

    def test_na_without_reviewer_or_evidence_is_rejected(self):
        errs = pa.validate_na(self.good_na(reviewer="", evidence_links=[]))
        self.assertIn("missing field: reviewer", errs)
        self.assertIn("missing field: evidence_links", errs)

    def test_self_review_is_rejected(self):
        self.assertIn("reviewer must differ from the auditor who recorded the N/A",
                      pa.validate_na(self.good_na(reviewer="Auditor B")))

    def test_bad_timestamp_is_rejected(self):
        self.assertIn("timestamp is not ISO 8601", pa.validate_na(self.good_na(timestamp="08/10/2026")))

    def test_requirement_is_applicable_by_default(self):
        self.assertTrue(pa.is_applicable("8.3", []))

    def test_only_an_approved_valid_exclusion_removes_applicability(self):
        approved = dict(self.good_na(), approved=True)
        unapproved = dict(self.good_na(), approved=False)
        self.assertFalse(pa.is_applicable("8.3", [approved]))
        self.assertTrue(pa.is_applicable("8.3", [unapproved]))
        self.assertTrue(pa.is_applicable("8.4", [approved]))


class EvidenceTests(unittest.TestCase):
    def good(self, **over):
        d = {"evidence_type": "interview", "description": "Interview with receiving inspector",
             "timestamp": "2026-10-08T11:00:00", "location": "Receiving bay", "auditor": "Auditor B",
             "source_ref": "8.5.1"}
        d.update(over)
        return d

    def test_valid_interview_evidence(self):
        self.assertEqual(pa.validate_evidence(self.good()), [])

    def test_missing_location_and_bad_type_rejected(self):
        errs = pa.validate_evidence(self.good(location="", evidence_type="hearsay"))
        self.assertIn("missing field: location", errs)
        self.assertIn("unknown evidence_type", errs)

    def test_file_evidence_hash_must_match(self):
        tmp = ROOT / "tests" / "_evidence_test.txt"
        tmp.write_text("synthetic test file", encoding="utf-8")
        try:
            good_hash = pa.sha256_file(tmp)
            rel = str(tmp.relative_to(ROOT))
            self.assertEqual(pa.validate_evidence(self.good(evidence_type="photo_file", file_path=rel, sha256=good_hash)), [])
            self.assertIn("sha256 does not match file",
                          pa.validate_evidence(self.good(evidence_type="photo_file", file_path=rel, sha256="0" * 64)))
        finally:
            tmp.unlink(missing_ok=True)


class SnapshotTests(unittest.TestCase):
    def test_snapshot_is_write_once_and_hash_matches(self):
        d = scratch_dir()
        try:
            rec = pa.write_snapshot({"audit": "A-1", "lines": [1, 2]}, d, "A-1-v1")
            self.assertEqual(len(rec["sha256"]), 64)
            with self.assertRaises(FileExistsError):
                pa.write_snapshot({"audit": "A-1", "lines": [9]}, d, "A-1-v1")
            self.assertTrue((d / "A-1-v1.json").exists())
            # a later version is a new file; the earlier one is untouched
            pa.write_snapshot({"audit": "A-1", "lines": [1, 2, 3]}, d, "A-1-v2")
            self.assertEqual(json.loads((d / "A-1-v1.json").read_text(encoding="utf-8"))["lines"], [1, 2])
        finally:
            shutil.rmtree(d)


class ImportTests(unittest.TestCase):
    def test_user_checklist_import_preserves_identifiers_and_is_proposed(self):
        d = scratch_dir()
        try:
            f = d / "user.csv"
            with open(f, "w", encoding="utf-8", newline="") as h:
                w = csv.writer(h)
                w.writerow(["ref", "question"])
                w.writerow(["21.137(a)", "Synthetic test question A"])
                w.writerow(["(b)", ""])
            rec = pa.import_checklist_csv(f, "MX-AFAC-RAC145", "Test Uploader", "MX AFAC RAC 145 (test)")
            self.assertEqual(rec["status"], "proposed")
            self.assertEqual([r["ref"] for r in rec["rows"]], ["21.137(a)", "(b)"])
            self.assertEqual(len(rec["sha256"]), 64)
            self.assertIsNone(rec["rows"][1]["question"])
        finally:
            shutil.rmtree(d)


class UniverseTests(unittest.TestCase):
    def test_clause_universe_is_in_scope_and_has_no_out_of_range_top_levels(self):
        data = json.loads((ROOT / "content" / "audit-rule" / "clause-universe.json").read_text(encoding="utf-8"))
        tops = {int(r["clause_ref"].split(".")[0]) for r in data["rows"]}
        self.assertTrue(tops.issubset(set(range(4, 11))))
        # 100 / 106 include the top-level clauses 4-10 supported by the licensed structure line (see build_register.py)
        self.assertEqual(data["counts"]["AS9100D"]["clauses_4_to_10"], 100)
        self.assertEqual(data["counts"]["AS9110C"]["clauses_4_to_10"], 106)


class ReviewFixTests(unittest.TestCase):
    """Regression tests for defects found in code review (2026-10-08)."""

    def na(self, ref):
        return {"ref": ref, "status": "NOT_APPLICABLE", "reason": "r", "qm_section_ref": "QM 1",
                "evidence_links": ["e"], "reviewer": "R", "auditor": "A", "timestamp": "2026-10-08T10:00:00"}

    def test_na_on_nonexistent_reference_is_rejected(self):
        errs = pa.validate_na(self.na("8.9.9"), valid_refs={"8.1", "8.3"})
        self.assertIn("ref is not in the source universe", errs)

    def test_na_on_existing_reference_is_accepted(self):
        self.assertEqual(pa.validate_na(self.na("8.3"), valid_refs={"8.1", "8.3"}), [])

    def test_exclusion_with_invalid_reference_does_not_remove_applicability(self):
        ex = dict(self.na("8.9.9"), approved=True)
        self.assertTrue(pa.is_applicable("8.9.9", [ex], valid_refs={"8.1"}))

    def test_photo_evidence_requires_file_and_hash(self):
        item = {"evidence_type": "photo_file", "description": "d", "timestamp": "2026-10-08T11:00:00",
                "location": "Bay 2", "auditor": "A", "source_ref": "8.5.1"}
        errs = pa.validate_evidence(item)
        self.assertIn("photo/file evidence requires file_path", errs)
        self.assertIn("photo/file evidence requires sha256", errs)

    def test_snapshot_leaves_no_temp_file_and_refuses_overwrite(self):
        d = scratch_dir()
        try:
            pa.write_snapshot({"v": 1}, d, "S1")
            self.assertEqual(sorted(x.name for x in d.iterdir()), ["S1.json"])
            with self.assertRaises(FileExistsError):
                pa.write_snapshot({"v": 2}, d, "S1")
            self.assertEqual(json.loads((d / "S1.json").read_text(encoding="utf-8")), {"v": 1})
        finally:
            shutil.rmtree(d)

    def test_duplicate_reference_in_import_is_rejected(self):
        d = scratch_dir()
        try:
            f = d / "dup.csv"
            f.write_text("ref,question\n8.1,one\n8.1,two\n", encoding="utf-8")
            with self.assertRaises(ValueError):
                pa.import_checklist_csv(f, "X", "U", "label")
        finally:
            shutil.rmtree(d)


class AuthoredDraftTests(unittest.TestCase):
    """Authored checklists for AS9100D and AS9110C cover every clause in scope and stay drafts."""

    def test_as9100d_covers_every_clause_in_scope(self):
        out = pa.render_authored_draft("AS9100D", pa.load_registry()["sources"])
        clause_lines = [l for l in out["lines"] if "(" not in l["ref"]]
        refs = {l["ref"] for l in clause_lines}
        universe = {r["clause_ref"] for r in json.loads((ROOT / "content" / "audit-rule" / "clause-universe.json").read_text(encoding="utf-8"))["rows"] if r["standard"] == "AS9100D"}
        self.assertEqual(refs, universe)
        self.assertEqual(len(clause_lines), 100)

    def test_as9110c_covers_every_clause_in_scope(self):
        out = pa.render_authored_draft("AS9110C", pa.load_registry()["sources"])
        self.assertEqual(len([l for l in out["lines"] if "(" not in l["ref"]]), 106)

    def test_authored_package_is_still_draft(self):
        out = pa.render_authored_draft("AS9110C", pa.load_registry()["sources"])
        self.assertEqual(out["package_status"], "DRAFT - NOT FOR AUDIT USE")

    def test_every_authored_item_has_question_and_evidence_except_groups(self):
        out = pa.render_authored_draft("AS9100D", pa.load_registry()["sources"])
        for l in out["lines"]:
            if l["type"] != "group heading (no body text)":
                self.assertTrue(l["question"], l["ref"])
                self.assertTrue(l["evidence"], l["ref"])

    def test_8_5_1_3_carries_the_not_applicable_note(self):
        out = pa.render_authored_draft("AS9110C", pa.load_registry()["sources"])
        hit = [l for l in out["lines"] if l["ref"] == "8.5.1.3"][0]
        self.assertIn("not an automatic N/A", hit["note"])


if __name__ == "__main__":
    unittest.main()
