import ThemePreview from "../components/ThemePreview";
import ThemePreferenceControl from "../components/ThemePreferenceControl";

export default function ThemeShowcase() {
  return (
    <div className="page-view theme-showcase-page">
      <div className="topbar">
        <div className="topbar-title">
          <span>Theme Showcase</span>
        </div>
      </div>

      <div className="theme-showcase-shell">
        <section className="theme-showcase-hero theme-surface">
          <div>
            <p className="theme-showcase-kicker">Internal Reference</p>
            <h1 className="theme-section-title">Semantic tokens and shared primitives</h1>
            <p className="theme-showcase-copy">
              Use this screen to verify contrast, motion, spacing, and component states across light and
              dark modes before shipping UI changes.
            </p>
          </div>
          <ThemePreferenceControl label="Preview theme" />
        </section>

        <ThemePreview />
      </div>
    </div>
  );
}
