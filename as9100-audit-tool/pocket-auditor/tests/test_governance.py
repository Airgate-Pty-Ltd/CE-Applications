"""Tests for engine/pa_governance.py and its wiring into the renderer."""
import copy
import sys
import unittest
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "engine"))
import pa_engine as pa  # noqa: E402
import pa_governance as gv  # noqa: E402


class RequirementIdTests(unittest.TestCase):
    def test_standard_and_regulation_ids(self):
        self.assertEqual(gv.requirement_id("STD", "AS9110C", "8.1.1"), "STD:AS9110C:8.1.1")
        self.assertEqual(gv.requirement_id("REG", "14 CFR 21", "21.137(a)"), "REG:14 CFR 21:21.137(a)")

    def test_bad_kind_rejected(self):
        with self.assertRaises(ValueError):
            gv.requirement_id("XX", "AS9110C", "8.1")

    def test_render_lines_carry_requirement_id(self):
        reg = pa.load_registry()
        out = pa.render_checklist(["AS9110C"], reg)
        self.assertTrue(all(l["requirement_id"].startswith("STD:") for l in out["lines"]))
        out2 = pa.render_checklist(["FAA-14CFR-21"], reg)
        self.assertTrue(all(l["requirement_id"].startswith("REG:") for l in out2["lines"][:5]))


class EvidenceRankTests(unittest.TestCase):
    def test_hierarchy_order(self):
        self.assertLess(gv.evidence_rank("record"), gv.evidence_rank("system_data"))
        self.assertLess(gv.evidence_rank("system_data"), gv.evidence_rank("observation"))
        self.assertLess(gv.evidence_rank("observation"), gv.evidence_rank("interview"))
        self.assertLess(gv.evidence_rank("interview"), gv.evidence_rank("verbal"))

    def test_unknown_type_rejected(self):
        with self.assertRaises(ValueError):
            gv.evidence_rank("hearsay")


class LicenceTests(unittest.TestCase):
    def src(self, **kw):
        base = {"status": "approved", "licence_use": "ORG_PRIVATE_LICENSED", "licence_scope_owner": "Org A"}
        base.update(kw)
        return base

    def test_approved_licensed_source_passes_gate(self):
        self.assertEqual(gv.licence_gate(self.src()), (True, []))

    def test_missing_licence_state_blocks(self):
        ok, reasons = gv.licence_gate(self.src(licence_use=None))
        self.assertFalse(ok)
        self.assertTrue(any("licence_use" in r for r in reasons))

    def test_unverified_state_blocks(self):
        ok, _ = gv.licence_gate(self.src(licence_use="UNVERIFIED_OR_UNAVAILABLE"))
        self.assertFalse(ok)

    def test_approved_without_owner_blocks(self):
        ok, reasons = gv.licence_gate(self.src(licence_scope_owner=None))
        self.assertFalse(ok)

    def test_org_private_visible_only_to_owner(self):
        self.assertTrue(gv.verbatim_allowed(self.src(), "Org A"))
        self.assertFalse(gv.verbatim_allowed(self.src(), "Org B"))

    def test_metadata_only_never_verbatim(self):
        self.assertFalse(gv.verbatim_allowed(self.src(licence_use="REFERENCE_METADATA_ONLY"), "Org A"))

    def test_customer_private_not_visible_across_orgs(self):
        s = self.src(licence_use="CUSTOMER_PRIVATE_LICENSED", licence_scope_owner="Customer X")
        self.assertTrue(gv.verbatim_allowed(s, "Customer X"))
        self.assertFalse(gv.verbatim_allowed(s, "Org A"))

    def test_shared_distributable_is_visible(self):
        self.assertTrue(gv.verbatim_allowed(self.src(licence_use="SHARED_DISTRIBUTABLE"), "Anyone"))

    def test_unlicensed_approved_source_does_not_render_approved_package(self):
        reg = pa.load_registry()
        reg = copy.deepcopy(reg)
        reg["sources"]["AS9110C"].update({"status": "approved", "licence_scope_owner": None})
        out = pa.render_checklist(["AS9110C"], reg)
        self.assertEqual(out["package_status"], "DRAFT - NOT FOR AUDIT USE")
        self.assertTrue(any("licence gate" in p["reason"] for p in out["pending_sources"]))

    def test_licensed_and_approved_renders_approved_package(self):
        reg = copy.deepcopy(pa.load_registry())
        reg["sources"]["AS9110C"].update({"status": "approved", "licence_scope_owner": "Org A"})
        out = pa.render_checklist(["AS9110C"], reg)
        self.assertEqual(out["package_status"], "APPROVED")


class CarReviewTests(unittest.TestCase):
    def car(self, **kw):
        base = {"car_id": "CAR-1", "source_system": "QMS export", "linked_requirement": "STD:AS9110C:8.1.1",
                "problem_statement": "p", "owner": "O", "due_date": "2026-09-01", "status": "open"}
        base.update(kw)
        return base

    def test_required_fields(self):
        errs = gv.validate_car_review({"car_id": "CAR-1"})
        self.assertIn("missing field: owner", errs)

    def test_closed_without_effectiveness_evidence_is_flagged(self):
        flags = gv.car_flags(self.car(status="closed"), date(2026, 10, 8))
        self.assertTrue(any("CLOSED WITHOUT EFFECTIVENESS" in f for f in flags))

    def test_overdue_open_car_is_flagged(self):
        self.assertIn("OVERDUE", gv.car_flags(self.car(), date(2026, 10, 8)))

    def test_not_overdue_when_due_in_future(self):
        self.assertNotIn("OVERDUE", gv.car_flags(self.car(due_date="2026-12-01"), date(2026, 10, 8)))

    def test_recurring_or_ineffective_raises_risk_flag(self):
        flags = gv.car_flags(self.car(auditor_result="recurring"), date(2026, 10, 8))
        self.assertTrue(any("RECURRING OR INEFFECTIVE" in f for f in flags))

    def test_unknown_auditor_result_rejected(self):
        self.assertIn("auditor_result not recognised", gv.validate_car_review(self.car(auditor_result="great")))


if __name__ == "__main__":
    unittest.main()
