import {initializeApp} from "firebase-admin/app";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import {setGlobalOptions} from "firebase-functions/v2";
import {onRequest} from "firebase-functions/v2/https";

setGlobalOptions({maxInstances: 10});

initializeApp();
const db = getFirestore();

type CollaborationCard = {
  id: string;
  title: string;
  description: string;
  authorName: string;
  tags: string[];
  createdAt: string | null;
};

type EventCard = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  date: string | null;
};

type FeedPayload = {
  generatedAt: string;
  collaborations: CollaborationCard[];
  events: EventCard[];
  polls: {
    status: "placeholder";
    title: string;
    description: string;
  };
};

const toIso = (value: unknown): string | null => {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();

  if (typeof value === "object" && value !== null && "toDate" in value) {
    const candidate = value as {toDate: () => Date};
    return candidate.toDate().toISOString();
  }

  return null;
};

const clip = (text: unknown, maxLength: number): string => {
  const value = typeof text === "string" ? text.trim() : "";
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}...`;
};

const getCollaborations = async (): Promise<CollaborationCard[]> => {
  const snapshot = await db
    .collection("collaborations")
    .orderBy("createdAt", "desc")
    .limit(10)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: clip(data.title, 90) || "Untitled collaboration",
      description: clip(data.description, 220) || "No description provided.",
      authorName: data.authorName || "Unknown author",
      tags: Array.isArray(data.tags) ? data.tags.slice(0, 4) : [],
      createdAt: toIso(data.createdAt),
    };
  });
};

const getEvents = async (): Promise<EventCard[]> => {
  const upcoming = await db
    .collection("events")
    .where("date", ">=", Timestamp.now())
    .orderBy("date", "asc")
    .limit(10)
    .get();

  const snapshot = upcoming.empty ?
    await db.collection("events").orderBy("date", "desc").limit(10).get() :
    upcoming;

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: clip(data.name, 90) || "Untitled event",
      description: clip(data.description, 220) || "No description provided.",
      imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : "",
      date: toIso(data.date),
    };
  });
};

const buildFeed = async (): Promise<FeedPayload> => {
  const [collaborations, events] = await Promise.all([
    getCollaborations(),
    getEvents(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    collaborations,
    events,
    polls: {
      status: "placeholder",
      title: "Polls are coming soon",
      description: "This section is reserved for live poll results.",
    },
  };
};

export const infoScreenFeed = onRequest({
  region: "europe-west1",
  cors: true,
  invoker: "public",
}, async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({error: "Method not allowed"});
    return;
  }

  try {
    const payload = await buildFeed();
    res.status(200).json(payload);
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      error: "Failed to build info screen feed",
      details,
      generatedAt: new Date().toISOString(),
      collaborations: [],
      events: [],
      polls: {
        status: "placeholder",
        title: "Polls are coming soon",
        description: "This section is reserved for live poll results.",
      },
    });
  }
});
