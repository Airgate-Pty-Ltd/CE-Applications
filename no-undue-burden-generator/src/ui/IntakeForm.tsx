import type { AppState } from '../state/useAppState.ts'
import {
  HIGH_RISK_TRIGGER_LABELS,
  INSPECTION_TYPE_LABELS,
  type HighRiskTriggers,
  type InspectionTypes,
} from '../schema/plan.ts'
import { AnswerField, CheckboxField, NarrativeField, TextField } from './fields.tsx'

/**
 * Adaptive intake.
 *
 * The architectural risk flagged in DESIGN-NOTES is that a filing tool degrades
 * into a long static form. The mitigation is here and it is behavioural, not
 * cosmetic:
 *
 *   - Sections 3 to 5 do not exist until the risk determination routes to a full
 *     project plan. A user filing an initial notification never sees them.
 *   - Conditional items appear only when their condition holds: critical
 *     characteristics when the article is CPL-listed or high-risk, un-inspectable
 *     characteristics when the article is not fully inspectable, non-bilateral
 *     mitigation only in a non-bilateral country, designee fields only when
 *     designees are used.
 *   - The routing banner tells the user what their answers MEAN as they answer,
 *     rather than collecting silently and pronouncing at the end.
 */
export function IntakeForm({ state }: { state: AppState }) {
  const { plan, setPlan, determination } = state
  const s1 = plan.sectionOne
  const s2 = plan.sectionTwo
  const fullPlan = determination.risk.routing === 'FULL_PROJECT_PLAN'
  const needsCriticalCharacteristics = s2.cplListed === 'YES' || s2.pahIdentifiedHighRisk === 'YES'

  const one = <K extends keyof typeof s1>(key: K, value: (typeof s1)[K]) =>
    setPlan((p) => ({ ...p, sectionOne: { ...p.sectionOne, [key]: value } }))
  const two = <K extends keyof typeof s2>(key: K, value: (typeof s2)[K]) =>
    setPlan((p) => ({ ...p, sectionTwo: { ...p.sectionTwo, [key]: value } }))
  const three = <K extends keyof typeof plan.sectionThree>(key: K, value: (typeof plan.sectionThree)[K]) =>
    setPlan((p) => ({ ...p, sectionThree: { ...p.sectionThree, [key]: value } }))
  const four = <K extends keyof typeof plan.sectionFour>(key: K, value: (typeof plan.sectionFour)[K]) =>
    setPlan((p) => ({ ...p, sectionFour: { ...p.sectionFour, [key]: value } }))
  const five = <K extends keyof typeof plan.sectionFive>(key: K, value: (typeof plan.sectionFive)[K]) =>
    setPlan((p) => ({ ...p, sectionFive: { ...p.sectionFive, [key]: value } }))

  return (
    <div className="space-y-10">
      <RoutingBanner state={state} />

      <Section title="Section 1 — Project Information" citation="AC 21-55 §7.1">
        <TextField
          label="1. Name of the proposed manufacturing facility"
          value={s1.facilityName}
          onChange={(v) => one('facilityName', v)}
          help="The facility's legal name, as it would appear on a certificate."
        />
        <TextField
          label="Facility address"
          value={s1.facilityAddress}
          onChange={(v) => one('facilityAddress', v)}
          help="Full address. Appendix A asks for the location including country."
        />
        <TextField
          label="Facility country"
          value={s1.facilityCountry}
          onChange={(v) => one('facilityCountry', v)}
          help="Recorded separately because it determines whether a bilateral agreement applies."
          citation="AC 21-55 §7.1.2"
        />

        <ArticlesEditor state={state} />

        <NarrativeField
          label="4. Project description"
          value={s1.projectDescription}
          onChange={(v) => one('projectDescription', v)}
          help="What is performed at this facility, and who retains design and configuration authority."
          citation="AC 21-55 §7.1.5"
        />
        <NarrativeField
          label="Next higher assembly"
          value={s1.nextHigherAssembly}
          onChange={(v) => one('nextHigherAssembly', v)}
          help="Where the articles are assembled or installed into the next higher assembly."
          citation="AC 21-55 §7.1.5.1"
          rows={2}
        />
        <TextField
          label="Proposed start date"
          value={s1.proposedStartDate}
          onChange={(v) => one('proposedStartDate', v)}
          citation="AC 21-55 §7.1.5.2"
        />
        <div className="mb-5">
          <label className="block text-sm font-medium text-slate-800">Intended duration of use</label>
          <div className="mt-2 flex gap-2">
            {(['SHORT_TERM', 'LONG_TERM', 'UNSTATED'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => one('shortOrLongTermUse', option)}
                className={`rounded border px-3 py-1.5 text-sm ${
                  s1.shortOrLongTermUse === option
                    ? 'border-slate-800 bg-slate-800 text-white'
                    : 'border-slate-300 bg-white text-slate-700'
                }`}
              >
                {option === 'SHORT_TERM' ? 'Short-term' : option === 'LONG_TERM' ? 'Long-term' : 'Not stated'}
              </button>
            ))}
          </div>
        </div>

        <AnswerField
          label="5. Is the manufacturing facility located in a bilateral country?"
          value={s1.bilateralCountry}
          onChange={(v) => one('bilateralCountry', v)}
          help="Check the FAA bilateral agreements list for this country. A non-bilateral location adds a required mitigation in Section 4."
          citation="AC 21-55 §7.1.6"
        />
        <AnswerField
          label="6. Does the facility hold a CAA production approval for these articles?"
          value={s1.caaProductionApprovalHeld}
          onChange={(v) => one('caaProductionApprovalHeld', v)}
          citation="AC 21-55 §7.1.7"
        />
        {s1.caaProductionApprovalHeld === 'YES' && (
          <NarrativeField
            label="Describe the CAA production approval"
            value={s1.caaProductionApprovalDescription}
            onChange={(v) => one('caaProductionApprovalDescription', v)}
            help="The AC says: if so, describe. Name the authority, the approval, and its scope."
            rows={3}
          />
        )}
      </Section>

      <Section title="Section 2 — Risk Determination" citation="AC 21-55 §7.2">
        <AnswerField
          label="1. Are the products, articles, or processes listed on the CPL?"
          value={s2.cplListed}
          onChange={(v) => two('cplListed', v)}
          help="Check the current FAA Category Parts List yourself. This application does not assert CPL status — the list is live, and a cached copy would go stale without telling you."
          citation="AC 21-55 §7.2.1"
        />
        <NarrativeField
          label="Basis for your CPL answer"
          value={s2.cplBasis}
          onChange={(v) => two('cplBasis', v)}
          help="Which revision you checked and when. This is what makes the answer defensible six months from now."
          rows={2}
        />

        <div className="mb-5 rounded border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-800">Risk indicators</p>
          <p className="mt-1 mb-3 text-xs text-slate-600">
            AC 21-55 §7.2.2 asks whether <em>you</em> identify the articles as high-risk in the design data — it
            does not supply a checklist. These indicators are an aid: they suggest an answer and give you a
            rationale naming what fired. Your answer below is what gets recorded.
          </p>
          {(Object.keys(HIGH_RISK_TRIGGER_LABELS) as (keyof HighRiskTriggers)[]).map((key) => (
            <CheckboxField
              key={key}
              label={HIGH_RISK_TRIGGER_LABELS[key][0]?.toUpperCase() + HIGH_RISK_TRIGGER_LABELS[key].slice(1)}
              checked={s2.highRiskTriggers[key]}
              onChange={(checked) =>
                two('highRiskTriggers', { ...s2.highRiskTriggers, [key]: checked })
              }
            />
          ))}
          <p className="mt-3 text-xs text-slate-600">
            Suggested answer: <strong>{determination.risk.highRiskSuggested === 'YES' ? 'Yes' : 'No'}</strong>
          </p>
        </div>

        <AnswerField
          label="2. Has the PAH identified the products, articles, or processes as high-risk?"
          value={s2.pahIdentifiedHighRisk}
          onChange={(v) => two('pahIdentifiedHighRisk', v)}
          citation="AC 21-55 §7.2.2"
        />
        {determination.risk.highRiskContradictsTriggers && (
          <p className="-mt-3 mb-5 rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            {determination.risk.highRiskRationale}
          </p>
        )}

        {needsCriticalCharacteristics && (
          <NarrativeField
            label="3. Describe the critical characteristics"
            value={s2.criticalCharacteristics}
            onChange={(v) => two('criticalCharacteristics', v)}
            help="Critical functions, interfaces, or the use of exotic materials. Name the characteristic and say why it matters — not that you control characteristics generally."
            citation="AC 21-55 §7.2.1"
          />
        )}

        <AnswerField
          label="4. Are the products or articles fully inspectable upon receipt?"
          value={s2.fullyInspectableOnReceipt}
          onChange={(v) => two('fullyInspectableOnReceipt', v)}
          help="Inspectable means conformity to type design can be determined without disassembly. AC 21-55 §7.2.3: any completed assembly is generally NOT inspectable upon receipt."
          citation="AC 21-55 §7.2.3"
        />
        {s2.fullyInspectableOnReceipt === 'NO' && (
          <NarrativeField
            label="5. Identify the characteristics that cannot be inspected once received"
            value={s2.uninspectableCharacteristics}
            onChange={(v) => two('uninspectableCharacteristics', v)}
            help="This is the justification for source inspection, and FAA reviewers look for it specifically. Name each characteristic and why it cannot be re-verified."
            citation="AC 21-55 §7.2.3"
          />
        )}

        <NarrativeField
          label="6. Facility manufacturing capabilities and experience"
          value={s2.facilityCapabilitiesAndExperience}
          onChange={(v) => two('facilityCapabilitiesAndExperience', v)}
          help="Experience with these articles specifically, and with any special processes performed here. Part of the initial notification, not only the full plan."
          citation="AC 21-55 §7.2.4"
        />
      </Section>

      {!fullPlan && (
        <div className="rounded border border-sky-300 bg-sky-50 p-4 text-sm text-sky-900">
          <p className="font-medium">Sections 3 to 5 are not shown.</p>
          <p className="mt-1 text-xs">{determination.risk.routingRationale}</p>
        </div>
      )}

      {fullPlan && (
        <>
          <Section title="Section 3 — PAH Control of the Manufacturing Facility" citation="AC 21-55 §8.1">
            <NarrativeField label="1. Reporting nonconforming products/articles or quality escapes" value={plan.sectionThree.nonconformanceReporting} onChange={(v) => three('nonconformanceReporting', v)} help="Who raises it, in what timeframe, and who holds disposition authority." citation="AC 21-55 §8.1.1" />
            <NarrativeField label="2. Use and control of subtier suppliers on high-risk work" value={plan.sectionThree.subtierControl} onChange={(v) => three('subtierControl', v)} citation="AC 21-55 §8.1.2" />
            <NarrativeField label="3. Notifying the FAA of changes that may impact the facility's risk level" value={plan.sectionThree.faaChangeNotification} onChange={(v) => three('faaChangeNotification', v)} help="Name the trigger events and who owns the notification." citation="AC 21-55 §8.1.3" />
            <NarrativeField label="4. Control of process changes affecting conformity and airworthiness" value={plan.sectionThree.processChangeControl} onChange={(v) => three('processChangeControl', v)} help="Include changes at a subtier supplier." citation="AC 21-55 §8.1.4" />
            <NarrativeField label="5. Control and implementation of major and minor design changes" value={plan.sectionThree.designChangeControl} onChange={(v) => three('designChangeControl', v)} citation="AC 21-55 §8.1.5" />
            <NarrativeField label="6. Quality flowdown requirements" value={plan.sectionThree.qualityFlowdown} onChange={(v) => three('qualityFlowdown', v)} citation="AC 21-55 §8.1.6" />
            <NarrativeField label="7. The specific audit process you perform for this facility" value={plan.sectionThree.auditProcess} onChange={(v) => three('auditProcess', v)} help="Frequency, scope, and what happens when a finding goes overdue." citation="AC 21-55 §8.1.7" />
          </Section>

          <Section title="Section 4 — Approval of the Manufacturing Facility" citation="AC 21-55 §8.2">
            <NarrativeField label="1. Results of your facility approval process" value={plan.sectionFour.approvalResults} onChange={(v) => four('approvalResults', v)} help="Dates, findings raised, and closure." citation="AC 21-55 §8.2.1" />
            <NarrativeField label="2. Personnel competence, qualifications, education, training, skills and experience" value={plan.sectionFour.personnelCompetence} onChange={(v) => four('personnelCompetence', v)} citation="AC 21-55 §8.2.2" />
            <NarrativeField label="3. All types of specialized training required" value={plan.sectionFour.specializedTraining} onChange={(v) => four('specializedTraining', v)} help="Include initial, ongoing, specialized and recurrent requirements." citation="AC 21-55 §8.2.2" />
            <NarrativeField label="4. Personnel qualifications for inspections or special processes" value={plan.sectionFour.inspectionQualifications} onChange={(v) => four('inspectionQualifications', v)} citation="AC 21-55 §8.2.3" />

            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-800">
                5. Is the facility fully integrated into your quality system, or have you approved its own?
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {(['FULLY_INTEGRATED', 'PAH_APPROVED', 'UNSTATED'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => four('qmsIntegration', option)}
                    className={`rounded border px-3 py-1.5 text-sm ${
                      plan.sectionFour.qmsIntegration === option
                        ? 'border-slate-800 bg-slate-800 text-white'
                        : 'border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    {option === 'FULLY_INTEGRATED' ? 'Fully integrated' : option === 'PAH_APPROVED' ? 'PAH approved its own QMS' : 'Not stated'}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">AC 21-55 §8.2.4</p>
            </div>
            <NarrativeField label="Describe the integration model" value={plan.sectionFour.qmsIntegrationDescription} onChange={(v) => four('qmsIntegrationDescription', v)} rows={3} />

            <NarrativeField label="6. Approval process for subtier suppliers doing high-risk work" value={plan.sectionFour.subtierApprovalProcess} onChange={(v) => four('subtierApprovalProcess', v)} citation="AC 21-55 §8.2.5" />

            <AnswerField label="7. Would all conformity and airworthiness documents be available in English?" value={plan.sectionFour.englishLanguageAvailability} onChange={(v) => four('englishLanguageAvailability', v)} help="An FAA inspector who cannot read the records cannot conduct the oversight — which is the burden being assessed." citation="AC 21-55 §8.2.6" />
            <NarrativeField label="Describe how translation and validation are handled" value={plan.sectionFour.englishLanguageDescription} onChange={(v) => four('englishLanguageDescription', v)} rows={3} />
            <AnswerField label="Has a listing of those documents been attached to this plan?" value={plan.sectionFour.englishDocumentListingAttached} onChange={(v) => four('englishDocumentListingAttached', v)} help="Appendix A asks this as a separate question. The listing is its own deliverable and is easy to miss." citation="AC 21-55 Appendix A, Section 4 item 7" />

            {s1.bilateralCountry === 'NO' && (
              <NarrativeField
                label="8. How would you mitigate the requirement to allow FAA access?"
                value={plan.sectionFour.nonBilateralAccessMitigation}
                onChange={(v) => four('nonBilateralAccessMitigation', v)}
                help="This facility is in a non-bilateral country. Access is the core of the undue-burden question. Contractual right of entry, PAH-conducted oversight, or CAA assistance."
                citation="AC 21-55 §8.2.7"
              />
            )}
          </Section>

          <Section title="Section 5 — Delegations & Inspections" citation="AC 21-55 §8.3">
            <NarrativeField label="1. What inspections or authorities would be delegated, and how controlled?" value={plan.sectionFive.delegatedAuthorities} onChange={(v) => five('delegatedAuthorities', v)} help="If nothing is delegated, say so explicitly. A blank reads as an omission." citation="AC 21-55 §8.3.1" />
            <AnswerField label="Has the delegation listing been attached to this plan?" value={plan.sectionFive.delegationListingAttached} onChange={(v) => five('delegationListingAttached', v)} citation="AC 21-55 Appendix A, Section 5 item 1" />

            <div className="mb-5 rounded border border-slate-200 bg-slate-50 p-4">
              <p className="mb-2 text-sm font-medium text-slate-800">Inspections conducted at this facility</p>
              {(Object.keys(INSPECTION_TYPE_LABELS) as (keyof InspectionTypes)[]).map((key) => (
                <CheckboxField
                  key={key}
                  label={INSPECTION_TYPE_LABELS[key]}
                  checked={plan.sectionFive.inspectionTypes[key]}
                  onChange={(checked) => five('inspectionTypes', { ...plan.sectionFive.inspectionTypes, [key]: checked })}
                />
              ))}
              <p className="mt-1 text-[11px] text-slate-400">AC 21-55 §8.3.2</p>
            </div>

            <NarrativeField label="2. Specific procedures and minimum inspection/test requirements" value={plan.sectionFive.inspectionProcedures} onChange={(v) => five('inspectionProcedures', v)} help="Cover each inspection type you selected above." citation="AC 21-55 §8.3.2" />

            <AnswerField label="3. Would designees be used at this facility?" value={plan.sectionFive.designeesUsed} onChange={(v) => five('designeesUsed', v)} help="The FAA must make a separate no-undue-burden finding before appointing a designee outside the United States." citation="AC 21-55 §8.4" />
            {plan.sectionFive.designeesUsed === 'YES' && (
              <>
                <NarrativeField label="Justification for designee use" value={plan.sectionFive.designeeJustification} onChange={(v) => five('designeeJustification', v)} rows={3} />
                <TextField label="Designee function codes" value={plan.sectionFive.designeeFunctionCodes} onChange={(v) => five('designeeFunctionCodes', v)} help="Appendix A asks for justification AND function codes." citation="AC 21-55 Appendix A, Section 5 item 3" />
                <AnswerField label="4. Have you agreed to pay designee travel back to the United States?" value={plan.sectionFive.designeeTravelAgreed} onChange={(v) => five('designeeTravelAgreed', v)} help="AC 21-55 §8.4 states this as a requirement, not a preference." citation="AC 21-55 §8.4" />
              </>
            )}
          </Section>
        </>
      )}
    </div>
  )
}

function Section({ title, citation, children }: { title: string; citation: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-1 text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mb-5 text-xs text-slate-400">{citation}</p>
      {children}
    </section>
  )
}

function RoutingBanner({ state }: { state: AppState }) {
  const { risk } = state.determination
  const tone =
    risk.routing === 'FULL_PROJECT_PLAN'
      ? 'border-slate-300 bg-slate-50 text-slate-900'
      : risk.routing === 'INITIAL_NOTIFICATION'
        ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
        : 'border-slate-200 bg-white text-slate-600'

  return (
    <div className={`rounded border p-4 ${tone}`} role="status">
      <p className="text-sm font-semibold">
        {risk.routing === 'FULL_PROJECT_PLAN'
          ? 'Full project plan required — Sections 1 to 5'
          : risk.routing === 'INITIAL_NOTIFICATION'
            ? 'Initial notification may suffice — Sections 1 and 2'
            : 'Routing not yet determined'}
      </p>
      <p className="mt-1 text-xs">{risk.routingRationale}</p>
    </div>
  )
}

function ArticlesEditor({ state }: { state: AppState }) {
  const { plan, setPlan } = state
  const articles = plan.sectionOne.articles

  const update = (index: number, key: 'name' | 'modelNumber', value: string) =>
    setPlan((p) => ({
      ...p,
      sectionOne: {
        ...p.sectionOne,
        articles: p.sectionOne.articles.map((a, i) => (i === index ? { ...a, [key]: value } : a)),
      },
    }))

  return (
    <div className="mb-5">
      <label className="block text-sm font-medium text-slate-800">
        3. Names and model numbers of products or articles
      </label>
      <p className="mt-1 text-xs text-slate-600">
        Appendix A asks for the name and the model number. Other identifiers belong in the project description.
      </p>
      <div className="mt-2 space-y-2">
        {articles.map((a, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="Article name"
              value={a.name}
              onChange={(e) => update(i, 'name', e.target.value)}
            />
            <input
              className="w-48 rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="Model number"
              value={a.modelNumber}
              onChange={(e) => update(i, 'modelNumber', e.target.value)}
            />
            <button
              type="button"
              className="rounded border border-slate-300 px-3 text-sm text-slate-600"
              onClick={() =>
                setPlan((p) => ({
                  ...p,
                  sectionOne: { ...p.sectionOne, articles: p.sectionOne.articles.filter((_, j) => j !== i) },
                }))
              }
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="mt-2 rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
        onClick={() =>
          setPlan((p) => ({
            ...p,
            sectionOne: { ...p.sectionOne, articles: [...p.sectionOne.articles, { name: '', modelNumber: '' }] },
          }))
        }
      >
        Add article
      </button>
      <p className="mt-1 text-[11px] text-slate-400">AC 21-55 §7.1.4</p>
    </div>
  )
}
