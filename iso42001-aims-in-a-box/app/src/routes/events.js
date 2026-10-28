'use strict';

/**
 * GET /api/events — recent activity feed for the Overview screen's
 * "what changed recently" section (Cockpit Rule item (c)).
 *
 * Reads real rows from mai_events (written by the M-AI Kernel adapter on
 * every host record create/update, see src/adapter/aims-adapter.js and
 * integration-checklist.md section 3 — every mutation emits an event
 * regardless of whether any rule fires). Tenant-scoped like every other
 * route in this app. This gives the UI's primary path (app-views.js ->
 * loadRecentActivityFallbackSources -> apiFetch('/api/events')) real data
 * instead of only its client-side fallback (which synthesizes activity
 * from each record type's createdAt/updatedAt).
 */

const express = require('express');

function tenantOf(req) {
  return req.header('X-Tenant-Id') || 'default';
}

// event_type is stored as "<recordType>.<verb>" (e.g. "soa.created") by
// aims-adapter.emitEvent. Derive a short, human-readable action from it
// without assuming every caller followed that convention exactly.
function actionFromEventType(eventType) {
  if (!eventType) return 'updated';
  const parts = String(eventType).split('.');
  return parts.length > 1 ? parts[parts.length - 1] : eventType;
}

module.exports = ({ db }) => {
  const router = express.Router();

  router.get('/', (req, res) => {
    const tenantId = tenantOf(req);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 200);

    try {
      const rows = db
        .prepare(
          `SELECT id, record_type, event_type, record_id, actor, occurred_at
           FROM mai_events
           WHERE tenant_id = ?
           ORDER BY occurred_at DESC
           LIMIT ?`
        )
        .all(tenantId, limit);

      const events = rows.map((r) => ({
        id: r.id,
        recordType: r.record_type,
        recordId: r.record_id,
        eventType: r.event_type,
        action: actionFromEventType(r.event_type),
        actor: r.actor || 'system',
        timestamp: r.occurred_at
      }));

      res.json(events);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[events] Failed to read mai_events', err);
      res.status(500).json({ error: 'internal_error', message: err.message });
    }
  });

  return router;
};
