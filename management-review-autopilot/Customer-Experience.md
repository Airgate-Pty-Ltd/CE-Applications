# Customer Experience — Management Review Autopilot

## What already works well (verified in the actual UI)
The product teaches as you use it — no separate onboarding doc is strictly required to start:
- The Setup tab's callout box explains the workflow in three sentences before the user touches
  the Input Board.
- Every input card carries a "What an auditor samples" guidance line — this doubles as
  just-in-time training, which is exactly the audience (a QM who may not have run MR before).
- The coverage score and gap banner give continuous, honest feedback ("X gap(s) an auditor would
  flag") rather than a pass/fail gate — this respects the user's judgment rather than blocking them.

## Getting Started (new — added this pass as a standalone reference)

1. **Pick your standard** on the Setup tab (ISO 9001, AS9100D, AS9110C, or ISO 13485) — this
   determines which inputs and output categories appear everywhere else in the app.
2. **Fill in review metadata** (org name, date, period, chair, attendees).
3. **Work the Input Board.** Each card is one required input. Mark it "Data entered" and write a
   summary, or mark "N/A (justified)" and explain why — an empty or unjustified card is exactly
   what a CB auditor would write up, and the app tells you so before the review happens.
4. **Log decisions in the Output Action Register** as they come up during the review — every
   action needs an owner and due date; unowned actions are themselves a common finding.
5. **Generate the package.** Review the readiness verdict, then download the Markdown file,
   copy it to clipboard, or print it directly.

## FAQ (new)

**Q: Does this replace top management's judgment?**
No. The footer and package output both state this explicitly — MRA is a documentation aid. The
coverage score and gap list are advisory; the chair and Management Representative remain
responsible for the actual review and its conclusions.

**Q: Is my data sent anywhere?**
No — v1.0 stores everything in the browser's `localStorage`. Nothing is transmitted to a server.
This also means data does not follow you across devices or browsers in v1.0 (see Product-Roadmap.md
v2.1 for the planned cloud-sync option).

**Q: What if I lose my data?**
Download the Markdown package regularly as a backup — the "Reset all data" button is a full,
unrecoverable wipe of the local browser storage by design (it asks for confirmation first).

**Q: Can I switch standards mid-review?**
Yes — the app keeps a separate card set per standard (`S.cards[S.std]`), so switching the
dropdown doesn't lose data entered under a different standard, though a review should typically
stay on one standard from setup to package generation.

## Admin/Implementation notes for consultants running this for clients
Until the v2.1 multi-client workspace ships, each client needs their own browser profile/session
(since state is per-browser via localStorage) — document this limitation clearly at the point of
sale to consultant-tier buyers so it isn't a support surprise.
