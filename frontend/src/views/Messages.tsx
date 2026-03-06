import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { sendAiMessage, type AiChatHistory } from "../services/ai-chat.service";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useAuthStore } from "../stores/auth.store";
import { useMessagingStore } from "../stores/messaging.store";
import type { ChatMessage, Conversation } from "../types/message";
import { formatRelativeDate } from "../utils/date";
import { buildDirectConversationId } from "../utils/messaging";

interface ConversationView {
  id: string;
  initials: string;
  name: string;
  preview: string;
  time: string;
  tone: string;
  status: string;
  unreadCount: number;
}

interface ThreadMessageView {
  id: string;
  sender: "me" | "other";
  text: string;
  time: string;
  deliveryState?: "sending" | "sent_flash";
}

const AI_CONVERSATION_ID = "ai-assistant";

interface AiMessage {
  id: string;
  sender: "me" | "ai";
  text: string;
  time: string;
}

interface OptimisticOutgoingMessage {
  id: string;
  conversationId: string;
  text: string;
  createdAtMs: number;
  deliveryState: "sending" | "sent_flash";
}

const AI_WELCOME_MESSAGE: AiMessage = {
  id: "ai-welcome",
  sender: "ai",
  text: "Hi! I'm Collab AI. Ask me anything about collaborations, events, or university life.",
  time: "just now",
};

let aiMessageCounter = 0;
function nextAiMessageId(): string {
  aiMessageCounter += 1;
  return `ai-msg-${aiMessageCounter}`;
}

let optimisticMessageCounter = 0;
function nextOptimisticMessageId(): string {
  optimisticMessageCounter += 1;
  return `optimistic-msg-${optimisticMessageCounter}`;
}

const AVATAR_TONES = ["av-red", "av-mid", "av-slate", "av-muted"];

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function toneForId(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
}

function mapConversation(conversation: Conversation, currentUid: string): ConversationView {
  const partnerUid =
    conversation.participantIds.find((uid) => uid !== currentUid) ?? conversation.participantIds[0] ?? "";
  const partner = conversation.participantSnapshot[partnerUid] ?? null;
  const fallback = conversation.participantSnapshot[currentUid] ?? null;
  const name = partner?.username || partner?.email || fallback?.username || fallback?.email || "Unknown user";
  const preview = conversation.lastMessageText.trim();
  const sentByMe = conversation.lastMessageSenderId === currentUid;

  return {
    id: conversation.id,
    initials: initials(name),
    name,
    preview: preview ? (sentByMe ? `You: ${preview}` : preview) : "Start the conversation",
    time: formatRelativeDate(conversation.lastMessageAt ?? conversation.createdAt),
    tone: toneForId(partnerUid || conversation.id),
    status: conversation.lastMessageAt ? "Active recently" : "No messages yet",
    unreadCount: Math.max(0, conversation.unreadCountByUser[currentUid] ?? 0),
  };
}

function mapMessageTime(message: ChatMessage): string {
  return formatRelativeDate(message.createdAt);
}

function createdAtMs(message: ChatMessage): number {
  return message.createdAt?.toDate().getTime() ?? Number.NaN;
}

function matchOptimisticToServerMessages(
  optimisticMessages: OptimisticOutgoingMessage[],
  serverMessages: ChatMessage[],
  currentUid: string | undefined,
): { matchedPendingIds: Set<string>; matchedServerMessageIds: Set<string> } {
  const matchedPendingIds = new Set<string>();
  const matchedServerMessageIds = new Set<string>();
  if (!currentUid || optimisticMessages.length === 0) {
    return { matchedPendingIds, matchedServerMessageIds };
  }

  const ownServerMessages = serverMessages.filter((message) => message.senderId === currentUid);
  const usedServerIds = new Set<string>();
  const sortedOptimistic = [...optimisticMessages].sort((a, b) => a.createdAtMs - b.createdAtMs);

  sortedOptimistic.forEach((pending) => {
    let bestMatchId: string | null = null;
    let bestScore = Number.POSITIVE_INFINITY;

    ownServerMessages.forEach((serverMessage) => {
      if (usedServerIds.has(serverMessage.id)) return;
      if (serverMessage.text !== pending.text) return;

      const serverMs = createdAtMs(serverMessage);
      if (!Number.isFinite(serverMs)) {
        if (bestScore > 0) {
          bestScore = 0;
          bestMatchId = serverMessage.id;
        }
        return;
      }

      const delta = Math.abs(serverMs - pending.createdAtMs);
      if (delta > 2 * 60 * 1000) return;
      if (delta < bestScore) {
        bestScore = delta;
        bestMatchId = serverMessage.id;
      }
    });

    if (!bestMatchId) return;
    usedServerIds.add(bestMatchId);
    matchedPendingIds.add(pending.id);
    matchedServerMessageIds.add(bestMatchId);
  });

  return { matchedPendingIds, matchedServerMessageIds };
}

function ConversationList({
  activeId,
  conversations,
  loading,
  error,
}: {
  activeId?: string | null;
  conversations: ConversationView[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <>
      <div className="chat-sidebar-title">Conversations</div>
      <Link
        className={`chat-item chat-item-link${activeId === AI_CONVERSATION_ID ? " active" : ""}`}
        to={`/messages/${AI_CONVERSATION_ID}`}
      >
        <div className="avatar av-red" style={{ width: 28, height: 28, fontSize: 9 }}>
          AI
        </div>
        <div className="chat-item-info">
          <div className="chat-item-name">Collab AI</div>
          <div className="chat-item-preview">Ask me anything</div>
        </div>
        <div className="chat-item-meta">
          <div className="chat-item-time">now</div>
        </div>
      </Link>
      <div className="chat-divider">Direct Messages</div>
      {loading && <div className="chat-empty">Loading conversations...</div>}
      {error && <div className="chat-empty">{error}</div>}
      {!loading && !error && conversations.length === 0 && (
        <div className="chat-empty">No direct conversations yet.</div>
      )}
      {conversations.map((conversation) => (
        <Link
          className={`chat-item chat-item-link${activeId === conversation.id ? " active" : ""}`}
          to={`/messages/${conversation.id}`}
          key={conversation.id}
        >
          <div className={`avatar ${conversation.tone}`} style={{ width: 28, height: 28, fontSize: 9 }}>
            {conversation.initials}
          </div>
          <div className="chat-item-info">
            <div className="chat-item-name">{conversation.name}</div>
            <div className="chat-item-preview">{conversation.preview}</div>
          </div>
          <div className="chat-item-meta">
            <div className="chat-item-time">{conversation.time}</div>
            {conversation.unreadCount > 0 && (
              <div className="chat-unread">{conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}</div>
            )}
          </div>
        </Link>
      ))}
    </>
  );
}

function ConversationThread({
  conversation,
  mobile,
  messages,
  loading,
  error,
  draft,
  onDraftChange,
  onSubmit,
  sending,
}: {
  conversation: ConversationView;
  mobile: boolean;
  messages: Array<{ id: string; sender: "me" | "other"; text: string; time: string; deliveryState?: "sending" | "sent_flash" }>;
  loading: boolean;
  error: string | null;
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  sending: boolean;
}) {
  const isAiConversation = conversation.id === AI_CONVERSATION_ID;

  return (
    <section className="chat-main">
      <div className="chat-topbar">
        {mobile && (
          <Link className="btn-sm outline chat-back-btn" to="/messages">
            Back
          </Link>
        )}
        <div className="shield" style={{ width: 26, height: 30 }}>
          <div className="shield-text" style={{ fontSize: 11 }}>
            {conversation.initials}
          </div>
        </div>
        <div>
          <div className="chat-partner-name">{conversation.name}</div>
          <div className="chat-partner-status">{conversation.status}</div>
        </div>
      </div>

      <div className="chat-messages">
        {loading && <div className="chat-thread-empty">Loading messages...</div>}
        {error && <div className="chat-thread-empty">{error}</div>}
        {!loading && !error && messages.length === 0 && (
          <div className="chat-thread-empty">No messages yet. Say hello to get started.</div>
        )}
        {!loading && !error && messages.map((message) => (
          <div className={`msg${message.sender === "me" ? " own" : ""}`} key={message.id}>
            {message.sender === "other" ? (
              <div className="shield" style={{ width: 24, height: 28 }}>
                <div className="shield-text" style={{ fontSize: 10 }}>{conversation.initials}</div>
              </div>
            ) : (
              <div className="avatar av-red" style={{ width: 26, height: 26, fontSize: 9 }}>ME</div>
            )}
            <div>
              <div className="msg-bubble">{message.text}</div>
              <div className="msg-time">
                <span>{message.time}</span>
                {message.deliveryState && (
                  <span
                    className={`msg-status-dot ${
                      message.deliveryState === "sending" ? "is-sending" : "is-sent"
                    }`}
                    aria-label={message.deliveryState === "sending" ? "Sending" : "Sent"}
                    title={message.deliveryState === "sending" ? "Sending" : "Sent"}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
        {isAiConversation && sending && (
          <div className="msg" key="ai-thinking">
            <div className="shield" style={{ width: 24, height: 28 }}>
              <div className="shield-text" style={{ fontSize: 10 }}>AI</div>
            </div>
            <div>
              <div className="msg-bubble" style={{ opacity: 0.6, fontStyle: "italic" }}>Thinking...</div>
            </div>
          </div>
        )}
      </div>

      <div className="chat-input-bar">
        <form className="chat-input-form" onSubmit={onSubmit}>
          <input
            className="chat-input"
            placeholder={isAiConversation ? "Ask Collab AI..." : "Write a message..."}
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            disabled={sending}
          />
          <button className="btn-sm accent" type="submit" disabled={sending || !draft.trim()}>
            {sending ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default function Messages() {
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId?: string }>();
  const [searchParams] = useSearchParams();
  const { user, profile, loading: authLoading } = useAuthStore();
  const [composeValue, setComposeValue] = useState("");
  const [deepLinkError, setDeepLinkError] = useState<string | null>(null);

  const [aiMessages, setAiMessages] = useState<AiMessage[]>([AI_WELCOME_MESSAGE]);
  const [aiSending, setAiSending] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiHistoryRef = useRef<AiChatHistory[]>([]);
  const [optimisticOutgoingByConversation, setOptimisticOutgoingByConversation] = useState<
    Record<string, OptimisticOutgoingMessage[]>
  >({});
  const optimisticClearTimersRef = useRef<Map<string, number>>(new Map());

  const conversations = useMessagingStore((state) => state.conversations);
  const conversationsLoading = useMessagingStore((state) => state.conversationsLoading);
  const conversationsError = useMessagingStore((state) => state.conversationsError);
  const messages = useMessagingStore((state) => state.messages);
  const messagesLoading = useMessagingStore((state) => state.messagesLoading);
  const messagesError = useMessagingStore((state) => state.messagesError);
  const sending = useMessagingStore((state) => state.sending);
  const listenMessages = useMessagingStore((state) => state.listenMessages);
  const stopListeningMessages = useMessagingStore((state) => state.stopListeningMessages);
  const ensureDirectConversation = useMessagingStore((state) => state.ensureDirectConversation);
  const sendMessage = useMessagingStore((state) => state.sendMessage);
  const markConversationRead = useMessagingStore((state) => state.markConversationRead);

  const targetUserId = searchParams.get("userId")?.trim() ?? "";
  const targetUsernameHint = searchParams.get("username")?.trim() ?? "";
  const normalizedRouteConversationId = conversationId?.trim() ?? "";
  const optimisticDirectConversationId =
    user && targetUserId && targetUserId !== user.uid ?
      buildDirectConversationId(user.uid, targetUserId) :
      "";

  useEffect(() => {
    return () => {
      optimisticClearTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      optimisticClearTimersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!user || !targetUserId) return;
    if (targetUserId === user.uid) {
      setDeepLinkError("You can't message yourself.");
      navigate("/messages", { replace: true });
      return;
    }

    let cancelled = false;
    const openDirectConversation = async () => {
      const identity = {
        uid: user.uid,
        username: profile?.nickname?.trim() || profile?.username || user.displayName || user.email || "Unknown user",
        email: user.email ?? "",
      };

      if (optimisticDirectConversationId && normalizedRouteConversationId !== optimisticDirectConversationId) {
        const params = new URLSearchParams();
        params.set("userId", targetUserId);
        if (targetUsernameHint) params.set("username", targetUsernameHint);
        navigate(
          `/messages/${optimisticDirectConversationId}?${params.toString()}`,
          { replace: true },
        );
      }

      return ensureDirectConversation(identity, targetUserId, {
        username: targetUsernameHint || undefined,
      });
    };

    openDirectConversation()
      .then((resolvedConversationId) => {
        if (cancelled) return;
        setDeepLinkError(null);
        navigate(`/messages/${resolvedConversationId}`, { replace: true });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setDeepLinkError(error instanceof Error ? error.message : "Failed to open conversation.");
        navigate("/messages", { replace: true });
      });

    return () => {
      cancelled = true;
    };
  }, [
    ensureDirectConversation,
    navigate,
    normalizedRouteConversationId,
    optimisticDirectConversationId,
    profile?.nickname,
    profile?.username,
    targetUserId,
    targetUsernameHint,
    user,
  ]);

  const directConversations = useMemo(
    () => (user ? conversations.map((conversation) => mapConversation(conversation, user.uid)) : []),
    [conversations, user],
  );

  const selectedConversationId = (() => {
    if (normalizedRouteConversationId) return normalizedRouteConversationId;
    if (optimisticDirectConversationId) return optimisticDirectConversationId;
    if (isMobile) return null;
    return AI_CONVERSATION_ID;
  })();

  const selectedConversation = selectedConversationId === AI_CONVERSATION_ID ?
    {
      id: AI_CONVERSATION_ID,
      initials: "AI",
      name: "Collab AI",
      preview: "Ask me anything",
      time: "now",
      tone: "av-red",
      status: "Online",
      unreadCount: 0,
    } :
    directConversations.find((conversation) => conversation.id === selectedConversationId) ?? (
      selectedConversationId ?
        {
          id: selectedConversationId,
          initials: initials(targetUsernameHint || "DM"),
          name: targetUsernameHint || "Direct message",
          preview: "",
          time: "now",
          tone: toneForId(targetUserId || selectedConversationId),
          status: "Opening conversation...",
          unreadCount: 0,
        } :
        null
    );
  const activeOptimisticOutgoing = useMemo(
    () =>
      selectedConversationId ?
        (optimisticOutgoingByConversation[selectedConversationId] ?? []) :
        [],
    [optimisticOutgoingByConversation, selectedConversationId],
  );

  const removeOptimisticMessage = useCallback((conversationKey: string, optimisticId: string) => {
    setOptimisticOutgoingByConversation((prev) => {
      const current = prev[conversationKey] ?? [];
      const next = current.filter((message) => message.id !== optimisticId);
      if (next.length === current.length) return prev;
      const updated = { ...prev };
      if (next.length === 0) {
        delete updated[conversationKey];
      } else {
        updated[conversationKey] = next;
      }
      return updated;
    });
  }, []);

  const markOptimisticMessageSent = useCallback((conversationKey: string, optimisticId: string) => {
    setOptimisticOutgoingByConversation((prev) => {
      const current = prev[conversationKey] ?? [];
      const next = current.map((message) =>
        message.id === optimisticId ? { ...message, deliveryState: "sent_flash" as const } : message,
      );
      return { ...prev, [conversationKey]: next };
    });
  }, []);

  useEffect(() => {
    if (!user || !selectedConversationId || selectedConversationId === AI_CONVERSATION_ID) {
      stopListeningMessages();
      return;
    }

    listenMessages(selectedConversationId);
    void markConversationRead(selectedConversationId);

    return () => {
      stopListeningMessages();
    };
  }, [listenMessages, markConversationRead, selectedConversationId, stopListeningMessages, user]);

  const threadMessages = useMemo<ThreadMessageView[]>(() => {
    if (selectedConversationId === AI_CONVERSATION_ID) {
      return aiMessages.map((message) => ({
        id: message.id,
        sender: (message.sender === "me" ? "me" : "other") as "me" | "other",
        text: message.text,
        time: message.time,
      }));
    }

    const currentUid = user?.uid;
    const { matchedServerMessageIds } = matchOptimisticToServerMessages(
      activeOptimisticOutgoing,
      messages,
      currentUid,
    );

    const persistedThread = messages
      .filter((message) => !matchedServerMessageIds.has(message.id))
      .map((message) => ({
        id: message.id,
        sender: (currentUid != null && message.senderId === currentUid ? "me" : "other") as "me" | "other",
        text: message.text,
        time: mapMessageTime(message),
      }));

    const optimisticThread = activeOptimisticOutgoing.map((message) => ({
      id: message.id,
      sender: "me" as const,
      text: message.text,
      time: "just now",
      deliveryState: message.deliveryState,
    }));

    return [...persistedThread, ...optimisticThread];
  }, [activeOptimisticOutgoing, aiMessages, messages, selectedConversationId, user?.uid]);

  const handleSendAiMessage = useCallback(async (text: string) => {
    const userMsg: AiMessage = { id: nextAiMessageId(), sender: "me", text, time: "just now" };
    setAiMessages((prev) => [...prev, userMsg]);
    setAiSending(true);
    setAiError(null);

    const history: AiChatHistory[] = [...aiHistoryRef.current, { role: "user", content: text }];

    try {
      const answer = await sendAiMessage(text, aiHistoryRef.current);
      aiHistoryRef.current = [...history, { role: "assistant", content: answer }];
      const aiMsg: AiMessage = { id: nextAiMessageId(), sender: "ai", text: answer, time: "just now" };
      setAiMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Failed to get AI response.");
      aiHistoryRef.current = history;
    } finally {
      setAiSending(false);
    }
  }, []);

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = composeValue.trim();
    if (!text || !selectedConversationId) return;

    if (selectedConversationId === AI_CONVERSATION_ID) {
      setComposeValue("");
      await handleSendAiMessage(text);
      return;
    }

    const optimisticId = nextOptimisticMessageId();
    const optimisticMessage: OptimisticOutgoingMessage = {
      id: optimisticId,
      conversationId: selectedConversationId,
      text,
      createdAtMs: Date.now(),
      deliveryState: "sending",
    };

    setOptimisticOutgoingByConversation((prev) => {
      const current = prev[selectedConversationId] ?? [];
      return {
        ...prev,
        [selectedConversationId]: [...current, optimisticMessage],
      };
    });
    setComposeValue("");

    try {
      await sendMessage(selectedConversationId, text);
      await markConversationRead(selectedConversationId);
      markOptimisticMessageSent(selectedConversationId, optimisticId);

      const timerKey = `${selectedConversationId}:${optimisticId}`;
      const timerId = window.setTimeout(() => {
        removeOptimisticMessage(selectedConversationId, optimisticId);
        optimisticClearTimersRef.current.delete(timerKey);
      }, 900);
      optimisticClearTimersRef.current.set(timerKey, timerId);
    } catch {
      removeOptimisticMessage(selectedConversationId, optimisticId);
    }
  };

  const showingThreadOnMobile = isMobile && !!selectedConversationId;

  return (
    <div className="page-view">
      <div className="topbar">
        <div className="topbar-title">
          <span>Messages</span>
        </div>
      </div>

      {deepLinkError && <div className="auth-error">{deepLinkError}</div>}
      {authLoading && <div className="chat-thread-empty">Loading account...</div>}
      {!user && !authLoading && (
        <div className="auth-notice">Sign in to send and receive direct messages. Collab AI is available below.</div>
      )}

      {isMobile ? (
        <div className="chat-mobile-view">
          {!showingThreadOnMobile ? (
            <aside className="chat-sidebar chat-mobile-list">
              <ConversationList
                activeId={selectedConversationId}
                conversations={directConversations}
                loading={conversationsLoading}
                error={conversationsError}
              />
            </aside>
          ) : selectedConversation ? (
            <ConversationThread
              conversation={selectedConversation}
              mobile
              messages={threadMessages}
              loading={selectedConversationId === AI_CONVERSATION_ID ? false : messagesLoading}
              error={selectedConversationId === AI_CONVERSATION_ID ? aiError : messagesError}
              draft={composeValue}
              onDraftChange={setComposeValue}
              onSubmit={handleSendMessage}
              sending={selectedConversationId === AI_CONVERSATION_ID ? aiSending : sending}
            />
          ) : (
            <div className="chat-thread-empty">Conversation not found.</div>
          )}
        </div>
      ) : (
        <div className="chat-layout">
          <aside className="chat-sidebar">
            <ConversationList
              activeId={selectedConversationId}
              conversations={directConversations}
              loading={conversationsLoading}
              error={conversationsError}
            />
          </aside>
          {selectedConversation ? (
            <ConversationThread
              conversation={selectedConversation}
              mobile={false}
              messages={threadMessages}
              loading={selectedConversationId === AI_CONVERSATION_ID ? false : messagesLoading}
              error={selectedConversationId === AI_CONVERSATION_ID ? aiError : messagesError}
              draft={composeValue}
              onDraftChange={setComposeValue}
              onSubmit={handleSendMessage}
              sending={selectedConversationId === AI_CONVERSATION_ID ? aiSending : sending}
            />
          ) : (
            <section className="chat-main">
              <div className="chat-thread-empty">Select a conversation to start chatting.</div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
