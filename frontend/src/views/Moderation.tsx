import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { EventService } from "../services/event.service";
import { useAuthStore } from "../stores/auth.store";
import type { EventItem, EventProposal } from "../types/event";
import { formatDateTime } from "../utils/date";

export default function Moderation() {
  const { profile, loading: authLoading } = useAuthStore();
  const [proposals, setProposals] = useState<EventProposal[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const isAdmin = profile?.admin === true;

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setError(null);
    setLoading(true);

    Promise.all([
      EventService.getPendingProposals(),
      EventService.getAllEvents(),
    ])
      .then(([pendingProposals, allEvents]) => {
        if (cancelled) return;
        setProposals(pendingProposals);
        setEvents(allEvents);
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

  if (authLoading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

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
    const shouldDelete = window.confirm(
      `Delete "${event.name}"?\n\nThis will also remove every user's signup for this event.`,
    );
    if (!shouldDelete) return;

    setActing(`event:${event.id}`);
    try {
      await EventService.deleteEventAsAdmin(event.id);
      setEvents((prev) => prev.filter((item) => item.id !== event.id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete event");
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="page-view">
      <div className="topbar">
        <div className="topbar-title">
          Admin <span>Moderation</span>
        </div>
      </div>

      {error && <div className="form-shell"><div className="auth-error">{error}</div></div>}
      {loading && <div className="form-shell"><div className="empty-state">Loading moderation data...</div></div>}

      {!loading && (
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
    </div>
  );
}
