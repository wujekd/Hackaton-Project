import { Link, useParams } from "react-router-dom";
import { useMediaQuery } from "../hooks/useMediaQuery";

interface ChatMessage {
  id: string;
  sender: "ai" | "me";
  text: string;
  time: string;
}

interface Conversation {
  id: string;
  initials: string;
  name: string;
  preview: string;
  time: string;
  tone: string;
  status: string;
  messages: ChatMessage[];
}

const conversations: Conversation[] = [
  {
    id: "collab-ai",
    initials: "AI",
    name: "Collab AI Assistant",
    preview: "I can help you discover collaborators.",
    time: "now",
    tone: "av-red",
    status: "Always online",
    messages: [
      {
        id: "m1",
        sender: "ai",
        text: "Messaging UI is included from the mockup. Backend messaging is not implemented in this project.",
        time: "just now",
      },
      {
        id: "m2",
        sender: "me",
        text: "Show me game dev collaborators.",
        time: "just now",
      },
    ],
  },
  {
    id: "jamie-kim",
    initials: "JK",
    name: "Jamie Kim",
    preview: "Are you interested in the project?",
    time: "2h",
    tone: "av-mid",
    status: "Active today",
    messages: [
      {
        id: "m1",
        sender: "ai",
        text: "Hey Jamie, this is a UI-only conversation sample.",
        time: "2h",
      },
      {
        id: "m2",
        sender: "me",
        text: "Sounds good, share your brief and timeline.",
        time: "1h",
      },
    ],
  },
  {
    id: "sofia-reyes",
    initials: "SR",
    name: "Sofia Reyes",
    preview: "I liked your portfolio",
    time: "5h",
    tone: "av-slate",
    status: "Active recently",
    messages: [
      {
        id: "m1",
        sender: "ai",
        text: "Nice work on the portfolio update.",
        time: "5h",
      },
      {
        id: "m2",
        sender: "me",
        text: "Thanks, happy to collaborate on your next piece.",
        time: "4h",
      },
    ],
  },
  {
    id: "signal-lost-team",
    initials: "SL",
    name: "Signal Lost Team",
    preview: "Jamie: let's sync Thursday",
    time: "1d",
    tone: "av-muted",
    status: "Last active yesterday",
    messages: [
      {
        id: "m1",
        sender: "ai",
        text: "Team chat is represented as placeholder data in this build.",
        time: "1d",
      },
      {
        id: "m2",
        sender: "me",
        text: "Thursday works for me.",
        time: "1d",
      },
    ],
  },
];

function ConversationList({ activeId }: { activeId?: string }) {
  return (
    <>
      <div className="chat-sidebar-title">Conversations</div>
      <div className="chat-ai-badge">
        <div className="shield" style={{ width: 26, height: 30 }}>
          <div className="shield-text" style={{ fontSize: 11 }}>AI</div>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Collab AI</div>
          <div style={{ fontSize: 10.5, color: "var(--muted2)" }}>Ask me anything</div>
        </div>
      </div>

      <div className="chat-divider">Direct Messages</div>
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
          <div className="chat-item-time">{conversation.time}</div>
        </Link>
      ))}
    </>
  );
}

function ConversationThread({ conversation, mobile }: { conversation: Conversation; mobile: boolean }) {
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
        {conversation.messages.map((message) => (
          <div className={`msg${message.sender === "me" ? " own" : ""}`} key={message.id}>
            {message.sender === "ai" ? (
              <div className="shield" style={{ width: 24, height: 28 }}>
                <div className="shield-text" style={{ fontSize: 10 }}>{conversation.initials}</div>
              </div>
            ) : (
              <div className="avatar av-red" style={{ width: 26, height: 26, fontSize: 9 }}>ME</div>
            )}
            <div>
              <div className="msg-bubble">{message.text}</div>
              <div className="msg-time">{message.time}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="chat-input-bar">
        <div className="chat-placeholder">Messaging input is a visual placeholder in this build.</div>
      </div>
    </section>
  );
}

export default function Messages() {
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const { conversationId } = useParams<{ conversationId?: string }>();

  const selectedConversation = conversations.find((item) => item.id === conversationId) ?? conversations[0];

  const showingThreadOnMobile = isMobile && !!conversationId;

  return (
    <div className="page-view">
      <div className="topbar">
        <div className="topbar-title">
          <span>Messages</span>
        </div>
      </div>

      {isMobile ? (
        <div className="chat-mobile-view">
          {!showingThreadOnMobile ? (
            <aside className="chat-sidebar chat-mobile-list">
              <ConversationList activeId={conversationId} />
            </aside>
          ) : (
            <ConversationThread conversation={selectedConversation} mobile />
          )}
        </div>
      ) : (
        <div className="chat-layout">
          <aside className="chat-sidebar">
            <ConversationList activeId={selectedConversation.id} />
          </aside>
          <ConversationThread conversation={selectedConversation} mobile={false} />
        </div>
      )}
    </div>
  );
}
