---
atomTitle: "Designing the Error Out, and the Limits of Catching It"
sourceCourse: "AQ-050"
sourceFile: "E:\Conform-Edge\ClaudeCowork\02 Active Projects\Teachable\Teachable Lessons\HF-TRAINING-COMPLETE-2026-07-21\04-AQ-050-HF-Quality\05 - Instructor Materials\AQ-050_Module-Content.md"
sourceSection: "Section 3 — Designing the Error Out, and the Limits of Catching It"
gmItems: ["3.6", "6.1"]
spineTopicCodes: ["SP-07", "SP-09"]
---

# Section 3 — Designing the Error Out, and the Limits of Catching It

> **Section goal**
>
> Deliver the heart of the course: the hierarchy of defences that actually prevents error — mistake-proofing first — plus the honest truth about inspection so the learner never again treats "100% inspection" as a real fix.

## Lesson 3.1 — Mistake-Proofing (Poka-Yoke) and Designing Work to Prevent Error

### Learning objectives
*After this lesson the learner can:*
- Explain the hierarchy of error controls and why "design out" beats "be careful."
- Define mistake-proofing (poka-yoke) and give prevention vs detection examples.
- Use visual standards, checklists, good work instructions, and ergonomics as error controls.

### Competency & Bloom
| Competency | Learning outcome | Bloom's level |
| --- | --- | --- |
| Error prevention by design | Select and apply controls that prevent error at the source | Apply |

### The teach-out

Everything so far has been building to this. We've established that error is normal, that it comes from limits and conditions, and that "be more careful" answers none of it. So what *does* answer it? A hierarchy of defences — and the higher you go, the more reliable the control, because the less it depends on a human getting it right every single time.

Let me give you the hierarchy, strongest first. This ordering is the most important single idea in the course:

1. **Eliminate the error possibility** — change the design so the error *can't* be made. The strongest control there is. If the part can only physically go in one way, "installed backwards" is no longer possible. You didn't reduce the error; you *deleted* it.
2. **Mistake-proof / make the error obvious** — if you can't eliminate it, make the wrong action physically hard, or make a missed/wrong step impossible to overlook.
3. **Guide and standardize** — visual standards, good work instructions, and checklists that make the right way the easy, obvious way.
4. **Warn** — alarms, flags, labels. Useful, but they depend on a human noticing and responding, so they're weaker.
5. **Procedures and training alone** — necessary, but the *weakest* defence on their own, because they rely entirely on a limited human performing perfectly every time. This is the tier "retrain the operator" lives in — which is exactly why it's the weakest fix.

Now the headline of the hierarchy, by name. **Mistake-proofing — poka-yoke** — means building the work so the error is either impossible to make or impossible to miss. Two flavours:
- **Prevention** (the stronger): the error physically can't happen. A connector keyed so it only mates one way. A fixture that won't close on a part loaded backwards. A bin that only dispenses the correct part for that step. A weight check that won't let the box advance if a component is missing.
- **Detection** (still strong): the error can happen, but it's caught instantly and unmistakably at the point it occurs — a sensor that stops the line if a step is skipped, a count that won't let you proceed until it matches.

The beauty of prevention-type poka-yoke is that it doesn't care how tired, rushed, distracted, or experienced the operator is. **It removes the dependence on perfect human performance** — which, after Sections 1 and 2, you know is the one thing you can never rely on.

The supporting controls in tier three matter too, and they're where most quality teams can act fastest:
- **Clear visual standards** — a boundary sample, a colour-coded layout, a photo of "good vs bad" at the station. Make *correct* visible at a glance so the look-alike error gets harder.
- **Checklists** — the direct countermeasure to lapses. A checklist externalizes the fragile working memory; the step can't be silently skipped because it's sitting there unticked. (The discipline of a *good* checklist — short, critical-items-only, hard to pencil-whip — is a craft worth respecting.)
- **Good work instructions** — current, controlled, followable *at the required pace*, matching the drawing. A bad instruction manufactures mistakes; a good one prevents them. This is one of the highest-leverage, lowest-cost error controls a quality team owns.
- **Ergonomics and workplace design** — separate and clearly differentiate look-alike parts; place controls where they won't be hit by accident; fix the awkward reach, the bad lighting on the fine inspection, the cluttered bench. You're not making people comfortable for its own sake; you're removing the conditions that hand them errors.

> **STOP & THINK**
>
> Run any proposed corrective action up the hierarchy and ask: *"How high can I get?"* If the proposed fix is "retrain and remind" (tier 5), push: can I add a visual standard or checklist (tier 3)? Can I mistake-proof it (tier 2)? Can I eliminate it (tier 1)? **Audit the process, not the person — and then fix the process as high up the hierarchy as you can afford.** A corrective action that climbs the hierarchy actually stops the defect. One that stays at the bottom just schedules its return.

### Industry example

Back to the backward bracket from Section 0 — and now we close it for good. Priya's original fix was "retrain the operator" (tier 5, the weakest). Dana sent her up the hierarchy. Could they *eliminate* it (tier 1)? Yes — engineering added a small locating feature so the bracket now physically seats only one way; backward no longer fits. Total cost: a minor fixture change. Result: that specific defect has not recurred — not for that operator, not for any operator, not on overtime, not under pressure, *because it is no longer physically possible to make.* **That is what a real human-factors fix looks like: the defect didn't get managed, it got designed out of existence.** Priya finally got Dana's day-three point — they didn't fix the operator, they fixed the work, and the work now protects every operator who'll ever touch it.

### Reflection
> Take your recurring defect one more time. Sketch the strongest control you could put on it. How high up the hierarchy can you get — eliminate, mistake-proof, guide, warn? You'll do this for real in the practical.

### Knowledge Check — graded • 4 questions • 80% to pass

**Q1. In the hierarchy of error controls, the strongest control is to:**
- A) Retrain the operator
- B) Eliminate the error possibility by design (e.g., the part can only go in one way) so the error can't be made
- C) Add a warning label
- D) Remind people to be careful

> **Best answer: B** — Design out beats every human-dependent control. Delete the error, don't manage it.

**Q2. Prevention-type poka-yoke is powerful mainly because:**
- A) It's cheap to document
- B) It removes the dependence on perfect human performance — it works regardless of fatigue, pressure, or experience
- C) It replaces the operator
- D) It's required by standards

> **Best answer: B** — It doesn't care how tired or rushed the human is; the error simply can't happen.

**Q3. The most direct countermeasure to a lapse (a forgotten step) is:**
- A) Discipline
- B) A checklist that externalizes working memory so the step can't be silently skipped
- C) A motivational poster
- D) A faster line speed

> **Best answer: B** — A lapse is a memory failure; a checklist puts the memory outside the fragile human head.

**Q4. "Procedures and training alone" sit at the bottom of the hierarchy because:**
- A) They're never needed
- B) They rely entirely on a limited human performing perfectly every time — the one thing we can't rely on
- C) They're too expensive
- D) They're illegal

> **Best answer: B** — Necessary, but the weakest standalone defence. "Retrain the operator" lives here — which is why it's the weakest fix.

## Lesson 3.2 — Capturing Error: Why 100% Inspection Isn't 100% Effective

### Learning objectives
*After this lesson the learner can:*
- Explain why human inspection is inherently limited (it's typically far below 100% effective).
- State why prevention outranks detection, and where inspection still belongs.
- Identify the human-factors conditions that further degrade inspection.

### Competency & Bloom
| Competency | Learning outcome | Bloom's level |
| --- | --- | --- |
| Limits of detection | Explain inspection's limits and place it correctly in the defence hierarchy | Understand / Apply |

### The teach-out

Here's a sentence I've seen close more corrective actions than any other: *"We added 100% inspection."* It sounds airtight. It is not. And understanding *why* is one of the most important things a quality professional ever learns, because it's the difference between a control that works and a control that just *feels* like it works.

Let me state the uncomfortable fact plainly: **human visual inspection is not 100% effective — it never has been, and it isn't even close.** Run the same parts past careful inspectors and a meaningful fraction of real defects gets through every time. The exact number varies with the defect and the conditions, but the rule of thumb the industry lives by is sobering: a *single* manual inspection commonly misses a noticeable share of defects, and "100% inspection" routinely performs more like seventy or eighty percent effective in practice. **"100% inspected" describes how many parts were *looked at* — not how many defects were *found.*** Those are very different numbers, and confusing them is how bad parts ship from a process everyone believed was protected.

*Why* is human inspection so limited? Everything from Sections 1 and 2 lands right here:
- **Attention is narrow and vigilance decays.** Staring at a stream of mostly-good parts is the definition of a low-signal, monotonous task — exactly the condition where attention drifts and the rare defect gets a glance instead of a look.
- **The defect is rare.** When 999 of 1,000 parts are good, the brain *expects* good and pattern-matches toward "pass." The rarer the defect, the more it slips through — the inspector is, in effect, looking for something the task has trained them not to expect.
- **The performance-shaping factors pile on.** Time pressure, fatigue, poor lighting, an awkward viewing angle, an ambiguous accept/reject boundary — every factor from Section 2 degrades inspection just like it degrades any other human task. End of a double shift on a fast line under a "ship today" order? Inspection effectiveness drops further still.

So inspection isn't worthless — it's just *misranked* when people treat it as a primary fix. Put it where it belongs in the hierarchy: **detection is below prevention.** A defect you *prevented* never needs catching. A defect you're relying on inspection to *catch* will, statistically, sometimes get through. That's the whole reason this course spends a full lesson on *designing out* before it spends a lesson on *catching*: the order matters.

> **STOP & THINK**
>
> Two traps to retire for good. **Trap one:** "We'll just add 100% inspection." If the only fix is more human looking, you've chosen the weak end of the hierarchy and a control that's maybe 80% effective on a good day. **Trap two:** "100% inspected" on a traveller means the defect was caught. No — it means every part was *looked at.* If you want inspection to actually catch, you make it *easier* (better lighting, boundary samples, a manageable pace, reduced look-alikes) or you make it *non-human* (a gauge, a sensor, a vision system, a prevention-type poka-yoke that's effectively 100%). Better still: don't rely on the catch — climb back up to prevention.

Where *does* inspection earn its place? As a *layer*, not the whole defence — a backstop behind prevention, especially on critical characteristics, and a feedback source that tells you the prevention isn't holding. And when you do need a catch, prefer the kind that doesn't depend on human vigilance: an automated gauge or a mistake-proofing device beats a tired eye on a fast line every time. **Catch what you couldn't prevent — but never pretend the catch is as good as the prevention.**

### Industry example

After an escape reached the customer, Sam's proposed corrective action was the classic: "add a 100% final visual inspection." Dana asked the question that reframes everything: *"If our final inspection is, realistically, seventy to eighty percent effective on this defect, how many will still escape at our volumes?"* The math was ugly — at AeroMach's run rates, a 100% *visual* check would still leak defects to the customer steadily. So they re-ranked the fix: a simple go/no-go gauge at the operation that physically rejects the bad feature (detection-type poka-yoke, effectively 100% on that characteristic), *backed* by — not replaced by — a final check. **The "100% inspection" everyone reached for first would have failed quietly; the mistake-proofing device actually held.** Same defect, two controls, completely different outcomes — and the difference was knowing what human inspection can and can't do.

### Reflection
> Find one place in your work where "100% inspection" is the stated control. Honestly: is it catching every defect, or just looking at every part? What would move it toward a real catch — or better, toward prevention?

### Knowledge Check — graded • 4 questions • 80% to pass

**Q1. Human visual inspection is typically:**
- A) 100% effective if the inspector is trained
- B) Well below 100% effective — a single manual inspection commonly misses a meaningful share of defects (often performing ~70–80% in practice)
- C) Effective only for new inspectors
- D) Perfect under time pressure

> **Best answer: B** — Inspection has never been 100% effective. "100% inspected" ≠ "100% of defects found."

**Q2. "100% inspected" on a traveller actually tells you:**
- A) Every defect was found
- B) Every part was looked at — which is not the same as every defect being caught
- C) The process is mistake-proofed
- D) No defects exist

> **Best answer: B** — It's a count of parts viewed, not defects caught. Confusing the two is how bad parts escape.

**Q3. Inspection effectiveness is degraded by all of these EXCEPT:**
- A) Rare defects (the brain expects "good")
- B) Vigilance decay on a monotonous stream of good parts
- C) Fatigue, time pressure, poor lighting
- D) A well-lit station with a clear boundary sample and manageable pace

> **Best answer: D** — Good conditions *help* inspection; the other three degrade it. The performance-shaping factors apply to inspection too.

**Q4. In the defence hierarchy, detection (catching) sits below prevention because:**
- A) Detection is illegal
- B) A defect you prevented never needs catching; a defect you rely on inspection to catch will sometimes get through
- C) Prevention is cheaper to document
- D) They're equally effective

> **Best answer: B** — Prevent first; catch only what you couldn't prevent, preferably with a non-human catch.
