import { useEffect, useId, useState } from "react";
import { FeedbackService } from "../services/feedback.service";

interface FeedbackOverlayProps {
  isOpen: boolean;
  initialSubject: string;
  subjectOptions: string[];
  routePath: string;
  user: {
    uid: string;
    name?: string;
    email?: string;
  } | null;
  onClose: () => void;
  onSubmitted: (message: string) => void;
}

export default function FeedbackOverlay({
  isOpen,
  initialSubject,
  subjectOptions,
  routePath,
  user,
  onClose,
  onSubmitted,
}: FeedbackOverlayProps) {
  const [subject, setSubject] = useState(initialSubject);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headingId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) return;
    setSubject(initialSubject);
    setMessage("");
    setSubmitting(false);
    setError(null);
  }, [initialSubject, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const handleSubmit = async () => {
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      await FeedbackService.create({
        uid: user.uid,
        userName: user.name,
        userEmail: user.email,
        subject,
        message,
        route: routePath,
        contextLabel: initialSubject,
      });
      onSubmitted(`Thanks for sharing feedback about ${subject}.`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="feedback-overlay" role="presentation" onClick={onClose}>
      <div
        className="feedback-overlay__panel theme-surface"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={descriptionId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="feedback-overlay__header">
          <div>
            <p className="theme-showcase-kicker">Feedback</p>
            <h2 id={headingId} className="theme-section-title">Help us improve MDX Collab</h2>
            <p id={descriptionId} className="theme-showcase-copy">
              We&apos;ve prefilled the subject from where you opened this. You can still change it before sending.
            </p>
          </div>
          <button
            type="button"
            className="btn-sm outline"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close feedback form"
          >
            Close
          </button>
        </div>

        <div className="feedback-overlay__form">
          <label className="form-group" htmlFor="feedback-subject">
            <span>Subject</span>
            <select
              id="feedback-subject"
              className="input"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              disabled={submitting}
            >
              {subjectOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="form-group" htmlFor="feedback-message">
            <span>Message</span>
            <textarea
              id="feedback-message"
              className="profile-description-input feedback-overlay__textarea"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={2000}
              placeholder="Tell us what worked well, what feels broken, or what you’d like to see next."
              disabled={submitting}
            />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <div className="feedback-overlay__actions">
            <span className="feedback-overlay__count">{message.trim().length}/2000</span>
            <button className="btn-primary" type="button" onClick={() => void handleSubmit()} disabled={submitting}>
              {submitting ? "Sending..." : "Send Feedback"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
