"""Tests for the EASA eRules XML export parser and clause-level delta.

Synthetic packages shaped like the real export, so these run with no network
and no 24 MB fixture. Live-format verification is a separate concern — see
scraper/PROBING.md.

Run: python -m unittest test_easa_erules
"""

from __future__ import annotations

import io
import unittest
import zipfile
from datetime import date

import easa_erules as E


def _package(topics: str, body: str) -> str:
    """Minimal flat-OPC package with the two parts the parser reads."""
    return (
        '<?xml version="1.0" encoding="utf-8"?>'
        '<pkg:package xmlns:pkg="http://schemas.microsoft.com/office/2006/xmlPackage">'
        '<pkg:part pkg:name="/customXml/item1.xml" pkg:contentType="application/xml"><pkg:xmlData>'
        '<er:document pub-time="2026-06-29T05:22:30Z" '
        'source-title="Easy Access Rules for Widgets" '
        'xmlns:er="http://www.easa.europa.eu/erules-export">'
        f"<er:toc>{topics}</er:toc>"
        "</er:document>"
        "</pkg:xmlData></pkg:part>"
        '<pkg:part pkg:name="/word/document.xml" pkg:contentType="application/xml"><pkg:xmlData>'
        f"<w:document><w:body>{body}</w:body></w:document>"
        "</pkg:xmlData></pkg:part>"
        "</pkg:package>"
    )


def _topic(sdt_id: str, erules_id: str, title: str, **attrs: str) -> str:
    extra = " ".join(f'{k}="{v}"' for k, v in attrs.items())
    return f'<er:topic sdt-id="{sdt_id}" ERulesId="{erules_id}" source-title="{title}" {extra} />'


def _sdt(sdt_id: str, text: str) -> str:
    return (
        f'<w:sdt><w:sdtPr><w:id w:val="{sdt_id}"/><w:tag w:val="topic"/></w:sdtPr>'
        f"<w:sdtContent><w:p><w:r><w:t>{text}</w:t></w:r></w:p></w:sdtContent></w:sdt>"
    )


class ParseDateTest(unittest.TestCase):
    def test_publisher_format(self):
        self.assertEqual(E.parse_easa_date("2 June, 2020"), date(2020, 6, 2))
        self.assertEqual(E.parse_easa_date("30 September, 2025"), date(2025, 9, 30))

    def test_iso_fallback(self):
        self.assertEqual(E.parse_easa_date("2026-01-15"), date(2026, 1, 15))

    def test_missing_dates_are_none_never_guessed(self):
        # The whole point: an absent date must stay absent. Inventing one on an
        # airworthiness rule is the failure mode this product exists to avoid.
        for v in (None, "", "   ", "n/a", "N/A", "-", "sometime in June"):
            self.assertIsNone(E.parse_easa_date(v), v)


class ParseExportTest(unittest.TestCase):
    def setUp(self):
        topics = (
            _topic("111", "ERULES-1", "Article 1 - Subject matter",
                   TypeOfContent="IR (Implementing rule);",
                   RegulatorySource="Regulation (EU) 2019/947",
                   EntryIntoForceDate="2 June, 2020",
                   ApplicabilityDate="31 December, 2020")
            + _topic("222", "ERULES-2", "AMC1 Article 1",
                     TypeOfContent="AMC to IR (Acceptable means of compliance);",
                     RegulatorySource="ED Decision 2019/021/R",
                     EntryIntoForceDate="11 October, 2019",
                     ApplicabilityDate="n/a")
        )
        body = _sdt("111", "This Regulation lays down detailed provisions.") + _sdt("222", "Acceptable means text.")
        self.doc = E.parse_export(_package(topics, body))

    def test_document_metadata(self):
        self.assertEqual(self.doc.title, "Easy Access Rules for Widgets")
        self.assertEqual(self.doc.published_at.year, 2026)

    def test_nodes_carry_publisher_fields(self):
        self.assertEqual(len(self.doc.nodes), 2)
        a, b = self.doc.nodes
        self.assertEqual(a.node_key, "ERULES-1")
        self.assertEqual(a.title, "Article 1 - Subject matter")
        self.assertEqual(a.regulatory_source, "Regulation (EU) 2019/947")
        self.assertEqual(a.entry_into_force, date(2020, 6, 2))
        self.assertEqual(a.applicability_date, date(2020, 12, 31))
        self.assertIn("detailed provisions", a.body)
        # 'n/a' in the export must land as None, not as a string.
        self.assertIsNone(b.applicability_date)

    def test_body_is_joined_by_sdt_id(self):
        self.assertEqual(self.doc.nodes[1].body, "Acceptable means text.")

    def test_zip_wrapper_and_revision_from_filename(self):
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as zf:
            zf.writestr("Easy Access Rules for Widgets - Revision June 2026 - machine readable xml.xml",
                        _package("", ""))
        doc = E.parse_export_zip(buf.getvalue())
        self.assertEqual(doc.revision, "Revision June 2026")

    def test_rejects_non_export(self):
        with self.assertRaises(ValueError):
            E.parse_export("<html>not an export</html>")


class DiffTest(unittest.TestCase):
    def _node(self, key, title="T", body="B", eif=None, node_type="IR"):
        return E.RegulatoryNode(
            node_key=key, ordinal=0, title=title, node_type=node_type,
            regulatory_source="Regulation (EU) 2019/947", parent_ir=None,
            amended_by=None, entry_into_force=eif, applicability_date=None, body=body)

    def test_added_changed_removed(self):
        old = [self._node("A"), self._node("B", body="old text"), self._node("C")]
        new = [self._node("A"), self._node("B", body="new text"), self._node("D")]
        events = {e.node_key: e for e in E.diff_nodes(old, new)}

        self.assertNotIn("A", events)                      # unchanged emits nothing
        self.assertEqual(events["B"].change_type, "changed")
        self.assertEqual(events["D"].change_type, "added")
        self.assertEqual(events["C"].change_type, "removed")

    def test_changed_fields_names_what_moved(self):
        old = [self._node("A", eif=date(2020, 1, 1))]
        new = [self._node("A", eif=date(2021, 1, 1))]
        (event,) = E.diff_nodes(old, new)
        self.assertEqual(event.changed_fields, {"entry_into_force": True})

    def test_reordering_is_not_a_change(self):
        # Nodes are matched on the publisher's ERulesId, not position, so
        # reshuffling a book must not read as hundreds of regulatory changes.
        a, b = self._node("A"), self._node("B")
        self.assertEqual(E.diff_nodes([a, b], [b, a]), [])

    def test_whitespace_reflow_is_not_a_change(self):
        old = [self._node("A", body="one two")]
        new = [self._node("A", body="one two")]
        self.assertEqual(E.diff_nodes(old, new), [])


if __name__ == "__main__":
    unittest.main()
