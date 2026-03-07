import { useState } from "react";
import { getCustomThemeById } from "../services/theme.service";
import { useAuthStore } from "../stores/auth.store";
import { useThemeStore } from "../stores/theme.store";
import type { ThemePreference } from "../types/theme";

const BUILT_IN_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

interface ThemePreferenceControlProps {
  label?: string;
  meta?: boolean;
  compact?: boolean;
}

export default function ThemePreferenceControl({
  label = "Theme",
  meta = true,
  compact = false,
}: ThemePreferenceControlProps) {
  const preference = useThemeStore((state) => state.preference);
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const customThemes = useThemeStore((state) => state.customThemes);
  const activeCustomThemeId = useThemeStore((state) => state.activeCustomThemeId);
  const setPreference = useThemeStore((state) => state.setPreference);
  const selectCustomTheme = useThemeStore((state) => state.selectCustomTheme);
  const syncProfileTheme = useThemeStore((state) => state.syncProfileTheme);
  const user = useAuthStore((state) => state.user);
  const updateThemeSelection = useAuthStore((state) => state.updateThemeSelection);
  const [error, setError] = useState<string | null>(null);

  const activeCustomTheme = getCustomThemeById(customThemes, activeCustomThemeId);

  const handleBuiltInSelect = async (nextPreference: ThemePreference) => {
    if (!activeCustomThemeId && nextPreference === preference) return;

    const previousThemeState = {
      preference,
      customThemes,
      activeCustomThemeId,
    };

    setError(null);
    setPreference(nextPreference);

    if (!user) return;

    try {
      await updateThemeSelection({ themePreference: nextPreference, activeCustomThemeId: null });
    } catch (err) {
      syncProfileTheme(previousThemeState);
      setError(err instanceof Error ? err.message : "Failed to save your theme preference.");
    }
  };

  const handleCustomThemeSelect = async (customThemeId: string) => {
    if (activeCustomThemeId === customThemeId) return;

    const previousThemeState = {
      preference,
      customThemes,
      activeCustomThemeId,
    };

    setError(null);
    selectCustomTheme(customThemeId);

    if (!user) return;

    try {
      await updateThemeSelection({ activeCustomThemeId: customThemeId });
    } catch (err) {
      syncProfileTheme(previousThemeState);
      setError(err instanceof Error ? err.message : "Failed to switch themes.");
    }
  };

  return (
    <div className={`theme-toggle${compact ? " theme-toggle--compact" : ""}`}>
      <span className="theme-toggle__label">{label}</span>
      <div className="theme-toggle__group" role="group" aria-label={`${label} preference`}>
        {BUILT_IN_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`theme-toggle__button${!activeCustomThemeId && preference === option.value ? " is-active" : ""}`}
            aria-pressed={!activeCustomThemeId && preference === option.value}
            onClick={() => void handleBuiltInSelect(option.value)}
          >
            {option.label}
          </button>
        ))}
        {customThemes.map((customTheme) => (
          <button
            key={customTheme.id}
            type="button"
            className={`theme-toggle__button${activeCustomThemeId === customTheme.id ? " is-active" : ""}`}
            aria-pressed={activeCustomThemeId === customTheme.id}
            onClick={() => void handleCustomThemeSelect(customTheme.id)}
          >
            {customTheme.name}
          </button>
        ))}
      </div>
      {meta && (
        <span className="theme-toggle__meta">
          {activeCustomTheme
            ? `Using ${activeCustomTheme.name} • ${activeCustomTheme.baseTheme}`
            : preference === "system"
              ? `Following system • ${resolvedTheme}`
              : `Locked to ${resolvedTheme}`}
        </span>
      )}
      {!compact && error && <span className="theme-toggle__meta">{error}</span>}
    </div>
  );
}
