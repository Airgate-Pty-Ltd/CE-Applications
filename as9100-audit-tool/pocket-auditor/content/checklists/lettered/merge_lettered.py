"""Merge the lettered-row authoring batches into the canonical checklists, with checks.

Checks (any failure stops the merge and writes nothing):
  - every batch row's ref is a lettered row of the canonical checklist (no invented references)
  - no reference appears twice across all batches (duplicate-reference check)
  - every merged row has a non-empty question and a non-empty evidence list (required fields)

A row becomes AUTHORED only when it passes these checks. Rows with no batch entry stay
PENDING_AUTHORING and are counted, never marked complete.

Run from the product root:  python -I content/checklists/lettered/merge_lettered.py
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BATCH_DIR = Path(__file__).resolve().parent
REQUIRED = ["ref", "question", "evidence"]


def canonical_lettered(std):
    d = json.loads((ROOT / "content" / "checklists" / f"{std}.json").read_text(encoding="utf-8"))
    return d, {i["ref"] for i in d["items"] if i.get("type") == "lettered_subparagraph"}


def load_batches(std):
    rows, errors, seen = [], [], {}
    for path in sorted(BATCH_DIR.glob(f"{std}-batch-*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        if data.get("standard") != std:
            errors.append(f"{path.name}: standard field is {data.get('standard')!r}")
        for idx, r in enumerate(data.get("rows", [])):
            where = f"{path.name} row {idx}"
            for k in REQUIRED:
                if k not in r or (k != "evidence" and not str(r.get(k) or "").strip()):
                    errors.append(f"{where}: missing required field {k}")
            if isinstance(r.get("evidence"), list) and not r.get("evidence"):
                errors.append(f"{where} ({r.get('ref')}): evidence list is empty")
            ref = r.get("ref")
            if ref in seen:
                errors.append(f"duplicate reference {ref}: in {seen[ref]} and {path.name}")
            else:
                seen[ref] = path.name
            rows.append((path.name, r))
    return rows, errors


def merge(std):
    data, lettered = canonical_lettered(std)
    rows, errors = load_batches(std)
    for name, r in rows:
        if r.get("ref") not in lettered:
            errors.append(f"{name}: {r.get('ref')} is not a lettered row of the canonical {std} checklist")
    if errors:
        return None, errors
    by_ref = {r["ref"]: r for _, r in rows}
    authored = 0
    for it in data["items"]:
        if it.get("type") != "lettered_subparagraph":
            continue
        src = by_ref.get(it["ref"])
        if src:
            it["question"] = src["question"].strip()
            it["evidence"] = [e.strip() for e in src["evidence"]]
            it["wording_status"] = "AUTHORED"
            authored += 1
        else:
            it["question"] = None
            it["evidence"] = []
            it["wording_status"] = "PENDING_AUTHORING"
    summary = {
        "lettered_total": len(lettered),
        "authored": authored,
        "pending_authoring": len(lettered) - authored,
    }
    data["lettered_coverage"] = summary
    return (data, summary), []


def main():
    status = 0
    for std in ("AS9100D", "AS9110C"):
        result, errors = merge(std)
        if errors:
            status = 1
            print(f"{std}: MERGE REFUSED ({len(errors)} error(s)); nothing written")
            for e in errors:
                print("  -", e)
            continue
        data, summary = result
        (ROOT / "content" / "checklists" / f"{std}.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
        cov = BATCH_DIR.parent.parent / "reconciliation" / f"{std}-lettered-coverage.json"
        cov.write_text(json.dumps({"standard": std, **summary}, indent=1), encoding="utf-8")
        print(f"{std}: lettered total {summary['lettered_total']}, authored {summary['authored']}, pending {summary['pending_authoring']}")
    return status


if __name__ == "__main__":
    sys.exit(main())
