import { useEffect, useMemo, useState, type FormEvent } from "react";
import { EventService } from "../services/event.service";
import { TimetableService } from "../services/timetable.service";
import { useAuthStore } from "../stores/auth.store";
import type { EventSignup } from "../types/event";
import type { TimetableDraft, TimetableItem } from "../types/timetable";
import { toDate } from "../utils/date";

const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface CalendarEntry {
  id: string;
  title: string;
  subtitle: string;
  timeLabel: string;
  sortMinutes: number;
}

function TimetableHintIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <polyline points="12 8 12 12 15 14" />
    </svg>
  );
}

function signupType(signup: EventSignup): string {
  const text = `${signup.eventName} ${signup.eventDescription}`.toLowerCase();
  if (text.includes("hack")) return "Hackathon";
  if (text.includes("workshop")) return "Workshop";
  if (text.includes("showcase")) return "Showcase";
  if (text.includes("talk")) return "Talk";
  if (text.includes("social") || text.includes("meetup")) return "Social";
  return "Event";
}

function toMondayIndex(day: number): number {
  return (day + 6) % 7;
}

function parseTimeToMinutes(value: string): number {
  const [rawHour, rawMinute] = value.split(":");
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  return hour * 60 + minute;
}

function formatTime(value: string): string {
  const [rawHour, rawMinute] = value.split(":");
  const hour = Number(rawHour);
  const minute = Number(rawMinute);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return value;

  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function dateKey(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildCalendarDays(monthAnchor: Date): Date[] {
  const firstOfMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
  const daysInMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0).getDate();
  const startOffset = toMondayIndex(firstOfMonth.getDay());
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - startOffset);

  return Array.from({ length: totalCells }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

function sortTimetableItems(items: TimetableItem[]): TimetableItem[] {
  return [...items].sort((left, right) => (
    left.dayOfWeek - right.dayOfWeek ||
    left.startMinutes - right.startMinutes ||
    left.title.localeCompare(right.title)
  ));
}

export default function Schedule() {
  const { user } = useAuthStore();
  const [signups, setSignups] = useState<EventSignup[]>([]);
  const [signupsLoading, setSignupsLoading] = useState(false);
  const [signupsError, setSignupsError] = useState<string | null>(null);
  const [timetableItems, setTimetableItems] = useState<TimetableItem[]>([]);
  const [timetableLoading, setTimetableLoading] = useState(false);
  const [timetableError, setTimetableError] = useState<string | null>(null);
  const [timetableSaving, setTimetableSaving] = useState(false);
  const [monthAnchor, setMonthAnchor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [timetableDraft, setTimetableDraft] = useState<TimetableDraft>({
    title: "",
    dayOfWeek: 0,
    startTime: "09:00",
    endTime: "10:00",
    location: "",
  });

  useEffect(() => {
    if (!user) {
      setSignups([]);
      setSignupsError(null);
      setSignupsLoading(false);
      return;
    }

    setSignupsLoading(true);
    setSignupsError(null);
    EventService.getSignups(user.uid)
      .then((loaded) => {
        setSignups(loaded);
        const firstDate = loaded.reduce<Date | null>((earliest, s) => {
          const d = toDate(s.eventDate);
          if (!d) return earliest;
          if (!earliest || d < earliest) return d;
          return earliest;
        }, null);
        if (firstDate) {
          setMonthAnchor(new Date(firstDate.getFullYear(), firstDate.getMonth(), 1));
        }
      })
      .catch((err: Error) => setSignupsError(err.message))
      .finally(() => setSignupsLoading(false));
  }, [user]);

  useEffect(() => {
    if (!user) {
      setTimetableItems([]);
      setTimetableError(null);
      setTimetableLoading(false);
      return;
    }

    setTimetableLoading(true);
    setTimetableError(null);
    TimetableService.listForUser(user.uid)
      .then((items) => setTimetableItems(sortTimetableItems(items)))
      .catch((err: Error) => setTimetableError(err.message))
      .finally(() => setTimetableLoading(false));
  }, [user]);

  const timetableByDay = useMemo(() => {
    const grouped = new Map<number, TimetableItem[]>();
    for (const item of timetableItems) {
      const current = grouped.get(item.dayOfWeek) ?? [];
      current.push(item);
      grouped.set(item.dayOfWeek, current);
    }
    return grouped;
  }, [timetableItems]);
  const calendarDays = useMemo(() => buildCalendarDays(monthAnchor), [monthAnchor]);
  const projectedEntriesByDay = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    for (const day of calendarDays) {
      map.set(dateKey(day), []);
    }

    for (const signup of signups) {
      const eventDate = toDate(signup.eventDate);
      if (!eventDate) continue;
      const key = dateKey(eventDate);
      const dayEntries = map.get(key);
      if (!dayEntries) continue;
      dayEntries.push({
        id: `event-${signup.eventId}`,
        title: signup.eventName,
        subtitle: signupType(signup),
        timeLabel: eventDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
        sortMinutes: eventDate.getHours() * 60 + eventDate.getMinutes(),
      });
    }

    for (const dayEntries of map.values()) {
      dayEntries.sort((left, right) => left.sortMinutes - right.sortMinutes || left.title.localeCompare(right.title));
    }

    return map;
  }, [calendarDays, signups]);
  const timetableCountByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const day of calendarDays) {
      const key = dateKey(day);
      const count = timetableByDay.get(toMondayIndex(day.getDay()))?.length ?? 0;
      map.set(key, count);
    }
    return map;
  }, [calendarDays, timetableByDay]);

  const monthLabel = monthAnchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const todayKey = dateKey(new Date());

  const handleTimetableSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const dayIndex = selectedDayIndex;

    if (!user) {
      setTimetableError("Sign in to add timetable items.");
      return;
    }
    if (dayIndex === null) {
      setTimetableError("Pick a day first.");
      return;
    }

    if (!timetableDraft.title.trim()) {
      setTimetableError("Title is required.");
      return;
    }

    const startMinutes = parseTimeToMinutes(timetableDraft.startTime);
    const endMinutes = parseTimeToMinutes(timetableDraft.endTime);
    if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes)) {
      setTimetableError("Choose valid start and end times.");
      return;
    }
    if (endMinutes <= startMinutes) {
      setTimetableError("End time must be after start time.");
      return;
    }

    setTimetableSaving(true);
    setTimetableError(null);
    try {
      const created = await TimetableService.createForUser(user.uid, {
        title: timetableDraft.title.trim(),
        dayOfWeek: dayIndex,
        startTime: timetableDraft.startTime,
        endTime: timetableDraft.endTime,
        location: timetableDraft.location.trim(),
      });
      setTimetableItems((current) => sortTimetableItems([...current, created]));
      setTimetableDraft((current) => ({
        ...current,
        title: "",
        startTime: "09:00",
        endTime: "10:00",
        location: "",
      }));
      setSelectedDayIndex(null);
    } catch (err: unknown) {
      setTimetableError(err instanceof Error ? err.message : "Failed to save timetable item.");
    } finally {
      setTimetableSaving(false);
    }
  };

  const handleDeleteTimetableItem = async (timetableId: string) => {
    if (!user) return;

    try {
      await TimetableService.removeForUser(user.uid, timetableId);
      setTimetableItems((current) => current.filter((item) => item.id !== timetableId));
    } catch (err: unknown) {
      setTimetableError(err instanceof Error ? err.message : "Failed to delete timetable item.");
    }
  };

  const shiftMonth = (offset: number) => {
    setMonthAnchor((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const handleSelectDay = (dayIndex: number) => {
    setSelectedDayIndex(dayIndex);
    setTimetableError(null);
    setTimetableDraft((current) => ({ ...current, dayOfWeek: dayIndex }));
  };

  return (
    <div className="page-view">
      <div className="topbar">
        <div className="topbar-title">
          <span>Schedule</span>
        </div>
      </div>

      <section className="planner-shell">
        <div className="planner-header">
          <div className="sec-head">
            <span className="bar" />
            Weekly Plan
          </div>
          <div className="planner-header-meta">
            {!user && (
              <div className="auth-notice auth-notice-inline">
                Sign in to save timetable items to your account.
              </div>
            )}
            {selectedDayIndex === null && (
              <div className="planner-hint planner-hint-inline">
                Click any day to open the add timetable form.
              </div>
            )}
          </div>
        </div>
        {timetableError && <div className="auth-error">{timetableError}</div>}
        <div className="planner-grid">
          {selectedDayIndex !== null && (
            <form className="planner-form" onSubmit={handleTimetableSubmit}>
              <div className="planner-form-head">
                <div className="planner-day-title">{weekDays[selectedDayIndex]}</div>
                <button
                  type="button"
                  className="btn-sm outline"
                  onClick={() => setSelectedDayIndex(null)}
                >
                  Cancel
                </button>
              </div>

              <div className="form-group">
                <label htmlFor="timetable-title">Timetable item</label>
                <input
                  id="timetable-title"
                  type="text"
                  value={timetableDraft.title}
                  onChange={(event) => setTimetableDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Example: Machine Learning Seminar"
                  required
                />
              </div>

              <div className="planner-form-row">
                <div className="form-group">
                  <label htmlFor="timetable-start">Start</label>
                  <input
                    id="timetable-start"
                    type="time"
                    value={timetableDraft.startTime}
                    onChange={(event) => setTimetableDraft((current) => ({ ...current, startTime: event.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="timetable-end">End</label>
                  <input
                    id="timetable-end"
                    type="time"
                    value={timetableDraft.endTime}
                    onChange={(event) => setTimetableDraft((current) => ({ ...current, endTime: event.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="timetable-location">Location (optional)</label>
                <input
                  id="timetable-location"
                  type="text"
                  value={timetableDraft.location}
                  onChange={(event) => setTimetableDraft((current) => ({ ...current, location: event.target.value }))}
                  placeholder="Room / campus / online"
                />
              </div>

              <button className="btn-sm accent" type="submit" disabled={timetableSaving || !user}>
                {timetableSaving ? "Saving..." : "Add to Timetable"}
              </button>
            </form>
          )}

          <div className="planner-week-grid" aria-label="Weekly timetable items">
            {weekDays.map((day, index) => {
              const dayItems = timetableByDay.get(index) ?? [];
              return (
                <div
                  className={`planner-day-column planner-day-selector${selectedDayIndex === index ? " active" : ""}`}
                  key={day}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectDay(index)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleSelectDay(index);
                    }
                  }}
                >
                  <div className="planner-day-title">{day}</div>
                  {dayItems.length === 0 && <div className="planner-empty">No items</div>}
                  {dayItems.map((item) => (
                    <article className="planner-item" key={item.id}>
                      <div className="planner-item-time">
                        {formatTime(item.startTime)} - {formatTime(item.endTime)}
                      </div>
                      <div className="planner-item-title">{item.title}</div>
                      {item.location && <div className="planner-item-location">{item.location}</div>}
                      <button
                        type="button"
                        className="link-btn planner-item-delete"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDeleteTimetableItem(item.id);
                        }}
                      >
                        Remove
                      </button>
                    </article>
                  ))}
                </div>
              );
            })}
            {timetableLoading && <div className="planner-loading">Loading timetable...</div>}
          </div>
        </div>
      </section>

      <section className="calendar-shell">
        <div className="calendar-toolbar">
          <div className="calendar-toolbar-title">{monthLabel}</div>
          <div className="calendar-toolbar-meta">
            {!user && (
              <div className="auth-notice auth-notice-inline">
                Sign in to see events you've signed up for.
              </div>
            )}
            <div className="calendar-toolbar-actions">
              <button
                className="btn-sm outline"
                type="button"
                onClick={() => {
                  const now = new Date();
                  setMonthAnchor(new Date(now.getFullYear(), now.getMonth(), 1));
                }}
              >
                Today
              </button>
              <button className="btn-sm outline" type="button" onClick={() => shiftMonth(-1)}>
                Previous
              </button>
              <button className="btn-sm outline" type="button" onClick={() => shiftMonth(1)}>
                Next
              </button>
            </div>
          </div>
        </div>

        {signupsLoading && <div className="empty-state">Loading your events...</div>}
        {signupsError && <div className="auth-error">{signupsError}</div>}

        <div className="calendar-grid">
          {weekDays.map((weekDay) => (
            <div className="calendar-weekday" key={weekDay}>
              {weekDay.slice(0, 3)}
            </div>
          ))}
          {calendarDays.map((day) => {
            const key = dateKey(day);
            const entries = projectedEntriesByDay.get(key) ?? [];
            const timetableCount = timetableCountByDay.get(key) ?? 0;
            const outsideMonth = day.getMonth() !== monthAnchor.getMonth();
            return (
              <article
                className={`calendar-day${outsideMonth ? " outside" : ""}`}
                key={key}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectDay(toMondayIndex(day.getDay()))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleSelectDay(toMondayIndex(day.getDay()));
                  }
                }}
              >
                <div className="calendar-day-head">
                  <div className={`calendar-day-number${key === todayKey ? " today" : ""}`}>{day.getDate()}</div>
                  {timetableCount > 0 && (
                    <span
                      className="calendar-timetable-indicator"
                      title={`${timetableCount} timetable item${timetableCount === 1 ? "" : "s"}`}
                      aria-label={`${timetableCount} timetable item${timetableCount === 1 ? "" : "s"}`}
                    >
                      <TimetableHintIcon />
                    </span>
                  )}
                </div>
                <div className="calendar-day-items">
                  {entries.map((entry) => (
                    <div className="calendar-entry event" key={entry.id}>
                      <div className="calendar-entry-time">{entry.timeLabel}</div>
                      <div className="calendar-entry-title">{entry.title}</div>
                      <div className="calendar-entry-subtitle">{entry.subtitle}</div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
