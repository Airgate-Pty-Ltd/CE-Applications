import type { CheckPack } from '../schema/session.ts'

/**
 * Check content as versioned data, never as code.
 *
 * A pack is authored, versioned and shipped like a document, because the record
 * has to say which version of which pack was executed. Packs below are generic
 * starting points; a customer's own packs replace them and carry their own ids
 * and versions. Nothing here names a real document, article or organisation.
 */

export const PRODUCTION_CONFORMITY_PACK: CheckPack = {
  packId: 'production-conformity',
  version: '1.0.0',
  title: 'Production conformity inspection - component article',
  checks: [
    {
      checkId: 'pc-identity',
      title: 'Article identity',
      instruction:
        'Show the article nameplate or identification marking. Hold steady and fill the frame.',
      keyCharacteristic: false,
      requiresDocumentOnScreen: false,
      requiresCalibratedTool: false,
      citationRefs: ['14 CFR 45.15'],
    },
    {
      checkId: 'pc-part-marking',
      title: 'Part marking legibility and content',
      instruction:
        'Bring the part marking into frame. Rotate slowly so every character is readable in turn.',
      keyCharacteristic: true,
      requiresDocumentOnScreen: false,
      requiresCalibratedTool: false,
      citationRefs: ['14 CFR 45.15'],
    },
    {
      checkId: 'pc-configuration-document',
      title: 'Configuration document on screen',
      instruction:
        'Display the applicable configuration document. Scroll to the revision block and hold.',
      keyCharacteristic: false,
      requiresDocumentOnScreen: true,
      requiresCalibratedTool: false,
      citationRefs: [],
    },
    {
      checkId: 'pc-dimensional',
      title: 'Dimensional characteristic',
      instruction:
        'Place the calibrated instrument on the feature as directed. Hold the reading in frame until told to move.',
      keyCharacteristic: true,
      requiresDocumentOnScreen: false,
      requiresCalibratedTool: true,
      citationRefs: [],
    },
    {
      checkId: 'pc-workmanship',
      title: 'Workmanship and surface condition',
      instruction: 'Pan slowly across each face. Pause where directed.',
      keyCharacteristic: false,
      requiresDocumentOnScreen: false,
      requiresCalibratedTool: false,
      citationRefs: [],
    },
    {
      checkId: 'pc-records',
      title: 'Manufacturing records on screen',
      instruction: 'Display the manufacturing record for this article. Scroll as directed.',
      keyCharacteristic: false,
      requiresDocumentOnScreen: true,
      requiresCalibratedTool: false,
      citationRefs: ['14 CFR 21.137'],
    },
  ],
}

export const MAINTENANCE_CONFORMITY_PACK: CheckPack = {
  packId: 'maintenance-conformity',
  version: '1.0.0',
  title: 'Maintenance conformity inspection - component article',
  checks: [
    {
      checkId: 'mc-identity',
      title: 'Article identity and serial reference',
      instruction: 'Show the identification plate. Hold steady and fill the frame.',
      keyCharacteristic: false,
      requiresDocumentOnScreen: false,
      requiresCalibratedTool: false,
      citationRefs: ['14 CFR 45.15'],
    },
    {
      checkId: 'mc-work-performed',
      title: 'Maintenance record on screen',
      instruction:
        'Display the maintenance record covering the work performed. Scroll to the signature block.',
      keyCharacteristic: false,
      requiresDocumentOnScreen: true,
      requiresCalibratedTool: false,
      citationRefs: ['14 CFR 43.9'],
    },
    {
      checkId: 'mc-repair-area',
      title: 'Repair area condition',
      instruction:
        'Bring the repaired area into frame. Rotate through the angles directed and hold at each.',
      keyCharacteristic: true,
      requiresDocumentOnScreen: false,
      requiresCalibratedTool: false,
      citationRefs: [],
    },
    {
      checkId: 'mc-functional-test',
      title: 'Functional test observation',
      instruction:
        'Position the camera on the test indication. Start the test when directed and keep the indication in frame throughout.',
      keyCharacteristic: true,
      requiresDocumentOnScreen: false,
      requiresCalibratedTool: true,
      citationRefs: [],
    },
    {
      checkId: 'mc-final-condition',
      title: 'Final condition and preservation',
      instruction: 'Pan across the article. Show packaging and preservation as directed.',
      keyCharacteristic: false,
      requiresDocumentOnScreen: false,
      requiresCalibratedTool: false,
      citationRefs: [],
    },
  ],
}

export const CHECK_PACKS: CheckPack[] = [PRODUCTION_CONFORMITY_PACK, MAINTENANCE_CONFORMITY_PACK]

export function checkPackById(packId: string): CheckPack | undefined {
  return CHECK_PACKS.find((p) => p.packId === packId)
}
