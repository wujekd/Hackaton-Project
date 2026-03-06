import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CollaborationService } from "../services/collaboration.service";
import { useAuthStore } from "../stores/auth.store";
import type { Collaboration } from "../types/collaboration";
import { formatDateShort, formatRelativeDate } from "../utils/date";
import { buildDirectMessageHref } from "../utils/messaging";

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function idInitials(value: string): string {
  const cleaned = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!cleaned) return "ID";
  return cleaned.slice(0, 2);
}

export default function CollaborationDetail() {
  const { collaborationId } = useParams();
  const user = useAuthStore((state) => state.user);
  const [collaboration, setCollaboration] = useState<Collaboration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!collaborationId) {
      setError("Missing collaboration id.");
      setLoading(false);
      return;
    }

    CollaborationService.getById(collaborationId)
      .then((doc) => {
        if (!doc) {
          setError("This collaboration was not found.");
          return;
        }
        setCollaboration(doc);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [collaborationId]);

  const tags = useMemo(
    () => (collaboration && Array.isArray(collaboration.tags) ? collaboration.tags : []),
    [collaboration],
  );
  const files = useMemo(
    () => (collaboration && Array.isArray(collaboration.files) ? collaboration.files : []),
    [collaboration],
  );

  return (
    <div className="page-view">
      <div className="topbar">
        <div className="topbar-title">
          <span>Collaboration Detail</span>
        </div>
        <div className="topbar-actions">
          <Link className="btn-sm outline" to="/collaborations">
            Back to Collabs
          </Link>
        </div>
      </div>

      {loading && <div className="form-shell"><div className="empty-state">Loading collaboration details...</div></div>}
      {!loading && error && <div className="form-shell"><div className="auth-error">{error}</div></div>}

      {!loading && !error && collaboration && (
        <div className="detail-shell">
          <section className="detail-hero detail-hero-collab">
            <div className="collab-header">
              <div className="avatar av-red">{idInitials(collaboration.authorId)}</div>
              <div className="collab-author">
                <div className="collab-meta">Posted {formatRelativeDate(collaboration.createdAt)}</div>
              </div>
              <div className="tags">
                <span className="tag green">Open</span>
              </div>
            </div>

            <h1 className="detail-title">{collaboration.title}</h1>
            <p className="detail-summary">{collaboration.description || "No description provided yet."}</p>

            {tags.length > 0 && (
              <div className="tags">
                {tags.map((tag) => (
                  <span className="tag neutral" key={tag}>{tag}</span>
                ))}
              </div>
            )}
          </section>

          <div className={`detail-grid ${user?.uid === collaboration.authorId ? "detail-grid-single" : ""}`.trim()}>
            <article className="detail-card">
              <h2 className="detail-card-title">Details</h2>
              <div className="detail-item">
                <div className="detail-item-label">Posted</div>
                <div className="detail-item-value">{formatDateShort(collaboration.createdAt)}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item-label">Assets</div>
                <div className="detail-item-value">
                  {files.length === 0 ? "No files shared yet." : `${files.length} attached`}
                </div>
              </div>

              {files.length > 0 && (
                <ul className="detail-file-list">
                  {files.map((file) => (
                    <li key={`${file.url}-${file.name}`}>
                      <a href={file.url} target="_blank" rel="noreferrer">
                        {file.name}
                      </a>
                      <span>{formatFileSize(file.size)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            {user?.uid !== collaboration.authorId && (
              <aside className="detail-card">
                <h2 className="detail-card-title">Contact</h2>
                <div className="detail-actions">
                  <Link
                    className="btn-sm accent collab-message-author-cta"
                    to={buildDirectMessageHref(user?.uid, collaboration.authorId, { username: collaboration.authorName })}
                  >
                    Message Project Author
                  </Link>
                </div>
              </aside>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
