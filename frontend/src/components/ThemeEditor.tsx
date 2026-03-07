import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  applyCustomTheme,
  applyResolvedTheme,
  cloneThemePalette,
  createCustomThemeId,
  createDefaultThemePalette,
  getCustomThemeById,
  normalizeHexColor,
  normalizeThemeName,
} from "../services/theme.service";
import { useAuthStore } from "../stores/auth.store";
import { useThemeStore } from "../stores/theme.store";
import type { CustomTheme, ResolvedTheme, ThemePalette, ThemePaletteSlot } from "../types/theme";
import { THEME_PALETTE_SLOTS } from "../types/theme";
import ThemePreview from "./ThemePreview";

interface ThemeDraft {
  id: string | null;
  name: string;
  baseTheme: ResolvedTheme;
  palette: ThemePalette;
}

const FIELD_META: Array<{ slot: ThemePaletteSlot; label: string; hint: string }> = [
  { slot: "canvas", label: "Canvas", hint: "Page background" },
  { slot: "surface", label: "Surface", hint: "Panels and chrome" },
  { slot: "card", label: "Card", hint: "Raised surfaces" },
  { slot: "text", label: "Text", hint: "Primary copy" },
  { slot: "mutedText", label: "Muted text", hint: "Secondary copy" },
  { slot: "accent", label: "Accent", hint: "Primary actions" },
  { slot: "success", label: "Success", hint: "Positive states" },
  { slot: "warning", label: "Warning", hint: "Caution states" },
  { slot: "danger", label: "Danger", hint: "Error states" },
];

function createBlankDraft(baseTheme: ResolvedTheme): ThemeDraft {
  return {
    id: null,
    name: "",
    baseTheme,
    palette: createDefaultThemePalette(baseTheme),
  };
}

function createDraftFromTheme(customTheme: CustomTheme | null, fallbackBaseTheme: ResolvedTheme): ThemeDraft {
  if (!customTheme) {
    return createBlankDraft(fallbackBaseTheme);
  }

  return {
    id: customTheme.id,
    name: customTheme.name,
    baseTheme: customTheme.baseTheme,
    palette: cloneThemePalette(customTheme.palette),
  };
}

function serializeDraft(draft: ThemeDraft): string {
  return JSON.stringify(draft);
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function getRelativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrastRatio(a: string, b: string): number {
  const luminanceA = getRelativeLuminance(a);
  const luminanceB = getRelativeLuminance(b);
  const light = Math.max(luminanceA, luminanceB);
  const dark = Math.min(luminanceA, luminanceB);
  return (light + 0.05) / (dark + 0.05);
}

function buildContrastWarnings(draft: ThemeDraft): string[] {
  const warnings: string[] = [];

  if (getContrastRatio(draft.palette.text, draft.palette.canvas) < 4.5) {
    warnings.push("Primary text is getting too close to the canvas color.");
  }

  if (getContrastRatio(draft.palette.mutedText, draft.palette.surface) < 3) {
    warnings.push("Muted text may be hard to read on surfaces.");
  }

  if (getContrastRatio("#FFFFFF", draft.palette.accent) < 3) {
    warnings.push("Accent buttons may lose contrast with white button text.");
  }

  return warnings;
}

function buildPreviewStyle(draft: ThemeDraft): CSSProperties {
  const previewStyle: Record<string, string> = {};

  for (const slot of THEME_PALETTE_SLOTS) {
    previewStyle[`--theme-${draft.baseTheme}-${slot}-override`] = draft.palette[slot];
  }

  return previewStyle as CSSProperties;
}

interface ThemeEditorProps {
  compact?: boolean;
}

export default function ThemeEditor({ compact = false }: ThemeEditorProps) {
  const user = useAuthStore((state) => state.user);
  const preference = useThemeStore((state) => state.preference);
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const customThemes = useThemeStore((state) => state.customThemes);
  const activeCustomThemeId = useThemeStore((state) => state.activeCustomThemeId);
  const sessionTheme = useThemeStore((state) => state.sessionTheme);
  const applySessionTheme = useThemeStore((state) => state.applySessionTheme);
  const updateCustomThemes = useAuthStore((state) => state.updateCustomThemes);
  const activeCustomTheme = useMemo(
    () => getCustomThemeById(customThemes, activeCustomThemeId),
    [customThemes, activeCustomThemeId],
  );
  const loadedDraft = useMemo(
    () => createDraftFromTheme(sessionTheme ?? activeCustomTheme, resolvedTheme),
    [activeCustomTheme, resolvedTheme, sessionTheme],
  );
  const [draft, setDraft] = useState<ThemeDraft>(loadedDraft);
  const [fieldValues, setFieldValues] = useState<Record<ThemePaletteSlot, string>>({ ...loadedDraft.palette });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionPopupVisible, setSessionPopupVisible] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const sessionPopupTimerRef = useRef<number | null>(null);
  const persistedThemeRef = useRef({
    activeCustomTheme,
    resolvedTheme,
    sessionTheme,
  });

  const loadedDraftSignature = serializeDraft(loadedDraft);
  const draftSignature = serializeDraft(draft);
  const invalidFieldCount = THEME_PALETTE_SLOTS.filter((slot) => !normalizeHexColor(fieldValues[slot])).length;
  const hasChanges = loadedDraftSignature !== draftSignature;
  const contrastWarnings = buildContrastWarnings(draft);
  const previewStyle = buildPreviewStyle(draft);

  useEffect(() => {
    persistedThemeRef.current = {
      activeCustomTheme,
      resolvedTheme,
      sessionTheme,
    };
  }, [activeCustomTheme, resolvedTheme, sessionTheme]);

  useEffect(() => {
    setDraft(loadedDraft);
    setFieldValues({ ...loadedDraft.palette });
    setError(null);
  }, [loadedDraft, loadedDraftSignature]);

  useLayoutEffect(() => {
    applyCustomTheme({
      baseTheme: draft.baseTheme,
      palette: draft.palette,
    });
    applyResolvedTheme(draft.baseTheme);
  }, [draft.baseTheme, draft.palette]);

  useLayoutEffect(() => {
    return () => {
      if (sessionPopupTimerRef.current !== null) {
        window.clearTimeout(sessionPopupTimerRef.current);
      }
      const { activeCustomTheme: persistedCustomTheme, resolvedTheme: persistedResolvedTheme, sessionTheme: persistedSessionTheme } =
        persistedThemeRef.current;
      applyCustomTheme(persistedSessionTheme ?? persistedCustomTheme);
      applyResolvedTheme(persistedSessionTheme?.baseTheme ?? persistedResolvedTheme);
    };
  }, []);

  const showSessionPopup = () => {
    setSessionPopupVisible(true);
    if (sessionPopupTimerRef.current !== null) {
      window.clearTimeout(sessionPopupTimerRef.current);
    }
    sessionPopupTimerRef.current = window.setTimeout(() => {
      setSessionPopupVisible(false);
      sessionPopupTimerRef.current = null;
    }, 2400);
  };

  const handlePaletteChange = (slot: ThemePaletteSlot, value: string) => {
    const normalized = normalizeHexColor(value);
    if (!normalized) return;

    setError(null);
    setFieldValues((current) => ({
      ...current,
      [slot]: normalized,
    }));
    setDraft((current) => ({
      ...current,
      palette: {
        ...current.palette,
        [slot]: normalized,
      },
    }));
  };

  const handleTextInput = (slot: ThemePaletteSlot, value: string) => {
    setError(null);
    setFieldValues((current) => ({
      ...current,
      [slot]: value,
    }));

    const normalized = normalizeHexColor(value);
    if (!normalized) return;

    setDraft((current) => ({
      ...current,
      palette: {
        ...current.palette,
        [slot]: normalized,
      },
    }));
  };

  const handleTextBlur = (slot: ThemePaletteSlot) => {
    const normalized = normalizeHexColor(fieldValues[slot]);
    const nextValue = normalized ?? draft.palette[slot];

    setFieldValues((current) => ({
      ...current,
      [slot]: nextValue,
    }));
  };

  const handleBaseThemeChange = (nextBaseTheme: ResolvedTheme) => {
    if (nextBaseTheme === draft.baseTheme) return;

    setError(null);
    const nextPalette = createDefaultThemePalette(nextBaseTheme);
    setDraft((current) => ({
      ...current,
      baseTheme: nextBaseTheme,
      palette: nextPalette,
    }));
    setFieldValues({ ...nextPalette });
  };

  const handleStartNew = () => {
    const nextDraft = createBlankDraft(resolvedTheme);
    setError(null);
    setDraft(nextDraft);
    setFieldValues({ ...nextDraft.palette });
  };

  const handleResetPalette = () => {
    const nextPalette = createDefaultThemePalette(draft.baseTheme);
    setError(null);
    setDraft((current) => ({
      ...current,
      palette: nextPalette,
    }));
    setFieldValues({ ...nextPalette });
  };

  const handleSave = async () => {
    if (saving || invalidFieldCount > 0 || !hasChanges) return;

    if (!user) {
      applySessionTheme({
        id: "session-theme",
        name: normalizeThemeName(draft.name) ?? "Session Theme",
        baseTheme: draft.baseTheme,
        palette: cloneThemePalette(draft.palette),
      });
      setError(null);
      showSessionPopup();
      return;
    }

    const normalizedName = normalizeThemeName(draft.name);
    if (!normalizedName) {
      setError("Name this theme before saving it.");
      nameInputRef.current?.focus();
      return;
    }

    if (
      customThemes.some(
        (customTheme) =>
          customTheme.id !== draft.id && customTheme.name.trim().toLowerCase() === normalizedName.toLowerCase(),
      )
    ) {
      setError("Choose a unique theme name.");
      nameInputRef.current?.focus();
      return;
    }

    const nextTheme: CustomTheme = {
      id: draft.id ?? createCustomThemeId(),
      name: normalizedName,
      baseTheme: draft.baseTheme,
      palette: cloneThemePalette(draft.palette),
    };
    const nextThemes = draft.id
      ? customThemes.map((customTheme) => (customTheme.id === draft.id ? nextTheme : customTheme))
      : [...customThemes, nextTheme];

    setSaving(true);
    setError(null);

    try {
      await updateCustomThemes(nextThemes, nextTheme.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save your theme.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (saving || !user || !draft.id) return;

    const nextThemes = customThemes.filter((customTheme) => customTheme.id !== draft.id);
    const nextActiveCustomThemeId = activeCustomThemeId === draft.id ? null : activeCustomThemeId;

    setSaving(true);
    setError(null);

    try {
      await updateCustomThemes(nextThemes, nextActiveCustomThemeId);
      const nextDraft = createBlankDraft(preference === "dark" ? "dark" : resolvedTheme);
      setDraft(nextDraft);
      setFieldValues({ ...nextDraft.palette });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete your theme.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={`theme-editor-shell${compact ? " theme-editor-shell--compact" : ""}`}>
      <div className={`theme-editor-header theme-surface${compact ? " theme-editor-header--compact" : ""}`}>
        <div>
          <p className="theme-showcase-kicker">Custom Theme</p>
          <div className="theme-editor-title-row">
            <h2 className="theme-section-title">Create named presets on top of Light or Dark</h2>
            <div className="theme-editor-secondary-actions">
              {user && draft.id && (
                <button
                  className="btn-sm outline theme-editor-delete-button"
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={saving}
                >
                  Delete theme
                </button>
              )}
              <button className="btn-sm outline" type="button" onClick={handleStartNew} disabled={saving}>
                New theme
              </button>
              <button className="btn-sm outline" type="button" onClick={handleResetPalette} disabled={saving}>
                Reset palette
              </button>
            </div>
          </div>
          <p className="theme-showcase-copy">
            {user
              ? "The built-in Light and Dark themes stay fixed. Custom themes are saved as named presets and appear next to them in the selector."
              : "Use the editor to apply page colors for this session. Sign in when you want to save the design as a named preset."}
          </p>
        </div>
        <div className="theme-editor-actions">
          <button
            className="btn-primary"
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || invalidFieldCount > 0 || !hasChanges}
          >
            {saving ? "Saving..." : user ? draft.id ? "Save changes" : "Save theme" : "Apply for this session"}
          </button>
        </div>
      </div>

      <div className={`theme-editor-layout${compact ? " theme-editor-layout--compact" : ""}`}>
        <section className={`theme-editor-panel theme-surface${compact ? " theme-editor-panel--compact" : ""}`}>
          {!user && sessionPopupVisible && (
            <div className="theme-editor-popup" role="status" aria-live="polite">
              You can use all color controls now. Sign in to save this design to your account.
            </div>
          )}
          <div className={`theme-editor-identity${compact ? " theme-editor-identity--compact" : ""}`}>
            <div className="form-group">
              <label htmlFor="theme-name-input">Theme name</label>
              <input
                ref={nameInputRef}
                id="theme-name-input"
                type="text"
                value={draft.name}
                onChange={(event) => {
                  setError(null);
                  setDraft((current) => ({ ...current, name: event.target.value }));
                }}
                maxLength={40}
                placeholder={user ? "e.g. Ocean Lab" : "Optional until you sign in"}
              />
            </div>
            <div className="prof-sec-title">
              Base Theme
              <div className="account-tab-group">
                {(["light", "dark"] as const).map((mode) => (
                  <button
                    key={mode}
                    className={`filter-pill ${draft.baseTheme === mode ? "active" : ""}`}
                    type="button"
                    onClick={() => handleBaseThemeChange(mode)}
                  >
                    {mode === "light" ? "Light" : "Dark"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={`theme-editor-grid${compact ? " theme-editor-grid--compact" : ""}`}>
            {FIELD_META.map((field) => {
              const value = fieldValues[field.slot];
              const invalid = !normalizeHexColor(value);

              return (
                <label
                  key={field.slot}
                  className={`theme-editor-field${compact ? " theme-editor-field--compact" : ""}${invalid ? " is-invalid" : ""}`}
                >
                  <span className="theme-editor-field-label">{field.label}</span>
                  <span className="theme-editor-field-hint">{field.hint}</span>
                  <div className="theme-editor-field-inputs">
                    <input
                      type="color"
                      value={draft.palette[field.slot]}
                      onChange={(event) => handlePaletteChange(field.slot, event.target.value)}
                      aria-label={`${field.label} color`}
                    />
                    <input
                      type="text"
                      value={value}
                      inputMode="text"
                      spellCheck={false}
                      onChange={(event) => handleTextInput(field.slot, event.target.value)}
                      onBlur={() => handleTextBlur(field.slot)}
                      placeholder="#RRGGBB"
                      aria-label={`${field.label} hex`}
                    />
                  </div>
                  {invalid && <span className="theme-editor-field-error">Use a 6-digit hex color.</span>}
                </label>
              );
            })}
          </div>

          {error && <div className="auth-error theme-editor-error">{error}</div>}
          {contrastWarnings.length > 0 && (
            <div className="theme-editor-warnings">
              {contrastWarnings.map((warning) => (
                <div className="auth-notice" key={warning}>
                  {warning}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={`theme-editor-preview${compact ? " theme-editor-preview--compact" : ""}`}>
          <div
            className={`theme-preview-root theme-editor-preview-surface${compact ? " theme-editor-preview-surface--compact" : ""}`}
            data-theme={draft.baseTheme}
            style={previewStyle}
          >
            <ThemePreview
              className={`theme-showcase-grid theme-editor-preview-grid${compact ? " theme-editor-preview-grid--compact" : ""}`}
              compact={compact}
            />
          </div>
        </section>
      </div>
    </section>
  );
}
