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

## In Progress

- End-to-end validation of PriorityResource (preemptive interrupts) in the
  code generator.
- SimResultsPanel: timeline chart (queue depth over sim time).
- Workspace page: sim-time unit selector UX polish.

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

## Session Notes

- `simTypeRegistry.ts` is the largest file (~42 KB) — it contains all preset
  scenario graph definitions. Treat it as data, not logic.
- `legacyWorker.ts` is the old TypeScript-only engine kept for reference; it
  is NOT wired into the current UI. Do not modify it.
- The `ts_errors.log` at the project root records the last TypeScript error
  snapshot — check it before marking any unit complete.
