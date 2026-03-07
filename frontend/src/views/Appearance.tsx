import { Link } from "react-router-dom";
import ThemeEditor from "../components/ThemeEditor";
import ThemePreferenceControl from "../components/ThemePreferenceControl";
import { useAuthStore } from "../stores/auth.store";

export default function Appearance() {
  const { user, loading } = useAuthStore();

  return (
    <div className="page-view theme-showcase-page appearance-page">
      <div className="topbar">
        <div className="topbar-title">
          <span>Appearance</span>
        </div>
      </div>

      <div className="theme-showcase-shell">
        {loading && <div className="empty-state">Loading your appearance settings...</div>}

        {!loading && (
          <section className="account-appearance-section appearance-page__section">
            <div className="theme-editor-stack appearance-page__stack">
              {!user && (
                <section className="theme-surface appearance-page__guest-row">
                  <div className="appearance-page__guest-copy">
                    <p className="theme-showcase-kicker">Session Theme</p>
                    <p className="appearance-page__guest-inline-copy">
                      <span className="theme-section-title">Use the full appearance controls before logging in</span>
                      <span className="theme-showcase-copy">
                        Changes can be applied for this session right away. Sign in only when you want to
                        save the design to your account as a reusable preset.
                      </span>
                    </p>
                    <div className="theme-showcase-actions">
                      <Link className="btn-primary" to="/login">
                        Sign In to Save
                      </Link>
                    </div>
                  </div>
                  <div className="theme-surface profile-theme-settings appearance-page__settings appearance-page__settings--guest">
                    <div className="interest-label">Theme Mode</div>
                    <div className="profile-interest-note">
                      Choose a built-in theme or keep a session-only custom design active while you browse.
                    </div>
                    <ThemePreferenceControl label="Theme preference" compact />
                  </div>
                </section>
              )}
              {user && (
                <div className="theme-surface profile-theme-settings appearance-page__settings">
                  <div className="interest-label">Theme Mode</div>
                  <div className="profile-interest-note">
                    Choose one of the built-in themes or switch to a saved custom preset from the same row.
                  </div>
                  <ThemePreferenceControl label="Theme preference" compact />
                </div>
              )}
              <ThemeEditor compact />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
