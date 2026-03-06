import { EventService } from "./event.service";
import { CollaborationService } from "./collaboration.service";
import type { EventItem } from "../types/event";
import type { Collaboration } from "../types/collaboration";

const SUPABASE_URL = "https://olawvctolbfvylvzuikc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_tIoAkro0jDTargBkUeWLiw_amWTR4Dp";
const CONTEXT_LIMIT = 20;

export interface AiChatHistory {
  role: "user" | "assistant";
  content: string;
}

function formatEventContext(events: EventItem[]): string {
  if (events.length === 0) return "";
  const lines = events.map((e) => {
    const date = e.date?.toDate?.().toLocaleDateString() ?? "TBD";
    return `- ${e.name} (${date}): ${e.description}`;
  });
  return `\n\nAvailable Events:\n${lines.join("\n")}`;
}

function formatCollabContext(collabs: Collaboration[]): string {
  if (collabs.length === 0) return "";
  const lines = collabs.map((c) => {
    const tags = c.tags.length > 0 ? ` [${c.tags.join(", ")}]` : "";
    return `- ${c.title}${tags}: ${c.description}`;
  });
  return `\n\nAvailable Collaborations:\n${lines.join("\n")}`;
}

async function fetchContext(): Promise<string> {
  const [events, collabs] = await Promise.all([
    EventService.getApproved().catch(() => [] as EventItem[]),
    CollaborationService.getAll().catch(() => [] as Collaboration[]),
  ]);

  return (
    formatEventContext(events.slice(0, CONTEXT_LIMIT)) +
    formatCollabContext(collabs.slice(0, CONTEXT_LIMIT))
  );
}

export async function sendAiMessage(
  query: string,
  history: AiChatHistory[],
): Promise<string> {
  const context = await fetchContext();

  const augmentedQuery = context
    ? `The user has access to the following platform data:${context}\n\nUser question: ${query}`
    : query;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/hybrid-chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ query: augmentedQuery, history, match_count: 6 }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `AI request failed (${res.status})`);
  }

  const data = await res.json();
  return data.answer;
}
