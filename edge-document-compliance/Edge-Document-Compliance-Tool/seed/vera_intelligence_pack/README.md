# Vera Intelligence Expansion Pack

This pack significantly improves Vera's reasoning, regulatory knowledge, standard comprehension, clause-level context, concept mapping, transfer learning, and multi-industry applicability.

## Contents

1. **vera_knowledge_graph_concepts.json** - 200+ universal and domain-specific QMS concepts
2. **vera_concept_relationships.json** - 1000+ directional concept relationships
3. **vera_contextual_enrichment.json** - Deep contextual information for concepts
4. **vera_standard_profiles.json** - Comprehensive standard profiles (non-copyrighted meta-knowledge)
5. **vera_standard_profiles_comprehensive.json** - Extended standard information
6. **vera_regulatory_lookup.json** - 100+ regulatory requirements from public sources
7. **vera_pattern_discoveries.json** - Common QMS patterns and failure modes
8. **vera_self_learning_questions.json** - 150+ self-directed learning questions
9. **vera_transfer_learning_maps.json** - Cross-standard knowledge mappings
10. **vera_reasoning_chains.json** - Validated reasoning chains
11. **load_intelligence_pack.js** - Loader script to populate all tables

## Data Sources

All data is constructed from:
- Public domain regulatory summaries (FAA, EPA, OSHA, NIST, FDA public guidance)
- Government websites (.gov)
- Wikipedia for industry/regulatory body descriptions
- Public domain academic sources
- Meta-knowledge about standards (intent, patterns, not clause text)

**NO copyrighted standard clause text is included.**

## Loading

Run the loader script:
```bash
node seed/vera_intelligence_pack/load_intelligence_pack.js
```

This will populate all tables in the `edcat` schema with the intelligence data.

