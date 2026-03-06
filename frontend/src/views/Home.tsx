import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CollabListItem from "../components/CollabListItem";
import PollPlaceholder from "../components/PollPlaceholder";
import { CollaborationService } from "../services/collaboration.service";
import { EventService } from "../services/event.service";
import { useAuthStore } from "../stores/auth.store";
import type { Collaboration } from "../types/collaboration";
import type { EventItem } from "../types/event";
import { formatDateShort, toDate } from "../utils/date";
import { buildDirectMessageHref } from "../utils/messaging";

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

  const displayName =
    profile?.nickname?.trim() || profile?.username || user?.email?.split("@")[0] || "Student";
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
    <div className="page-view home-page-view">
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

          {collabs.map((collab) => (
            <CollabListItem
              key={collab.id}
              collab={collab}
              clickable
              ariaLabel={`Open collaboration ${collab.title}`}
              onOpen={() => navigate(`/collaborations/${collab.id}`)}
              meta={`Created ${formatDateShort(collab.createdAt)}`}
              topRight={collab.tags.length > 0 ? <div className="tags"><span className="tag">{collab.tags[0]}</span></div> : undefined}
              roles={
                <div className="roles">
                  <div className="role-chip">
                    <span className="dot-o" />
                    Open to collaborators
                  </div>
                  {collab.files.length > 0 && (
                    <div className="role-chip">
                      <span className="dot-f" />
                      {collab.files.length} file{collab.files.length === 1 ? "" : "s"} attached
                    </div>
                  )}
                </div>
              }
              footerTags={collab.tags.slice(0, 4)}
              actions={
                <div className="collab-actions">
                  <Link className="btn-sm accent" to={`/collaborations/${collab.id}`}>
                    Open
                  </Link>
                  {user?.uid !== collab.authorId && (
                    <Link
                      className="btn-sm outline"
                      to={buildDirectMessageHref(user?.uid, collab.authorId, { username: collab.authorName })}
                    >
                      Message Host
                    </Link>
                  )}
                </div>
              }
            />
          ))}
        </section>

        <aside className="home-aside">
          <div className="sec-head">
            <span className="bar" />
            Campus Poll
          </div>
          <PollPlaceholder />

          <div className="sec-head home-suggest-head">
            <span className="bar" />
            Upcoming Events
          </div>
          <div className="aside-card home-events-card">
            {eventLoading && <p className="collab-meta">Loading upcoming events...</p>}
            {eventError && <p className="collab-meta">{eventError}</p>}

            {!eventLoading && !eventError && upcoming.length === 0 && (
              <p className="collab-meta">No upcoming events yet.</p>
            )}

            {upcoming.map((ev, index) => (
              <Link
                to={`/events/${ev.id}`}
                className="home-upcoming-event"
                key={ev.id}
                style={{
                  display: "block",
                  textDecoration: "none",
                  color: "inherit",
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
              </Link>
            ))}
            <div className="home-upcoming-footer">
              <Link className="btn-sm outline" to="/events">
                Browse all events
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
