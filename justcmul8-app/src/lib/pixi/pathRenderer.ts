/**
 * pathRenderer.ts
 *
 * Renders SimEdge paths as PixiJS Graphics objects inside a dedicated Container.
 * Supports: straight, dashed, animated flow (liquid/network), arrow markers,
 * wide road lanes (vehicle), and conveyor tick-marks (manufacturing).
 *
 * Call `render()` once when the graph changes, then call `tick(delta)` every
 * frame so animated edges (liquid, network) update their flow phase.
 */

import * as PIXI from "pixi.js";
import type { Point } from "./layoutEngine";
import type { PathStyleConfig } from "../simulation/simTypeRegistry";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse a CSS hex / rgb / rgba color string into a 0xRRGGBB number and alpha. */
function parseCSSColor(css: string): { color: number; alpha: number } {
  // rgba(r, g, b, a)
  const rgba = css.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgba) {
    const r = parseInt(rgba[1]);
    const g = parseInt(rgba[2]);
    const b = parseInt(rgba[3]);
    const a = rgba[4] !== undefined ? parseFloat(rgba[4]) : 1;
    return { color: (r << 16) | (g << 8) | b, alpha: a };
  }
  // #RRGGBB or #RGB
  const hex6 = css.match(/^#([0-9a-f]{6})$/i);
  if (hex6) return { color: parseInt(hex6[1], 16), alpha: 1 };
  const hex3 = css.match(/^#([0-9a-f]{3})$/i);
  if (hex3) {
    const [r, g, b] = hex3[1].split("").map(h => parseInt(h + h, 16));
    return { color: (r << 16) | (g << 8) | b, alpha: 1 };
  }
  return { color: 0x00f2ff, alpha: 0.5 }; // neon cyan fallback
}

/** Draw a dashed line on a PixiJS Graphics object. */
function drawDashedLine(
  g: PIXI.Graphics,
  points: Point[],
  dashLen: number,
  gapLen: number,
  phase = 0
): void {
  if (points.length < 2) return;

  const period = dashLen + gapLen;
  // Advance by phase (animated offset)
  let drawn = ((phase % period) + period) % period;
  let onDash = drawn < dashLen;

  for (let i = 1; i < points.length; i++) {
    const x0 = points[i - 1].x;
    const y0 = points[i - 1].y;
    const x1 = points[i].x;
    const y1 = points[i].y;
    const segDX = x1 - x0;
    const segDY = y1 - y0;
    const segLen = Math.sqrt(segDX * segDX + segDY * segDY);
    if (segLen === 0) continue;
    const ux = segDX / segLen;
    const uy = segDY / segLen;

    let t = 0;
    while (t < segLen) {
      const remaining = onDash ? dashLen - drawn : gapLen - drawn;
      const step = Math.min(remaining, segLen - t);
      const x = x0 + ux * t;
      const y = y0 + uy * t;
      const ex = x0 + ux * (t + step);
      const ey = y0 + uy * (t + step);

      if (onDash) {
        g.moveTo(x, y);
        g.lineTo(ex, ey);
      }

      t += step;
      drawn += step;
      if (drawn >= (onDash ? dashLen : gapLen)) {
        onDash = !onDash;
        drawn = 0;
      }
    }
  }
}

/** Draw arrowhead at the end of a path segment. */
function drawArrowhead(
  g: PIXI.Graphics,
  from: Point,
  to: Point,
  size: number,
  color: number,
  alpha: number
): void {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;
  const ux = dx / len;
  const uy = dy / len;
  // Arrowhead triangle
  g.beginFill(color, alpha);
  g.drawPolygon([
    to.x, to.y,
    to.x - ux * size - uy * size * 0.5,
    to.y - uy * size + ux * size * 0.5,
    to.x - ux * size + uy * size * 0.5,
    to.y - uy * size - ux * size * 0.5,
  ]);
  g.endFill();
}

/** Draw conveyor tick-marks perpendicular to the path. */
function drawConveyorTicks(
  g: PIXI.Graphics,
  points: Point[],
  interval: number,
  phase: number,
  color: number,
  alpha: number,
  width: number
): void {
  for (let i = 1; i < points.length; i++) {
    const x0 = points[i - 1].x;
    const y0 = points[i - 1].y;
    const x1 = points[i].x;
    const y1 = points[i].y;
    const segDX = x1 - x0;
    const segDY = y1 - y0;
    const segLen = Math.sqrt(segDX * segDX + segDY * segDY);
    if (segLen === 0) continue;
    const ux = segDX / segLen;
    const uy = segDY / segLen;
    const px = -uy; // perpendicular
    const py = ux;
    const halfTick = width * 0.5;
    const start = ((phase % interval) + interval) % interval;

    for (let t = start; t <= segLen; t += interval) {
      const cx = x0 + ux * t;
      const cy = y0 + uy * t;
      g.lineStyle(1, color, alpha * 0.6);
      g.moveTo(cx - px * halfTick, cy - py * halfTick);
      g.lineTo(cx + px * halfTick, cy + py * halfTick);
    }
  }
}

/** Draw flowing "packet" dots along the path (for network/liquid animated edges). */
function drawPacketDots(
  g: PIXI.Graphics,
  points: Point[],
  phase: number,
  color: number,
  alpha: number
): void {
  // Place dots at 0.2, 0.5, 0.8 along the path (animated by phase)
  const positions = [0.15, 0.45, 0.75];
  for (let pi = 0; pi < positions.length; pi++) {
    const t = (positions[pi] + phase) % 1.0;
    const pt = interpolateAlongPolyline(points, t);
    if (!pt) continue;
    g.beginFill(color, alpha * (0.6 + 0.4 * Math.sin(phase * Math.PI * 2 + pi)));
    g.drawCircle(pt.x, pt.y, 3);
    g.endFill();
  }
}

function interpolateAlongPolyline(path: Point[], t: number): Point | null {
  if (path.length < 2) return null;
  const lengths: number[] = [0];
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i - 1].x;
    const dy = path[i].y - path[i - 1].y;
    lengths.push(lengths[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  const total = lengths[lengths.length - 1];
  if (total === 0) return path[0];
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

// ─── PathRenderer Class ───────────────────────────────────────────────────────

export class PathRenderer {
  private container: PIXI.Container;
  private style: PathStyleConfig;
  private parsedColor: { color: number; alpha: number };
  private graphics: PIXI.Graphics;
  /** Animated flow phase — updated each Ticker frame. */
  private phase = 0;
  /** Current edge paths set via render(). */
  private currentPaths: Map<string, Point[]> = new Map();

  constructor(container: PIXI.Container, style: PathStyleConfig) {
    this.container = container;
    this.style = style;
    this.parsedColor = parseCSSColor(style.strokeColor);
    this.graphics = new PIXI.Graphics();
    this.container.addChild(this.graphics);
  }

  /** Set or replace edge paths. Triggers a full redraw. */
  public render(edgePaths: Map<string, Point[]>): void {
    this.currentPaths = edgePaths;
    this.redraw();
  }

  /** Called every Ticker frame (delta is in frames, ~1 at 60fps). */
  public tick(delta: number): void {
    if (!this.style.animated) return;
    this.phase = (this.phase + delta * 0.008) % 1;
    this.redraw();
  }

  /** Destroy and remove from parent. */
  public destroy(): void {
    this.graphics.destroy();
  }

  private redraw(): void {
    const g = this.graphics;
    const { color, alpha } = this.parsedColor;
    const sw = this.style.strokeWidth ?? 2;
    const dash = this.style.dashPattern;
    const arrowInt = this.style.arrowInterval;
    const tickInt = this.style.tickInterval;

    g.clear();

    for (const [, points] of this.currentPaths) {
      if (points.length < 2) continue;

      // ── Background track (wide road or base line) ───────────────────────
      if (sw >= 8) {
        // Road-style: draw dark road under the lane markers
        g.lineStyle(sw, 0x111111, 0.7);
        g.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
      }

      // ── Main edge line ───────────────────────────────────────────────────
      g.lineStyle(sw >= 8 ? 1 : sw, color, alpha);
      if (dash) {
        drawDashedLine(g, points, dash[0], dash[1], this.phase * (dash[0] + dash[1]));
      } else {
        g.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
      }

      // ── Arrow markers ────────────────────────────────────────────────────
      if (arrowInt) {
        const totalLen = points.reduce((acc, pt, i) => {
          if (i === 0) return 0;
          const dx = pt.x - points[i - 1].x;
          const dy = pt.y - points[i - 1].y;
          return acc + Math.sqrt(dx * dx + dy * dy);
        }, 0);
        const count = Math.floor(totalLen / arrowInt);
        for (let k = 1; k <= count; k++) {
          const t = k / (count + 1);
          const pt = interpolateAlongPolyline(points, t);
          const ptPrev = interpolateAlongPolyline(points, t - 0.01);
          if (pt && ptPrev) {
            drawArrowhead(g, ptPrev, pt, 6, color, alpha * 0.8);
          }
        }
      }

      // ── Conveyor ticks (manufacturing) ───────────────────────────────────
      if (tickInt) {
        drawConveyorTicks(g, points, tickInt, this.phase * tickInt, color, alpha, sw);
      }

      // ── Animated flow packets (liquid / network) ─────────────────────────
      if (this.style.animated) {
        drawPacketDots(g, points, this.phase, color, Math.min(1, alpha * 1.4));
      }
    }
  }
}
