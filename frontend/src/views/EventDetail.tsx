import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EventService } from "../services/event.service";
import type { EventItem } from "../types/event";
import { formatDateShort, formatDateTime } from "../utils/date";

function eventType(event: EventItem): string {
  const text = `${event.name} ${event.description}`.toLowerCase();
  if (text.includes("hack")) return "Hackathon";
  if (text.includes("workshop")) return "Workshop";
  if (text.includes("showcase")) return "Showcase";
  if (text.includes("talk")) return "Talk";
  if (text.includes("social") || text.includes("meetup")) return "Social";
  return "Event";
}

export default function EventDetail() {
  const { eventId } = useParams();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) {
      setError("Missing event id.");
      setLoading(false);
      return;
    }

    EventService.getById(eventId)
      .then((doc) => {
        if (!doc) {
          setError("This event was not found.");
          return;
        }
        setEvent(doc);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [eventId]);

  const kind = event ? eventType(event) : "Event";

  return (
    <div className="page-view">
      <div className="topbar">
        <div className="topbar-title">
          <span>Event Detail</span>
        </div>
        <div className="topbar-actions">
          <Link className="btn-sm outline" to="/events">
            Back to Events
          </Link>
        </div>
      </div>

      {loading && <div className="form-shell"><div className="empty-state">Loading event details...</div></div>}
      {!loading && error && <div className="form-shell"><div className="auth-error">{error}</div></div>}

      {!loading && !error && event && (
        <div className="detail-shell">
          <section
            className={`detail-hero ${event.imageUrl ? "detail-hero-image" : "detail-hero-event"}`}
            style={event.imageUrl ? { backgroundImage: `url(${event.imageUrl})` } : undefined}
          >
            <div className="detail-kicker">{kind}</div>
            <h1 className="detail-title">{event.name}</h1>
            <p className="detail-summary">{event.description || "No description provided yet."}</p>
          </section>

          <div className="detail-grid">
            <article className="detail-card">
              <h2 className="detail-card-title">When</h2>
              <div className="detail-item">
                <div className="detail-item-label">Date</div>
                <div className="detail-item-value">{formatDateShort(event.date)}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item-label">Date & Time</div>
                <div className="detail-item-value">{formatDateTime(event.date)}</div>
              </div>
            </article>

            <aside className="detail-card">
              <h2 className="detail-card-title">Actions</h2>
              <div className="detail-actions">
                <button className="btn-sm accent" type="button">Sign Up</button>
                <Link className="btn-sm outline" to="/schedule">
                  Open Schedule
                </Link>
              </div>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
