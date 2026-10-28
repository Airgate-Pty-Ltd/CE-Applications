# Vera User Guide

## What is Vera?

Vera is your intelligent compliance assistant, designed to help with:
- Standards and regulatory requirements
- Gap analysis and compliance checking
- Procedure development
- Audit preparation
- Industry-specific guidance

## Getting Started

### 1. Upload Standards

Before Vera can answer detailed questions, upload and parse standards:
- Go to the Standards section
- Upload a standard document (PDF, DOC, DOCX)
- Click "Parse Now" to extract requirements

### 2. Ask Questions

Vera understands various question types:

**Clause Queries:**
- "What does clause 8.7 require?"
- "Show me clause 4.1 in AS9100D"
- "What is ISO 9001 clause 7.1.5?"

**Gap Analysis:**
- "Show gaps for AS9100D"
- "What requirements are missing?"
- "Check compliance for ISO 13485"

**Research:**
- "What can you find about FAA Part 21?"
- "Tell me about CASA Part 65"
- "Research ISO 22000 requirements"

**General:**
- "Compare AS9100 and ISO 9001"
- "Help me draft a procedure for clause 8.7"
- "What are your capabilities?"

## Vera's Capabilities

### Standards Intelligence

Vera can:
- Retrieve exact requirement text by clause number
- Find similar requirements across standards
- Map requirements between standards (crosswalk)
- Search requirements by text

### Research System

When you ask about standards not in the database:
- Vera automatically researches online
- Provides structured findings with sources
- Caches results for future queries
- Shows confidence levels

### Conversation Memory

Vera remembers:
- Previous conversation topics
- Your preferences and context
- Active tasks and progress
- Industry and sector focus

### Learning System

Vera learns from:
- Your feedback (helpful/not helpful)
- Low confidence responses
- Repeated questions
- Data gaps identified

## Best Practices

1. **Be Specific**: Include standard name and clause number when possible
2. **Provide Context**: Mention your industry or sector for better guidance
3. **Give Feedback**: Rate responses to help Vera improve
4. **Use Follow-ups**: Ask clarifying questions based on Vera's suggestions

## Example Conversations

**Example 1: Clause Query**
```
You: What does clause 8.7 require in AS9100D?
Vera: [Provides exact requirement text, confidence level, and follow-up options]
```

**Example 2: Research**
```
You: What can you find about FAA Part 21?
Vera: [Researches online, provides structured findings with sources and confidence]
```

**Example 3: Gap Analysis**
```
You: Show gaps for ISO 9001
Vera: [Analyzes your procedures against requirements, identifies gaps with recommendations]
```

## Troubleshooting

**Vera says "I need standards parsed":**
- Upload and parse at least one standard document first

**Vera can't find a clause:**
- Check the clause number format (e.g., "8.7" not "8-7")
- Ensure the standard is parsed
- Try asking "What clauses are available?"

**Research returns low confidence:**
- This is normal for new topics
- Vera will cache results for future queries
- Consider uploading a document for more accurate parsing

## API Access

Vera's capabilities are also available via API:

- `POST /api/chat` - Main chat endpoint
- `GET /api/vera/standards` - List standards
- `GET /api/vera/conversation/:id` - Get conversation history
- `POST /api/vera/feedback` - Provide feedback

## Support

For issues or questions:
- Check the diagnostics: `GET /api/vera/diagnostics`
- Review conversation history for context
- Provide feedback to help Vera improve

