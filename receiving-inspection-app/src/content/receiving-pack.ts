import type { CheckPack } from '../schema/check';

/**
 * Standard receiving inspection check pack.
 *
 * CONTENT, not code. Versioned separately from the application so a customer
 * can add their own checks and so standard packs ship without a release.
 *
 * Applicability is declarative data the engine evaluates — a pack never carries
 * executable expressions, because a pack that can execute code can do anything.
 *
 * Regulatory hooks are recorded per check so an auditor can trace a check to
 * its basis rather than take the vendor's word for why it exists. Every hook is
 * UNVERIFIED until confirmed against a controlled copy (REGULATORY-SOURCES.md).
 */
export const STANDARD_RECEIVING_PACK: CheckPack = {
  id: 'standard-receiving',
  version: '1.0.0',
  title: 'Standard receiving inspection',
  checks: [
    // ---------------------------------------------------------------------
    // Physical verification
    // ---------------------------------------------------------------------
    {
      id: 'PHY-PACKAGING',
      group: 'physical-verification',
      prompt: 'Confirm the shipping container and packing are appropriate for the items received.',
      applicableWhen: { kind: 'always' },
      evidenceRequired: false,
      requiresMeasurement: false,
      regulatoryHook: 'AS9100D 8.4.2 — control of externally provided product',
    },
    {
      id: 'PHY-COUNT',
      group: 'physical-verification',
      prompt:
        'Reconcile the count: confirm every unit listed on the shipping documents is present.',
      applicableWhen: { kind: 'always' },
      evidenceRequired: false,
      requiresMeasurement: false,
      regulatoryHook: 'AS9100D 8.4.3 — information for external providers',
    },
    {
      id: 'PHY-ESD',
      group: 'physical-verification',
      prompt:
        'Confirm ESD protection is present and intact: bags, caps, plugs as applicable to the article.',
      applicableWhen: { kind: 'always' },
      evidenceRequired: false,
      requiresMeasurement: false,
      regulatoryHook: 'AS9100D 8.5.4 — preservation',
    },
    {
      id: 'PHY-DAMAGE',
      group: 'physical-verification',
      prompt: 'Confirm the unit is free of damage and of any sign of defect.',
      applicableWhen: { kind: 'always' },
      evidenceRequired: true,
      requiresMeasurement: false,
      regulatoryHook: 'AS9100D 8.6 — release of products and services',
    },
    {
      id: 'PHY-FOD',
      group: 'physical-verification',
      prompt:
        'FOD check: perform a rattle/shake test on the closed assembly and confirm no foreign object is present.',
      applicableWhen: {
        kind: 'not',
        of: { kind: 'equals', field: 'articleClass', value: 'standard-part' },
      },
      evidenceRequired: false,
      requiresMeasurement: false,
      regulatoryHook: 'AS9100D 8.5.1.3 — foreign object damage prevention',
    },
    {
      id: 'PHY-COSMETIC',
      group: 'physical-verification',
      prompt:
        'Assess cosmetic condition against acceptance limits: scratches, broken or missing parts, ' +
        'label legibility, finish, cable damage, adhesive or varnish defects, connector condition.',
      applicableWhen: { kind: 'always' },
      evidenceRequired: true,
      requiresMeasurement: false,
      regulatoryHook: 'AS9100D 8.6 — release of products and services',
    },
    {
      id: 'PHY-DIMENSIONAL',
      group: 'physical-verification',
      prompt:
        'Verify the key or critical characteristics against the drawing, recording the tool used.',
      applicableWhen: { kind: 'isTrue', field: 'escalation.keyOrCriticalCharacteristics' },
      evidenceRequired: true,
      requiresMeasurement: true,
      regulatoryHook: 'AS9100D 8.5.1.2 — validation and control of special processes',
    },

    // ---------------------------------------------------------------------
    // Documentation verification
    // ---------------------------------------------------------------------
    {
      id: 'DOC-PN-SN-MATCH',
      group: 'documentation-verification',
      prompt:
        'Confirm the part number and serial number match across the article, the label, and every document.',
      applicableWhen: { kind: 'always' },
      evidenceRequired: false,
      requiresMeasurement: false,
      regulatoryHook: 'AS9120B 8.5.2 — identification and traceability',
    },
    {
      id: 'DOC-REVISION',
      group: 'documentation-verification',
      prompt:
        'Confirm the drawing/specification revision on the document matches the approved revision of record.',
      applicableWhen: { kind: 'always' },
      evidenceRequired: false,
      requiresMeasurement: false,
      regulatoryHook: 'AS9100D 8.1.2 — configuration management',
    },
    {
      id: 'DOC-MOD-STATUS',
      group: 'documentation-verification',
      prompt: 'Confirm the MOD status on the label matches the drawing.',
      applicableWhen: { kind: 'always' },
      evidenceRequired: false,
      requiresMeasurement: false,
      regulatoryHook: 'AS9100D 8.1.2 — configuration management',
    },
    {
      id: 'DOC-FAI',
      group: 'documentation-verification',
      prompt: 'Confirm the First Article Inspection report is present and at the correct revision.',
      applicableWhen: {
        kind: 'any',
        of: [
          { kind: 'isTrue', field: 'escalation.firstArticleFromSupplier' },
          { kind: 'isTrue', field: 'escalation.configurationChangeSinceLastReceipt' },
        ],
      },
      evidenceRequired: true,
      requiresMeasurement: false,
      regulatoryHook: 'AS9102 — first article inspection requirement',
    },
    {
      id: 'DOC-COC',
      group: 'documentation-verification',
      prompt: 'Confirm the Certificate of Conformance is present and capture its number.',
      applicableWhen: {
        kind: 'equals',
        field: 'documentation.releaseDocument',
        value: 'certificate-of-conformance',
      },
      evidenceRequired: true,
      requiresMeasurement: false,
      regulatoryHook: 'AS9120B 8.4.3 — information for external providers',
    },
    {
      id: 'DOC-8130-3',
      group: 'documentation-verification',
      prompt: 'Confirm the FAA Form 8130-3 is present and capture its number.',
      applicableWhen: {
        kind: 'equals',
        field: 'documentation.releaseDocument',
        value: 'faa-8130-3',
      },
      evidenceRequired: true,
      requiresMeasurement: false,
      regulatoryHook: 'FAA Form 8130-3 — authorized release certificate',
    },
    {
      id: 'DOC-ATP',
      group: 'documentation-verification',
      prompt: 'Review the Acceptance Test Procedure results and confirm they meet requirements.',
      applicableWhen: { kind: 'isTrue', field: 'escalation.keyOrCriticalCharacteristics' },
      evidenceRequired: true,
      requiresMeasurement: false,
      regulatoryHook: 'AS9100D 8.6 — release of products and services',
    },
    {
      id: 'DOC-AD',
      group: 'documentation-verification',
      prompt: 'Assess Airworthiness Directive applicability for this article.',
      applicableWhen: {
        kind: 'not',
        of: { kind: 'equals', field: 'articleClass', value: 'standard-part' },
      },
      evidenceRequired: false,
      requiresMeasurement: false,
      regulatoryHook: '14 CFR 39 — airworthiness directives',
    },
    {
      id: 'DOC-PMA-MARKING',
      group: 'documentation-verification',
      prompt: 'Verify the PMA approval and confirm the required marking is present on the article.',
      applicableWhen: { kind: 'equals', field: 'articleClass', value: 'pma' },
      evidenceRequired: true,
      requiresMeasurement: false,
      regulatoryHook: '14 CFR 45.15 — part marking; 14 CFR 21 subpart K — PMA',
    },
    {
      id: 'DOC-STC',
      group: 'documentation-verification',
      prompt: 'Verify the Supplemental Type Certificate approval basis for this article.',
      applicableWhen: { kind: 'equals', field: 'articleClass', value: 'stc' },
      evidenceRequired: true,
      requiresMeasurement: false,
      regulatoryHook: '14 CFR 21 subpart E — supplemental type certificates',
    },
    {
      id: 'DOC-SHELF-LIFE',
      group: 'documentation-verification',
      prompt:
        'Confirm the shelf-life / cure date is within limit and identify the storage condition requirements.',
      applicableWhen: { kind: 'equals', field: 'articleClass', value: 'shelf-life-limited' },
      evidenceRequired: true,
      requiresMeasurement: false,
      regulatoryHook: 'AS9100D 8.5.4 — preservation',
    },
    {
      id: 'DOC-COUNTERFEIT',
      group: 'documentation-verification',
      prompt:
        'Confirm traceability to the original manufacturer is unbroken and shows no indicator of a counterfeit part.',
      applicableWhen: { kind: 'always' },
      evidenceRequired: false,
      requiresMeasurement: false,
      regulatoryHook: 'AS5553 / AS6174 — counterfeit part avoidance',
    },
  ],
};

/** Every pack shipped with the product. Customers add their own alongside. */
export const SHIPPED_PACKS: readonly CheckPack[] = [STANDARD_RECEIVING_PACK];
