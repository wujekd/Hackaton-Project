import type { ResolvedTheme, ThemePreference } from "../types/theme";

export const THEME_STORAGE_KEY = "mdx-theme-preference";
const THEME_TRANSITION_CLASS = "theme-transitioning";
let themeTransitionTimer: number | null = null;

const VALID_PREFERENCES: ThemePreference[] = ["system", "light", "dark"];

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && VALID_PREFERENCES.includes(value as ThemePreference);
}

export function getSystemTheme(): ResolvedTheme {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === "system" ? getSystemTheme() : preference;
}

export function readStoredThemePreference(): ThemePreference | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeStoredThemePreference(preference: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Ignore storage failures and keep the in-memory state usable.
  }
}

function animateThemeChange(): void {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const root = document.documentElement;
  root.classList.add(THEME_TRANSITION_CLASS);
  if (themeTransitionTimer !== null) {
    window.clearTimeout(themeTransitionTimer);
  }
  themeTransitionTimer = window.setTimeout(() => {
    root.classList.remove(THEME_TRANSITION_CLASS);
    themeTransitionTimer = null;
  }, 420);
}

export function applyResolvedTheme(theme: ResolvedTheme, options?: { animate?: boolean }): void {
  if (options?.animate) {
    animateThemeChange();
  }
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function subscribeToSystemTheme(onChange: (theme: ResolvedTheme) => void): () => void {
  const query = window.matchMedia?.("(prefers-color-scheme: dark)");
  if (!query) return () => undefined;

  const listener = () => {
    onChange(query.matches ? "dark" : "light");
  };

  if (query.addEventListener) {
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }

  query.addListener(listener);
  return () => query.removeListener(listener);
}
