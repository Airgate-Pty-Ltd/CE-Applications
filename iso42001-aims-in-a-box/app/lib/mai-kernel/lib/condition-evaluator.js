/**
 * Condition Evaluator (mai-kernel/lib/condition-evaluator.js)
 *
 * Deterministic rule condition grammar with no LLM, no randomness.
 * Design Laws:
 * - Law 1: No LLM (pure operator logic only)
 * - Law 2: No randomness (same condition + data = same result always)
 * - Law 9: No side effects (pure evaluation)
 *
 * Operator Grammar:
 * - is_null, not_null
 * - is_empty, not_empty
 * - eq, ne, in
 * - length_gte, length_lt
 * - date_before_today, date_after_today
 * - linked_record_exists, linked_record_missing
 * - all[], any[], not{}
 *
 * Example condition:
 * {
 *   "all": [
 *     { "field": "certification_status", "eq": "expired" },
 *     { "field": "audit_days_ago", "length_gte": 365 }
 *   ]
 * }
 */

class ConditionEvaluator {
  /**
   * Evaluate a condition tree against event data
   *
   * @param {Object} condition - Condition tree with operators
   * @param {Object} data - Event data to evaluate against
   * @returns {boolean} true if condition is met
   */
  evaluate(condition, data) {
    if (!condition || typeof condition !== 'object') {
      // Empty condition = always true
      return true;
    }

    // NOTE: intentionally does NOT swallow errors here (e.g. an unknown
    // operator in a rule's condition tree). AT-15 (fault injection) requires
    // that this failure surface as a logged mai_error_log row with no
    // assessment written for that rule while other rules still complete —
    // that only works if the error propagates to the caller (kernel.js
    // processEvent's per-rule try/catch), which is the actual fail-quiet/
    // log-loud boundary (Design Law 3). Swallowing it here would silently
    // evaluate a malformed rule to `false` with no record of the failure.
    return this._evaluateNode(condition, data);
  }

  /**
   * Recursively evaluate a condition node
   *
   * @param {Object} node - Condition node
   * @param {Object} data - Event data
   * @returns {boolean}
   */
  _evaluateNode(node, data) {
    // Composite operators: all, any, not
    if (node.all !== undefined) {
      return this._evaluateAll(node.all, data);
    }
    if (node.any !== undefined) {
      return this._evaluateAny(node.any, data);
    }
    if (node.not !== undefined) {
      return !this._evaluateNode(node.not, data);
    }

    // Leaf operators: field + operator
    const field = node.field;
    if (!field) {
      throw new Error('Condition node missing field property');
    }

    const value = this._getFieldValue(field, data);

    // Null/empty checks
    if (node.is_null !== undefined) {
      return this._isNull(value);
    }
    if (node.not_null !== undefined) {
      return !this._isNull(value);
    }
    if (node.is_empty !== undefined) {
      return this._isEmpty(value);
    }
    if (node.not_empty !== undefined) {
      return !this._isEmpty(value);
    }

    // Comparison operators
    if (node.eq !== undefined) {
      return this._eq(value, node.eq);
    }
    if (node.ne !== undefined) {
      return !this._eq(value, node.ne);
    }
    if (node.in !== undefined) {
      return this._in(value, node.in);
    }

    // Length operators (string, array)
    if (node.length_gte !== undefined) {
      return this._lengthGte(value, node.length_gte);
    }
    if (node.length_lt !== undefined) {
      return this._lengthLt(value, node.length_lt);
    }

    // Date operators
    if (node.date_before_today !== undefined) {
      return this._dateBeforeToday(value);
    }
    if (node.date_after_today !== undefined) {
      return this._dateAfterToday(value);
    }

    // Linked record operators
    if (node.linked_record_exists !== undefined) {
      return this._linkedRecordExists(value, node.linked_record_exists);
    }
    if (node.linked_record_missing !== undefined) {
      return !this._linkedRecordExists(value, node.linked_record_missing);
    }

    throw new Error(`Unknown operator in condition node: ${JSON.stringify(node)}`);
  }

  /**
   * all[] operator: all subconditions must be true
   */
  _evaluateAll(conditions, data) {
    if (!Array.isArray(conditions)) {
      throw new Error('all[] requires an array of conditions');
    }

    return conditions.every(cond => this._evaluateNode(cond, data));
  }

  /**
   * any[] operator: at least one subcondition must be true
   */
  _evaluateAny(conditions, data) {
    if (!Array.isArray(conditions)) {
      throw new Error('any[] requires an array of conditions');
    }

    return conditions.some(cond => this._evaluateNode(cond, data));
  }

  /**
   * Get field value from data object (supports dot notation)
   * e.g., "audit.last_date" → data.audit.last_date
   */
  _getFieldValue(fieldPath, data) {
    if (!fieldPath || typeof fieldPath !== 'string') {
      throw new Error('Field path must be a non-empty string');
    }

    const parts = fieldPath.split('.');
    let value = data;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return null;
      }
      value = value[part];
    }

    return value;
  }

  /**
   * is_null check
   */
  _isNull(value) {
    return value === null || value === undefined;
  }

  /**
   * is_empty check (null, undefined, empty string, empty array)
   */
  _isEmpty(value) {
    if (value === null || value === undefined) {
      return true;
    }
    if (typeof value === 'string') {
      return value.trim() === '';
    }
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    return false;
  }

  /**
   * Equality check (strict)
   */
  _eq(a, b) {
    return a === b;
  }

  /**
   * Membership check
   */
  _in(value, list) {
    if (!Array.isArray(list)) {
      throw new Error('in[] requires an array');
    }
    return list.includes(value);
  }

  /**
   * Length >= check
   */
  _lengthGte(value, minLength) {
    if (value === null || value === undefined) {
      return false;
    }
    if (typeof value === 'string' || Array.isArray(value)) {
      return value.length >= minLength;
    }
    // Numbers: compare numeric value
    if (typeof value === 'number') {
      return value >= minLength;
    }
    return false;
  }

  /**
   * Length < check
   */
  _lengthLt(value, maxLength) {
    if (value === null || value === undefined) {
      return true; // null/undefined are "less than" a length
    }
    if (typeof value === 'string' || Array.isArray(value)) {
      return value.length < maxLength;
    }
    if (typeof value === 'number') {
      return value < maxLength;
    }
    return false;
  }

  /**
   * Date before today check
   * Expects ISO string or Date object
   */
  _dateBeforeToday(value) {
    if (!value) {
      return false;
    }

    try {
      const date = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return date < today;
    } catch (err) {
      return false;
    }
  }

  /**
   * Date after today check
   */
  _dateAfterToday(value) {
    if (!value) {
      return false;
    }

    try {
      const date = new Date(value);
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      return date > today;
    } catch (err) {
      return false;
    }
  }

  /**
   * Linked record exists check
   * In supplier context: checks if a related entity exists
   * (This is adapter-dependent; here we check for non-null/non-empty)
   */
  _linkedRecordExists(value, expectedType) {
    // Simplified: non-empty field = record exists
    return value !== null && value !== undefined && value !== '';
  }
}

module.exports = ConditionEvaluator;
