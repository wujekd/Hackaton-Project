import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
  type Unsubscribe,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./firebase";
import type {
  ChatMessage,
  Conversation,
  ConversationParticipantSnapshot,
  MessageSenderIdentity,
  SendMessagePayload,
} from "../types/message";

const CONVERSATIONS_COLLECTION = "conversations";
const MESSAGES_SUBCOLLECTION = "messages";
const MAX_MESSAGE_LENGTH = 2000;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asTimestamp(value: unknown): Timestamp | null {
  if (!value) return null;
  if (isObject(value) && typeof value.toDate === "function") {
    return value as unknown as Timestamp;
  }
  return null;
}

function parseParticipantSnapshot(value: unknown): Record<string, ConversationParticipantSnapshot> {
  if (!isObject(value)) return {};

  const result: Record<string, ConversationParticipantSnapshot> = {};
  Object.entries(value).forEach(([uid, snapshot]) => {
    if (!isObject(snapshot)) return;
    result[uid] = {
      username: typeof snapshot.username === "string" ? snapshot.username : "",
      email: typeof snapshot.email === "string" ? snapshot.email : "",
    };
  });

  return result;
}

function parseUnreadMap(value: unknown): Record<string, number> {
  if (!isObject(value)) return {};

  const result: Record<string, number> = {};
  Object.entries(value).forEach(([uid, count]) => {
    if (typeof count === "number" && Number.isFinite(count)) {
      result[uid] = Math.max(0, Math.floor(count));
    }
  });
  return result;
}

function toConversation(docSnap: QueryDocumentSnapshot<DocumentData>): Conversation {
  const data = docSnap.data();
  const participantIds = Array.isArray(data.participantIds) ?
    data.participantIds.filter((value: unknown): value is string => typeof value === "string") :
    [];

  return {
    id: docSnap.id,
    type: data.type === "direct" ? "direct" : "direct",
    participantIds,
    participantSnapshot: parseParticipantSnapshot(data.participantSnapshot),
    createdBy: typeof data.createdBy === "string" ? data.createdBy : "",
    createdAt: asTimestamp(data.createdAt),
    updatedAt: asTimestamp(data.updatedAt),
    lastMessageText: typeof data.lastMessageText === "string" ? data.lastMessageText : "",
    lastMessageSenderId: typeof data.lastMessageSenderId === "string" ? data.lastMessageSenderId : "",
    lastMessageAt: asTimestamp(data.lastMessageAt),
    unreadCountByUser: parseUnreadMap(data.unreadCountByUser),
  };
}

function toMessage(docSnap: QueryDocumentSnapshot<DocumentData>): ChatMessage {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    senderId: typeof data.senderId === "string" ? data.senderId : "",
    senderType: data.senderType === "ai_placeholder" ? "ai_placeholder" : "user",
    text: typeof data.text === "string" ? data.text : "",
    createdAt: asTimestamp(data.createdAt),
    editedAt: asTimestamp(data.editedAt),
    status: data.status === "placeholder" ? "placeholder" : "sent",
  };
}

function sanitizeText(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length <= MAX_MESSAGE_LENGTH) return trimmed;
  return trimmed.slice(0, MAX_MESSAGE_LENGTH);
}

function conversationRecencyMs(conversation: Conversation): number {
  const latest = conversation.lastMessageAt ?? conversation.updatedAt ?? conversation.createdAt;
  return latest ? latest.toMillis() : 0;
}

const sendMessageCallable = httpsCallable<SendMessagePayload, { status: string; messageId: string }>(
  functions,
  "sendMessage",
);

const getOrCreateDirectConversationCallable = httpsCallable<
  { otherUserId: string; otherUserName?: string; otherUserEmail?: string },
  { status: string; conversationId: string }
>(
  functions,
  "getOrCreateDirectConversation",
);

const markConversationReadCallable = httpsCallable<{ conversationId: string }, { status: string }>(
  functions,
  "markConversationRead",
);

export const MessagingService = {
  subscribeConversations(
    uid: string,
    onData: (conversations: Conversation[]) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    const q = query(
      collection(db, CONVERSATIONS_COLLECTION),
      where("participantIds", "array-contains", uid),
      limit(50),
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const conversations = snapshot.docs
          .map(toConversation)
          .sort((a, b) => conversationRecencyMs(b) - conversationRecencyMs(a));
        onData(conversations);
      },
      (error) => onError?.(error),
    );
  },

  subscribeMessages(
    conversationId: string,
    onData: (messages: ChatMessage[]) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    const q = query(
      collection(db, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_SUBCOLLECTION),
      orderBy("createdAt", "asc"),
      limit(200),
    );

    return onSnapshot(
      q,
      (snapshot) => {
        onData(snapshot.docs.map(toMessage));
      },
      (error) => onError?.(error),
    );
  },

  async ensureDirectConversation(
    currentUser: MessageSenderIdentity,
    otherUserId: string,
    otherUserHint?: { username?: string; email?: string },
  ): Promise<string> {
    const normalizedCurrentUserId = currentUser.uid.trim();
    if (!normalizedCurrentUserId) {
      throw new Error("Current user is required.");
    }

    const normalizedOtherUserId = otherUserId.trim();
    if (!normalizedOtherUserId) {
      throw new Error("Target user is required.");
    }
    if (normalizedOtherUserId === normalizedCurrentUserId) {
      throw new Error("You can't message yourself.");
    }

    const result = await getOrCreateDirectConversationCallable({
      otherUserId: normalizedOtherUserId,
      otherUserName: otherUserHint?.username?.trim() || undefined,
      otherUserEmail: otherUserHint?.email?.trim() || undefined,
    });
    return result.data.conversationId;
  },

  async sendMessage(conversationId: string, text: string): Promise<void> {
    const normalizedText = sanitizeText(text);
    if (!normalizedText) {
      throw new Error("Message cannot be empty.");
    }

    await sendMessageCallable({
      conversationId: conversationId.trim(),
      text: normalizedText,
    });
  },

  async markConversationRead(conversationId: string): Promise<void> {
    await markConversationReadCallable({ conversationId: conversationId.trim() });
  },
};
