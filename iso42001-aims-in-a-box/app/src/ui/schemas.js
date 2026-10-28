/*!
 * schemas.js — record type definitions for AIMS-in-a-Box
 * (c) 2026 Conform-Edge Quality Consulting LLC. Proprietary. All rights reserved.
 *
 * One schema per record type drives the generic table view, the generic drawer
 * form, status badge coloring, and empty-state copy. Adding a new record type
 * to this app means adding one entry here — not building a new screen.
 *
 * Status tone mapping is deliberately restricted to critical / warning / positive /
 * neutral for ordinary record status. The "advisory" (purple) tone is reserved
 * exclusively for M-AI System-Detected Conditions, per the FSA visual design system
 * ("Status colors are intentional and reserved").
 *
 * --- 2026-07-12 field-name reconciliation (Bug 1 fix) ---
 * Every field key below was re-verified directly against the real backend route
 * files (src/routes/*.js FIELDS arrays) and src/db/schema.sql, not just against
 * the earlier documented API contract. Several fields present in the ORIGINAL
 * version of this file had no backing column at all (e.g. SoA `reviewDate`/
 * `evidenceRef`, Risk `category`, Objectives `metric`/`target`/`current`,
 * Audits `owner`/`dueDate`, NCR `title`/`source`/`severity`/`owner`, Competence
 * `competenceArea`/`requiredLevel`/`currentLevel`/`evidenceRef`) — those were
 * removed rather than renamed, because keeping an unsupported field in the form
 * reproduces the exact "looks like it saved, silently didn't" defect this pass
 * exists to fix. Several select fields also previously offered values the
 * database's CHECK constraints reject outright (Treatments/NCR status only
 * allow 'open'/'closed'; Audit severity only allows 'major'/'minor') — those
 * option lists were corrected to match schema.sql exactly. See
 * RISKS-AND-BOUNDARIES.md section 7 for the full before/after mapping.
 */
(function () {

  function toneBadge(tone, label) {
    return { tone: tone, label: label };
  }

  // ---- SoA — Statement of Applicability (ISO/IEC 42001 Annex A controls) ----
  // Backend fields (src/routes/soa.js): controlRef*, controlTitle*, applicability*,
  // justification, status, owner. (* = required). No reviewDate/evidenceRef column exists.
  var soa = {
    key: 'soa',
    apiPath: '/api/soa',
    label: 'SoA',
    fullLabel: 'Statement of Applicability',
    singular: 'SoA Entry',
    idField: 'controlRef',
    titleField: 'controlTitle',
    statusField: 'status',
    statusMap: {
      not_started: toneBadge('neutral', 'Not Started'),
      partial: toneBadge('warning', 'Partial'),
      implemented: toneBadge('positive', 'Implemented'),
      not_applicable: toneBadge('neutral', 'Not Applicable')
    },
    columns: [
      { key: 'controlRef', label: 'Control', mono: true },
      { key: 'controlTitle', label: 'Control Title' },
      { key: '__status', label: 'Status' },
      { key: 'owner', label: 'Owner' }
    ],
    formGroups: [
      [
        { key: 'controlRef', label: 'Control Reference', type: 'text', required: true, placeholder: 'A.6.2.2' },
        { key: 'controlTitle', label: 'Control Title', type: 'text', required: true },
        { key: 'applicability', label: 'Applicability', type: 'select', required: true,
          options: [['applicable', 'Applicable'], ['not_applicable', 'Not Applicable']] }
      ],
      [
        { key: 'justification', label: 'Justification', type: 'textarea' }
      ],
      [
        { key: 'status', label: 'Implementation Status', type: 'select',
          options: [['not_started', 'Not Started'], ['partial', 'Partial'], ['implemented', 'Implemented'], ['not_applicable', 'Not Applicable']] },
        { key: 'owner', label: 'Owner', type: 'text' }
      ]
    ],
    detailLevel1: [
      { key: 'controlRef', label: 'Control' },
      { key: '__status', label: 'Status' },
      { key: 'owner', label: 'Owner' }
    ],
    emptyState: {
      title: 'No Statement of Applicability entries yet',
      body: 'ISO/IEC 42001 Annex A requires a documented, justified applicability decision for every AI management control. Without this, the AIMS has no defensible scope boundary.',
      actionLabel: '+ Add first SoA entry'
    }
  };

  // ---- Risk Register ----
  // Backend fields (src/routes/risks.js): riskRef*, description*, likelihood,
  // impact, score (computed — never user-entered), owner, status. No `category`
  // or `title` column exists; `description` is the record's title text.
  var risks = {
    key: 'risks',
    apiPath: '/api/risks',
    label: 'Risks',
    fullLabel: 'Risk Register',
    singular: 'Risk',
    idField: 'riskRef',
    titleField: 'description',
    statusField: 'status',
    statusMap: {
      open: toneBadge('warning', 'Open'),
      mitigating: toneBadge('neutral', 'Mitigating'),
      closed: toneBadge('positive', 'Closed')
    },
    columns: [
      { key: 'riskRef', label: 'Risk', mono: true },
      { key: 'description', label: 'Description' },
      { key: '__riskScore', label: 'Score', mono: true },
      { key: '__status', label: 'Status' },
      { key: 'owner', label: 'Owner' }
    ],
    formGroups: [
      [
        { key: 'riskRef', label: 'Risk Reference', type: 'text', required: true, placeholder: 'RISK-0007' },
        { key: 'owner', label: 'Owner', type: 'text' }
      ],
      [
        { key: 'description', label: 'Description', type: 'textarea', required: true }
      ],
      [
        // Score is NOT a form field — it is server-computed from these two
        // (likelihood x impact) on every create/update. See computed() below,
        // which prefers the authoritative server value once one exists.
        { key: 'likelihood', label: 'Likelihood (1-5)', type: 'number', min: 1, max: 5, required: true },
        { key: 'impact', label: 'Impact (1-5)', type: 'number', min: 1, max: 5, required: true }
      ],
      [
        { key: 'status', label: 'Status', type: 'select', options: [['open', 'Open'], ['mitigating', 'Mitigating'], ['closed', 'Closed']] }
      ]
    ],
    computed: function (r) {
      var l = Number(r.likelihood) || 0, i = Number(r.impact) || 0;
      var serverScore = (r.score !== undefined && r.score !== null && r.score !== '') ? Number(r.score) : null;
      r.__riskScoreValue = serverScore !== null ? serverScore : (l * i);
      r.__riskScore = serverScore !== null ? String(serverScore) : (l && i ? String(l * i) : '—');
    },
    detailLevel1: [
      { key: 'riskRef', label: 'Risk Ref' },
      { key: 'id', label: 'Record ID (for linking treatments)' },
      { key: '__status', label: 'Status' },
      { key: '__riskScore', label: 'Risk Score (auto-computed)' },
      { key: 'owner', label: 'Owner' }
    ],
    relatedLabel: 'Treatments addressing this risk',
    relatedType: 'treatments',
    relatedMatch: function (risk, treatment) { return treatment.riskId === risk.id; },
    emptyState: {
      title: 'No risks recorded',
      body: 'Clause 6.1 requires the organization to identify and assess AI risks before it can select treatments. An empty register means AI risk is currently unassessed, not absent.',
      actionLabel: '+ Add first risk'
    }
  };

  // ---- Risk Treatments ----
  // Backend fields (src/routes/treatments.js): riskId, soaControlRef, description*,
  // targetDate, status, owner. `status` is DB-constrained to 'open'/'closed' only
  // (schema.sql CHECK) — the previous planned/in_progress/complete/verified
  // options would have thrown a CHECK-constraint DB error on save.
  var treatments = {
    key: 'treatments',
    apiPath: '/api/treatments',
    label: 'Treatments',
    fullLabel: 'Risk Treatments',
    singular: 'Treatment',
    idField: 'id',
    titleField: 'description',
    statusField: 'status',
    statusMap: {
      open: toneBadge('warning', 'Open'),
      closed: toneBadge('positive', 'Closed')
    },
    columns: [
      { key: 'description', label: 'Description' },
      { key: 'riskId', label: 'Linked Risk (ID)', mono: true },
      { key: 'soaControlRef', label: 'SoA Control', mono: true },
      { key: '__status', label: 'Status' },
      { key: 'owner', label: 'Owner' },
      { key: 'targetDate', label: 'Target Date', date: true }
    ],
    formGroups: [
      [
        { key: 'riskId', label: 'Linked Risk (Record ID)', type: 'text', placeholder: "paste the Risk's Record ID (see its detail view)" },
        { key: 'soaControlRef', label: 'SoA Control Reference', type: 'text', placeholder: 'A.6.2.2' }
      ],
      [
        { key: 'description', label: 'Treatment Description', type: 'textarea', required: true }
      ],
      [
        { key: 'owner', label: 'Owner', type: 'text' },
        { key: 'targetDate', label: 'Target Date', type: 'date' },
        { key: 'status', label: 'Status', type: 'select', options: [['open', 'Open'], ['closed', 'Closed']] }
      ]
    ],
    detailLevel1: [
      { key: 'id', label: 'Record ID' },
      { key: '__status', label: 'Status' },
      { key: 'owner', label: 'Owner' },
      { key: 'targetDate', label: 'Target Date', date: true }
    ],
    relatedLabel: 'Linked risk',
    relatedType: 'risks',
    relatedMatch: function (treatment, risk) { return treatment.riskId === risk.id; },
    emptyState: {
      title: 'No treatments recorded',
      body: 'Every open risk needs a documented treatment plan and owner. With none recorded, open risks in the register have no path to closure.',
      actionLabel: '+ Add first treatment'
    }
  };

  // ---- Objectives (Clause 6.2) ----
  // Backend fields (src/routes/objectives.js): objectiveText*, measurableTarget,
  // owner, dueDate, status. No metric/target/current columns exist.
  var objectives = {
    key: 'objectives',
    apiPath: '/api/objectives',
    label: 'Objectives',
    fullLabel: 'AIMS Objectives',
    singular: 'Objective',
    idField: 'id',
    titleField: 'objectiveText',
    statusField: 'status',
    statusMap: {
      on_track: toneBadge('positive', 'On Track'),
      at_risk: toneBadge('warning', 'At Risk'),
      missed: toneBadge('critical', 'Missed'),
      achieved: toneBadge('positive', 'Achieved')
    },
    columns: [
      { key: 'objectiveText', label: 'Statement' },
      { key: 'measurableTarget', label: 'Measurable Target' },
      { key: '__status', label: 'Status' },
      { key: 'owner', label: 'Owner' },
      { key: 'dueDate', label: 'Due', date: true }
    ],
    formGroups: [
      [
        { key: 'objectiveText', label: 'Objective Statement', type: 'textarea', required: true }
      ],
      [
        { key: 'measurableTarget', label: 'Measurable Target', type: 'text', placeholder: 'e.g. 95% of AI systems risk-assessed by Q4 2026' }
      ],
      [
        { key: 'owner', label: 'Owner', type: 'text' },
        { key: 'dueDate', label: 'Due Date', type: 'date' },
        { key: 'status', label: 'Status', type: 'select',
          options: [['on_track', 'On Track'], ['at_risk', 'At Risk'], ['missed', 'Missed'], ['achieved', 'Achieved']] }
      ]
    ],
    detailLevel1: [
      { key: '__status', label: 'Status' },
      { key: 'measurableTarget', label: 'Measurable Target' },
      { key: 'owner', label: 'Owner' },
      { key: 'dueDate', label: 'Due', date: true }
    ],
    emptyState: {
      title: 'No AIMS objectives set',
      body: 'Clause 6.2 requires measurable objectives for the AI management system, tracked to completion. Without objectives, there is nothing for management review to evaluate progress against.',
      actionLabel: '+ Add first objective'
    }
  };

  // ---- Audit Findings ----
  // Backend fields (src/routes/audits.js): findingRef*, description*, severity*,
  // clauseRef, status. No owner/dueDate column exists. severity is DB-constrained
  // to 'major'/'minor' only (schema.sql CHECK) — 'observation' would throw.
  var audits = {
    key: 'audits',
    apiPath: '/api/audits',
    label: 'Audits',
    fullLabel: 'Audit Findings',
    singular: 'Audit Finding',
    idField: 'findingRef',
    titleField: 'description',
    statusField: 'status',
    statusMap: {
      open: toneBadge('critical', 'Open'),
      in_progress: toneBadge('warning', 'In Progress'),
      closed: toneBadge('positive', 'Closed'),
      verified: toneBadge('positive', 'Verified')
    },
    severityMap: {
      major: toneBadge('critical', 'Major'),
      minor: toneBadge('warning', 'Minor')
    },
    columns: [
      { key: 'findingRef', label: 'Finding', mono: true },
      { key: 'clauseRef', label: 'Clause', mono: true },
      { key: '__severity', label: 'Severity' },
      { key: '__status', label: 'Status' }
    ],
    formGroups: [
      [
        { key: 'findingRef', label: 'Finding Reference', type: 'text', required: true, placeholder: 'AF-2026-011' },
        { key: 'clauseRef', label: 'Clause Reference', type: 'text', placeholder: 'ISO/IEC 42001 §9.2' }
      ],
      [
        { key: 'description', label: 'Finding Description', type: 'textarea', required: true }
      ],
      [
        { key: 'severity', label: 'Severity', type: 'select', required: true, options: [['major', 'Major'], ['minor', 'Minor']] },
        { key: 'status', label: 'Status', type: 'select',
          options: [['open', 'Open'], ['in_progress', 'In Progress'], ['closed', 'Closed'], ['verified', 'Verified']] }
      ]
    ],
    detailLevel1: [
      { key: 'findingRef', label: 'Finding ID' },
      { key: 'id', label: 'Record ID (for linking NCRs)' },
      { key: '__severity', label: 'Severity' },
      { key: '__status', label: 'Status' }
    ],
    emptyState: {
      title: 'No audit findings recorded',
      body: 'No internal or certification audit has logged a finding against the AIMS yet. Confirm whether this reflects a clean audit or that audits have not yet been executed.',
      actionLabel: '+ Log a finding'
    }
  };

  // ---- NCRs ----
  // Backend fields (src/routes/ncrs.js): ncrRef*, description*, correctiveAction,
  // dueDate, status, linkedFindingId. No title/source/severity/owner column
  // exists. status is DB-constrained to 'open'/'closed' only (schema.sql CHECK).
  var ncrs = {
    key: 'ncrs',
    apiPath: '/api/ncrs',
    label: 'NCRs',
    fullLabel: 'Non-Conformance Reports',
    singular: 'NCR',
    idField: 'ncrRef',
    titleField: 'description',
    statusField: 'status',
    statusMap: {
      open: toneBadge('critical', 'Open'),
      closed: toneBadge('positive', 'Closed')
    },
    columns: [
      { key: 'ncrRef', label: 'NCR', mono: true },
      { key: 'description', label: 'Description' },
      { key: 'linkedFindingId', label: 'Linked Finding', mono: true },
      { key: '__status', label: 'Status' },
      { key: 'dueDate', label: 'Due', date: true }
    ],
    formGroups: [
      [
        { key: 'ncrRef', label: 'NCR Reference', type: 'text', required: true, placeholder: 'NCR-2026-004' }
      ],
      [
        { key: 'description', label: 'Description', type: 'textarea', required: true }
      ],
      [
        { key: 'correctiveAction', label: 'Corrective Action', type: 'textarea' }
      ],
      [
        { key: 'dueDate', label: 'Due Date', type: 'date' },
        { key: 'linkedFindingId', label: 'Linked Audit Finding (Record ID)', type: 'text', placeholder: "paste the Finding's Record ID (see its detail view)" },
        { key: 'status', label: 'Status', type: 'select', options: [['open', 'Open'], ['closed', 'Closed']] }
      ]
    ],
    detailLevel1: [
      { key: 'ncrRef', label: 'NCR ID' },
      { key: '__status', label: 'Status' },
      { key: 'dueDate', label: 'Due', date: true }
    ],
    emptyState: {
      title: 'No non-conformances recorded',
      body: 'No NCRs are open against the AI management system. If monitoring or audits have run recently, confirm this reflects genuine conformance rather than a gap in detection.',
      actionLabel: '+ Log an NCR'
    }
  };

  // ---- Competence ----
  // Backend fields (src/routes/competence.js): personName*, role, lastReviewDate*,
  // competenceReviewDueDate (computed — never user-entered), status. No
  // competenceArea/requiredLevel/currentLevel/evidenceRef column exists.
  var competence = {
    key: 'competence',
    apiPath: '/api/competence',
    label: 'Competence',
    fullLabel: 'Competence Records',
    singular: 'Competence Record',
    idField: 'personName',
    titleField: 'role',
    statusField: 'status',
    statusMap: {
      competent: toneBadge('positive', 'Competent'),
      gap: toneBadge('critical', 'Gap'),
      in_training: toneBadge('warning', 'In Training')
    },
    columns: [
      { key: 'personName', label: 'Person' },
      { key: 'role', label: 'Role' },
      { key: '__status', label: 'Status' },
      { key: 'lastReviewDate', label: 'Last Review', date: true },
      { key: 'competenceReviewDueDate', label: 'Review Due (auto)', date: true }
    ],
    formGroups: [
      [
        { key: 'personName', label: 'Person Name', type: 'text', required: true },
        { key: 'role', label: 'Role', type: 'text' }
      ],
      [
        // competenceReviewDueDate is intentionally NOT a form field — the
        // backend derives it as last_review_date + 365 days on every write
        // and rejects any client-supplied value for that column silently
        // (see src/routes/competence.js). It is shown read-only above/below.
        { key: 'lastReviewDate', label: 'Last Review Date', type: 'date', required: true }
      ],
      [
        { key: 'status', label: 'Status', type: 'select',
          options: [['competent', 'Competent'], ['gap', 'Gap'], ['in_training', 'In Training']] }
      ]
    ],
    detailLevel1: [
      { key: 'personName', label: 'Person' },
      { key: '__status', label: 'Status' },
      { key: 'role', label: 'Role' },
      { key: 'lastReviewDate', label: 'Last Reviewed', date: true },
      { key: 'competenceReviewDueDate', label: 'Review Due (auto-computed)', date: true }
    ],
    emptyState: {
      title: 'No competence records yet',
      body: 'Clause 7.2 requires demonstrable AI-relevant competence for personnel affecting AIMS performance. With no records, competence is currently unverifiable at audit.',
      actionLabel: '+ Add competence record'
    }
  };

  window.RECORD_TYPES = {
    soa: soa,
    risks: risks,
    treatments: treatments,
    objectives: objectives,
    audits: audits,
    ncrs: ncrs,
    competence: competence
  };

  window.RECORD_TYPE_ORDER = ['soa', 'risks', 'treatments', 'objectives', 'audits', 'ncrs', 'competence'];

})();
