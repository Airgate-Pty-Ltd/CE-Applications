"""Tests for the CAAC listing parser and its Chinese→English rendering.

The HTML fixture mirrors a real row from
/was5/web/search?page=1&channelid=211383&fl=12, so field extraction is
verified without any network access.

Run: python -m unittest test_caac
"""

from __future__ import annotations

import unittest
from unittest import mock

import caac
import caac_terms


ROW = """<tr>
 <td style="width:5%"> 1 </td>
 <td style="width:30%" class="t_l tdMC">
   <a href="http://www.caac.gov.cn/XXGK/XXGK/FLFG/202512/t20251227_229597.html"
      target="_blank" name="x">中华人民共和国民用航空法</a>
   <div class="t_l_content"><ul>
     <li class="t_l_content_left"><b>办文单位：</b>政策法规司</li>
     <li><b>发文日期：</b>2025年12月27日</li>
   </ul></div>
 </td>
 <td style="width:10%" class="tdRQ"> 2025年12月27日 </td>
 <td style="width:10%" class="strFL"> 国务院令第797号 </td>
 <td style="width:5%" class="strGF"><span class=""> 有效</span> </td>
</tr>"""

PAGE = f"<table><tbody>{ROW}</tbody></table><div>共136页</div>"


class ParseListingTest(unittest.TestCase):
    def setUp(self):
        (self.rec,) = caac.parse_listing(PAGE)

    def test_publisher_fields_read_verbatim(self):
        self.assertEqual(self.rec["published"], "2025-12-27")
        self.assertEqual(self.rec["document_number"], "国务院令第797号")
        self.assertEqual(self.rec["validity_zh"], "有效")
        self.assertEqual(self.rec["department_zh"], "政策法规司")

    def test_chinese_title_is_preserved_exactly(self):
        self.assertEqual(self.rec["title_zh"], "中华人民共和国民用航空法")

    def test_url_is_absolute(self):
        self.assertTrue(self.rec["url"].startswith("https://") or self.rec["url"].startswith("http://"))
        self.assertIn("t20251227_229597.html", self.rec["url"])

    def test_total_pages_from_publisher_footer(self):
        self.assertEqual(caac.total_pages(PAGE), 136)

    def test_rows_without_a_document_link_are_skipped(self):
        # The listing page also contains the search form, whose <tr>s have no
        # document link and must not become findings.
        self.assertEqual(caac.parse_listing("<tr><td>search form</td></tr>"), [])


class GlossaryTest(unittest.TestCase):
    def test_longest_match_wins(self):
        # 补充型号合格证 must not render as "supplement" + "Type Certificate".
        en, _ = caac_terms.render("补充型号合格证")
        self.assertIn("Supplemental Type Certificate", en)
        en, _ = caac_terms.render("民用航空器")
        self.assertIn("Civil Aircraft", en)

    def test_chinese_dates_become_iso(self):
        en, _ = caac_terms.render("2026年7月1日")
        self.assertIn("2026-07-01", en)

    def test_is_deterministic(self):
        # The content hash depends on the title, so the same input must always
        # produce the same output or every run would look like a change.
        title = "运输类飞机GNSS 干扰处置指南"
        self.assertEqual(caac_terms.render(title), caac_terms.render(title))

    def test_bilingual_puts_english_first_chinese_second(self):
        out = caac_terms.bilingual("全天候运行规定")
        self.assertTrue(out.startswith("All-Weather Operations"))
        self.assertIn("全天候运行规定", out)

    def test_unrecognised_title_falls_back_to_chinese_alone(self):
        # Better to show the authority's own words than a half-rendered string
        # that reads like a broken translation.
        out = caac_terms.bilingual("某某某某某某")
        self.assertEqual(out, "某某某某某某")


class CaacSourceTest(unittest.TestCase):
    def _fetch(self, since_days=3650):
        src = caac.CaacSource(categories=[("12", "regulation", "Laws and regulations")], max_pages=1)
        with mock.patch("sources._get") as g:
            g.return_value = mock.Mock(text=PAGE)
            return src.fetch(since_days)

    def test_builds_a_bilingual_finding(self):
        (f,) = self._fetch()
        self.assertEqual(f.authority, "CAAC")
        self.assertTrue(f.title.startswith("People's Republic of China Civil Aviation Law"))
        self.assertIn("中华人民共和国民用航空法", f.title)
        self.assertEqual(f.document_number, "国务院令第797号")
        self.assertEqual(f.published_date, "2025-12-27")

    def test_derived_english_means_unverified(self):
        # The English is ours, not CAAC's, so the item must not be presented as
        # wholly the authority's record.
        (f,) = self._fetch()
        self.assertEqual(f.verification, "unverified")
        self.assertIn("authoritative", f.detail)

    def test_no_effective_date_is_invented(self):
        (f,) = self._fetch()
        self.assertIsNone(f.effective_date)
        self.assertIsNone(f.comment_deadline)

    def test_validity_is_mapped_from_the_publishers_vocabulary(self):
        (f,) = self._fetch()
        self.assertIn("in force", f.detail)

    def test_glossary_changes_do_not_look_like_regulatory_changes(self):
        """Improving the translation must not report the document as amended.

        The hash tracks CAAC's Chinese title, so a better English rendering is
        a presentation change and nothing more. Without this, every glossary
        edit would tell a compliance user that a batch of Chinese regulations
        had just changed.
        """
        (before,) = self._fetch()
        original = dict(caac_terms.GLOSSARY)
        try:
            caac_terms.GLOSSARY["民用航空法"] = "Civil Aviation Act (revised rendering)"
            caac_terms._ORDERED = sorted(caac_terms.GLOSSARY, key=len, reverse=True)
            (after,) = self._fetch()
        finally:
            caac_terms.GLOSSARY.clear()
            caac_terms.GLOSSARY.update(original)
            caac_terms._ORDERED = sorted(caac_terms.GLOSSARY, key=len, reverse=True)

        self.assertNotEqual(before.title, after.title, "the rendering should have changed")
        self.assertEqual(before.content_hash(), after.content_hash(),
                         "but the content hash must not")

    def test_hash_title_is_never_written_to_the_database(self):
        (f,) = self._fetch()
        self.assertNotIn("hash_title", f.to_row("2026-08-22"))

    def test_window_excludes_older_items(self):
        self.assertEqual(self._fetch(since_days=1), [])


if __name__ == "__main__":
    unittest.main()
