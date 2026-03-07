import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CollabListItem from "../components/CollabListItem";
import TagInput from "../components/TagInput";
import { CollaborationService } from "../services/collaboration.service";
import { EventService } from "../services/event.service";
import { useAuthStore } from "../stores/auth.store";
import ThemeEditor from "../components/ThemeEditor";
import ThemePreferenceControl from "../components/ThemePreferenceControl";
import type { Collaboration } from "../types/collaboration";
import type { EventProposal } from "../types/event";
import { formatDateShort, toDate } from "../utils/date";

type AccountTab = "profile" | "activity" | "appearance";
const MAX_PROFILE_DESCRIPTION = 220;
const MAX_NICKNAME_LENGTH = 40;

function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return email;
  return `${email[0]}${"*".repeat(Math.max(1, at - 1))}${email.slice(at)}`;
}

export default function MyAccount() {
  const navigate = useNavigate();
  const { user, profile, updateProfileInterests, updateProfileDescription, updateProfileNickname } =
    useAuthStore();
  const [activeTab, setActiveTab] = useState<AccountTab>("profile");
  const [showFullEmail, setShowFullEmail] = useState(false);
  const [collabs, setCollabs] = useState<Collaboration[]>([]);
  const [proposals, setProposals] = useState<EventProposal[]>([]);
  const [loading, setLoading] = useState(!!user);
  const [error, setError] = useState<string | null>(null);
  const [interestSaving, setInterestSaving] = useState(false);
  const [interestError, setInterestError] = useState<string | null>(null);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [descriptionSaving, setDescriptionSaving] = useState(false);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  const profileNickname = (profile?.nickname ?? "").trim();
  const displayName = profileNickname || profile?.username || user?.email?.split("@")[0] || "Guest";
  const avatarLetter = displayName.trim().slice(0, 2).toUpperCase() || "G";
  const memberSince = formatDateShort(profile?.createdAt);
  const emailLabel = user?.email ? (showFullEmail ? user.email : maskEmail(user.email)) : "Not signed in";
  const interests = profile?.interests ?? [];
  const profileDescription = (profile?.description ?? "").trim();
  const isNicknameDirty = nicknameDraft.trim() !== profileNickname;
  const isDescriptionDirty = descriptionDraft.trim() !== profileDescription;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNicknameDraft(profile?.nickname ?? "");
  }, [profile?.nickname]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDescriptionDraft(profile?.description ?? "");
  }, [profile?.description]);

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

  const handleNicknameSave = () => {
    if (!user || !isNicknameDirty) return;
    setNicknameError(null);
    setNicknameSaving(true);
    void updateProfileNickname(nicknameDraft.trim())
      .catch((err: unknown) => {
        setNicknameError(err instanceof Error ? err.message : "Failed to save nickname.");
      })
      .finally(() => setNicknameSaving(false));
  };

  const handleDescriptionSave = () => {
    if (!user || !isDescriptionDirty) return;
    setDescriptionError(null);
    setDescriptionSaving(true);
    void updateProfileDescription(descriptionDraft.trim())
      .catch((err: unknown) => {
        setDescriptionError(err instanceof Error ? err.message : "Failed to save description.");
      })
      .finally(() => setDescriptionSaving(false));
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
              {profileDescription ||
                "Add a short profile description so collaborators know your focus and interests."}
            </div>
            <div className="profile-member-since">Member since {memberSince}</div>
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
          <div className="profile-nickname-editor form-group">
            <label htmlFor="profile-nickname-input">Nickname</label>
            <input
              id="profile-nickname-input"
              className="input"
              type="text"
              value={nicknameDraft}
              onChange={(e) => setNicknameDraft(e.target.value)}
              maxLength={MAX_NICKNAME_LENGTH}
              placeholder="Set a nickname shown instead of your name."
              disabled={!user || nicknameSaving}
            />
            <div className="profile-description-actions">
              <span className="profile-description-count">
                {nicknameDraft.length}/{MAX_NICKNAME_LENGTH}
              </span>
              <button
                className="btn-sm outline"
                type="button"
                onClick={handleNicknameSave}
                disabled={!user || nicknameSaving || !isNicknameDirty}
              >
                {nicknameSaving ? "Saving..." : "Save Nickname"}
              </button>
            </div>
          </div>
          {nicknameError && <div className="tag-input__error">{nicknameError}</div>}
          <div className="profile-description-editor form-group">
            <label htmlFor="profile-description-input">Profile Description</label>
            <textarea
              id="profile-description-input"
              className="profile-description-input"
              value={descriptionDraft}
              onChange={(e) => setDescriptionDraft(e.target.value)}
              maxLength={MAX_PROFILE_DESCRIPTION}
              placeholder="Tell others what you build, what you're looking for, and how to collaborate with you."
              disabled={!user || descriptionSaving}
            />
            <div className="profile-description-actions">
              <span className="profile-description-count">
                {descriptionDraft.length}/{MAX_PROFILE_DESCRIPTION}
              </span>
              <button
                className="btn-sm outline"
                type="button"
                onClick={handleDescriptionSave}
                disabled={!user || descriptionSaving || !isDescriptionDirty}
              >
                {descriptionSaving ? "Saving..." : "Save Description"}
              </button>
            </div>
          </div>
          {descriptionError && <div className="tag-input__error">{descriptionError}</div>}
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
              <button
                className={`filter-pill ${activeTab === "appearance" ? "active" : ""}`}
                type="button"
                onClick={() => setActiveTab("appearance")}
              >
                Appearance
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
                  <CollabListItem
                    key={collab.id}
                    collab={collab}
                    meta={formatDateShort(collab.createdAt)}
                    topRight={
                      <div className="tags">
                        <span className="tag green">Active</span>
                      </div>
                    }
                    footerTags={collab.tags}
                    actions={
                      <div className="collab-actions">
                        <Link className="btn-sm outline" to={`/collaborations/${collab.id}/edit`}>
                          Edit
                        </Link>
                      </div>
                    }
                  />
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

          {user && !loading && activeTab === "appearance" && (
            <section className="account-appearance-section">
              <div className="theme-editor-stack">
                <div className="theme-surface profile-theme-settings">
                  <div className="interest-label">Theme Mode</div>
                  <div className="profile-interest-note">
                    Choose one of the built-in themes or switch to a saved custom preset from the same row.
                  </div>
                  <ThemePreferenceControl label="Theme preference" />
                </div>
                <ThemeEditor />
              </div>
            </section>
          )}
        </section>
      </div>
    </div>
  );
}
