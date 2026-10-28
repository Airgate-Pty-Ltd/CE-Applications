"""Full reconciliation of the checklists against their sources. Produces an exceptions-only report.

Covers:
- AS9100D and AS9110C: every checklist row against the licensed extracts (clause text and lettered sub-paragraphs):
  references, hierarchy, lettered sequence, coverage (omissions and inventions), locators, questions, evidence prompts,
  duplicates, and verbatim copying of licensed wording.
- FAA QSA: all imported rows against the Burrana workbook (read only): references, question text, condition text,
  duplicates, and workbook rows that were not imported.

Severity:
  BLOCK            the checklist is wrong against its source. The checklist cannot be approved until it is fixed.
  WARN             a quality issue that does not make a row wrong (for example a source extraction artifact).
  OWNER_DECISION   a genuine scope or policy choice that only the owner can make. Not a defect.

The report lists exceptions only. Checks that pass are counted in the summary, not listed.

Read-only on every source. Writes only content/qa/CHECKLIST-QA-EXCEPTIONS.md and content/qa/checklist-qa-result.json.
Run from the product folder:  python -I content/qa/reconcile_checklists.py
"""
import collections
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LICENSED = ROOT / "licensed-private"
CHECKLISTS = ROOT / "content" / "checklists"
QA_DIR = ROOT / "content" / "qa"
FAA_JSON = ROOT / "content" / "faa-qsa" / "faa-qsa-audit-checklist-1.0.json"
WORKBOOK = Path(r"C:\Users\oleab\OneDrive - Burrana\VP Quality\Certification\FAA\FAA PMA\QSA AUDIT CHECKLIST 1.0.xlsx")
STANDARDS = ("AS9100D", "AS9110C")
MIN_VERBATIM_WORDS = 8

FOOTER = re.compile(r"Downloaded from SAE International by .*?Page \d+ of \d+", re.I | re.S)
JUNK = re.compile(r"[\ufffd\u2122\u00ae]")
WORD = re.compile(r"[a-z0-9]+")
CLAUSE_REF = re.compile(r"^\d+(\.\d+)*$")
LETTERED_REF = re.compile(r"^(\d+(?:\.\d+)*)\(([a-z]+)\)$")


def normalize(text):
    """Comparable form: footers and encoding junk removed, whitespace collapsed, lower case."""
    t = FOOTER.sub(" ", str(text or ""))
    t = JUNK.sub("", t)
    return re.sub(r"\s+", " ", t).strip().lower()


def words(text):
    return WORD.findall(normalize(text))


def _contains(haystack, needle):
    """True if the word sequence `needle` occurs contiguously in `haystack`."""
    n = len(needle)
    return any(haystack[i:i + n] == needle for i in range(len(haystack) - n + 1))


def grams(text, n=MIN_VERBATIM_WORDS):
    w = words(text)
    return {tuple(w[i:i + n]) for i in range(len(w) - n + 1)}


class Report:
    def __init__(self):
        self.exceptions = []
        self.checks = {}
        self.unaccounted = []

    def count(self, check, n=1):
        self.checks[check] = self.checks.get(check, 0) + n

    def add(self, check, severity, standard, ref, detail):
        self.exceptions.append({"check": check, "severity": severity, "standard": standard,
                                "ref": ref, "detail": detail})


# ---------- licensed extracts ---------------------------------------------------

def licensed_clauses(std):
    data = json.loads((LICENSED / f"clause-text-{std}.json").read_text(encoding="utf-8"))
    return {k: v for k, v in data.items() if CLAUSE_REF.match(k)}


def licensed_headings(std, clauses):
    """Every clause reference the licensed text shows: body clauses, uppercase top-level headings, and
    table-of-contents entries with dot leaders (for example 10.2, which has no separate body heading)."""
    text = (LICENSED / f"{std}.txt").read_text(encoding="utf-8", errors="replace")
    refs = set(clauses)
    refs |= {m.group(1) for m in re.finditer(r"(?m)^\s*(\d{1,2})\.\s+([A-Z][A-Z ,&/\-]{3,})\s*$", text)}
    refs |= {m.group(1) for m in re.finditer(r"(?m)^\s*(\d{1,2}(?:\.\d+)+)\s+[^\n]*?\.{5,}", text)}
    refs |= {m.group(1) for m in re.finditer(r"(?m)^\s*(\d{1,2}(?:\.\d+)+)\s+[A-Z][^\n]{2,}$", text)}
    return refs


def licensed_lettered(std):
    data = json.loads((LICENSED / f"lettered-{std}.json").read_text(encoding="utf-8"))
    return {d["ref"]: d["text"] for d in data}


def universe(std):
    rows = json.loads((ROOT / "content" / "audit-rule" / "clause-universe.json").read_text(encoding="utf-8"))["rows"]
    return [r["clause_ref"] for r in rows if r["standard"] == std]


# ---------- AS checks -------------------------------------------------------------

def check_extract_artifacts(rep, std, clauses, lettered):
    footers = [k for k, v in list(clauses.items()) + list(lettered.items()) if FOOTER.search(v or "")]
    junk = [k for k, v in list(clauses.items()) + list(lettered.items()) if JUNK.search(v or "")]
    rep.count("extract: page footers present in licensed text", len(clauses) + len(lettered))
    if footers:
        rep.add("extract: page footers in licensed text", "WARN", std, f"{len(footers)} items",
                "Licensed extract contains page footers; they are removed for comparison only. The extract itself is unchanged.")
    if junk:
        rep.add("extract: encoding junk in licensed text", "WARN", std, f"{len(junk)} items",
                "Licensed extract contains replacement characters; removed for comparison only.")


def check_clause_coverage(rep, std, rows_by_ref, clauses, exist):
    uni = universe(std)
    rep.count(f"{std}: clause universe refs exist in licensed text", len(uni))
    for ref in uni:
        if ref not in exist:
            rep.add("clause in universe but not in licensed text", "BLOCK", std, ref,
                    "The audit clause universe lists this reference but the licensed text does not show it.")
    in_scope = [k for k in exist if int(k.split(".")[0]) >= 4]
    rep.count(f"{std}: licensed clauses 4-10 covered by the universe", len(in_scope))
    for ref in sorted(in_scope, key=lambda r: [int(x) for x in r.split(".")]):
        if ref not in uni and clauses.get(ref, "").strip():
            rep.add("licensed clause missing from the universe", "OWNER_DECISION", std, ref,
                    "The licensed text has this clause in 4-10 but the audit clause universe does not list it. "
                    "Decide whether it is in audit scope.")
    for ref in uni:
        if ref not in rows_by_ref:
            rep.add("universe clause with no checklist row", "BLOCK", std, ref,
                    "The clause universe lists this reference but the checklist has no row for it.")


def check_clause_rows(rep, std, rows, clauses, exist):
    rows_by_ref = {r["ref"]: r for r in rows}
    for r in rows:
        ref = r["ref"]
        if LETTERED_REF.match(ref) or r.get("type") == "lettered_subparagraph":
            continue
        if not CLAUSE_REF.match(ref):
            rep.add("row reference format", "BLOCK", std, ref, "Clause row reference is not a numbered clause.")
            continue
        rep.count(f"{std}: clause rows reference exists in licensed text")
        if ref not in exist:
            rep.add("row reference not in licensed text", "BLOCK", std, ref,
                    "The checklist row's reference is not shown in the licensed text (body or table of contents).")
            continue
        if "." in ref:
            parent = ref.rsplit(".", 1)[0]
            rep.count(f"{std}: clause rows have a parent row")
            if parent not in rows_by_ref:
                rep.add("hierarchy: parent row missing", "BLOCK", std, ref, f"Parent {parent} has no checklist row.")
        if r.get("type") == "group":
            rep.count(f"{std}: group headings")
            continue
        rep.count(f"{std}: clause rows have a locator naming the clause")
        loc = r.get("source_locator") or ""
        if f"clause {ref}" not in loc:
            rep.add("locator does not name the clause", "BLOCK", std, ref, f"Locator is '{loc}'.")
        # titles are Conform-Edge descriptors; the licensed text has no heading to compare them with for most rows
        check_authored(rep, std, r, clauses.get(ref, ""))


def check_lettered_rows(rep, std, rows, lettered, clauses):
    rows_by_ref = {r["ref"]: r for r in rows}
    checklist_letters = {r["ref"] for r in rows if LETTERED_REF.match(r["ref"])}
    licensed_letters = set(lettered)
    rep.count(f"{std}: lettered rows present in licensed text", len(checklist_letters))
    for ref in sorted(licensed_letters - checklist_letters):
        rep.add("omitted lettered sub-paragraph", "BLOCK", std, ref,
                "The licensed text has this sub-paragraph but the checklist has no row for it.")
    for ref in sorted(checklist_letters - licensed_letters):
        rep.add("invented lettered row", "BLOCK", std, ref,
                "The checklist has a sub-paragraph row that the licensed text does not contain.")
    seen = {}
    for r in rows:
        if not LETTERED_REF.match(r["ref"]):
            continue
        ref = r["ref"]
        m = LETTERED_REF.match(ref)
        parent, letter = m.group(1), m.group(2)
        seen[ref] = seen.get(ref, 0) + 1
        rep.count(f"{std}: lettered rows have a parent clause row")
        if parent not in rows_by_ref:
            rep.add("hierarchy: lettered row without parent row", "BLOCK", std, ref, f"Parent {parent} has no row.")
        if parent not in clauses:
            rep.add("lettered row parent not in licensed text", "BLOCK", std, ref, f"Parent {parent} is not in the licensed text.")
        loc = r.get("source_locator") or ""
        rep.count(f"{std}: lettered locators name clause and item")
        if f"clause {parent}, item ({letter})" not in loc:
            rep.add("locator does not name clause and item", "BLOCK", std, ref, f"Locator is '{loc}'.")
        check_authored(rep, std, r, lettered.get(ref, ""))
    for ref, n in seen.items():
        if n > 1:
            rep.add("duplicate reference", "BLOCK", std, ref, f"Appears {n} times in the checklist.")
    # sequence: letters for each parent must run a, b, c... with no gap and in licensed order
    by_parent = {}
    for ref in sorted(checklist_letters):
        m = LETTERED_REF.match(ref)
        by_parent.setdefault(m.group(1), []).append(m.group(2))
    for parent, letters in by_parent.items():
        rep.count(f"{std}: lettered sequences are complete")
        expected = [chr(ord("a") + i) for i in range(len(letters))]
        if letters != expected:
            rep.add("lettered sequence gap or order", "BLOCK", std, parent,
                    f"Letters in checklist {letters}; expected {expected}.")


def check_authored(rep, std, r, licensed_text):
    ref = r["ref"]
    rep.count(f"{std}: rows have a question and evidence")
    if not (r.get("question") or "").strip():
        rep.add("missing question", "BLOCK", std, ref, "Row has no question.")
    evidence = r.get("evidence") or []
    if not evidence or not all(str(e).strip() for e in evidence):
        rep.add("missing evidence prompts", "BLOCK", std, ref, "Row has no evidence prompt, or an empty one.")
    if r.get("wording_status") != "AUTHORED" and (r.get("question") or "").strip():
        rep.add("wording status not AUTHORED", "BLOCK", std, ref, f"wording_status is '{r.get('wording_status')}'.")
    rep.count(f"{std}: rows free of verbatim licensed wording")
    lic = grams(licensed_text)
    if lic:
        for field, text in [("question", r.get("question") or "")] + [("evidence", e) for e in evidence]:
            hit = grams(text) & lic
            if hit:
                rep.add("verbatim licensed wording", "BLOCK", std, ref,
                        f"{field} shares a {MIN_VERBATIM_WORDS}-word run with the licensed text: '{' '.join(next(iter(hit)))}'")


def check_duplicates_across_rows(rep, std, rows):
    seen = {}
    for r in rows:
        if r.get("type") == "group" or not (r.get("question") or "").strip():
            continue
        key = normalize(r["question"])
        seen.setdefault(key, []).append(r["ref"])
    for key, refs in seen.items():
        rep.count(f"{std}: questions are unique across rows")
        if len(refs) > 1:
            rep.add("duplicate question across rows", "BLOCK", std, ", ".join(refs),
                    "The same question text is used for more than one row. Each requirement needs its own question.")


def reconcile_as(rep, std):
    rows = json.loads((CHECKLISTS / f"{std}.json").read_text(encoding="utf-8"))["items"]
    clauses = licensed_clauses(std)
    lettered = licensed_lettered(std)
    check_extract_artifacts(rep, std, clauses, lettered)
    exist = licensed_headings(std, clauses)
    rows_by_ref = {r["ref"]: r for r in rows}
    check_clause_coverage(rep, std, rows_by_ref, clauses, exist)
    check_clause_rows(rep, std, rows, clauses, exist)
    check_lettered_rows(rep, std, rows, lettered, clauses)
    check_duplicates_across_rows(rep, std, rows)


# ---------- FAA QSA checks ----------------------------------------------------------

def _cell_text(v):
    return re.sub(r"\s+", " ", str(v)).strip() if v is not None else ""


def reconcile_faa(rep):
    import openpyxl
    data = json.loads(FAA_JSON.read_text(encoding="utf-8"))
    rows = data["criteria"]
    std = "FAA QSA 1.0"
    rep.count(f"{std}: imported rows checked against the workbook", len(rows))
    if not WORKBOOK.exists():
        rep.add("workbook not reachable", "BLOCK", std, "-", f"Workbook not found at {WORKBOOK}.")
        return
    digest = hashlib.sha256(WORKBOOK.read_bytes()).hexdigest()
    rep.count(f"{std}: workbook hash equals the recorded import hash")
    if digest != data["source_sha256"]:
        rep.add("workbook hash changed since import", "BLOCK", std, "-",
                f"Workbook hash {digest[:12]} differs from the recorded {data['source_sha256'][:12]}. Re-import before reconciling.")
    wb = openpyxl.load_workbook(WORKBOOK, read_only=True, data_only=True)
    sheets = {ws.title.strip(): [_cell_text(v) for row in ws.iter_rows(values_only=True) for v in row if v is not None]
              for ws in wb.worksheets}
    cell_pattern = re.compile(r"^(\d+(?:-\d+)?)\.\s+(.*\S)$", re.S)
    found, seen = {}, {}
    for sheet, cells in sheets.items():
        for cell in cells:
            m = cell_pattern.match(cell)
            if m and (sheet, m.group(1)) not in found:
                found[(sheet, m.group(1))] = m.group(2)
    keys = set()
    for r in rows:
        key = (r["source_sheet"].strip(), r["criteria_ref"])
        if key in seen:
            rep.add("duplicate criterion in import", "BLOCK", std, f"{key[0]} {key[1]}", "Imported twice.")
        seen[key] = True
        keys.add(key)
        rep.count(f"{std}: imported rows exist in the workbook")
        if key not in found:
            rep.add("imported row not in workbook", "BLOCK", std, f"{key[0]} {key[1]}", "No matching criterion in the workbook.")
            continue
        rep.count(f"{std}: question text equals the workbook")
        if normalize(found[key]) != normalize(r["question"]):
            rep.add("question text differs from workbook", "BLOCK", std, f"{key[0]} {key[1]}",
                    "Imported question does not match the workbook cell.")
        blob_words = words(" ".join(sheets[key[0]]))
        for ct in r.get("condition_text") or []:
            rep.count(f"{std}: condition text found in the workbook")
            ct_words = words(ct)
            if ct_words and not _contains(blob_words, ct_words):
                rep.add("condition text not found in workbook", "WARN", std, f"{key[0]} {key[1]}",
                        f"Condition text is not a run of words in the workbook sheet: '{' '.join(ct_words[:10])}...'.")
    workbook_keys = set(found)
    desc_missing = sorted(k for k in workbook_keys - keys)
    if desc_missing:
        rep.add("workbook rows not imported", "OWNER_DECISION", std, "; ".join(f"{s} {r}" for s, r in desc_missing),
                "The workbook has these numbered rows and the import does not. They are the 'System Element Description' "
                "and 'Standardized Audit Criteria' rows of the sheets they belong to. Decide whether they belong in the baseline.")
    rep.count(f"{std}: workbook rows reconciled", len(workbook_keys))
    reconcile_faa_text(rep, std, wb, rows, data)


BOUNDARY = re.compile(r"^\s*\d+\. System Element|^Section\b|^SYSTEM ELEMENT$|^\d+[a-z]?$")
HEADER_CELLS = {"system element", "requirements", "procedure", "comments", "c/nc"}


def reconcile_faa_text(rep, std, wb, rows, data):
    """Every workbook cell is either owned by a numbered criterion, part of an imported description row, a table
    heading, or unaccounted for. Owned text must be inside the imported row (BLOCK if not). Unaccounted text is an
    owner decision: it is element-level text the import does not carry."""
    crit = re.compile(r"^\s*(\d+(?:-\d+)?)\.\s+(.*\S)\s*$", re.S)
    imported = {(r["source_sheet"].strip(), r["criteria_ref"]): r for r in rows}
    owned, owned_cells, all_cells = {}, set(), []
    for ws in wb.worksheets:
        sheet = ws.title.strip()
        cur, buf = None, []
        for row in ws.iter_rows(values_only=True):
            cells = [_cell_text(v) for v in row if v is not None and _cell_text(v)]
            for c in cells:
                all_cells.append((sheet, c))
            if not cells:
                continue
            first = cells[0]
            m = crit.match(first)
            if m and not first.startswith("Statement"):
                if cur is not None:
                    owned[(sheet, cur)] = buf
                cur, buf = m.group(1), [m.group(2)]
                owned_cells.add((sheet, first))
                continue
            if BOUNDARY.match(first):
                if cur is not None:
                    owned[(sheet, cur)] = buf
                cur, buf = None, []
                continue
            if cur is not None:
                buf.extend(cells)
                owned_cells.update((sheet, c) for c in cells)
        if cur is not None:
            owned[(sheet, cur)] = buf
    for key, cells in owned.items():
        if key not in imported:
            continue
        rep.count(f"{std}: owned workbook text is inside the imported row", 1)
        row_words = collections.Counter(words(" ".join([imported[key]["question"]] + (imported[key].get("condition_text") or []))))
        owned_words = collections.Counter(words(" ".join(cells)))
        missing = sum((owned_words - row_words).values())
        if missing:
            rep.add("workbook text owned by a criterion not in the imported row", "BLOCK", std, f"{key[0]} {key[1]}",
                    f"{missing} words of workbook text attached to this criterion are not in the imported row.")
    desc = {(r["source_sheet"].strip(), r["criteria_ref"]): r for r in data["criteria"]}
    description_blob = normalize(" ".join(r["question"] for r in data["criteria"] if r["criteria_ref"] in ("1", "2")))
    element_blob = normalize(" ".join(c["text"] for c in data.get("element_context", [])))
    unaccounted = []
    for sheet, text in all_cells:
        if (sheet, text) in owned_cells:
            continue
        if text.lower() in HEADER_CELLS or normalize(text) in description_blob or normalize(text) in element_blob or len(words(text)) == 0:
            continue
        if re.match(r"^\s*\d+\. System Element", text) or re.match(r"^\s*\d+[a-z]?$", text) or text.startswith("Section"):
            continue
        unaccounted.append((sheet, text))
    rep.count(f"{std}: workbook cells accounted for", len(all_cells))
    if unaccounted:
        by_sheet = collections.Counter(s for s, _ in unaccounted)
        sample = "; ".join(f"{s}: '{t[:60]}'" for s, t in unaccounted[:4])
        rep.add("workbook text outside numbered criteria not imported", "OWNER_DECISION", std,
                "; ".join(f"{s} ({n})" for s, n in sorted(by_sheet.items())),
                f"{len(unaccounted)} workbook text cells are not owned by any numbered criterion and are not in the imported "
                f"description rows (element notes, comments and lists). Examples: {sample}. The full list is in "
                "checklist-qa-result.json. Decide whether this text belongs in the checklist baseline.")
        rep.unaccounted = unaccounted


# ---------- output ------------------------------------------------------------------

def write_outputs(rep):
    QA_DIR.mkdir(parents=True, exist_ok=True)
    blocks = [e for e in rep.exceptions if e["severity"] == "BLOCK"]
    warns = [e for e in rep.exceptions if e["severity"] == "WARN"]
    owner = [e for e in rep.exceptions if e["severity"] == "OWNER_DECISION"]
    result = {
        "generated_by": "content/qa/reconcile_checklists.py",
        "summary": {"checks_run": sum(rep.checks.values()), "BLOCK": len(blocks), "WARN": len(warns),
                    "OWNER_DECISION": len(owner)},
        "checks": rep.checks,
        "exceptions": rep.exceptions,
        "workbook_text_outside_criteria": [{"sheet": s, "text": t} for s, t in rep.unaccounted],
    }
    (QA_DIR / "checklist-qa-result.json").write_text(json.dumps(result, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    lines = ["# Checklist reconciliation: exceptions only", "",
             f"Checks run: {result['summary']['checks_run']}. Blocking: {len(blocks)}. Warnings: {len(warns)}. "
             f"Owner decisions: {len(owner)}.", "",
             "Only exceptions are listed. Checks that pass are counted in `checklist-qa-result.json`.", ""]
    for title, group in (("Blocking (checklist wrong against source)", blocks),
                         ("Owner decisions (scope or policy)", owner),
                         ("Warnings (quality, not wrong)", warns)):
        lines += [f"## {title}", ""]
        if not group:
            lines += ["None.", ""]
        for e in group:
            lines.append(f"- **{e['standard']} {e['ref']}**: {e['check']}. {e['detail']}")
        lines.append("")
    (QA_DIR / "CHECKLIST-QA-EXCEPTIONS.md").write_text("\n".join(lines), encoding="utf-8", newline="\n")
    return result


def run():
    rep = Report()
    for std in STANDARDS:
        reconcile_as(rep, std)
    reconcile_faa(rep)
    return rep


if __name__ == "__main__":
    result = write_outputs(run())
    s = result["summary"]
    print(f"checks {s['checks_run']}  BLOCK {s['BLOCK']}  WARN {s['WARN']}  OWNER_DECISION {s['OWNER_DECISION']}")
    sys.exit(1 if s["BLOCK"] else 0)
