-- Least-privilege mai_kernel DB role (Phase 4 WP-2), per MAI-ARCH-001 §6
-- (docs/01-directives/HF-ENGINE-BUILD-PROMPT-v3.md §5.1 item 12): "Kernel imports nothing
-- from the host — one-way adapter dependency; on PostgreSQL, kernel connects under
-- least-privilege role (SELECT host tables, INSERT mai_*, no UPDATE on host tables); human
-- responses written under host principal."
--
-- Only meaningful on PostgreSQL, where roles are real, connection-level security principals —
-- SQLite has no equivalent (any process with file access has full read/write). Applied via
-- `npx prisma db execute --schema prisma/postgresql/schema.prisma` (not schema-representable
-- in Prisma, same reason as the trigger files — see DECISIONS.md D-016).
--
-- "Host tables" = every table NOT prefixed mai_ (the 24 application/evidence/learning/delivery
-- tables). "mai_* tables" = the 6 kernel-owned tables (mai_approval, mai_causal_status,
-- mai_error_log, mai_event, mai_rule_manifest, mai_system_condition). Human dispositions on
-- kernel conditions (three-response contract) are written by the regular application
-- connection under the host principal (the app's normal DB user), never by mai_kernel itself —
-- this role exists only for what the kernel's own evaluation logic touches.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'mai_kernel') THEN
    CREATE ROLE mai_kernel NOLOGIN;
  END IF;
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO mai_kernel', current_database());
END
$$;

GRANT USAGE ON SCHEMA public TO mai_kernel;

-- Host tables: SELECT only. No INSERT, UPDATE, or DELETE — the kernel reads host state to
-- evaluate conditions, it never mutates it.
GRANT SELECT ON
  "User", "Course", "Lesson", "Assessment", "AssessmentQuestion", "AssessmentAttempt",
  "CourseEnrollment", "LessonCompletion", "Certificate", "AuditLog",
  hf_evidence, evidence_classification, hf_event, evidence_relationship,
  learning_atom, learning_intervention, learning_intervention_appropriateness_review,
  policy_pack, policy_pack_clause,
  training_assignment, atom_completion, drip_delivery,
  training_package_manifest, supervisor_observation, effectiveness_evidence
TO mai_kernel;

-- mai_* tables: SELECT (reads its own rule manifests/prior conditions) + INSERT (writes new
-- conditions, error logs, approvals it originates) — still no UPDATE or DELETE, so a kernel
-- condition once written cannot be silently altered even by the kernel's own connection.
GRANT SELECT, INSERT ON
  mai_approval, mai_causal_status, mai_error_log, mai_event, mai_rule_manifest, mai_system_condition
TO mai_kernel;

-- Explicit, not implicit: confirm no UPDATE/DELETE exists anywhere for this role (defense in
-- depth against a future GRANT ALL mistake being silently additive).
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM mai_kernel;
REVOKE INSERT ON
  "User", "Course", "Lesson", "Assessment", "AssessmentQuestion", "AssessmentAttempt",
  "CourseEnrollment", "LessonCompletion", "Certificate", "AuditLog",
  hf_evidence, evidence_classification, hf_event, evidence_relationship,
  learning_atom, learning_intervention, learning_intervention_appropriateness_review,
  policy_pack, policy_pack_clause,
  training_assignment, atom_completion, drip_delivery,
  training_package_manifest, supervisor_observation, effectiveness_evidence
FROM mai_kernel;
