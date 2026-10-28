-- =============================================================================
-- MIGRATION 010: Remove Orphaned Tables from PostgreSQL
-- Removes tables that are defined in migrations but have no code connections
-- Based on comprehensive architecture audit
-- =============================================================================

-- =============================================================================
-- ORPHANED TABLES TO REMOVE:
-- 1. standard_files - Consolidated into standards table (migration 006)
-- 2. standard_files_content - Consolidated into standards table (migration 006)
-- 3. upload_files - Defined but never used in code
-- 4. generated_reports - Defined but feature not implemented
-- 5. user_feedback - Defined but feature not implemented
-- 6. audit_logs_results - Defined but feature not implemented
-- 7. integration_logs - Defined but feature not implemented
-- 8. users - Defined but feature not implemented
-- =============================================================================

-- Drop orphaned tables (CASCADE to remove dependent objects)
DO $$
BEGIN
  -- Tables consolidated into standards (migration 006)
  DROP TABLE IF EXISTS public.standard_files CASCADE;
  DROP TABLE IF EXISTS public.standard_files_content CASCADE;
  
  -- Tables with no code connections
  DROP TABLE IF EXISTS public.upload_files CASCADE;
  DROP TABLE IF EXISTS public.generated_reports CASCADE;
  DROP TABLE IF EXISTS public.user_feedback CASCADE;
  DROP TABLE IF EXISTS public.audit_logs_results CASCADE;
  DROP TABLE IF EXISTS public.integration_logs CASCADE;
  DROP TABLE IF EXISTS public.users CASCADE;
  
  -- Phase 5 enterprise tables with no code connections
  DROP TABLE IF EXISTS public.api_keys CASCADE;
  DROP TABLE IF EXISTS public.assessments CASCADE;
  DROP TABLE IF EXISTS public.audit_logs CASCADE;
  DROP TABLE IF EXISTS public.authorized_users CASCADE;
  DROP TABLE IF EXISTS public.compliance_requirements CASCADE;
  DROP TABLE IF EXISTS public.documents CASCADE;
  DROP TABLE IF EXISTS public.files CASCADE;
  DROP TABLE IF EXISTS public.i18n_translations CASCADE;
  DROP TABLE IF EXISTS public.industry_modules CASCADE;
  DROP TABLE IF EXISTS public.integrations CASCADE;
  DROP TABLE IF EXISTS public.requirement_mapping CASCADE;
  DROP TABLE IF EXISTS public.requirement_mappings CASCADE;
  DROP TABLE IF EXISTS public.user_permissions CASCADE;
  DROP TABLE IF EXISTS public.regional_compliance_mappings CASCADE;
  DROP TABLE IF EXISTS public.tenant_industry_modules CASCADE;
  
  RAISE NOTICE 'Removed 23 orphaned tables from PostgreSQL database';
END $$;

-- Note: document_content_for_learning may be used by Vera learning system
-- Keep it for now, but can be reviewed later if not needed

