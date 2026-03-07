import { Link } from "react-router-dom";
import ThemeEditor from "../components/ThemeEditor";
import ThemePreferenceControl from "../components/ThemePreferenceControl";
import { useAuthStore } from "../stores/auth.store";

export default function Appearance() {
  const { user, loading } = useAuthStore();

  return (
    <div className="page-view theme-showcase-page">
      <div className="topbar">
        <div className="topbar-title">
          <span>Appearance</span>
        </div>
      </div>

      <div className="theme-showcase-shell">
        {loading && <div className="empty-state">Loading your appearance settings...</div>}

        {!loading && !user && (
          <section className="theme-showcase-hero theme-surface">
            <div>
              <p className="theme-showcase-kicker">Account Required</p>
              <h1 className="theme-section-title">Sign in to manage your saved themes</h1>
              <p className="theme-showcase-copy">
                Built-in theme switching is still available from the quick theme controls. Sign in to
                save and edit named presets here.
              </p>
            </div>
            <div className="theme-showcase-actions">
              <Link className="btn-primary" to="/login">
                Sign In
              </Link>
            </div>
          </section>
        )}

        {!loading && user && (
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
      </div>
    </div>
  );
}
