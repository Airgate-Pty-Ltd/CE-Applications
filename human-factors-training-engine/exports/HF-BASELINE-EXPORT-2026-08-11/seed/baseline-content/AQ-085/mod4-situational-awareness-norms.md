---
atomTitle: "Shared Situational Awareness, Norms, and Violations"
sourceCourse: "AQ-085"
sourceFile: "E:\Conform-Edge\ClaudeCowork\02 Active Projects\Teachable\Teachable Lessons\11 - Safety Academy (SMS)\AQ-085 - Maintenance Resource Management MRM\AQ-085_Module-Content.md"
sourceSection: "Module 4 — Shared Situational Awareness, Norms, and Violations"
gmItems: ["6.3"]
spineTopicCodes: ["SP-09"]
---

# Module 4 — Shared Situational Awareness, Norms, and Violations

> **Module goal**
>
> Teach two intertwined ideas: keeping a shared, accurate picture of the work across distributed and shift-based teams, and the slow drift into local norms and violations — "the way we do it here." The learner leaves able to recognise eroded situational awareness and the normalisation of a shortcut, and to explain why both are error chains forming.

## Lesson 4.1 — Shared Situational Awareness Across Distributed Teams

### Learning objectives
*After this lesson the learner can:*
- Define situational awareness and "shared" situational awareness in a maintenance team.
- Explain why distributed, multi-trade, multi-shift work erodes the shared picture.
- Describe practical ways to rebuild and maintain a shared picture (briefings, status boards, configuration control).

### Competency & Bloom
| Competency | Learning outcome | Bloom's level |
| --- | --- | --- |
| Situational awareness | Maintain a shared picture across a distributed team | Understand / Apply |

### The teach-out

Let me define the term, because it's central to the rest of the course. **Situational awareness** is simply *knowing what's actually going on* — an accurate, current picture of the state of the work, the aircraft, and the team. **Shared** situational awareness is when *everyone working the job holds the same accurate picture.* And the failure we're hunting is the moment when people *think* they share a picture but actually hold different ones — because that gap, the difference between two people's mental models, is where the assumption-driven error chain begins.

*Why is shared awareness so hard to maintain in maintenance specifically?* Because the maintenance environment is almost perfectly designed to fracture it. The work is **distributed across trades** — avionics, structures, engines all on the same aircraft, each team seeing its own slice and not the others'. It's **distributed across shifts** — the picture has to survive being torn down and rebuilt every twelve hours. And it's **distributed across space and time** — people aren't shoulder to shoulder watching the same thing happen the way a flight crew is. A flight crew shares awareness almost for free because they're in the same small space seeing the same instruments. A maintenance team has to **manufacture** shared awareness deliberately, because nothing about the environment grants it.

Here's the dangerous failure mode to watch for: **the configuration mismatch.** One trade has a panel open and a system depressurised for their work. Another trade, who didn't get the picture, energises that system or starts a task that assumes it's buttoned up. Nobody was incompetent — they simply held different pictures of the aircraft's state. In a distributed team, "what state is this aircraft actually in right now?" is not a trivial question, and the moment two teams answer it differently, you have a hazard. That's why configuration control — knowing and communicating exactly what's open, removed, depressurised, de-energised, or safetied — is shared situational awareness made concrete.

> **STOP & THINK**
>
> A flight crew gets shared awareness nearly for free — same cockpit, same instruments, same moment. A maintenance team gets it *only if they build it.* So the question for your environment is blunt: **what, specifically, manufactures the shared picture here?** If the honest answer is "everyone just kind of knows," you don't have shared awareness — you have several private pictures that happen to overlap, until the day they don't.

So how do you build and hold the shared picture? Practical tools, none of them exotic. **Shift and task briefings** that state the current state of the work, not just the plan. **Status or configuration boards** that make the state *visible* — what's open, what's safetied, what each trade is doing — so it isn't trapped in individual heads. **Cross-trade coordination** before any action that changes the aircraft's state, so the team energising a system knows who has a panel open. And the structured **handover** from Module 3, which is shared situational awareness surviving a shift change. *How would you prove a team holds shared awareness?* The current configuration is visible and known to everyone, not just its owner; cross-trade work is coordinated before state changes; briefings communicate actual state; and you can walk up to any team member and get the same answer to "what state is this aircraft in?" *And if it fails?* Two teams act on two different pictures, and the mismatch becomes the event — someone working on a system another team thought was safe, or a step skipped because each trade assumed the other owned it.

### Industry example

At AeroMach, an avionics tech has a bay open and a bus de-energised for a check. On the other side of the aircraft, a structures tech — who never got that picture — is about to run a function test that would re-energise the bus with the avionics tech's hands inside it. The thing that saves them isn't luck; it's a **configuration board** Dana put at the aircraft that shows, in plain view, "AVIONICS BAY OPEN — BUS DE-ENERGISED — DO NOT POWER." The structures tech sees it, stops, finds the avionics tech, and they coordinate. One visible board turned two private pictures into one shared one. **In a distributed team, the shared picture doesn't maintain itself — you have to give it somewhere to live outside people's heads.**

### Reflection
> In your environment, how does one team find out what state another team has left the equipment in? Is there something that makes the configuration *visible*, or does it rely on people "just knowing"? Name one improvement.

### Knowledge Check — graded • 4 questions • 80% to pass

**Q1. Shared situational awareness means:**
- A) One person knows what's going on
- B) Everyone working the job holds the same accurate, current picture of the state of the work and the aircraft
- C) The plan is written down
- D) Each trade keeps its own picture private

> **Best answer: B** — Shared means the *same* accurate picture across the whole team, not several private ones.

**Q2. Shared awareness is harder in maintenance than on a flight deck because:**
- A) Maintenance technicians are less aware
- B) The work is distributed across trades, shifts, space and time, so the shared picture must be deliberately manufactured rather than gained for free
- C) Maintenance has no information to share
- D) It isn't harder

> **Best answer: B** — A flight crew shares a small space; a maintenance team has to build the shared picture against an environment that fractures it.

**Q3. A configuration mismatch is dangerous because:**
- A) It's a paperwork error only
- B) Two teams hold different pictures of the aircraft's state — e.g. one energises a system another team has open — and the gap becomes the hazard
- C) It never causes harm
- D) It only matters to management

> **Best answer: B** — Different pictures of "what state is this in right now" is exactly where the distributed-team error chain starts.

**Q4. A practical way to maintain shared situational awareness across a distributed team is:**
- A) Hope everyone just knows
- B) Make the configuration *visible* — status/config boards, cross-trade coordination before state changes, briefings on actual state, and structured handovers
- C) Keep each trade's status private
- D) Rely on memory across shifts

> **Best answer: B** — Give the shared picture somewhere to live outside individual heads.

## Lesson 4.2 — Norms and Violations: The Drift Into "The Way We Do It Here"

### Learning objectives
*After this lesson the learner can:*
- Distinguish a procedure from a "norm," and a violation from an error.
- Explain how shortcuts become local norms through repeated success (the "drift").
- Recognise and challenge a normalised violation, and explain why "it's always worked" is the most dangerous phrase in maintenance.

### Competency & Bloom
| Competency | Learning outcome | Bloom's level |
| --- | --- | --- |
| Norms & violations | Recognise and challenge normalised deviation | Understand / Apply |

### The teach-out

Let me draw two distinctions carefully, because the whole lesson depends on them. First, **error versus violation.** An **error** is a mistake — you meant to do it right and didn't. A **violation** is a *deliberate* deviation from the procedure — you knew the rule and chose a different way. Most violations aren't malicious; they're well-intentioned shortcuts by people trying to get the job done faster or easier. But intent doesn't change the danger. Second distinction: a **procedure** is the documented, approved way; a **norm** is "the way we actually do it around here" — which may or may not match the procedure. When the norm quietly drifts away from the procedure, you have a normalised violation, and that's the quiet killer this lesson is about.

*Why does it exist as a focus?* Because of a trap built into how humans learn from success. Here's the mechanism — watch it carefully. Someone takes a shortcut: skips a step, uses the wrong-but-handier tool, signs off without the independent check because they're sure it's fine. **And nothing bad happens.** The aircraft flies. So the shortcut got *rewarded* — it saved time and produced no visible harm. Do it again, same result. Again. Now a few people do it. Now it's "how we do it on nights." Now it's faster, and the person who insists on the full procedure looks slow and fussy. The shortcut has become the **norm** — not through a decision anyone made, but through repeated success quietly teaching everyone that the safety step was unnecessary. That's **the drift,** and it's terrifying precisely because *it feels like experience.* "We've done it this way for years and never had a problem" sounds like wisdom. It's actually the sound of a violation that hasn't been caught *yet.*

> **STOP & THINK**
>
> The most dangerous sentence in a maintenance shop is **"that's just how we do it here."** Train your ear for it. It can describe a genuinely smart local practice — or it can describe a normalised violation that's one bad day from an event. The test isn't whether it's worked so far; *of course* it's worked so far, that's exactly why it survived to become a norm. The test is: **does it match the approved procedure, and if not, who decided that — and on what basis?** "It's always worked" is not a safety case. It's survivorship.

Now connect this back to the whole course, because norms are where several threads tie together. A shortcut at the handover becomes a norm ("we just do a quick verbal, it's always been fine"). Skipping the independent check becomes a norm ("Sol's work doesn't need a second look"). Not marking the interrupted-task stop-point becomes a norm ("we all just remember"). Each one drifted in the same way: a safety defence got quietly traded away for speed, the trade kept paying off, and the defence is now gone — silently — from a system that still *thinks* it has it. That's the chilling part: a normalised violation removes a defence **without anyone noticing the defence is gone,** so the organisation believes it's protected right up until the chain completes.

*How do you fight the drift?* You make the gap between norm and procedure **visible and discussable.** Audit the process, not the person: when you find a norm that's drifted, the question is never "who's the rule-breaker" — it's "why did the safe way become the slow way here, and how do we make the right way the easy way?" Because the deeper truth is that drift is usually a signal: if everyone's quietly working around a procedure, the procedure is often badly designed, the workload is too high, or the tooling is wrong. *How would you prove a healthy state?* Local norms are periodically checked against the approved procedures; deviations are raised without blame and either corrected or the procedure formally improved; and "we've always done it this way" is treated as a prompt to investigate, not a justification to accept. *And if it fails?* The drift continues invisibly until the day the conditions that made the shortcut "safe" don't hold — and the missing defence isn't there to catch it.

### Industry example

On AeroMach's night shift, a habit had grown up around the duplicate inspection on a routine critical task: because it was Sol doing the work, and Sol never got it wrong, the night crew had quietly stopped performing the independent second check on his jobs. It saved a few minutes a night and *had never once caused a problem* — which is exactly why nobody questioned it. It wasn't a decision; it was a drift. Dana finds it during a process review and resists the easy move of disciplining anyone — because **the violation wasn't really about Sol, it was about a defence that the system had quietly deleted.** The fix isn't punishment; it's restoring the duplicate check as non-negotiable *regardless of who did the work,* and asking the harder question: why did a mandatory safety step feel skippable here? The answer — time pressure plus a culture of deferring to a respected veteran — is the real finding. **The independent check exists precisely so that the system never has to rely on any one person being perfect. The norm had traded that away without realising it.**

### Reflection
> Name one "that's just how we do it here" practice in your own area. Be honest: does it match the approved procedure? If not, who decided — and is the procedure wrong, or is the norm a drift that's quietly removed a defence?

### Knowledge Check — graded • 4 questions • 80% to pass

**Q1. The difference between an error and a violation is:**
- A) There is no difference
- B) An error is an unintended mistake; a violation is a deliberate deviation from the procedure — usually a well-intentioned shortcut, but dangerous regardless of intent
- C) A violation is always malicious
- D) An error is always worse

> **Best answer: B** — Error = meant to be right, wasn't. Violation = knew the rule, chose otherwise. Intent doesn't reduce the danger.

**Q2. A shortcut becomes a local "norm" through:**
- A) A formal management decision
- B) Repeated success — it saves time and produces no visible harm, so it gets quietly rewarded and spreads until it's "how we do it here"
- C) Regulatory approval
- D) Random chance

> **Best answer: B** — Drift is learned from success. That's why "it's always worked" feels like experience but is really survivorship.

**Q3. Why is "we've always done it this way and never had a problem" so dangerous?**
- A) It proves the practice is safe
- B) Of course it's worked so far — that's exactly why the violation survived to become a norm; "it's always worked" is survivorship, not a safety case
- C) It's a regulatory requirement
- D) It never appears in real shops

> **Best answer: B** — Past success is precisely how a violation normalises. The test is whether it matches the approved procedure and who decided.

**Q4. The right response to discovering a normalised violation is to:**
- A) Find and punish the rule-breaker
- B) Audit the process — restore the missing defence and ask why the safe way became the slow way (often the procedure, workload, or tooling is the real issue)
- C) Ignore it since nothing's gone wrong
- D) Make it the official procedure because it's faster

> **Best answer: B** — Drift is usually a signal about the system. Fix the system, restore the defence — don't just blame the person.
