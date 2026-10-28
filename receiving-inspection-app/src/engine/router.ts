import type { Receipt } from '../schema/receipt';
import type { SamplingTable } from '../schema/sampling';
import type { RoutingDecision, RuleFiring, SamplingDecision } from '../schema/routing';

/**
 * Inspection path router.
 *
 * Given a receipt, decides the inspection path, the sampling rule, and the
 * forms the path requires. Pure: no I/O, no clock, no randomness. The same
 * input always produces a byte-identical decision, because a determination
 * that varies between runs is not a determination.
 *
 * Rule order is load-bearing and mirrors the source process flow:
 *
 *   1. Documentation gate. A hard stop, evaluated before anything else.
 *   2. Branch on release document type.
 *   3. Escalate to 100% on any trigger, regardless of document type.
 *   4. Resolve sampling and required forms.
 *
 * Every rule appends to the trace whether it fired or not. An escalation to
 * 100% that cannot be explained is a defect.
 */

export const RULES = {
  DOCUMENTATION_GATE: 'R1-DOCUMENTATION-GATE',
  RELEASE_DOCUMENT_BRANCH: 'R2-RELEASE-DOCUMENT-BRANCH',
  ESC_FIRST_ARTICLE: 'R3-ESC-FIRST-ARTICLE',
  ESC_OPEN_CORRECTIVE_ACTION: 'R3-ESC-OPEN-CORRECTIVE-ACTION',
  ESC_QUALITY_ESCAPE: 'R3-ESC-QUALITY-ESCAPE',
  ESC_KEY_CHARACTERISTICS: 'R3-ESC-KEY-CHARACTERISTICS',
  ESC_SUPPLIER_STANDING: 'R3-ESC-SUPPLIER-STANDING',
  ESC_CONFIGURATION_CHANGE: 'R3-ESC-CONFIGURATION-CHANGE',
  SAMPLING_RESOLUTION: 'R4-SAMPLING-RESOLUTION',
} as const;

/** Form identifiers are configured values, never internal document numbers. */
export const FORMS = {
  INSPECTION_RECORD: 'INSPECTION_RECORD',
  CONFORMITY_RECORD: 'CONFORMITY_RECORD',
} as const;

export interface RouteInput {
  readonly receipt: Receipt;
  readonly samplingTable: SamplingTable;
}

const NO_SAMPLING: SamplingDecision = {
  kind: 'none',
  sampleSize: 0,
  acceptNumber: null,
  tableId: null,
  tableVersion: null,
};

function fired(ruleId: string, description: string, reason: string): RuleFiring {
  return { ruleId, description, fired: true, reason };
}

function notFired(ruleId: string, description: string, reason: string): RuleFiring {
  return { ruleId, description, fired: false, reason };
}

export function routeInspection(input: RouteInput): RoutingDecision {
  const { receipt, samplingTable } = input;
  const trace: RuleFiring[] = [];

  // -------------------------------------------------------------------------
  // Rule 1 — documentation gate.
  //
  // Inspection does not start against paperwork that is incomplete or does not
  // match the goods. This is a refusal to begin, not a finding recorded during
  // an inspection, and it is why the product is not a form.
  // -------------------------------------------------------------------------
  const noReleaseDocument = receipt.documentation.releaseDocument === 'none';
  const documentationFails =
    !receipt.documentation.complete ||
    !receipt.documentation.matchesPhysicalGoods ||
    noReleaseDocument;

  if (documentationFails) {
    const causes: string[] = [];
    if (!receipt.documentation.complete) causes.push('documentation incomplete');
    if (!receipt.documentation.matchesPhysicalGoods) {
      causes.push('documentation does not match the physical goods');
    }
    if (noReleaseDocument) causes.push('no release document presented');

    trace.push(
      fired(
        RULES.DOCUMENTATION_GATE,
        'Receiving documentation must be complete and match the physical goods',
        `Hard stop: ${causes.join('; ')}. Inspection does not start.`
      )
    );

    return {
      path: 'RETURN_TO_RECEIVING',
      sampling: NO_SAMPLING,
      requiredForms: [],
      escalationTriggers: [],
      blocking: null,
      trace,
    };
  }

  trace.push(
    notFired(
      RULES.DOCUMENTATION_GATE,
      'Receiving documentation must be complete and match the physical goods',
      'Documentation is complete, matches the physical goods, and carries a release document.'
    )
  );

  // -------------------------------------------------------------------------
  // Rule 2 — branch on release document type.
  // -------------------------------------------------------------------------
  const releasedOnAirworthinessCertificate =
    receipt.documentation.releaseDocument === 'faa-8130-3' ||
    receipt.documentation.releaseDocument === 'configured-equivalent';

  let path: 'FULL_INSPECTION' | 'SAMPLE_INSPECTION' = releasedOnAirworthinessCertificate
    ? 'FULL_INSPECTION'
    : 'SAMPLE_INSPECTION';

  trace.push(
    fired(
      RULES.RELEASE_DOCUMENT_BRANCH,
      'The release document type determines the base inspection path',
      releasedOnAirworthinessCertificate
        ? `Released on ${receipt.documentation.releaseDocument}: 100% inspection, conformity record required.`
        : 'Released on certificate of conformance only: sample inspection per the configured table.'
    )
  );

  // -------------------------------------------------------------------------
  // Rule 3 — escalation to 100%, regardless of document type.
  //
  // Each trigger is evaluated and traced independently. When a receipt
  // escalates, exactly which trigger caused it must be visible.
  // -------------------------------------------------------------------------
  const escalationTriggers: string[] = [];

  const evaluateTrigger = (
    ruleId: string,
    description: string,
    condition: boolean,
    why: string
  ) => {
    if (condition) {
      escalationTriggers.push(ruleId);
      trace.push(fired(ruleId, description, why));
    } else {
      trace.push(notFired(ruleId, description, `Not met: ${why}`));
    }
  };

  evaluateTrigger(
    RULES.ESC_FIRST_ARTICLE,
    'First article from this supplier for this part number',
    receipt.escalation.firstArticleFromSupplier,
    'no prior accepted receipt of this part number from this supplier'
  );
  evaluateTrigger(
    RULES.ESC_OPEN_CORRECTIVE_ACTION,
    'Open corrective action against this part number',
    receipt.escalation.openCorrectiveAction,
    'a corrective action is open against this part number'
  );
  evaluateTrigger(
    RULES.ESC_QUALITY_ESCAPE,
    'Quality escape against this part number within the lookback window',
    receipt.escalation.qualityEscapeInLookback,
    'an escape is recorded against this part number in the configured lookback'
  );
  evaluateTrigger(
    RULES.ESC_KEY_CHARACTERISTICS,
    'Article carries key or critical characteristics',
    receipt.escalation.keyOrCriticalCharacteristics,
    'the article carries key or critical characteristics'
  );
  evaluateTrigger(
    RULES.ESC_SUPPLIER_STANDING,
    'Supplier is on probation, newly approved, or suspended',
    receipt.supplierStatus !== 'approved',
    `supplier standing is "${receipt.supplierStatus}"`
  );
  evaluateTrigger(
    RULES.ESC_CONFIGURATION_CHANGE,
    'Configuration change since the last receipt',
    receipt.escalation.configurationChangeSinceLastReceipt,
    'drawing revision, MOD status, or process has changed since the last receipt'
  );

  if (escalationTriggers.length > 0 && path === 'SAMPLE_INSPECTION') {
    path = 'FULL_INSPECTION';
  }

  // -------------------------------------------------------------------------
  // Rule 4 — resolve sampling.
  // -------------------------------------------------------------------------
  const requiredForms: string[] = [FORMS.INSPECTION_RECORD];

  if (path === 'FULL_INSPECTION') {
    requiredForms.push(FORMS.CONFORMITY_RECORD);
    trace.push(
      fired(
        RULES.SAMPLING_RESOLUTION,
        'Resolve the sample size for the decided path',
        `100% inspection: all ${receipt.quantityReceived} unit(s) inspected. No accept number applies — any failure fails the lot.`
      )
    );

    return {
      path,
      sampling: {
        kind: 'full',
        sampleSize: receipt.quantityReceived,
        acceptNumber: null,
        tableId: null,
        tableVersion: null,
      },
      requiredForms,
      escalationTriggers,
      blocking: null,
      trace,
    };
  }

  // Sample inspection: the table is customer data and may not be configured.
  // The router blocks rather than guessing. See DESIGN-NOTES.md §6.1.
  if (!samplingTable.configured) {
    trace.push(
      fired(
        RULES.SAMPLING_RESOLUTION,
        'Resolve the sample size for the decided path',
        'Blocked: no sampling table is configured. This product ships no sample sizes.'
      )
    );
    return {
      path: 'BLOCKED',
      sampling: NO_SAMPLING,
      requiredForms,
      escalationTriggers,
      blocking: {
        code: 'SAMPLING_TABLE_NOT_CONFIGURED',
        message:
          'Sample inspection is required but no sampling table is configured. ' +
          'Configure your sampling scheme before routing sample inspections.',
      },
      trace,
    };
  }

  const band = samplingTable.bands.find(
    (b) =>
      receipt.quantityReceived >= b.lotSizeMin &&
      (b.lotSizeMax === null || receipt.quantityReceived <= b.lotSizeMax)
  );

  if (band === undefined) {
    trace.push(
      fired(
        RULES.SAMPLING_RESOLUTION,
        'Resolve the sample size for the decided path',
        `Blocked: sampling table "${samplingTable.id}" has no band covering a lot size of ${receipt.quantityReceived}.`
      )
    );
    return {
      path: 'BLOCKED',
      sampling: NO_SAMPLING,
      requiredForms,
      escalationTriggers,
      blocking: {
        code: 'SAMPLING_BAND_NOT_FOUND',
        message:
          `Sampling table "${samplingTable.id}" version ${samplingTable.version} has no band ` +
          `covering a lot size of ${receipt.quantityReceived}. Extend the table.`,
      },
      trace,
    };
  }

  trace.push(
    fired(
      RULES.SAMPLING_RESOLUTION,
      'Resolve the sample size for the decided path',
      `Sample inspection: ${band.sampleSize} of ${receipt.quantityReceived} unit(s), accept on ` +
        `${band.acceptNumber} failure(s), from table "${samplingTable.id}" version ${samplingTable.version}.`
    )
  );

  return {
    path,
    sampling: {
      kind: 'sample',
      sampleSize: band.sampleSize,
      acceptNumber: band.acceptNumber,
      tableId: samplingTable.id,
      tableVersion: samplingTable.version,
    },
    requiredForms,
    escalationTriggers,
    blocking: null,
    trace,
  };
}
