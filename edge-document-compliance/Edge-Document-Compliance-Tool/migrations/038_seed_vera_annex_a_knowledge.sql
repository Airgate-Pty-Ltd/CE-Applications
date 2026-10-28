-- =============================================================================
-- MIGRATION 038: Seed Vera Annex A / Document Structure Knowledge
-- Purpose: Add knowledge about Annex A concept that clause structure and 
--          terminology are not required to be copied into QMS documentation.
--          Document numbering is cosmetic metadata only.
-- =============================================================================

-- Add QMS Documentation Structure topic
INSERT INTO edcat.vera_quality_topics (topic_code, category, title, summary, difficulty, is_active)
VALUES (
  'QMS_DOCUMENTATION_STRUCTURE',
  'QMS Documentation',
  'QMS Documentation Structure and Annex A',
  'Understanding that ISO 9001 and AS9-series standards do not require organizations to copy clause structure, numbering, or terminology into their QMS documentation. Annex A explicitly states structure and terminology are not required.',
  'intermediate',
  TRUE
)
ON CONFLICT (topic_code) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  is_active = EXCLUDED.is_active;

-- Get the topic ID for snippets and Q&A
DO $$
DECLARE
  topic_uuid UUID;
BEGIN
  SELECT id INTO topic_uuid FROM edcat.vera_quality_topics WHERE topic_code = 'QMS_DOCUMENTATION_STRUCTURE';
  
  IF topic_uuid IS NULL THEN
    RAISE EXCEPTION 'Topic QMS_DOCUMENTATION_STRUCTURE not found';
  END IF;

  -- Add snippets
  INSERT INTO edcat.vera_quality_snippets (topic_id, snippet_type, level, content, weight)
  VALUES
    (
      topic_uuid,
      'definition',
      'core',
      'Annex A (informative) in ISO 9001 and AS9-series standards explicitly states that the clause structure and terminology used in the standard are not required to be adopted by organizations. Organizations can use their own structure, numbering, and terms as long as requirements are implemented and traceable.',
      10
    ),
    (
      topic_uuid,
      'principles',
      'core',
      'What matters for compliance: (1) Requirements are actually implemented in processes, (2) Documented information supports and demonstrates implementation, (3) Traceability between requirements and your practices exists. What does NOT matter: matching clause numbers, copying standard terminology, or using a specific document numbering scheme.',
      10
    ),
    (
      topic_uuid,
      'example',
      'core',
      'Good practice: Organize procedures around real processes (e.g., "Receiving Inspection Procedure" rather than "Procedure 7.4.3"). Bad practice: Creating documents titled "Procedure 8.5.1" just because clause 8.5.1 exists, without ensuring the actual requirement is addressed.',
      8
    ),
    (
      topic_uuid,
      'pitfall',
      'core',
      'Common mistake: Assuming that having a document with a clause number in the title automatically satisfies the requirement. The real test is whether the requirement is implemented and evidence exists.',
      7
    )
  ON CONFLICT DO NOTHING;

  -- Add Q&A entries
  INSERT INTO edcat.vera_quality_qa (topic_id, question_pattern, answer_core, answer_layered, tags)
  VALUES
    (
      topic_uuid,
      'do my procedures have to follow iso 9001 clause numbers',
      'No. ISO 9001 and AS9-series standards do not require your internal documents to copy their clause structure or numbering. Annex A explicitly states this structure is not meant to be imposed on your manuals, procedures, or templates.',
      'Short answer: no – ISO 9001 and the AS9-series standards do not require your internal documents to copy their clause structure, numbering, or exact terminology.

The standards use their own clause order and wording so that requirements are presented in a logical way and can align with other management system standards. In the informative annex (often Annex A), the committees explicitly state that this structure is not meant to be imposed on your manuals, procedures, or templates.

What the standards do require is that:
• The requirements are actually implemented in your processes; and
• You maintain documented information that supports and demonstrates that implementation.

You are free to:
• Use your own document numbering or even no numbering at all;
• Group requirements into procedures, work instructions, and forms in whatever way best fits how your organization works; and
• Use your own terms (for example "record", "SOP", or "protocol" instead of "documented information", or "supplier" / "vendor" instead of "external provider").

From a compliance perspective, what matters is traceability: every requirement in the standard should be clearly supported by some combination of your actual practices and your documented information, regardless of how you number the documents.',
      ARRAY['definition', 'annex a', 'structure', 'numbering']
    ),
    (
      topic_uuid,
      'does as9100 require my documents to use the same clause structure',
      'No. AS9100 does not require your documents to mirror its clause structure. The informative annex makes it clear that organizations are free to adopt their own structure and terms.',
      'AS9100, like ISO 9001, uses its clause structure as a presentation tool for organizing requirements in a logical way. The informative annex (Annex A) explicitly states that this structure is not a mandatory template for your QMS documentation.

Your documents should be organized around how your organization actually operates, not around a clause list. What matters is that:
• Each requirement in AS9100 is addressed somewhere in your QMS;
• You can demonstrate traceability between requirements and your documented information;
• Your processes are controlled and effective.

You can use any document structure, numbering scheme, or terminology that works for your organization, as long as the requirements are met and traceable.',
      ARRAY['as9100', 'annex a', 'structure']
    ),
    (
      topic_uuid,
      'is a specific document numbering system required by the standard',
      'No. Document numbering is an internal housekeeping choice, not a formal requirement. Auditors care about clear identification, revision control, and traceability to requirements, not about numbering format or consistency.',
      'Document numbering is an internal organizational choice, not a requirement in ISO 9001 or the AS9-series standards.

Auditors are primarily interested in whether documents are:
• Clearly identified so people can tell what they are using;
• Kept under revision control and properly approved; and
• Traceable to the processes and requirements they support.

You can absolutely use a structured numbering system because it helps with maintenance, but the standards do not prescribe any specific format and do not require you to align numbers with clause references. The informative annex makes it clear that organizations are free to adopt their own structure and terms.

In my internal logic, titles, content, and explicit mappings to requirements carry the compliance weight. Document numbers are metadata used for convenience and search, not a basis for deciding whether a requirement is met.',
      ARRAY['document numbers', 'numbering', 'traceability']
    ),
    (
      topic_uuid,
      'what does annex a say about the structure of my documentation',
      'Annex A (informative) explicitly states that the clause structure and terminology of the standard are not required to be copied into your QMS documentation. You can use your own structure, numbering, and terms as long as requirements are implemented and traceable.',
      'Annex A is an informative annex in ISO 9001 and the AS9-series standards. It clarifies that:

• The clause structure used in the standard is a presentation tool, not a mandatory template for your QMS.
• The terminology (like "documented information", "external provider") does not have to be adopted verbatim.
• Organizations are free to use their own structure, numbering, and terminology.

What Annex A emphasizes is that the real measure of compliance is:
• Whether the requirements are actually implemented in your processes;
• Whether you have documented information that supports and demonstrates this implementation;
• Whether there is clear traceability between the standard''s requirements and your QMS.

Good practice is to organize your documentation around how your organization actually works, making it easy for users to find what they need and for auditors to verify that requirements are met.',
      ARRAY['annex a', 'structure', 'terminology']
    ),
    (
      topic_uuid,
      'what is good practice for structuring qms documentation',
      'Good practice: Organize documents around real processes and responsibilities. Make it easy to trace requirements to documents and evidence. Bad practice: Copying clause numbers just for appearance or assuming a document with a clause number in the title proves compliance.',
      'For ISO 9001 and AS9100, "good practice" for QMS documentation is not about copying the clause list. It is about making the documentation match how your organization actually works.

Good practice includes:
• Organizing documents around real processes and responsibilities so people know which procedure applies to their work.
• Being able to trace each requirement in the standard to one or more documents and to evidence in use.
• Making it easy for users and auditors to find what they need quickly.

Bad practice includes:
• Forcing your documents to mirror the clause numbers just for appearance.
• Assuming that because you have a document titled with a clause number, the requirement is automatically satisfied.
• Confusing users with numbering or terminology that does not reflect everyday operations.

The informative annex in the standards reinforces this: the clause structure is a presentation tool, not a mandatory template for your QMS. The real test is whether you can show consistent, controlled processes and documented evidence that the requirements are met.',
      ARRAY['good practice', 'bad practice', 'structure']
    )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Seeded Annex A / document structure knowledge for topic %', topic_uuid;
END $$;

-- Add internal policy for document numbering
INSERT INTO edcat.ai_policy (tenant_id, name, config, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'vera_document_numbering_policy',
  jsonb_build_object(
    'description', 'How Vera should treat document numbering and clause structure.',
    'doc_numbering', 'cosmetic',
    'use_annex_a', true,
    'compliance_keys', ARRAY['title', 'content', 'requirement_mappings'],
    'standards_basis', 'ISO 9001 / AS9-series informative annex on structure and terminology not required for QMS documentation',
    'matching_priority', ARRAY['title', 'content', 'requirement_mappings'],
    'ignored_for_compliance', ARRAY['doc_number_format', 'clause-like numbering in titles']
  ),
  NOW(),
  NOW()
)
ON CONFLICT (tenant_id, name) DO UPDATE SET
  config = EXCLUDED.config,
  updated_at = NOW();

COMMENT ON TABLE edcat.vera_quality_topics IS 'Master topics for quality engineering knowledge (CQE, Six Sigma, Lean, KPIs, Culture, Agile+QMS, QMS Documentation)';

