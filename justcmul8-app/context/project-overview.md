# JustCmul8

## Overview

JustCmul8 (Just Simulate) is a visually-driven, web-based Discrete Event
Simulation (DES) platform. It allows engineers, analysts, and students to
design, configure, and execute complex systems models — such as queuing
networks, manufacturing lines, hospital flows, and logistics chains — entirely
within the browser, without writing any code. The platform pairs a
drag-and-drop React Flow canvas with a real Python/SimPy engine executed
client-side via Pyodide WebAssembly.

## Goals

1. Let any user build and run a non-trivial DES model without writing code.
2. Provide real-time, visually rich feedback (node utilization, queue depth,
   bottleneck highlighting) as the simulation runs.
3. Execute 100 % of simulation compute in the browser — zero server-side
   Python required.

## Core User Flow

1. User navigates the cyberpunk landing page and authenticates via Supabase.
2. User enters the dashboard and creates a new simulation project (or loads a
   starter scenario such as "Bank Renege").
3. User drags nodes (Source, Queue, Resource, Sink, …) from the left palette
   onto the React Flow canvas and connects them with edges.
4. User selects a node and configures its parameters in the right-panel
   NodePropertiesPanel (arrival rate, queue discipline, service distribution,
   patience timeout, etc.).
5. User clicks **Run** — the graph is compiled to a SimPy Python script and
   sent to the Pyodide Web Worker.
6. The canvas updates in real time: edges animate, nodes show live stat badges,
   bottleneck nodes glow red.
7. Simulation completes (or user clicks Stop); the SimResultsPanel presents
   aggregate KPIs and charts.

## Features

### Visual Model Construction

- Drag-and-drop node palette (Source, Queue, Resource, Service, Decision, Sink,
  Container, Store, Channel, Broadcaster, EventTrigger, PriorityResource).
- Edge connections with cyberpunk-styled animated arrows.
- Auto-layout via Dagre.
- Node Properties Panel: no-code configuration of arrival schedules, entity
  attributes, queue patience, preemptive priorities, machine breakdowns, etc.

### Simulation Engine

- Code generator (`codeGenerator.ts`) translates the React Flow `SimGraph` into
  a standalone executable SimPy Python script.
- Pyodide Web Worker (`pyodideWorker.ts`) runs the script in WASM — main thread
  stays at 60 fps.
- Tick-based telemetry: Python emits JSON payloads every N sim-time units;
  the UI consumes them to update canvas state live.

### Analytics

- SimResultsPanel: aggregate KPIs (throughput, avg wait, renege count,
  utilization per node).
- Recharts bar/line charts plotting node stats over sim time.
- AI Chat Panel (Gemini) for model explanation and suggestions.

## Scope

### In Scope

- Full browser-based DES with the node types listed above.
- Supabase authentication (sign-up / sign-in / sign-out).
- Project persistence (save/load SimGraph to Supabase).
- Real-time visual feedback during simulation run.
- Post-simulation analytics panel.

### Out of Scope

- Server-side simulation execution.
- Collaborative real-time editing (CRDTs / Yjs).
- Monaco Editor / Python IDE mode.
- Mobile / touch-first layout.

## Success Criteria

1. A signed-in user can create a Bank-Renege model, run it, and see live
   utilization badges update on the canvas.
2. `npm run build` passes with zero TypeScript errors.
3. The Pyodide worker initialises and runs a 100-sim-time-unit model in under
   30 seconds on a modern laptop.
4. All node types defined in `spec/nodes/` can be placed on the canvas and
   have their properties edited without UI errors.
