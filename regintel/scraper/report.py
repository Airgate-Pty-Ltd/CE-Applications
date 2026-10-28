"""Deterministic report rendering.

A pure function of its inputs: no model, no I/O, no randomness. The same
findings always produce the same report.
"""

from __future__ import annotations

from models import LOOKBACK_DAYS, PRIORITY_RANK, Finding, SourceResult
from sources import UNCOVERED

PRIORITY_LABEL = {
    "urgent": "URGENT",
    "high": "HIGH",
    "normal": "NORMAL",
    "low": "LOW",
}


def dedupe_and_sort(findings: list[Finding]) -> list[Finding]:
    """Remove duplicates, then order deterministically."""
    seen: set[str] = set()
    unique: list[Finding] = []
    for f in findings:
        if f.key() in seen:
            continue
        seen.add(f.key())
        unique.append(f)

    unique.sort(
        key=lambda f: (
            PRIORITY_RANK.get(f.priority, 4),
            f.comment_deadline or "9999-12-31",
            f.title.lower(),
        )
    )
    return unique


def _format(f: Finding) -> str:
    lines = [f"**{f.title}**", ""]
    lines.append(f"- Priority: {PRIORITY_LABEL.get(f.priority, f.priority)}")
    if f.document_number:
        lines.append(f"- Document: {f.document_number}")
    if f.effective_date:
        lines.append(f"- Effective: {f.effective_date}")
    if f.comment_deadline:
        lines.append(f"- **Comment deadline: {f.comment_deadline}**")
    if f.verification == "unverified":
        lines.append("- [Warning] Dates not published in the source feed — confirm against the official record")
    lines.append(f"- Source: [{f.authority} — official record]({f.source_url})")
    if f.summary:
        lines += ["", f.summary]
    return "\n".join(lines)


def _section(title: str, findings: list[Finding], empty: str) -> str:
    if not findings:
        return f"## {title}\n\n{empty}\n\n---\n"
    return f"## {title}\n\n" + "\n\n---\n\n".join(_format(f) for f in findings) + "\n\n---\n"


def build_markdown(findings: list[Finding], report_date: str, results: list[SourceResult]) -> str:
    covered = [r.authority_name for r in results if r.ok]
    quiet = [r.authority_name for r in results if r.ok and not r.findings]
    failed = [(r.authority_name, r.error or "unknown error") for r in results if not r.ok]

    urgent = [f for f in findings if f.priority == "urgent"]
    deadlines = sorted(
        (f for f in findings if f.comment_deadline), key=lambda f: f.comment_deadline or ""
    )
    final_rules = [f for f in findings if f.category == "final_rule"]
    nprms = [f for f in findings if f.category in ("nprm", "npa")]
    standards = [
        f for f in findings if f.category in ("regulation", "amc_gm", "ed_decision", "opinion", "certification_specification")
    ]
    other = [
        f for f in findings
        if f not in final_rules and f not in nprms and f not in standards
    ]

    parts: list[str] = []
    parts.append(f"# Regulatory Intelligence Report — {report_date}\n")
    parts.append(
        f"{len(findings)} item{'' if len(findings) == 1 else 's'} published in the last "
        f"{LOOKBACK_DAYS} days. Every item below is taken directly from the publishing "
        f"authority's official record — dates and document numbers are the authority's "
        f"own values.\n\n"
        "Urgent = comment deadline or effective date within 7 days. "
        "High = deadline or effective date within 30 days.\n"
    )

    parts.append(_section("Priority Alerts", urgent, "No priority alerts today."))

    if deadlines:
        rows = "\n".join(
            f"| {f.comment_deadline} | {f.authority} | {f.document_number or '—'} | [{f.title[:70]}]({f.source_url}) |"
            for f in deadlines
        )
        parts.append(
            "## Open Comment Deadlines\n\n"
            "| Closes | Authority | Document | Item |\n|---|---|---|---|\n" + rows + "\n\n---\n"
        )

    parts.append(_section("Final Rules", final_rules, "No new final rules today."))
    parts.append(_section("Proposed Rules, NPRMs & NPAs", nprms, "No new proposed rules today."))
    parts.append(_section("Regulations, AMC/GM & Decisions", standards, "No new regulatory instruments today."))
    parts.append(_section("Notices & Other Documents", other, "No other documents today."))

    if quiet:
        parts.append(f"## No Activity\n\nNo new items from: {', '.join(quiet)}.\n\n---\n")

    if failed:
        parts.append(
            "## Sources Unavailable\n\n"
            "These sources could not be reached this run. Their absence above does NOT "
            "mean there was no activity:\n\n"
            + "\n".join(f"- **{name}** — {err}" for name, err in failed)
            + "\n\n---\n"
        )

    if UNCOVERED:
        parts.append(
            "## Coverage Gaps\n\n"
            "No authoritative source is configured for the following, so they were "
            "**not checked**:\n\n"
            + "\n".join(f"- **{a['name']}** — {a['note']}" for a in UNCOVERED)
            + "\n\n---\n"
        )

    parts.append(
        f"*Compiled from {len(covered)} authority source(s) as at {report_date}. "
        f"Deterministic pull from official sources; no AI-generated regulatory content.*"
    )

    return "\n".join(parts)
