export type ThemePreference = "system" | "light" | "dark";

export type ResolvedTheme = "light" | "dark";

export const THEME_PALETTE_SLOTS = [
  "canvas",
  "surface",
  "card",
  "text",
  "mutedText",
  "accent",
  "success",
  "warning",
  "danger",
] as const;

export type ThemePaletteSlot = (typeof THEME_PALETTE_SLOTS)[number];

export interface ThemePalette {
  canvas: string;
  surface: string;
  card: string;
  text: string;
  mutedText: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
}

export interface CustomTheme {
  id: string;
  name: string;
  baseTheme: ResolvedTheme;
  palette: ThemePalette;
}
