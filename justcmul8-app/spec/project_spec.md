# JustCmul8 Project Specification

## 1. Project Overview
**JustCmul8** (Just Simulate) is a visually-driven, web-based Discrete Event Simulation (DES) platform. It allows users to design, configure, and execute complex systems modeling (like queuing networks, manufacturing lines, and logistics) entirely within the browser without writing code.

The platform combines a highly interactive node-based graphical interface with a robust, industry-standard simulation engine (SimPy) executed client-side via WebAssembly.

---

## 2. Technology Stack
- **Frontend Framework**: Next.js (App Router), React, TypeScript.
- **Styling**: Tailwind CSS with a custom "Cyberpunk" aesthetic (neon accents, dark backgrounds, glassmorphism).
- **Graph Visualization**: React Flow (\`@xyflow/react\`) for the drag-and-drop node canvas.
- **Simulation Engine**: Pyodide (Python in WebAssembly) running SimPy.
- **State Management**: React Context and local state, synchronized with Web Worker messaging.
- **Authentication/Database**: Supabase (PostgreSQL, Auth).

---

## 3. Core Architecture

The application is strictly divided into the UI thread and a background Web Worker thread to ensure the browser remains responsive during heavy simulation computations.

### 3.1. Frontend UI (Main Thread)
- **Workspace Dashboard**: A 3-panel layout consisting of:
  - **Left Panel (Node Palette)**: Draggable components categorized by function (e.g., Sources, Queues, Resources).
  - **Center Panel (Node Canvas)**: The interactive React Flow surface where users draw the simulation graph. Nodes display real-time live statistics (utilization, queue depths) using custom \`statsBadge\` rendering.
  - **Right Panel (Auxiliary)**: Tabbed area containing the \`NodePropertiesPanel\` for configuring selected nodes, and the \`SimResultsPanel\` for post-simulation analytics.
- **Code Generator (\`codeGenerator.ts\`)**: A crucial bridge layer that takes the visual React Flow \`SimGraph\` and compiles it into a standalone, executable Python script leveraging the SimPy library.

### 3.2. Simulation Engine (Web Worker)
- **Pyodide Worker (\`pyodideWorker.ts\`)**: A persistent background thread that initializes the Pyodide WebAssembly environment.
- **Execution Flow**:
  1. The UI sends the compiled Python script and simulation parameters (duration, tick interval) to the Worker.
  2. The Worker executes the script within the Pyodide environment.
  3. The Python script periodically emits JSON payloads (\`ticks\`) representing the instantaneous state of every node (queue depths, busy counts, total arrivals).
  4. The Worker forwards these ticks back to the UI thread via \`postMessage\`.
  5. The UI consumes these ticks to update the canvas glowing effects and stat badges in real-time.

---

## 4. Simulation Concepts & Node Types

The platform models discrete events using a network of interconnected nodes. Detailed specifications for each node's behavior can be found in the \`spec/nodes/\` directory.

### Core Node Categories:
1. **Generators**: \`source\` (creates entities based on rates or schedules).
2. **Buffers/Lines**: \`queue\` (FIFO/LIFO waiting areas with reneging logic), \`store\` (typed message buffers).
3. **Processors**: \`resource\` (capacity-constrained servers), \`priority_resource\` (preemptive servers), \`service\` (unconstrained delays).
4. **Routers**: \`decision\` (probabilistic branching), \`broadcaster\` (message duplication).
5. **Terminators**: \`sink\` (destroys entities and finalizes lifecycle KPIs).
6. **Advanced**: \`container\` (continuous liquids/levels), \`event_trigger\` (system sensors), \`channel\` (propagation delays).

---

## 5. Data Structures

### SimGraph
The primary representation of a user's model.
\`\`\`typescript
interface SimGraph {
  nodes: SimNode[];
  edges: SimEdge[];
}
\`\`\`

### SimNode
Contains standard graph data (x/y coordinates) plus simulation-specific parameters.
\`\`\`typescript
interface SimNode {
  id: string;
  nodeType: NodeType;
  label: string;
  params: any; // Dynamic based on nodeType (e.g., SourceParams, QueueParams)
}
\`\`\`

### Sim Tick Payload
The telemetry data sent from the Python engine to the UI during execution.
\`\`\`typescript
interface SimTick {
  type: "tick";
  data: {
    simTime: number;
    totalArrived: number;
    totalCompleted: number;
    nodeStats: Record<string, NodeStats>; // Instantaneous state of each node
    recentLogs: EventLog[];
  };
}
\`\`\`

---

## 6. Future Roadmap
1. **Analytics Dashboard**: Expand the \`SimResultsPanel\` to include interactive charts (e.g., Recharts) plotting historical queue depths and wait times over the simulation duration.
2. **Python IDE Mode**: Allow advanced users to eject from the visual code generator and write custom SimPy code directly in an integrated Monaco Editor.
3. **Cloud Execution**: For highly complex, multi-hour simulations, offload execution from the client-side Pyodide worker to a scalable Python backend service.
4. **Collaboration**: Implement CRDTs (e.g., Yjs) to allow multiple users to edit the same React Flow canvas simultaneously.
