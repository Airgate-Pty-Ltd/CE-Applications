-- M-AI Core kernel tables (mai_*). Kernel-owned DDL (MAI-ARCH-001 Rev C).
-- Append-only ledger. All tables carry tenant_id; all timestamps are ISO-8601
-- text so hashed values round-trip byte-for-byte. Idempotent (IF NOT EXISTS).
--
-- Deploy order: prisma db push (host tables) → this file → mai_kernel_role.sql.

CREATE TABLE IF NOT EXISTS mai_events (
  id            uuid PRIMARY KEY,
  tenant_id     text NOT NULL,
  event_type    text NOT NULL,
  record_type   text NOT NULL,
  record_id     text NOT NULL,
  actor         text NOT NULL,
  occurred_at   text NOT NULL,
  snapshot_json jsonb NOT NULL,
  snapshot_hash text NOT NULL,
  processed     boolean NOT NULL DEFAULT false,
  processed_at  text
);
CREATE INDEX IF NOT EXISTS mai_events_tenant_record_idx
  ON mai_events (tenant_id, record_type, record_id);
CREATE INDEX IF NOT EXISTS mai_events_processed_idx
  ON mai_events (processed);

CREATE TABLE IF NOT EXISTS mai_assessments (
  id              uuid PRIMARY KEY,
  tenant_id       text NOT NULL,
  event_id        uuid NOT NULL,
  dim_id          text NOT NULL,
  rule_id         text NOT NULL,
  rule_revision   integer NOT NULL,
  record_type     text NOT NULL,
  record_id       text NOT NULL,
  snapshot_hash   text NOT NULL,
  tier            text NOT NULL,
  logic_result    text NOT NULL,
  data_confidence text NOT NULL,       -- high | medium | low  (never a numeric score)
  severity        text NOT NULL,       -- blocking | warning | info
  finding_text    text NOT NULL,
  resolution_hint text,
  clause_refs     jsonb NOT NULL DEFAULT '[]'::jsonb,
  status          text NOT NULL DEFAULT 'active',  -- active | superseded | resolved
  superseded_by   text,
  superseded_at   text,
  created_at      text NOT NULL,
  response        text,                -- confirm | dismiss_incorrect | dismiss_not_applicable
  response_by     text,
  response_at     text,
  prev_hash       text,
  row_hash        text NOT NULL
);
CREATE INDEX IF NOT EXISTS mai_assessments_tenant_record_idx
  ON mai_assessments (tenant_id, record_type, record_id);
CREATE INDEX IF NOT EXISTS mai_assessments_tenant_status_idx
  ON mai_assessments (tenant_id, status);
CREATE INDEX IF NOT EXISTS mai_assessments_event_idx
  ON mai_assessments (event_id);

CREATE TABLE IF NOT EXISTS mai_error_log (
  id           uuid PRIMARY KEY,
  tenant_id    text,
  source       text NOT NULL,
  message      text NOT NULL,
  context_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   text NOT NULL
);
CREATE INDEX IF NOT EXISTS mai_error_log_tenant_idx
  ON mai_error_log (tenant_id);

CREATE TABLE IF NOT EXISTS mai_rule_registry (
  rule_id         text NOT NULL,
  dim_id          text NOT NULL,
  revision        integer NOT NULL,
  effective_date  text NOT NULL,
  approved_by     text NOT NULL,
  loaded_at       text NOT NULL,
  definition_json jsonb NOT NULL,
  definition_hash text NOT NULL,
  PRIMARY KEY (dim_id, rule_id, revision)
);
