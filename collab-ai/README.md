# Supabase Hybrid Search Chatbot (No Auth)

API integration reference:
- `API_ENDPOINTS.md`

This project gives you:
- A local chat webpage (`public/index.html`)
- A Supabase Edge Function endpoint (`hybrid-chat`) that does:
  - OpenAI query embedding
  - Postgres hybrid search (full text + pgvector via RRF)
  - History-aware responses (previous turns sent each request)
  - Moderation checks for student-safe output
  - OpenAI answer generation

## 1) Create Supabase schema

Open Supabase SQL Editor and run:

- `supabase/schema.sql`

This creates:
- `documents` table with `fts` and `embedding`
- indexes for full-text + vector search
- `hybrid_search(...)` SQL function

## 2) Configure and deploy Edge Function

From this repo:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
supabase secrets set OPENAI_API_KEY=YOUR_OPENAI_API_KEY
supabase secrets set OPENAI_EMBEDDING_MODEL=text-embedding-3-large
supabase secrets set OPENAI_CHAT_MODEL=gpt-4o-mini
supabase secrets set OPENAI_MODERATION_MODEL=omni-moderation-latest
supabase secrets set EMBEDDING_DIMENSIONS=512
supabase functions deploy hybrid-chat --no-verify-jwt
```

Function file:
- `supabase/functions/hybrid-chat/index.ts`

## 3) Load sample documents into `documents`

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and fill values.

3. Edit `data/documents.json` with your own content.

4. Index docs:

```bash
npm run index:docs
```

## 4) Configure local frontend

Edit:
- `public/config.js`

Set:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## 5) Run local webpage

```bash
npm run start
```

Open:
- `http://localhost:3000`

Type a message in the chat box. The frontend calls:
- `POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/hybrid-chat`

## How it works

1. Frontend sends `{ query, history }` to Edge Function.
2. Edge Function gets query embedding from OpenAI.
3. Edge Function calls Postgres `hybrid_search` RPC.
4. Retrieved snippets + previous chat turns are passed to OpenAI chat model.
5. Function returns `{ answer, matches }`.

## Important note (no auth)

This setup is intentionally unauthenticated for quick testing.
Anyone with your frontend config can call the function.
For production, add auth and rate limiting before public release.

## Troubleshooting

- `HTTP 401` from chat UI:
  - Redeploy function with `--no-verify-jwt` for this no-auth setup.
- `HTTP 500` with `Missing required secrets`:
  - Re-run `supabase secrets set ...` commands.
- `hybrid_search failed`:
  - Run `supabase/schema.sql` in SQL Editor and verify `documents` table exists.
- No useful answers:
  - Insert more relevant content via `npm run index:docs`.
