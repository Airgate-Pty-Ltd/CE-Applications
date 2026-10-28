import { describe, it, expect } from 'vitest'
import { determine } from '../engine/determine.ts'
import { ALLOWED_STATUS_BANNERS } from '../engine/banner.ts'
import { SCENARIOS, baseProfile, scenarioById } from '../fixtures/scenarios.ts'
import { emptyPlan } from '../schema/plan.ts'
import { emptyProfile } from '../schema/profile.ts'
import {
  BlockedByGapsError,
  gapReportToBuffer,
  planToBuffer,
  suggestedFilename,
} from './render.ts'
import { AC_2155_APPENDIX_A, checkConformance, extractDocumentText } from './acConformance.ts'

async function planText(id: string): Promise<string> {
  const s = scenarioById(id)!
  const determination = determine(s.plan, s.profile)
  const buf = await planToBuffer({ plan: s.plan, profile: s.profile, determination })
  return extractDocumentText(buf)
}

describe('generation is refused when blocked', () => {
  it('throws rather than emitting a document with blocking gaps', async () => {
    const determination = determine(emptyPlan(), emptyProfile())
    await expect(
      planToBuffer({ plan: emptyPlan(), profile: emptyProfile(), determination }),
    ).rejects.toBeInstanceOf(BlockedByGapsError)
  })

  it('names what is required in the refusal', async () => {
    const s = scenarioById('blocking-non-bilateral')!
    const determination = determine(s.plan, s.profile)
    await expect(planToBuffer({ plan: s.plan, profile: s.profile, determination })).rejects.toThrow(
      /Section 4 item 8/,
    )
  })

  it('still produces the gap report for a blocked plan', async () => {
    // The user whose plan will not generate is exactly the one who needs to know why.
    const s = scenarioById('blocking-uninspectable-not-named')!
    const determination = determine(s.plan, s.profile)
    expect(determination.canGenerate).toBe(false)
    const text = await extractDocumentText(
      await gapReportToBuffer({ plan: s.plan, profile: s.profile, determination }),
    )
    expect(text).toContain('Gap Report')
    expect(text).toContain('cannot be inspected')
  })
})

describe('AC 21-55 Appendix A conformance', () => {
  it('populates every Appendix A item on a full project plan', async () => {
    const text = await planText('high-risk-critical-characteristics')
    const missing = checkConformance(text, true)
      .filter((r) => r.required && !r.present)
      .map((r) => `${r.item.section} item ${r.item.item} (${r.item.label}) — probe: "${r.item.probe}"`)
    expect(missing, `Appendix A items missing from the generated document:\n${missing.join('\n')}`).toEqual([])
  })

  it('populates Sections 1 and 2 on an initial notification, and omits 3 to 5 deliberately', async () => {
    const text = await planText('initial-notification')
    const results = checkConformance(text, false)

    const missingRequired = results.filter((r) => r.required && !r.present).map((r) => r.item.label)
    expect(missingRequired).toEqual([])

    // AC §7: an initial notification is Sections 1 and 2. Printing empty
    // Sections 3 to 5 would read as the PAH having failed to complete them.
    expect(text).not.toContain('Section 3—PAH Control of the Manufacturing Facility')
    expect(text).toContain('initial notification under AC 21-55')
  })

  it('covers every section of Appendix A in the conformance map', () => {
    const sections = new Set(AC_2155_APPENDIX_A.map((i) => i.section))
    expect([...sections].sort()).toEqual([
      'FAA blocks',
      'Header',
      'Section 1',
      'Section 2',
      'Section 3',
      'Section 4',
      'Section 5',
    ])
  })
})

describe('the status banner', () => {
  for (const banner of ALLOWED_STATUS_BANNERS.filter((b) => b !== 'BLOCKED')) {
    it(`prints "${banner}" in the page header when it applies`, async () => {
      const s = SCENARIOS.find((x) => determine(x.plan, x.profile).banner === banner)!
      const determination = determine(s.plan, s.profile)
      const text = await extractDocumentText(
        await planToBuffer({ plan: s.plan, profile: s.profile, determination }),
      )
      expect(text).toContain(banner)
    })
  }

  it('never prints a banner outside the permitted set', async () => {
    for (const s of SCENARIOS) {
      const determination = determine(s.plan, s.profile)
      if (!determination.canGenerate) continue
      const text = await extractDocumentText(
        await planToBuffer({ plan: s.plan, profile: s.profile, determination }),
      )
      const found = ALLOWED_STATUS_BANNERS.filter((b) => text.includes(b))
      expect(found).toEqual([determination.banner])
    }
  })
})

describe('missing values are visible, never invented', () => {
  it('renders a CONFIRM token for an absent required field', async () => {
    const s = scenarioById('initial-notification')!
    const profile = { ...s.profile, phoneNumber: '' }
    const determination = determine(s.plan, profile)
    const text = await extractDocumentText(
      await planToBuffer({ plan: s.plan, profile, determination }),
    )
    expect(text).toContain('[CONFIRM: a contact telephone number]')
  })

  it('renders a CONFIRM token for an article with no model number', async () => {
    const s = scenarioById('initial-notification')!
    const plan = {
      ...s.plan,
      sectionOne: { ...s.plan.sectionOne, articles: [{ name: 'Aileron actuator bracket', modelNumber: '' }] },
    }
    const determination = determine(plan, s.profile)
    const text = await extractDocumentText(await planToBuffer({ plan, profile: s.profile, determination }))
    expect(text).toContain('[CONFIRM: model number]')
  })

  it('leaves the FAA Validation and Approvals blocks empty', async () => {
    // These belong to the FAA. Pre-filling them would fabricate a federal record.
    const text = await planText('high-risk-critical-characteristics')
    expect(text).toContain('Undue Burden ☐')
    expect(text).toContain('No Undue Burden ☐')
    expect(text).not.toContain('Undue Burden ☒')
  })
})

describe('document content', () => {
  it('states not-applicable rather than blank for a bilateral facility', async () => {
    const text = await planText('high-risk-critical-characteristics')
    expect(text).toContain('Not applicable. The manufacturing facility is located in a bilateral country.')
  })

  it('states explicitly that no designees are used, rather than leaving it blank', async () => {
    const text = await planText('high-risk-critical-characteristics')
    expect(text).toContain('No designees would be used at this manufacturing facility.')
  })

  it('lists the inspection types conducted at the facility', async () => {
    const text = await planText('high-risk-acceptance-test')
    expect(text).toContain('Source inspection')
    expect(text).toContain('First article inspections')
  })

  it('carries the AC 21-55 Appendix A attribution', async () => {
    const text = await planText('initial-notification')
    expect(text).toContain('FAA Advisory Circular 21-55, Appendix A')
  })
})

describe('gap report', () => {
  it('reports blocking, warning and informational groups', async () => {
    const s = scenarioById('warnings-thin-narratives')!
    const determination = determine(s.plan, s.profile)
    const text = await extractDocumentText(
      await gapReportToBuffer({ plan: s.plan, profile: s.profile, determination }),
    )
    expect(text).toContain('Blocking')
    expect(text).toContain('Warnings')
    expect(text).toContain('Informational')
    expect(text).toContain('Consistency checks')
  })

  it('prints the routing rationale so the outcome is explainable', async () => {
    const s = scenarioById('cpl-listed')!
    const determination = determine(s.plan, s.profile)
    const text = await extractDocumentText(
      await gapReportToBuffer({ plan: s.plan, profile: s.profile, determination }),
    )
    expect(text).toContain('Full project plan')
    expect(text).toContain('listed on the CPL')
  })

  it('defers the finding to the FAA managing office', async () => {
    const s = scenarioById('initial-notification')!
    const determination = determine(s.plan, s.profile)
    const text = await extractDocumentText(
      await gapReportToBuffer({ plan: s.plan, profile: s.profile, determination }),
    )
    expect(text).toContain('determination for the FAA managing office')
  })
})

describe('filenames', () => {
  it('derives a filename from the PAH name', () => {
    expect(suggestedFilename(baseProfile(), 'plan')).toBe(
      'Northvale_Aerostructures_Inc_PAH_Project_Initiation_Plan.docx',
    )
    expect(suggestedFilename(baseProfile(), 'gap-report')).toBe(
      'Northvale_Aerostructures_Inc_Gap_Report.docx',
    )
  })

  it('falls back when the PAH name is empty', () => {
    expect(suggestedFilename(emptyProfile(), 'plan')).toBe('PAH_Project_Initiation_Plan.docx')
  })
})

describe('document determinism', () => {
  it('renders byte-identical output for identical input', async () => {
    const s = scenarioById('high-risk-critical-characteristics')!
    const determination = determine(s.plan, s.profile)
    const input = { plan: s.plan, profile: s.profile, determination }

    const a = await extractDocumentText(await planToBuffer(input))
    const b = await extractDocumentText(await planToBuffer(input))
    // Compare extracted text rather than raw bytes: the .docx container embeds a
    // zip timestamp, so the archives differ while the document does not.
    expect(a).toBe(b)
  })
})
