"""Tests: the generated sample FAA QSA packages and the import field dictionary.

Checks the two sample packages (owner and external) with the contract checks, the withheld-source rules, that no
question or licensed locator text reaches the external package, that every field in the samples is documented in
docs/MIKE-IMPORT-FIELD-DICTIONARY.md, and that the builder refuses to overwrite its write-once output.
"""
import json
import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "engine"))
import pa_export as pe  # noqa: E402
import pa_qsa as qsa  # noqa: E402
import pa_mike_export as mx  # noqa: E402
import build_qsa_sample as bs  # noqa: E402
from pa_engine import load_registry  # noqa: E402

SAMPLE = ROOT / "exports" / "SAMPLE-FAA-QSA-PACKAGE"
DOC = ROOT / "docs" / "MIKE-IMPORT-FIELD-DICTIONARY.md"
CHECKLIST = qsa.load_checklist()


def load(name):
    folder = SAMPLE / name
    return folder, json.loads((folder / "package.json").read_text(encoding="utf-8"))


class SamplePackageTests(unittest.TestCase):
    def test_samples_exist_and_verify(self):
        for name in ("burrana", "external"):
            folder, _ = load(name)
            self.assertEqual(pe.verify_export(folder), (True, None), name)

    def test_samples_pass_the_contract_checks(self):
        for name in ("burrana", "external"):
            _, pkg = load(name)
            self.assertEqual(pe.check_package(pkg), [], name)
            self.assertEqual(len(pe.PACKAGE_REQUIRED), 19)
            self.assertEqual(set(pkg), set(pe.PACKAGE_REQUIRED), name)

    def test_owner_sample_carries_the_qsa_section_and_the_faa_source(self):
        _, pkg = load("burrana")
        self.assertEqual(pkg["sources_withheld_for_licence"], [])
        self.assertTrue(any(s["source_id"] == mx.FAA_SOURCE_ID for s in pkg["sources"]))
        self.assertTrue(any(str(i.get("requirement_id", "")).startswith("REG:FAA QSA 1.0") for i in pkg["checklist_items"]))
        self.assertIsNotNone(pkg["snapshot"]["qsa_publication"])

    def test_external_sample_withholds_the_faa_and_licensed_standard_content(self):
        _, pkg = load("external")
        self.assertEqual(set(pkg["sources_withheld_for_licence"]), {"AS9100D", "AS9110C", "FAA-QSA-1.0"})
        self.assertFalse(any(s["source_id"] == mx.FAA_SOURCE_ID for s in pkg["sources"]))
        self.assertEqual(pkg["checklist_items"], [])
        self.assertEqual(pkg["assessments"], [])
        self.assertEqual(pkg["not_assessed"], [])
        self.assertIsNone(pkg["snapshot"]["qsa_publication"])

    def test_external_sample_has_no_licensed_locator_or_qsa_identifier(self):
        folder, _ = load("external")
        text = (folder / "package.json").read_text(encoding="utf-8")
        self.assertNotIn("licensed-private", text)
        self.assertNotIn("STD:SAE AS9110C:", text)
        self.assertNotIn("REG:FAA QSA 1.0", text)

    def test_no_criterion_question_text_appears_in_either_sample(self):
        probes = [c["question"][:50] for c in CHECKLIST["criteria"][:12] if len(c["question"]) > 50]
        for name in ("burrana", "external"):
            folder, _ = load(name)
            text = (folder / "package.json").read_text(encoding="utf-8")
            for p in probes:
                self.assertNotIn(p, text, name)

    def test_withheld_marker_replaces_licensed_references_for_external(self):
        _, pkg = load("external")
        for car in pkg["prior_car_reviews"]:
            self.assertEqual(car["linked_requirement"], mx.WITHHELD)

    def test_evidence_types_use_the_contract_vocabulary(self):
        allowed = {"record", "controlled_document", "system_data", "observation", "photo_file", "interview", "verbal"}
        for name in ("burrana", "external"):
            _, pkg = load(name)
            self.assertTrue(all(e["evidence_type"] in allowed for e in pkg["evidence"]), name)


class DictionaryTests(unittest.TestCase):
    def test_every_top_level_key_is_documented(self):
        doc = DOC.read_text(encoding="utf-8")
        for key in pe.PACKAGE_REQUIRED:
            self.assertIn(f"`{key}`", doc, key)

    def test_every_field_in_the_samples_is_documented(self):
        doc = DOC.read_text(encoding="utf-8")
        names = set()
        for name in ("burrana", "external"):
            _, pkg = load(name)
            for value in pkg.values():
                if isinstance(value, list):
                    for item in value:
                        if isinstance(item, dict):
                            names |= set(item)
                elif isinstance(value, dict):
                    names |= set(value)
        missing = sorted(n for n in names if not re.search(rf"`{re.escape(n)}`", doc))
        self.assertEqual(missing, [], "undocumented fields")

    def test_dictionary_states_the_withheld_key_is_required(self):
        self.assertIn("**Required.**", DOC.read_text(encoding="utf-8"))


class BuilderTests(unittest.TestCase):
    def test_builder_refuses_to_overwrite_its_write_once_output(self):
        with self.assertRaises(SystemExit) as ctx:
            bs.build()
        self.assertIn("write-once", str(ctx.exception))

    def test_sample_registry_keys_match_the_withholding_rule(self):
        reg = load_registry()["sources"]
        self.assertIn("STD:SAE AS9110C:", mx.licensed_prefixes(reg))
        self.assertIn("REG:FAA QSA 1.0:", mx.licensed_prefixes(reg))


if __name__ == "__main__":
    unittest.main()
