# Custom Theme Presets

## What This Covers

This document covers the named custom theme preset system.

- Built-in `Light` and `Dark` stay fixed and are never edited in place.
- Users can save additional named themes that sit alongside `System`, `Light`, and `Dark` in the theme selector.
- Each saved theme is anchored to one base mode: `light` or `dark`.

## User-Facing Behavior

- The selector always keeps the built-in options first: `System`, `Light`, `Dark`.
- Saved custom themes are rendered as additional buttons in the same selector row.
- Selecting a built-in option clears the active custom theme selection.
- Selecting a saved custom theme activates that preset without changing the stored built-in mode itself.
- Creating a new custom theme requires a unique name.

The editor does not modify the built-in palettes. Instead, it creates or updates a saved preset with:

- `name`
- `baseTheme`
- `palette`

## Data Model

Custom themes are stored as an array of presets.

```ts
type ThemePreference = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

interface ThemePalette {
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

interface CustomTheme {
  id: string;
  name: string;
  baseTheme: ResolvedTheme;
  palette: ThemePalette;
}
```

Important detail:

- `themePreference` still controls the built-in choice (`system`, `light`, `dark`).
- `activeCustomThemeId` points to the currently selected saved preset, if any.
- When `activeCustomThemeId` is set, the active preset's `baseTheme` determines the resolved mode.

## Where Themes Are Stored

### Firestore user document

For signed-in users, the source of truth is the user document in `users/<uid>`.

Relevant fields:

- `themePreference?: "system" | "light" | "dark"`
- `customThemes?: CustomTheme[]`
- `activeCustomThemeId?: string`

Example:

```json
{
  "themePreference": "light",
  "customThemes": [
    {
      "id": "ocean-lab",
      "name": "Ocean Lab",
      "baseTheme": "dark",
      "palette": {
        "canvas": "#0B1020",
        "surface": "#121A2E",
        "card": "#18233D",
        "text": "#F3F7FF",
        "mutedText": "#AEB9D6",
        "accent": "#2D7FF9",
        "success": "#18A874",
        "warning": "#D6931A",
        "danger": "#D94B63"
      }
    }
  ],
  "activeCustomThemeId": "ocean-lab"
}
```

### Browser local storage

The frontend mirrors the active theme data into local storage so non-React surfaces can apply the same theme immediately.

Keys:

- `mdx-theme-preference`
- `mdx-theme-custom-v1`
- `mdx-theme-custom-active`

Meaning:

- `mdx-theme-preference`: built-in selector value
- `mdx-theme-custom-v1`: serialized `CustomTheme[]`
- `mdx-theme-custom-active`: selected custom preset id

## Resolution Rules

Theme resolution works like this:

1. Read `themePreference`, `customThemes`, and `activeCustomThemeId`.
2. If `activeCustomThemeId` matches a saved preset, use that preset.
3. The preset's `baseTheme` becomes the resolved mode.
4. Only that preset's palette is applied as CSS variable overrides for its own base mode.
5. If no custom preset is active, fall back to the built-in `themePreference`.

This is why `Light` and `Dark` remain fixed:

- built-in palettes are still the defaults
- a custom theme only overrides CSS variables when its own preset is active
- switching back to `Light` or `Dark` clears the active preset selection

## Runtime Notes

- The React app hydrates from local storage first, then syncs from the signed-in profile.
- The static runtime in `/theme/theme.js` reads the same local storage keys.
- That keeps `frontend`, `dashboard_screen`, and `collab-ai` visually aligned.

There is also a legacy migration path:

- older single-object custom theme data is normalized into two saved presets
- those migrated ids are `legacy-custom-light` and `legacy-custom-dark`

## Relevant Files

- `/Users/alex/Documents/Hackaton-Project copy/frontend/src/components/ThemePreferenceControl.tsx`
- `/Users/alex/Documents/Hackaton-Project copy/frontend/src/components/ThemeEditor.tsx`
- `/Users/alex/Documents/Hackaton-Project copy/frontend/src/services/theme.service.ts`
- `/Users/alex/Documents/Hackaton-Project copy/frontend/src/stores/theme.store.ts`
- `/Users/alex/Documents/Hackaton-Project copy/frontend/src/services/auth.service.ts`
- `/Users/alex/Documents/Hackaton-Project copy/theme/theme.js`
