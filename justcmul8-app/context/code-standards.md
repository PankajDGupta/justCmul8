# Code Standards

## General

- Keep modules small and single-purpose. A file that exports one thing is
  preferable to a barrel that exports twenty.
- Fix root causes; do not layer workarounds. If a state bug exists, fix the
  state ownership — do not add `useEffect` guards to compensate.
- Do not mix unrelated concerns in one component or route. The simulation
  engine, the canvas, and the properties panel are separate concerns.

## TypeScript

- Strict mode is required throughout the project (`tsconfig.json` sets
  `"strict": true`).
- Avoid `any`. Use explicit interfaces, narrow union types, or `unknown` with
  a type guard. The only accepted use of `any` is the `params: any` field on
  `SimNode` (documented in `types.ts`).
- Validate unknown external input (e.g. Pyodide `postMessage` payloads,
  Supabase query results) at system boundaries before trusting it.
- Use the shared types from `src/lib/simulation/types.ts` for all graph/engine
  data structures — do not redefine them locally.

## Next.js (App Router)

- Default to React Server Components. Add `'use client'` only when browser
  interactivity (state, effects, event handlers) requires it.
- Keep route handlers in `src/app/api/` focused on a single responsibility.
- Do not run long-lived or blocking work inside route handlers (invariant from
  `architecture.md`).
- Use the Supabase server client from `src/lib/supabase/server.ts` in Server
  Components and route handlers; use the browser client from
  `src/lib/supabase/client.ts` in Client Components.

## Styling

- Use CSS custom property tokens defined in `src/app/globals.css` — no
  hardcoded hex values in component files.
- For one-off layout/spacing, Tailwind utility classes are acceptable. For
  reusable visual patterns (glow, glass panel, notched card), use the
  named CSS classes already defined in `globals.css`.
- Follow the border-radius scale: `6px` for inline/input elements, `8px` for
  panels and cards, `12px` for modals/overlays.
- Animations must use `@keyframes` defined in `globals.css`; do not inline
  `animation` properties with novel keyframe names in component files.

## API Routes

- Validate and parse request input before any logic runs (use `zod` or
  manual narrowing).
- Enforce auth and ownership before any mutation (check Supabase session).
- Return consistent, predictable response shapes: `{ data, error }`.

## Data and Storage

- Simulation graph metadata belongs in Supabase (project name, owner, updated
  timestamp).
- The full `SimGraph` JSON blob belongs in a dedicated Supabase column or
  table — not inlined into the URL or localStorage.
- Do not store large generated Python scripts in the database; they are
  computed at runtime by `codeGenerator.ts`.

## File Organisation

- `src/app/` — App Router pages, layouts, and API routes.
- `src/components/landing/` — Landing-page-only components.
- `src/components/workspace/` — Dashboard and simulation workspace components
  (NodeCanvas, NodePalette, NodePropertiesPanel, SimResultsPanel, AIChatPanel).
- `src/components/layout/` — Shared layout components (Navbar, Footer).
- `src/components/ui/` — Generic, reusable UI primitives.
- `src/lib/simulation/` — All simulation logic: types, code generator, engine,
  worker. No React imports allowed here.
- `src/lib/supabase/` — Supabase client factories (browser + server).
- `spec/nodes/` — Authoritative markdown specs for each node type.
- `context/` — Living context documents for AI-assisted development.
