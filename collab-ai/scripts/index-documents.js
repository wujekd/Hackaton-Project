require("dotenv").config();

const fs = require("node:fs/promises");
const path = require("node:path");
const { createClient } = require("@supabase/supabase-js");
const OpenAI = require("openai");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openAIApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey || !openAIApiKey) {
  console.error("Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or OPENAI_API_KEY in .env");
  process.exit(1);
}

const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-large";
const embeddingDimensions = Number(process.env.EMBEDDING_DIMENSIONS || "512");

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false }
});

const openai = new OpenAI({ apiKey: openAIApiKey });

const dataPath = process.argv[2] || "data/documents.json";

(async () => {
  const absolutePath = path.resolve(dataPath);
  const raw = await fs.readFile(absolutePath, "utf8");
  const docs = JSON.parse(raw);

  if (!Array.isArray(docs) || docs.length === 0) {
    throw new Error("Document file must contain a non-empty array");
  }

  const rows = [];

  for (let i = 0; i < docs.length; i += 1) {
    const doc = docs[i];
    const content = typeof doc === "string" ? doc : doc.content;

    if (!content || typeof content !== "string") {
      throw new Error(`Document at index ${i} is missing string content`);
    }

    console.log(`Embedding ${i + 1}/${docs.length}`);

    const embeddingResponse = await openai.embeddings.create({
      model: embeddingModel,
      input: content,
      dimensions: embeddingDimensions
    });

    const embedding = embeddingResponse.data?.[0]?.embedding;
    if (!embedding) {
      throw new Error(`Failed to embed document at index ${i}`);
    }

    rows.push({
      content,
      metadata: typeof doc === "object" && doc.metadata ? doc.metadata : {},
      embedding
    });
  }

  const { error } = await supabase.from("documents").insert(rows);
  if (error) {
    throw new Error(error.message);
  }

  console.log(`Inserted ${rows.length} documents.`);
})().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
