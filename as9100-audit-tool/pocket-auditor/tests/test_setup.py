"""Tests for the audit setup (Step 1) and audit status: required fields, dates, lead and auditee separation, the conflict
refusal, single setup, and one-step status moves. Scratch audits live only in tests/_scratch inside the product folder.
"""
import shutil
import sys
import unittest
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "engine"))
import pa_setup as su  # noqa: E402
import pa_setup_rules as rules  # noqa: E402
import pa_ledger as lg  # noqa: E402

NOW = "2026-10-08T10:00:00"


def setup(**over):
    rec = {
        "audit_type": "SUPPLIER", "audit_id": "AUD-2026-001", "title": "Supplier audit: Bench 2 tooling",
        "objectives": "Confirm tooling tags and calibration records", "lead_auditor": "Auditor B",
        "team": ["Auditor C"], "auditee_contact": "Maintenance lead", "independence": {"conflict": False,
        "statement": "No relationship with the auditee in the last 3 years"}, "site": "Bay 2",
        "method": "ON_SITE", "start": "2026-11-02T09:00", "end": "2026-11-03T16:00",
        "opening_meeting": "2026-11-02T09:00", "closing_meeting": "2026-11-03T15:30", "report_due": "2026-11-10",
        "sponsor_approver": "Quality director", "permissions": {"safety": "PPE required", "confidentiality": "Standard NDA",
        "access": "Escorted", "photos": True}, "status": "PLANNED"}
    rec.update(over)
    return rec


class SetupRuleTests(unittest.TestCase):
    def test_complete_setup_is_valid(self):
        self.assertEqual(rules.validate_setup(setup()), [])

    def test_each_required_field_is_enforced(self):
        for k in ("audit_type", "title", "objectives", "lead_auditor", "auditee_contact", "site", "method", "start",
                  "end", "report_due", "sponsor_approver", "permissions"):
            with self.subTest(field=k):
                rec = setup()
                rec.pop(k)
                self.assertIn(f"missing field: {k}", rules.validate_setup(rec))

    def test_end_before_start_is_refused(self):
        self.assertIn("end is before start", rules.validate_setup(setup(end="2026-11-01T09:00")))

    def test_report_due_before_end_is_refused(self):
        self.assertIn("report_due is before the end of the audit", rules.validate_setup(setup(report_due="2026-11-01")))

    def test_lead_cannot_be_the_auditee_contact(self):
        self.assertIn("lead auditor cannot be the auditee contact",
                      rules.validate_setup(setup(lead_auditor="Maintenance lead")))

    def test_declared_conflict_refuses_the_audit(self):
        errs = rules.validate_setup(setup(independence={"conflict": True, "statement": "Former employee"}))
        self.assertTrue(any("conflict of interest is declared" in e for e in errs))

    def test_independence_needs_a_statement_when_no_conflict(self):
        self.assertIn("independence declaration needs a statement",
                      rules.validate_setup(setup(independence={"conflict": False, "statement": ""})))

    def test_unknown_type_method_and_bad_id_are_refused(self):
        errs = rules.validate_setup(setup(audit_type="RANDOM", method="MOON", audit_id="../x"))
        self.assertIn("audit_type not recognised", errs)
        self.assertIn("method not recognised", errs)
        self.assertTrue(any(e.startswith("audit_id must") for e in errs))

    def test_permissions_must_name_all_four(self):
        self.assertIn("permissions need safety, confidentiality, access and photos",
                      rules.validate_setup(setup(permissions={"safety": "x"})))

    def test_status_moves_one_step_forward_only(self):
        ok = {"status": "IN_PROGRESS", "changed_by": "Lead", "changed_at": NOW}
        self.assertEqual(rules.validate_status(ok, "PLANNED"), [])
        skip = {"status": "REPORTED", "changed_by": "Lead", "changed_at": NOW}
        self.assertTrue(rules.validate_status(skip, "PLANNED"))
        self.assertTrue(rules.validate_status(ok, "CLOSED"))


class SetupServiceTests(unittest.TestCase):
    def setUp(self):
        self.root = ROOT / "tests" / "_scratch" / uuid.uuid4().hex
        self.root.mkdir(parents=True)

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def test_setup_is_recorded_once_and_reloads(self):
        su.record_setup(self.root, "AUD-2026-001", setup(), NOW)
        self.assertEqual(su.current_setup(self.root, "AUD-2026-001")["title"], "Supplier audit: Bench 2 tooling")
        with self.assertRaises(ValueError) as ctx:
            su.record_setup(self.root, "AUD-2026-001", setup(), NOW)
        self.assertIn("not overwritten", str(ctx.exception))

    def test_setup_for_a_different_audit_id_is_refused(self):
        with self.assertRaises(ValueError):
            su.record_setup(self.root, "AUD-OTHER", setup(), NOW)

    def test_invalid_setup_writes_nothing(self):
        path = lg.ledger_path(self.root, "AUD-2026-001")
        with self.assertRaises(ValueError):
            su.record_setup(self.root, "AUD-2026-001", setup(lead_auditor="Maintenance lead"), NOW)
        self.assertFalse(path.exists())

    def test_status_moves_forward_and_each_move_is_a_record(self):
        su.record_setup(self.root, "AUD-2026-001", setup(), NOW)
        self.assertEqual(su.current_status(self.root, "AUD-2026-001"), "PLANNED")
        su.change_status(self.root, "AUD-2026-001", "IN_PROGRESS", "Lead", NOW)
        su.change_status(self.root, "AUD-2026-001", "CONDUCTED", "Lead", NOW)
        self.assertEqual(su.current_status(self.root, "AUD-2026-001"), "CONDUCTED")
        with self.assertRaises(ValueError):
            su.change_status(self.root, "AUD-2026-001", "CLOSED", "Lead", NOW)
        entries = lg.read_entries(lg.ledger_path(self.root, "AUD-2026-001"))
        self.assertEqual(sum(1 for e in entries if e["record_type"] == "audit_status"), 2)

    def test_status_cannot_change_before_setup(self):
        with self.assertRaises(ValueError) as ctx:
            su.change_status(self.root, "AUD-2026-001", "IN_PROGRESS", "Lead", NOW)
        self.assertIn("record the setup", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
