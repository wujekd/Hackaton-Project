# API Endpoints

This document describes the HTTP endpoints used by this chatbot so other systems can integrate with it.

## Base URLs

- Local frontend server: `http://localhost:3000`
- Supabase Edge Function base: `https://<PROJECT_REF>.supabase.co/functions/v1`

## 1) Chat Endpoint (Primary Integration)

- Method: `POST`
- URL: `/hybrid-chat`
- Full example: `https://<PROJECT_REF>.supabase.co/functions/v1/hybrid-chat`
- Auth mode in this project: no JWT verification (`--no-verify-jwt`)
- Required headers:
  - `Content-Type: application/json`
  - `apikey: <SUPABASE_ANON_OR_PUBLISHABLE_KEY>`

### Request Body

```json
{
  "query": "How can I prepare for my algorithms exam?",
  "match_count": 6,
  "history": [
    { "role": "user", "content": "I have an algorithms exam next week." },
    { "role": "assistant", "content": "I can help. Which topics are included?" }
  ]
}
```

### Request Fields

- `query` (string, required): current user message.
- `match_count` (number, optional): requested number of retrieved context rows.
  - Effective range in backend: `1..20`
  - Default: `6`
- `history` (array, optional): prior messages to preserve conversation context.
  - Allowed roles: `user`, `assistant`
  - Backend keeps the most recent 20 messages.

### Success Response (200)

```json
{
  "answer": "Start with graph traversal, dynamic programming, and timed practice sets...",
  "matches": [
    {
      "id": 12,
      "content": "Dynamic programming is useful for optimization problems...",
      "metadata": { "topic": "algorithms" },
      "score": 0.0348
    }
  ]
}
```

### Error Responses

- `400`: invalid input (for example missing `query`)
- `405`: wrong HTTP method
- `500`: server-side issue (OpenAI, Supabase RPC, secrets, etc.)

### cURL Example

```bash
curl -i --request POST "https://<PROJECT_REF>.supabase.co/functions/v1/hybrid-chat" \
  --header "Content-Type: application/json" \
  --header "apikey: <SUPABASE_ANON_OR_PUBLISHABLE_KEY>" \
  --data '{"query":"Help me plan revision for 5 days","match_count":6,"history":[]}'
```

## 2) Local Health Endpoint

- Method: `GET`
- URL: `http://localhost:3000/health`
- Response:

```json
{
  "ok": true
}
```

Use this only for local server checks. External systems should call the Supabase chat endpoint.

## Notes for External Systems

- Do not send OpenAI keys from client apps.
- Keep `SUPABASE_SERVICE_ROLE_KEY` only in Edge Function secrets.
- Include prior turns in `history` each call if you want memory-like continuity.
