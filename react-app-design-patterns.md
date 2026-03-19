# React App Design Patterns (Reusable Blueprint)

This document captures general architecture and implementation patterns to replicate in a new React application.

## 1) Core Stack Pattern

- React + TypeScript
- Vite for build/dev server
- React Router `createBrowserRouter` (object-based Data Router API)
- Zustand for client state
- Service layer for API/backend access
- Vitest + Testing Library for test coverage

## 2) Folder Organization Pattern

Use feature/domain-oriented folders with clear responsibility boundaries:

- `src/views`: route-level screens
- `src/components`: reusable UI blocks
- `src/hooks`: reusable side-effect and data-loading hooks
- `src/stores`: Zustand stores/slices (state + actions)
- `src/services`: backend/data access layer only
- `src/utils`: pure utility logic (no I/O side effects)
- `src/types`: domain and shared TypeScript types
- `src/styles`: design tokens, global styles, and theme files

## 3) Routing Pattern

- Use object route config via `createBrowserRouter`.
- Define a layout route with `element` + `<Outlet />`.
- Add `errorElement` for route-level crash handling.
- Use wrapper route components for auth/role guards.
- Use route `handle` metadata for page title, breadcrumbs, and header actions.
- Keep route declarations centralized in `App.tsx`.

## 4) State Management Pattern

- Use Zustand with either:
  - one composed store split into logical slices, or
  - multiple focused stores (UI, auth, audio/playback, domain data).
- Keep state mutations in store actions, not in components.
- Use selectors (`store(s => s.x)`) to minimize rerenders.
- Store tracks:
  - entity data,
  - loading/error state,
  - optimistic/pending action flags.

## 5) Service Layer Pattern

- Create one service module per domain (`XService`).
- Expose static async methods for use by stores/views.
- Keep backend SDK calls inside services only.
- Add service composition modules for multi-source fetches.
- Prefer server-authoritative operations for critical business writes.

## 6) Provider Composition Pattern

Compose global concerns at app bootstrap:

- Global error boundary
- Auth/session initializer
- Imperative engine/provider wrappers (if needed)
- App root/router provider

This keeps initialization logic outside route screens.

## 7) Component and Hook Pattern

- Views are orchestration layers (load data, wire handlers, render sections).
- Components are focused and mostly presentational.
- Hooks encapsulate reusable async/stateful behavior (loaders, redirects, prefetch).
- Use effect cleanup flags/unsubscribe patterns to avoid stale updates.

## 8) Type and Contract Pattern

- Define shared domain contracts in `src/types`.
- Type service/store return values explicitly.
- Keep backend payload/DTO shape mapping near the service boundary.
- Avoid `any` in new code unless unavoidable at third-party boundaries.

## 9) Error and Resilience Pattern

- Global React error boundary for render/runtime crashes.
- Router `errorElement` for navigation/loader errors.
- Service/store try/catch with friendly error mapping.
- Fallback strategies for expected backend/index/query failures.

## 10) Styling and Theming Pattern

- Global CSS entry imports token + utility + layout layers.
- Use CSS custom properties (`--token`) as design system primitives.
- Keep theme overrides in dedicated theme files.
- Use CSS Modules for view-scoped styles.
- Use shared class-based utility styles for common layout patterns.

## 11) Testing Pattern

- Split tests into:
  - `unit`: pure utils, stores, components (mock services)
  - `integration`: backend emulator or test backend environment
- Configure test setup file for DOM/audio/browser mocks.
- Keep integration tests deterministic (sequential when shared state exists).
- Test store actions directly where possible for fast feedback.

## 12) Build and Quality Pattern

- Scripts for `dev`, `build`, `lint`, `test`, `test:coverage`.
- Separate integration test config from unit config.
- Use strict TypeScript compile in build pipeline.
- Enforce React hooks and TS lint rules.

## 13) Initial Paint and Performance Pattern

- Keep the first paint path intentionally small:
  - render a lightweight branded HTML boot shell in `index.html`,
  - avoid mounting non-critical imperative systems at the root if they are not needed for first paint.
- Use lazy route loading for heavier screens and prefetch likely next routes during idle time.
- Split large dependency groups into stable build chunks (for example React/runtime, Firebase/backend SDKs, state libraries).
- Defer secondary systems rather than primary content:
  - load dashboard/content first,
  - start audio/imperative engines shortly after first paint or on interaction,
  - keep dedicated playback routes eager where audio is essential to correctness.
- For dashboard-style pages, prefer sidecar bootstrapping for non-visual systems so visible lists and panels do not remount when a deferred subsystem comes online.
- Gate prefetch work behind simple readiness flags:
  - auth settled,
  - primary data loaded,
  - required engine available (only when truly needed),
  - connection is not obviously constrained.
- Scale prefetch intensity by connection quality or `saveData`:
  - fetch fewer candidates on slower links,
  - skip aggressive media warmup on constrained connections.
- Use perceived-performance helpers that do not distort layout:
  - static boot shell,
  - short content fade-in,
  - stable placeholders that are replaced once, not repeatedly.
- Avoid mount-time animation resets on live data widgets (for example progress bars) when replacing placeholders; initialize to the current value and animate only subsequent updates.
- When navigating between related views, reuse already-loaded store data before showing loading spinners again.

## 14) New App Bootstrap Checklist

1. Create folder structure above.
2. Set up router with layout route, guard wrappers, and route metadata.
3. Add `services`, `stores`, and `types` before implementing screens.
4. Add global error boundaries and bootstrap providers in `main.tsx`.
5. Define design tokens and theme files before component styling.
6. Add unit/integration test configs early and keep both running in CI.
