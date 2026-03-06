# Theming Guidelines

## Source of Truth

- Repo-wide shared theme assets live in `/theme`.
- React consumes the shared contract through `src/styles/tokens.css`.
- Non-React surfaces load `/theme/index.css` and `/theme/theme.js` directly.

## Theme Contract

- Root theme state is expressed with `data-theme="light|dark"` on `<html>`.
- Store user choice as `ThemePreference = "system" | "light" | "dark"`.
- Resolve `system` using `prefers-color-scheme`.
- Persist the browser copy in `mdx-theme-preference`.

## Styling Rules

- Prefer semantic tokens such as `var(--bg)`, `var(--card)`, `var(--text)`, `var(--muted2)`, and `var(--red)`.
- Do not introduce new hard-coded palette values unless the value is content-specific, such as brand artwork or a QR code.
- Put reusable control styling in shared/theme-aware styles; keep view-only layout classes local to the view when practical.
- Respect reduced motion. Decorative animation must degrade cleanly under `prefers-reduced-motion`.

## Adding New UI

- Use `ThemePreferenceControl` for in-app theme selection instead of custom toggle markup.
- Build new screen chrome from existing shared primitives first: buttons, cards, inputs, badges, empty states, and topbars.
- Verify new UI in both light and dark modes, plus keyboard focus states.
