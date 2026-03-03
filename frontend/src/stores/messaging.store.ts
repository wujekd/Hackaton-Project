import { create } from "zustand";
import type { Unsubscribe } from "firebase/firestore";
import { MessagingService } from "../services/messaging.service";
import type { ChatMessage, Conversation, MessageSenderIdentity } from "../types/message";

interface MessagingState {
  currentUid: string | null;
  conversations: Conversation[];
  conversationsLoading: boolean;
  conversationsError: string | null;
  selectedConversationId: string | null;
  messages: ChatMessage[];
  messagesLoading: boolean;
  messagesError: string | null;
  sending: boolean;
  unreadTotal: number;
  listenConversations: (uid: string) => void;
  listenMessages: (conversationId: string) => void;
  stopListeningMessages: () => void;
  stopAll: () => void;
  setSelectedConversationId: (conversationId: string | null) => void;
  ensureDirectConversation: (
    currentUser: MessageSenderIdentity,
    otherUserId: string,
    otherUserHint?: { username?: string; email?: string },
  ) => Promise<string>;
  sendMessage: (conversationId: string, text: string) => Promise<void>;
  markConversationRead: (conversationId: string) => Promise<void>;
}

export const useMessagingStore = create<MessagingState>((set, get) => {
  let conversationsUnsub: Unsubscribe | null = null;
  let messagesUnsub: Unsubscribe | null = null;

  return {
    currentUid: null,
    conversations: [],
    conversationsLoading: false,
    conversationsError: null,
    selectedConversationId: null,
    messages: [],
    messagesLoading: false,
    messagesError: null,
    sending: false,
    unreadTotal: 0,

    listenConversations: (uid) => {
      const normalizedUid = uid.trim();
      if (!normalizedUid) return;

      const state = get();
      if (state.currentUid === normalizedUid && conversationsUnsub) {
        return;
      }

      conversationsUnsub?.();
      set({
        currentUid: normalizedUid,
        conversationsLoading: true,
        conversationsError: null,
      });

      conversationsUnsub = MessagingService.subscribeConversations(
        normalizedUid,
        (conversations) => {
          const unreadTotal = conversations.reduce(
            (sum, conversation) => sum + Math.max(0, conversation.unreadCountByUser[normalizedUid] ?? 0),
            0,
          );

          set({
            conversations,
            conversationsLoading: false,
            conversationsError: null,
            unreadTotal,
          });
        },
        (error) => {
          set({
            conversationsLoading: false,
            conversationsError: error.message,
          });
        },
      );
    },

    listenMessages: (conversationId) => {
      const normalizedConversationId = conversationId.trim();
      if (!normalizedConversationId) return;

      messagesUnsub?.();
      set({
        selectedConversationId: normalizedConversationId,
        messages: [],
        messagesLoading: true,
        messagesError: null,
      });

      messagesUnsub = MessagingService.subscribeMessages(
        normalizedConversationId,
        (messages) => {
          set({
            messages,
            messagesLoading: false,
            messagesError: null,
          });
        },
        (error) => {
          set({
            messagesLoading: false,
            messagesError: error.message,
          });
        },
      );
    },

    stopListeningMessages: () => {
      messagesUnsub?.();
      messagesUnsub = null;
      set({
        selectedConversationId: null,
        messages: [],
        messagesLoading: false,
        messagesError: null,
      });
    },

    stopAll: () => {
      conversationsUnsub?.();
      messagesUnsub?.();
      conversationsUnsub = null;
      messagesUnsub = null;
      set({
        currentUid: null,
        conversations: [],
        conversationsLoading: false,
        conversationsError: null,
        selectedConversationId: null,
        messages: [],
        messagesLoading: false,
        messagesError: null,
        sending: false,
        unreadTotal: 0,
      });
    },

    setSelectedConversationId: (conversationId) => {
      set({ selectedConversationId: conversationId });
    },

    ensureDirectConversation: async (currentUser, otherUserId, otherUserHint) => {
      return MessagingService.ensureDirectConversation(currentUser, otherUserId, otherUserHint);
    },

    sendMessage: async (conversationId, text) => {
      set({ sending: true, messagesError: null });
      try {
        await MessagingService.sendMessage(conversationId, text);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to send message.";
        set({ messagesError: message });
        throw error;
      } finally {
        set({ sending: false });
      }
    },

    markConversationRead: async (conversationId) => {
      try {
        await MessagingService.markConversationRead(conversationId);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update read state.";
        set({ messagesError: message });
      }
    },
  };
});
