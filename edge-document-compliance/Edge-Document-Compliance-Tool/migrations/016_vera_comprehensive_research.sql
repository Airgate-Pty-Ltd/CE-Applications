-- =============================================================================
-- MIGRATION 016: Vera Comprehensive Regulatory Research System
-- Creates 4 new tables for on-demand research capabilities
-- =============================================================================

-- TABLE 1: vera_research_requests
-- Track user-initiated research requests
CREATE TABLE IF NOT EXISTS vera_research_requests (
    request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    tenant_id UUID,
    conversation_id UUID,
    
    -- What's being researched?
    request_type VARCHAR(100),
        -- "standard_research", "regulation_research", "requirement_research",
        -- "country_regulations", "industry_regulations", "comparison"
    
    request_query TEXT NOT NULL,
        -- "ISO 22000", "aerospace regulations in Bangladesh"
    
    search_intent TEXT,
        -- What is user really asking for?
    
    -- Parsed request details
    primary_topic VARCHAR(255), -- "ISO 22000", "Aerospace", "Bangladesh"
    secondary_topics TEXT[],
    countries_mentioned TEXT[], -- ["Bangladesh", "USA", "EU"]
    industries_mentioned TEXT[], -- ["aerospace", "food", "medical"]
    standards_mentioned TEXT[], -- ["ISO9001", "AS9100D"]
    
    -- Search scope
    scope_level VARCHAR(50),
        -- "single_standard", "single_country", "multi_country", "multi_standard", "comprehensive"
    
    desired_depth VARCHAR(50) DEFAULT 'comprehensive',
        -- "summary" (brief), "standard" (normal), "comprehensive" (detailed)
    
    desired_format VARCHAR(50) DEFAULT 'structured',
        -- "summary", "detailed_report", "checklist", "comparison", "timeline"
    
    -- Tracking
    status VARCHAR(50) DEFAULT 'pending',
        -- "pending", "researching", "synthesizing", "complete", "failed"
    
    research_started_at TIMESTAMP,
    research_completed_at TIMESTAMP,
    duration_seconds INT,
    
    -- Results
    research_summary TEXT,
    sources_found INT,
    authoritative_sources INT,
    sources_list JSONB,
        -- [{"title": "...", "url": "...", "credibility": 0.95, "date": "2024-01-15"}]
    
    key_findings TEXT[],
    implementation_guidance TEXT,
    common_gaps TEXT[],
    timeline TEXT,
    cost_estimate TEXT,
    
    -- Quality assessment
    confidence_in_findings DECIMAL(3,2), -- 0-1
    requires_expert_review BOOLEAN DEFAULT FALSE,
    expert_review_notes TEXT,
    
    -- Knowledge integration
    integrated_into_vera_knowledge BOOLEAN DEFAULT FALSE,
    created_concepts UUID[], -- New concepts created from this research
    updated_concepts UUID[], -- Existing concepts updated
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_requests_user ON vera_research_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON vera_research_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_topic ON vera_research_requests(primary_topic);

-- TABLE 2: vera_research_sources_web
-- Track all web sources Vera finds (not pre-approved list)
CREATE TABLE IF NOT EXISTS vera_research_sources_web (
    source_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Source info
    source_url TEXT NOT NULL UNIQUE,
    source_title TEXT,
    source_domain VARCHAR(255),
    
    -- Content
    content_summary TEXT,
    full_content TEXT,
    last_accessed TIMESTAMP,
    
    -- Authority assessment
    source_type VARCHAR(100),
        -- "official_standard" (ISO.org), "government" (FDA.gov), 
        -- "regulatory_agency", "certification_body", "academic",
        -- "industry_publication", "guidance_document", "blog"
    
    authority_score DECIMAL(3,2), -- 0-1, how authoritative?
    authority_reason TEXT, -- Why this score?
    
    -- Information quality
    content_accuracy_score DECIMAL(3,2),
    is_current BOOLEAN, -- Is this still valid?
    publication_date TIMESTAMP,
    last_updated TIMESTAMP,
    
    is_official BOOLEAN, -- Is this the official source?
    is_government BOOLEAN,
    is_academic BOOLEAN,
    
    -- Verification
    cross_referenced_count INT, -- How many other sources mention this?
    conflicting_sources INT, -- How many sources say something different?
    
    -- Usage
    times_cited INT DEFAULT 0,
    times_used_in_research INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sources_web_domain ON vera_research_sources_web(source_domain);
CREATE INDEX IF NOT EXISTS idx_sources_web_authority ON vera_research_sources_web(authority_score DESC);
CREATE INDEX IF NOT EXISTS idx_sources_web_current ON vera_research_sources_web(is_current);

-- TABLE 3: vera_standard_profiles_comprehensive
-- Comprehensive profiles of standards/regulations researched
CREATE TABLE IF NOT EXISTS vera_standard_profiles_comprehensive (
    profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- What is this?
    standard_name VARCHAR(255), -- "ISO 22000:2018"
    standard_type VARCHAR(100),
        -- "international_standard", "regulation", "law", "guidance", "best_practice"
    
    -- Detailed info
    full_title TEXT,
    organization VARCHAR(255), -- ISO, IEC, FAA, FDA, etc.
    
    scope_description TEXT,
    applicability TEXT, -- Who needs to comply?
    purpose_statement TEXT,
    
    -- Version & dates
    current_version VARCHAR(50),
    publication_date TIMESTAMP,
    effective_date TIMESTAMP,
    last_update TIMESTAMP,
    next_review_date TIMESTAMP,
    is_deprecated BOOLEAN DEFAULT FALSE,
    
    -- Structure
    section_count INT,
    requirement_count INT,
    sections JSONB,
        -- [{"number": "1", "title": "Scope", "description": "..."}, ...]
    
    key_requirements TEXT[],
    
    -- Implementation
    estimated_implementation_time VARCHAR(100), -- "6-12 months"
    estimated_cost_range VARCHAR(100), -- "$15,000-50,000"
    common_implementation_gaps TEXT[],
    implementation_guidance TEXT,
    
    -- Adoption
    organizations_using INT, -- Estimated number
    industry_adoption DECIMAL(3,2), -- % adoption in industry
    
    -- Relationships
    related_standards TEXT[], -- ["ISO 9001", "HACCP"]
    required_prerequisites TEXT[],
    compatible_with TEXT[],
    conflicts_with TEXT[],
    supersedes TEXT[],
    superseded_by TEXT[],
    
    -- Geographic/industry scope
    applies_globally BOOLEAN,
    applies_to_countries TEXT[],
    applies_to_industries TEXT[],
    
    -- Compliance verification
    certification_available BOOLEAN,
    certification_bodies TEXT[], -- CBs that certify to this
    audit_required BOOLEAN,
    third_party_assessment_required BOOLEAN,
    
    -- Source documentation
    sources JSONB, -- [{"url": "...", "title": "...", "credibility": 0.95}]
    official_source_url TEXT,
    purchase_url TEXT,
    
    -- Vera's assessment
    comprehensiveness_score DECIMAL(3,2), -- How complete is Vera's knowledge?
    last_updated_by_vera TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_profiles_name ON vera_standard_profiles_comprehensive(standard_name);
CREATE INDEX IF NOT EXISTS idx_profiles_type ON vera_standard_profiles_comprehensive(standard_type);
CREATE INDEX IF NOT EXISTS idx_profiles_industries ON vera_standard_profiles_comprehensive(applies_to_industries);

-- TABLE 4: vera_regulatory_lookup
-- Regulations by country/region/industry for quick lookup
CREATE TABLE IF NOT EXISTS vera_regulatory_lookup (
    lookup_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Geographic/industrial classification
    country VARCHAR(100),
    region VARCHAR(100), -- If applicable (EU, ASEAN, etc.)
    sub_region VARCHAR(100), -- If applicable (state, province)
    
    industry VARCHAR(100), -- "aerospace", "medical", "food", "automotive"
    product_type VARCHAR(255), -- "aerospace components", "medical devices"
    
    -- The regulation
    regulation_name VARCHAR(255),
    regulation_type VARCHAR(100),
        -- "mandatory_requirement", "recommended_practice", "guidance", "certification"
    
    regulatory_body VARCHAR(255), -- "FAA", "FDA", "CAAB"
    
    description TEXT,
    
    -- Key requirements
    requirements TEXT[],
    
    -- Compliance
    compliance_mandatory BOOLEAN,
    certification_required BOOLEAN,
    certification_bodies TEXT[],
    
    -- Timeline
    effective_date TIMESTAMP,
    compliance_deadline DATE,
    enforcement_date TIMESTAMP,
    
    -- Sources
    official_source_url TEXT,
    guidance_documents TEXT[],
    
    -- Related
    related_standards TEXT[],
    related_regulations TEXT[],
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_regulatory_country ON vera_regulatory_lookup(country);
CREATE INDEX IF NOT EXISTS idx_regulatory_industry ON vera_regulatory_lookup(industry);
CREATE INDEX IF NOT EXISTS idx_regulatory_body ON vera_regulatory_lookup(regulatory_body);

DO $$
BEGIN
    RAISE NOTICE 'Vera Comprehensive Regulatory Research System tables created successfully';
END $$;

