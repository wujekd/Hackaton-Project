import { useState } from "react";
import { useAuthStore } from "../stores/auth.store";
import { useThemeStore } from "../stores/theme.store";
import type { ThemePreference } from "../types/theme";

const OPTIONS: Array<{ value: ThemePreference; label: string }> = [
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
  const setPreference = useThemeStore((state) => state.setPreference);
  const user = useAuthStore((state) => state.user);
  const updateThemePreference = useAuthStore((state) => state.updateThemePreference);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async (nextPreference: ThemePreference) => {
    if (nextPreference === preference) return;

    const previousPreference = preference;
    setError(null);
    setPreference(nextPreference);

    if (!user) return;

    try {
      await updateThemePreference(nextPreference);
    } catch (err) {
      setPreference(previousPreference);
      setError(err instanceof Error ? err.message : "Failed to save your theme preference.");
    }
  };

  return (
    <div className={`theme-toggle${compact ? " theme-toggle--compact" : ""}`}>
      <span className="theme-toggle__label">{label}</span>
      <div className="theme-toggle__group" role="group" aria-label={`${label} preference`}>
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`theme-toggle__button${preference === option.value ? " is-active" : ""}`}
            aria-pressed={preference === option.value}
            onClick={() => void handleSelect(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {meta && (
        <span className="theme-toggle__meta">
          {preference === "system" ? `Following system • ${resolvedTheme}` : `Locked to ${resolvedTheme}`}
        </span>
      )}
      {!compact && error && <span className="theme-toggle__meta">{error}</span>}
    </div>
  );
}
