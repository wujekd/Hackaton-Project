import { useEffect, useId } from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmTone?: "danger" | "accent";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmTone = "danger",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const headingId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        onCancel();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="confirm-dialog" role="presentation" onClick={busy ? undefined : onCancel}>
      <div
        className="confirm-dialog__panel theme-surface"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={descriptionId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="confirm-dialog__copy">
          <p className="theme-showcase-kicker">Please confirm</p>
          <h2 id={headingId} className="theme-section-title">{title}</h2>
          <p id={descriptionId} className="theme-showcase-copy">{message}</p>
        </div>
        <div className="confirm-dialog__actions">
          <button className="btn-sm outline" type="button" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            className={confirmTone === "accent" ? "btn-sm accent" : "btn-reject confirm-dialog__confirm"}
            type="button"
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
