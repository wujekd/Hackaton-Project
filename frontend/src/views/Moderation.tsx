import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  CollaborationService,
  type CollaborationCursor,
} from "../services/collaboration.service";
import { EventService } from "../services/event.service";
import { FeedbackService } from "../services/feedback.service";
import { PollService } from "../services/poll.service";
import { useAuthStore } from "../stores/auth.store";
import type { Collaboration } from "../types/collaboration";
import type { EventItem, EventProposal } from "../types/event";
import type { FeedbackEntry } from "../types/feedback";
import type { PollSummary } from "../types/poll";
import { formatDateShort, formatDateTime } from "../utils/date";
import { getCollaborationCoverImageUrl } from "../utils/collaboration";

type ModerationTab = "events" | "polls" | "collabs" | "feedback";
type FeedbackFilterTab = "unaddressed" | "addressed";

const COLLABS_PAGE_SIZE = 20;

function getCollabCoverImage(collab: Collaboration): string | null {
  return getCollaborationCoverImageUrl(collab);
}

export default function Moderation() {
  const { profile, loading: authLoading } = useAuthStore();
  const [activeTab, setActiveTab] = useState<ModerationTab>("events");
  const [proposals, setProposals] = useState<EventProposal[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [polls, setPolls] = useState<PollSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [newPollTitle, setNewPollTitle] = useState("");
  const [newPollOptions, setNewPollOptions] = useState("");
  const [allowVoteChange, setAllowVoteChange] = useState(false);
  const [collabs, setCollabs] = useState<Collaboration[]>([]);
  const [collabsCursor, setCollabsCursor] = useState<CollaborationCursor>(null);
  const [collabsHasMore, setCollabsHasMore] = useState(false);
  const [collabsLoaded, setCollabsLoaded] = useState(false);
  const [collabsLoading, setCollabsLoading] = useState(false);
  const [collabsLoadingMore, setCollabsLoadingMore] = useState(false);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackEntry[]>([]);
  const [feedbackLoaded, setFeedbackLoaded] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackFilterTab, setFeedbackFilterTab] = useState<FeedbackFilterTab>("unaddressed");
  const [pendingEventDelete, setPendingEventDelete] = useState<EventItem | null>(null);
  const [pendingFeedbackDelete, setPendingFeedbackDelete] = useState<FeedbackEntry | null>(null);

  const isAdmin = profile?.admin === true;

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setError(null);
    setLoading(true);

    Promise.all([EventService.getPendingProposals(), EventService.getAllEvents(), PollService.listPolls()])
      .then(([pendingProposals, allEvents, pollList]) => {
        if (cancelled) return;
        setProposals(pendingProposals);
        setEvents(allEvents);
        setPolls(pollList);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || activeTab !== "collabs" || collabsLoaded) return;

    let cancelled = false;
    setError(null);
    setCollabsLoading(true);

    CollaborationService.listPage(COLLABS_PAGE_SIZE)
      .then((page) => {
        if (cancelled) return;
        setCollabs(page.items);
        setCollabsCursor(page.cursor);
        setCollabsHasMore(page.hasMore);
        setCollabsLoaded(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load collaborations.");
      })
      .finally(() => {
        if (cancelled) return;
        setCollabsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, collabsLoaded, isAdmin]);

  useEffect(() => {
    if (!isAdmin || activeTab !== "feedback" || feedbackLoaded) return;

    let cancelled = false;
    setError(null);
    setFeedbackLoading(true);

    FeedbackService.list()
      .then((items) => {
        if (cancelled) return;
        setFeedbackItems(items);
        setFeedbackLoaded(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load feedback.");
      })
      .finally(() => {
        if (cancelled) return;
        setFeedbackLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, feedbackLoaded, isAdmin]);

  if (authLoading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  const refreshPolls = async () => {
    const nextPolls = await PollService.listPolls();
    setPolls(nextPolls);
  };

  const handleApprove = async (proposal: EventProposal) => {
    setActing(`proposal:${proposal.id}`);
    try {
      await EventService.approveProposal(proposal);
      setProposals((prev) => prev.filter((p) => p.id !== proposal.id));
      const updatedEvents = await EventService.getAllEvents();
      setEvents(updatedEvents);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setActing(null);
    }
  };

  const handleReject = async (id: string) => {
    setActing(`proposal:${id}`);
    try {
      await EventService.rejectProposal(id);
      setProposals((prev) => prev.filter((p) => p.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setActing(null);
    }
  };

  const handleDeleteEvent = async (event: EventItem) => {
    setPendingEventDelete(event);
  };

  const confirmDeleteEvent = async () => {
    if (!pendingEventDelete) return;

    const eventId = pendingEventDelete.id;
    setActing(`event:${eventId}`);
    try {
      await EventService.deleteEventAsAdmin(eventId);
      setEvents((prev) => prev.filter((item) => item.id !== eventId));
      setPendingEventDelete(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete event");
    } finally {
      setActing(null);
    }
  };

  const handleCreatePoll = async () => {
    const title = newPollTitle.trim();
    const options = newPollOptions
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => !!line);

    if (!title) {
      setError("Poll title is required.");
      return;
    }
    if (options.length < 2) {
      setError("Add at least two poll options, one per line.");
      return;
    }

    setActing("poll:create");
    setError(null);
    try {
      await PollService.createPoll(title, options, allowVoteChange);
      setNewPollTitle("");
      setNewPollOptions("");
      setAllowVoteChange(false);
      await refreshPolls();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create poll");
    } finally {
      setActing(null);
    }
  };

  const handlePublishPoll = async (pollId: string) => {
    setActing(`poll:publish:${pollId}`);
    setError(null);
    try {
      await PollService.publishPoll(pollId);
      await refreshPolls();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to publish poll");
    } finally {
      setActing(null);
    }
  };

  const handleClosePoll = async (pollId: string) => {
    setActing(`poll:close:${pollId}`);
    setError(null);
    try {
      await PollService.closePoll(pollId);
      await refreshPolls();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to close poll");
    } finally {
      setActing(null);
    }
  };

  const handleLoadMoreCollabs = async () => {
    if (!collabsHasMore || collabsLoadingMore) return;

    setCollabsLoadingMore(true);
    setError(null);
    try {
      const page = await CollaborationService.listPage(COLLABS_PAGE_SIZE, collabsCursor);
      setCollabs((prev) => [...prev, ...page.items]);
      setCollabsCursor(page.cursor);
      setCollabsHasMore(page.hasMore);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load more collaborations.");
    } finally {
      setCollabsLoadingMore(false);
    }
  };

  const handleUpdateFeedbackStatus = async (feedbackId: string, addressed: boolean) => {
    setActing(`feedback:${feedbackId}:status`);
    setError(null);
    try {
      await FeedbackService.updateStatus(feedbackId, addressed);
      setFeedbackItems((prev) => prev.map((item) => (
        item.id === feedbackId
          ? {
            ...item,
            addressed,
            addressedAt: addressed ? new Date().toISOString() : null,
          }
          : item
      )));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update feedback.");
    } finally {
      setActing(null);
    }
  };

  const confirmDeleteFeedback = async () => {
    if (!pendingFeedbackDelete) return;

    const feedbackId = pendingFeedbackDelete.id;
    setActing(`feedback:${feedbackId}:delete`);
    setError(null);
    try {
      await FeedbackService.delete(feedbackId);
      setFeedbackItems((prev) => prev.filter((item) => item.id !== feedbackId));
      setPendingFeedbackDelete(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete feedback.");
    } finally {
      setActing(null);
    }
  };

  const visibleFeedback = feedbackItems.filter((item) =>
    feedbackFilterTab === "addressed" ? item.addressed : !item.addressed,
  );

  const showCoreLoading = loading && activeTab !== "collabs";

  return (
    <div className="page-view">
      <ConfirmDialog
        isOpen={pendingEventDelete !== null}
        title={pendingEventDelete ? `Delete "${pendingEventDelete.name}"?` : "Delete event?"}
        message="This will also remove every user's signup for this event."
        confirmLabel={pendingEventDelete && acting === `event:${pendingEventDelete.id}` ? "Deleting..." : "Delete event"}
        busy={pendingEventDelete ? acting === `event:${pendingEventDelete.id}` : false}
        onCancel={() => setPendingEventDelete(null)}
        onConfirm={() => void confirmDeleteEvent()}
      />
      <ConfirmDialog
        isOpen={pendingFeedbackDelete !== null}
        title={pendingFeedbackDelete ? `Delete "${pendingFeedbackDelete.subject}"?` : "Delete feedback?"}
        message="This will permanently remove the feedback entry from moderation."
        confirmLabel={pendingFeedbackDelete && acting === `feedback:${pendingFeedbackDelete.id}:delete` ? "Deleting..." : "Delete feedback"}
        busy={pendingFeedbackDelete ? acting === `feedback:${pendingFeedbackDelete.id}:delete` : false}
        onCancel={() => setPendingFeedbackDelete(null)}
        onConfirm={() => void confirmDeleteFeedback()}
      />
      <div className="topbar">
        <div className="topbar-title">
          Admin <span>Moderation</span>
        </div>
      </div>

      <div className="filters">
        <button
          className={`filter-pill ${activeTab === "events" ? "active" : ""}`}
          type="button"
          onClick={() => setActiveTab("events")}
        >
          Events
        </button>
        <button
          className={`filter-pill ${activeTab === "polls" ? "active" : ""}`}
          type="button"
          onClick={() => setActiveTab("polls")}
        >
          Polls
        </button>
        <button
          className={`filter-pill ${activeTab === "collabs" ? "active" : ""}`}
          type="button"
          onClick={() => setActiveTab("collabs")}
        >
          Collabs
        </button>
        <button
          className={`filter-pill ${activeTab === "feedback" ? "active" : ""}`}
          type="button"
          onClick={() => setActiveTab("feedback")}
        >
          Feedback
        </button>
      </div>

      {error && <div className="form-shell"><div className="auth-error">{error}</div></div>}
      {showCoreLoading && <div className="form-shell"><div className="empty-state">Loading moderation data...</div></div>}

      {!showCoreLoading && activeTab === "events" && (
        <>
          <div className="mod-list">
            <h2 className="event-title">Pending Proposals</h2>
            {proposals.length === 0 && <div className="empty-state">No pending event proposals.</div>}
            {proposals.map((proposal) => (
              <article className="mod-card" key={proposal.id}>
                {proposal.imageUrl ? (
                  <img className="mod-card__img" src={proposal.imageUrl} alt={proposal.name} />
                ) : (
                  <div className="mod-card__img b2" />
                )}
                <div className="mod-card__body">
                  <h3 className="event-title">{proposal.name}</h3>
                  <span className="event-date">{formatDateTime(proposal.date)}</span>
                  <span className="mod-card__author">by {proposal.authorName}</span>
                  {proposal.description && <p className="collab-desc">{proposal.description}</p>}
                </div>
                <div className="mod-card__actions">
                  <button
                    className="btn-approve"
                    type="button"
                    disabled={acting === `proposal:${proposal.id}`}
                    onClick={() => handleApprove(proposal)}
                  >
                    Approve
                  </button>
                  <button
                    className="btn-reject"
                    type="button"
                    disabled={acting === `proposal:${proposal.id}`}
                    onClick={() => handleReject(proposal.id)}
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="mod-list">
            <h2 className="event-title">All Events</h2>
            {events.length === 0 && <div className="empty-state">No approved events yet.</div>}
            {events.map((event) => (
              <article className="mod-card" key={event.id}>
                {event.imageUrl ? (
                  <img className="mod-card__img" src={event.imageUrl} alt={event.name} />
                ) : (
                  <div className="mod-card__img b2" />
                )}
                <div className="mod-card__body">
                  <h3 className="event-title">{event.name}</h3>
                  <span className="event-date">{formatDateTime(event.date)}</span>
                  {event.description && <p className="collab-desc">{event.description}</p>}
                </div>
                <div className="mod-card__actions">
                  <Link className="btn-secondary" to={`/events/${encodeURIComponent(event.id)}/edit`}>
                    Edit Event
                  </Link>
                  <button
                    className="btn-reject"
                    type="button"
                    disabled={acting === `event:${event.id}`}
                    onClick={() => handleDeleteEvent(event)}
                  >
                    Delete Event
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {!showCoreLoading && activeTab === "polls" && (
        <div className="mod-list">
          <h2 className="event-title">Campus Polls</h2>
          <div className="form-card">
            <div className="form-group">
              <label htmlFor="poll-title">Poll title</label>
              <input
                id="poll-title"
                value={newPollTitle}
                onChange={(event) => setNewPollTitle(event.target.value)}
                placeholder="What should we improve next month?"
              />
            </div>
            <div className="form-group">
              <label htmlFor="poll-options">Options (one per line)</label>
              <textarea
                id="poll-options"
                value={newPollOptions}
                onChange={(event) => setNewPollOptions(event.target.value)}
                placeholder={"Extend library hours\nAdd more study spaces\nIncrease peer tutoring"}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={allowVoteChange}
                  onChange={(event) => setAllowVoteChange(event.target.checked)}
                  style={{ width: "auto", margin: 0 }}
                />
                Allow users to change vote
              </label>
            </div>
            <button
              className="btn-primary-inline"
              type="button"
              disabled={acting === "poll:create"}
              onClick={handleCreatePoll}
            >
              {acting === "poll:create" ? "Creating..." : "Create draft poll"}
            </button>
          </div>

          {polls.length === 0 && <div className="empty-state">No polls created yet.</div>}
          {polls.map((poll) => (
            <article className="mod-card" key={poll.pollId}>
              <div className="mod-card__img b2" />
              <div className="mod-card__body">
                <h3 className="event-title">{poll.title}</h3>
                <span className="event-date">
                  Status: {poll.status}{poll.active ? " (active)" : ""}
                </span>
                <span className="mod-card__author">
                  {poll.totalVotes.toLocaleString()} votes • {poll.options.length} options
                </span>
                <div className="tags">
                  {poll.options.map((option) => (
                    <span className="tag neutral" key={`${poll.pollId}-${option.id}`}>
                      {option.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mod-card__actions">
                <button
                  className="btn-approve"
                  type="button"
                  disabled={poll.status === "live" || acting === `poll:publish:${poll.pollId}`}
                  onClick={() => handlePublishPoll(poll.pollId)}
                >
                  {acting === `poll:publish:${poll.pollId}` ? "Publishing..." : "Publish"}
                </button>
                <button
                  className="btn-reject"
                  type="button"
                  disabled={poll.status !== "live" || acting === `poll:close:${poll.pollId}`}
                  onClick={() => handleClosePoll(poll.pollId)}
                >
                  {acting === `poll:close:${poll.pollId}` ? "Closing..." : "Close"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {activeTab === "collabs" && (
        <div className="mod-list">
          <h2 className="event-title">All Collabs</h2>
          {!collabsLoaded && collabsLoading && (
            <div className="empty-state">Loading collaborations...</div>
          )}
          {collabsLoaded && collabs.length === 0 && (
            <div className="empty-state">No collaborations found.</div>
          )}
          {collabs.map((collab) => {
            const coverImage = getCollabCoverImage(collab);
            return (
              <article className="mod-card" key={collab.id}>
                {coverImage ? (
                  <img className="mod-card__img" src={coverImage} alt={collab.title} />
                ) : (
                  <div className="mod-card__img b2" />
                )}
                <div className="mod-card__body">
                  <h3 className="event-title">{collab.title}</h3>
                  <span className="event-date">Created {formatDateShort(collab.createdAt)}</span>
                  <span className="mod-card__author">ID: {collab.id}</span>
                  {collab.description && <p className="collab-desc">{collab.description}</p>}
                  {collab.tags.length > 0 && (
                    <div className="tags">
                      {collab.tags.slice(0, 5).map((tag) => (
                        <span className="tag neutral" key={`${collab.id}-${tag}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mod-card__actions">
                  <Link className="btn-secondary" to={`/collaborations/${encodeURIComponent(collab.id)}/edit`}>
                    Edit Collab
                  </Link>
                  <Link className="btn-sm outline" to={`/collaborations/${encodeURIComponent(collab.id)}`}>
                    Open
                  </Link>
                </div>
              </article>
            );
          })}
          {collabsHasMore && (
            <button
              className="btn-primary-inline"
              type="button"
              disabled={collabsLoadingMore}
              onClick={handleLoadMoreCollabs}
            >
              {collabsLoadingMore ? "Loading..." : "Load More"}
            </button>
          )}
        </div>
      )}

      {activeTab === "feedback" && (
        <div className="mod-list">
          <div className="filters" style={{ paddingInline: 0, paddingTop: 0 }}>
            <button
              className={`filter-pill ${feedbackFilterTab === "unaddressed" ? "active" : ""}`}
              type="button"
              onClick={() => setFeedbackFilterTab("unaddressed")}
            >
              Unaddressed
            </button>
            <button
              className={`filter-pill ${feedbackFilterTab === "addressed" ? "active" : ""}`}
              type="button"
              onClick={() => setFeedbackFilterTab("addressed")}
            >
              Addressed
            </button>
          </div>
          <h2 className="event-title">Student Feedback</h2>
          {!feedbackLoaded && feedbackLoading && (
            <div className="empty-state">Loading feedback...</div>
          )}
          {feedbackLoaded && visibleFeedback.length === 0 && (
            <div className="empty-state">
              {feedbackFilterTab === "addressed"
                ? "No addressed feedback yet."
                : "No unaddressed feedback right now."}
            </div>
          )}
          {visibleFeedback.map((item) => (
            <article className="mod-card mod-card--compact" key={item.id}>
              <div className="mod-card__body">
                <h3 className="event-title">{item.subject}</h3>
                <span className="event-date">Submitted {formatDateTime(item.createdAt)}</span>
                {item.addressedAt && (
                  <span className="event-date">Addressed {formatDateTime(item.addressedAt)}</span>
                )}
                <span className="mod-card__author">
                  {item.userName || item.userEmail || item.uid}
                </span>
                {(item.userName || item.userEmail) && (
                  <span className="mod-card__author">
                    {item.userEmail || item.uid}
                  </span>
                )}
                <span className="mod-card__author">
                  {item.contextLabel || "General Feedback"} • {item.route || "-"}
                </span>
                <p className="collab-desc">{item.message}</p>
              </div>
              <div className="mod-card__actions">
                <button
                  className="btn-secondary"
                  type="button"
                  disabled={acting === `feedback:${item.id}:status`}
                  onClick={() => void handleUpdateFeedbackStatus(item.id, !item.addressed)}
                >
                  {acting === `feedback:${item.id}:status`
                    ? "Saving..."
                    : item.addressed
                      ? "Mark Unaddressed"
                      : "Mark Addressed"}
                </button>
                <button
                  className="btn-reject"
                  type="button"
                  disabled={acting === `feedback:${item.id}:delete`}
                  onClick={() => setPendingFeedbackDelete(item)}
                >
                  Delete Feedback
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
