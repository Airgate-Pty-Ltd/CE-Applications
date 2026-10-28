"""Run the Pocket Auditor build checks and write a log.

Covers the scripts in content/ and the JSON they produce. It does not run the QMS tool
and does not contact any tenant or service. Output goes to tests/RUN-LOG.txt.

Run from the product root:  python -I tests/run_checks.py
"""
import datetime
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOG = ROOT / "tests" / "RUN-LOG.txt"

STEPS = [
    ("parse FAA 14 CFR 145 extract", [sys.executable, "-I", "content/parse_ecfr.py",
        "sources/ecfr-14-cfr-145.xml", "content/rows-faa-14cfr-145.json", "FAA 14 CFR Part 145"]),
    ("parse FAA 14 CFR 21 extract", [sys.executable, "-I", "content/parse_ecfr.py",
        "sources/ecfr-14-cfr-21.xml", "content/rows-faa-14cfr-21.json", "FAA 14 CFR Part 21"]),
    ("build AS findings report", [sys.executable, "-I", "content/build_as_findings.py"]),
    ("build audit clause universe (4-10)", [sys.executable, "-I", "content/build_audit_rows.py"]),
    ("verify audit clause universe", [sys.executable, "-I", "content/verify_audit_rows.py"]),
    ("engine unit tests", [sys.executable, "-I", "-m", "unittest", "discover", "-s", "tests", "-p", "test_*.py"]),
    ("synthetic quality-manual vertical demo", [sys.executable, "-I", "tests/demo_qm_vertical.py"]),
    ("reconcile canonical checklists to licensed copies", [sys.executable, "-I", "content/reconcile_canonical.py"]),
    ("complete canonical row fields (locator, N/A, finding link)", [sys.executable, "-I", "content/complete_rows.py"]),
    ("merge authored lettered rows (duplicate, required-field and unknown-reference checks)", [sys.executable, "-I", "content/checklists/lettered/merge_lettered.py"]),
    ("checklist reconciliation against licensed sources and workbook (exceptions only)", [sys.executable, "-I", "content/qa/reconcile_checklists.py"]),
    ("build prototype gate status and sample snapshot", [sys.executable, "-I", "content/build_prototype_status.py"]),
]

JSON_FILES = [
    "content/library-seed.json",
    "content/checklists/AS9100D.json",
    "content/checklists/AS9110C.json",
    "content/reconciliation/AS9100D-reconciliation.json",
    "content/reconciliation/AS9110C-reconciliation.json",
    "prototype/data/gate-status.json",
    "content/AS-licensed-clause-register.json",
    "content/audit-rule/clause-universe.json",
    "content/audit-rule/rule.json",
    "content/rows-faa-14cfr-145.json",
    "content/rows-faa-14cfr-21.json",
    "content/rows-easa-part145.json",
    "content/rows-easa-part21.json",
    "content/rows-uk-part145.json",
    "content/rows-caac-maint-org.json",
]

lines = [f"Pocket Auditor check run  {datetime.datetime.now().isoformat(timespec='seconds')}", ""]
failed = 0

for label, cmd in STEPS:
    proc = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
    status = "PASS" if proc.returncode == 0 else f"FAIL (exit {proc.returncode})"
    failed += proc.returncode != 0
    lines += [f"[{status}] {label}", f"    $ {' '.join(cmd[1:])}"]
    for out in (proc.stdout + proc.stderr).strip().splitlines()[-12:]:
        lines.append(f"    | {out}")
    lines.append("")

for rel in JSON_FILES:
    try:
        json.loads((ROOT / rel).read_text(encoding="utf-8"))
        lines.append(f"[PASS] JSON parses: {rel}")
    except Exception as exc:  # report, do not hide
        failed += 1
        lines.append(f"[FAIL] JSON parses: {rel}: {exc}")

import shutil
scratch = ROOT / "tests" / "_scratch"
if scratch.exists():
    shutil.rmtree(scratch, ignore_errors=True)
lines += ["", f"RESULT: {'ALL CHECKS PASS' if failed == 0 else f'{failed} CHECK(S) FAILED'}"]
LOG.write_text("\n".join(lines) + "\n", encoding="utf-8")
print("\n".join(lines))
sys.exit(1 if failed else 0)
