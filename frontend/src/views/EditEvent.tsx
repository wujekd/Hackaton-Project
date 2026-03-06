import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { EventService } from "../services/event.service";
import { useAuthStore } from "../stores/auth.store";
import { toDate } from "../utils/date";

function toDateTimeLocalValue(value: unknown): string {
  const date = toDate(value);
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function EditEvent() {
  const { profile, loading: authLoading } = useAuthStore();
  const { eventId } = useParams<{ eventId?: string }>();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = profile?.admin === true;

  useEffect(() => {
    if (!eventId || !isAdmin) return;
    let cancelled = false;

    setLoading(true);
    setError("");
    void EventService.getById(eventId)
      .then((event) => {
        if (cancelled) return;
        if (!event) {
          setError("Event not found.");
          return;
        }
        setName(event.name ?? "");
        setDescription(event.description ?? "");
        setDate(toDateTimeLocalValue(event.date));
        setImageUrl(event.imageUrl ?? "");
        setPreview(event.imageUrl ?? null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load event.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [eventId, isAdmin]);

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  if (authLoading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  const handleImage = (file: File | undefined) => {
    if (!file) return;
    if (preview && preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!eventId) {
      setError("Missing event id.");
      return;
    }
    if (!name.trim()) {
      setError("Event name is required.");
      return;
    }
    if (!date) {
      setError("Event date is required.");
      return;
    }

    setError("");
    setSaving(true);
    try {
      await EventService.updateEventAsAdmin(
        eventId,
        {
          name: name.trim(),
          description: description.trim(),
          date: new Date(date),
          existingImageUrl: imageUrl,
        },
        image,
      );
      navigate("/admin/moderation");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update event.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-view">
      <div className="topbar">
        <div className="topbar-title">
          <span>Edit Event</span>
        </div>
        <div className="topbar-actions">
          <Link className="btn-sm outline" to="/admin/moderation">
            Back to Moderation
          </Link>
        </div>
      </div>

      <div className="form-shell">
        <div className="form-card">
          {loading && <div className="empty-state">Loading event...</div>}
          {error && <div className="auth-error">{error}</div>}

          {!loading && (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="edit-event-name">Event Name</label>
                <input
                  id="edit-event-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={saving}
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-event-desc">Description</label>
                <textarea
                  id="edit-event-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-event-date">Date</label>
                <input
                  id="edit-event-date"
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  disabled={saving}
                />
              </div>

              <div className="form-group">
                <label>Picture</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImage(e.target.files?.[0])}
                  style={{ display: "none" }}
                  disabled={saving}
                />
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={saving}
                >
                  {image ? "Change Picture" : "Choose Picture"}
                </button>
                {preview && <img className="event-preview" src={preview} alt="Event preview" />}
              </div>

              <button className="btn-primary" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Event"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
