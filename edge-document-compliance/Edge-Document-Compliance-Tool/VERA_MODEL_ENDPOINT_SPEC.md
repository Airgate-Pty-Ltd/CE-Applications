# VERA_MODEL_ENDPOINT Service Specification

## Overview
The `VERA_MODEL_ENDPOINT` is an external HTTP service that provides LLM functionality for Vera. It must implement a specific API contract to work with the EDCAT Administrator backend.

## Required Environment Variable
```
VERA_MODEL_ENDPOINT=<full URL to your model service>
```
Example: `VERA_MODEL_ENDPOINT=https://your-model-service.railway.app/api/chat`

## API Contract

### Endpoint
**POST** `{VERA_MODEL_ENDPOINT}`

### Request Format

**Headers:**
- `Content-Type: application/json` (required)
- `x-tenant-id: {uuid}` (optional, if context.tenantId is provided)
- `x-user-id: {string}` (optional, if context.userId is provided)
- `x-mode: {string}` (optional, if context.mode is provided - values: 'chat' or 'reasoning')

**Request Body:**
```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are Vera, the bounded Quality and Regulatory AI assistant..."
    },
    {
      "role": "user",
      "content": "What is AS9100?"
    }
  ],
  "context": {
    "tenantId": "00000000-0000-0000-0000-000000000000",
    "userId": "system",
    "mode": "chat"  // or "reasoning"
  }
}
```

**Message Format:**
- `messages` is an array of message objects
- Each message has:
  - `role`: `"system"`, `"user"`, or `"assistant"`
  - `content`: string containing the message text

**Context Object:**
- `tenantId`: UUID string (optional)
- `userId`: string (optional)
- `mode`: `"chat"` or `"reasoning"` (optional, defaults to "chat")

### Response Format

**Success Response (200 OK):**
```json
{
  "answer": "AS9100 is the aerospace quality standard...",
  "messages": [
    // Optional: full conversation history including assistant response
  ],
  "meta": {
    // Optional: metadata about the response
    "model": "gpt-4",
    "tokens": 150,
    "latency": 1.2
  }
}
```

**Required Fields:**
- `answer`: **REQUIRED** - string containing the LLM's response text

**Optional Fields:**
- `messages`: array of message objects (full conversation history)
- `meta`: object with metadata (model name, token count, latency, etc.)

**Error Response (non-200):**
- Any HTTP status code other than 200 will be treated as an error
- Error message will be extracted from response body

## Implementation Requirements

### 1. Message Processing
The service must:
- Accept an array of messages in OpenAI-style format (`role` + `content`)
- Process the messages through your LLM provider (OpenAI, Anthropic, local model, etc.)
- Return the assistant's response in the `answer` field

### 2. Context Handling
The service should:
- Use `x-tenant-id` and `x-user-id` headers for multi-tenancy/user tracking
- Respect `x-mode` header to adjust behavior:
  - `"chat"`: Standard conversational mode
  - `"reasoning"`: More analytical, structured reasoning mode

### 3. System Prompt
The first message with `role: "system"` contains Vera's system prompt. This should be:
- Applied as the system/instruction prompt to your LLM
- Combined with subsequent user messages
- Used to maintain Vera's personality and behavior

### 4. Response Generation
The service must:
- Generate a natural language response appropriate for a quality/compliance assistant
- Return the response as a string in the `answer` field
- Handle errors gracefully and return appropriate HTTP status codes

## Example Implementation (Node.js/Express)

```javascript
import express from 'express';
import { OpenAI } from 'openai'; // or your LLM provider

const app = express();
app.use(express.json());

app.post('/', async (req, res) => {
  try {
    const { messages, context } = req.body;
    const tenantId = req.headers['x-tenant-id'];
    const userId = req.headers['x-user-id'];
    const mode = req.headers['x-mode'] || 'chat';

    // Extract system prompt (first message with role: "system")
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    // Call your LLM provider
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemMessage?.content || 'You are a helpful assistant.' },
        ...conversationMessages
      ],
      temperature: mode === 'reasoning' ? 0.3 : 0.7
    });

    const answer = completion.choices[0].message.content;

    res.json({
      answer,
      meta: {
        model: 'gpt-4',
        tokens: completion.usage.total_tokens,
        mode
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Vera Model Service running on port 3000');
});
```

## Deployment Options

### Option 1: Separate Railway Service
- Create a new Railway service for the model endpoint
- Deploy your LLM wrapper service
- Set `VERA_MODEL_ENDPOINT` to the Railway service URL

### Option 2: Same Service, Different Route
- Add a route in the existing EDCAT Administrator service
- Example: `POST /api/vera/model`
- Set `VERA_MODEL_ENDPOINT=https://your-app.railway.app/api/vera/model`

### Option 3: External Service
- Use an existing LLM API gateway
- Ensure it implements the contract above
- Set `VERA_MODEL_ENDPOINT` to the external service URL

## Testing

You can test the endpoint manually:

```bash
curl -X POST https://your-model-service.railway.app/api/chat \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: 00000000-0000-0000-0000-000000000000" \
  -H "x-mode: chat" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are Vera, a quality engineer assistant."},
      {"role": "user", "content": "What is ISO 9001?"}
    ],
    "context": {
      "tenantId": "00000000-0000-0000-0000-000000000000",
      "mode": "chat"
    }
  }'
```

Expected response:
```json
{
  "answer": "ISO 9001 is the foundational quality management standard...",
  "meta": {}
}
```

## Common Issues

1. **Missing `answer` field**: The response must include an `answer` string field
2. **Wrong HTTP status**: Must return 200 OK for success
3. **Invalid JSON**: Response must be valid JSON
4. **CORS issues**: If calling from browser, ensure CORS headers are set
5. **Timeout**: Service should respond within reasonable time (30-60 seconds)

## Next Steps

1. **Set up the model service** using one of the deployment options above
2. **Test the endpoint** using the curl command above
3. **Set VERA_MODEL_ENDPOINT** in Railway environment variables
4. **Verify connection** by asking Vera a question - she should now be able to respond

