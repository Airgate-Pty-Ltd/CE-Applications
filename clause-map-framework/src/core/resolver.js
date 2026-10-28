/**
 * Conform-Edge Clause Map — Scope Resolver
 *
 * Deterministic, explainable applicability engine. Given an organization's
 * scope-of-business profile and a pack, it decides which items apply and
 * RECORDS WHY each included or excluded item was decided that way.
 *
 * FSA requirement: the intelligence layer must be explainable. This resolver
 * never returns a silent yes/no — every decision carries its reason, so the
 * app can show "clause 8.3 excluded: your scope has no design activity."
 *
 * Pure function, no dependencies. Runs identically in Node (build/test) and
 * in the browser (test UI, and later the Capacitor WebView).
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CEResolver = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * profile: {
   *   activities: string[],      // e.g. ["manufacture","design"]
   *   regulators: string[],      // e.g. ["FAA"]
   *   certifications: string[],   // e.g. ["AS9100D"]
   *   flags: string[]            // free-form org flags
   * }
   */
  function matchApplicability(appliesWhen, profile) {
    if (!appliesWhen) return { applies: true, reason: 'No scope condition — applies to all.' };

    const act = new Set(profile.activities || []);
    const reg = new Set(profile.regulators || []);
    const cert = new Set(profile.certifications || []);
    const flg = new Set(profile.flags || []);

    if (appliesWhen.activitiesAny && !appliesWhen.activitiesAny.some(a => act.has(a))) {
      return { applies: false, reason: `Scope has none of the required activities: ${appliesWhen.activitiesAny.join(', ')}.` };
    }
    if (appliesWhen.regulatorsAny && !appliesWhen.regulatorsAny.some(r => reg.has(r))) {
      return { applies: false, reason: `Scope is not under any required regulator: ${appliesWhen.regulatorsAny.join(', ')}.` };
    }
    if (appliesWhen.certificationsAny && !appliesWhen.certificationsAny.some(c => cert.has(c))) {
      return { applies: false, reason: `Scope does not hold a required certification: ${appliesWhen.certificationsAny.join(', ')}.` };
    }
    if (appliesWhen.flagsAll && !appliesWhen.flagsAll.every(f => flg.has(f))) {
      const missing = appliesWhen.flagsAll.filter(f => !flg.has(f));
      return { applies: false, reason: `Scope is missing required flags: ${missing.join(', ')}.` };
    }
    if (appliesWhen.excludeIfFlagsAny && appliesWhen.excludeIfFlagsAny.some(f => flg.has(f))) {
      const hit = appliesWhen.excludeIfFlagsAny.filter(f => flg.has(f));
      return { applies: false, reason: `Excluded by scope flag: ${hit.join(', ')}.` };
    }
    return { applies: true, reason: 'Scope matches all conditions.' };
  }

  /**
   * Resolve a full pack against a profile.
   * Returns { packId, applied:[{item,reason}], excluded:[{item,reason}], packApplies, packReason }.
   */
  function resolvePack(pack, profile) {
    const packLevel = matchApplicability(pack.appliesWhen, profile);
    const applied = [];
    const excluded = [];

    if (!packLevel.applies) {
      // Whole pack excluded — every item inherits the pack-level reason.
      (pack.items || []).forEach(item => excluded.push({ item, reason: `Pack excluded: ${packLevel.reason}` }));
      return { packId: pack.packId, applied, excluded, packApplies: false, packReason: packLevel.reason };
    }

    (pack.items || []).forEach(item => {
      const r = matchApplicability(item.appliesWhen, profile);
      if (r.applies) applied.push({ item, reason: r.reason });
      else excluded.push({ item, reason: r.reason });
    });

    return { packId: pack.packId, applied, excluded, packApplies: true, packReason: packLevel.reason };
  }

  return { matchApplicability, resolvePack };
});
