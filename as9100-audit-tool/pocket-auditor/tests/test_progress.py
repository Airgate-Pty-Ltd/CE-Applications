"""Tests for the audit progress engine: what each step requires, what blocks it, and the next action.
Scratch audits live only in tests/_scratch inside the product folder.
"""
import shutil
import sys
import unittest
import uuid
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "engine"))
import pa_qsa as qsa  # noqa: E402
import pa_planning as pl  # noqa: E402
import pa_setup as su  # noqa: E402
import pa_progress as prg  # noqa: E402

CHECKLIST = qsa.load_checklist()
ORG_101 = "REG:FAA QSA 1.0:Organizational Management:101"
MP_1 = "REG:FAA QSA 1.0:Manufacturing Processes:1"
WHEN = "2026-10-08T11:00:00"
TODAY = date(2026, 10, 8)


def scratch():
    d = ROOT / "tests" / "_scratch" / uuid.uuid4().hex
    d.mkdir(parents=True)
    return d


def setup_rec(audit):
    return {"audit_type": "SUPPLIER", "audit_id": audit, "title": "Supplier audit", "objectives": "Verify controls",
            "lead_auditor": "Lead L", "team": [], "auditee_contact": "Maria Quality",
            "independence": {"conflict": False, "statement": "No prior role at the auditee"},
            "site": "Bay 2", "method": "ON_SITE", "start": "2026-11-02T09:00:00", "end": "2026-11-03T16:00:00",
            "report_due": "2026-11-10", "sponsor_approver": "Quality Director",
            "permissions": {"safety": "PPE required", "confidentiality": "NDA on file", "access": "Escorted",
                            "photos": False}}


def manual():
    return {"file_name": "QM rev 7.pdf", "sha256": "ab" * 32, "uploader": "QM owner",
            "uploaded_on": "2026-10-08T10:00:00", "source_class": "CUSTOMER_UPLOAD"}


class ProgressTests(unittest.TestCase):
    def setUp(self):
        self.root = scratch()

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def steps(self, audit):
        return {s["key"]: s for s in prg.progress(self.root, audit, CHECKLIST, today=TODAY)["steps"]}

    def test_empty_audit_asks_for_setup(self):
        p = prg.progress(self.root, "EMPTY", CHECKLIST, today=TODAY)
        self.assertEqual(p["current_step"], "setup")
        self.assertEqual(p["next_action"], "Record the audit setup.")
        self.assertFalse(p["report_ready"])
        self.assertEqual(p["steps"][0]["state"], "not_started")
        self.assertEqual(p["steps"][2]["state"], "blocked")

    def test_setup_recorded_moves_to_scope(self):
        su.record_setup(self.root, "SETUP", setup_rec("SETUP"), WHEN)
        p = prg.progress(self.root, "SETUP", CHECKLIST, today=TODAY)
        self.assertEqual(p["current_step"], "scope")
        self.assertEqual(p["steps"][0]["state"], "complete")
        self.assertIn("Setup recorded", [c["label"] for c in p["readiness"] if c["ok"]])

    def test_scope_without_manual_names_the_quality_manual_as_the_blocker(self):
        su.record_setup(self.root, "SCOPE", setup_rec("SCOPE"), WHEN)
        qsa.write_draft(self.root, "SCOPE", {"selected": sorted([ORG_101, MP_1]), "additions": []})
        qsa.publish(self.root, "SCOPE", CHECKLIST, now=WHEN)
        steps = self.steps("SCOPE")
        self.assertEqual(steps["scope"]["state"], "complete")
        self.assertEqual(steps["planning"]["state"], "in_progress")
        self.assertEqual(steps["planning"]["blockers"], ["quality manual not recorded"])
        p = prg.progress(self.root, "SCOPE", CHECKLIST, today=TODAY)
        self.assertEqual(p["current_step"], "planning")
        self.assertEqual(p["next_action"], "quality manual not recorded")

    def test_planning_complete_opens_conduct(self):
        su.record_setup(self.root, "PLAN", setup_rec("PLAN"), WHEN)
        qsa.write_draft(self.root, "PLAN", {"selected": sorted([ORG_101, MP_1]), "additions": []})
        qsa.publish(self.root, "PLAN", CHECKLIST, now=WHEN)
        pl.record_manual(self.root, "PLAN", manual(), WHEN)
        pl.complete_review(self.root, "PLAN", "Reviewer R", WHEN)
        steps = self.steps("PLAN")
        self.assertEqual(steps["planning"]["state"], "complete")
        self.assertEqual(steps["conduct"]["state"], "not_started")
        self.assertEqual(steps["conduct"]["blockers"], ["2 of 2 criteria not yet assessed"])
        p = prg.progress(self.root, "PLAN", CHECKLIST, today=TODAY)
        self.assertEqual(p["next_action"], "Start the audit.")
        checks = {c["label"]: c for c in p["readiness"]}
        self.assertTrue(checks["Planning complete"]["ok"])
        self.assertFalse(checks["Every criterion assessed"]["ok"])
        self.assertFalse(p["report_ready"])

    def test_started_audit_reports_in_progress_and_review_blockers(self):
        su.record_setup(self.root, "RUN", setup_rec("RUN"), WHEN)
        qsa.write_draft(self.root, "RUN", {"selected": sorted([ORG_101]), "additions": []})
        qsa.publish(self.root, "RUN", CHECKLIST, now=WHEN)
        pl.record_manual(self.root, "RUN", manual(), WHEN)
        pl.complete_review(self.root, "RUN", "Reviewer R", WHEN)
        su.change_status(self.root, "RUN", "IN_PROGRESS", "Lead L", WHEN)
        p = prg.progress(self.root, "RUN", CHECKLIST, today=TODAY)
        self.assertEqual(p["status"], "IN_PROGRESS")
        self.assertEqual(p["steps"][3]["state"], "in_progress")
        self.assertEqual(p["next_action"], "Mark the audit CONDUCTED when every criterion is assessed.")
        self.assertEqual(p["steps"][4]["blockers"][0].split(" (")[0], "Every criterion assessed")


if __name__ == "__main__":
    unittest.main()
