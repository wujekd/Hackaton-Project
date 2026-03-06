import type { Timestamp } from "firebase/firestore";

export type ConversationType = "direct";
export type MessageSenderType = "user" | "ai_placeholder";
export type MessageStatus = "sent" | "placeholder";

export interface ConversationParticipantSnapshot {
  username: string;
  email: string;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  participantIds: string[];
  participantSnapshot: Record<string, ConversationParticipantSnapshot>;
  createdBy: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  lastMessageText: string;
  lastMessageSenderId: string;
  lastMessageAt: Timestamp | null;
  unreadCountByUser: Record<string, number>;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderType: MessageSenderType;
  text: string;
  createdAt: Timestamp | null;
  editedAt: Timestamp | null;
  status: MessageStatus;
}

export interface MessageSenderIdentity {
  uid: string;
  username: string;
  email: string;
}

export interface SendMessagePayload {
  conversationId: string;
  text: string;
}
