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
  compact?: boolean;
}

export default function ThemePreview({ className = "theme-showcase-grid", compact = false }: ThemePreviewProps) {
  return (
    <section className={className}>
      <article className={`theme-showcase-card theme-surface${compact ? " theme-showcase-card--compact" : ""}`}>
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

      <article className={`theme-showcase-card theme-surface${compact ? " theme-showcase-card--compact" : ""}`}>
        <h2 className="theme-showcase-card-title">Interactive States</h2>
        <div className={`theme-showcase-actions${compact ? " theme-showcase-actions--compact" : ""}`}>
          <button className="btn-primary" type="button">{compact ? "Primary btn" : "Primary action"}</button>
          <button className="btn-sm accent" type="button">{compact ? "Accent btn" : "Accent button"}</button>
          <button className="btn-sm outline" type="button">{compact ? "Outline btn" : "Outline button"}</button>
          <span className={`theme-chip${compact ? " theme-chip--compact" : ""}`}>{compact ? "Active" : "Active state"}</span>
        </div>
        <div className={`input-group theme-showcase-form${compact ? " theme-showcase-form--compact" : ""}`}>
          <label htmlFor="theme-preview-input">Input</label>
          <input id="theme-preview-input" type="text" placeholder="Check focus treatment" readOnly />
        </div>
      </article>
    </section>
  );
}
