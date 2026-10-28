# Compass — CMMC Guided Compliance Platform
## Project Brief · Conform-Edge Software
**Date:** September 3, 2026  
**Authors:** Brian Olea  
**Status:** Concept → Go/No-Go Decision Required  
**Distribution:** Brian Olea, Mike Bower

---

## What Is This

Compass is a SaaS product that guides defense contractors through CMMC Level 2 compliance — practice by practice — while teaching them what each requirement means and how to achieve it for their specific business. It is the only tool on the market designed to close the gap between "understanding CMMC" and "achieving CMMC."

Every existing tool either assesses or teaches. None do both simultaneously. That is the gap, and it is real and unmet.

The market: $6.8 billion in 2025, growing to $39.4 billion by 2034. Only 8% of Level 2 contractors are certified as of mid-2026. Phase II enforcement was suspended for small businesses in July 2026 — which creates a preparation window, not an exit signal. Companies that use this window to get ready will dominate when enforcement resumes.

Compass does five things in one workflow: onboards the company to understand their CUI scope, assesses all 110 NIST 800-171 practices with inline teaching content, generates specific remediation steps for every gap, auto-builds the SSP / SPRS score / POA&M as outputs, and produces a C3PAO-ready evidence package.

The interactive prototype is in this folder as `Compass-CMMC-Prototype.html`.

---

## What We Need from Brian Before This Becomes a Project

These are decisions only Brian can make. Until these are resolved, Mike should not begin architecture or build work.

**Go/no-go and positioning**
- Formal product go-ahead. This stays a concept until Brian says otherwise.
- Is Compass a standalone branded product, or a Conform-Edge module? This affects pricing, website presence, and legal structure.
- Does this live under the Conform-Edge LLC or does it warrant a separate entity? (Revenue scale, liability exposure, and investor optionality are all factors.)

**Budget and resourcing**
- Build budget authorization: estimated $170,000–$270,000 for MVP. Brian needs to confirm what's available and over what timeline.
- Brian's content authoring commitment: the 110-practice knowledge base — plain-English translations, "what this means for your business" guidance, evidence requirements, remediation steps, and C3PAO failure patterns — requires approximately 80–120 hours of subject matter work. This content is the core differentiator and it cannot be outsourced without losing accuracy. Brian is the author. That time needs to be planned.

**Legal and liability decisions**
- A tool that generates SPRS scores creates exposure if a contractor submits an incorrect score and loses a contract. Brian needs a legal review of the disclaimer and limitation of liability language before launch. This is not optional.
- Data handling: if customers upload evidence documents that contain CUI or CUI-adjacent material, Conform-Edge becomes a handler. The terms of service and the infrastructure architecture must account for this. Brian needs to decide the data scope: metadata only, or actual document storage?

**Go-to-market position**
- Which existing CE clients do we approach first for beta testing? Brian holds those relationships.
- Do we pursue C3PAO partnerships in parallel with launch, or after? Brian's network determines this.
- Is Annex Quality producing a CMMC training course that bundles with Compass? If yes, that is a significant pricing and marketing lever and needs to be planned together.

---

## What We Need from Mike Before Build Begins

**Architecture**
- Can the existing VERA + M-AI architecture serve as the foundation, or does Compass require a separate platform build? Mike needs to evaluate fit and identify what components are reusable versus what needs to be built net-new.
- What does the M-AI domain pack for CMMC look like? The knowledge base Brian authors needs to be structured as DIM inputs, not flat content. Mike defines that schema.
- Authentication: Microsoft 365 / Entra ID SSO is the right choice for the target customer (defense manufacturers are almost universally Microsoft shops). Mike confirms feasibility and implementation approach.

**Infrastructure and hosting**
- Mike needs to specify the hosting environment before build begins. See the data protection section below — this is a constraint, not a preference.
- Database architecture: multi-tenant (shared schema, isolated rows) or single-tenant (separate databases per customer)? The latter costs more but eliminates cross-contamination risk, which matters for a CMMC tool.
- Mike provides timeline estimate and resource allocation across the five system components.

**Capacity**
- Mike needs to confirm bandwidth. If AQ course builds are consuming his cycles, Compass waits or resources are added. Brian needs an honest answer before committing to any external timeline.

---

## 60-Day Launch Plan

This is an MVP launch — Level 1 and Level 2 self-assessment, SSP generation, and SPRS score output. It is not the full platform. The goal is paying customers and real-world feedback within 60 days of go-ahead.

**Days 1–10: Decisions and setup**
- Go/no-go confirmed; budget authorized
- Domain registered (compass.conformedge.com or standalone domain)
- Legal review initiated: ToS, Privacy Policy, limitation of liability, data handling agreement
- Infrastructure decision finalized (hosting environment, data storage scope)
- Mike begins architecture spec; Brian begins content outline for all 110 practices
- Pricing tiers confirmed (see revenue section)

**Days 11–25: Content and core build in parallel**
- Brian authors knowledge base content for highest-priority domains first (AC, CM, IA, SC, AU — these are the most-failed domains and the most valuable teaching content)
- Mike builds: authentication, organization onboarding flow, core assessment engine (database schema, practice state management, scoring logic)
- UI framework from VERA design system applied to assessment flow

**Days 26–40: Integration and generation**
- Brian completes remaining 9 domain content
- SSP and SPRS generation engine integrated with assessment answers
- POA&M auto-build from gap list
- Evidence attachment module (file upload, URL linking, notes)
- Internal QA on all 110 practices: Brian reviews every piece of guidance for accuracy

**Days 41–50: Beta testing**
- 3–5 existing CE clients (aerospace/defense, Level 2 requirement) receive early access at no charge in exchange for structured feedback
- Bug fixes; content corrections based on user confusion points
- C3PAO readiness report module built based on beta feedback

**Days 51–60: Launch**
- Pricing page live on conformedge.com
- Soft launch email to CE client base and Annex Quality network
- LinkedIn announcement
- Monitoring and rapid-response support window

**Honest assessment of 60-day risk:** The content authoring is the critical path. If Brian cannot commit 80–120 hours to practice content in weeks 2–5, the timeline slips. The build is achievable. The content is the constraint.

---

## Blockers

These are real risks, not hypothetical ones. Each needs an owner and a plan before launch.

**Content quality and liability**  
The teaching content Brian authors will directly influence how companies respond to C3PAO assessors. If the guidance is wrong and a company fails an assessment or submits an incorrect SPRS score, there is legal exposure. Mitigation: legal disclaimer language, limitation of liability, and a clause that Compass outputs are "for preparation purposes only and do not constitute legal, regulatory, or audit advice." Brian owns this; legal counsel confirms it.

**Data sovereignty**  
A CMMC compliance tool that stores customer compliance data must address where that data lives. If customers upload evidence documents, some of those documents may contain CUI. Storing CUI without proper authorization creates a compliance problem for Conform-Edge itself. Two options: (1) restrict storage to metadata only — no document content stored, links and attestations only — which avoids the CUI handling issue entirely; or (2) build on FedRAMP-authorized infrastructure (AWS GovCloud, Azure Government) and seek FedRAMP authorization for Compass itself, which is a multi-year, expensive process not appropriate for an MVP. Recommendation: metadata-only storage in v1, with a documented roadmap to document hosting in v2 on FedRAMP-authorized infrastructure.

**C3PAO acceptance**  
Compass output is only valuable if C3PAOs accept it as credible pre-assessment preparation. If assessors discount Compass-generated SSPs or SPRS scores, the value proposition weakens. Mitigation: early partnership conversations with one or two C3PAOs who will review and validate the output format. Brian's network is the path to those conversations.

**Mike's bandwidth**  
If Annex Quality course builds are at capacity, this competes. The answer is an honest conversation, not an assumption.

**CMMC regulatory stability**  
Phase II was suspended. CMMC has had multiple restructurings since 2019. There is a scenario where enforcement delays further or the program is restructured again under a new administration. Mitigation: Compass is built on NIST 800-171 Rev 3, which is a NIST publication independent of DoD program decisions. Even if CMMC the program changes, 800-171 compliance remains a contractual requirement in most defense contracts. The tool's core value survives regulatory turbulence.

**Pricing and willingness to pay**  
The target customer (50–250 person defense manufacturer) is price-sensitive. First-year compliance costs of $75K–$300K make $800/month look attractive. But without early validation from actual customers, the pricing is a hypothesis. Beta testing is not optional — it is the pricing validation mechanism.

---

## How We Sell It

**Primary channel: existing CE client base (launch)**  
These are defense manufacturers who already trust Brian and Conform-Edge. The pitch is one email and a phone call. They have CMMC requirements. They know the pain. The conversion rate from warm relationships is materially higher than cold acquisition. This is the launch channel. Target: 20 conversations, 5 beta users, 3 paying customers by day 60.

**Secondary channel: Annex Quality network (weeks 4–8)**  
AQ serves auditors, quality professionals, and compliance leads — many of whom are at or advise DIB companies. A bundled offer (AQ CMMC training course + Compass subscription) is a natural upsell from the training audience to the compliance tool. This requires the AQ CMMC course to exist or be in development simultaneously.

**Website and SEO (ongoing, 90-day horizon)**  
CMMC is among the most-searched compliance topics for defense contractors. A content strategy built around the specific pain points — "what is SPRS score," "CMMC Level 2 practices explained," "how to write a system security plan" — will drive organic traffic. These are the exact questions Compass answers. The website landing page should be live at launch and SEO-optimized from day one.

**Paid acquisition (post-revenue validation)**  
LinkedIn targeted ads to: VP of Quality, Director of Compliance, Contracts Manager, Operations Manager at companies with CAGE codes or DCSA contract vehicles. Do not spend on paid acquisition until organic channels and referral have validated the messaging. Running paid ads on an unvalidated pitch is waste.

**C3PAO and RPO partnerships (months 3–6)**  
Registered Practitioner Organizations and C3PAOs serve exactly the companies who need Compass. A referral arrangement — they recommend Compass to clients as pre-assessment prep, receive a referral fee — creates a distribution channel with built-in credibility. This requires relationship-building, not just a partner page. Brian initiates those conversations.

**Government contracting associations (months 3–12)**  
NDIA, NCMA, AUSA, and regional aerospace associations are where defense contractors meet. Speaking slots, exhibiting at events, or sponsorship puts Compass in front of the right rooms. This is a slow burn but a high-trust channel.

**Product directories and SaaS marketplaces (ongoing)**  
G2, Capterra, Software Advice, and CMMC-specific directories (CMMC-AB ecosystem) are where buyers search for compliance tools. A listing there on day one costs nothing and captures discovery traffic from buyers who are already looking.

---

## Customer Data Protection

This needs to be settled before a single customer signs up. The approach determines the infrastructure, the terms of service, and the product scope.

**What data Compass handles**

At minimum: company name, contact information, contract types, CUI scope description, practice implementation status (yes/partial/no/N/A for 110 practices), free-text notes, and SPRS score history.

If document storage is enabled: evidence files (policy documents, screenshots, configuration records, audit logs). Some of these may contain CUI or CUI-adjacent content.

**Recommended v1 approach: metadata-only**

Do not store document content in v1. Store attestations, notes, and links only. This keeps Conform-Edge outside the CUI handling perimeter and dramatically simplifies the infrastructure requirements. Customers keep their evidence documents in their own systems (SharePoint, Google Drive, a file server). Compass stores the attestation that the document exists and what it covers.

This is not a limitation — it is a selling point. "Your sensitive documents never leave your environment" is a stronger security message than "we store your documents on our servers."

**Infrastructure requirements regardless of scope**

- TLS 1.2+ in transit; AES-256 at rest
- US-only data residency (no international data transfers)
- Single-tenant database architecture per customer or rigorous row-level isolation with audited access controls
- No customer data used for AI model training — ever. This must be explicit in the terms of service.
- Automatic data deletion within 30 days of account close, with a pre-deletion export window for the customer
- SOC 2 Type II certification for Compass within 12 months of launch (ironic but necessary — the product's credibility depends on it)
- Multi-factor authentication required for all accounts (this is not optional for a CMMC tool)
- Access logs retained for minimum 90 days, available to customers on request

**On AI-generated content and customer data**

If the M-AI kernel provides contextual guidance using customer inputs, the architecture must ensure that no customer's data informs another customer's responses. Domain isolation at the M-AI layer is required from day one.

**Pricing tier data handling**

Tier 1 (self-assessment, Level 1): metadata + attestations, standard infrastructure. Tier 2 (Level 2, guided): same, plus SSP/POA&M generated content stored per-organization. Tier 3 (enterprise): customer-managed encryption keys, dedicated infrastructure option, audit log export, custom data retention policies.

---

## Revenue Model

| Tier | Scope | Price/month | Target customer |
|------|-------|-------------|-----------------|
| Level 1 Starter | Self-assessment, 17 practices, SPRS score | $300 | Companies exploring CMMC, early-stage |
| Level 2 Guided | 110 practices, SSP/POA&M generation, AI remediation | $800 | Primary market — small/mid defense manufacturers |
| Level 2 Enterprise | Multi-site, multi-user, C3PAO evidence package, API | $1,500+ | Mid-market, prime contractors with supply chain obligations |

Annual prepay discount: 15%. This is the primary cash flow lever in year 1.

Revenue projections:

| Year | Subscribers | Avg MRR | ARR |
|------|-------------|---------|-----|
| Year 1 | 200 | $600 | $1.4M |
| Year 2 | 600 | $750 | $5.4M |
| Year 3 | 2,000 | $1,000 | $24M |
| Year 5 | 6,000 | $1,200 | $86M |

Build estimate: $170,000–$270,000 for MVP on existing VERA + M-AI architecture. Payback at Year 1 conservative: approximately 18 months.

---

## Open Questions for Mike

1. Can VERA handle a multi-panel assessment UX (left navigation for domain map, center for practice assessment, right panel for teaching content) without major new component work?
2. What does the M-AI DIM schema look like for CMMC practice content — specifically, how do we structure 110 practices × (plain English + evidence requirements + remediation steps + failure modes) as structured inputs rather than flat text?
3. What is the realistic build timeline for the five system components if Mike has full allocation? If split with AQ build work?
4. Is AWS standard sufficient for v1 (metadata-only storage) or does Mike recommend starting on GovCloud given the likely trajectory?
5. Authentication: can we support Microsoft 365 SSO (Entra ID) at launch? This is not optional for the target customer.
6. What does the SSP generation engine look like — template-driven with variable substitution from assessment answers, or something more sophisticated?
7. What is Mike's recommended approach to the versioning requirement — every assessment answer change must be tracked with a timestamp and user attribution for auditability?

---

## 5-Year View

The tool that survives five years is not a checklist with a score. It is a platform that learns what CMMC compliance looks like across thousands of defense manufacturers — what gaps are most common, what remediations actually work, what C3PAOs examine most closely, what evidence formats assessors accept. That knowledge compounds. A GRC platform bolting CMMC onto SOC 2 cannot replicate it.

The five-year evolution:

- **2026:** Level 1 + Level 2 self-assessment, SSP/SPRS/POA&M, 200 subscribers
- **2027:** Phase II enforcement resumes, conversion surge. C3PAO evidence package, multi-user, AQ training bundle. 600 subscribers.
- **2028:** Level 3 (NIST 800-172) module. Continuous monitoring post-certification. Supplier CMMC flow-down. 2,000 subscribers.
- **2029:** C3PAO white-label program. Cross-framework bridge: CMMC + AS9100 + ISO 27001 unified for dual-standard companies.
- **2030:** Full DIB compliance platform. Compass + Outcome Forge integration closes the implementation loop. Compass becomes the QMS of record for SMB defense.

---

## Next Steps

| Action | Owner | Due |
|--------|-------|-----|
| Go/no-go decision | Brian | Before any build work |
| Budget authorization | Brian | With go/no-go |
| Legal review: ToS, liability language, data handling | Brian (initiates) | Week 1 |
| Architecture fit assessment: VERA + M-AI for Compass | Mike | Week 1 |
| Mike capacity and timeline estimate | Mike | Week 1 |
| Data scope decision: metadata-only or document storage | Brian + Mike | Week 1 |
| Domain registration | Brian | Week 1 |
| Content outline: 110 practices, authoring schedule | Brian | Week 2 |
| Infrastructure decision: hosting environment | Mike | Week 2 |
| Pricing tier confirmation | Brian | Week 2 |
| AQ CMMC training course: build or defer? | Brian | Week 2 |
| Beta client identification: 3–5 existing CE clients | Brian | Week 2 |

---

*This is a Conform-Edge software product. Annex Quality branding does not apply. All customer-facing materials, pricing, terms of service, and product communications use Conform-Edge identity only.*

*Document status: DRAFT — for internal planning. Not for external distribution.*
