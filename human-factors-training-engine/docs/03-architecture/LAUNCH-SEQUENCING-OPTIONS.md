# Human Factors Training Engine — Launch Sequencing Strategy
**Date:** 2026-07-22  
**Decision Required:** Which system launches first?  
**Prepared by:** Claude Code  

---

## The Two Systems (Interdependent but Separate Launches)

### System A: Desktop Adaptive Engine
- **What it does:** Monitors organizational evidence, classifies human factors relevance, generates training recommendations, governs approval workflow
- **Runs on:** Windows + macOS (Tauri/Electron)
- **User:** Training Owner, Administrator
- **Key output:** Recommendation records + Training releases
- **Complexity:** High (M-AI Kernel, file monitoring, governance workflow)
- **Build time:** 8–12 weeks
- **Dependencies:** None (standalone system)

### System B: Web Training Platform
- **What it does:** Delivers training courses, assessments, tracks learner completion, issues certificates
- **Runs on:** Browser (Next.js + React)
- **Users:** Learners, Training Managers, Administrators
- **Key output:** Completion records + Effectiveness data
- **Complexity:** Medium (mostly feature completion of existing app)
- **Build time:** 2–4 weeks (to finish existing 80% done app)
- **Dependencies:** Can work alone with baseline training; enhanced by System A recommendations

---

## Four Launch Sequencing Options

### **Option 1: Web Platform First (Shorter Time to Revenue)**

```
Timeline:
├── Weeks 1-4:   Web platform (finish Next.js app, add assessments, certificates, dashboard)
├── Weeks 5-16:  Desktop engine (build M-AI Kernel, folder monitoring, governance)
└── Week 17:     Integration (connect systems)

Total to first launch: 4 weeks
Total to full system: 17 weeks
```

**What Launches in Week 4:**
- ✅ Learner training platform (baseline courses, assessments, certificates)
- ✅ Admin dashboard (course management, user management, completion reports)
- ✅ Can deploy immediately to web (Railway, Vercel, etc.)
- ❌ No adaptive training yet (no recommendations being generated)

**Advantages:**
- **Speed to market:** 4 weeks vs. 12+ weeks
- **Commercial viability:** Can start selling baseline training immediately
- **Proof of concept:** Demonstrates the product works, builds credibility
- **Revenue generation:** Covers development costs of Phase 2
- **Risk reduction:** Validates market fit before investing in complex M-AI system
- **Learner onboarding:** Users get comfortable with platform while engine develops

**Disadvantages:**
- Two separate product launches (perceived as incomplete at launch 1)
- Requires second launch announcement/integration work
- Users see "coming soon" for adaptive features initially
- Time-to-complete-system is still 17 weeks

**Best for:**
- Rapid commercial launch
- Proving product/market fit
- Generating early revenue to fund Phase 2
- Organizations that want baseline training now

---

### **Option 2: Desktop Engine First (Technology-First, Premium Product)**

```
Timeline:
├── Weeks 1-12:  Desktop engine (M-AI Kernel, file monitoring, governance, testing)
├── Weeks 13-16: Web platform (finish Next.js app, integrate with engine)
└── Week 17:     Full system launch

Total to first launch: 12 weeks
Total to full system: 16 weeks
```

**What Launches in Week 12:**
- ✅ Complete adaptive training system (engine + baseline platform)
- ✅ Governance demonstrated (human approval of AI recommendations)
- ✅ M-AI Kernel tested and proven
- ❌ Web platform not ready (desktop-only)
- ❌ Can't assign training to learners yet
- ❌ No learner records/completion tracking

**Advantages:**
- **Complete product at launch:** No "incomplete" perception
- **Technology premium:** Launches as proven, innovative system
- **Intellectual property:** M-AI Kernel is the differentiator
- **Avoids perception problem:** Not "training system lacking adaptive feature"
- **Regulatory strength:** Can demonstrate governance from day one
- **Enterprise credibility:** Comes with full traceability, audit trail

**Disadvantages:**
- Long wait before any product is usable (12 weeks)
- No revenue during development phase
- No market validation before major investment
- Higher risk if engine doesn't work as intended
- Learners can't actually use system at engine launch
- Requires desktop software deployment (more complex than web)

**Best for:**
- Premium positioning
- Risk tolerance for longer development
- Organizations that need full governance before training use
- Technology-focused market differentiation

---

### **Option 3: Parallel Development (Simultaneous, Integrated Launch)**

```
Timeline:
├── Weeks 1-12:  Desktop engine (Stream A) + Web platform (Stream B) in parallel
└── Week 13:     Integration testing + full system launch

Total to first launch: 13 weeks
Total to full system: 13 weeks
```

**What Launches in Week 13:**
- ✅ Complete integrated system (desktop engine generating recommendations)
- ✅ Web platform consuming engine recommendations
- ✅ Full adaptive training workflow demonstrated
- ✅ Learners assigned engine-generated continuing education
- ✅ Traceability from source evidence → training assignment → completion

**Advantages:**
- **Shortest time to complete system:** 13 weeks (not 17)
- **Full product at launch:** No two launches, no "coming soon"
- **Unified positioning:** "End-to-end adaptive training system"
- **No perception gap:** Users don't see incomplete product
- **Integration tested:** Both systems proven to work together
- **Maximum differentiation:** Demonstrates complete workflow

**Disadvantages:**
- **Highest resource requirement:** Both teams working simultaneously
- **Coordination complexity:** Must manage parallel streams
- **Risk concentration:** Problems in either stream delay entire launch
- **No early revenue:** Nothing launches before week 13
- **No phased validation:** Can't prove web platform works before engine ready

**Best for:**
- Well-resourced teams
- Clear parallel-stream management
- Organizations that can wait 13 weeks for complete product
- Strong market pull (already have customers waiting)

---

### **Option 4: Phased MVP Strategy (Recommended for Risk Management)**

```
Timeline:
Phase 1 (Weeks 1-3):    Bare-minimum web platform (baseline training only, no adaptive)
                        → LAUNCH baseline training platform
Phase 2 (Weeks 4-15):   Build desktop engine in parallel (web users getting value)
Phase 3 (Week 16):      Connect systems (recommendations flowing into learner assignments)
                        → LAUNCH adaptive features (same platform, new capability)

Total to first launch: 3 weeks
Total to full system: 16 weeks
```

**What Launches in Week 3:**
- ✅ Baseline training (5 courses, 42 lessons)
- ✅ User authentication (learners can log in)
- ✅ Course enrollment
- ✅ Assessment + pass/fail + certificates
- ✅ Completion tracking
- ❌ No adaptive features yet (coming in Phase 3)

**What Launches in Week 16:**
- ✅ Everything from Phase 1, PLUS:
- ✅ Desktop engine recommendations appearing as "New Continuing Education"
- ✅ Traceability visible to administrators
- ✅ Full adaptive training workflow
- ✅ Complete audit trail

**Advantages:**
- **Ultra-fast initial launch:** 3 weeks to first product
- **Immediate revenue:** 13-week head start selling baseline training
- **User validation:** Get feedback from real learners before engine launch
- **Risk mitigation:** Engine development happens while platform proves market fit
- **Sustainable pace:** Not crashing to finish both systems simultaneously
- **Funding mechanism:** Phase 1 revenue can fund Phase 2 development
- **Marketing advantage:** "New Adaptive Features Launching [date]" = second wave of marketing
- **Parallel benefit:** Engine team learns from web platform users while building

**Disadvantages:**
- Three announcements/launches instead of one
- Requires strong product messaging (baseline → adaptive progression)
- Engineering discipline needed (Phase 2 must not break Phase 1)
- Learners initially see "adaptive" as not yet available

**Best for:**
- Commercial viability first
- Risk-conscious teams
- Organizations needing early revenue
- Sustainable development pace
- Strong market for baseline training alone

---

## Decision Matrix

| Factor | Option 1: Web First | Option 2: Engine First | Option 3: Parallel | Option 4: MVP + Phased |
|--------|---|---|---|---|
| **Time to first launch** | 4 weeks | 12 weeks | 13 weeks | 3 weeks |
| **Time to full system** | 17 weeks | 16 weeks | 13 weeks | 16 weeks |
| **Revenue generation** | Immediate (week 4) | Delayed (week 12) | Delayed (week 13) | Immediate (week 3) |
| **Resource requirement** | Medium | High | Very High | Medium (phased) |
| **Risk** | Medium | High | Very High | Low |
| **Product completeness at launch** | Incomplete | Complete | Complete | Baseline only |
| **Market validation** | Early (week 4) | None (week 12) | None (week 13) | Early (week 3) |
| **M-AI differentiation** | Delayed | Immediate | Immediate | Phased (week 16) |
| **Perceived quality** | "Feature incomplete" | "Full system" | "Full system" | "Growing product" |
| **Best for** | Revenue focus | Tech-first | Resourced teams | Smart sequencing |

---

## Recommendation

**Option 4: Phased MVP (Recommended)**

**Rationale:**

1. **Fastest commercial validation** (3 weeks to real users)
2. **Lowest risk** (validate platform before investing in complex engine)
3. **Sustainable pace** (not crashing to deliver everything at once)
4. **Revenue-funded development** (week 3–16 revenue pays for engine development)
5. **Real-world feedback** (learner data informs engine design)
6. **Two-wave marketing** (launch + "new features" announcement)
7. **Proves M-AI Kernel against real data** (engine learns from actual usage patterns)
8. **Scalable architecture** (Phase 1 platform can handle Phase 2 load)

**Sequence:**

```
PHASE 1 (Weeks 1-3): MVP Launch
├── Finish Next.js app (assessments, certificates, dashboard)
├── Test locally, fix bugs
├── Deploy to Railway/production
├── Open registration
├── Announce: "Baseline Human Factors Training Platform Now Live"
└── Revenue flows in

PHASE 2 (Weeks 4-15): Desktop Engine Development (parallel to Phase 1)
├── Build M-AI Kernel (weeks 4-9)
├── Build folder monitoring (weeks 6-10)
├── Build governance workflow (weeks 8-12)
├── Local testing on Windows + macOS (weeks 10-14)
├── Security/privacy audit (week 14)
└── Ready for integration (week 15)

PHASE 3 (Week 16): Integration
├── Connect desktop engine to web platform
├── Test recommendation → assignment → completion flow
├── Validate traceability
├── Deploy updated platform
└── Announce: "Adaptive Training Engine Now Available"
```

---

## Final Decision

**Choose one:**

**A) Option 1 (Web First)** — Prioritize rapid commercial launch, accept two-phase product perception  
**B) Option 2 (Engine First)** — Prioritize complete product, accept 12-week wait  
**C) Option 3 (Parallel)** — Maximize resources, minimize timeline, accept coordination complexity  
**D) Option 4 (MVP + Phased)** — Balance speed, risk, and resources (RECOMMENDED)  

---

**Once decision is made, I will immediately:**
1. Create Phase 1 specification documents (12 files)
2. Prioritize development roadmap
3. Define acceptance criteria per phase
4. Begin Phase 2 skeleton application
5. Schedule integration points

**What's your call?**
