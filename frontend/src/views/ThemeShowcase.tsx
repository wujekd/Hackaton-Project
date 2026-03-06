import ThemePreferenceControl from "../components/ThemePreferenceControl";

const SWATCHES = [
  { label: "Canvas", value: "var(--bg)" },
  { label: "Surface", value: "var(--bg2)" },
  { label: "Card", value: "var(--card)" },
  { label: "Accent", value: "var(--red)" },
  { label: "Border", value: "var(--border)" },
  { label: "Success", value: "var(--success)" },
];

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

        <section className="theme-showcase-grid">
          <article className="theme-showcase-card theme-surface">
            <h2 className="theme-showcase-card-title">Color Tokens</h2>
            <div className="theme-showcase-swatches">
              {SWATCHES.map((swatch) => (
                <div key={swatch.label} className="theme-showcase-swatch">
                  <span className="theme-showcase-swatch-chip" style={{ background: swatch.value }} />
                  <div>
                    <strong>{swatch.label}</strong>
                    <div className="theme-showcase-copy">{swatch.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="theme-showcase-card theme-surface">
            <h2 className="theme-showcase-card-title">Interactive States</h2>
            <div className="theme-showcase-actions">
              <button className="btn-primary" type="button">Primary action</button>
              <button className="btn-sm accent" type="button">Accent button</button>
              <button className="btn-sm outline" type="button">Outline button</button>
              <span className="theme-chip">Active state</span>
            </div>
            <div className="input-group theme-showcase-form">
              <label htmlFor="theme-showcase-input">Input</label>
              <input id="theme-showcase-input" type="text" placeholder="Check focus treatment" />
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
