import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PollPlaceholder from "../components/PollPlaceholder";
import { CollaborationService } from "../services/collaboration.service";
import { EventService } from "../services/event.service";
import { useAuthStore } from "../stores/auth.store";
import type { Collaboration } from "../types/collaboration";
import type { EventItem } from "../types/event";
import { formatDateShort, formatRelativeDate, toDate } from "../utils/date";

function nameInitials(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) return "??";
  const parts = cleaned.split(/\s+/).slice(0, 2);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return !!target.closest("a, button, input, textarea, select, label");
}

export default function Home() {
  const navigate = useNavigate();
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
  const normalizedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [],
  );
  const upcoming = events.slice(0, 3);
  const nextCampusItem = useMemo(() => {
    const now = Date.now();
    const futureEvent = events.find((event) => {
      const date = toDate(event.date);
      return !!date && date.getTime() >= now;
    });

    if (futureEvent) {
      return { event: futureEvent, date: toDate(futureEvent.date) };
    }

    if (events.length > 0) {
      return { event: events[0], date: toDate(events[0].date) };
    }

    return null;
  }, [events]);
  const streakDays = 5;
  const streakGoal = 7;
  const streakProgress = Math.round((Math.min(streakDays, streakGoal) / streakGoal) * 100);
  const streakRemaining = Math.max(streakGoal - streakDays, 0);

  return (
    <div className="page-view">
      <div className="home-hero">
        <div className="home-hero-content">
          <div className="home-hero-copy">
            <div className="home-hero-greeting">{todayLabel}</div>
            <div className="home-hero-name">
              Welcome back, <span>{normalizedFirstName}</span>
            </div>
            <div className="home-hero-sub">Here is what is happening across campus right now.</div>
          </div>

          {user && (
            <div className="home-hero-cards" aria-label="Campus quick overview">
              <article className="home-hero-card">
                <div className="home-hero-card-label">What&apos;s next</div>
                {eventLoading && <div className="home-hero-card-title">Loading your schedule...</div>}
                {!eventLoading && nextCampusItem && (
                  <>
                    <div className="home-hero-card-title">{nextCampusItem.event.name}</div>
                    {nextCampusItem.date && (
                      <div className="home-hero-card-meta">
                        {nextCampusItem.date.toLocaleDateString("en-GB", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        at{" "}
                        {nextCampusItem.date.toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    )}
                  </>
                )}
                {!eventLoading && !nextCampusItem && (
                  <>
                    <div className="home-hero-card-title">No upcoming events yet</div>
                    <div className="home-hero-card-meta">Join one to build your campus routine.</div>
                  </>
                )}
              </article>

              <article className="home-hero-card">
                <div className="home-hero-card-label">Study streak</div>
                <div className="home-hero-card-title">{streakDays} day streak</div>
                <div className="home-hero-card-meta">
                  {streakRemaining === 0
                    ? "Weekly goal complete."
                    : `${streakRemaining} more day${streakRemaining === 1 ? "" : "s"} to hit your weekly goal.`}
                </div>
                <div className="home-streak-track" role="presentation">
                  <span style={{ width: `${streakProgress}%` }} />
                </div>
                <div className="home-streak-foot">
                  {streakDays}/{streakGoal} days this week
                </div>
              </article>
            </div>
          )}
        </div>
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
            <article
              className="collab-card clickable"
              key={c.id}
              role="button"
              tabIndex={0}
              aria-label={`Open collaboration ${c.title}`}
              onClick={(event) => {
                if (isInteractiveTarget(event.target)) return;
                navigate(`/collaborations/${c.id}`);
              }}
              onKeyDown={(event) => {
                if (isInteractiveTarget(event.target)) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  navigate(`/collaborations/${c.id}`);
                }
              }}
            >
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
                <Link className="btn-sm accent" to={`/collaborations/${c.id}`}>Open</Link>
                <Link
                  className="btn-sm outline"
                  to={`/messages?userId=${encodeURIComponent(c.authorId)}&userName=${encodeURIComponent(c.authorName)}`}
                >
                  Message Host
                </Link>
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
                <div style={{ marginTop: 6 }}>
                  <Link className="btn-sm outline" to={`/events/${ev.id}`}>
                    Open
                  </Link>
                </div>
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
            Campus Poll
          </div>
          <PollPlaceholder />
        </aside>
      </div>
    </div>
  );
}
