"""Tests for EASA instrument-date resolution.

Run: python -m unittest test_easa_enrich
"""

from __future__ import annotations

import unittest
from datetime import date
from unittest import mock

import easa_enrich as EN
import sources


class NormaliseTest(unittest.TestCase):
    def test_both_sides_of_the_join_agree(self):
        # RSS title form vs XML RegulatorySource form must reduce to one key,
        # or nothing ever matches.
        pairs = [
            ("ED Decision 2019/021/R", "ED Decision 2019/021/R"),
            ("EU 2024/1110", "Regulation (EU) 2024/1110"),
            ("EU 2021/1166", "Commission Implementing Regulation (EU) 2021/1166"),
        ]
        for rss, xml in pairs:
            self.assertEqual(EN.normalise_instrument(rss),
                             EN.normalise_instrument(xml), f"{rss} vs {xml}")

    def test_zero_padding_is_consistent(self):
        self.assertEqual(EN.normalise_instrument("ED Decision 2019/21/R"),
                         EN.normalise_instrument("ED Decision 2019/021/R"))

    def test_old_style_number_before_year(self):
        # "Regulation (EU) No 452/2014" is number/year; "2019/947" is year/number.
        # Getting these the wrong way round would silently mismatch instruments.
        self.assertEqual(EN.normalise_instrument("Regulation (EU) No 452/2014"), "EU:2014/0452")
        self.assertEqual(EN.normalise_instrument("Regulation (EU) 2019/947"), "EU:2019/0947")

    def test_mb_decision(self):
        self.assertEqual(EN.normalise_instrument("MB Decision No 01-2023"), "MB:2023/001")

    def test_unrecognised_is_none_not_a_guess(self):
        for v in (None, "", "some prose", "Annual Safety Review", "CS-25"):
            self.assertIsNone(EN.normalise_instrument(v), v)

    def test_distinct_instruments_do_not_collide(self):
        keys = {EN.normalise_instrument(v) for v in (
            "ED Decision 2019/021/R", "ED Decision 2019/022/R",
            "Regulation (EU) 2019/947", "Regulation (EU) 2019/945")}
        self.assertEqual(len(keys), 4)


class _FakeTable:
    def __init__(self, rows):
        self._rows = rows

    def select(self, *_a, **_k):
        return self

    def not_(self):
        return self

    @property
    def not_(self):  # noqa: F811 - mimics postgrest's .not_.is_() chain
        return self

    def is_(self, *_a, **_k):
        return self

    def range(self, lo, hi):
        self._slice = (lo, hi)
        return self

    def execute(self):
        lo, hi = getattr(self, "_slice", (0, 999))
        return mock.Mock(data=self._rows[lo:hi + 1])


class _FakeClient:
    def __init__(self, rows):
        self._rows = rows

    def table(self, _name):
        return _FakeTable(self._rows)


class ResolveTest(unittest.TestCase):
    def test_agreeing_clauses_resolve(self):
        rows = [
            {"regulatory_source": "ED Decision 2019/021/R", "entry_into_force": "2019-10-11"},
            {"regulatory_source": "ED Decision 2019/021/R", "entry_into_force": "2019-10-11"},
        ]
        out = EN.build_instrument_dates(_FakeClient(rows))
        self.assertEqual(out, {"ED:2019/021/R": date(2019, 10, 11)})

    def test_disagreeing_clauses_resolve_to_nothing(self):
        # Regulation (EU) 2019/947 really does carry two entry-into-force dates
        # in the UAS book because it was amended. Choosing one would be
        # inventing a regulatory fact, so it must yield no date at all.
        rows = [
            {"regulatory_source": "Regulation (EU) 2019/947", "entry_into_force": "2019-07-01"},
            {"regulatory_source": "Regulation (EU) 2019/947", "entry_into_force": "2020-06-02"},
        ]
        self.assertEqual(EN.build_instrument_dates(_FakeClient(rows)), {})

    def test_mixed_batch_keeps_only_the_unambiguous(self):
        rows = [
            {"regulatory_source": "ED Decision 2022/002/R", "entry_into_force": "2022-02-10"},
            {"regulatory_source": "Regulation (EU) 2019/947", "entry_into_force": "2019-07-01"},
            {"regulatory_source": "Regulation (EU) 2019/947", "entry_into_force": "2020-06-02"},
        ]
        out = EN.build_instrument_dates(_FakeClient(rows))
        self.assertEqual(list(out), ["ED:2022/002/R"])


class EasaSourceEnrichmentTest(unittest.TestCase):
    FEED = """<?xml version="1.0"?><rss><channel>
      <item><title>ED Decision 2022/002/R on unmanned aircraft</title>
            <link>https://www.easa.europa.eu/x</link>
            <pubDate>Mon, 10 Aug 2026 00:00:00 +0000</pubDate>
            <description>Decision text</description></item>
      <item><title>Opinion No 04/2026 on something else</title>
            <link>https://www.easa.europa.eu/y</link>
            <pubDate>Mon, 10 Aug 2026 00:00:00 +0000</pubDate>
            <description>Opinion text</description></item>
    </channel></rss>"""

    def _fetch(self, instrument_dates):
        src = sources.EasaRssSource(feeds=[("document-library/agency-decisions", "ed_decision")],
                                    instrument_dates=instrument_dates)
        with mock.patch.object(sources, "_get") as g:
            g.return_value = mock.Mock(content=self.FEED.encode())
            return src.fetch(3650)

    def test_without_corpus_everything_stays_unverified(self):
        findings = self._fetch({})
        self.assertTrue(findings)
        for f in findings:
            self.assertEqual(f.verification, "unverified")
            self.assertIsNone(f.effective_date)

    def test_resolved_instrument_becomes_verified_with_the_date(self):
        findings = self._fetch({"ED:2022/002/R": date(2022, 2, 10)})
        by_doc = {f.document_number: f for f in findings}

        hit = by_doc["ED Decision 2022/002/R"]
        self.assertEqual(hit.effective_date, "2022-02-10")
        self.assertEqual(hit.verification, "verified")

        # The item with no resolved date must be untouched, not swept along.
        miss = by_doc["Opinion No 04/2026"]
        self.assertIsNone(miss.effective_date)
        self.assertEqual(miss.verification, "unverified")


if __name__ == "__main__":
    unittest.main()
