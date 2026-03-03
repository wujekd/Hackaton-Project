import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CollaborationService } from "../services/collaboration.service";
import { EventService } from "../services/event.service";
import { useAuthStore } from "../stores/auth.store";
import type { Collaboration } from "../types/collaboration";
import type { EventItem } from "../types/event";
import { formatDateShort, formatRelativeDate } from "../utils/date";

function nameInitials(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) return "??";
  const parts = cleaned.split(/\s+/).slice(0, 2);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function Home() {
  const { profile, user } = useAuthStore();
  const [collabs, setCollabs] = useState<Collaboration[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [collabError, setCollabError] = useState<string | null>(null);
  const [eventError, setEventError] = useState<string | null>(null);
  const [collabLoading, setCollabLoading] = useState(true);
  const [eventLoading, setEventLoading] = useState(true);

  useEffect(() => {
    CollaborationService.getAll()
      .then(setCollabs)
      .catch((err: Error) => setCollabError(err.message))
      .finally(() => setCollabLoading(false));

    EventService.getApproved()
      .then(setEvents)
      .catch((err: Error) => setEventError(err.message))
      .finally(() => setEventLoading(false));
  }, []);

  const displayName = profile?.username ?? user?.email?.split("@")[0] ?? "Student";
  const firstName = displayName.split(/[.\s_-]+/)[0] || "Student";
  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [],
  );
  const upcoming = events.slice(0, 3);

  return (
    <div className="page-view">
      <div className="topbar">
        <div className="topbar-title">
          Good morning, <span>{firstName}</span>
        </div>
        <div className="topbar-actions">
          <div className="search-bar">
            <svg className="si" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input placeholder="Search students, collabs" readOnly />
          </div>
          <Link className="btn-sm accent" to="/collaborations/new">
            + New Collab
          </Link>
          <Link className="btn-sm outline" to="/events/suggest">
            Suggest Event
          </Link>
        </div>
      </div>

      <div className="home-hero">
        <div className="home-hero-greeting">{todayLabel}</div>
        <div className="home-hero-name">
          Welcome back, <span>{firstName}</span>
        </div>
        <div className="home-hero-sub">Here is what is happening across campus right now.</div>
      </div>

      <div className="home-grid">
        <section className="home-feed">
          <div className="sec-head">
            <span className="bar" />
            Recent Collabs
          </div>

          {collabLoading && <div className="empty-state">Loading collaborations...</div>}
          {collabError && <div className="auth-error">{collabError}</div>}

          {!collabLoading && !collabError && collabs.length === 0 && (
            <div className="empty-state">No collaborations yet. Post the first one.</div>
          )}

          {collabs.map((c) => (
            <article className="collab-card" key={c.id}>
              <div className="collab-header">
                <div className="avatar av-red">{nameInitials(c.authorName)}</div>
                <div className="collab-author">
                  <div className="collab-author-name">{c.authorName}</div>
                  <div className="collab-meta">{formatRelativeDate(c.createdAt)}</div>
                </div>
                {c.tags.length > 0 && (
                  <div className="tags">
                    <span className="tag">{c.tags[0]}</span>
                  </div>
                )}
              </div>

              <div className="collab-title">{c.title}</div>
              {c.description && <div className="collab-desc">{c.description}</div>}

              <div className="roles">
                <div className="role-chip">
                  <span className="dot-o" />
                  Open to collaborators
                </div>
                {c.files.length > 0 && (
                  <div className="role-chip">
                    <span className="dot-f" />
                    {c.files.length} file{c.files.length === 1 ? "" : "s"} attached
                  </div>
                )}
              </div>

              <div className="tags">
                {c.tags.slice(0, 4).map((tag) => (
                  <span className="tag neutral" key={`${c.id}-${tag}`}>
                    {tag}
                  </span>
                ))}
              </div>

              <div className="collab-actions">
                <button className="btn-sm accent" type="button">Request to Join</button>
                <Link className="btn-sm outline" to="/messages">
                  Message Host
                </Link>
                <button className="btn-sm ghost" type="button">Invite</button>
              </div>
            </article>
          ))}
        </section>

        <aside className="home-aside">
          <div className="sec-head">
            <span className="bar" />
            Upcoming Events
          </div>
          <div className="aside-card">
            {eventLoading && <p className="collab-meta">Loading upcoming events...</p>}
            {eventError && <p className="collab-meta">{eventError}</p>}

            {!eventLoading && !eventError && upcoming.length === 0 && (
              <p className="collab-meta">No upcoming events yet.</p>
            )}

            {upcoming.map((ev, index) => (
              <div
                className="home-upcoming-event"
                key={ev.id}
                style={{
                  marginBottom: index === upcoming.length - 1 ? 0 : 12,
                  paddingBottom: index === upcoming.length - 1 ? 0 : 12,
                  borderBottom: index === upcoming.length - 1 ? "none" : "1px solid var(--border)",
                }}
              >
                <div className="event-date">{formatDateShort(ev.date)}</div>
                <div className="home-upcoming-event-title">{ev.name}</div>
                {ev.description && (
                  <div className="home-upcoming-event-desc">
                    {ev.description}
                  </div>
                )}
              </div>
            ))}
            <div className="home-upcoming-footer">
              <Link className="btn-sm outline" to="/events">
                Browse all events
              </Link>
            </div>
          </div>

          <div className="sec-head home-suggest-head">
            <span className="bar" />
            Suggested Connections
          </div>
          <div className="aside-card">
            {[
              { initials: "TP", name: "Tom Park", role: "Graphic Design - Y3", tone: "av-slate" },
              { initials: "EL", name: "Eva Lima", role: "Music Tech - Y2", tone: "av-muted" },
              { initials: "NB", name: "Noah Blake", role: "Film - Y1", tone: "av-mid" },
            ].map((person) => (
              <div
                key={person.name}
                className="home-suggestion-row"
              >
                <div className={`avatar ${person.tone}`} style={{ width: 28, height: 28, fontSize: 9 }}>
                  {person.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{person.name}</div>
                  <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{person.role}</div>
                </div>
                <button className="btn-follow" type="button">Follow</button>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
