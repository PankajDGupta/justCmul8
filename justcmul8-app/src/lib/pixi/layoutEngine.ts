/**
 * layoutEngine.ts
 *
 * PURE computation — NO PixiJS imports.
 * Takes a SimGraph + LayoutStrategyId and returns pixel positions for each
 * node and ordered waypoint arrays for each edge.
 *
 * The SceneManager calls `computeLayout()` whenever the graph changes and
 * forwards the result to PathRenderer and EntityAnimator.
 */

import type { SimGraph, SimNode, SimEdge, NodeType } from "../simulation/types";
import type { LayoutStrategyId } from "../simulation/simTypeRegistry";

// ─── Data Structures ─────────────────────────────────────────────────────────

export interface Point {
  x: number;
  y: number;
}

export interface LayoutResult {
  /** Canvas pixel position for each SimNode.id */
  nodePositions: Map<string, Point>;
  /**
   * Ordered waypoints for each SimEdge.id.
   * Index 0 = source centre, last index = target centre.
   * Intermediate points are control/waypoints for curves.
   */
  edgePaths: Map<string, Point[]>;
  canvasWidth: number;
  canvasHeight: number;
}

// ─── Internal Graph Utilities ─────────────────────────────────────────────────

/** Kahn's topological sort + longest-path level assignment. */
function computeLevels(
  nodes: SimNode[],
  edges: SimEdge[]
): Map<string, number> {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  const levels = new Map<string, number>();

  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
    levels.set(n.id, 0);
  }
  for (const e of edges) {
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    adj.get(e.source)?.push(e.target);
  }

  // BFS / Kahn
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const neighbour of adj.get(id) ?? []) {
      const newLevel = (levels.get(id) ?? 0) + 1;
      if (newLevel > (levels.get(neighbour) ?? 0)) {
        levels.set(neighbour, newLevel);
      }
      inDegree.set(neighbour, (inDegree.get(neighbour) ?? 0) - 1);
      if ((inDegree.get(neighbour) ?? 0) === 0) {
        queue.push(neighbour);
      }
    }
  }

  return levels;
}

/** Group nodes by their computed level. */
function groupByLevel(
  nodes: SimNode[],
  levels: Map<string, number>
): Map<number, SimNode[]> {
  const groups = new Map<number, SimNode[]>();
  for (const n of nodes) {
    const lv = levels.get(n.id) ?? 0;
    if (!groups.has(lv)) groups.set(lv, []);
    groups.get(lv)!.push(n);
  }
  return groups;
}

/** Simple S-curve mid-point for an edge to avoid straight-line boring look. */
function curvedMidpoint(from: Point, to: Point, curvature = 0.2): Point {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  // Perpendicular offset
  return {
    x: mx - dy * curvature,
    y: my + dx * curvature,
  };
}

/** Build edge paths from node positions — adds a slight curve mid-point. */
function buildEdgePaths(
  edges: SimEdge[],
  positions: Map<string, Point>,
  curved = true
): Map<string, Point[]> {
  const edgePaths = new Map<string, Point[]>();

  // Count parallel edges between same node pairs for offset
  const pairCount = new Map<string, number>();
  const pairIdx = new Map<string, number>();
  for (const e of edges) {
    const key = [e.source, e.target].sort().join("→");
    pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
  }
  const pairCursor = new Map<string, number>();

  for (const e of edges) {
    const from = positions.get(e.source);
    const to = positions.get(e.target);
    if (!from || !to) { edgePaths.set(e.id, []); continue; }

    const key = [e.source, e.target].sort().join("→");
    const total = pairCount.get(key) ?? 1;
    const idx = pairCursor.get(key) ?? 0;
    pairCursor.set(key, idx + 1);

    if (!curved || (Math.abs(from.x - to.x) < 5 && Math.abs(from.y - to.y) < 5)) {
      edgePaths.set(e.id, [from, to]);
      continue;
    }

    // Offset parallel edges
    const offsetMag = total > 1 ? (idx - (total - 1) / 2) * 25 : 0;
    const mid = curvedMidpoint(from, to, 0.15 + offsetMag * 0.005);
    edgePaths.set(e.id, [from, mid, to]);
  }

  return edgePaths;
}

// ─── Strategy: bank_branch (Human Queue) ────────────────────────────────────

const NODE_TYPE_COLUMN: Partial<Record<NodeType, number>> = {
  source:           0,
  queue:            1,
  resource:         2,
  service:          2,
  priority_resource:2,
  event_trigger:    2,
  store:            1,
  decision:         3,
  container:        1,
  sink:             4,
};

function bankBranchLayout(
  graph: SimGraph,
  w: number,
  h: number
): Map<string, Point> {
  const cols = new Map<number, SimNode[]>();
  for (const n of graph.nodes) {
    const col = NODE_TYPE_COLUMN[n.nodeType] ?? 2;
    if (!cols.has(col)) cols.set(col, []);
    cols.get(col)!.push(n);
  }

  const maxCol = Math.max(...Array.from(cols.keys()), 4);
  const colWidth = w / (maxCol + 2);
  const positions = new Map<string, Point>();

  for (const [col, nodes] of cols) {
    const x = colWidth * (col + 0.8);
    nodes.forEach((n, i) => {
      const y = (h / (nodes.length + 1)) * (i + 1);
      positions.set(n.id, { x, y });
    });
  }
  return positions;
}

// ─── Strategy: linear_lane (Vehicle: gas station, car wash) ─────────────────

function linearLaneLayout(
  graph: SimGraph,
  w: number,
  h: number
): Map<string, Point> {
  const levels = computeLevels(graph.nodes, graph.edges);
  const groups = groupByLevel(graph.nodes, levels);
  const maxLevel = Math.max(...Array.from(groups.keys()), 0);
  const cellW = w / (maxLevel + 2);
  const positions = new Map<string, Point>();

  for (const [lvl, nodes] of groups) {
    const x = cellW * (lvl + 1);
    nodes.forEach((n, i) => {
      const y = (h / (nodes.length + 1)) * (i + 1);
      positions.set(n.id, { x, y });
    });
  }
  return positions;
}

// ─── Strategy: intersection (Vehicle: crossroads) ────────────────────────────

function intersectionLayout(
  graph: SimGraph,
  w: number,
  h: number
): Map<string, Point> {
  const positions = new Map<string, Point>();
  const cx = w / 2;
  const cy = h / 2;

  // Heuristic: decision/priority_resource → center; sources → cardinal edges; sinks → outer corners
  const decisionNodes = graph.nodes.filter(n => n.nodeType === "decision" || n.nodeType === "priority_resource");
  const sourceNodes = graph.nodes.filter(n => n.nodeType === "source");
  const sinkNodes = graph.nodes.filter(n => n.nodeType === "sink");
  const otherNodes = graph.nodes.filter(n =>
    !decisionNodes.includes(n) && !sourceNodes.includes(n) && !sinkNodes.includes(n)
  );

  // Decision at center
  decisionNodes.forEach((n, i) => {
    positions.set(n.id, { x: cx + (i - (decisionNodes.length - 1) / 2) * 80, y: cy });
  });

  // Sources at cardinal edges — N, S, E, W cycling
  const cardinals: Point[] = [
    { x: cx, y: h * 0.08 },       // North
    { x: cx, y: h * 0.92 },       // South
    { x: w * 0.92, y: cy },       // East
    { x: w * 0.08, y: cy },       // West
  ];
  sourceNodes.forEach((n, i) => {
    positions.set(n.id, cardinals[i % cardinals.length]);
  });

  // Sinks at outer positions
  const sinkCardinals: Point[] = [
    { x: w * 0.85, y: h * 0.15 }, // NE
    { x: w * 0.15, y: h * 0.85 }, // SW
    { x: w * 0.85, y: h * 0.85 }, // SE
    { x: w * 0.15, y: h * 0.15 }, // NW
  ];
  sinkNodes.forEach((n, i) => {
    positions.set(n.id, sinkCardinals[i % sinkCardinals.length]);
  });

  // Others in inner ring
  otherNodes.forEach((n, i) => {
    const angle = (i / Math.max(otherNodes.length, 1)) * 2 * Math.PI;
    positions.set(n.id, {
      x: cx + Math.cos(angle) * (w * 0.2),
      y: cy + Math.sin(angle) * (h * 0.2),
    });
  });

  return positions;
}

// ─── Strategy: pipeline (Liquid / Material) ─────────────────────────────────

function pipelineLayout(
  graph: SimGraph,
  w: number,
  h: number
): Map<string, Point> {
  // Same as linear_lane but with more vertical breathing for branches
  const levels = computeLevels(graph.nodes, graph.edges);
  const groups = groupByLevel(graph.nodes, levels);
  const maxLevel = Math.max(...Array.from(groups.keys()), 0);
  const cellW = w / (maxLevel + 2);
  const positions = new Map<string, Point>();

  for (const [lvl, nodes] of groups) {
    const x = cellW * (lvl + 1);
    nodes.forEach((n, i) => {
      const y = (h / (nodes.length + 1)) * (i + 1);
      positions.set(n.id, { x, y });
    });
  }
  return positions;
}

// ─── Strategy: assembly_line (Manufacturing) ─────────────────────────────────

function assemblyLineLayout(
  graph: SimGraph,
  w: number,
  h: number
): Map<string, Point> {
  const levels = computeLevels(graph.nodes, graph.edges);
  const groups = groupByLevel(graph.nodes, levels);
  const maxLevel = Math.max(...Array.from(groups.keys()), 0);

  // Main axis = horizontal centre. WIP buffers on main row; branches offset vertically.
  const cellW = w / (maxLevel + 2);
  const positions = new Map<string, Point>();
  const cy = h * 0.45; // Main conveyor belt slightly above centre
  const rowH = h * 0.22;

  for (const [lvl, nodes] of groups) {
    const x = cellW * (lvl + 1);
    if (nodes.length === 1) {
      positions.set(nodes[0].id, { x, y: cy });
    } else {
      // Spread vertically around cy
      nodes.forEach((n, i) => {
        const offset = (i - (nodes.length - 1) / 2) * rowH;
        positions.set(n.id, { x, y: cy + offset });
      });
    }
  }
  return positions;
}

// ─── Strategy: warehouse (Logistics) ─────────────────────────────────────────

function warehouseLayout(
  graph: SimGraph,
  w: number,
  h: number
): Map<string, Point> {
  // BFS from sources → top to bottom rows
  const levels = computeLevels(graph.nodes, graph.edges);
  const groups = groupByLevel(graph.nodes, levels);
  const maxLevel = Math.max(...Array.from(groups.keys()), 0);
  const rowH = h / (maxLevel + 2);
  const positions = new Map<string, Point>();

  for (const [lvl, nodes] of groups) {
    const y = rowH * (lvl + 1);
    nodes.forEach((n, i) => {
      const x = (w / (nodes.length + 1)) * (i + 1);
      positions.set(n.id, { x, y });
    });
  }
  return positions;
}

// ─── Strategy: network_topology (Network / Signal) ───────────────────────────

function networkTopologyLayout(
  graph: SimGraph,
  w: number,
  h: number
): Map<string, Point> {
  const positions = new Map<string, Point>();
  const PADDING = 80;

  // 1. Use ReactFlow positions if available (already set by user's drag-and-drop)
  const hasPositions = graph.nodes.every(n => n.position);
  if (hasPositions) {
    // Find bounding box and scale to canvas
    const xs = graph.nodes.map(n => n.position!.x);
    const ys = graph.nodes.map(n => n.position!.y);
    const minX = Math.min(...xs); const maxX = Math.max(...xs);
    const minY = Math.min(...ys); const maxY = Math.max(...ys);
    const rangeX = Math.max(maxX - minX, 1);
    const rangeY = Math.max(maxY - minY, 1);

    for (const n of graph.nodes) {
      positions.set(n.id, {
        x: PADDING + ((n.position!.x - minX) / rangeX) * (w - PADDING * 2),
        y: PADDING + ((n.position!.y - minY) / rangeY) * (h - PADDING * 2),
      });
    }
    return positions;
  }

  // 2. Fall back: layered by topo level (left → right) — same as linear_lane
  const levels = computeLevels(graph.nodes, graph.edges);
  const groups = groupByLevel(graph.nodes, levels);
  const maxLevel = Math.max(...Array.from(groups.keys()), 0);
  const cellW = (w - PADDING * 2) / (maxLevel + 1);

  for (const [lvl, nodes] of groups) {
    const x = PADDING + cellW * lvl + cellW / 2;
    nodes.forEach((n, i) => {
      const y = PADDING + ((h - PADDING * 2) / (nodes.length + 1)) * (i + 1);
      positions.set(n.id, { x, y });
    });
  }
  return positions;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Map from layout strategy → positioning function. */
const STRATEGY_FN: Record<
  LayoutStrategyId,
  (graph: SimGraph, w: number, h: number) => Map<string, Point>
> = {
  bank_branch:       bankBranchLayout,
  linear_lane:       linearLaneLayout,
  intersection:      intersectionLayout,
  pipeline:          pipelineLayout,
  assembly_line:     assemblyLineLayout,
  warehouse:         warehouseLayout,
  network_topology:  networkTopologyLayout,
};

/**
 * Compute the full layout for a simulation graph.
 *
 * @param graph         The SimGraph (nodes + edges)
 * @param strategy      Which layout algorithm to use
 * @param canvasWidth   PixiJS canvas width in pixels
 * @param canvasHeight  PixiJS canvas height in pixels
 */
export function computeLayout(
  graph: SimGraph,
  strategy: LayoutStrategyId,
  canvasWidth: number,
  canvasHeight: number
): LayoutResult {
  if (graph.nodes.length === 0) {
    return {
      nodePositions: new Map(),
      edgePaths: new Map(),
      canvasWidth,
      canvasHeight,
    };
  }

  const fn = STRATEGY_FN[strategy] ?? pipelineLayout;
  const nodePositions = fn(graph, canvasWidth, canvasHeight);

  // Curved edges look better for all strategies except warehouse (straight looks like racks)
  const curved = strategy !== "warehouse";
  const edgePaths = buildEdgePaths(graph.edges, nodePositions, curved);

  return { nodePositions, edgePaths, canvasWidth, canvasHeight };
}

/**
 * Interpolate a point along a polyline path at parameter t ∈ [0, 1].
 * Used by EntityAnimator to position entities along edge paths.
 */
export function interpolateAlongPath(path: Point[], t: number): Point {
  if (path.length === 0) return { x: 0, y: 0 };
  if (path.length === 1) return path[0];
  if (t <= 0) return path[0];
  if (t >= 1) return path[path.length - 1];

  // Compute total length
  const lengths: number[] = [0];
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i - 1].x;
    const dy = path[i].y - path[i - 1].y;
    lengths.push(lengths[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  const total = lengths[lengths.length - 1];
  const target = t * total;

  for (let i = 1; i < lengths.length; i++) {
    if (lengths[i] >= target) {
      const segLen = lengths[i] - lengths[i - 1];
      const segT = segLen > 0 ? (target - lengths[i - 1]) / segLen : 0;
      return {
        x: path[i - 1].x + (path[i].x - path[i - 1].x) * segT,
        y: path[i - 1].y + (path[i].y - path[i - 1].y) * segT,
      };
    }
  }
  return path[path.length - 1];
}

/** Compute total pixel length of a polyline. */
export function pathLength(path: Point[]): number {
  let len = 0;
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i - 1].x;
    const dy = path[i].y - path[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}
