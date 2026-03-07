import type {
  CustomTheme,
  ResolvedTheme,
  ThemePalette,
  ThemePaletteSlot,
  ThemePreference,
} from "../types/theme";
import { THEME_PALETTE_SLOTS } from "../types/theme";

type ThemeOverride = Pick<CustomTheme, "baseTheme" | "palette">;

export const THEME_STORAGE_KEY = "mdx-theme-preference";
export const CUSTOM_THEME_STORAGE_KEY = "mdx-theme-custom-v1";
export const ACTIVE_CUSTOM_THEME_STORAGE_KEY = "mdx-theme-custom-active";

const THEME_TRANSITION_CLASS = "theme-transitioning";
const VALID_PREFERENCES: ThemePreference[] = ["system", "light", "dark"];
const HEX_COLOR_PATTERN = /^#?[0-9a-fA-F]{6}$/;
const THEME_MODES: ResolvedTheme[] = ["light", "dark"];
const LEGACY_CUSTOM_THEME_IDS = {
  light: "legacy-custom-light",
  dark: "legacy-custom-dark",
} as const;

type LegacyCustomThemeConfig = {
  version: 1;
  light: ThemePalette;
  dark: ThemePalette;
};

const DEFAULT_THEME_PALETTES: Record<ResolvedTheme, ThemePalette> = {
  light: {
    canvas: "#F4F6FB",
    surface: "#FFFFFF",
    card: "#FFFFFF",
    text: "#121722",
    mutedText: "#586174",
    accent: "#C01639",
    success: "#087A59",
    warning: "#AB6B12",
    danger: "#C53F57",
  },
  dark: {
    canvas: "#0C0D10",
    surface: "#111318",
    card: "#1C1F27",
    text: "#F2F4FA",
    mutedText: "#B0B5D0",
    accent: "#D4002A",
    success: "#00BE82",
    warning: "#F0B44D",
    danger: "#FF5A72",
  },
};

let themeTransitionTimer: number | null = null;

export function createDefaultThemePalette(mode: ResolvedTheme): ThemePalette {
  return { ...DEFAULT_THEME_PALETTES[mode] };
}

export function cloneThemePalette(palette: ThemePalette): ThemePalette {
  return { ...palette };
}

export function cloneCustomTheme(customTheme: CustomTheme): CustomTheme {
  return {
    ...customTheme,
    palette: cloneThemePalette(customTheme.palette),
  };
}

export function cloneCustomThemes(customThemes: CustomTheme[]): CustomTheme[] {
  return customThemes.map(cloneCustomTheme);
}

function getRoot(): HTMLElement {
  return document.documentElement;
}

function getOverrideVariableName(mode: ResolvedTheme, slot: ThemePaletteSlot): string {
  return `--theme-${mode}-${slot}-override`;
}

export function createCustomThemeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `theme-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && VALID_PREFERENCES.includes(value as ThemePreference);
}

export function normalizeHexColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  if (!HEX_COLOR_PATTERN.test(candidate)) return null;
  const withHash = candidate.startsWith("#") ? candidate : `#${candidate}`;
  return withHash.toUpperCase();
}

export function normalizeThemeName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : null;
}

function normalizeThemePalette(value: unknown): ThemePalette | null {
  if (!value || typeof value !== "object") return null;

  const source = value as Record<ThemePaletteSlot, unknown>;
  const normalized = {} as ThemePalette;

  for (const slot of THEME_PALETTE_SLOTS) {
    const color = normalizeHexColor(source[slot]);
    if (!color) return null;
    normalized[slot] = color;
  }

  return normalized;
}

function normalizeCustomTheme(value: unknown): CustomTheme | null {
  if (!value || typeof value !== "object") return null;

  const source = value as {
    id?: unknown;
    name?: unknown;
    baseTheme?: unknown;
    palette?: unknown;
  };
  const name = normalizeThemeName(source.name);
  const palette = normalizeThemePalette(source.palette);

  if (typeof source.id !== "string" || !name || !palette) return null;
  if (source.baseTheme !== "light" && source.baseTheme !== "dark") return null;

  return {
    id: source.id,
    name,
    baseTheme: source.baseTheme,
    palette,
  };
}

function normalizeLegacyCustomTheme(value: unknown): LegacyCustomThemeConfig | null {
  if (!value || typeof value !== "object") return null;

  const source = value as { version?: unknown; light?: unknown; dark?: unknown };
  if (source.version !== 1) return null;

  const light = normalizeThemePalette(source.light);
  const dark = normalizeThemePalette(source.dark);

  if (!light || !dark) return null;

  return {
    version: 1,
    light,
    dark,
  };
}

export function normalizeCustomThemes(value: unknown): CustomTheme[] | null {
  if (Array.isArray(value)) {
    const normalized = value.map(normalizeCustomTheme);
    return normalized.every(Boolean) ? normalized as CustomTheme[] : null;
  }

  const legacy = normalizeLegacyCustomTheme(value);
  if (!legacy) return null;

  return [
    {
      id: LEGACY_CUSTOM_THEME_IDS.light,
      name: "Custom Light",
      baseTheme: "light",
      palette: legacy.light,
    },
    {
      id: LEGACY_CUSTOM_THEME_IDS.dark,
      name: "Custom Dark",
      baseTheme: "dark",
      palette: legacy.dark,
    },
  ];
}

export function getSystemTheme(): ResolvedTheme {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === "system" ? getSystemTheme() : preference;
}

export function getCustomThemeById(customThemes: CustomTheme[], customThemeId: string | null | undefined): CustomTheme | null {
  if (!customThemeId) return null;
  return customThemes.find((customTheme) => customTheme.id === customThemeId) ?? null;
}

export function sanitizeActiveCustomThemeId(customThemeId: string | null | undefined, customThemes: CustomTheme[]): string | null {
  return getCustomThemeById(customThemes, customThemeId)?.id ?? null;
}

export function resolveActiveTheme(
  preference: ThemePreference,
  customThemes: CustomTheme[],
  activeCustomThemeId: string | null | undefined,
): {
  activeCustomTheme: CustomTheme | null;
  activeCustomThemeId: string | null;
  resolvedTheme: ResolvedTheme;
} {
  const activeCustomTheme = getCustomThemeById(customThemes, activeCustomThemeId);

  return {
    activeCustomTheme,
    activeCustomThemeId: activeCustomTheme?.id ?? null,
    resolvedTheme: activeCustomTheme?.baseTheme ?? resolveTheme(preference),
  };
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

export function readStoredCustomThemes(): CustomTheme[] {
  try {
    const value = window.localStorage.getItem(CUSTOM_THEME_STORAGE_KEY);
    if (!value) return [];
    return normalizeCustomThemes(JSON.parse(value)) ?? [];
  } catch {
    return [];
  }
}

export function writeStoredCustomThemes(customThemes: CustomTheme[]): void {
  try {
    if (customThemes.length === 0) {
      window.localStorage.removeItem(CUSTOM_THEME_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(customThemes));
  } catch {
    // Ignore storage failures and keep the in-memory state usable.
  }
}

export function readStoredActiveCustomThemeId(): string | null {
  try {
    const value = window.localStorage.getItem(ACTIVE_CUSTOM_THEME_STORAGE_KEY);
    return typeof value === "string" && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export function writeStoredActiveCustomThemeId(customThemeId: string | null): void {
  try {
    if (!customThemeId) {
      window.localStorage.removeItem(ACTIVE_CUSTOM_THEME_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(ACTIVE_CUSTOM_THEME_STORAGE_KEY, customThemeId);
  } catch {
    // Ignore storage failures and keep the in-memory state usable.
  }
}

function animateThemeChange(): void {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const root = getRoot();
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

  const root = getRoot();
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

function clearCustomThemeOverrides(): void {
  const root = getRoot();

  for (const mode of THEME_MODES) {
    for (const slot of THEME_PALETTE_SLOTS) {
      root.style.removeProperty(getOverrideVariableName(mode, slot));
    }
  }
}

export function applyCustomTheme(customTheme: ThemeOverride | null): void {
  clearCustomThemeOverrides();
  if (!customTheme) return;

  const root = getRoot();
  for (const slot of THEME_PALETTE_SLOTS) {
    root.style.setProperty(getOverrideVariableName(customTheme.baseTheme, slot), customTheme.palette[slot]);
  }
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
