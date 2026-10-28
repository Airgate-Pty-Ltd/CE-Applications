import type { AppState } from '../state/useAppState.ts'
import { REQUIRED_PROFILE_FIELDS, type OrganizationProfile } from '../schema/profile.ts'
import { TextField } from './fields.tsx'

/**
 * Organization Profile — filled in once, reused for every plan.
 *
 * Every field here was a hardcoded value in the logic this product derives from.
 * Nothing is pre-filled: a plausible-looking wrong default silently ships to the
 * FAA, whereas a blank becomes a visible [CONFIRM: …] token in the document.
 */

interface FieldSpec {
  key: keyof OrganizationProfile
  label: string
  help?: string
  citation?: string
}

const GROUPS: { title: string; blurb: string; fields: FieldSpec[] }[] = [
  {
    title: 'Applicant',
    blurb: 'The header block of AC 21-55 Appendix A.',
    fields: [
      { key: 'pahName', label: 'PAH name', help: 'The legal entity holding the production approval.' },
      { key: 'projectOrPcNumber', label: 'Project number / PC number', citation: 'AC 21-55 §7.1.3' },
      { key: 'pahUsAddress', label: 'PAH U.S. address' },
      { key: 'phoneNumber', label: 'Phone number' },
      { key: 'projectContactPerson', label: 'Project contact person', help: 'Name and title.' },
    ],
  },
  {
    title: 'Signatory',
    blurb: 'Who signs the transmittal. Not an Appendix A field; used on the cover.',
    fields: [
      { key: 'signatoryName', label: 'Signatory name' },
      { key: 'signatoryTitle', label: 'Signatory title' },
    ],
  },
  {
    title: 'FAA managing office',
    blurb:
      'AC 21-55 §7 directs the plan to your FAA managing office. Which office that is depends on your certificate, so this is asked rather than assumed.',
    fields: [
      { key: 'faaManagingOffice', label: 'FAA managing office', citation: 'AC 21-55 §7' },
      { key: 'faaAddressee', label: 'Addressee' },
      { key: 'submissionMethod', label: 'Submission method' },
    ],
  },
  {
    title: 'Quality manual',
    blurb: 'Cited in Section 4 when describing the quality system.',
    fields: [
      { key: 'qmsManualNumber', label: 'Quality manual number' },
      { key: 'qmsManualRevision', label: 'Revision' },
      { key: 'qmsManualDate', label: 'Date' },
    ],
  },
  {
    title: 'Your procedures',
    blurb:
      'Where the source logic named an internal procedure number, this product asks which of YOUR procedures governs it. These are inserted into the narrative help, never into the document on their own.',
    fields: [
      { key: 'procedureNonconformance', label: 'Nonconformance and quality escapes' },
      { key: 'procedureSubtierControl', label: 'Subtier supplier control' },
      { key: 'procedureChangeControl', label: 'Process change control' },
      { key: 'procedureDesignChange', label: 'Design change control' },
      { key: 'procedureQualityFlowdown', label: 'Quality flowdown' },
      { key: 'procedureAuditProgramme', label: 'Audit programme' },
      { key: 'procedureTrainingQualification', label: 'Training and qualification' },
    ],
  },
  {
    title: 'Designee policy',
    blurb: 'AC 21-55 §8.4, including the commitment to fund designee travel to the United States.',
    fields: [{ key: 'designeePolicy', label: 'Designee policy', citation: 'AC 21-55 §8.4' }],
  },
]

export function ProfileForm({ state }: { state: AppState }) {
  const required = new Set<string>(REQUIRED_PROFILE_FIELDS)

  return (
    <div className="space-y-10">
      <p className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        Filled in once and reused for every plan. Stored in this browser only — nothing is sent anywhere.
      </p>

      {GROUPS.map((group) => (
        <section key={group.title}>
          <h2 className="mb-1 text-lg font-semibold text-slate-900">{group.title}</h2>
          <p className="mb-5 text-xs text-slate-600">{group.blurb}</p>
          {group.fields.map((f) => (
            <TextField
              key={f.key}
              label={required.has(f.key) ? `${f.label} *` : f.label}
              value={state.profile[f.key]}
              onChange={(v) => state.setProfile({ [f.key]: v })}
              {...(f.help === undefined ? {} : { help: f.help })}
              {...(f.citation === undefined ? {} : { citation: f.citation })}
            />
          ))}
        </section>
      ))}

      <p className="text-xs text-slate-500">* Required before a plan can be generated.</p>
    </div>
  )
}
