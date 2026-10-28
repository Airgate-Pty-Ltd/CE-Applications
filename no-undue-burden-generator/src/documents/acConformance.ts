import JSZip from 'jszip'

/**
 * AC 21-55 Appendix A conformance map.
 *
 * Every section heading and every numbered item of the published Appendix A,
 * transcribed from the AC. The generated document is checked against this list
 * so that a missing item is caught mechanically rather than by someone
 * remembering to compare the output against the PDF.
 *
 * This is the single source for both the document tests and the dashboard's AC
 * conformance panel. If a future revision of the AC changes the template, this
 * list changes first and the failures point at everything that needs updating.
 */

export interface AcItem {
  /** Where it sits, e.g. "Section 2". */
  readonly section: string
  /** The item number within its section, or 'heading'. */
  readonly item: string
  /**
   * Distinctive text that must appear in the generated document. Kept short
   * enough to survive line wrapping but long enough to be unambiguous.
   */
  readonly probe: string
  /** Human label for the dashboard. */
  readonly label: string
  /**
   * Sections 3 to 5 are only printed for a full project plan. On an initial
   * notification their absence is correct, not a defect.
   */
  readonly fullPlanOnly?: boolean
}

export const AC_2155_APPENDIX_A: readonly AcItem[] = [
  { section: 'Header', item: 'title', probe: 'PAH Project Initiation Plan', label: 'Document title' },
  { section: 'Header', item: '1', probe: 'PAH Name:', label: 'PAH Name' },
  { section: 'Header', item: '2', probe: 'Project Number/PC Number:', label: 'Project Number/PC Number' },
  { section: 'Header', item: '3', probe: 'PAH U.S. Address:', label: 'PAH U.S. Address' },
  { section: 'Header', item: '4', probe: 'Phone Number:', label: 'Phone Number' },
  { section: 'Header', item: '5', probe: 'Project Contact Person:', label: 'Project Contact Person' },
  { section: 'Header', item: '6', probe: 'Date:', label: 'Date' },
  { section: 'Header', item: 'note', probe: 'Initial FAA Notification.', label: 'Initial FAA Notification note' },

  { section: 'Section 1', item: 'heading', probe: 'Section 1—Project Information', label: 'Section 1 heading' },
  { section: 'Section 1', item: '1', probe: 'Name and location, including country', label: 'Facility name and location' },
  { section: 'Section 1', item: '2', probe: 'Project number/PC number.', label: 'Project/PC number' },
  { section: 'Section 1', item: '3', probe: 'Names and model numbers of products or articles.', label: 'Articles' },
  { section: 'Section 1', item: '4', probe: 'Project description.', label: 'Project description' },
  { section: 'Section 1', item: '5', probe: 'located in a bilateral country?', label: 'Bilateral country' },
  { section: 'Section 1', item: '6', probe: 'production approval issued by its CAA', label: 'CAA production approval' },

  { section: 'Section 2', item: 'heading', probe: 'Section 2—Risk Determination', label: 'Section 2 heading' },
  { section: 'Section 2', item: '1', probe: 'listed on the CPL?', label: 'CPL listing' },
  { section: 'Section 2', item: '2', probe: 'identified the products, articles, or processes as high-risk?', label: 'High-risk identification' },
  { section: 'Section 2', item: '3', probe: 'description of their critical characteristics', label: 'Critical characteristics' },
  { section: 'Section 2', item: '4', probe: 'fully inspectable upon receipt.', label: 'Inspectable upon receipt' },
  { section: 'Section 2', item: '5', probe: 'cannot be inspected once received', label: 'Un-inspectable characteristics' },
  { section: 'Section 2', item: '6', probe: 'manufacturing capabilities and experience', label: 'Capabilities and experience' },

  { section: 'Section 3', item: 'heading', probe: 'Section 3—PAH Control of the Manufacturing Facility', label: 'Section 3 heading', fullPlanOnly: true },
  { section: 'Section 3', item: '1', probe: 'reporting nonconforming products/articles or quality escapes', label: 'Nonconformance reporting', fullPlanOnly: true },
  { section: 'Section 3', item: '2', probe: 'use and control of subtier suppliers', label: 'Subtier control', fullPlanOnly: true },
  { section: 'Section 3', item: '3', probe: 'notifying the FAA of any changes', label: 'FAA change notification', fullPlanOnly: true },
  { section: 'Section 3', item: '4', probe: 'changes to processes that affect conformity', label: 'Process change control', fullPlanOnly: true },
  { section: 'Section 3', item: '5', probe: 'major and minor design changes', label: 'Design change control', fullPlanOnly: true },
  { section: 'Section 3', item: '6', probe: 'quality flowdown requirements.', label: 'Quality flowdown', fullPlanOnly: true },
  { section: 'Section 3', item: '7', probe: 'specific audit process performed by the PAH', label: 'Audit process', fullPlanOnly: true },

  { section: 'Section 4', item: 'heading', probe: 'Section 4—Approval of the Manufacturing Facility', label: 'Section 4 heading', fullPlanOnly: true },
  { section: 'Section 4', item: '1', probe: 'results of the PAH', label: 'Approval results', fullPlanOnly: true },
  { section: 'Section 4', item: '2', probe: 'competence, qualifications, education, training', label: 'Personnel competence', fullPlanOnly: true },
  { section: 'Section 4', item: '3', probe: 'all types of specialized training required.', label: 'Specialized training', fullPlanOnly: true },
  { section: 'Section 4', item: '4', probe: 'personnel qualifications needed to conduct inspections', label: 'Inspection qualifications', fullPlanOnly: true },
  { section: 'Section 4', item: '5', probe: 'fully integrated into the PAH', label: 'QMS integration', fullPlanOnly: true },
  { section: 'Section 4', item: '6', probe: 'approval process for subtier suppliers', label: 'Subtier approval', fullPlanOnly: true },
  { section: 'Section 4', item: '7', probe: 'available in the English language', label: 'English-language availability', fullPlanOnly: true },
  { section: 'Section 4', item: '8', probe: 'non-bilateral country', label: 'Non-bilateral access mitigation', fullPlanOnly: true },

  { section: 'Section 5', item: 'heading', probe: 'Section 5—Delegations & Inspections', label: 'Section 5 heading', fullPlanOnly: true },
  { section: 'Section 5', item: '1', probe: 'inspections or authorities would be delegated', label: 'Delegated authorities', fullPlanOnly: true },
  { section: 'Section 5', item: '2', probe: 'minimum inspection/test requirements', label: 'Inspection procedures', fullPlanOnly: true },
  { section: 'Section 5', item: '3', probe: 'function codes to be used by designees.', label: 'Designee function codes', fullPlanOnly: true },
  { section: 'Section 5', item: '4', probe: 'travel expenses for designees', label: 'Designee travel', fullPlanOnly: true },

  { section: 'FAA blocks', item: '1', probe: 'FAA Action Requests', label: 'FAA Action Requests' },
  { section: 'FAA blocks', item: '2', probe: 'Comments', label: 'Comments' },
  { section: 'FAA blocks', item: '3', probe: 'Approvals', label: 'Approvals' },
  { section: 'FAA blocks', item: '4', probe: 'No Undue Burden', label: 'FAA Determination checkboxes' },
  { section: 'FAA blocks', item: '5', probe: 'MIDO/CMO Manager Signature', label: 'Signature block' },
]

export interface ConformanceResult {
  readonly item: AcItem
  readonly present: boolean
  /** False when the item is legitimately absent, e.g. Sections 3–5 on a notification. */
  readonly required: boolean
}

/**
 * Extract the visible text of a generated .docx.
 *
 * A .docx is a zip; the body lives in word/document.xml, and headers and footers
 * are separate parts. All are read, because the status banner sits in the header
 * and would otherwise be invisible to these checks.
 */
export async function extractDocumentText(data: ArrayBuffer | Uint8Array | string): Promise<string> {
  // A base64 string is accepted because it is the only .docx representation that
  // behaves identically in Node, a real browser and jsdom — Blob support differs
  // between them, and the preview path should not care which one it is running in.
  const zip =
    typeof data === 'string' ? await JSZip.loadAsync(data, { base64: true }) : await JSZip.loadAsync(data)
  const parts = Object.keys(zip.files).filter(
    (name) => /^word\/(document|header\d*|footer\d*)\.xml$/.test(name),
  )

  const texts: string[] = []
  for (const name of parts.sort()) {
    const xml = await zip.files[name]?.async('string')
    if (xml === undefined) continue
    // Concatenate <w:t> runs. Word splits a sentence across runs freely, so the
    // separator has to be empty or probes would never match across a split.
    const runs = [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((m) => m[1] ?? '')
    texts.push(runs.join(''))
  }

  return decodeXmlEntities(texts.join('\n'))
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&')
}

export function checkConformance(documentText: string, isFullPlan: boolean): ConformanceResult[] {
  return AC_2155_APPENDIX_A.map((item) => ({
    item,
    present: documentText.includes(item.probe),
    required: item.fullPlanOnly !== true || isFullPlan,
  }))
}
