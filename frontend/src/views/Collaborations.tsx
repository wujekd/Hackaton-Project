import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CollaborationService } from "../services/collaboration.service";
import type { Collaboration } from "../types/collaboration";
import { formatRelativeDate } from "../utils/date";

const filters = ["All", "Game Dev", "Music", "Film & Media", "Design", "Tech"];

function matchesFilter(collab: Collaboration, activeFilter: string): boolean {
  if (activeFilter === "All") return true;
  const text = `${collab.title} ${collab.description} ${collab.tags.join(" ")}`.toLowerCase();
  const normalized = activeFilter.toLowerCase().replace("&", "and");
  return text.includes(normalized) || collab.tags.some((tag) => tag.toLowerCase().includes(normalized));
}

function initials(name: string): string {
  const bits = name.trim().split(/\s+/);
  if (bits.length === 1) return bits[0].slice(0, 2).toUpperCase();
  return `${bits[0][0]}${bits[1][0]}`.toUpperCase();
}

export default function Collaborations() {
  const navigate = useNavigate();
  const [collabs, setCollabs] = useState<Collaboration[]>([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    CollaborationService.getAll()
      .then(setCollabs)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(
    () => collabs.filter((collab) => matchesFilter(collab, activeFilter)),
    [collabs, activeFilter],
  );

  const topTags = useMemo(() => {
    const counts = new Map<string, number>();
    collabs.forEach((collab) => {
      collab.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [collabs]);

  return (
    <div className="page-view">
      <div className="topbar">
        <div className="topbar-title">
          <span>Collabs</span>
        </div>
        <div className="topbar-actions">
          <div className="search-bar">
            <svg className="si" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input placeholder="Search collabs, skills" readOnly />
          </div>
          <Link className="btn-sm accent" to="/collaborations/new">
            + New Collab
          </Link>
        </div>
      </div>

      <div className="collabs-layout">
        <section className="collabs-feed">
          <div className="filters collab-filters">
            {filters.map((filter) => (
              <button
                key={filter}
                className={`filter-pill ${activeFilter === filter ? "active" : ""}`}
                type="button"
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="create-post-box">
            <div className="create-post-row">
              <div className="avatar av-red" style={{ width: 30, height: 30, fontSize: 10 }}>YU</div>
              <input
                className="create-post-input"
                placeholder="Post a collab opportunity"
                readOnly
                onFocus={() => navigate("/collaborations/new")}
              />
              <Link className="btn-sm accent" to="/collaborations/new">
                Post
              </Link>
            </div>
          </div>

          {loading && <div className="empty-state">Loading collaborations...</div>}
          {error && <div className="auth-error">{error}</div>}
          {!loading && !error && visible.length === 0 && (
            <div className="empty-state">No collaborations match the selected filter.</div>
          )}

          {visible.map((collab) => (
            <article className="collab-card" key={collab.id}>
              <div className="collab-header">
                <div className="avatar av-red">{initials(collab.authorName)}</div>
                <div className="collab-author">
                  <div className="collab-author-name">{collab.authorName}</div>
                  <div className="collab-meta">{formatRelativeDate(collab.createdAt)}</div>
                </div>
                <div className="tags">
                  <span className="tag green">Open</span>
                </div>
              </div>

              <div className="collab-title">{collab.title}</div>
              {collab.description && <div className="collab-desc">{collab.description}</div>}

              {collab.tags.length > 0 && (
                <div className="roles">
                  {collab.tags.slice(0, 3).map((tag) => (
                    <div className="role-chip" key={`${collab.id}-${tag}`}>
                      <span className="dot-o" />
                      {tag}
                    </div>
                  ))}
                  {collab.files.length > 0 && (
                    <div className="role-chip">
                      <span className="dot-f" />
                      {collab.files.length} assets
                    </div>
                  )}
                </div>
              )}

              <div className="collab-actions">
                <Link className="btn-sm accent" to={`/collaborations/${collab.id}`}>Open</Link>
                <Link
                  className="btn-sm outline"
                  to={
                    `/messages?userId=${encodeURIComponent(collab.authorId)}` +
                    `&userName=${encodeURIComponent(collab.authorName)}`
                  }
                >
                  Message Host
                </Link>
                <button className="btn-sm ghost" type="button">Invite</button>
                <span className="collab-likes">{Math.max(8, collab.tags.length * 5)} likes</span>
              </div>
            </article>
          ))}
        </section>

        <aside className="collabs-aside">
          <div className="aside-card">
            <div className="aside-card-title">Trending Skills Needed</div>
            {topTags.length === 0 && <div className="skill-count">No trend data yet.</div>}
            {topTags.map(([tag, count]) => (
              <div className="skill-item" key={tag}>
                <span className="skill-dot" />
                <div style={{ flex: 1 }}>
                  <div className="skill-name">{tag}</div>
                  <div className="skill-count">{count} open posts</div>
                </div>
                <span className="trend-up">+{count}</span>
              </div>
            ))}
          </div>

          <div className="aside-card">
            <div className="aside-card-title">Matched for You</div>
            <p className="collabs-match-copy">
              Mockup section without recommendation logic. Showing latest posts.
            </p>
            <div className="collabs-match-list">
              {collabs.slice(0, 2).map((collab) => (
                <div key={`match-${collab.id}`} className="collabs-match-item">
                  <div className="collabs-match-title">{collab.title}</div>
                  <div className="collabs-match-author">{collab.authorName}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
