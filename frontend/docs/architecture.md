# Frontend Architecture

## Stack

- **React 19** with TypeScript (strict mode)
- **Vite** for dev server and production builds
- **React Router 7** — object-based `createBrowserRouter` API
- **Zustand 5** for client state management
- **Vitest 4** + Testing Library for testing
- **CSS Modules** + CSS custom properties for styling

## Folder Structure

```
src/
├── views/          Route-level screen components
├── components/     Reusable, mostly presentational UI components
├── hooks/          Reusable stateful/async hooks
├── stores/         Zustand stores and slices
├── services/       Backend/API access layer
├── utils/          Pure utility functions (no I/O side effects)
├── types/          Shared TypeScript types and domain contracts
├── styles/         Design tokens, global styles, theme files
├── test/           Test setup and shared test utilities
├── App.tsx         Centralized route configuration
└── main.tsx        App bootstrap and provider composition
```

## Routing

Routes are declared centrally in `App.tsx` using `createBrowserRouter` with object config.

- A root `Layout` route renders a shared header and `<Outlet />` for child views.
- Each route can define a `handle` object with metadata (`title`, `breadcrumb`) typed via `RouteHandle`.
- Route-level errors are caught by `RouteError` via `errorElement`.
- A catch-all `*` route renders `NotFound`.

To add a new route, add an entry to the `children` array in `App.tsx`.

## State Management

Zustand stores live in `src/stores/` with the naming convention `<domain>.store.ts`.

- `ui.store.ts` — UI state (sidebar, modals, etc.)
- Add new stores per domain (e.g. `auth.store.ts`, `data.store.ts`).
- Use selectors (`useStore(s => s.field)`) to minimize rerenders.
- Keep mutations inside store actions, not in components.

## Service Layer

`src/services/api.ts` provides a typed fetch wrapper with `get`, `post`, `put`, `delete` methods.

- Base URL is read from `VITE_API_URL` env var, defaults to `/api`.
- Create domain-specific service modules (e.g. `user.service.ts`) that use the `api` helper.
- Keep all backend SDK/fetch calls inside services only.

## Error Handling

Two layers of error handling are in place:

1. **Global ErrorBoundary** — class component wrapping the entire app in `main.tsx`, catches render/runtime crashes.
2. **RouteError** — attached via `errorElement` on the root route, catches navigation and loader errors.

Services should use try/catch and map errors to user-friendly messages.

## Styling

- Repo-wide theme tokens/base/components live in `/theme`.
- `styles/tokens.css` bridges the React app onto the shared repo theme contract.
- `styles/global.css` + smaller companion stylesheets handle app layout and legacy view styling.
- Theme state is applied via `data-theme` on `<html>` and persisted as `mdx-theme-preference`.
- Prefer semantic CSS custom properties (`var(--bg)`, `var(--card)`, `var(--text)`, `var(--red)`) instead of hard-coded colors.
- Contributor guidance lives in `../../docs/themes/README.md`.

## Testing

Vitest is configured with:

- `jsdom` environment
- `@testing-library/jest-dom` matchers (auto-imported via setup file)
- Global test APIs (`describe`, `it`, `expect`) enabled

Place test files alongside source as `<name>.test.ts` or `<name>.test.tsx`.

## Scripts

| Command              | Description                    |
|----------------------|--------------------------------|
| `npm run dev`        | Start Vite dev server          |
| `npm run build`      | Type-check and production build|
| `npm run lint`       | Run ESLint                     |
| `npm run test`       | Run tests once                 |
| `npm run test:watch` | Run tests in watch mode        |
| `npm run test:coverage` | Run tests with coverage     |

## Adding a New Feature

1. Define types in `src/types/`.
2. Create a service in `src/services/` for any API calls.
3. Create a Zustand store in `src/stores/` if client state is needed.
4. Build the view in `src/views/` and add a route entry in `App.tsx`.
5. Extract reusable pieces into `src/components/` and `src/hooks/`.
