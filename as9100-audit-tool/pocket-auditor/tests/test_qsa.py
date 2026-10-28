"""Tests for engine/pa_qsa.py: FAA QSA selection, auditor additions, publication and Start Audit.

Selection (group, filter, select and clear, all and per element, across elements), publication refusal when
nothing is selected, publication of only the selected criteria with fields preserved, additions marked and
sourced, reload, write-once versions, Start Audit using the published selection, and tamper detection.
Scratch audits live only in tests/_scratch inside the product folder.
"""
import copy
import json
import shutil
import sys
import unittest
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "engine"))
import pa_qsa as q  # noqa: E402
import pa_ledger as lg  # noqa: E402
from pa_engine import sha256_file  # noqa: E402

CHECKLIST = q.load_checklist()


def scratch():
    d = ROOT / "tests" / "_scratch" / uuid.uuid4().hex
    d.mkdir(parents=True)
    return d


def cid(sheet, ref):
    return f"REG:FAA QSA 1.0:{sheet}:{ref}"


ORG_101 = cid("Organizational Management", "101")
MP_1 = cid("Manufacturing Processes", "1")


def first_of(sheet):
    return next(c for c in CHECKLIST["criteria"] if c["source_sheet"] == sheet and c["criteria_ref"] not in ("1", "2"))


class SourceTests(unittest.TestCase):
    def test_checklist_loads_126_criteria_with_unique_identities(self):
        self.assertEqual(len(CHECKLIST["criteria"]), 126)
        ids = [c["criterion_id"] for c in CHECKLIST["criteria"]]
        self.assertEqual(len(set(ids)), 126)

    def test_sheet_names_are_trimmed_so_product_audit_groups_cleanly(self):
        names = {e["element"] for e in q.elements(CHECKLIST["criteria"])}
        self.assertIn("PRODUCT AUDIT", names)
        self.assertNotIn("PRODUCT AUDIT ", names)

    def test_elements_counts_add_up_to_the_full_list(self):
        els = q.elements(CHECKLIST["criteria"])
        self.assertEqual(len(els), 7)
        self.assertEqual(sum(e["count"] for e in els), 126)

    def test_rows_keep_the_source_reference_and_hash(self):
        c = first_of("Manufacturing Processes")
        self.assertEqual(c["source_sha256"], CHECKLIST["data"]["source_sha256"])
        self.assertEqual(c["origin"], "FAA_SOURCE")

    def test_filter_by_element_and_text(self):
        only = q.filter_criteria(CHECKLIST["criteria"], element="Design Control")
        self.assertTrue(only and all(c["source_sheet"] == "Design Control" for c in only))
        hit = q.filter_criteria(CHECKLIST["criteria"], text="production approval")
        self.assertTrue(any(c["criterion_id"] == ORG_101 for c in hit))

    def test_wrong_checklist_is_refused(self):
        d = scratch()
        try:
            bad = json.loads((ROOT / "content" / "faa-qsa" / "faa-qsa-audit-checklist-1.0.json").read_text(encoding="utf-8"))
            bad["criteria"] = bad["criteria"][:100]
            p = d / "short.json"
            p.write_text(json.dumps(bad), encoding="utf-8")
            with self.assertRaises(ValueError) as ctx:
                q.load_checklist(p)
            self.assertIn("expected 126 criteria", str(ctx.exception))
        finally:
            shutil.rmtree(d, ignore_errors=True)


class SelectionTests(unittest.TestCase):
    def setUp(self):
        self.cat = q.catalogue(CHECKLIST, {"selected": [], "additions": []})
        self.draft = {"selected": [], "additions": []}

    def act(self, action, ids=None, element=None, draft=None):
        return q.apply_action(draft or self.draft, self.cat, action, ids=ids, element=element)

    def test_select_one_criterion(self):
        d = self.act("select", ids=[ORG_101])
        self.assertEqual(d["selected"], [ORG_101])

    def test_selection_across_several_elements(self):
        d = self.act("select", ids=[ORG_101, MP_1])
        self.assertEqual(set(d["selected"]), {ORG_101, MP_1})

    def test_select_all_within_one_element(self):
        d = self.act("select_all", element="Design Control")
        expected = {c["criterion_id"] for c in CHECKLIST["criteria"] if c["source_sheet"] == "Design Control"}
        self.assertEqual(set(d["selected"]), expected)

    def test_clear_all_within_one_element_keeps_other_elements(self):
        d = self.act("select_all")
        d2 = self.act("clear_all", element="Design Control", draft=d)
        self.assertFalse(any(c["source_sheet"] == "Design Control" for c in CHECKLIST["criteria"] if c["criterion_id"] in d2["selected"]))
        self.assertIn(ORG_101, d2["selected"])

    def test_select_all_and_clear_all_globally(self):
        self.assertEqual(len(self.act("select_all")["selected"]), 126)
        self.assertEqual(self.act("clear_all", draft=self.act("select_all"))["selected"], [])

    def test_clear_one_criterion(self):
        d = self.act("select", ids=[ORG_101, MP_1])
        self.assertEqual(self.act("clear", ids=[ORG_101], draft=d)["selected"], [MP_1])

    def test_unknown_criterion_is_refused(self):
        with self.assertRaises(ValueError) as ctx:
            self.act("select", ids=["REG:FAA QSA 1.0:Nowhere:9"])
        self.assertIn("unknown criterion", str(ctx.exception))

    def test_select_without_ids_is_refused(self):
        with self.assertRaises(ValueError):
            self.act("select", ids=[])

    def test_unknown_element_is_refused(self):
        with self.assertRaises(ValueError):
            self.act("select_all", element="Not an element")


class AdditionTests(unittest.TestCase):
    when = "2026-10-08T15:00:00"

    def test_addition_is_marked_and_sourced_and_separate_from_source_rows(self):
        draft = q.add_additional({"selected": [], "additions": []}, "ADD-0001",
                                 "Is the Bay 2 calibration label current?", "Auditor note, bench walk 2026-10-08", self.when)
        cat = q.catalogue(CHECKLIST, draft)
        add = next(c for c in cat if c["criterion_id"].startswith("REG:FAA QSA 1.0 ADDITIONAL:"))
        self.assertEqual(add["origin"], "ADDED_BY_AUDITOR")
        self.assertEqual(add["source_sheet"], "ADDITIONAL")
        self.assertEqual(add["source_citation"], "Auditor note, bench walk 2026-10-08")
        self.assertEqual(len(cat), len(CHECKLIST["criteria"]) + 1)

    def test_addition_needs_a_source(self):
        with self.assertRaises(ValueError) as ctx:
            q.add_additional({"selected": [], "additions": []}, "ADD-0002", "A question", "  ", self.when)
        self.assertIn("source citation", str(ctx.exception))

    def test_addition_needs_a_question(self):
        with self.assertRaises(ValueError):
            q.add_additional({"selected": [], "additions": []}, "ADD-0002", "", "source", self.when)

    def test_addition_cannot_take_a_source_row_reference(self):
        for label in ("101", "1", "ADD-1", "ADD-00001"):
            with self.subTest(label=label), self.assertRaises(ValueError):
                q.add_additional({"selected": [], "additions": []}, label, "q", "src", self.when)

    def test_duplicate_addition_label_is_refused(self):
        d = q.add_additional({"selected": [], "additions": []}, "ADD-0001", "q", "src", self.when)
        with self.assertRaises(ValueError):
            q.add_additional(d, "ADD-0001", "q2", "src2", self.when)


class DraftPersistenceTests(unittest.TestCase):
    def setUp(self):
        self.root = scratch()

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def test_draft_reloads_from_disk_and_is_not_in_the_ledger(self):
        draft = {"selected": [ORG_101, MP_1], "additions": []}
        q.write_draft(self.root, "DEMO", draft)
        self.assertEqual(q.read_draft(self.root, "DEMO"), draft)
        self.assertFalse(lg.ledger_path(self.root, "DEMO").exists())

    def test_empty_draft_when_none_saved(self):
        self.assertEqual(q.read_draft(self.root, "NEW"), {"selected": [], "additions": []})


class PublicationTests(unittest.TestCase):
    def setUp(self):
        self.root = scratch()
        self.audit = "DEMO"

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def select(self, ids, additions=()):
        draft = {"selected": sorted(ids), "additions": []}
        for label, question, source in additions:
            draft = q.add_additional(draft, label, question, source, "2026-10-08T15:00:00")
        q.write_draft(self.root, self.audit, draft)

    def test_publication_refused_when_nothing_is_selected(self):
        q.write_draft(self.root, self.audit, {"selected": [], "additions": []})
        with self.assertRaises(ValueError) as ctx:
            q.publish(self.root, self.audit, CHECKLIST)
        self.assertIn("nothing selected", str(ctx.exception))
        self.assertFalse(lg.ledger_path(self.root, self.audit).exists())
        self.assertEqual(list((self.root / self.audit / "qsa").glob("published-v*.json")), [])

    def test_publication_contains_only_the_selected_criteria(self):
        self.select([ORG_101, MP_1])
        result = q.publish(self.root, self.audit, CHECKLIST, now="2026-10-08T15:10:00")
        snap = json.loads((self.root / self.audit / result["file"]).read_text(encoding="utf-8"))
        self.assertEqual({c["criterion_id"] for c in snap["criteria"]}, {ORG_101, MP_1})
        self.assertEqual(snap["selected_count"], 2)
        self.assertEqual(snap["by_element"], {"Organizational Management": 1, "Manufacturing Processes": 1})

    def test_publication_preserves_reference_sheet_hash_applicability_evidence_assessment_and_finding(self):
        self.select([ORG_101])
        result = q.publish(self.root, self.audit, CHECKLIST)
        snap = json.loads((self.root / self.audit / result["file"]).read_text(encoding="utf-8"))
        src = next(c for c in CHECKLIST["criteria"] if c["criterion_id"] == ORG_101)
        out = snap["criteria"][0]
        for k in ("criteria_ref", "source_sheet", "source_sha256", "applicability", "assessment",
                  "evidence_ids", "finding_id", "status", "question", "condition_text"):
            self.assertEqual(out[k], src[k], k)
        self.assertEqual(snap["source"]["file_sha256"], CHECKLIST["file_sha256"])
        self.assertEqual(snap["source"]["xlsx_source_sha256"], CHECKLIST["data"]["source_sha256"])

    def test_publication_includes_additions_marked_and_sourced(self):
        self.select([ORG_101], additions=[("ADD-0001", "Is the bench label current?", "Bench walk 2026-10-08")])
        draft = q.read_draft(self.root, self.audit)
        draft["selected"] = sorted(draft["selected"] + [draft["additions"][0]["criterion_id"]])
        q.write_draft(self.root, self.audit, draft)
        result = q.publish(self.root, self.audit, CHECKLIST)
        snap = json.loads((self.root / self.audit / result["file"]).read_text(encoding="utf-8"))
        add = next(c for c in snap["criteria"] if c["origin"] == "ADDED_BY_AUDITOR")
        self.assertEqual(add["source_citation"], "Bench walk 2026-10-08")
        self.assertEqual(add["source_sheet"], "ADDITIONAL")
        source_rows = [c for c in snap["criteria"] if c["origin"] == "FAA_SOURCE"]
        self.assertEqual(len(source_rows), 1)
        self.assertEqual(source_rows[0]["criterion_id"], ORG_101)

    def test_publication_is_recorded_in_the_ledger_with_the_file_hash(self):
        self.select([ORG_101])
        result = q.publish(self.root, self.audit, CHECKLIST)
        entries = lg.read_entries(lg.ledger_path(self.root, self.audit))
        self.assertEqual(entries[-1]["record_type"], "qsa_publication")
        self.assertEqual(entries[-1]["record"]["sha256"], result["sha256"])
        self.assertEqual(sha256_file(self.root / self.audit / result["file"]), result["sha256"])
        self.assertEqual(lg.verify(entries)[0], [])

    def test_each_publication_is_a_new_version_and_earlier_files_do_not_change(self):
        self.select([ORG_101])
        v1 = q.publish(self.root, self.audit, CHECKLIST)
        before = (self.root / self.audit / v1["file"]).read_bytes()
        self.select([ORG_101, MP_1])
        v2 = q.publish(self.root, self.audit, CHECKLIST)
        self.assertEqual((v1["version"], v2["version"]), (1, 2))
        self.assertEqual((self.root / self.audit / v1["file"]).read_bytes(), before)


class StartAuditTests(unittest.TestCase):
    def setUp(self):
        self.root = scratch()
        self.audit = "DEMO"
        q.write_draft(self.root, self.audit, {"selected": [ORG_101, MP_1], "additions": []})
        self.pub = q.publish(self.root, self.audit, CHECKLIST)

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def test_start_audit_returns_the_published_criteria_after_reload(self):
        start = q.start_audit(self.root, self.audit, CHECKLIST)
        self.assertEqual({c["criterion_id"] for c in start["criteria"]}, {ORG_101, MP_1})
        self.assertFalse(start["source_changed_since_publication"])
        self.assertEqual(start["sha256"], self.pub["sha256"])

    def test_draft_changes_after_publication_do_not_change_the_audit(self):
        draft = q.read_draft(self.root, self.audit)
        q.write_draft(self.root, self.audit, dict(draft, selected=[]))
        start = q.start_audit(self.root, self.audit, CHECKLIST)
        self.assertEqual({c["criterion_id"] for c in start["criteria"]}, {ORG_101, MP_1})

    def test_start_audit_refused_before_any_publication(self):
        other = scratch()
        try:
            with self.assertRaises(ValueError) as ctx:
                q.start_audit(other, "NEW", CHECKLIST)
            self.assertIn("no published selection", str(ctx.exception))
        finally:
            shutil.rmtree(other, ignore_errors=True)

    def test_edited_published_file_refuses_start(self):
        path = self.root / self.audit / self.pub["file"]
        path.write_bytes(path.read_bytes().replace(b"Organizational Management", b"Organisational Management"))
        with self.assertRaises(ValueError) as ctx:
            q.start_audit(self.root, self.audit, CHECKLIST)
        self.assertIn("does not match the ledger", str(ctx.exception))

    def test_missing_published_file_refuses_start(self):
        (self.root / self.audit / self.pub["file"]).unlink()
        with self.assertRaises(ValueError) as ctx:
            q.start_audit(self.root, self.audit, CHECKLIST)
        self.assertIn("missing", str(ctx.exception))

    def test_edited_ledger_refuses_start(self):
        path = lg.ledger_path(self.root, self.audit)
        path.write_text(path.read_text(encoding="utf-8").replace('"selected_count":2', '"selected_count":9'), encoding="utf-8")
        with self.assertRaises(ValueError) as ctx:
            q.start_audit(self.root, self.audit, CHECKLIST)
        self.assertIn("ledger does not verify", str(ctx.exception))

    def test_source_checklist_change_is_flagged_not_silently_used(self):
        changed = copy.deepcopy(CHECKLIST)
        changed["file_sha256"] = "0" * 64
        start = q.start_audit(self.root, self.audit, changed)
        self.assertTrue(start["source_changed_since_publication"])
        self.assertEqual({c["criterion_id"] for c in start["criteria"]}, {ORG_101, MP_1})

    def test_export_section_omits_question_and_condition_text(self):
        start = q.start_audit(self.root, self.audit, CHECKLIST)
        section = q.export_section(start)
        text = json.dumps(section)
        self.assertNotIn("question", text)
        self.assertNotIn("condition_text", text)
        self.assertEqual(len(section["criteria"]), 2)
        self.assertIn("applicability", section["criteria"][0])

    def test_ledger_rejects_a_publication_pointing_outside_qsa(self):
        with self.assertRaises(ValueError):
            lg.append(self.root, self.audit, "qsa_publication",
                      {"version": 2, "file": "../escape.json", "sha256": "ab" * 32, "selected_count": 1})


if __name__ == "__main__":
    unittest.main()
