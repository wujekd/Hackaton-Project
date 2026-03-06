import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { User } from "firebase/auth";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import Messages from "./Messages";
import { mockViewportWidth } from "../test/matchMedia";
import { useAuthStore } from "../stores/auth.store";
import { useMessagingStore } from "../stores/messaging.store";
import type { Conversation } from "../types/message";

const NOW = {
  toDate: () => new Date(),
} as never;

function makeConversation(): Conversation {
  return {
    id: "direct_user-1_user-2",
    type: "direct",
    participantIds: ["user-1", "user-2"],
    participantSnapshot: {
      "user-1": { username: "Alex", email: "alex@example.com" },
      "user-2": { username: "Jamie Kim", email: "jamie@example.com" },
    },
    createdBy: "user-1",
    createdAt: NOW,
    updatedAt: NOW,
    lastMessageText: "Are you interested in the project?",
    lastMessageSenderId: "user-2",
    lastMessageAt: NOW,
    unreadCountByUser: {
      "user-1": 2,
      "user-2": 0,
    },
  };
}

type MessagingOverrides = Partial<ReturnType<typeof useMessagingStore.getState>>;

function renderMessages(route: string, width: number, messagingOverrides: MessagingOverrides = {}) {
  mockViewportWidth(width);

  const user = { uid: "user-1", email: "alex@example.com" } as unknown as User;
  act(() => {
    useAuthStore.setState((state) => ({
      ...state,
      user,
      profile: {
        uid: "user-1",
        email: "alex@example.com",
        username: "Alex",
        createdAt: NOW,
      },
      loading: false,
    }));
  });

  const sendMessage = vi.fn().mockResolvedValue(undefined);
  const ensureDirectConversation = vi.fn().mockResolvedValue("direct_user-1_user-2");
  const listenMessages = vi.fn();
  const stopListeningMessages = vi.fn();
  const markConversationRead = vi.fn().mockResolvedValue(undefined);

  act(() => {
    useMessagingStore.setState((state) => ({
      ...state,
      conversations: [makeConversation()],
      conversationsLoading: false,
      conversationsError: null,
      messages: [
        {
          id: "m1",
          senderId: "user-2",
          senderType: "user",
          text: "Hey Alex, are you free this week?",
          createdAt: NOW,
          editedAt: null,
          status: "sent",
        },
      ],
      messagesLoading: false,
      messagesError: null,
      sending: false,
      listenMessages,
      stopListeningMessages,
      ensureDirectConversation,
      sendMessage,
      markConversationRead,
      ...messagingOverrides,
    }));
  });

  const router = createMemoryRouter(
    [
      { path: "/messages", element: <Messages /> },
      { path: "/messages/:conversationId", element: <Messages /> },
    ],
    { initialEntries: [route] },
  );

  return {
    ...render(<RouterProvider router={router} />),
    sendMessage,
    ensureDirectConversation,
  };
}

describe("Messages", () => {
  afterEach(() => {
    act(() => {
      useAuthStore.setState((state) => ({
        ...state,
        user: null,
        profile: null,
        loading: false,
      }));

      useMessagingStore.setState((state) => ({
        ...state,
        conversations: [],
        conversationsLoading: false,
        conversationsError: null,
        messages: [],
        messagesLoading: false,
        messagesError: null,
        sending: false,
        unreadTotal: 0,
        listenMessages: vi.fn(),
        stopListeningMessages: vi.fn(),
        ensureDirectConversation: vi.fn().mockResolvedValue(""),
        sendMessage: vi.fn().mockResolvedValue(undefined),
        markConversationRead: vi.fn().mockResolvedValue(undefined),
      }));
    });
  });

  it("uses a two-step list-to-thread flow on mobile", async () => {
    renderMessages("/messages", 375);

    expect(screen.getByText("Conversations")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Back" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: /Jamie Kim/i }));

    expect(await screen.findByRole("link", { name: "Back" })).toBeInTheDocument();
    expect(screen.getByText("Jamie Kim")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Back" }));

    expect(await screen.findByText("Conversations")).toBeInTheDocument();
  });

  it("shows a loading state for conversations", () => {
    renderMessages("/messages", 1280, {
      conversations: [],
      conversationsLoading: true,
      conversationsError: null,
    });

    expect(screen.getByText("Loading conversations...")).toBeInTheDocument();
  });

  it("sends a message from a direct thread", async () => {
    const { sendMessage } = renderMessages("/messages/direct_user-1_user-2", 1280);

    fireEvent.change(screen.getByPlaceholderText("Write a message..."), {
      target: { value: "Sounds good, let's schedule a call." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith("direct_user-1_user-2", "Sounds good, let's schedule a call.");
    });
  });

  it("shows the AI chatbot with a working input", () => {
    renderMessages("/messages/ai-assistant", 1280);

    expect(screen.getByText("Online")).toBeInTheDocument();
    expect(screen.getByText(/Ask me anything about collaborations/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ask Collab AI...")).toBeInTheDocument();
  });

  it("blocks opening a direct conversation with yourself from deep links", async () => {
    const { ensureDirectConversation } = renderMessages(
      "/messages?userId=user-1",
      1280,
    );

    expect(await screen.findByText("You can't message yourself.")).toBeInTheDocument();
    expect(ensureDirectConversation).not.toHaveBeenCalled();
  });
});
