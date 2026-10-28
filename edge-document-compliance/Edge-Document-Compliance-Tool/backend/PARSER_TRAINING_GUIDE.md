# Parser Training Guide - Quick Reference

## Available Endpoints

### 1. Extract Requirements
**POST** `/api/parser/extract`

Extract requirements from document text for training/testing.

**Request:**
```json
{
  "documentText": "Full text of compliance document...",
  "standardCode": "AS9100D",
  "version": "1.0.0"
}
```

**Response:**
```json
{
  "success": true,
  "status": "extracted",
  "summary": {
    "totalExtracted": 45,
    "avgConfidence": 0.87,
    "validationStatus": {
      "highConfidence": 32,
      "mediumConfidence": 10,
      "lowConfidence": 3,
      "mandatoryCount": 38
    }
  },
  "requirements": [...],
  "validation": {...},
  "metadata": {...}
}
```

### 2. Validate & Learn
**POST** `/api/parser/validate`

Submit feedback on extracted requirements to improve the parser.

**Request:**
```json
{
  "requirements": [...],
  "standardCode": "AS9100D",
  "feedback": [
    {
      "type": "correct",
      "text": "Clause 4.1: The organization shall..."
    },
    {
      "type": "incorrect",
      "text": "Section 4: Introduction..."
    },
    {
      "type": "missed",
      "text": "4.3 The organization shall determine persons performing work..."
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "status": "validated",
  "learningUpdate": {
    "patternsLearned": 42,
    "accuracy": "88%",
    "improvements": {
      "keywordsAdded": 15,
      "patternsExcluded": 3
    }
  }
}
```

### 3. Train with Examples
**POST** `/api/parser/train`

Manually train the parser with labeled examples.

**Request:**
```json
{
  "standardCode": "AS9100D",
  "examples": [
    {
      "type": "requirement",
      "keywords": ["top management", "policy", "establish", "shall"]
    },
    {
      "type": "pattern",
      "pattern": {
        "text": "The organization shall...",
        "type": "include"
      }
    }
  ]
}
```

### 4. Get Accuracy Metrics
**GET** `/api/parser/accuracy/:standardCode`

Get parsing accuracy and learning metrics for a standard.

**Response:**
```json
{
  "success": true,
  "standardCode": "AS9100D",
  "parsingMetrics": {
    "extractedTotal": 150,
    "correctedTotal": 18,
    "accuracy": 88
  },
  "avgConfidence": 0.87,
  "totalParsingEvents": 5,
  "patternsLearned": 42
}
```

### 5. Learning Status
**GET** `/api/parser/learning-status`

Get overall learning status across all standards.

### 6. Correct Specific Requirement
**POST** `/api/parser/correct-requirement/:requirementId`

Submit correction for a specific requirement from the database.

**Request:**
```json
{
  "standardCode": "AS9100D",
  "correctionType": "incorrect",
  "correctedText": "Corrected requirement text...",
  "reason": "This was instructional text, not a requirement"
}
```

## Training Workflow

1. **Extract** → Use `/api/parser/extract` to parse document
2. **Review** → Check extracted requirements in UI
3. **Validate** → Submit feedback via `/api/parser/validate`
4. **Train** → Add specific examples via `/api/parser/train`
5. **Re-extract** → Parse again to see improvements
6. **Monitor** → Check accuracy via `/api/parser/accuracy/:standardCode`

## Learning Data

All learning data is persisted in `backend/parser-learning.json`:
- Parsing events
- Corrections
- Accuracy metrics
- Learned patterns per standard

This file is automatically created and updated as you train the parser.

