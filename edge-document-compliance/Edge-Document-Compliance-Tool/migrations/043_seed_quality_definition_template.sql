-- Migration: Seed Quality Definition Template
-- Adds quality.definition template with feminine, professional voice
-- Date: December 2024

-- ============================================================================
-- Insert or update quality.definition template
-- ============================================================================

-- First, ensure the table exists (should already exist from previous migrations)
CREATE TABLE IF NOT EXISTS edcat.vera_response_templates (
    template_code TEXT PRIMARY KEY,
    description TEXT,
    content TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert or update the quality.definition template
INSERT INTO edcat.vera_response_templates (
    template_code,
    description,
    content,
    active,
    created_at,
    updated_at
) VALUES (
    'quality.definition',
    'Core definition of Quality in a compliance context - professional, slightly feminine voice',
    'Quality, in a compliance and standards context, is the degree to which inherent characteristics of a process, product, or service fulfil stated and implied requirements.

When I talk about "quality", I am considering several layers:

• **Requirements** – What regulators, customers, and standards such as ISO 9001 or AS9100 actually require.  

• **Conformance** – Whether your documented processes and records show that those requirements are met.  

• **Consistency** – Whether you achieve that level of performance reliably over time, not just once.  

• **Risk and prevention** – How effectively you identify, control, and reduce risks before they become escapes.  

• **Improvement** – Whether you use data, feedback, and nonconformities to make things better, not merely to defend the status quo.

So, very simply:  

> Quality is conformance to clearly defined requirements, delivered consistently, with risk under control and improvement actively pursued.

If you tell me which angle you care about most – product quality, process quality, service quality, or audit/compliance quality – I can dive into that specifically for you.',
    TRUE,
    NOW(),
    NOW()
)
ON CONFLICT (template_code) 
DO UPDATE SET
    description = EXCLUDED.description,
    content = EXCLUDED.content,
    updated_at = NOW();

-- Also add to ai_template table if it exists (for compatibility)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'edcat' 
        AND table_name = 'ai_template'
    ) THEN
        INSERT INTO edcat.ai_template (
            tenant_id,
            name,
            kind,
            template,
            created_at,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000'::uuid,
            'quality.definition',
            'quality_definition',
            '{
                "pattern": "Quality, in a compliance and standards context, is the degree to which inherent characteristics of a process, product, or service fulfil stated and implied requirements.\n\nWhen I talk about \"quality\", I am considering several layers:\n\n• **Requirements** – What regulators, customers, and standards such as ISO 9001 or AS9100 actually require.\n\n• **Conformance** – Whether your documented processes and records show that those requirements are met.\n\n• **Consistency** – Whether you achieve that level of performance reliably over time, not just once.\n\n• **Risk and prevention** – How effectively you identify, control, and reduce risks before they become escapes.\n\n• **Improvement** – Whether you use data, feedback, and nonconformities to make things better, not merely to defend the status quo.\n\nSo, very simply:\n\n> Quality is conformance to clearly defined requirements, delivered consistently, with risk under control and improvement actively pursued.\n\nIf you tell me which angle you care about most – product quality, process quality, service quality, or audit/compliance quality – I can dive into that specifically for you.",
                "variables": []
            }'::jsonb,
            NOW(),
            NOW()
        )
        ON CONFLICT (tenant_id, name) 
        DO UPDATE SET
            kind = EXCLUDED.kind,
            template = EXCLUDED.template,
            updated_at = NOW();
    END IF;
END $$;

-- Add comment
COMMENT ON TABLE edcat.vera_response_templates IS 'Vera response templates - includes quality.definition template';

