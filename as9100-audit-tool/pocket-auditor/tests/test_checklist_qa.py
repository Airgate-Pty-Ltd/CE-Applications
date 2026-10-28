"""Tests for content/qa/reconcile_checklists.py: the checklist reconciliation must fail on missing or invalid checklist data.

Three kinds of test:
1. The full reconciliation of AS9100D, AS9110C and the FAA QSA rows has no BLOCK exceptions.
2. Seeded defects in small fixtures are each caught (missing question, verbatim copy, invented reference, omitted
   sub-paragraph, broken sequence, missing parent, wrong locator, duplicate question, invented clause).
3. The owner decisions are reported, not hidden.

Reads licensed-private and the workbook read only. Writes nothing (the report is written by the script, not here).
"""
import copy
import json
import shutil
import sys
import unittest
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "content" / "qa"))
import reconcile_checklists as rc  # noqa: E402
import extract_lettered as ex  # noqa: E402


def fresh_report():
    return rc.Report()


def blocks(rep):
    return [e for e in rep.exceptions if e["severity"] == "BLOCK"]


def has(rep, check, ref=None):
    return any(e["check"] == check and (ref is None or e["ref"] == ref) for e in rep.exceptions)


class FullReconciliationTests(unittest.TestCase):
    """The checklists must have zero blocking exceptions. Failing here means the checklist is wrong against its source."""

    @classmethod
    def setUpClass(cls):
        cls.rep = rc.run()

    def test_no_blocking_exceptions_in_any_checklist(self):
        self.assertEqual([(e["standard"], e["ref"], e["check"], e["detail"]) for e in blocks(self.rep)], [])

    def test_every_standard_and_the_faa_source_was_actually_checked(self):
        for std in ("AS9100D", "AS9110C", "FAA QSA 1.0"):
            n = sum(v for k, v in self.rep.checks.items() if k.startswith(std))
            self.assertGreater(n, 100, std)

    def test_faa_baseline_is_complete_and_owner_decisions_are_resolved(self):
        # Owner decision (2026-10-08): import all 126 workbook rows, mark description rows SYSTEM_DESCRIPTION,
        # keep the 14 element-level notes as context. No owner decisions remain open.
        self.assertEqual([e for e in self.rep.exceptions if e["severity"] == "OWNER_DECISION"], [])
        self.assertEqual(self.rep.checks.get("FAA QSA 1.0: imported rows checked against the workbook"), 126)

    def test_lettered_extract_matches_the_checklist(self):
        for std in ("AS9100D", "AS9110C"):
            extracted = {i["ref"] for i in ex.extract(std)}
            expected = ex.checklist_lettered(std)
            self.assertEqual(extracted, expected, std)

    def test_clause_index_rejects_references_known_to_be_invented(self):
        for std in ("AS9100D", "AS9110C"):
            exist = rc.licensed_headings(std, rc.licensed_clauses(std))
            for invented in ("7.2.2", "10.2.1.1", "8.6.1", "4.3.1"):
                self.assertNotIn(invented, exist, f"{std} {invented}")

    def test_clause_index_accepts_top_level_and_toc_only_headings(self):
        exist = rc.licensed_headings("AS9110C", rc.licensed_clauses("AS9110C"))
        for ref in ("5", "10", "10.2"):
            self.assertIn(ref, exist)


class SeededDefectTests(unittest.TestCase):
    STD = "AS9110C"
    LICENSED = "The organization shall determine the external and internal issues that are relevant to its purpose."

    def row(self, **over):
        base = {"ref": "4.1", "type": None, "question": "How do you determine the issues that affect your purpose?",
                "evidence": ["Documented analysis of context issues"], "wording_status": "AUTHORED",
                "source_locator": "licensed-private/AS9110C.pdf, clause 4.1"}
        base.update(over)
        return base

    def test_missing_question_is_blocking(self):
        rep = fresh_report()
        rc.check_authored(rep, self.STD, self.row(question=""), "")
        self.assertTrue(has(rep, "missing question", "4.1"))

    def test_missing_or_empty_evidence_is_blocking(self):
        rep = fresh_report()
        rc.check_authored(rep, self.STD, self.row(evidence=[]), "")
        rc.check_authored(rep, self.STD, self.row(evidence=["  "]), "")
        self.assertEqual(sum(1 for e in rep.exceptions if e["check"] == "missing evidence prompts"), 2)

    def test_wording_not_authored_is_blocking(self):
        rep = fresh_report()
        rc.check_authored(rep, self.STD, self.row(wording_status="DRAFT"), "")
        self.assertTrue(has(rep, "wording status not AUTHORED", "4.1"))

    def test_verbatim_copy_of_eight_words_is_blocking(self):
        rep = fresh_report()
        copied = dict(self.row(), question="Show how the organization shall determine the external and internal issues.")
        rc.check_authored(rep, self.STD, copied, self.LICENSED)
        self.assertTrue(has(rep, "verbatim licensed wording", "4.1"))

    def test_our_own_wording_is_not_flagged(self):
        rep = fresh_report()
        rc.check_authored(rep, self.STD, self.row(), self.LICENSED)
        self.assertFalse(has(rep, "verbatim licensed wording"))

    def test_duplicate_question_across_rows_is_blocking(self):
        rep = fresh_report()
        rows = [self.row(ref="4.1"), self.row(ref="4.2", question=self.row()["question"])]
        rc.check_duplicates_across_rows(rep, self.STD, rows)
        self.assertTrue(has(rep, "duplicate question across rows"))

    def test_clause_row_with_unknown_reference_is_blocking(self):
        rep = fresh_report()
        rows = [self.row(ref="7.2.2", source_locator="licensed-private/AS9110C.pdf, clause 7.2.2")]
        rc.check_clause_rows(rep, self.STD, rows, {"4.1": "x"}, {"4.1"})
        self.assertTrue(has(rep, "row reference not in licensed text", "7.2.2"))

    def test_clause_row_without_parent_is_blocking(self):
        rep = fresh_report()
        rows = [self.row(ref="4.4.1", source_locator="licensed-private/AS9110C.pdf, clause 4.4.1")]
        rc.check_clause_rows(rep, self.STD, rows, {"4.4.1": "x"}, {"4.4.1"})
        self.assertTrue(has(rep, "hierarchy: parent row missing", "4.4.1"))

    def test_locator_that_does_not_name_the_clause_is_blocking(self):
        rep = fresh_report()
        rows = [self.row(source_locator="licensed-private/AS9110C.pdf, clause 4.9")]
        rc.check_clause_rows(rep, self.STD, rows, {"4.1": "x"}, {"4.1"})
        self.assertTrue(has(rep, "locator does not name the clause", "4.1"))

    def test_lettered_row_not_in_licensed_text_is_blocking(self):
        rep = fresh_report()
        parent = self.row(ref="8.9", source_locator="licensed-private/AS9110C.pdf, clause 8.9")
        rows = [parent, self.row(ref="8.9(a)", type="lettered_subparagraph",
                                 source_locator="licensed-private/AS9110C.pdf, clause 8.9, item (a)")]
        rc.check_lettered_rows(rep, self.STD, rows, {"8.9(b)": "b. text"}, {"8.9": "x"})
        self.assertTrue(has(rep, "invented lettered row", "8.9(a)"))
        self.assertTrue(has(rep, "omitted lettered sub-paragraph", "8.9(b)"))

    def test_lettered_sequence_gap_is_blocking(self):
        rep = fresh_report()
        parent = self.row(ref="8.9", source_locator="licensed-private/AS9110C.pdf, clause 8.9")
        rows = [parent,
                self.row(ref="8.9(a)", type="lettered_subparagraph", source_locator="licensed-private/AS9110C.pdf, clause 8.9, item (a)"),
                self.row(ref="8.9(c)", type="lettered_subparagraph", source_locator="licensed-private/AS9110C.pdf, clause 8.9, item (c)")]
        lic = {"8.9(a)": "a. one", "8.9(b)": "b. two", "8.9(c)": "c. three"}
        rc.check_lettered_rows(rep, self.STD, rows, lic, {"8.9": "x"})
        self.assertTrue(has(rep, "lettered sequence gap or order", "8.9"))

    def test_duplicate_reference_is_blocking(self):
        rep = fresh_report()
        parent = self.row(ref="8.9", source_locator="licensed-private/AS9110C.pdf, clause 8.9")
        letter = self.row(ref="8.9(a)", type="lettered_subparagraph", source_locator="licensed-private/AS9110C.pdf, clause 8.9, item (a)")
        rc.check_lettered_rows(rep, self.STD, [parent, letter, dict(letter, question="another question")],
                               {"8.9(a)": "a. one"}, {"8.9": "x"})
        self.assertTrue(has(rep, "duplicate reference", "8.9(a)"))

    def test_lettered_locator_with_wrong_item_is_blocking(self):
        rep = fresh_report()
        parent = self.row(ref="8.9", source_locator="licensed-private/AS9110C.pdf, clause 8.9")
        bad = self.row(ref="8.9(a)", type="lettered_subparagraph", source_locator="licensed-private/AS9110C.pdf, clause 8.9, item (b)")
        rc.check_lettered_rows(rep, self.STD, [parent, bad], {"8.9(a)": "a. one"}, {"8.9": "x"})
        self.assertTrue(has(rep, "locator does not name clause and item", "8.9(a)"))


class FaaSourceTests(unittest.TestCase):
    def test_imported_row_that_differs_from_the_workbook_is_blocking(self):
        data = json.loads(rc.FAA_JSON.read_text(encoding="utf-8"))
        data = copy.deepcopy(data)
        data["criteria"][0]["question"] = data["criteria"][0]["question"] + " (altered)"
        scratch = ROOT / "tests" / "_scratch" / uuid.uuid4().hex
        scratch.mkdir(parents=True)
        original = rc.FAA_JSON
        try:
            path = scratch / "faa.json"
            path.write_text(json.dumps(data), encoding="utf-8")
            rc.FAA_JSON = path
            rep = rc.run()
            self.assertTrue(any(e["check"] == "question text differs from workbook" and e["severity"] == "BLOCK"
                                for e in rep.exceptions))
        finally:
            rc.FAA_JSON = original
            shutil.rmtree(scratch, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
