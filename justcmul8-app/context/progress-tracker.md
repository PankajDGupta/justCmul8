# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

In Progress

## Current Goal

Stabilise the advanced node types (PriorityResource, Container, Store,
EventTrigger, Broadcaster, Channel) in the code generator and ensure the
NodePropertiesPanel exposes their full configuration surfaces.

## Completed

- Project scaffolding: Next.js 16 + TypeScript + Tailwind v4.
- Cyberpunk design system (`globals.css`): tokens, glow utilities, glassmorphism,
  notched cards, cyber buttons, scrollbar, React Flow overrides.
- Landing page: HeroSection, feature marquee, cyberpunk Navbar (auth-aware).
- Supabase auth: sign-up, login, middleware session protection.
- Dashboard page: project list, new-project creation.
- Workspace layout: 3-panel (NodePalette | NodeCanvas | right panels).
- NodeCanvas: React Flow canvas with custom cyberpunk node renderer, Dagre
  auto-layout, minimap, controls.
- NodePalette: categorised draggable node cards for all 13 node types.
- NodePropertiesPanel: configuration forms for Source, Queue, Resource,
  Service, Decision, Sink, Store, Interrupter, Channel, Broadcaster,
  EventTrigger, PriorityResource, Container.
- SimResultsPanel: aggregate KPIs display + Recharts bar charts.
- AIChatPanel: Gemini-powered chat for model explanation.
- Simulation type registry (`simTypeRegistry.ts`): preset starter scenarios.
- Code generator (`codeGenerator.ts`): SimPy code generation for all core
  node types including advanced features (preemption, schedules, reneging,
  broadcasting, machine breakdown).
- Pyodide engine (`pyodideEngine.ts` + `pyodideWorker.ts`): Web Worker
  bootstrapping, script execution, tick/result relay.
- Distribution helpers (`distributions.ts`).
- `SimulationEngine` interface + `clientEngine.ts` adapter.
- **[2026-05-16 19:31 IST] Source Node — Full Spec Implementation**
  Files changed: `types.ts`, `codeGenerator.ts`, `SourcePropertiesPanel.tsx`
  (new), `NodePropertiesPanel.tsx`.
  Spec checklist:
  - [x] HPP arrivals (exponential inter-arrival) — was present, verified.
  - [x] NHPP – Thinning (Lewis-Shedler) via `_nhpp_thinning` generator.
  - [x] NHPP – Non-linear Time Transform via `_nhpp_time_transform` (Λ⁻¹ bisection).
  - [x] Table-Driven arrivals (schedule + recurring) — refactored into `spawn_batch`.
  - [x] Entities per Arrival — `entitiesPerArrival` + `batchDistribution`
        (deterministic / poisson / uniform ±1).
  - [x] Attribute Binding (Labels) — `entityLabels` KV list stamped on entity dict.
  - [x] Probabilistic Part Mix (RandomRow) — `partMix` weighted table,
        cumulative CDF sampling per arrival.
  - [x] Lifecycle Hooks — `onBeforeArrival`, `onAtExit`, `onDiscard` Python
        snippets executed via `exec()` in sandboxed scope.
  - [x] TimeMeasureStart — `timeMeasureStart` bool stamps `arrivalTime` on entity.
  - [x] Max Arrivals cap — enforced per-entity inside `spawn_batch`.
  - [x] Source Duration Limit — `durationLimit` checked in `_should_stop()`.
  - [x] Shift Synchronisation — `shiftWindows` list; arrivals blocked outside
        windows, `onDiscard` hook fires with reason `shift_blocked`.
  - [x] UI — dedicated `SourcePropertiesPanel.tsx` with sections for all above.
  - [x] `npx tsc --noEmit` → exit 0 (zero type errors).
  - [ ] NHPP arrivals correctly follow time-varying schedules — runtime
        validation still needed (requires Pyodide end-to-end test).
- **[2026-05-16 21:06 IST] Queue Node — Full Spec Implementation**
  Files changed: `types.ts`, `codeGenerator.ts`, `NodePropertiesPanel.tsx`.
  Spec checklist:
  - [x] Capacity and Discipline — finite capacity enforcement, support for FIFO, LIFO, and PRIORITY via `PriorityResource`.
  - [x] Patience (Reneging) — infinite, uniform, exponential, deterministic distributions with timeout dropping.
  - [x] Sold-Out / Capacity Broadcast — monitor downstream resource capacity and trigger broadcast renege for all waitings.
  - [x] UI — updated `QueueProperties` in `NodePropertiesPanel.tsx` with all the new params.

## In Progress

- End-to-end validation of PriorityResource (preemptive interrupts) in the
  code generator.
- SimResultsPanel: timeline chart (queue depth over sim time).
- Workspace page: sim-time unit selector UX polish.
- Source Node NHPP runtime validation (Pyodide end-to-end test).

## Next Up

- Expand SimResultsPanel with per-node detail drill-down.
- Project save/load: persist SimGraph JSON to Supabase.
- Starter scenario loader on dashboard (Bank Renege, Machine Shop, Movie
  Renege presets from `simTypeRegistry.ts`).
- `npm run build` zero-error pass and deploy preview.

## Open Questions

- Should the Pyodide worker be cached across workspace navigations (singleton
  pattern) or re-initialised on each mount? Current approach re-initialises;
  caching would save ~8–10 s per session after first load.
- What is the target maximum `simDuration` before the WASM worker hits memory
  pressure in-browser?
- For NHPP time-transform, bisection upper-bound is `DURATION`; if arrivals
  cluster near the end this may produce very long waits. A tighter upper bound
  heuristic may be needed.

## Architecture Decisions

- **Pyodide over custom TS engine**: Ensures 1-to-1 parity with real SimPy
  semantics (preemption, interrupts, AnyOf/AllOf) that are extremely difficult
  to replicate faithfully in TypeScript. Trade-off: ~10 MB WASM download on
  first use.
- **Fully controlled NodeCanvas**: `useNodesState`/`useEdgesState` lifted into
  `WorkspacePage` to avoid infinite re-render loops caused by state living in
  both parent and child.
- **CSS custom-property design tokens**: Avoids hardcoded hex values scattering
  across components and enables future theming with a single token-layer change.
- **SourcePropertiesPanel.tsx extracted**: Kept `NodePropertiesPanel.tsx` from
  growing unboundedly; Source node config is now self-contained and independently
  testable.

## Session Notes

- `simTypeRegistry.ts` is the largest file (~42 KB) — it contains all preset
  scenario graph definitions. Treat it as data, not logic.
- `legacyWorker.ts` is the old TypeScript-only engine kept for reference; it
  is NOT wired into the current UI. Do not modify it.
- The `ts_errors.log` at the project root records the last TypeScript error
  snapshot — check it before marking any unit complete.
- Source Node `_OldSourcePropertiesInline` stub in `NodePropertiesPanel.tsx`
  is dead code — safe to delete after a review cycle.

