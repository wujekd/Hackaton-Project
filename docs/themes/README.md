# Theme System

## Overview

This repo uses a shared theming system for all user-facing surfaces:

- `frontend` React app
- `dashboard_screen` standalone dashboard
- `collab-ai` static chat page

The shared source of truth lives in `/theme`. Every surface consumes the same tokens, base rules, and theme bootstrap behavior.

## Goals

- Keep one consistent brand across the repo.
- Support `system`, `light`, and `dark` preferences.
- Apply the resolved theme through `data-theme="light|dark"` on `<html>`.
- Persist browser preference with `mdx-theme-preference`.
- Respect `prefers-reduced-motion`.

## File Map

- `/theme/tokens.css`
  Semantic tokens, typography, spacing, radii, shadows, and light/dark theme values.
- `/theme/base.css`
  Base element rules, global focus treatment, reduced-motion behavior, and cross-theme transition behavior.
- `/theme/components.css`
  Shared theme-level UI primitives such as the theme toggle.
- `/theme/index.css`
  Aggregates the shared theme styles.
- `/theme/theme.js`
  Static-page bootstrap that resolves and applies the theme before paint.

React-specific wiring:

- `/frontend/src/services/theme.service.ts`
  Theme resolution and DOM application helpers.
- `/frontend/src/stores/theme.store.ts`
  Zustand store for hydration, preference changes, and profile sync.
- `/frontend/src/components/ThemePreferenceControl.tsx`
  Shared in-app theme selector.

## Theme Contract

### Preference model

- `ThemePreference = "system" | "light" | "dark"`
- `ResolvedTheme = "light" | "dark"`

Resolution order:

1. Signed-in user profile preference
2. Local storage value
3. `system`
4. `prefers-color-scheme`

### DOM contract

- The active theme is written to `document.documentElement.dataset.theme`.
- `document.documentElement.style.colorScheme` is kept in sync.
- Temporary theme transition smoothing uses the `theme-transitioning` class on `<html>`.

### Storage

- Local storage key: `mdx-theme-preference`

## Token Usage

Prefer semantic tokens instead of raw color literals.

Common tokens:

- `var(--bg)` for page background
- `var(--bg2)` for secondary surface backgrounds
- `var(--card)` for elevated cards/panels
- `var(--text)` for primary text
- `var(--muted)` / `var(--muted2)` for secondary text
- `var(--red)` / `var(--red-strong)` for brand accent actions
- `var(--border)` / `var(--border2)` for separators and stronger borders
- `var(--success)`, `var(--color-warning)`, `var(--color-danger)` for status UI

Rules:

- Do not add hard-coded palette colors for normal UI states.
- Only use literal colors when the content itself requires it, such as QR graphics or third-party brand marks.
- Reuse semantic status tokens for error, warning, and success messaging.

## Implementation Rules

### React app

- Import shared theme tokens through `/frontend/src/styles/tokens.css`.
- Use `ThemePreferenceControl` instead of building custom toggles.
- Keep reusable theme-aware UI in shared styles/components.
- Keep page-specific layout rules local when possible.

### Static pages

- Load `/theme/theme.js` before CSS-dependent rendering.
- Load `/theme/index.css` before page-specific styles.
- Use the same `data-theme-option` buttons when offering manual switching.

## Motion and Theme Transitions

- Theme changes animate through the shared `theme-transitioning` class.
- Backgrounds, text, borders, shadows, fills, strokes, and backdrop filters should transition smoothly together.
- Reduced-motion users should not receive decorative theme transitions.

When adding new components:

- Avoid one-off transition timings unless there is a clear reason.
- Prefer shared motion variables such as `--motion-fast`, `--motion-base`, `--motion-slow`, and `--motion-theme`.

## QA Checklist

- Verify both light and dark themes.
- Verify `system` mode responds correctly to OS preference.
- Verify keyboard focus remains visible in both themes.
- Verify reduced-motion mode removes decorative transitions.
- Verify no obvious theme flash on initial load.
- Verify static pages and the React app stay visually aligned.

## Tests

Current automated coverage includes:

- theme store hydration and local persistence
- signed-in profile preference overriding local state
- theme switching from the shell/mobile controls and My Account
- internal theme showcase rendering
- shared bootstrap behavior for static surfaces
