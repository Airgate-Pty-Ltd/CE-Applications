import type { NonconformanceRecord, NcrNextAction, Role } from '../schema/ncr';

/**
 * Nonconformance disposition router.
 *
 * A failed check does not produce a note. It produces a nonconformance that
 * routes deterministically:
 *
 *   raise NCR
 *     -> quarantine to a controlled hold location, recorded
 *     -> material review: can the material be used as-is?
 *          YES -> disposition under documented approval
 *          NO  -> is supplier corrective action warranted?
 *                   YES -> supplier corrective action (8D), RMA, return to vendor
 *                   NO  -> scrap under documented approval
 *
 * Every branch requires a named approver and a reason. There are no silent
 * dispositions, and for any article the full chain from receipt to final
 * disposition can be shown.
 */

/**
 * Capability ranking. A role may perform an action requiring its own rank or
 * lower. An inspector cannot approve a disposition requiring a supervisor; a
 * read-only auditor can perform nothing.
 */
const ROLE_RANK: Readonly<Record<Role, number>> = {
  'read-only': 0,
  inspector: 1,
  supervisor: 2,
  'quality-manager': 3,
};

export function canPerform(actorRole: Role, requiredRole: Role | null): boolean {
  if (requiredRole === null) {
    return false;
  }
  if (actorRole === 'read-only') {
    return false;
  }
  return ROLE_RANK[actorRole] >= ROLE_RANK[requiredRole];
}

export function nextNcrAction(ncr: NonconformanceRecord): NcrNextAction {
  const trace: string[] = [
    `NCR ${ncr.id} raised from ${ncr.failedCheckIds.length} failed check(s)`,
  ];

  if (ncr.disposition !== null) {
    trace.push(`Disposition recorded: ${ncr.disposition}`);
    return {
      code: 'NONE',
      description: `Disposition ${ncr.disposition} is recorded. The chain is complete.`,
      requiredRole: null,
      terminal: true,
      trace,
    };
  }

  if (ncr.quarantine === null) {
    trace.push('Article not yet quarantined');
    return {
      code: 'QUARANTINE_ARTICLE',
      description:
        'Move the article to a controlled hold location and record it. A nonconforming ' +
        'article does not remain available for use.',
      requiredRole: 'inspector',
      terminal: false,
      trace,
    };
  }
  trace.push(`Quarantined to ${ncr.quarantine.location}`);

  if (ncr.useAsIs === null) {
    trace.push('Material review outstanding');
    return {
      code: 'PERFORM_MATERIAL_REVIEW',
      description: 'Material review: can the material be used as it is?',
      requiredRole: 'supervisor',
      terminal: false,
      trace,
    };
  }

  if (ncr.useAsIs) {
    trace.push('Material review: usable as-is');
    return {
      code: 'RECORD_USE_AS_IS_APPROVAL',
      description:
        'Record the use-as-is disposition to stock or to a job, with a named approver and ' +
        'a documented reason.',
      requiredRole: 'supervisor',
      terminal: false,
      trace,
    };
  }
  trace.push('Material review: not usable as-is');

  if (ncr.supplierActionWarranted === null) {
    trace.push('Supplier corrective action decision outstanding');
    return {
      code: 'DECIDE_SUPPLIER_ACTION',
      description: 'Decide whether supplier corrective action is warranted.',
      requiredRole: 'supervisor',
      terminal: false,
      trace,
    };
  }

  if (ncr.supplierActionWarranted) {
    trace.push('Supplier corrective action warranted');
    return {
      code: 'RAISE_SUPPLIER_CORRECTIVE_ACTION',
      description:
        'Raise a supplier corrective action request (8D), request return material ' +
        'authorisation, and return the article to the vendor.',
      requiredRole: 'quality-manager',
      terminal: false,
      trace,
    };
  }

  trace.push('Supplier corrective action not warranted');
  return {
    code: 'RECORD_SCRAP_APPROVAL',
    description: 'Record the scrap disposition with a named approver and a documented reason.',
    requiredRole: 'supervisor',
    terminal: false,
    trace,
  };
}
