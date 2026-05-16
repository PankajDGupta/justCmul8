# Architecture Context

## Stack

| Layer              | Technology                                    | Role                                                        |
| ------------------ | --------------------------------------------- | ----------------------------------------------------------- |
| Framework          | Next.js 16 (App Router) + TypeScript 5        | Server/client routing, RSC, API routes                      |
| UI                 | Tailwind CSS v4 + custom CSS design system    | Styling, animations, cyberpunk tokens                       |
| Graph canvas       | React Flow (`@xyflow/react` v12) + Dagre      | Drag-and-drop DES graph editor, auto-layout                 |
| Animation          | Framer Motion v12                             | Page transitions, panel animations                          |
| Simulation runtime | Pyodide (Python WASM) + SimPy                 | Client-side discrete-event simulation                       |
| State              | React local state + Zustand (canvas)          | Single source of truth for graph nodes/edges                |
| Auth / DB          | Supabase (PostgreSQL + Auth)                  | User accounts, project persistence                          |
| Icons              | Lucide React v1                               | Stroke-based icon set                                       |
| Charts             | Recharts v3                                   | Post-simulation analytics visualisations                    |
| AI                 | Google Generative AI (`@google/generative-ai`)| Gemini-powered AI Chat Panel                                |

## System Boundaries

- `src/app/` — Next.js App Router pages and layouts. Route handlers live here.
  No long-running background work inside route handlers.
- `src/components/` — Presentational and interactive React components. Divided
  into `landing/`, `workspace/`, `layout/`, and `ui/` sub-folders.
- `src/lib/simulation/` — All simulation logic: type definitions, code
  generator, Pyodide engine, Web Worker. Nothing here touches React.
- `src/lib/supabase/` — Supabase client factories (browser + server).
  Auth helpers and middleware live in `src/middleware.ts`.
- `spec/` — Canonical node-type specifications (`spec/nodes/*.md`) and the
  master project spec (`spec/project_spec.md`). These are the source of truth
  for simulation behaviour; implementation must match them.
- `context/` — Living project-context documents for AI-assisted development.
  Keep these in sync as implementation evolves.
- `samplecontext/` — Template versions of the context documents (do not edit).

## Storage Model

- **Supabase PostgreSQL**: User profiles, project metadata, saved `SimGraph`
  JSON blobs, simulation result summaries.
- **Browser memory / IndexedDB** (future): Temporary in-progress graph state
  so unsaved work survives a page refresh.
- **No server-side blob storage**: The Pyodide worker runs entirely in the
  browser; generated Python scripts are ephemeral strings, never persisted.

## Auth and Access Model

- Every user authenticates via Supabase email/password (sign-up confirms
  email; magic links are out of scope for v1).
- Every simulation project has a single owner (the creating user).
- Only the owner can read, modify, or delete their projects.
- `src/middleware.ts` enforces auth: unauthenticated requests to `/dashboard`
  or `/workspace` are redirected to `/login`.

## Invariants

1. **UI thread isolation**: The simulation engine (`pyodideWorker.ts`) runs
   exclusively in a Web Worker. The main thread never blocks on simulation
   compute.
2. **Spec-driven implementation**: Node behaviour must match the corresponding
   `spec/nodes/<type>.md`. Do not invent undocumented behaviour.
3. **Single source of truth for graph state**: `useNodesState` /
   `useEdgesState` are owned by the parent `WorkspacePage`; `NodeCanvas`
   is a fully controlled component.
4. **No hardcoded hex colours**: All colour values must reference a CSS custom
   property token defined in `globals.css`.
5. **TypeScript strict mode**: `any` is forbidden except where explicitly
   documented (e.g. `NodeParams` union type).
