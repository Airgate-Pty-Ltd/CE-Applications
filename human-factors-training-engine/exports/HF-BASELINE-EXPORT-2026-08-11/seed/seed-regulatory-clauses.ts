/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

/**
 * Regulatory baseline training (D-058, folded into the PolicyPack/Requirement-Spine
 * architecture by D-060 - see DECISIONS.md for both entries in full). Seeds three layers:
 *
 *   1. RequirementSpineTopic  - 14 regulator-neutral topics (SP-01..SP-14), verbatim from the
 *      owner-approved docs/02-controlled/HF-ENGINE-REQUIREMENT-SPINE-SPEC.md (2026-08-06).
 *   2. PolicyPack + PolicyPackClause - a GM1 145.A.30(e) pack (66 clauses, one per syllabus
 *      leaf item), created UNAPPROVED (approvedBy/approvedAt left null) - matches the CAAC
 *      pack's own "Drafted by Claude... approved by owner" two-step precedent.
 *   3. ClauseTopicMap - my own draft coverage judgment mapping every GM1 clause to one or more
 *      spine topics (FULL/PARTIAL). Real seeded data so the traceability matrix has something
 *      to show, but this is a DRAFT judgment pending owner review, same as (2) - see D-060.
 *
 * Regulatory sourcing (carried forward verbatim from D-058, which this seed supersedes as the
 * data mechanism - the research itself does not become stale just because the table shape
 * changed):
 *
 * CITATION CORRECTION: the syllabus topic enumeration below is published under GM1 145.A.30(e)
 * ("Guidance Material"), NOT AMC1 145.A.30(e) ("Acceptable Means of Compliance") - verified
 * against the UK CAA's mirror of the EASA AMC & GM to Part-145 (the primary EASA PDF is
 * scanned/encoded and could not be text-extracted) and cross-checked against five independent
 * EASA-approved training-provider course descriptions, all citing the same provision.
 * AMC1/AMC3/AMC4 145.A.30(e) are distinct, adjacent provisions (fuel-tank-safety training,
 * personnel-requirement specifics) - not the syllabus source.
 *
 * 14 CFR 145.163 (FAA) cross-reference: the regulatory text does not mention "human factors" at
 * all and prescribes no topic list; FAA guidance AC 145-10 explicitly declines to prescribe HF
 * elements ("the FAA will not prescribe what human factors elements to include"). There is no
 * competing FAA-specific HF topic taxonomy to reconcile against GM1 145.A.30(e) - this baseline
 * is EASA-sourced by the owner's own instruction, informative (not independently mandated) on
 * the FAA side.
 *
 * 24-month recurrence interval: flagged as GM/industry guidance, not confirmed as a
 * 145.A.30(e)-specific regulatory mandate (one source attributes a closely-matching interval to
 * AMC 145.A.35(d) instead, a different provision). Kept configurable (PolicyPack.recurrenceMonths),
 * not asserted as settled regulation. Independently corroborated by the already-approved CAAC
 * CCAR-145 R4 pack, which also uses 24 months (docs/02-controlled/HF-ENGINE-POLICY-PACK-
 * CAAC-CCAR145-R4-Rev-A.md §3).
 *
 * The regulation's own text permits an organisation to "combine, divide, or change the order of
 * any of the subjects... as long as all the subjects are covered" - one clause per leaf item,
 * below, is this build's design choice, not a regulatory mandate.
 *
 * Run with: npm run db:seed:regulatory-clauses
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GM1_FRAMEWORK = 'GM1 145.A.30(e)';
const SPINE_REVISION = 1;

// ============================================================================
// 1. Requirement Spine topics (SP-01..SP-14), verbatim from the owner-approved spec.
// ============================================================================
interface SpineTopicSeed {
  code: string;
  title: string;
  intent: string;
}

const SPINE_TOPICS: SpineTopicSeed[] = [
  { code: 'SP-01', title: 'HF-Definition', intent: 'HF/human performance is a defined, scoped concept in the management system' },
  { code: 'SP-02', title: 'Initial-HF-Training', intent: 'Personnel receive foundational HF training before/upon entering duties' },
  { code: 'SP-03', title: 'Training-Scope-Breadth', intent: 'All relevant personnel categories are in HF-training scope, not only certifying staff' },
  { code: 'SP-04', title: 'Recurrent-Training', intent: 'HF training recurs - periodic and/or trigger-based (regulatory change, procedure change, events)' },
  { code: 'SP-05', title: 'Fatigue-Management', intent: 'Fatigue as an error condition; organizational controls on working time/alertness' },
  { code: 'SP-06', title: 'Substance-Awareness', intent: 'Psychoactive substance risk, including medication scope where applicable' },
  { code: 'SP-07', title: 'Error-Models', intent: 'Human error models and error-producing conditions (e.g., Dirty Dozen, active/latent)' },
  { code: 'SP-08', title: 'Communication-Handover', intent: 'Communication failure modes; shift/task handover discipline' },
  { code: 'SP-09', title: 'Procedural-Documentation-Discipline', intent: 'Procedure compliance, documentation validity, data-control interfaces with HF' },
  { code: 'SP-10', title: 'Organizational-Influences', intent: 'Organizational/latent conditions, supervision, workload allocation, culture' },
  { code: 'SP-11', title: 'Just-Culture-Reporting', intent: 'Reporting culture, just culture, non-punitive reporting expectations' },
  { code: 'SP-12', title: 'Effectiveness-Verification', intent: 'Training effectiveness is verified beyond completion' },
  { code: 'SP-13', title: 'Competence-Records', intent: 'Training/competence records exist, are controlled and retrievable' },
  { code: 'SP-14', title: 'SMS-Interface', intent: 'HF program interfaces with the safety/quality management system' },
  // D-061 (owner decision, 2026-08-08): added to close a genuine spine granularity gap flagged
  // in D-060 - several Section 4/5 items (vision, hearing, noise, illumination, climate,
  // motion/vibration) only reached a broad PARTIAL fit under SP-07 Error-Models. Additive only,
  // spineRevision unchanged - no existing SP-01..14 title/intent was redefined.
  { code: 'SP-15', title: 'Physical-Environment-Performance-Limitations', intent: 'Physical/sensory environment and performance limitations (vision, hearing, noise, illumination, climate, motion/vibration)' },
];

// ============================================================================
// 2. GM1 145.A.30(e) clauses (66 leaf items, 10 sections).
// ============================================================================
interface ClauseSeed {
  section: string;
  sectionLabel: string;
  itemNumber: string;
  itemLabel: string;
  intentSummary: string; // paraphrased, never verbatim regulatory text
}

const CLAUSES: ClauseSeed[] = [
  // 1. General/Introduction to Safety Management and Human Factors
  { section: '1', sectionLabel: 'General/Introduction to Safety Management and Human Factors', itemNumber: '1.1', itemLabel: 'Need to address safety management and human factors', intentSummary: 'Why maintenance organisations formally manage safety and human factors, rather than treating them as incidental.' },
  { section: '1', sectionLabel: 'General/Introduction to Safety Management and Human Factors', itemNumber: '1.2', itemLabel: 'Statistics', intentSummary: 'What industry accident/incident data shows about the role human factors play in maintenance-related events.' },
  { section: '1', sectionLabel: 'General/Introduction to Safety Management and Human Factors', itemNumber: '1.3', itemLabel: 'Incidents', intentSummary: 'How real maintenance incidents illustrate human factors principles in practice.' },
  { section: '1', sectionLabel: 'General/Introduction to Safety Management and Human Factors', itemNumber: '1a.1', itemLabel: 'Hazard identification', intentSummary: 'How to recognise conditions or practices with the potential to cause harm before they do.' },
  { section: '1', sectionLabel: 'General/Introduction to Safety Management and Human Factors', itemNumber: '1a.2', itemLabel: 'Safety risk assessment', intentSummary: 'How to judge the likelihood and severity of a hazard turning into an actual occurrence.' },
  { section: '1', sectionLabel: 'General/Introduction to Safety Management and Human Factors', itemNumber: '1a.3', itemLabel: 'Risk mitigation and management', intentSummary: 'How identified risks get reduced to an acceptable level and kept there.' },
  { section: '1', sectionLabel: 'General/Introduction to Safety Management and Human Factors', itemNumber: '1a.4', itemLabel: 'Effectiveness of safety risk management', intentSummary: 'How an organisation knows whether its risk controls are actually working, not just documented.' },

  // 2. Safety Culture/Organisational Factors
  { section: '2', sectionLabel: 'Safety Culture/Organisational Factors', itemNumber: '2.1', itemLabel: 'Justness/trust', intentSummary: 'Why staff need confidence that honest reporting will be treated fairly, not punitively.' },
  { section: '2', sectionLabel: 'Safety Culture/Organisational Factors', itemNumber: '2.2', itemLabel: 'Commitment to safety', intentSummary: 'How visible, genuine leadership commitment to safety shapes everyday behaviour on the floor.' },
  { section: '2', sectionLabel: 'Safety Culture/Organisational Factors', itemNumber: '2.3', itemLabel: 'Adaptability', intentSummary: 'How a safety culture adjusts to new risks, technologies, and ways of working over time.' },
  { section: '2', sectionLabel: 'Safety Culture/Organisational Factors', itemNumber: '2.4', itemLabel: 'Awareness', intentSummary: 'How staff and management stay attentive to safety-relevant conditions rather than becoming complacent.' },
  { section: '2', sectionLabel: 'Safety Culture/Organisational Factors', itemNumber: '2.5', itemLabel: 'Behaviour', intentSummary: 'How individual and group behaviour reflects (and shapes) the organisation\'s real safety culture.' },
  { section: '2', sectionLabel: 'Safety Culture/Organisational Factors', itemNumber: '2.6', itemLabel: 'Information', intentSummary: 'How safety-relevant information actually flows (or fails to flow) through the organisation.' },

  // 3. Human Error
  { section: '3', sectionLabel: 'Human Error', itemNumber: '3.1', itemLabel: 'Error models and theories', intentSummary: 'Established frameworks for understanding why human error happens, as a basis for prevention.' },
  { section: '3', sectionLabel: 'Human Error', itemNumber: '3.2', itemLabel: 'Types of errors in maintenance tasks', intentSummary: 'The recognisable categories of error that occur specifically during maintenance work.' },
  { section: '3', sectionLabel: 'Human Error', itemNumber: '3.3', itemLabel: 'Violations', intentSummary: 'The difference between an honest error and a deliberate departure from procedure, and why that distinction matters.' },
  { section: '3', sectionLabel: 'Human Error', itemNumber: '3.4', itemLabel: 'Implications of errors', intentSummary: 'What a single maintenance error can actually lead to downstream, including for airworthiness.' },
  { section: '3', sectionLabel: 'Human Error', itemNumber: '3.5', itemLabel: 'Avoiding and managing errors', intentSummary: 'Practical techniques for reducing error likelihood and catching errors that do occur.' },
  { section: '3', sectionLabel: 'Human Error', itemNumber: '3.6', itemLabel: 'Human reliability', intentSummary: 'Why humans are not uniformly reliable, and what affects the odds of a task being done correctly.' },

  // 4. Human Performance & Limitations
  { section: '4', sectionLabel: 'Human Performance & Limitations', itemNumber: '4.1', itemLabel: 'Vision', intentSummary: 'How the limits of human eyesight affect inspection and detection tasks.' },
  { section: '4', sectionLabel: 'Human Performance & Limitations', itemNumber: '4.2', itemLabel: 'Hearing', intentSummary: 'How hearing limitations and workplace noise affect communication and awareness.' },
  { section: '4', sectionLabel: 'Human Performance & Limitations', itemNumber: '4.3', itemLabel: 'Information-processing', intentSummary: 'How people take in, interpret, and act on information, and where that process can break down.' },
  { section: '4', sectionLabel: 'Human Performance & Limitations', itemNumber: '4.4', itemLabel: 'Attention and perception', intentSummary: 'Why attention is a limited resource, and how perception can be misled.' },
  { section: '4', sectionLabel: 'Human Performance & Limitations', itemNumber: '4.5', itemLabel: 'Situational awareness', intentSummary: 'How people build and lose an accurate picture of what is actually happening around them.' },
  { section: '4', sectionLabel: 'Human Performance & Limitations', itemNumber: '4.6', itemLabel: 'Memory', intentSummary: 'The limits of human memory and why relying on it alone is a known failure point.' },
  { section: '4', sectionLabel: 'Human Performance & Limitations', itemNumber: '4.7', itemLabel: 'Claustrophobia and physical access', intentSummary: 'How confined-space work and difficult physical access affect performance and safety.' },
  { section: '4', sectionLabel: 'Human Performance & Limitations', itemNumber: '4.8', itemLabel: 'Motivation', intentSummary: 'How motivation (or its absence) shapes the quality and care taken in maintenance work.' },
  { section: '4', sectionLabel: 'Human Performance & Limitations', itemNumber: '4.9', itemLabel: 'Fitness/Health', intentSummary: 'How general physical and mental fitness for duty affects task performance.' },
  { section: '4', sectionLabel: 'Human Performance & Limitations', itemNumber: '4.10', itemLabel: 'Stress', intentSummary: 'How stress, in useful and harmful amounts, changes how people perform maintenance tasks.' },
  { section: '4', sectionLabel: 'Human Performance & Limitations', itemNumber: '4.11', itemLabel: 'Workload management', intentSummary: 'How to recognise and manage workload so it does not overwhelm safe task performance.' },
  { section: '4', sectionLabel: 'Human Performance & Limitations', itemNumber: '4.12', itemLabel: 'Fatigue', intentSummary: 'How fatigue degrades performance and judgement, often without the person noticing.' },
  { section: '4', sectionLabel: 'Human Performance & Limitations', itemNumber: '4.13', itemLabel: 'Alcohol, medication, drugs', intentSummary: 'How alcohol, medication, and drugs (prescribed or otherwise) impair safe task performance.' },
  { section: '4', sectionLabel: 'Human Performance & Limitations', itemNumber: '4.14', itemLabel: 'Physical work', intentSummary: 'How physically demanding maintenance tasks affect fatigue and injury risk.' },
  { section: '4', sectionLabel: 'Human Performance & Limitations', itemNumber: '4.15', itemLabel: 'Repetitive tasks/complacency', intentSummary: 'How doing the same task repeatedly can lead to complacency and missed steps.' },

  // 5. Environment
  { section: '5', sectionLabel: 'Environment', itemNumber: '5.1', itemLabel: 'Peer pressure', intentSummary: 'How pressure from colleagues can push someone toward an unsafe shortcut.' },
  { section: '5', sectionLabel: 'Environment', itemNumber: '5.2', itemLabel: 'Stressors', intentSummary: 'The range of workplace conditions that add stress on top of the task itself.' },
  { section: '5', sectionLabel: 'Environment', itemNumber: '5.3', itemLabel: 'Time pressure and deadlines', intentSummary: 'How schedule pressure can erode safe practice if not actively managed.' },
  { section: '5', sectionLabel: 'Environment', itemNumber: '5.4', itemLabel: 'Workload', intentSummary: 'How the volume and pacing of assigned work affects the environment a task is performed in.' },
  { section: '5', sectionLabel: 'Environment', itemNumber: '5.5', itemLabel: 'Shift work', intentSummary: 'How shift patterns, especially night and rotating shifts, affect alertness and performance.' },
  { section: '5', sectionLabel: 'Environment', itemNumber: '5.6', itemLabel: 'Noise and fumes', intentSummary: 'How noise and airborne contaminants in the workplace affect concentration and communication.' },
  { section: '5', sectionLabel: 'Environment', itemNumber: '5.7', itemLabel: 'Illumination', intentSummary: 'How inadequate lighting affects inspection quality and error rates.' },
  { section: '5', sectionLabel: 'Environment', itemNumber: '5.8', itemLabel: 'Climate and temperature', intentSummary: 'How extremes of heat or cold affect physical and mental performance.' },
  { section: '5', sectionLabel: 'Environment', itemNumber: '5.9', itemLabel: 'Motion and vibration', intentSummary: 'How vibration and motion in the work environment affect precision tasks and comfort.' },
  { section: '5', sectionLabel: 'Environment', itemNumber: '5.10', itemLabel: 'Complex systems', intentSummary: 'How the complexity of modern aircraft systems raises the stakes of a maintenance error.' },
  { section: '5', sectionLabel: 'Environment', itemNumber: '5.11', itemLabel: 'Other hazards in the workplace', intentSummary: 'Other physical workplace hazards not already covered elsewhere in the syllabus.' },
  { section: '5', sectionLabel: 'Environment', itemNumber: '5.12', itemLabel: 'Lack of manpower', intentSummary: 'How being short-staffed changes workload, pace, and error risk for those on shift.' },
  { section: '5', sectionLabel: 'Environment', itemNumber: '5.13', itemLabel: 'Distractions and interruptions', intentSummary: 'How interruptions during a task create a well-known, specific error risk (losing your place).' },

  // 6. Procedures, Information, Tools and Practices
  { section: '6', sectionLabel: 'Procedures, Information, Tools and Practices', itemNumber: '6.1', itemLabel: 'Visual inspection', intentSummary: 'The known limitations of visual inspection as a detection method, and how to compensate for them.' },
  { section: '6', sectionLabel: 'Procedures, Information, Tools and Practices', itemNumber: '6.2', itemLabel: 'Work logging and recording', intentSummary: 'Why accurate, timely recording of work performed matters beyond paperwork compliance.' },
  { section: '6', sectionLabel: 'Procedures, Information, Tools and Practices', itemNumber: '6.3', itemLabel: 'Procedure - practice/mismatch/norms', intentSummary: 'What happens when written procedure and actual shop-floor practice drift apart, and why that gap is a real risk.' },
  { section: '6', sectionLabel: 'Procedures, Information, Tools and Practices', itemNumber: '6.4', itemLabel: 'Technical documentation - access and quality', intentSummary: 'How the availability and quality of technical documentation affects the ability to work safely.' },
  { section: '6', sectionLabel: 'Procedures, Information, Tools and Practices', itemNumber: '6.5', itemLabel: 'Critical maintenance tasks and error-capturing methods', intentSummary: 'Why certain tasks are treated as critical, and the specific error-capture methods (e.g. independent inspection) used for them.' },

  // 7. Communication
  { section: '7', sectionLabel: 'Communication', itemNumber: '7.1', itemLabel: 'Shift/task handover', intentSummary: 'Why incomplete handover between shifts or individuals is a recurring root cause of maintenance error.' },
  { section: '7', sectionLabel: 'Communication', itemNumber: '7.2', itemLabel: 'Dissemination of information', intentSummary: 'How safety-relevant information reaches (or fails to reach) everyone who needs it.' },
  { section: '7', sectionLabel: 'Communication', itemNumber: '7.3', itemLabel: 'Cultural differences', intentSummary: 'How differences in language and cultural background can affect communication clarity in a diverse workforce.' },

  // 8. Teamwork
  { section: '8', sectionLabel: 'Teamwork', itemNumber: '8.1', itemLabel: 'Responsibility', intentSummary: 'How individual and shared responsibility for a task should be understood and assigned.' },
  { section: '8', sectionLabel: 'Teamwork', itemNumber: '8.2', itemLabel: 'Management, supervision and leadership', intentSummary: 'How effective supervision and leadership support (or undermine) safe task performance.' },
  { section: '8', sectionLabel: 'Teamwork', itemNumber: '8.3', itemLabel: 'Decision-making', intentSummary: 'How decisions get made under real maintenance conditions, individually and as a team.' },

  // 9. Professionalism and Integrity
  { section: '9', sectionLabel: 'Professionalism and Integrity', itemNumber: '9.1', itemLabel: 'Keeping up to date; currency', intentSummary: 'Why staying current on aircraft type, procedures, and regulation is a personal professional responsibility.' },
  { section: '9', sectionLabel: 'Professionalism and Integrity', itemNumber: '9.2', itemLabel: 'Avoiding error-provoking behaviour', intentSummary: 'Recognising and avoiding personal habits and shortcuts known to provoke error.' },
  { section: '9', sectionLabel: 'Professionalism and Integrity', itemNumber: '9.3', itemLabel: 'Assertiveness', intentSummary: 'Why speaking up about a safety concern, even to someone more senior, is expected professional behaviour.' },

  // 10. Organisation's Safety Programme
  { section: '10', sectionLabel: "Organisation's Safety Programme", itemNumber: '10.1', itemLabel: 'Safety policy and objectives, just culture principles', intentSummary: "The organisation's own stated safety policy, objectives, and its commitment to just culture." },
  { section: '10', sectionLabel: "Organisation's Safety Programme", itemNumber: '10.2', itemLabel: 'Reporting errors and hazards, internal safety reporting scheme', intentSummary: 'How and why to use the internal safety reporting scheme to report errors and hazards.' },
  { section: '10', sectionLabel: "Organisation's Safety Programme", itemNumber: '10.3', itemLabel: 'Error investigation process', intentSummary: 'How the organisation investigates reported errors, and what staff should expect from that process.' },
  { section: '10', sectionLabel: "Organisation's Safety Programme", itemNumber: '10.4', itemLabel: 'Action to address problems', intentSummary: 'How findings from investigations and reports translate into real corrective action.' },
  { section: '10', sectionLabel: "Organisation's Safety Programme", itemNumber: '10.5', itemLabel: 'Feedback and safety promotion', intentSummary: 'How the organisation closes the loop with staff on outcomes, and promotes safety awareness generally.' },
];

// ============================================================================
// 3. Clause -> spine-topic coverage judgment (D-060, DRAFT - pending owner review; amended D-061).
//
// Design notes (see D-060/D-061 for the full write-up):
// - Coverage is FULL or PARTIAL for every row below; none needed the null-topicId "whole-clause
//   DELTA" marker (unlike CAAC's numeric working-hour limits, GM1's items all have a defensible
//   spine-topic home, even if only a broad one).
// - SP-02/SP-03/SP-04 (Initial-HF-Training, Training-Scope-Breadth, Recurrent-Training) are
//   PROGRAM-STRUCTURE topics the pack as a whole satisfies (via PolicyPack.recurrenceMonths and
//   mandatory-audience fields), not syllabus-content topics - no GM1 leaf item maps to them
//   directly, and that is a correct, not a missing, result.
// - D-061: items 4.1, 4.2, 5.6, 5.7, 5.8, 5.9 (vision, hearing, noise/fumes, illumination,
//   climate/temperature, motion/vibration) moved from their D-060 broad-PARTIAL SP-07 fit to the
//   new dedicated SP-15 (owner decision). The rest of Section 5 (5.1-5.5, 5.10-5.13) already had
//   a correct, non-broad home (SP-05/SP-09/SP-10/SP-14, or a genuinely strong SP-07 fit for 5.13
//   distractions/interruptions - a canonical Dirty-Dozen error-model item, not a physical-
//   environment one) and was deliberately left unmoved - see D-061 for the reasoning boundary.
// - Item 6.5 gets two rows (dual relevance to error-capture methods and procedural discipline),
//   mirroring how the CAAC pack's own §7 table cites multiple topics for some clauses.
// ============================================================================
type Coverage = 'FULL' | 'PARTIAL';
interface TopicMapSeed {
  itemNumber: string;
  topics: { code: string; coverage: Coverage }[];
}

const CLAUSE_TOPIC_MAP: TopicMapSeed[] = [
  { itemNumber: '1.1', topics: [{ code: 'SP-01', coverage: 'FULL' }] },
  { itemNumber: '1.2', topics: [{ code: 'SP-14', coverage: 'PARTIAL' }] },
  { itemNumber: '1.3', topics: [{ code: 'SP-14', coverage: 'PARTIAL' }] },
  { itemNumber: '1a.1', topics: [{ code: 'SP-14', coverage: 'FULL' }] },
  { itemNumber: '1a.2', topics: [{ code: 'SP-14', coverage: 'FULL' }] },
  { itemNumber: '1a.3', topics: [{ code: 'SP-14', coverage: 'FULL' }] },
  { itemNumber: '1a.4', topics: [{ code: 'SP-14', coverage: 'FULL' }] },

  { itemNumber: '2.1', topics: [{ code: 'SP-11', coverage: 'FULL' }] },
  { itemNumber: '2.2', topics: [{ code: 'SP-10', coverage: 'FULL' }] },
  { itemNumber: '2.3', topics: [{ code: 'SP-10', coverage: 'PARTIAL' }] },
  { itemNumber: '2.4', topics: [{ code: 'SP-10', coverage: 'PARTIAL' }] },
  { itemNumber: '2.5', topics: [{ code: 'SP-10', coverage: 'FULL' }] },
  { itemNumber: '2.6', topics: [{ code: 'SP-08', coverage: 'PARTIAL' }] },

  { itemNumber: '3.1', topics: [{ code: 'SP-07', coverage: 'FULL' }] },
  { itemNumber: '3.2', topics: [{ code: 'SP-07', coverage: 'FULL' }] },
  { itemNumber: '3.3', topics: [{ code: 'SP-07', coverage: 'FULL' }] },
  { itemNumber: '3.4', topics: [{ code: 'SP-07', coverage: 'PARTIAL' }] },
  { itemNumber: '3.5', topics: [{ code: 'SP-07', coverage: 'FULL' }] },
  { itemNumber: '3.6', topics: [{ code: 'SP-07', coverage: 'PARTIAL' }] },

  { itemNumber: '4.1', topics: [{ code: 'SP-15', coverage: 'FULL' }] },
  { itemNumber: '4.2', topics: [{ code: 'SP-15', coverage: 'FULL' }] },
  { itemNumber: '4.3', topics: [{ code: 'SP-07', coverage: 'PARTIAL' }] },
  { itemNumber: '4.4', topics: [{ code: 'SP-07', coverage: 'PARTIAL' }] },
  { itemNumber: '4.5', topics: [{ code: 'SP-07', coverage: 'PARTIAL' }] },
  { itemNumber: '4.6', topics: [{ code: 'SP-07', coverage: 'PARTIAL' }] },
  { itemNumber: '4.7', topics: [{ code: 'SP-07', coverage: 'PARTIAL' }] },
  { itemNumber: '4.8', topics: [{ code: 'SP-10', coverage: 'PARTIAL' }] },
  { itemNumber: '4.9', topics: [{ code: 'SP-05', coverage: 'PARTIAL' }] },
  { itemNumber: '4.10', topics: [{ code: 'SP-05', coverage: 'FULL' }] },
  { itemNumber: '4.11', topics: [{ code: 'SP-05', coverage: 'FULL' }] },
  { itemNumber: '4.12', topics: [{ code: 'SP-05', coverage: 'FULL' }] },
  { itemNumber: '4.13', topics: [{ code: 'SP-06', coverage: 'FULL' }] },
  { itemNumber: '4.14', topics: [{ code: 'SP-05', coverage: 'PARTIAL' }] },
  { itemNumber: '4.15', topics: [{ code: 'SP-07', coverage: 'PARTIAL' }] },

  { itemNumber: '5.1', topics: [{ code: 'SP-10', coverage: 'PARTIAL' }] },
  { itemNumber: '5.2', topics: [{ code: 'SP-05', coverage: 'PARTIAL' }] },
  { itemNumber: '5.3', topics: [{ code: 'SP-10', coverage: 'PARTIAL' }] },
  { itemNumber: '5.4', topics: [{ code: 'SP-05', coverage: 'FULL' }] },
  { itemNumber: '5.5', topics: [{ code: 'SP-05', coverage: 'PARTIAL' }] },
  { itemNumber: '5.6', topics: [{ code: 'SP-15', coverage: 'FULL' }] },
  { itemNumber: '5.7', topics: [{ code: 'SP-15', coverage: 'FULL' }] },
  { itemNumber: '5.8', topics: [{ code: 'SP-15', coverage: 'FULL' }] },
  { itemNumber: '5.9', topics: [{ code: 'SP-15', coverage: 'FULL' }] },
  { itemNumber: '5.10', topics: [{ code: 'SP-09', coverage: 'PARTIAL' }] },
  { itemNumber: '5.11', topics: [{ code: 'SP-14', coverage: 'PARTIAL' }] },
  { itemNumber: '5.12', topics: [{ code: 'SP-10', coverage: 'PARTIAL' }] },
  { itemNumber: '5.13', topics: [{ code: 'SP-07', coverage: 'FULL' }] },

  { itemNumber: '6.1', topics: [{ code: 'SP-09', coverage: 'PARTIAL' }] },
  { itemNumber: '6.2', topics: [{ code: 'SP-09', coverage: 'FULL' }] },
  { itemNumber: '6.3', topics: [{ code: 'SP-09', coverage: 'FULL' }] },
  { itemNumber: '6.4', topics: [{ code: 'SP-09', coverage: 'FULL' }] },
  { itemNumber: '6.5', topics: [{ code: 'SP-07', coverage: 'PARTIAL' }, { code: 'SP-09', coverage: 'PARTIAL' }] },

  { itemNumber: '7.1', topics: [{ code: 'SP-08', coverage: 'FULL' }] },
  { itemNumber: '7.2', topics: [{ code: 'SP-08', coverage: 'FULL' }] },
  { itemNumber: '7.3', topics: [{ code: 'SP-08', coverage: 'PARTIAL' }] },

  { itemNumber: '8.1', topics: [{ code: 'SP-10', coverage: 'PARTIAL' }] },
  { itemNumber: '8.2', topics: [{ code: 'SP-10', coverage: 'FULL' }] },
  { itemNumber: '8.3', topics: [{ code: 'SP-07', coverage: 'PARTIAL' }] },

  { itemNumber: '9.1', topics: [{ code: 'SP-13', coverage: 'PARTIAL' }] },
  { itemNumber: '9.2', topics: [{ code: 'SP-07', coverage: 'FULL' }] },
  { itemNumber: '9.3', topics: [{ code: 'SP-08', coverage: 'FULL' }] },

  { itemNumber: '10.1', topics: [{ code: 'SP-11', coverage: 'FULL' }] },
  { itemNumber: '10.2', topics: [{ code: 'SP-11', coverage: 'FULL' }] },
  { itemNumber: '10.3', topics: [{ code: 'SP-11', coverage: 'FULL' }] },
  { itemNumber: '10.4', topics: [{ code: 'SP-12', coverage: 'PARTIAL' }] },
  { itemNumber: '10.5', topics: [{ code: 'SP-11', coverage: 'FULL' }] },
];

const SEED_ACTOR = 'system:seed-regulatory-clauses';

async function main() {
  // --- 1. Spine topics ---
  let topicsCreated = 0;
  let topicsUpdated = 0;
  const topicIdByCode = new Map<string, string>();
  for (const t of SPINE_TOPICS) {
    const existing = await prisma.requirementSpineTopic.findUnique({
      where: { code_spineRevision: { code: t.code, spineRevision: SPINE_REVISION } },
    });
    const row = await prisma.requirementSpineTopic.upsert({
      where: { code_spineRevision: { code: t.code, spineRevision: SPINE_REVISION } },
      update: { title: t.title, intent: t.intent },
      create: { code: t.code, title: t.title, intent: t.intent, spineRevision: SPINE_REVISION },
    });
    topicIdByCode.set(t.code, row.id);
    if (existing) topicsUpdated++; else topicsCreated++;
  }
  console.log(`RequirementSpineTopic seed: ${topicsCreated} created, ${topicsUpdated} updated, ${SPINE_TOPICS.length} total (revision ${SPINE_REVISION}).`);

  // --- 2. GM1 PolicyPack (unapproved - drafted, pending owner review) ---
  let pack = await prisma.policyPack.findFirst({
    where: { regulatoryFramework: GM1_FRAMEWORK, name: 'GM1 145.A.30(e) — EASA Human Factors Training Syllabus' },
  });
  let packCreated = false;
  if (!pack) {
    pack = await prisma.policyPack.create({
      data: {
        name: 'GM1 145.A.30(e) — EASA Human Factors Training Syllabus',
        regulatoryFramework: GM1_FRAMEWORK,
        regulatoryReference: 'GM1 145.A.30(e) (EASA AMC & GM to Part-145) — see DECISIONS.md D-058/D-060 for citation verification',
        recurrenceMonths: 24,
        spineRevision: SPINE_REVISION,
        // approvedBy/approvedAt intentionally left null: drafted, not yet owner-approved (D-060)
      },
    });
    packCreated = true;
  }
  console.log(`PolicyPack (GM1 145.A.30(e)): ${packCreated ? 'created' : 'reused existing'} (id=${pack.id}).`);

  // --- 3. PolicyPackClause rows (66) ---
  let clausesCreated = 0;
  let clausesUpdated = 0;
  const clauseIdByItemNumber = new Map<string, string>();
  for (const c of CLAUSES) {
    const existing = await prisma.policyPackClause.findFirst({
      where: { packId: pack.id, clauseNumber: c.itemNumber },
    });
    const row = existing
      ? await prisma.policyPackClause.update({
          where: { id: existing.id },
          data: { clauseTitle: c.itemLabel, clauseText: c.intentSummary, section: c.section, sectionLabel: c.sectionLabel },
        })
      : await prisma.policyPackClause.create({
          data: {
            packId: pack.id,
            clauseNumber: c.itemNumber,
            clauseTitle: c.itemLabel,
            clauseText: c.intentSummary,
            section: c.section,
            sectionLabel: c.sectionLabel,
          },
        });
    clauseIdByItemNumber.set(c.itemNumber, row.id);
    if (existing) clausesUpdated++; else clausesCreated++;
  }
  console.log(`PolicyPackClause seed: ${clausesCreated} created, ${clausesUpdated} updated, ${CLAUSES.length} total.`);

  // --- 4. ClauseTopicMap rows (draft coverage judgment, pending owner review) ---
  // Full sync per clause, not purely additive: D-061 moved 6 items off SP-07 onto the new SP-15.
  // Nothing here has ever been owner-approved (all draft), so deleting a stale row that no
  // longer appears in CLAUSE_TOPIC_MAP is a safe cleanup, not a violation of the "never mutate
  // approved history" rule - that rule protects APPROVED rows, and none exist yet.
  let mapsCreated = 0;
  let mapsUpdated = 0;
  let mapsDeleted = 0;
  let mapTotal = 0;
  for (const m of CLAUSE_TOPIC_MAP) {
    const clauseId = clauseIdByItemNumber.get(m.itemNumber);
    if (!clauseId) throw new Error(`ClauseTopicMap seed: no clause found for itemNumber ${m.itemNumber}`);
    const desiredTopicIds = new Set<string>();
    for (const t of m.topics) {
      const topicId = topicIdByCode.get(t.code);
      if (!topicId) throw new Error(`ClauseTopicMap seed: no spine topic found for code ${t.code}`);
      desiredTopicIds.add(topicId);
      mapTotal++;
      const existing = await prisma.clauseTopicMap.findUnique({
        where: { clauseId_topicId: { clauseId, topicId } },
      });
      if (existing) {
        await prisma.clauseTopicMap.update({
          where: { id: existing.id },
          data: { coverage: t.coverage, mappedBy: SEED_ACTOR },
        });
        mapsUpdated++;
      } else {
        await prisma.clauseTopicMap.create({
          data: { clauseId, topicId, coverage: t.coverage, mappedBy: SEED_ACTOR },
        });
        mapsCreated++;
      }
    }
    // Only clean up non-null topicId rows this seed manages - a null-topicId (whole-clause
    // DELTA) row isn't produced by this seed's data model, so leave any such row untouched.
    const stale = await prisma.clauseTopicMap.findMany({ where: { clauseId, topicId: { not: null } } });
    const staleIds = stale.filter((row) => !row.topicId || !desiredTopicIds.has(row.topicId)).map((row) => row.id);
    if (staleIds.length > 0) {
      await prisma.clauseTopicMap.deleteMany({ where: { id: { in: staleIds } } });
      mapsDeleted += staleIds.length;
    }
  }
  console.log(`ClauseTopicMap seed: ${mapsCreated} created, ${mapsUpdated} updated, ${mapsDeleted} stale deleted, ${mapTotal} total (DRAFT - pending owner review, see D-060/D-061).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
