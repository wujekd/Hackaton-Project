import { createClient } from "npm:@supabase/supabase-js@2";
import OpenAI from "npm:openai@4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json"
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const openAIApiKey = Deno.env.get("OPENAI_API_KEY");

if (!supabaseUrl || !supabaseServiceRoleKey || !openAIApiKey) {
  throw new Error("Missing required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY");
}

const embeddingModel = Deno.env.get("OPENAI_EMBEDDING_MODEL") ?? "text-embedding-3-large";
const chatModel = Deno.env.get("OPENAI_CHAT_MODEL") ?? "gpt-4o-mini";
const moderationModel = Deno.env.get("OPENAI_MODERATION_MODEL") ?? "omni-moderation-latest";
const embeddingDimensions = Number(Deno.env.get("EMBEDDING_DIMENSIONS") ?? "512");
const MAX_HISTORY_MESSAGES = 20;

const STUDENT_SAFE_REFUSAL =
  "I can't help with harmful, offensive, or unsafe content. I can help with study support, campus life, and other safe student topics.";

const MASTER_SYSTEM_PROMPT = `
You are CampusStudy Assistant, a student-friendly university chatbot.

Primary behavior:
- Help students with coursework, learning strategies, revision planning, writing support, coding help, and campus-life questions.
- Be concise, supportive, and practical.
- Use prior chat history to keep continuity.
- Use retrieved context when relevant; if context is missing, say so clearly.

Safety policy:
- Never generate hateful, harassing, abusive, sexually explicit, or demeaning content.
- Never provide instructions that enable violence, self-harm, wrongdoing, or other harmful activity.
- Do not use insulting or rude language.
- If a request is unsafe or inappropriate, refuse briefly and redirect to a safe alternative.

Quality policy:
- Avoid making up facts.
- If uncertain, say what you don't know and suggest the next best step.
`.trim();

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false }
});

const openai = new OpenAI({ apiKey: openAIApiKey });

const normalizeHistory = (history: unknown) => {
  if (!Array.isArray(history)) return [];

  return history
    .slice(-MAX_HISTORY_MESSAGES)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as { role?: string; content?: unknown };
      const role = record.role === "assistant" ? "assistant" : record.role === "user" ? "user" : null;
      const content = typeof record.content === "string" ? record.content.trim() : "";

      if (!role || !content) return null;
      return { role, content: content.slice(0, 3000) };
    })
    .filter((item): item is { role: "user" | "assistant"; content: string } => Boolean(item));
};

const isFlagged = async (text: string) => {
  const result = await openai.moderations.create({
    model: moderationModel,
    input: text
  });
  return Boolean(result.results?.[0]?.flagged);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    const body = await req.json();
    const query = String(body?.query ?? "").trim();
    const matchCount = Number(body?.match_count ?? 6);
    const history = normalizeHistory(body?.history);

    if (!query) {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400,
        headers: corsHeaders
      });
    }

    if (await isFlagged(query)) {
      return new Response(JSON.stringify({ answer: STUDENT_SAFE_REFUSAL, matches: [] }), {
        status: 200,
        headers: corsHeaders
      });
    }

    const embeddingResponse = await openai.embeddings.create({
      model: embeddingModel,
      input: query,
      dimensions: embeddingDimensions
    });

    const queryEmbedding = embeddingResponse.data?.[0]?.embedding;
    if (!queryEmbedding) {
      throw new Error("Embedding generation failed");
    }

    const { data: matches, error: searchError } = await supabase.rpc("hybrid_search", {
      query_text: query,
      query_embedding: queryEmbedding,
      match_count: Math.max(1, Math.min(matchCount, 20)),
      full_text_weight: 1,
      semantic_weight: 1,
      rrf_k: 50
    });

    if (searchError) {
      throw new Error(`hybrid_search failed: ${searchError.message}`);
    }

    const context = (matches ?? [])
      .map((item, index) => `[${index + 1}] ${item.content}`)
      .join("\n\n");

    const completion = await openai.chat.completions.create({
      model: chatModel,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: MASTER_SYSTEM_PROMPT
        },
        {
          role: "system",
          content: `Retrieved context for grounding:\n${context || "No context returned."}`
        },
        ...history,
        {
          role: "user",
          content: query
        }
      ]
    });

    const answer = completion.choices?.[0]?.message?.content?.trim() || "I could not generate a response.";

    if (await isFlagged(answer)) {
      return new Response(JSON.stringify({ answer: STUDENT_SAFE_REFUSAL, matches: matches ?? [] }), {
        status: 200,
        headers: corsHeaders
      });
    }

    return new Response(JSON.stringify({ answer, matches: matches ?? [] }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "Unexpected error" }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
