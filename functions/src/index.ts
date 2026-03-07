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

type PollOption = {
  id: string;
  label: string;
  votes: number;
};

type PollPlaceholderSummary = {
  status: "placeholder";
  title: string;
  description: string;
};

type PollLiveSummary = {
  status: "live";
  pollId: string;
  title: string;
  options: PollOption[];
  totalVotes: number;
  allowVoteChange: boolean;
};

type PollSummary = PollPlaceholderSummary | PollLiveSummary;

type FeedPayload = {
  generatedAt: string;
  collaborations: CollaborationCard[];
  events: EventCard[];
  polls: PollSummary;
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

type CreatePollPayload = {
  title?: unknown;
  options?: unknown;
  allowVoteChange?: unknown;
};

type PublishPollPayload = {
  pollId?: unknown;
};

type ClosePollPayload = {
  pollId?: unknown;
};

type SubmitFeedbackPayload = {
  subject?: unknown;
  message?: unknown;
  route?: unknown;
  contextLabel?: unknown;
  userName?: unknown;
  userEmail?: unknown;
};

type UpdateFeedbackStatusPayload = {
  feedbackId?: unknown;
  addressed?: unknown;
};

type DeleteFeedbackPayload = {
  feedbackId?: unknown;
};

type FeedbackDoc = {
  uid?: unknown;
  userName?: unknown;
  userEmail?: unknown;
  subject?: unknown;
  message?: unknown;
  route?: unknown;
  contextLabel?: unknown;
  createdAt?: unknown;
  addressed?: unknown;
  addressedAt?: unknown;
  updatedAt?: unknown;
};

type CastPollVotePayload = {
  pollId?: unknown;
  optionId?: unknown;
};

type ConversationDoc = {
  participantIds?: unknown;
};

type UserDoc = {
  nickname?: unknown;
  username?: unknown;
  email?: unknown;
};

type PollDoc = {
  title?: unknown;
  status?: unknown;
  active?: unknown;
  options?: unknown;
  totalVotes?: unknown;
  allowVoteChange?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
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

const asBoolean = (value: unknown, field: string): boolean => {
  if (typeof value !== "boolean") {
    throw new HttpsError("invalid-argument", `${field} must be a boolean.`);
  }

  return value;
};

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

const buildDirectConversationId = (uidA: string, uidB: string): string => {
  const sorted = [uidA, uidB].sort();
  return `direct_${sorted[0]}_${sorted[1]}`;
};

const POLLS_COLLECTION = "polls";
const POLL_VOTES_SUBCOLLECTION = "votes";
const POLL_PLACEHOLDER_TITLE = "Polls are coming soon";
const POLL_PLACEHOLDER_DESCRIPTION =
  "This section is reserved for live poll results.";

const buildPlaceholderPoll = (): PollPlaceholderSummary => ({
  status: "placeholder",
  title: POLL_PLACEHOLDER_TITLE,
  description: POLL_PLACEHOLDER_DESCRIPTION,
});

const normalizePollStatus = (value: unknown): "draft" | "live" | "closed" => {
  if (value === "live" || value === "closed") return value;
  return "draft";
};

const asPollOptionLabels = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    throw new HttpsError("invalid-argument", "options must be an array.");
  }

  const normalized = value
    .map((option) => asOptionalString(option, 120))
    .filter((option) => !!option);

  const unique: string[] = [];
  const seen = new Set<string>();
  normalized.forEach((option) => {
    const dedupeKey = option.toLowerCase();
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    unique.push(option);
  });

  if (unique.length < 2) {
    throw new HttpsError(
      "invalid-argument",
      "At least two unique options are required.",
    );
  }
  if (unique.length > 8) {
    throw new HttpsError(
      "invalid-argument",
      "A poll can contain at most eight options.",
    );
  }

  return unique;
};

const parsePollOptions = (value: unknown): PollOption[] => {
  if (!Array.isArray(value)) return [];

  const parsed: PollOption[] = [];
  value.forEach((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      return;
    }
    const candidate = entry as Record<string, unknown>;
    const id = asOptionalString(candidate.id, 80) || `opt_${index + 1}`;
    const label =
      asOptionalString(candidate.label, 120) || `Option ${index + 1}`;
    const rawVotes = candidate.votes;
    const votes = typeof rawVotes === "number" && Number.isFinite(rawVotes) ?
      Math.max(0, Math.floor(rawVotes)) :
      0;
    parsed.push({id, label, votes});
  });

  return parsed;
};

const computeTotalVotes = (options: PollOption[]): number =>
  options.reduce((sum, option) => sum + option.votes, 0);

const parsePollSummary = (
  pollId: string,
  data: PollDoc,
): PollLiveSummary | null => {
  const status = normalizePollStatus(data.status);
  if (status !== "live") return null;

  const options = parsePollOptions(data.options);
  if (options.length === 0) return null;

  const totalVotes = typeof data.totalVotes === "number" &&
    Number.isFinite(data.totalVotes) ?
    Math.max(0, Math.floor(data.totalVotes)) :
    computeTotalVotes(options);

  return {
    status: "live",
    pollId,
    title: asOptionalString(data.title, 180) || "Campus Poll",
    options,
    totalVotes,
    allowVoteChange: data.allowVoteChange === true,
  };
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
  const docNickname = asOptionalString(userDoc?.nickname, 80);
  if (docNickname) return docNickname;

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

const getActivePollSummary = async (): Promise<PollSummary> => {
  const snapshot = await db
    .collection(POLLS_COLLECTION)
    .where("status", "==", "live")
    .limit(1)
    .get();

  if (snapshot.empty) return buildPlaceholderPoll();

  const liveDoc = snapshot.docs[0];
  const summary = parsePollSummary(liveDoc.id, liveDoc.data() as PollDoc);
  if (!summary) return buildPlaceholderPoll();
  return summary;
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
  const [collaborations, events, polls] = await Promise.all([
    getCollaborations(),
    getEvents(),
    getActivePollSummary(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    collaborations,
    events,
    polls,
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
      polls: buildPlaceholderPoll(),
    });
  }
});

export const createPoll = onCall({
  region: "europe-west1",
  cors: true,
  invoker: "public",
}, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  await assertAdmin(uid);

  const data = request.data as CreatePollPayload;
  const title = asNonEmptyString(data.title, "title", 180);
  const labels = asPollOptionLabels(data.options);
  const allowVoteChange = data.allowVoteChange === true;
  const options = labels.map((label, index) => ({
    id: `opt_${index + 1}`,
    label,
    votes: 0,
  }));

  const pollRef = db.collection(POLLS_COLLECTION).doc();
  await pollRef.set({
    title,
    status: "draft",
    active: false,
    allowVoteChange,
    options,
    totalVotes: 0,
    createdBy: uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    publishedAt: null,
    closedAt: null,
  });

  return {
    status: "ok",
    pollId: pollRef.id,
  };
});

export const listPolls = onCall({
  region: "europe-west1",
  cors: true,
  invoker: "public",
}, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  await assertAdmin(uid);

  const snapshot = await db
    .collection(POLLS_COLLECTION)
    .orderBy("updatedAt", "desc")
    .limit(30)
    .get();

  return {
    status: "ok",
    polls: snapshot.docs.map((doc) => {
      const data = doc.data() as PollDoc;
      const options = parsePollOptions(data.options);
      return {
        pollId: doc.id,
        title: asOptionalString(data.title, 180) || "Untitled poll",
        status: normalizePollStatus(data.status),
        active: data.active === true,
        allowVoteChange: data.allowVoteChange === true,
        options,
        totalVotes: typeof data.totalVotes === "number" &&
          Number.isFinite(data.totalVotes) ?
          Math.max(0, Math.floor(data.totalVotes)) :
          computeTotalVotes(options),
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
      };
    }),
  };
});

export const listFeedback = onCall({
  region: "europe-west1",
  cors: true,
  invoker: "public",
}, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  await assertAdmin(uid);

  const snapshot = await db
    .collection("feedback")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  return {
    status: "ok",
    feedback: snapshot.docs.map((doc) => {
      const data = doc.data() as FeedbackDoc;
      return {
        id: doc.id,
        uid: asOptionalString(data.uid, 180),
        userName: asOptionalString(data.userName, 120) || null,
        userEmail: asOptionalString(data.userEmail, 180) || null,
        subject: asOptionalString(data.subject, 80) || "General Feedback",
        message: asOptionalString(data.message, 2000),
        route: asOptionalString(data.route, 200),
        contextLabel: asOptionalString(data.contextLabel, 80),
        createdAt: toIso(data.createdAt),
        addressed: data.addressed === true,
        addressedAt: toIso(data.addressedAt),
      };
    }),
  };
});

export const submitFeedback = onCall({
  region: "europe-west1",
  cors: true,
  invoker: "public",
}, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const data = request.data as SubmitFeedbackPayload;
  const subject = asNonEmptyString(data.subject, "subject", 80);
  const message = asNonEmptyString(data.message, "message", 2000);
  const route = asOptionalString(data.route, 200);
  const contextLabel = asOptionalString(data.contextLabel, 80);
  const userName = asOptionalString(data.userName, 120);
  const userEmail = asOptionalString(data.userEmail, 180);

  await db.collection("feedback").add({
    uid,
    userName: userName || null,
    userEmail: userEmail || null,
    subject,
    message,
    route,
    contextLabel,
    addressed: false,
    addressedAt: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {status: "ok"};
});

export const updateFeedbackStatus = onCall({
  region: "europe-west1",
  cors: true,
  invoker: "public",
}, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  await assertAdmin(uid);

  const data = request.data as UpdateFeedbackStatusPayload;
  const feedbackId = asNonEmptyString(data.feedbackId, "feedbackId", 180);
  const addressed = asBoolean(data.addressed, "addressed");

  const feedbackRef = db.collection("feedback").doc(feedbackId);
  const feedbackSnap = await feedbackRef.get();
  if (!feedbackSnap.exists) {
    throw new HttpsError("not-found", "Feedback not found.");
  }

  await feedbackRef.update({
    addressed,
    addressedAt: addressed ? FieldValue.serverTimestamp() : null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {status: "ok"};
});

export const deleteFeedback = onCall({
  region: "europe-west1",
  cors: true,
  invoker: "public",
}, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  await assertAdmin(uid);

  const data = request.data as DeleteFeedbackPayload;
  const feedbackId = asNonEmptyString(data.feedbackId, "feedbackId", 180);

  const feedbackRef = db.collection("feedback").doc(feedbackId);
  const feedbackSnap = await feedbackRef.get();
  if (!feedbackSnap.exists) {
    throw new HttpsError("not-found", "Feedback not found.");
  }

  await feedbackRef.delete();

  return {status: "ok"};
});

export const publishPoll = onCall({
  region: "europe-west1",
  cors: true,
  invoker: "public",
}, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  await assertAdmin(uid);

  const data = request.data as PublishPollPayload;
  const pollId = asNonEmptyString(data.pollId, "pollId", 180);
  const pollRef = db.collection(POLLS_COLLECTION).doc(pollId);

  const livePolls = await db
    .collection(POLLS_COLLECTION)
    .where("status", "==", "live")
    .limit(5)
    .get();
  const conflicting = livePolls.docs.find((doc) => doc.id !== pollId);
  if (conflicting) {
    throw new HttpsError(
      "failed-precondition",
      "Another poll is already live. Close it before publishing a new poll.",
    );
  }

  await db.runTransaction(async (tx) => {
    const pollSnap = await tx.get(pollRef);
    if (!pollSnap.exists) {
      throw new HttpsError("not-found", "Poll not found.");
    }

    const pollData = pollSnap.data() as PollDoc;
    const status = normalizePollStatus(pollData.status);
    const options = parsePollOptions(pollData.options);
    if (options.length < 2) {
      throw new HttpsError(
        "failed-precondition",
        "Poll must contain at least two options before publishing.",
      );
    }
    if (status === "live") {
      tx.update(pollRef, {
        active: true,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return;
    }
    if (status !== "draft" && status !== "closed") {
      throw new HttpsError(
        "failed-precondition",
        "Only draft or closed polls can be published.",
      );
    }

    tx.update(pollRef, {
      status: "live",
      active: true,
      publishedAt: FieldValue.serverTimestamp(),
      closedAt: null,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return {
    status: "ok",
    pollId,
  };
});

export const closePoll = onCall({
  region: "europe-west1",
  cors: true,
  invoker: "public",
}, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  await assertAdmin(uid);

  const data = request.data as ClosePollPayload;
  const pollId = asNonEmptyString(data.pollId, "pollId", 180);
  const pollRef = db.collection(POLLS_COLLECTION).doc(pollId);

  await db.runTransaction(async (tx) => {
    const pollSnap = await tx.get(pollRef);
    if (!pollSnap.exists) {
      throw new HttpsError("not-found", "Poll not found.");
    }

    const pollData = pollSnap.data() as PollDoc;
    const status = normalizePollStatus(pollData.status);
    if (status === "closed") return;

    tx.update(pollRef, {
      status: "closed",
      active: false,
      closedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return {
    status: "ok",
    pollId,
  };
});

export const getActivePoll = onCall({
  region: "europe-west1",
  cors: true,
  invoker: "public",
}, async (request) => {
  const summary = await getActivePollSummary();
  if (summary.status === "placeholder") {
    return summary;
  }

  const uid = request.auth?.uid;
  if (!uid) {
    return {
      ...summary,
      userVoteOptionId: null,
    };
  }

  const voteSnap = await db
    .collection(POLLS_COLLECTION)
    .doc(summary.pollId)
    .collection(POLL_VOTES_SUBCOLLECTION)
    .doc(uid)
    .get();

  const userVoteOptionId = voteSnap.exists ?
    asOptionalString(voteSnap.get("optionId"), 80) || null :
    null;

  return {
    ...summary,
    userVoteOptionId,
  };
});

export const castPollVote = onCall({
  region: "europe-west1",
  cors: true,
  invoker: "public",
}, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const data = request.data as CastPollVotePayload;
  const pollId = asNonEmptyString(data.pollId, "pollId", 180);
  const optionId = asNonEmptyString(data.optionId, "optionId", 80);

  const pollRef = db.collection(POLLS_COLLECTION).doc(pollId);
  const voteRef = pollRef.collection(POLL_VOTES_SUBCOLLECTION).doc(uid);

  let result:
    | {
      status: "ok";
      pollId: string;
      selectedOptionId: string;
      totalVotes: number;
      options: PollOption[];
    }
    | null = null;

  await db.runTransaction(async (tx) => {
    const pollSnap = await tx.get(pollRef);
    if (!pollSnap.exists) {
      throw new HttpsError("not-found", "Poll not found.");
    }

    const pollData = pollSnap.data() as PollDoc;
    const status = normalizePollStatus(pollData.status);
    if (status !== "live" || pollData.active !== true) {
      throw new HttpsError(
        "failed-precondition",
        "Poll is not open for voting.",
      );
    }

    const options = parsePollOptions(pollData.options);
    if (options.length < 2) {
      throw new HttpsError(
        "failed-precondition",
        "Poll options are not configured correctly.",
      );
    }

    const selectedIndex = options.findIndex((option) => option.id === optionId);
    if (selectedIndex < 0) {
      throw new HttpsError("invalid-argument", "Selected option is invalid.");
    }

    const allowVoteChange = pollData.allowVoteChange === true;
    const voteSnap = await tx.get(voteRef);
    let totalVotes = typeof pollData.totalVotes === "number" &&
      Number.isFinite(pollData.totalVotes) ?
      Math.max(0, Math.floor(pollData.totalVotes)) :
      computeTotalVotes(options);

    if (voteSnap.exists) {
      const previousOptionId = asOptionalString(voteSnap.get("optionId"), 80);
      if (previousOptionId === optionId) {
        result = {
          status: "ok",
          pollId,
          selectedOptionId: optionId,
          totalVotes,
          options,
        };
        return;
      }
      if (!allowVoteChange) {
        throw new HttpsError(
          "failed-precondition",
          "This poll does not allow vote changes.",
        );
      }

      const previousIndex = options.findIndex(
        (option) => option.id === previousOptionId,
      );
      if (previousIndex < 0) {
        throw new HttpsError(
          "failed-precondition",
          "Previous vote option is no longer available.",
        );
      }

      options[previousIndex] = {
        ...options[previousIndex],
        votes: Math.max(0, options[previousIndex].votes - 1),
      };
      options[selectedIndex] = {
        ...options[selectedIndex],
        votes: options[selectedIndex].votes + 1,
      };

      const nextTotalVotes = computeTotalVotes(options);
      tx.update(pollRef, {
        options,
        totalVotes: nextTotalVotes,
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.set(voteRef, {
        optionId,
        updatedAt: FieldValue.serverTimestamp(),
      }, {merge: true});

      totalVotes = nextTotalVotes;
      result = {
        status: "ok",
        pollId,
        selectedOptionId: optionId,
        totalVotes,
        options,
      };
      return;
    }

    options[selectedIndex] = {
      ...options[selectedIndex],
      votes: options[selectedIndex].votes + 1,
    };
    totalVotes += 1;

    tx.update(pollRef, {
      options,
      totalVotes,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(voteRef, {
      optionId,
      votedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true});

    result = {
      status: "ok",
      pollId,
      selectedOptionId: optionId,
      totalVotes,
      options,
    };
  });

  if (!result) {
    throw new HttpsError("internal", "Unable to cast vote.");
  }

  return result;
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
  if (otherUserId === uid) {
    throw new HttpsError(
      "invalid-argument",
      "You cannot start a direct conversation with yourself.",
    );
  }
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

      tx.update(conversationRef, {
        [`participantSnapshot.${uid}.username`]: pickUsername(
          callerData,
          "",
          callerEmailHint,
        ),
        [`participantSnapshot.${uid}.email`]: normalizeEmail(
          asOptionalString(callerData?.email, 160) || callerEmailHint,
        ),
        [`participantSnapshot.${otherUserId}.username`]: pickUsername(
          otherUserData,
          otherUserNameHint,
          otherUserEmailHint,
        ),
        [`participantSnapshot.${otherUserId}.email`]: normalizeEmail(
          asOptionalString(otherUserData?.email, 160) || otherUserEmailHint,
        ),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    const participantIds = [uid, otherUserId].sort();

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
