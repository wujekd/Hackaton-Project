import {initializeApp} from "firebase-admin/app";
import {
  FieldValue,
  getFirestore,
  Timestamp,
} from "firebase-admin/firestore";
import {setGlobalOptions} from "firebase-functions/v2";
import {HttpsError, onCall, onRequest} from "firebase-functions/v2/https";

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

type SendMessagePayload = {
  conversationId?: unknown;
  text?: unknown;
};

type GetOrCreateDirectConversationPayload = {
  otherUserId?: unknown;
  otherUserName?: unknown;
  otherUserEmail?: unknown;
};

type MarkReadPayload = {
  conversationId?: unknown;
};

type DeleteEventPayload = {
  eventId?: unknown;
};

type ConversationDoc = {
  participantIds?: unknown;
};

type UserDoc = {
  username?: unknown;
  email?: unknown;
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

const asNonEmptyString = (
  value: unknown,
  field: string,
  maxLength: number,
): string => {
  if (typeof value !== "string") {
    throw new HttpsError("invalid-argument", `${field} must be a string.`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new HttpsError("invalid-argument", `${field} is required.`);
  }
  if (trimmed.length > maxLength) {
    throw new HttpsError(
      "invalid-argument",
      `${field} must be at most ${maxLength} characters.`,
    );
  }
  return trimmed;
};

const getParticipantIds = (data: ConversationDoc): string[] => {
  if (!Array.isArray(data.participantIds)) {
    return [];
  }

  return data.participantIds
    .filter((value): value is string => typeof value === "string");
};

const asOptionalString = (value: unknown, maxLength: number): string => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength);
};

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

const buildDirectConversationId = (uidA: string, uidB: string): string => {
  const sorted = [uidA, uidB].sort();
  return `direct_${sorted[0]}_${sorted[1]}`;
};

const assertAdmin = async (uid: string): Promise<void> => {
  const userSnap = await db.collection("users").doc(uid).get();
  const isUserAdmin = userSnap.exists && userSnap.get("admin") === true;
  if (!isUserAdmin) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
};

const pickUsername = (
  userDoc: UserDoc | undefined,
  fallbackName: string,
  fallbackEmail: string,
): string => {
  const docName = asOptionalString(userDoc?.username, 80);
  if (docName) return docName;

  const docEmail = asOptionalString(userDoc?.email, 160);
  if (docEmail) return docEmail;

  const trimmedFallbackName = asOptionalString(fallbackName, 80);
  if (trimmedFallbackName) return trimmedFallbackName;

  const trimmedFallbackEmail = asOptionalString(fallbackEmail, 160);
  if (trimmedFallbackEmail) return trimmedFallbackEmail;

  return "Unknown user";
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

export const sendMessage = onCall({
  region: "europe-west1",
  cors: true,
  invoker: "public",
}, async (request) => {
  const senderId = request.auth?.uid;
  if (!senderId) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const data = request.data as SendMessagePayload;
  const conversationId = asNonEmptyString(
    data.conversationId,
    "conversationId",
    180,
  );
  const text = asNonEmptyString(data.text, "text", 2000);

  const conversationRef = db.collection("conversations").doc(conversationId);
  const messagesRef = conversationRef.collection("messages");
  let messageId = "";

  await db.runTransaction(async (tx) => {
    const conversationSnap = await tx.get(conversationRef);
    if (!conversationSnap.exists) {
      throw new HttpsError("not-found", "Conversation not found.");
    }

    const conversationData = conversationSnap.data() as ConversationDoc;
    const participantIds = getParticipantIds(conversationData);
    if (!participantIds.includes(senderId)) {
      throw new HttpsError(
        "permission-denied",
        "You are not a participant in this conversation.",
      );
    }

    const messageRef = messagesRef.doc();
    messageId = messageRef.id;

    tx.set(messageRef, {
      senderId,
      senderType: "user",
      text,
      createdAt: FieldValue.serverTimestamp(),
      editedAt: null,
      status: "sent",
    });

    const updates: Record<string, unknown> = {
      type: "direct",
      lastMessageText: clip(text, 2000),
      lastMessageSenderId: senderId,
      lastMessageAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      [`unreadCountByUser.${senderId}`]: 0,
    };

    participantIds.forEach((participantId) => {
      if (participantId === senderId) return;
      updates[`unreadCountByUser.${participantId}`] = FieldValue.increment(1);
    });

    tx.update(conversationRef, updates);
  });

  return {
    status: "sent",
    messageId,
  };
});

export const getOrCreateDirectConversation = onCall({
  region: "europe-west1",
  cors: true,
  invoker: "public",
}, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const data = request.data as GetOrCreateDirectConversationPayload;
  const otherUserId = asNonEmptyString(data.otherUserId, "otherUserId", 180);
  const otherUserNameHint = asOptionalString(data.otherUserName, 80);
  const otherUserEmailHint = normalizeEmail(
    asOptionalString(data.otherUserEmail, 160),
  );
  const callerEmailHint = normalizeEmail(
    typeof request.auth?.token?.email === "string" ?
      request.auth.token.email :
      "",
  );

  const conversationId = buildDirectConversationId(uid, otherUserId);
  const conversationRef = db.collection("conversations").doc(conversationId);
  const callerRef = db.collection("users").doc(uid);
  const otherUserRef = db.collection("users").doc(otherUserId);

  await db.runTransaction(async (tx) => {
    const existing = await tx.get(conversationRef);
    if (existing.exists) {
      const participants = getParticipantIds(
        existing.data() as ConversationDoc,
      );
      if (!participants.includes(uid)) {
        throw new HttpsError(
          "permission-denied",
          "You are not a participant in this conversation.",
        );
      }
      return;
    }

    const [callerSnap, otherUserSnap] = await Promise.all([
      tx.get(callerRef),
      tx.get(otherUserRef),
    ]);

    const callerData = callerSnap.exists ?
      (callerSnap.data() as UserDoc) :
      undefined;
    const otherUserData = otherUserSnap.exists ?
      (otherUserSnap.data() as UserDoc) :
      undefined;

    const participantIds = uid === otherUserId ?
      [uid] :
      [uid, otherUserId].sort();

    const unreadCountByUser: Record<string, number> = {};
    participantIds.forEach((participantId) => {
      unreadCountByUser[participantId] = 0;
    });

    tx.set(conversationRef, {
      type: "direct",
      participantIds,
      participantSnapshot: {
        [uid]: {
          username: pickUsername(callerData, "", callerEmailHint),
          email: normalizeEmail(
            asOptionalString(callerData?.email, 160) || callerEmailHint,
          ),
        },
        [otherUserId]: {
          username: pickUsername(
            otherUserData,
            otherUserNameHint,
            otherUserEmailHint,
          ),
          email: normalizeEmail(
            asOptionalString(otherUserData?.email, 160) || otherUserEmailHint,
          ),
        },
      },
      createdBy: uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastMessageText: "",
      lastMessageSenderId: "",
      lastMessageAt: FieldValue.serverTimestamp(),
      unreadCountByUser,
    });
  });

  return {
    status: "ok",
    conversationId,
  };
});

export const markConversationRead = onCall({
  region: "europe-west1",
  cors: true,
  invoker: "public",
}, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const data = request.data as MarkReadPayload;
  const conversationId = asNonEmptyString(
    data.conversationId,
    "conversationId",
    180,
  );
  const conversationRef = db.collection("conversations").doc(conversationId);

  await db.runTransaction(async (tx) => {
    const conversationSnap = await tx.get(conversationRef);
    if (!conversationSnap.exists) {
      throw new HttpsError("not-found", "Conversation not found.");
    }

    const conversationData = conversationSnap.data() as ConversationDoc;
    const participantIds = getParticipantIds(conversationData);
    if (!participantIds.includes(uid)) {
      throw new HttpsError(
        "permission-denied",
        "You are not a participant in this conversation.",
      );
    }

    tx.update(conversationRef, {
      [`unreadCountByUser.${uid}`]: 0,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return {status: "ok"};
});

export const deleteEvent = onCall({
  region: "europe-west1",
  cors: true,
  invoker: "public",
}, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  await assertAdmin(uid);

  const data = request.data as DeleteEventPayload;
  const eventId = asNonEmptyString(data.eventId, "eventId", 180);

  const eventRef = db.collection("events").doc(eventId);
  const eventSnap = await eventRef.get();
  if (!eventSnap.exists) {
    throw new HttpsError("not-found", "Event not found.");
  }

  let deletedSignupCount = 0;
  let lastUserDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  let hasMoreUsers = true;
  while (hasMoreUsers) {
    let usersQuery = db.collection("users").limit(450);
    if (lastUserDoc) {
      usersQuery = usersQuery.startAfter(lastUserDoc);
    }

    const usersSnap = await usersQuery.get();
    if (usersSnap.empty) {
      break;
    }

    const signupRefs = usersSnap.docs.map((userDoc) =>
      userDoc.ref.collection("eventSignups").doc(eventId),
    );
    const signupSnaps = signupRefs.length > 0 ?
      await db.getAll(...signupRefs) :
      [];
    const batch = db.batch();
    let deletedInBatch = 0;
    signupSnaps.forEach((signupSnap) => {
      if (!signupSnap.exists) return;
      batch.delete(signupSnap.ref);
      deletedInBatch += 1;
      deletedSignupCount += 1;
    });
    if (deletedInBatch > 0) {
      await batch.commit();
    }

    lastUserDoc = usersSnap.docs[usersSnap.docs.length - 1];
    hasMoreUsers = usersSnap.size === 450;
  }

  await eventRef.delete();

  return {
    status: "ok",
    deletedSignupCount,
  };
});
