import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CollaborationService } from "../services/collaboration.service";
import { useAuthStore } from "../stores/auth.store";
import type { Collaboration, CollaborationFile } from "../types/collaboration";
import {
  getCollaborationCoverImageUrl,
  getCollaborationImageFiles,
  isCollaborationImageFile,
} from "../utils/collaboration";
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
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
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
  const imageFiles = useMemo(() => getCollaborationImageFiles(files), [files]);
  const downloadFiles = useMemo<CollaborationFile[]>(
    () => files.filter((file) => !isCollaborationImageFile(file)),
    [files],
  );
  const preferredImageUrl = useMemo(
    () => getCollaborationCoverImageUrl(collaboration),
    [collaboration],
  );
  const selectedImageUrl = activeImageUrl || preferredImageUrl || imageFiles[0]?.url || null;
  const activeImageIndex = useMemo(
    () => imageFiles.findIndex((file) => file.url === selectedImageUrl),
    [imageFiles, selectedImageUrl],
  );
  const selectedImageFile = useMemo(
    () => imageFiles.find((file) => file.url === selectedImageUrl) ?? null,
    [imageFiles, selectedImageUrl],
  );

  useEffect(() => {
    setActiveImageUrl(preferredImageUrl);
  }, [preferredImageUrl]);

  const showImageAt = (index: number) => {
    const target = imageFiles[index];
    if (!target) return;
    setActiveImageUrl(target.url);
  };

  const shiftImage = (offset: number) => {
    if (imageFiles.length < 2) return;
    const currentIndex = activeImageIndex >= 0 ? activeImageIndex : 0;
    const nextIndex = (currentIndex + offset + imageFiles.length) % imageFiles.length;
    showImageAt(nextIndex);
  };

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

          {imageFiles.length > 0 && (
            <section className="detail-card detail-media-gallery" aria-label="Collaboration gallery">
              <div className="detail-card-head">
                <div className="detail-media-heading">
                  <h2 className="detail-card-title">Gallery</h2>
                  <span className="detail-card-meta">
                    {imageFiles.length > 1 && activeImageIndex >= 0 ?
                      `Image ${activeImageIndex + 1} of ${imageFiles.length}` :
                      `${imageFiles.length} image${imageFiles.length === 1 ? "" : "s"}`}
                  </span>
                </div>

                <div className="detail-media-actions">
                  {imageFiles.length > 1 && (
                    <>
                      <button className="btn-sm outline" type="button" onClick={() => shiftImage(-1)}>
                        Previous
                      </button>
                      <button className="btn-sm outline" type="button" onClick={() => shiftImage(1)}>
                        Next
                      </button>
                    </>
                  )}
                  {selectedImageUrl && (
                    <a
                      className="detail-media-open-link"
                      href={selectedImageUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open Full Image
                    </a>
                  )}
                </div>
              </div>

              <div className={`detail-media-viewer ${imageFiles.length === 1 ? "single" : ""}`.trim()}>
                {imageFiles.length > 1 && (
                  <div className="detail-media-strip" role="tablist" aria-label="Collaboration images">
                    {imageFiles.map((file, index) => (
                      <button
                        key={`${file.url}-${file.name}`}
                        className={`detail-media-thumb ${selectedImageUrl === file.url ? "active" : ""}`.trim()}
                        type="button"
                        onClick={() => showImageAt(index)}
                        aria-pressed={selectedImageUrl === file.url}
                        aria-label={`Show image ${index + 1}: ${file.name}`}
                      >
                        <img src={file.url} alt={file.name} loading="lazy" />
                        <span>{file.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {selectedImageUrl && (
                  <div className="detail-media-stage">
                    <img
                      className="detail-media-stage-image"
                      src={selectedImageUrl}
                      alt={selectedImageFile?.name || collaboration.title}
                    />
                  </div>
                )}
              </div>

              {selectedImageFile && (
                <div className="detail-media-caption">
                  <span>{selectedImageFile.name}</span>
                  <span>{formatFileSize(selectedImageFile.size)}</span>
                </div>
              )}
            </section>
          )}

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

              {selectedImageUrl && (
                <div className="detail-item">
                  <div className="detail-item-label">Media</div>
                  <div className="detail-item-value">
                    {imageFiles.length > 0 ?
                      `${imageFiles.length} image${imageFiles.length === 1 ? "" : "s"}` :
                      "Cover image attached"}
                  </div>
                  <div className="detail-item-copy">
                    <a href={selectedImageUrl} target="_blank" rel="noreferrer">
                      {selectedImageFile?.name || "Open selected image"}
                    </a>
                  </div>
                </div>
              )}

              {downloadFiles.length > 0 && (
                <div className="detail-item">
                  <div className="detail-item-label">Downloads</div>
                  <div className="detail-item-value">
                    {downloadFiles.length} file{downloadFiles.length === 1 ? "" : "s"}
                  </div>
                </div>
              )}

              {downloadFiles.length > 0 && (
                <ul className="detail-file-list">
                  {downloadFiles.map((file) => (
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
