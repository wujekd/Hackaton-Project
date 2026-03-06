import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EventService } from "../services/event.service";
import type { EventItem } from "../types/event";
import { formatDateShort } from "../utils/date";

const filterPills = ["All Events", "Workshops", "Hackathons", "Showcases", "Social", "Talks"];
const bannerClasses = ["b1", "b2", "b3", "b4", "b5"];

function eventType(event: EventItem): string {
  const text = `${event.name} ${event.description}`.toLowerCase();
  if (text.includes("hack")) return "Hackathon";
  if (text.includes("workshop")) return "Workshop";
  if (text.includes("showcase")) return "Showcase";
  if (text.includes("talk")) return "Talk";
  if (text.includes("social") || text.includes("meetup")) return "Social";
  return "Event";
}

function matches(event: EventItem, filter: string): boolean {
  if (filter === "All Events") return true;
  const type = eventType(event).toLowerCase();
  return type.includes(filter.toLowerCase().replace("s", ""));
}

export default function Events() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("All Events");

  useEffect(() => {
    EventService.getApproved()
      .then(setEvents)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const visibleEvents = useMemo(
    () => events.filter((event) => matches(event, activeFilter)),
    [events, activeFilter],
  );

  return (
    <div className="page-view">
      <div className="topbar">
        <div className="topbar-title">
          <span>Events</span>
        </div>
        <div className="topbar-actions">
          <Link className="btn-sm outline" to="/schedule">
            Schedule
          </Link>
          <Link className="btn-sm accent" to="/events/suggest">
            Suggest Event
          </Link>
        </div>
      </div>

      <div className="filters">
        {filterPills.map((pill) => (
          <button
            key={pill}
            className={`filter-pill ${pill === activeFilter ? "active" : ""}`}
            type="button"
            onClick={() => setActiveFilter(pill)}
          >
            {pill}
          </button>
        ))}
      </div>

      {loading && <div className="form-shell"><div className="empty-state">Loading events...</div></div>}
      {error && <div className="form-shell"><div className="auth-error">{error}</div></div>}
      {!loading && !error && visibleEvents.length === 0 && (
        <div className="form-shell">
          <div className="empty-state">No events in this category.</div>
        </div>
      )}

      <section className="events-grid">
        {visibleEvents.map((event, index) => {
          const type = eventType(event);
          const bannerClass = bannerClasses[index % bannerClasses.length];
          return (
            <article className="event-card" key={event.id}>
              <div
                className={`event-banner ${bannerClass}`}
                style={event.imageUrl ? { backgroundImage: `url(${event.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
              >
                <div className="event-banner-label">{type}</div>
              </div>
              <div className="event-body">
                <div className="event-date">{formatDateShort(event.date)}</div>
                <div className="event-title">{event.name}</div>
                {event.description && <div className="event-desc">{event.description}</div>}
                <div className="event-footer">
                  <div className="event-attendees">
                    <div className="avatar av-red">{event.name[0]?.toUpperCase() ?? "E"}</div>
                    <div className="avatar av-mid">{type[0]}</div>
                    <span className="attendee-count">+{Math.max(5, event.name.length)}</span>
                  </div>
                  <Link className="btn-sm accent" to={`/events/${event.id}`}>
                    Open
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
