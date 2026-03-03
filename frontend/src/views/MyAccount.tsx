import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TagInput from "../components/TagInput";
import { CollaborationService } from "../services/collaboration.service";
import { EventService } from "../services/event.service";
import { useAuthStore } from "../stores/auth.store";
import type { Collaboration } from "../types/collaboration";
import type { EventProposal } from "../types/event";
import { formatDateShort, toDate } from "../utils/date";

type AccountTab = "profile" | "activity";

function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return email;
  return `${email[0]}${"*".repeat(Math.max(1, at - 1))}${email.slice(at)}`;
}

export default function MyAccount() {
  const navigate = useNavigate();
  const { user, profile, updateProfileInterests } = useAuthStore();
  const [activeTab, setActiveTab] = useState<AccountTab>("profile");
  const [showFullEmail, setShowFullEmail] = useState(false);
  const [collabs, setCollabs] = useState<Collaboration[]>([]);
  const [proposals, setProposals] = useState<EventProposal[]>([]);
  const [loading, setLoading] = useState(!!user);
  const [error, setError] = useState<string | null>(null);
  const [interestSaving, setInterestSaving] = useState(false);
  const [interestError, setInterestError] = useState<string | null>(null);

  const displayName = profile?.username ?? user?.email?.split("@")[0] ?? "Guest";
  const avatarLetter = displayName.trim().slice(0, 2).toUpperCase() || "G";
  const memberSince = formatDateShort(profile?.createdAt);
  const emailLabel = user?.email ? (showFullEmail ? user.email : maskEmail(user.email)) : "Not signed in";
  const interests = profile?.interests ?? [];

  const handleInterestsChange = (next: string[]) => {
    if (!user) return;
    setInterestError(null);
    setInterestSaving(true);
    void updateProfileInterests(next)
      .catch((err: unknown) => {
        setInterestError(err instanceof Error ? err.message : "Failed to save interests.");
      })
      .finally(() => setInterestSaving(false));
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    Promise.all([
      CollaborationService.getByAuthor(user.uid),
      EventService.getProposalsByAuthor(user.uid),
    ])
      .then(([myCollabs, myProposals]) => {
        if (cancelled) return;
        setError(null);
        setCollabs(myCollabs);
        setProposals(myProposals);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const activityItems = useMemo(
    () =>
      [
        ...collabs.map((c) => ({
          id: `collab-${c.id}`,
          category: "Collaboration",
          status: "published",
          title: c.title,
          message: c.description || "",
          date: c.createdAt,
        })),
        ...proposals.map((p) => ({
          id: `proposal-${p.id}`,
          category: "Event suggestion",
          status: p.status,
          title: p.name,
          message: p.description || "",
          date: p.createdAt,
        })),
      ].sort((a, b) => {
        const aTime = toDate(a.date)?.getTime() ?? 0;
        const bTime = toDate(b.date)?.getTime() ?? 0;
        return bTime - aTime;
      }),
    [collabs, proposals],
  );

  return (
    <div className="page-view">
      <div className="topbar">
        <div className="topbar-title">
          <span>My Profile</span>
        </div>
        <div className="topbar-actions">
          <button className="btn-sm outline" type="button">
            Edit Profile (UI)
          </button>
        </div>
      </div>

      <div className="profile-layout">
        <aside className="profile-left">
          <div className="profile-left-main">
            <div className="profile-avatar">{avatarLetter}</div>
            <div className="profile-name">{displayName}</div>
            <div className="profile-handle">
              {user?.email ? (
                <button className="link-btn" type="button" onClick={() => setShowFullEmail((v) => !v)}>
                  {emailLabel}
                </button>
              ) : (
                emailLabel
              )}
            </div>
            <div className="profile-bio">
              Member since {memberSince}. Keep this section as your portfolio snapshot and activity hub.
            </div>
            <div className="profile-stats">
              <div className="profile-stat">
                <div className="profile-stat-val">{collabs.length}</div>
                <div className="profile-stat-lbl">Collabs</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-val">{proposals.length}</div>
                <div className="profile-stat-lbl">Proposals</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-val">{activityItems.length}</div>
                <div className="profile-stat-lbl">Activity</div>
              </div>
            </div>
          </div>

          <div className="interest-label">Interests</div>
          <div className="profile-interest-note">
            Add your own interests so collaborators can find you.
            {interestSaving ? " Saving..." : ""}
          </div>
          <div className="profile-interests">
            <TagInput
              tags={interests}
              onChange={handleInterestsChange}
              disabled={!user || interestSaving}
              placeholder="#gamedev #unity #leveldesign"
            />
          </div>
          {interestError && <div className="tag-input__error">{interestError}</div>}
          {!user && (
            <button className="btn-primary" type="button" onClick={() => navigate("/login")}>
              Login
            </button>
          )}
        </aside>

        <section className="profile-right">
          <div className="prof-sec-title">
            Account View
            <div className="account-tab-group">
              <button
                className={`filter-pill ${activeTab === "profile" ? "active" : ""}`}
                type="button"
                onClick={() => setActiveTab("profile")}
              >
                Profile
              </button>
              <button
                className={`filter-pill ${activeTab === "activity" ? "active" : ""}`}
                type="button"
                onClick={() => setActiveTab("activity")}
              >
                Activity
              </button>
            </div>
          </div>

          {!user && (
            <div className="empty-state">
              Sign in to manage your account and view collaboration history.
            </div>
          )}

          {user && loading && <div className="empty-state">Loading your data...</div>}
          {user && error && <div className="auth-error">{error}</div>}

          {user && !loading && activeTab === "profile" && (
            <>
              <div className="account-profile-section">
                <div className="prof-sec-title">
                  My Collabs
                  <Link className="btn-sm accent" to="/collaborations/new">
                    + New
                  </Link>
                </div>
                {collabs.length === 0 && (
                  <div className="empty-state">No collaborations yet. Create one from the collabs page.</div>
                )}
                {collabs.slice(0, 3).map((collab) => (
                  <article className="collab-card" key={collab.id}>
                    <div className="collab-header">
                      <div className="avatar av-red">{avatarLetter}</div>
                      <div className="collab-author">
                        <div className="collab-author-name">{displayName} (You)</div>
                        <div className="collab-meta">{formatDateShort(collab.createdAt)}</div>
                      </div>
                      <div className="tags">
                        <span className="tag green">Active</span>
                      </div>
                    </div>
                    <div className="collab-title">{collab.title}</div>
                    {collab.description && <div className="collab-desc">{collab.description}</div>}
                    {collab.tags.length > 0 && (
                      <div className="tags">
                        {collab.tags.map((tag) => (
                          <span className="tag neutral" key={`${collab.id}-${tag}`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="collab-actions">
                      <Link className="btn-sm outline" to="/collaborations/new">
                        Edit Copy
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {user && !loading && activeTab === "activity" && (
            <>
              <div className="prof-sec-title">My Activity</div>
              {activityItems.length === 0 && (
                <div className="empty-state">
                  No activity yet. Create a collaboration or suggest an event.
                </div>
              )}
              {activityItems.map((item) => (
                <article className="collab-card" key={item.id}>
                  <div className="collab-header">
                    <div className="collab-author">
                      <div className="collab-author-name">{item.title}</div>
                      <div className="collab-meta">
                        {item.category} - {item.status}
                      </div>
                    </div>
                    <span className="event-date">{formatDateShort(item.date)}</span>
                  </div>
                  {item.message && <p className="collab-desc">{item.message}</p>}
                </article>
              ))}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
