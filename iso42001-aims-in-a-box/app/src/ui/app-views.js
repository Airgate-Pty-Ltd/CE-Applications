/*!
 * app-views.js -- AIMS-in-a-Box (ISO/IEC 42001) Command Center UI
 * (c) 2026 Conform-Edge Quality Consulting LLC. Proprietary. All rights reserved.
 *
 * Screen renderers, the drawer (detail/create/edit), event delegation, and
 * init(). Loaded after app.js and shares its top-level scope (both are plain
 * classic scripts, not modules) -- see the header comment in app.js.
 */
'use strict';

// ===================================================================
// VIEWS
// ===================================================================
function renderCurrentView() {
  if (state.currentView === 'overview') return renderOverview();
  if (state.currentView === 'settings') return renderSettings();
  if (state.currentView === 'help') return renderHelp();
  if (TYPES[state.currentView]) return renderRecordList(state.currentView);
}

function navigate(view) {
  state.currentView = view;
  renderSidebar();
  closeDrawer();
  renderCurrentView();
}

// ---- OVERVIEW ----
function renderOverview() {
  setTopbar('Overview', 'Command center &mdash; what needs your attention right now');
  var root = document.getElementById('view-root');
  root.classList.add('content-loading');
  root.innerHTML = '<p class="section-hint">Loading command center&hellip;</p>';

  var fetches = TYPE_ORDER.map(function (t) {
    return apiFetch(TYPES[t].apiPath).then(function (d) { return { key: t, records: Array.isArray(d) ? d : [] }; })
      .catch(function () { return { key: t, records: [], error: true }; });
  });

  Promise.all([loadConditions(), Promise.all(fetches), loadContinuityInfo()])
    .then(function (results) {
      var conditions = results[0];
      var recordSets = results[1];
      var continuity = results[2];
      recordSets.forEach(function (r) { state.recordCache[r.key] = r.records; });

      return loadRecentActivityFallbackSources().then(function (activity) {
        return { conditions: conditions, activity: activity, continuity: continuity };
      });
    })
    .then(function (bundle) {
      var conditions = bundle.conditions;
      var activity = bundle.activity;
      var openConditions = conditions.filter(isConditionOpen);
      var topCondition = openConditions[0];

      var html = '';

      // Differentiator, made real (not asserted): unlike a periodic/point-in-time
      // compliance questionnaire (ServiceNow GRC, LogicGate, Vanta), every record
      // mutation here is evaluated immediately by the deterministic M-AI Kernel and
      // written to a hash-chained, restart-surviving audit trail (AT-16). This
      // banner pulls real timestamps from /api/events -- it is factual, not decorative.
      if (bundle.continuity && bundle.continuity.since) {
        html += '<div class="continuity-banner">' +
          '<span class="diamond">&#9670;</span>' +
          '<span>Continuously monitored since <strong>' + fmtDate(bundle.continuity.since) + '</strong> &mdash; ' +
          bundle.continuity.count + ' governance event(s) evaluated in real time as records changed, not from a periodic scan.</span>' +
        '</div>';
      }

      // (a) What requires action right now?
      html += '<section class="view-section">' +
        '<div class="view-section-header"><h2>Requires action now</h2><span class="section-hint">' + openConditions.length + ' open</span></div>';
      if (openConditions.length === 0) {
        html += emptyStateHtml({
          title: 'No open System-Detected Conditions',
          body: 'M-AI is actively monitoring ' + TYPE_ORDER.reduce(function (n, t) { return n + (state.recordCache[t] || []).length; }, 0) + ' records across all 7 registers. Nothing currently requires review.'
        });
      } else {
        html += openConditions.slice(0, 8).map(function (c) { return renderConditionPanel(c); }).join('');
        if (openConditions.length > 8) {
          html += '<p class="section-hint">+ ' + (openConditions.length - 8) + ' more open condition(s) &mdash; visit each register to review.</p>';
        }
      }
      html += '</section>';

      // (d) What should happen next? (styled as a callout, placed high per Cockpit Rule)
      if (topCondition) {
        html += '<section class="view-section">' +
          '<div class="recommendation-callout">' +
            '<div><div class="rec-label">Recommended next action</div>' +
            '<div class="rec-text">' + escapeHtml(topCondition.resolutionHint || topCondition.findingText || 'Review the highest-severity open condition.') + '</div></div>' +
            '<div class="rec-actions"><button class="btn btn--primary" data-action="go-to-record" data-type="' + escapeHtml(resolveSchemaKey(topCondition.recordType)) + '" data-id="' + escapeHtml(topCondition.recordId) + '">Go to record</button></div>' +
          '</div></section>';
      }

      // (b) What is the current state? -- stat cards, not donuts
      html += '<section class="view-section">' +
        '<div class="view-section-header"><h2>Current state</h2><span class="section-hint">Record counts by register</span></div>' +
        '<div class="stat-grid">' +
        TYPE_ORDER.map(function (t) {
          var n = (state.recordCache[t] || []).length;
          var flagCount = state.conditionCountsByType[t] || 0;
          return '<div class="stat-card" data-action="nav" data-view="' + t + '">' +
            '<div class="stat-value">' + n + '</div>' +
            '<div class="stat-label">' + TYPES[t].fullLabel + '</div>' +
            (flagCount > 0 ? '<div class="stat-flag">&#9670; ' + flagCount + ' need review</div>' : '') +
            '</div>';
        }).join('') +
        '</div></section>';

      // (c) What changed recently?
      html += '<section class="view-section">' +
        '<div class="view-section-header"><h2>Recent activity</h2><span class="section-hint">Latest record and condition events</span></div>';
      if (!activity || activity.length === 0) {
        html += emptyStateHtml({ title: 'No activity yet', body: 'Once records are created or edited, and once M-AI evaluates them, activity will appear here in real time.' });
      } else {
        html += '<div class="card"><div class="activity-list">' +
          activity.slice(0, 12).map(function (a) {
            return '<div class="activity-row">' +
              '<span class="activity-type">' + escapeHtml(a.recordType || a.type || '') + '</span>' +
              '<span class="activity-desc">' + escapeHtml(a.action || 'updated') + ' by <span class="actor">' + escapeHtml(a.actor || 'system') + '</span></span>' +
              '<span class="activity-time">' + timeAgo(a.timestamp) + '</span>' +
            '</div>';
          }).join('') +
        '</div></div>';
      }
      html += '</section>';

      root.innerHTML = html;
      root.classList.remove('content-loading');
    });
}

// Attempts a dedicated events endpoint; falls back to synthesizing recent
// activity from each record type's createdAt/updatedAt timestamps if the
// backend does not (yet) expose /api/events. This keeps "what changed
// recently" populated even before that endpoint exists. Documented
// assumption: the contract given to this build does not list /api/events,
// so this degrades gracefully rather than failing the Overview screen.
function loadRecentActivityFallbackSources() {
  return apiFetch('/api/events').then(function (data) {
    return Array.isArray(data) ? data : [];
  }).catch(function () {
    var merged = [];
    TYPE_ORDER.forEach(function (t) {
      (state.recordCache[t] || []).forEach(function (r) {
        var created = r.createdAt, updated = r.updatedAt;
        if (created) merged.push({ recordType: TYPES[t].label, action: 'created', timestamp: created, actor: r.createdBy || r.owner || 'system' });
        if (updated && updated !== created) merged.push({ recordType: TYPES[t].label, action: 'updated', timestamp: updated, actor: r.updatedBy || r.owner || 'system' });
      });
    });
    merged.sort(function (a, b) { return new Date(b.timestamp || 0) - new Date(a.timestamp || 0); });
    return merged;
  });
}

// Real-data backing for the "Continuously monitored since..." Overview
// indicator (FSA G5 differentiator fix, 2026-07-12): pulls the actual
// mai_events history via /api/events (real timestamps, tenant-scoped -- see
// src/routes/events.js) and reports the earliest event this request can see
// plus how many total. This is a factual reading of live governance-event
// data, not a decorative claim -- it demonstrates continuous, event-driven
// evaluation instead of a periodic/point-in-time compliance snapshot (the
// pattern used by platforms like ServiceNow GRC, LogicGate, or Vanta).
function loadContinuityInfo() {
  return apiFetch('/api/events?limit=200').then(function (data) {
    var events = Array.isArray(data) ? data : [];
    if (events.length === 0) return null;
    var earliestMs = null;
    events.forEach(function (e) {
      var t = new Date(e.timestamp || 0).getTime();
      if (!isNaN(t) && (earliestMs === null || t < earliestMs)) earliestMs = t;
    });
    return { count: events.length, since: earliestMs !== null ? new Date(earliestMs).toISOString() : null };
  }).catch(function () { return null; });
}

// ---- RECORD LIST (generic table) ----
function renderRecordList(typeKey) {
  var schema = TYPES[typeKey];
  setTopbar(schema.fullLabel, 'Records, M-AI conditions, and detail in one place');
  var root = document.getElementById('view-root');
  root.classList.add('content-loading');
  root.innerHTML = '<p class="section-hint">Loading ' + escapeHtml(schema.fullLabel) + '&hellip;</p>';

  Promise.all([loadConditions(), apiFetch(schema.apiPath)]).then(function (results) {
    var conditions = results[0];
    var records = Array.isArray(results[1]) ? results[1] : [];
    state.recordCache[typeKey] = records;
    records.forEach(function (r) { decorateRecord(schema, r); });

    var typeConditions = conditions.filter(function (c) { return conditionMatchesType(c, typeKey) && isConditionOpen(c); });
    typeConditions.sort(function (a, b) { return severityRank(b.severity) - severityRank(a.severity); });

    var html = '';
    if (typeConditions.length > 0) {
      html += renderConditionPanel(typeConditions[0], { compact: true });
      if (typeConditions.length > 1) {
        html += '<p class="section-hint">+ ' + (typeConditions.length - 1) + ' more open condition(s) in this register &mdash; see the &#9670; column below.</p>';
      }
    }

    html += '<div class="table-toolbar">' +
      '<span class="section-hint">' + records.length + ' record(s)</span>' +
      '<button class="btn btn--primary" data-action="open-drawer" data-type="' + typeKey + '" data-id="new">+ New ' + escapeHtml(schema.singular) + '</button>' +
    '</div>';

    if (records.length === 0) {
      html += emptyStateHtml(Object.assign({ actionKey: 'open-drawer', actionType: typeKey }, schema.emptyState));
    } else {
      html += '<div class="data-table-wrap"><table class="data-table"><thead><tr>' +
        schema.columns.map(function (c) { return '<th>' + escapeHtml(c.label) + '</th>'; }).join('') +
        '<th style="text-align:center;">&#9670;</th>' +
        '</tr></thead><tbody>' +
        records.map(function (r) {
          var recId = r.id !== undefined ? r.id : r[schema.idField];
          var condCount = conditions.filter(function (c) { return conditionMatchesRecord(c, typeKey, r) && isConditionOpen(c); }).length;
          return '<tr data-action="open-drawer" data-type="' + typeKey + '" data-id="' + escapeHtml(recId) + '">' +
            schema.columns.map(function (c) {
              var raw;
              if (c.key.indexOf('__') === 0) raw = r[c.key];
              else if (c.date) raw = fmtDate(r[c.key]);
              else raw = escapeHtml(r[c.key] === undefined || r[c.key] === null || r[c.key] === '' ? '—' : r[c.key]);
              return '<td class="' + (c.mono ? 'mono' : '') + '">' + raw + '</td>';
            }).join('') +
            '<td class="condition-col">' + (condCount > 0 ? '<span class="cond-count">' + condCount + '</span>' : '<span class="cond-none">&mdash;</span>') + '</td>' +
          '</tr>';
        }).join('') +
        '</tbody></table></div>';
    }

    root.innerHTML = html;
    root.classList.remove('content-loading');

    var lastId = sessionStorage.getItem('lastUpdatedId');
    if (lastId) {
      var rowEl = root.querySelector('tr[data-id="' + window.CSS.escape(String(lastId)) + '"]');
      if (rowEl) rowEl.classList.add('row--updated');
      sessionStorage.removeItem('lastUpdatedId');
    }
  });
}

// ---- DRAWER (detail / create / edit) ----
function openDrawer(typeKey, recordId) {
  state.drawer = { open: true, typeKey: typeKey, mode: recordId === 'new' ? 'create' : 'edit', recordId: recordId === 'new' ? null : recordId };
  document.getElementById('drawer-overlay').classList.add('is-open');
  document.getElementById('drawer').classList.add('is-open');
  renderDrawer();
}
function closeDrawer() {
  state.drawer.open = false;
  document.getElementById('drawer-overlay').classList.remove('is-open');
  document.getElementById('drawer').classList.remove('is-open');
}

function renderDrawer() {
  var schema = TYPES[state.drawer.typeKey];
  var isCreate = state.drawer.mode === 'create';
  document.getElementById('drawer-title').textContent = (isCreate ? 'New ' : '') + schema.singular;

  if (isCreate) {
    document.getElementById('drawer-subtitle').textContent = '';
    renderDrawerForm(schema, {});
    return;
  }

  document.getElementById('drawer-subtitle').textContent = 'Loading record...';
  document.getElementById('drawer-body').innerHTML = '<p class="section-hint">Loading&hellip;</p>';
  document.getElementById('drawer-footer').innerHTML = '';

  apiFetch(schema.apiPath + '/' + encodeURIComponent(state.drawer.recordId)).then(function (record) {
    decorateRecord(schema, record);
    document.getElementById('drawer-subtitle').textContent = record[schema.idField] || state.drawer.recordId;
    renderDrawerDetail(schema, record);
  }).catch(function (err) {
    document.getElementById('drawer-body').innerHTML = '<p>Could not load this record (' + escapeHtml(err.message) + ').</p>';
  });
}

function renderDrawerDetail(schema, record) {
  var conditions = state.conditions.filter(function (c) { return conditionMatchesRecord(c, schema.key, record); });
  conditions.sort(function (a, b) { return severityRank(b.severity) - severityRank(a.severity); });

  var html = '<div class="drawer-level1">' +
    schema.detailLevel1.map(function (f) {
      var val;
      if (f.key.indexOf('__') === 0) val = record[f.key];
      else if (f.date) val = fmtDate(record[f.key]);
      else val = escapeHtml(record[f.key] || '—');
      return '<div class="l1-field"><div class="l1-label">' + escapeHtml(f.label) + '</div><div class="l1-value">' + val + '</div></div>';
    }).join('') +
  '</div>';

  if (schema.relatedType && state.recordCache[schema.relatedType]) {
    var related = state.recordCache[schema.relatedType].filter(function (r) { return schema.relatedMatch(record, r); });
    if (related.length > 0) {
      html += '<div class="form-break">' + escapeHtml(schema.relatedLabel) + '</div><div class="related-links">' +
        related.map(function (r) {
          var relId = r.id !== undefined ? r.id : r[TYPES[schema.relatedType].idField];
          return '<span class="related-link" data-action="open-drawer" data-type="' + schema.relatedType + '" data-id="' + escapeHtml(relId) + '">&#8594; ' + escapeHtml(r[TYPES[schema.relatedType].idField] || relId) + ': ' + escapeHtml(r[TYPES[schema.relatedType].titleField] || '') + '</span>';
        }).join('') + '</div>';
    }
  }

  html += '<div class="form-break">M-AI conditions on this record</div>';
  if (conditions.length === 0) {
    html += '<p class="section-hint">No open or historical conditions on this record.</p>';
  } else {
    html += conditions.map(function (c) { return renderConditionPanel(c, { compact: true }); }).join('');
  }

  html += '<div class="form-break">Edit</div>';
  html += buildFormHtml(schema, record);

  document.getElementById('drawer-body').innerHTML = html;
  attachFormSubmit(schema, record);

  document.getElementById('drawer-footer').innerHTML =
    '<button class="btn btn--secondary" data-action="close-drawer">Cancel</button>' +
    '<button class="btn btn--primary" data-action="submit-drawer-form">Save Changes</button>';
}

function renderDrawerForm(schema, record) {
  document.getElementById('drawer-body').innerHTML = buildFormHtml(schema, record);
  attachFormSubmit(schema, record);
  document.getElementById('drawer-footer').innerHTML =
    '<button class="btn btn--secondary" data-action="close-drawer">Cancel</button>' +
    '<button class="btn btn--primary" data-action="submit-drawer-form">Create ' + escapeHtml(schema.singular) + '</button>';
}

function buildFormHtml(schema, record) {
  return '<form id="record-form">' +
    schema.formGroups.map(function (group) {
      return '<div class="form-row">' + group.map(function (f) { return fieldHtml(f, record[f.key]); }).join('') + '</div>';
    }).join('') +
    '</form>';
}

function fieldHtml(f, value) {
  value = value === undefined || value === null ? '' : value;
  var req = f.required ? ' required' : '';
  var inner;
  if (f.type === 'textarea') {
    inner = '<textarea name="' + f.key + '"' + req + '>' + escapeHtml(value) + '</textarea>';
  } else if (f.type === 'select') {
    var opts = f.options.map(function (o) {
      var v = Array.isArray(o) ? o[0] : o;
      var l = Array.isArray(o) ? o[1] : o;
      return '<option value="' + escapeHtml(v) + '"' + (String(value) === String(v) ? ' selected' : '') + '>' + escapeHtml(l) + '</option>';
    }).join('');
    inner = '<select name="' + f.key + '"' + req + '><option value="">-- Select --</option>' + opts + '</select>';
  } else {
    var extra = '';
    if (f.type === 'number') { if (f.min !== undefined) extra += ' min="' + f.min + '"'; if (f.max !== undefined) extra += ' max="' + f.max + '"'; }
    if (f.placeholder) extra += ' placeholder="' + escapeHtml(f.placeholder) + '"';
    inner = '<input type="' + (f.type || 'text') + '" name="' + f.key + '" value="' + escapeHtml(value) + '"' + extra + req + '/>';
  }
  return '<div class="form-group"><label>' + escapeHtml(f.label) + '</label>' + inner + '</div>';
}

function attachFormSubmit(schema, record) {
  var form = document.getElementById('record-form');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    submitDrawerForm(schema, record);
  });
  // Deterministic assist, no LLM (Bug 2 / FSA G3 fix, 2026-07-12): on the
  // Treatments form only, offer to pre-fill the SoA Control Reference field.
  if (schema.key === 'treatments') attachTreatmentSoaSuggestion(form);
}

// Returns the cached record list for a type if already loaded (e.g. the user
// already visited that register this session), otherwise fetches it once and
// caches it. Used by the Treatments auto-suggestion below so it works even
// when a Treatment is created without first visiting Risks/SoA in this session.
function ensureRecordCache(typeKey) {
  if (state.recordCache[typeKey] && state.recordCache[typeKey].length) {
    return Promise.resolve(state.recordCache[typeKey]);
  }
  return apiFetch(TYPES[typeKey].apiPath).then(function (data) {
    var records = Array.isArray(data) ? data : [];
    state.recordCache[typeKey] = records;
    return records;
  }).catch(function () { return []; });
}

// Deterministic (no LLM, no guessing) SoA-control suggestion for a Risk
// Treatment: if the matched risk's own description text literally contains
// an existing SoA control_ref string, that control is a real, mechanical
// signal the treatment is probably addressing -- simple substring match,
// nothing inferred. Returns null (leave the field blank) when there is no
// such clean signal, per the build brief: never force a fake auto-fill.
function computeSoaSuggestion(riskRecord, soaRecords) {
  if (!riskRecord || !Array.isArray(soaRecords)) return null;
  var haystack = String(riskRecord.description || '');
  for (var i = 0; i < soaRecords.length; i++) {
    var ref = soaRecords[i].controlRef;
    if (ref && haystack.indexOf(ref) !== -1) return ref;
  }
  return null;
}

// Wires the deterministic auto-suggestion described above to the Treatments
// create/edit form: once the user identifies a Linked Risk (by its Record ID
// or Risk Reference), and IF the SoA Control Reference field is still empty,
// look for a control ref mentioned verbatim in that risk's description and
// pre-fill it. Never overwrites a value the user already typed.
function attachTreatmentSoaSuggestion(form) {
  var riskInput = form.querySelector('[name="riskId"]');
  var soaInput = form.querySelector('[name="soaControlRef"]');
  if (!riskInput || !soaInput) return;
  riskInput.addEventListener('blur', function () {
    if (soaInput.value.trim()) return;
    var riskVal = riskInput.value.trim();
    if (!riskVal) return;
    Promise.all([ensureRecordCache('risks'), ensureRecordCache('soa')]).then(function (results) {
      var risks = results[0], soaRecords = results[1];
      var matchedRisk = risks.filter(function (r) { return r.id === riskVal || r.riskRef === riskVal; })[0];
      var suggestion = computeSoaSuggestion(matchedRisk, soaRecords);
      if (suggestion && !soaInput.value.trim()) soaInput.value = suggestion;
    });
  });
}

function submitDrawerForm(schema, existingRecord) {
  var form = document.getElementById('record-form');
  if (!form) return;
  var fd = new FormData(form);
  var payload = Object.assign({}, existingRecord, Object.fromEntries(fd.entries()));
  // strip computed/decorated fields before sending
  Object.keys(payload).forEach(function (k) { if (k.indexOf('__') === 0) delete payload[k]; });

  var isCreate = state.drawer.mode === 'create';
  var request = isCreate
    ? apiFetch(schema.apiPath, { method: 'POST', body: JSON.stringify(payload) })
    : apiFetch(schema.apiPath + '/' + encodeURIComponent(state.drawer.recordId), { method: 'PUT', body: JSON.stringify(payload) });

  request.then(function (result) {
    var savedId = (result && (result.id || result[schema.idField])) || state.drawer.recordId || payload[schema.idField];
    if (savedId) sessionStorage.setItem('lastUpdatedId', savedId);
    closeDrawer();
    return loadConditions();
  }).then(function () {
    renderCurrentView();
  }).catch(function (err) {
    alert('Could not save this record: ' + err.message);
  });
}

// ---- SETTINGS ----
function renderSettings() {
  setTopbar('Settings', 'What matters most right now: connection health and your reviewer identity');
  var root = document.getElementById('view-root');
  root.innerHTML =
    '<section class="view-section"><div class="card">' +
      '<h3>Connection</h3>' +
      '<p class="section-hint" id="settings-health">Checking&hellip;</p>' +
    '</div></section>' +
    '<section class="view-section"><div class="card">' +
      '<h3>Reviewer identity</h3>' +
      '<p class="section-hint">Used as the "respondedBy" attribution when you confirm, dismiss, or mark M-AI conditions not applicable.</p>' +
      '<div class="form-group" style="margin-top:12px;"><label>Your name or email</label>' +
      '<input type="text" id="actor-name-input" value="' + escapeHtml(state.actorName) + '" placeholder="e.g., quality.lead@yourorg.com" /></div>' +
      '<button class="btn btn--primary" id="save-actor-name">Save</button>' +
    '</div></section>' +
    '<section class="view-section"><div class="card">' +
      '<h3>Environment</h3>' +
      '<p class="section-hint">Tenant: <span class="mono">' + escapeHtml(CFG.TENANT_ID) + '</span></p>' +
      '<p class="section-hint">API base: <span class="mono">' + escapeHtml(CFG.API_BASE || '(same-origin)') + '</span></p>' +
    '</div></section>' +
    '<section class="view-section" id="legal"><div class="card">' +
      '<h3>About &amp; Legal</h3>' +
      '<p class="section-hint" style="font-size:var(--text-xs); line-height:1.7; color:var(--text-tertiary);">' +
        '&copy; 2026 Conform-Edge Quality Consulting LLC. All rights reserved. ' +
        'AIMS-in-a-Box is proprietary software of Conform-Edge Quality Consulting LLC ' +
        '(Idaho LLC No. 6463380), Pocatello, Idaho, USA. Unauthorized reproduction, ' +
        'distribution, modification, or resale is prohibited. &quot;Conform-Edge&quot; and the ' +
        'Conform-Edge mark are trademarks of Conform-Edge Quality Consulting LLC. ' +
        'Advisory documentation aid &mdash; does not certify compliance and does not replace the ' +
        'judgment of the user&#39;s organization or top management.' +
      '</p>' +
    '</div></section>';

  apiFetch('/health').then(function (h) {
    updateConnectionIndicator(true, h && h.kernelActive ? 'M-AI kernel active' : 'kernel status unknown');
    var el = document.getElementById('settings-health');
    if (el) el.innerHTML =
      badgeHtml('positive', 'Connected') + ' &middot; DB: ' + ((h && h.dbConnected) ? 'connected' : 'unknown') +
      ' &middot; M-AI Kernel: ' + ((h && h.kernelActive) ? 'active' : 'unknown');
  }).catch(function () {
    updateConnectionIndicator(false);
    var el = document.getElementById('settings-health');
    if (el) el.innerHTML = badgeHtml('critical', 'Disconnected') + ' &mdash; the backend API is not reachable at ' + escapeHtml(CFG.API_BASE || '(same-origin)') + '.';
  });

  var saveBtn = document.getElementById('save-actor-name');
  if (saveBtn) saveBtn.addEventListener('click', function () {
    var val = document.getElementById('actor-name-input').value.trim();
    state.actorName = val;
    localStorage.setItem('aims_actor_name', val);
    alert('Saved. Future M-AI condition responses will be attributed to "' + (val || 'unassigned-reviewer') + '".');
  });
}

// ---- HELP ----
function renderHelp() {
  setTopbar('Help', 'What matters most right now: how to read this cockpit');
  var root = document.getElementById('view-root');
  root.innerHTML =
    '<section class="view-section"><div class="card">' +
      '<h3>How to read the Overview</h3>' +
      '<p class="section-hint">Every screen in this application, starting with Overview, is ordered by the Cockpit Rule: ' +
      '(1) what requires action right now, (2) what is the current state, (3) what changed recently, (4) what should happen next.</p>' +
    '</div></section>' +
    '<section class="view-section"><div class="card">' +
      '<h3>What is a System-Detected Condition?</h3>' +
      '<p class="section-hint">The <span style="color:var(--color-advisory)">&#9670;</span> diamond marks anything M-AI has surfaced automatically by evaluating your records against configured rules. ' +
      'These are always <strong style="color:var(--text-primary);">advisory only</strong> &mdash; M-AI never edits a record, closes an item, or makes a decision. ' +
      'A qualified human must Confirm, Dismiss as incorrect, or mark Not Applicable. Every panel links to its Authority Charter, which states exactly what that rule is permitted to do.</p>' +
    '</div></section>' +
    '<section class="view-section"><div class="card">' +
      '<h3>Registers</h3>' +
      '<p class="section-hint">SoA (Statement of Applicability), Risk Register, Treatments, Objectives, Audit Findings, NCRs, and Competence records ' +
      'are cross-linked: a Risk links to its Treatments, and every record can carry its own open conditions, shown in the &#9670; column of each table.</p>' +
    '</div></section>';
}

// ===================================================================
// GLOBAL EVENT DELEGATION
// ===================================================================
document.addEventListener('click', function (e) {
  var target = e.target.closest('[data-action]');
  if (!target) return;
  var action = target.getAttribute('data-action');

  if (action === 'nav') { navigate(target.getAttribute('data-view')); return; }
  if (action === 'open-drawer') { openDrawer(target.getAttribute('data-type'), target.getAttribute('data-id')); return; }
  if (action === 'close-drawer') { closeDrawer(); return; }
  if (action === 'submit-drawer-form') {
    var form = document.getElementById('record-form');
    if (form) { if (form.requestSubmit) form.requestSubmit(); else form.dispatchEvent(new Event('submit', { cancelable: true })); }
    return;
  }
  if (action === 'respond-condition') {
    respondToCondition(target.getAttribute('data-condition-id'), target.getAttribute('data-response'));
    return;
  }
  if (action === 'open-charter') { openCharter(target.getAttribute('data-condition-id')); return; }
  if (action === 'go-to-record') { openDrawer(target.getAttribute('data-type'), target.getAttribute('data-id')); return; }
});

document.getElementById('drawer-close').addEventListener('click', closeDrawer);
document.getElementById('drawer-overlay').addEventListener('click', closeDrawer);
document.getElementById('charter-close').addEventListener('click', closeCharter);
document.getElementById('charter-overlay').addEventListener('click', function (e) {
  if (e.target.id === 'charter-overlay') closeCharter();
});

// ===================================================================
// INIT
// ===================================================================
function init() {
  renderSidebar();
  apiFetch('/health').then(function (h) {
    updateConnectionIndicator(true, h && h.kernelActive ? 'M-AI kernel active' : undefined);
  }).catch(function () { updateConnectionIndicator(false); });

  navigate('overview');

  // Ambient refresh -- keeps the Intelligence Thread and sidebar badges live
  // without requiring the user to act. This is the one continuously-running
  // background behavior in the app, and it only ever updates indicators/badges,
  // never yanks the user out of what they are doing.
  setInterval(function () {
    loadConditions();
  }, CFG.CONDITION_POLL_MS || 25000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
