# PMA Autopilot — Redesign Spec (sourced from real Burrana package)

**Status:** DRAFT FOR RED-LINE. No code written against this yet.
**Sources read in full:**
AC 21.303-4 (3/21/14) · Order 8110.42D (03/21/14) · AC 21-43A (10/1/15) ·
**F-851-45 Rev C** FAA-PMA Submission Checklist (completed, 02 Apr 2026) ·
**F-851-46 Rev A** Unnumbered PMA Supplement (Burrana form, populated) ·
**Production Assist Letter** — Northwest Aerospace Technologies ODA, 10 Apr 2026 ·
**N0737-D10 Rev B** Master Drawing List.

---

## 0. ⚠️ Two rules I invented would have BLOCKED every real Burrana submission

| Rule (build #1) | What it did | Reality in the live package |
|---|---|---|
| **PMA-LINK-003** — "PMA part number must differ from OEM part number, else BLOCKING per 45.15(a)(1)" | Fires BLOCKING when `pmaPartNumbers ∩ oemPartNumbers ≠ ∅` | In the real supplement, **Article Number == Approved Replacement for Article Number** on every row (`827000520-001` ↔ `827000520-001`). Under STC-assist identicality Burrana manufactures to the STC holder's design data and the numbers are identical **by design**. My rule would have thrown BLOCKING on all 103 line items and stopped generation. **DELETE.** |
| **PMA-BASIS-CONFLICT-001** — "STC + TC both present ⇒ ambiguous" | Fires WARNING | Assist letter carries STC **and** TC holder (`The Boeing Company`) as normal, required data. **DELETE.** |

I also told you last turn that `STC_IDENTICALITY` was "structurally wrong." **That was an
over-correction — it is Burrana's primary basis.** The real letter reads:

> *"Approval is requested based on identicality to the approved design data of STC ST12351SE
> and is evidenced by the STC Authorizations under 14 CFR 21.303(a)(4)."*

It is simply **outside AC 21.303-4's scope** (§2a routes it to AC 21-43A / Order 8120.22) — not invalid.

---

## 1. The submission office — CONFIRMED from the real letter

```
FAA – Scottsdale Certificate Management Section (AIR-871)
17777 North Perimeter Dr., Suite 103
Scottsdale, AZ 85255-5433
Attention: Mr. John Rigg
           Manager, Scottsdale Certificate Management Section
           West Certificate Management Branch
           System Oversight Division
           Aircraft Certification Service
```

So both terms are real and **nested**: the **Section** is the filing office; the **Branch** is its
parent. "ACO" is dead, as you said. This is Burrana's office — it stays **tenant-specific and is
never defaulted to another org**.

---

## 2. The real job — what the tool must actually eliminate

```
   Production Assist Letter (or STC)          ← source of truth, 4-column table
                 │
                 ├──────────────►  Unnumbered PMA Supplement (F-851-46)  6-column table
                 │                 103 line items, hand-transcribed today
                 │
                 └──────────────►  Application Letter (variant by source × count)
                                   │
                                   └────────►  F-851-45 checklist: verify all three agree
```

**Assist-letter → supplement column mapping (the automation):**

| Assist letter (4 cols) | → PMA Supplement (6 cols) |
|---|---|
| Manufacturer Part Name and Part No. | **splits** → Article Name + Article Number |
| Approved Replacement For | Approved Replacement for Article Number |
| TC/STC/TSOA Approval and Design Data | Approval Basis and Approved Design Data |
| Model Eligibility | **splits** → Make/TCH Eligibility + Model/Series Eligibility |

*The live package had **103 items over 18 pages**, transcribed by hand. That is the actual work.*

---

## 3. Unnumbered PMA Supplement — F-851-46 Rev A (matches AC App. C)

**Page-1 header block:**
```
FEDERAL AVIATION ADMINISTRATION – PARTS MANUFACTURER APPROVAL
BURRANA, Inc.                     PMA No.          PQ05320NM
743 West 1200 North, Suite 100    Supplement No.   [Supplement#]
Springville, UT 84663             Date             [Date]
```
**Columns (repeat on every page):** Article Name · Article Number · Approved Replacement for
Article Number · Approval Basis and Approved Design Data · Make/TCH Eligibility ·
Model/Series Eligibility
**Footer:** `Page X of Y`

**Approval-basis cell (real content):**
```
STC: ST12351SE
Dwg: N0737-827PS07-101-040D10
Rev: B
Date: 20-Mar-2026 or later FAA approved revisions
```
⚠️ **Normalization finding:** row 1 of the live supplement uses `STC No:` / `DWG No:` while all
other rows use `STC:` / `Dwg:`. A consistency check should catch this.

**Constraints:** AC App. C — *"Do not add extra fields, rows, or columns"*; one article per row;
MS Word format. **F-851-45 item 2.C — "ensure no more than 10 pages."** *The live supplement
was 18 pages — over the limit. Real finding the tool should surface.*

---

## 4. Application letter — real Burrana STC/single-source variant

Template selection (F-851-45 item 1.A): **Source × Count** →
Page 2 = TC Holder/Single · **Page 3 = STC/Single** · Page 4 = TC Holder/Multiple · Page 5 = STC/Multiple

Real text, with the merge fields ("grey fields") marked:

> Subject: **Request for PMA**
>
> Burrana, Inc. is submitting an application for Parts Manufacturing Approval (PMA) for
> **`{SYSTEM NAME}`**. We request your review of the enclosed data being submitted in support of
> this application. The **`{SYSTEM NAME}`** consists of the components listed in the unnumbered
> PMA Supplement and can be installed in **`{MODEL ELIGIBILITY}`**, 14 CFR Part 25 aircraft.
>
> Approval is requested based on identicality to the approved design data of STC
> **`{STC NUMBER}`** and is evidenced by the STC Authorizations under 14 CFR 21.303(a)(4).
>
> The system components will be manufactured at Burrana, Inc., **`{FACILITY ADDRESS}`**. The items
> listed in the unnumbered PMA Supplement will be manufactured in accordance with our FAA approved
> quality system.
>
> We appreciate your effort in support of this request.
>
> Yours sincerely / **`{SIGNATORY}`** / **`{TITLE}`** / Burrana, Inc.
>
> Enclosures:
> Copy unnumbered PMA Supplement
> Copy STC **`{STC NUMBER}`**
> Copy MASTER DRAWING LIST, **`{MDL NO}`**, Revision **`{MDL REV}`**

*Footer: facility address, Ph, FAX.*
⚠️ The live letter contains a typo — **"Boeng 787-8"**. A cross-document check catches this.

---

## 5. THE REAL RULE SET — F-851-45 Rev C item 3.A

**This replaces all 15 invented rules.** Verify these **six** items match across **three**
documents: **(1) Assist Letter or STC · (2) Application Letter · (3) PMA Supplement**

| # | Item | Where it must agree | Source |
|---|---|---|---|
| I | **System Name** | assist letter/STC ↔ letter (para 1 or table) ↔ supplement | F-851-45 3.A.I |
| II | **STC Number** | assist letter/STC ↔ letter (para 2 or table) ↔ supplement | 3.A.II |
| III | **TC Holder** | assist letter/STC ↔ letter (para 1 or table) ↔ supplement | 3.A.III |
| IV | **Model Eligibility** | assist letter/STC ↔ letter ↔ supplement. **"B" prefix for Boeing, "A" for Airbus; use "Series" or "Models" per the assist letter/STC; add special notes or exceptions as applicable** | 3.A.IV |
| V | **Enclosures** | letter's last paragraph ↔ what paras 1 & 2 (or table) declare | 3.A.V |
| VI | **Index List / Drawing List / Component drawing** | attachment ↔ the one named on the assist letter/STC | 3.A.VI |

Plus: item 2.B **item count**, 2.C **page count ≤ 10**, 4. **attach the checklist to the submission**.
Supplement completion follows **SOP-851-12 §4.1** *(not supplied — please send)*.

---

## 6. Roles — from the real form

F-851-45 tracks **Creator · Reviewer · Signatory** (live example: AVM creator, BRO reviewer +
signatory). My Preparer/Reviewer/Admin model should be replaced by these three.

---

## 7. Library — what it holds (your requirement)

Per approved package: application letter · **unnumbered PMA supplement** (draft + issued) ·
assist letter / STC · Master Drawing List (e.g. N0737-D10 Rev B) · completed F-851-45 ·
FAA correspondence · **PMA No.** (PQ05320NM) · Supplement No. · date.
Searchable by article name/number, replaced-for number, STC, TC holder, make/model, supplement no.

---

## 8. Open — need your call

1. **SOP-851-12** — please send; §4.1 governs supplement completion and I won't infer it.
2. **Model eligibility format:** letter says `Boeng 787-8`; checklist rule says B-prefix (`B787-8`);
   supplement splits `The Boeing Company` / `787-8`. Which is authoritative for each document?
3. **Page limit:** live supplement was 18 pages vs. the ≤10 guidance — hard rule or advisory?
4. **Letter variants:** I have STC/Single (page 3). Please send pages 2, 4, 5 (TC Holder single,
   and both multiple-source variants) so I don't reconstruct them.
5. **Retention:** keep superseded supplement revisions retrievable?
