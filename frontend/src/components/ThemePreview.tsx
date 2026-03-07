const SWATCHES = [
  { label: "Canvas", value: "var(--bg)" },
  { label: "Surface", value: "var(--bg2)" },
  { label: "Card", value: "var(--card)" },
  { label: "Accent", value: "var(--red)" },
  { label: "Success", value: "var(--success)" },
  { label: "Danger", value: "var(--danger)" },
];

interface ThemePreviewProps {
  className?: string;
}

export default function ThemePreview({ className = "theme-showcase-grid" }: ThemePreviewProps) {
  return (
    <section className={className}>
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
          <label htmlFor="theme-preview-input">Input</label>
          <input id="theme-preview-input" type="text" placeholder="Check focus treatment" readOnly />
        </div>
      </article>
    </section>
  );
}
