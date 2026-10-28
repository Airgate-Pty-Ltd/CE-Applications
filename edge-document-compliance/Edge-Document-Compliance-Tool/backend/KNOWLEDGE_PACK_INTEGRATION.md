# Compliance Knowledge Pack Integration

This document describes how to integrate and use the Conform-Edge Compliance Knowledge Pack JSON dataset for AI learning context and the Standards & Regulatory GAP Analysis Engine.

## Overview

The Compliance Knowledge Pack provides structured data including:
- **Learning Blocks**: Requirement examples with keywords, clause mappings, and audit evidence
- **Document Relationships**: Mappings between standards and regulations
- **Clause Mappings**: Cross-standard clause correspondences
- **Audit Evidence Structures**: Required evidence for each clause

## Setup

### 1. Place the JSON Dataset

Place your `Conform-Edge_Compliance_Knowledge_Pack.json` file in one of these locations:
- `backend/data/Conform-Edge_Compliance_Knowledge_Pack.json`
- `data/Conform-Edge_Compliance_Knowledge_Pack.json`
- Or provide the path when initializing

### 2. Run Data Ingestion

The ingestion script converts learning blocks into embeddings and stores them in the database:

```bash
npm run ingest:knowledge-pack [path/to/knowledge-pack.json]
```

This will:
- Load and validate the knowledge pack
- Extract learning blocks
- Generate embeddings (TF-IDF by default, or OpenAI if configured)
- Store embeddings in `compliance_lib.learning_embeddings` table

### 3. Configure Embedding Strategy (Optional)

By default, the system uses TF-IDF embeddings (local, no API required). To use OpenAI embeddings:

1. Set environment variable:
   ```bash
   export OPENAI_API_KEY=your-api-key
   export EMBEDDING_STRATEGY=openai
   ```

2. Or pass options when initializing:
   ```javascript
   const embeddingService = getEmbeddingService('openai', { apiKey: 'your-key' });
   ```

## API Endpoints

### GAP Analysis Engine

#### Get Engine Status
```http
GET /api/gap-analysis/status
```

Returns initialization status and statistics.

#### Perform Gap Analysis
```http
POST /api/gap-analysis/analyze
Content-Type: application/json

{
  "sourceStandard": "ISO 9001:2015",
  "targetStandard": "AS9100D"
}
```

Performs semantic gap analysis between two standards.

#### Search Learning Blocks
```http
POST /api/gap-analysis/search
Content-Type: application/json

{
  "query": "document control requirements",
  "filters": {
    "standardCode": "ISO 9001:2015",
    "requirementType": "mandatory",
    "topK": 10
  }
}
```

#### Find Similar Requirements
```http
GET /api/gap-analysis/similar?text=document control&standardCode=ISO 9001:2015&topK=5
```

#### Get Clause Mappings
```http
GET /api/gap-analysis/mappings/:sourceStandard/:targetStandard
```

#### Get Document Relationships
```http
GET /api/gap-analysis/relationships/:standardCode
```

#### Get Audit Evidence
```http
GET /api/gap-analysis/audit-evidence/:standardCode/:clauseNumber
```

#### Get Standards Metadata
```http
GET /api/gap-analysis/standards
GET /api/gap-analysis/standards/:standardCode
```

## Integration with Parser

The knowledge pack enhances the requirement parser by:

1. **Pattern Recognition**: Learning blocks provide examples of requirement patterns
2. **Semantic Search**: Find similar requirements when parsing new documents
3. **Clause Mapping**: Automatically map clauses between related standards
4. **Audit Evidence**: Suggest required evidence for extracted requirements

### Using in Parser

```javascript
import { getGapAnalysisEngine } from './services/gapAnalysisEngine.js';

const engine = getGapAnalysisEngine();
await engine.initialize();

// Find similar requirements during parsing
const similar = await engine.findSimilarRequirements(
  extractedRequirementText,
  'ISO 9001:2015',
  5
);
```

## Database Schema

The ingestion script creates the following table:

```sql
CREATE TABLE compliance_lib.learning_embeddings (
  id SERIAL PRIMARY KEY,
  learning_block_id VARCHAR(255) UNIQUE NOT NULL,
  standard_code VARCHAR(50) NOT NULL,
  clause_number VARCHAR(50),
  requirement_text TEXT NOT NULL,
  embedding JSONB,
  keywords TEXT[],
  requirement_type VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Knowledge Pack JSON Structure

Expected structure:

```json
{
  "standards": [
    {
      "code": "ISO 9001:2015",
      "name": "Quality Management Systems",
      "version": "2015",
      "description": "...",
      "category": "QMS",
      "industry": ["manufacturing", "services"]
    }
  ],
  "learning_blocks": [
    {
      "id": "unique-id",
      "standard_code": "ISO 9001:2015",
      "clause_number": "4.2.3",
      "requirement_text": "The organization shall control documents...",
      "keywords": ["document", "control", "shall"],
      "requirement_type": "mandatory",
      "context": {
        "tags": ["documentation", "control"]
      },
      "relationships": [],
      "audit_evidence": [
        {
          "type": "document",
          "description": "Document control procedure"
        }
      ]
    }
  ],
  "document_relationships": [
    {
      "source_standard": "ISO 9001:2015",
      "target_standard": "AS9100D",
      "relationship_type": "extends",
      "clause_mappings": [
        {
          "source": "4.2.3",
          "target": "4.2.3",
          "confidence": 0.95
        }
      ]
    }
  ]
}
```

## Troubleshooting

### Knowledge Pack Not Found
- Ensure the JSON file is in one of the search paths
- Or provide the full path when calling `loadKnowledgePack(path)`

### Embeddings Not Generating
- Check that the embedding service is initialized
- For OpenAI: verify API key is set
- For TF-IDF: ensure vocabulary is built before embedding

### Low Similarity Scores
- TF-IDF embeddings work best with domain-specific vocabulary
- Consider using OpenAI embeddings for better semantic understanding
- Ensure learning blocks contain relevant examples

## Next Steps

1. Load your knowledge pack JSON file
2. Run the ingestion script
3. Test the API endpoints
4. Integrate with the parser for enhanced requirement extraction
5. Use gap analysis for cross-standard compliance mapping

