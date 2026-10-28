"""Tests for the lettered-row batches and their merge checks (content/checklists/lettered/merge_lettered.py).

Covers: complete coverage of the canonical lettered rows, duplicate-reference refusal, required-field
refusal, unknown-reference refusal, and no write when a merge is refused. Bad batches are written only
to a scratch folder inside this product folder.
"""
import json
import shutil
import sys
import unittest
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "content" / "checklists" / "lettered"))
import merge_lettered as ml  # noqa: E402


def scratch():
    d = ROOT / "tests" / "_scratch" / uuid.uuid4().hex
    d.mkdir(parents=True)
    return d


def write_batch(folder, name, std, rows):
    (folder / name).write_text(json.dumps({"standard": std, "rows": rows}), encoding="utf-8")


class CoverageTests(unittest.TestCase):
    def test_every_canonical_lettered_row_is_authored(self):
        for std in ("AS9100D", "AS9110C"):
            result, errors = ml.merge(std)
            self.assertEqual(errors, [], errors)
            data, summary = result
            self.assertEqual(summary["pending_authoring"], 0, std)
            self.assertEqual(summary["authored"], summary["lettered_total"], std)

    def test_authored_rows_have_question_and_evidence(self):
        for std in ("AS9100D", "AS9110C"):
            data, _ = ml.merge(std)[0]
            for it in data["items"]:
                if it.get("type") == "lettered_subparagraph":
                    self.assertTrue(it["question"], it["ref"])
                    self.assertTrue(it["evidence"], it["ref"])
                    self.assertEqual(it["wording_status"], "AUTHORED", it["ref"])

    def test_no_row_has_invented_clause_number(self):
        for std in ("AS9100D", "AS9110C"):
            data, _ = ml.merge(std)[0]
            known = {i["ref"] for i in data["items"]}
            for it in data["items"]:
                if it.get("parent_ref"):
                    self.assertIn(it["parent_ref"], known, it["ref"])


class RefusalTests(unittest.TestCase):
    def setUp(self):
        self.dir = scratch()
        self.original = ml.BATCH_DIR
        ml.BATCH_DIR = self.dir

    def tearDown(self):
        ml.BATCH_DIR = self.original
        shutil.rmtree(self.dir, ignore_errors=True)
        parent = ROOT / "tests" / "_scratch"
        if parent.exists() and not any(parent.iterdir()):
            parent.rmdir()

    def test_duplicate_reference_across_batches_is_refused(self):
        row = {"ref": "8.5.1(a)", "question": "q", "evidence": ["e"]}
        write_batch(self.dir, "AS9110C-batch-01.json", "AS9110C", [row])
        write_batch(self.dir, "AS9110C-batch-02.json", "AS9110C", [row])
        _, errors = ml.merge("AS9110C")
        self.assertTrue(any("duplicate reference 8.5.1(a)" in e for e in errors), errors)

    def test_missing_question_is_refused(self):
        write_batch(self.dir, "AS9110C-batch-01.json", "AS9110C", [{"ref": "8.5.1(a)", "question": "", "evidence": ["e"]}])
        _, errors = ml.merge("AS9110C")
        self.assertTrue(any("missing required field question" in e for e in errors), errors)

    def test_empty_evidence_is_refused(self):
        write_batch(self.dir, "AS9110C-batch-01.json", "AS9110C", [{"ref": "8.5.1(a)", "question": "q", "evidence": []}])
        _, errors = ml.merge("AS9110C")
        self.assertTrue(any("evidence list is empty" in e for e in errors), errors)

    def test_unknown_reference_is_refused(self):
        write_batch(self.dir, "AS9110C-batch-01.json", "AS9110C", [{"ref": "8.9.9(z)", "question": "q", "evidence": ["e"]}])
        _, errors = ml.merge("AS9110C")
        self.assertTrue(any("8.9.9(z) is not a lettered row" in e for e in errors), errors)

    def test_refused_merge_returns_no_result(self):
        write_batch(self.dir, "AS9110C-batch-01.json", "AS9110C", [{"ref": "8.9.9(z)", "question": "q", "evidence": ["e"]}])
        result, errors = ml.merge("AS9110C")
        self.assertIsNone(result)
        self.assertTrue(errors)


if __name__ == "__main__":
    unittest.main()
