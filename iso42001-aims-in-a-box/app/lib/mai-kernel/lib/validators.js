/**
 * Validators Module (lib/mai-kernel/lib/validators.js)
 *
 * Validation rules for events, rule registrations, and assessments.
 * Design Law 3: Explicit validation prevents silent authority writes.
 * Design Law 10: Controlled terminology (severity, confidence, response taxonomy).
 *
 * ADAPTED FROM the reference kernel (2026-07-03-MAI-KERNEL-BUILD/mai-kernel) for
 * this host (ISO/IEC 42001 AIMS Command Center):
 *  - validateEvent(): the reference implementation hardcoded a fixed list of
 *    event types belonging to a different product (supplier.*, audit.created,
 *    audit.updated). That whitelist would reject every event this host emits
 *    (soa.created, risk.created, ...). Generalized to a closed shape check
 *    (`<record_type>.<action>`), since Design Law 11 requires the kernel to be
 *    host-agnostic — event *type* is validated structurally, not against a
 *    per-product enum.
 *  - validateRule() -> validateRuleRegistration(): now enforces the fields
 *    AT-13 requires at registry load time (ruleId, dimId, revision,
 *    effectiveDate, approvedBy, condition, findingText, severity in
 *    {major,minor}) per rule-template.json.
 *  - validateAssessment(): field names/shape updated to match this host's
 *    mai_assessments schema (dim_id, resolution_hint, clause_refs, status,
 *    response taxonomy of confirm/dismiss_incorrect/not_applicable/null).
 */

const EVENT_TYPE_SHAPE = /^[a-z_]+\.[a-z_]+$/;

class Validators {
  /**
   * Validate event structure. Host-agnostic: any `<record_type>.<action>`
   * event_type is accepted; the manifest `subscribesTo` list (not this
   * validator) decides which DIMs/rules react to it.
   */
  static validateEvent(event) {
    if (!event || typeof event !== 'object') {
      return 'Event must be an object';
    }
    if (!event.event_type || typeof event.event_type !== 'string') {
      return 'event_type required and must be string';
    }
    if (!EVENT_TYPE_SHAPE.test(event.event_type)) {
      return 'event_type must match "<record_type>.<action>" (lowercase, underscore-separated)';
    }
    if (!event.record_type || typeof event.record_type !== 'string') {
      return 'record_type required and must be string';
    }
    if (!event.record_id || typeof event.record_id !== 'string') {
      return 'record_id required and must be string';
    }
    if (!event.tenant_id || typeof event.tenant_id !== 'string') {
      return 'tenant_id required (Design Law 9: tenant-scoped)';
    }
    if (!event.data || typeof event.data !== 'object') {
      return 'data required and must be object';
    }
    if (!event.snapshot_hash || typeof event.snapshot_hash !== 'string') {
      return 'snapshot_hash required (must be precomputed via kernel.hashSnapshot before processEvent)';
    }
    return null;
  }

  /**
   * Validate a rule at REGISTRY LOAD time (DIM/rule JSON file), per AT-13:
   * missing ruleId/revision/effectiveDate/approvedBy must fail loudly so the
   * rule is excluded from the active registry (host unaffected).
   */
  static validateRuleRegistration(rule) {
    if (!rule || typeof rule !== 'object') {
      return 'Rule must be an object';
    }
    if (!rule.ruleId || typeof rule.ruleId !== 'string') {
      return 'rule.ruleId required and must be string';
    }
    if (!rule.dimId || typeof rule.dimId !== 'string') {
      return 'rule.dimId required and must be string';
    }
    if (rule.revision === undefined || rule.revision === null || typeof rule.revision !== 'number') {
      return 'rule.revision required and must be a number';
    }
    if (!rule.effectiveDate || typeof rule.effectiveDate !== 'string') {
      return 'rule.effectiveDate required and must be an ISO date string';
    }
    if (!rule.approvedBy || typeof rule.approvedBy !== 'string') {
      return 'rule.approvedBy required and must be string';
    }
    if (!rule.approvalRef || typeof rule.approvalRef !== 'string') {
      return 'rule.approvalRef required and must be string';
    }
    if (!rule.condition || typeof rule.condition !== 'object') {
      return 'rule.condition required and must be object';
    }
    if (!rule.findingText || typeof rule.findingText !== 'string') {
      return 'rule.findingText required and must be string';
    }
    if (!rule.resolutionHint || typeof rule.resolutionHint !== 'string') {
      return 'rule.resolutionHint required and must be string';
    }
    const validSeverities = ['major', 'minor'];
    if (!validSeverities.includes(rule.severity)) {
      return `rule.severity must be one of: ${validSeverities.join(', ')}`;
    }
    if (!Array.isArray(rule.clauseRefs)) {
      return 'rule.clauseRefs required and must be an array';
    }
    return null;
  }

  /**
   * Validate an assessment object before persistence.
   */
  static validateAssessment(assessment) {
    if (!assessment || typeof assessment !== 'object') {
      return 'Assessment must be an object';
    }
    const requiredStrings = [
      'id', 'tenant_id', 'event_id', 'dim_id', 'rule_id',
      'record_type', 'record_id', 'snapshot_hash', 'finding_text', 'row_hash'
    ];
    for (const field of requiredStrings) {
      if (!assessment[field] || typeof assessment[field] !== 'string') {
        return `assessment.${field} required and must be string`;
      }
    }
    if (typeof assessment.rule_revision !== 'number') {
      return 'assessment.rule_revision required and must be number';
    }
    if (typeof assessment.logic_result !== 'boolean') {
      return 'assessment.logic_result required and must be boolean';
    }
    const validConfidences = ['high', 'medium', 'low'];
    if (!validConfidences.includes(assessment.data_confidence)) {
      return `assessment.data_confidence must be one of: ${validConfidences.join(', ')}`;
    }
    const validSeverities = ['major', 'minor'];
    if (!validSeverities.includes(assessment.severity)) {
      return `assessment.severity must be one of: ${validSeverities.join(', ')}`;
    }
    if (assessment.tier !== 'system_detected_condition') {
      return "assessment.tier must be 'system_detected_condition' (Design Law 8: controlled terminology)";
    }
    const validStatuses = ['active', 'superseded', 'resolved'];
    if (!validStatuses.includes(assessment.status)) {
      return `assessment.status must be one of: ${validStatuses.join(', ')}`;
    }
    const validResponses = ['confirm', 'dismiss_incorrect', 'not_applicable'];
    if (assessment.response !== null && !validResponses.includes(assessment.response)) {
      return `assessment.response must be null or one of: ${validResponses.join(', ')}`;
    }
    if (typeof assessment.created_at !== 'string') {
      return 'assessment.created_at required and must be ISO string';
    }
    return null;
  }

  static isValidOperator(operator) {
    const validOps = [
      'is_null', 'not_null',
      'is_empty', 'not_empty',
      'eq', 'ne', 'in',
      'length_gte', 'length_lt',
      'date_before_today', 'date_after_today',
      'linked_record_exists', 'linked_record_missing',
      'all', 'any', 'not'
    ];
    return validOps.includes(operator);
  }
}

module.exports = Validators;
