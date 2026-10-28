/*!
 * app.js (core) -- AIMS-in-a-Box (ISO/IEC 42001) Command Center UI
 * (c) 2026 Conform-Edge Quality Consulting LLC. Proprietary. All rights reserved.
 *
 * Framework-free single-page application. Renders against the documented
 * Express/SQLite + M-AI Kernel API contract (see build brief). No build step,
 * no bundler -- just config.js + schemas.js + app.js + app-views.js, loaded
 * as plain (non-module) scripts that intentionally share one global scope.
 *
 * This file (app.js) holds: config/state, the API helper, formatting and
 * status/severity utilities, the M-AI Assessment Panel component, the
 * sidebar/topbar/Intelligence Thread shell, and condition fetch/respond/charter
 * logic. app-views.js holds the screen renderers (Overview, record list,
 * drawer, Settings, Help), event delegation, and init(). Split purely to keep
 * each file a manageable size -- there is no other reason for the boundary.
 */
'use strict';

var CFG = window.APP_CONFIG;
var TYPES = window.RECORD_TYPES;
var TYPE_ORDER = window.RECORD_TYPE_ORDER;

// ===================================================================
// ICONS -- outline-only, 16px, single weight (never mixed with filled)
// ===================================================================
var ICONS = {
  overview: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
  soa: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5"><path d="M9 11l2 2 4-4"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>',
  risks: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5"><path d="M12 3l9 16H3L12 3z"/><path d="M12 10v4"/><path d="M12 17h.01"/></svg>',
  treatments: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5"><path d="M14.7 6.3a4 4 0 10-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4z"/></svg>',
  objectives: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.6" fill="currentColor"/></svg>',
  audits: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v2h6V3"/><path d="M9 11l2 2 4-4"/></svg>',
  ncrs: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5"><path d="M5 3v18"/><path d="M5 4h11l-2 4 2 4H5"/></svg>',
  competence: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1 1.55V21a2 2 0 11-4 0v-.09A1.7 1.7 0 008 19.4a1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.7 1.7 0 004.6 15a1.7 1.7 0 00-1.55-1H3a2 2 0 110-4h.09A1.7 1.7 0 004.6 9a1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06A1.7 1.7 0 009 4.6a1.7 1.7 0 001-1.55V3a2 2 0 114 0v.09a1.7 1.7 0 001 1.55 1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06A1.7 1.7 0 0019.4 9a1.7 1.7 0 001.55 1H21a2 2 0 110 4h-.09a1.7 1.7 0 00-1.51 1z"/></svg>',
  help: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 015 .5c0 1.7-2.5 1.7-2.5 3.5"/><path d="M12 17h.01"/></svg>'
};

var NAV_MAIN = [
  { key: 'overview', label: 'Overview' },
  { key: 'soa', label: 'SoA' },
  { key: 'risks', label: 'Risks' },
  { key: 'treatments', label: 'Treatments' },
  { key: 'objectives', label: 'Objectives' },
  { key: 'audits', label: 'Audits' },
  { key: 'ncrs', label: 'NCRs' },
  { key: 'competence', label: 'Competence' }
];
var NAV_FOOTER = [
  { key: 'settings', label: 'Settings' },
  { key: 'help', label: 'Help' }
];

// Statuses treated as "resolved" for a System-Detected Condition. The exact
// enum is owned by the backend/M-AI Kernel; this list is a documented
// assumption and intentionally isolated to one constant so it is easy to
// reconcile once the backend agent's implementation is available.
var CONDITION_RESOLVED_STATUSES = ['dismissed_incorrect', 'not_applicable', 'resolved', 'closed'];

// ===================================================================
// STATE
// ===================================================================
var state = {
  currentView: 'overview',
  conditions: [],
  conditionsLoadedOnce: false,
  seenConditionIds: {},
  recordCache: {}, // typeKey -> array
  conditionCountsByType: {},
  drawer: { open: false, typeKey: null, mode: null, recordId: null },
  actorName: localStorage.getItem('aims_actor_name') || ''
};

// ===================================================================
// API HELPER
// ===================================================================
function apiUrl(path) { return (CFG.API_BASE || '') + path; }

function apiFetch(path, options) {
  options = options || {};
  var headers = Object.assign({ 'X-Tenant-Id': CFG.TENANT_ID }, options.headers || {});
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  setLoading(true);
  return fetch(apiUrl(path), Object.assign({}, options, { headers: headers }))
    .then(function (resp) {
      return resp.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
        if (!resp.ok) {
          var err = new Error((data && data.error) || ('Request failed: ' + resp.status));
          err.status = resp.status;
          err.data = data;
          throw err;
        }
        return data;
      });
    })
    .finally(function () { setLoading(false); });
}

var loadingCount = 0;
function setLoading(isLoading) {
  loadingCount += isLoading ? 1 : -1;
  if (loadingCount < 0) loadingCount = 0;
  var bar = document.getElementById('loading-bar');
  if (bar) bar.classList.toggle('loading-bar--active', loadingCount > 0);
}

// ===================================================================
// UTILITIES
// ===================================================================
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  var div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function fmtDate(iso) {
  if (!iso) return '—';
  var d = new Date(iso);
  if (isNaN(d.getTime())) return escapeHtml(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgo(iso) {
  if (!iso) return '—';
  var d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  var diffMs = Date.now() - d.getTime();
  var mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  var hrs = Math.round(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  var days = Math.round(hrs / 24);
  if (days < 30) return days + 'd ago';
  return fmtDate(iso);
}

function badgeHtml(tone, label) {
  return '<span class="status-badge status-badge--' + tone + '"><span class="status-dot"></span>' + escapeHtml(label) + '</span>';
}

function severityTone(sev) {
  sev = (sev || '').toLowerCase();
  // Per the FSA Status Palette definitions: "Major NC / Critical finding" -> critical,
  // "Minor NC / Attention required" -> warning.
  if (sev === 'critical' || sev === 'major') return 'critical';
  if (sev === 'minor' || sev === 'warning') return 'warning';
  if (sev === 'advisory') return 'advisory';
  return 'neutral';
}

function severityRank(sev) {
  var tone = severityTone(sev);
  if (tone === 'critical') return 3;
  if (tone === 'warning') return 2;
  if (tone === 'advisory') return 1.5;
  return 1;
}

function isConditionOpen(cond) {
  var status = (cond.status || 'open').toLowerCase();
  return CONDITION_RESOLVED_STATUSES.indexOf(status) === -1;
}

// Normalizes plural/singular record-type naming so a condition's
// `recordType` (whatever casing/pluralization the M-AI Kernel emits)
// can be matched against our schema keys ('soa', 'risks', 'ncrs', ...).
function normalizeTypeName(name) {
  name = (name || '').toLowerCase().trim();
  if (name.slice(-1) === 's' && name !== 'soa') name = name.slice(0, -1);
  return name;
}
function conditionMatchesType(cond, typeKey) {
  return normalizeTypeName(cond.recordType) === normalizeTypeName(typeKey);
}
// Given a condition's raw recordType (which may be singular or plural
// depending on the backend's naming), resolves it to the actual schema
// key used in RECORD_TYPES / TYPE_ORDER (always plural except 'soa').
function resolveSchemaKey(rawTypeName) {
  var norm = normalizeTypeName(rawTypeName);
  for (var i = 0; i < TYPE_ORDER.length; i++) {
    if (normalizeTypeName(TYPE_ORDER[i]) === norm) return TYPE_ORDER[i];
  }
  return rawTypeName;
}
function conditionMatchesRecord(cond, typeKey, record) {
  if (!conditionMatchesType(cond, typeKey)) return false;
  var rid = record.id !== undefined ? record.id : record[TYPES[typeKey].idField];
  return String(cond.recordId) === String(rid) || String(cond.recordId) === String(record[TYPES[typeKey].idField]);
}

function decorateRecord(schema, record) {
  if (schema.computed) schema.computed(record);
  var statusVal = record[schema.statusField];
  var badge = schema.statusMap && schema.statusMap[statusVal];
  record.__status = badge ? badgeHtml(badge.tone, badge.label) : badgeHtml('neutral', statusVal || 'Unknown');
  if (schema.severityMap) {
    var sevBadge = schema.severityMap[(record.severity || '').toLowerCase()];
    record.__severity = sevBadge ? badgeHtml(sevBadge.tone, sevBadge.label) : (record.severity ? badgeHtml('neutral', record.severity) : '—');
  }
  return record;
}

// Minimal markdown -> HTML for the Authority Charter (headers, bold, lists, paragraphs).
function markdownToHtml(md) {
  if (!md) return '<p>No charter text returned.</p>';
  var lines = String(md).replace(/\r\n/g, '\n').split('\n');
  var html = [];
  var inList = false;
  function closeList() { if (inList) { html.push('</ul>'); inList = false; } }
  function inline(text) {
    var esc = escapeHtml(text);
    esc = esc.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    esc = esc.replace(/`(.+?)`/g, '<code>$1</code>');
    return esc;
  }
  lines.forEach(function (line) {
    var trimmed = line.trim();
    if (/^###\s+/.test(trimmed)) { closeList(); html.push('<h3>' + inline(trimmed.replace(/^###\s+/, '')) + '</h3>'); return; }
    if (/^##\s+/.test(trimmed)) { closeList(); html.push('<h2>' + inline(trimmed.replace(/^##\s+/, '')) + '</h2>'); return; }
    if (/^#\s+/.test(trimmed)) { closeList(); html.push('<h1>' + inline(trimmed.replace(/^#\s+/, '')) + '</h1>'); return; }
    if (/^[-*]\s+/.test(trimmed)) {
      if (!inList) { html.push('<ul>'); inList = true; }
      html.push('<li>' + inline(trimmed.replace(/^[-*]\s+/, '')) + '</li>');
      return;
    }
    closeList();
    if (trimmed === '') return;
    html.push('<p>' + inline(trimmed) + '</p>');
  });
  closeList();
  return html.join('\n');
}

// ===================================================================
// M-AI ASSESSMENT PANEL COMPONENT
// ===================================================================
function renderConditionPanel(cond, opts) {
  opts = opts || {};
  var resolved = !isConditionOpen(cond);
  var sevTone = severityTone(cond.severity);
  var clauseText = (cond.clauseRefs && cond.clauseRefs.length) ? cond.clauseRefs.join(', ') : '—';
  return (
    '<div class="mai-panel' + (opts.compact ? ' mai-panel--compact' : '') + (resolved ? ' mai-panel--resolved' : '') + '" data-condition-id="' + escapeHtml(cond.id) + '">' +
      '<div class="mai-panel-header">' +
        '<div class="mai-panel-title"><span class="diamond">&#9670;</span> System-Detected Condition</div>' +
        '<div class="mai-panel-advisory-tag">[advisory only]</div>' +
      '</div>' +
      '<div class="mai-panel-divider"></div>' +
      '<div class="mai-panel-meta">' +
        '<span class="mono">' + escapeHtml(cond.ruleId || '—') + (cond.ruleRevision ? ' rev ' + escapeHtml(cond.ruleRevision) : '') + '</span>' +
        '<span>Severity: ' + badgeHtml(sevTone, cond.severity ? (cond.severity.charAt(0).toUpperCase() + cond.severity.slice(1)) : 'Unknown') + '</span>' +
        '<span>Clause: ' + escapeHtml(clauseText) + '</span>' +
        '<span>' + timeAgo(cond.createdAt) + '</span>' +
      '</div>' +
      '<div class="mai-panel-finding">' + escapeHtml(cond.findingText || 'No finding text provided.') + '</div>' +
      (cond.resolutionHint ? '<div class="mai-panel-hint"><strong>Resolution hint:</strong> ' + escapeHtml(cond.resolutionHint) + '</div>' : '') +
      (resolved
        ? '<div class="mai-panel-hint">Response recorded: <strong>' + escapeHtml((cond.status || '').replace(/_/g, ' ')) + '</strong></div>'
        : '<div class="mai-panel-actions">' +
            '<button class="btn btn--secondary btn--compact" data-action="respond-condition" data-condition-id="' + escapeHtml(cond.id) + '" data-response="confirm">&#10003; Confirm</button>' +
            '<button class="btn btn--secondary btn--compact" data-action="respond-condition" data-condition-id="' + escapeHtml(cond.id) + '" data-response="dismiss_incorrect">&#10007; Dismiss: Incorrect</button>' +
            '<button class="btn btn--secondary btn--compact" data-action="respond-condition" data-condition-id="' + escapeHtml(cond.id) + '" data-response="not_applicable">&mdash; Not Applicable</button>' +
          '</div>') +
      '<div class="mai-panel-footer">' +
        '<span>M-AI active &mdash; advisory only. Human authority controls all decisions.</span>' +
        '<span class="charter-link" data-action="open-charter" data-condition-id="' + escapeHtml(cond.id) + '">[What can this assistant do? &#8599;]</span>' +
      '</div>' +
    '</div>'
  );
}

function emptyStateHtml(cfg) {
  return (
    '<div class="empty-state">' +
      '<div class="empty-icon">&#9675;</div>' +
      '<h3>' + escapeHtml(cfg.title) + '</h3>' +
      '<p>' + escapeHtml(cfg.body) + '</p>' +
      (cfg.actionLabel ? '<button class="btn btn--primary" data-action="' + (cfg.actionKey || 'open-drawer') + '" ' +
        (cfg.actionType ? 'data-type="' + cfg.actionType + '" data-id="new"' : '') + '>' + escapeHtml(cfg.actionLabel) + '</button>' : '') +
    '</div>'
  );
}

// ===================================================================
// SHELL -- sidebar / topbar / intelligence thread
// ===================================================================
function renderSidebar() {
  var navList = document.getElementById('nav-list');
  navList.innerHTML = NAV_MAIN.map(function (item) {
    var count = item.key === 'overview'
      ? state.conditions.filter(isConditionOpen).length
      : (state.conditionCountsByType[item.key] || 0);
    return (
      '<div class="nav-item' + (state.currentView === item.key ? ' active' : '') + '" data-action="nav" data-view="' + item.key + '">' +
        ICONS[item.key] + '<span>' + item.label + '</span>' +
        (count > 0 ? '<span class="nav-badge">' + count + '</span>' : '') +
      '</div>'
    );
  }).join('');

  var footer = document.getElementById('sidebar-footer');
  footer.innerHTML = NAV_FOOTER.map(function (item) {
    return (
      '<div class="nav-item' + (state.currentView === item.key ? ' active' : '') + '" data-action="nav" data-view="' + item.key + '">' +
        ICONS[item.key] + '<span>' + item.label + '</span>' +
      '</div>'
    );
  }).join('') + '<div class="nav-item ghost-link" data-action="nav" data-view="settings">&#9671; Legal / About</div>';
}

function setTopbar(title, subtitle) {
  document.getElementById('view-title').textContent = title;
  document.getElementById('view-subtitle').innerHTML = subtitle || '';
}

function setThreadState() {
  var thread = document.getElementById('intelligence-thread');
  var anyOpen = state.conditions.some(isConditionOpen);
  thread.classList.toggle('thread--active', anyOpen);
}

function flashThreadEvent() {
  var thread = document.getElementById('intelligence-thread');
  thread.classList.add('thread--event');
  setTimeout(function () { thread.classList.remove('thread--event'); }, 600);
}

function updateConnectionIndicator(ok, detail) {
  var el = document.getElementById('connection-indicator');
  el.innerHTML = '<span class="status-dot" style="background:' + (ok ? 'var(--color-positive)' : 'var(--color-critical)') + '"></span><span>' +
    (ok ? 'Connected' : 'Disconnected') + (detail ? ' &middot; ' + escapeHtml(detail) : '') + '</span>';
}

// ===================================================================
// CONDITIONS -- fetch, sort, ambient refresh
// ===================================================================
function loadConditions() {
  return apiFetch('/api/conditions').then(function (data) {
    var list = Array.isArray(data) ? data : [];
    list.sort(function (a, b) {
      var rankDiff = severityRank(b.severity) - severityRank(a.severity);
      if (rankDiff !== 0) return rankDiff;
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    });
    var newOnes = list.filter(function (c) { return !state.seenConditionIds[c.id]; });
    list.forEach(function (c) { state.seenConditionIds[c.id] = true; });
    state.conditions = list;
    var counts = {};
    TYPE_ORDER.forEach(function (t) { counts[t] = 0; });
    list.filter(isConditionOpen).forEach(function (c) {
      var key = resolveSchemaKey(c.recordType);
      if (counts.hasOwnProperty(key)) counts[key] = counts[key] + 1;
    });
    state.conditionCountsByType = counts;
    if (state.conditionsLoadedOnce && newOnes.length > 0) flashThreadEvent();
    state.conditionsLoadedOnce = true;
    setThreadState();
    renderSidebar();
    return list;
  }).catch(function (err) {
    console.error('Failed to load conditions', err);
    return [];
  });
}

function respondToCondition(conditionId, response) {
  var actor = state.actorName || 'unassigned-reviewer';
  return apiFetch('/api/conditions/' + encodeURIComponent(conditionId) + '/respond', {
    method: 'POST',
    body: JSON.stringify({ response: response, respondedBy: actor })
  }).then(function () {
    return loadConditions();
  }).then(function () {
    renderCurrentView();
  }).catch(function (err) {
    alert('Could not record response: ' + err.message);
  });
}

function openCharter(conditionId) {
  var overlay = document.getElementById('charter-overlay');
  var body = document.getElementById('charter-body');
  body.innerHTML = 'Loading&hellip;';
  overlay.classList.add('is-open');
  apiFetch('/api/conditions/' + encodeURIComponent(conditionId) + '/charter')
    .then(function (data) {
      var text = typeof data === 'string' ? data : (data && data.charter) || JSON.stringify(data);
      body.innerHTML = markdownToHtml(text);
    })
    .catch(function (err) {
      body.innerHTML = '<p>Could not load the Authority Charter for this condition (' + escapeHtml(err.message) + ').</p>' +
        '<p>The Authority Charter documents exactly what M-AI is permitted to do: surface advisory findings against configured rules, and nothing more. It never changes a record, closes an item, or makes a decision -- every response above requires a named human reviewer.</p>';
    });
}
function closeCharter() { document.getElementById('charter-overlay').classList.remove('is-open'); }
