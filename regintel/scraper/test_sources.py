"""Parsing tests for the source modules.

These mock the HTTP layer (`_get`) and feed synthetic payloads shaped like the
real APIs, so they verify field mapping, the lookback window and provenance
marking without any network access. Run: python -m unittest test_sources

Live endpoint reachability is a separate concern — see `python main.py
--dry-run`, which must be run somewhere with outbound web access.
"""

from __future__ import annotations

import unittest
from datetime import timedelta
from unittest import mock

import sources
from models import today_utc


class FakeResp:
    def __init__(self, payload):
        self._payload = payload

    def json(self):
        return self._payload

    def raise_for_status(self):
        return None


class GovUkOrganisationSourceTest(unittest.TestCase):
    def _run_with(self, payload):
        with mock.patch.object(sources, "_get", return_value=FakeResp(payload)) as g:
            src = sources.GovUkOrganisationSource(
                "DVSA", "UK Driver and Vehicle Standards Agency",
                "driver-and-vehicle-standards-agency",
            )
            findings = src.fetch(since_days=14)
        return findings, g

    def test_maps_fields_filters_window_and_absolutises_links(self):
        today = today_utc()
        recent = (today - timedelta(days=2)).isoformat()
        stale = (today - timedelta(days=90)).isoformat()

        payload = {
            "results": [
                {
                    "title": "DVSA guidance update",
                    "link": "/guidance/mot-inspection-manual",
                    "public_timestamp": f"{recent}T09:00:00Z",
                    "description": "Updated inspection guidance.",
                },
                {
                    "title": "Absolute link item",
                    "link": "https://www.gov.uk/government/news/x",
                    "public_timestamp": f"{recent}T10:00:00Z",
                    "description": "",
                },
                {  # older than the 14-day window -> dropped
                    "title": "Old item",
                    "link": "/guidance/old",
                    "public_timestamp": f"{stale}T09:00:00Z",
                    "description": "stale",
                },
                {  # missing link -> skipped
                    "title": "No link",
                    "link": "",
                    "public_timestamp": f"{recent}T09:00:00Z",
                    "description": "x",
                },
            ]
        }

        findings, getter = self._run_with(payload)

        self.assertTrue(getter.called)
        # Only the two in-window, well-formed items survive.
        self.assertEqual(len(findings), 2)

        f = findings[0]
        self.assertEqual(f.authority, "DVSA")
        self.assertEqual(f.category, "guidance")
        # Site-relative link is absolutised against the GOV.UK base.
        self.assertEqual(f.source_url, "https://www.gov.uk/guidance/mot-inspection-manual")
        self.assertEqual(f.summary, "Updated inspection guidance.")
        # No structured deadline/effective date is supplied by this API.
        self.assertIsNone(f.effective_date)
        self.assertIsNone(f.comment_deadline)
        self.assertEqual(f.verification, "unverified")
        self.assertEqual(f.source_id, "govuk-org")
        # Recent item (<= 7 days) is 'normal', not 'low'.
        self.assertEqual(f.priority, "normal")

        # Empty description falls back to the title, never blank.
        self.assertEqual(findings[1].summary, "Absolute link item")
        # Absolute links are left untouched.
        self.assertEqual(findings[1].source_url, "https://www.gov.uk/government/news/x")

    def test_empty_results(self):
        findings, _ = self._run_with({"results": []})
        self.assertEqual(findings, [])


class FederalRegisterNhtsaTest(unittest.TestCase):
    def test_proposed_rule_maps_to_nprm_with_deadline_priority(self):
        today = today_utc()
        close = (today + timedelta(days=5)).isoformat()  # closes soon -> urgent

        payload = {
            "results": [
                {
                    "document_number": "2026-12345",
                    "title": "Federal Motor Vehicle Safety Standards; Occupant Protection",
                    "type": "Proposed Rule",
                    "abstract": "NHTSA proposes to amend FMVSS No. 208.",
                    "publication_date": today.isoformat(),
                    "effective_on": None,
                    "comments_close_on": close,
                    "html_url": "https://www.federalregister.gov/documents/x",
                    "docket_ids": ["NHTSA-2026-0001"],
                }
            ]
        }
        with mock.patch.object(sources, "_get", return_value=FakeResp(payload)):
            src = sources.FederalRegisterSource(
                "NHTSA", "National Highway Traffic Safety Administration",
                "national-highway-traffic-safety-administration",
            )
            findings = src.fetch(since_days=14)

        self.assertEqual(len(findings), 1)
        f = findings[0]
        self.assertEqual(f.authority, "NHTSA")
        self.assertEqual(f.category, "nprm")
        self.assertEqual(f.comment_deadline, close)
        self.assertEqual(f.priority, "urgent")  # deadline within 7 days
        self.assertEqual(f.verification, "verified")
        self.assertEqual(f.document_number, "2026-12345")


if __name__ == "__main__":
    unittest.main()
