/**
 * sceneManager.ts
 *
 * Top-level PixiJS scene orchestrator — 5-layer container architecture.
 *
 *   Layer 0  bgContainer      — background texture (type-specific floor/road/pipe bg)
 *   Layer 1  pathContainer    — edge graphics (PathRenderer)
 *   Layer 2  nodeContainer    — station sprites + capacity overlays
 *   Layer 3  entityContainer  — moving entity sprites (EntityAnimator)
 *   Layer 4  hudContainer     — labels, counters, fill-level bars, stats overlays
 *
 * Usage (from a React component with a <canvas> ref):
 *
 *   const sm = await SceneManager.create(canvas, simTypeConfig);
 *   sm.setGraph(graph);
 *   sm.onSimTick(tick);
 *   sm.setSpeed(2);
 *   sm.destroy();
 *
 * The SceneManager is the ONLY file that knows about PixiJS at the React level.
 * Swap the backend engine (Client/Python) without touching SceneManager.
 */

import * as PIXI from "pixi.js";
import type { SimGraph, SimTick, SimLog, NodeStats } from "../simulation/types";
import type { SimTypeConfig } from "../simulation/simTypeRegistry";
import { computeLayout, type LayoutResult, type Point } from "./layoutEngine";
import { PathRenderer } from "./pathRenderer";
import { EntityAnimator } from "./entityAnimator";
import { checkerboardFilter } from "./checkerboardFilter";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SceneManagerOptions {
  /** Transparent background (false = opaque black). */
  transparent?: boolean;
  /** Antialias for smooth lines. */
  antialias?: boolean;
  /** Resolution (1 = native, 2 = retina). */
  resolution?: number;
}

interface NodeOverlay {
  container: PIXI.Container | null;
  labelText: PIXI.Text;
  statsText: PIXI.Text;
  /** For containers: fill-level bar background and fill graphics. */
  levelBarBg?: PIXI.Graphics;
  levelBarFill?: PIXI.Graphics;
  /** For resources: utilisation ring. */
  utilizationRing?: PIXI.Graphics;
  /** Capacity counter badge. */
  counterBadge?: PIXI.Text;
}

// ─── SceneManager ─────────────────────────────────────────────────────────────

export class SceneManager {
  private app: PIXI.Application;
  private simType: SimTypeConfig;

  // Layers
  private bgContainer: PIXI.Container;
  private pathContainer: PIXI.Container;
  private nodeContainer: PIXI.Container;
  private entityContainer: PIXI.Container;
  private hudContainer: PIXI.Container;

  // Sub-systems
  private pathRenderer: PathRenderer;
  private entityAnimator: EntityAnimator;

  // Current state
  private layout: LayoutResult | null = null;
  private graph: SimGraph | null = null;
  private nodeOverlays = new Map<string, NodeOverlay>();
  private speedMultiplier = 1;

  // ── Factory (async because PixiJS asset loading is async) ─────────────────

  static async create(
    canvas: HTMLCanvasElement,
    simType: SimTypeConfig,
    opts: SceneManagerOptions = {}
  ): Promise<SceneManager> {
    const app = new PIXI.Application({
      view: canvas,
      resizeTo: canvas.parentElement || window,
      backgroundAlpha: opts.transparent ? 0 : 1,
      backgroundColor: 0x07080a,  // matches --bg-primary
      antialias: opts.antialias ?? true,
      resolution: opts.resolution ?? (window.devicePixelRatio || 1),
      autoDensity: true,
    });

    const sm = new SceneManager(app, simType);
    await sm.init();
    return sm;
  }

  private constructor(app: PIXI.Application, simType: SimTypeConfig) {
    this.app = app;
    this.simType = simType;

    // ── 5-Layer hierarchy ──────────────────────────────────────────────────
    this.bgContainer     = new PIXI.Container();
    this.pathContainer   = new PIXI.Container();
    this.nodeContainer   = new PIXI.Container();
    this.entityContainer = new PIXI.Container();
    this.hudContainer    = new PIXI.Container();

    app.stage.addChild(this.bgContainer);
    app.stage.addChild(this.pathContainer);
    app.stage.addChild(this.nodeContainer);
    app.stage.addChild(this.entityContainer);
    app.stage.addChild(this.hudContainer);

    // Sub-systems
    this.pathRenderer = new PathRenderer(this.pathContainer, simType.pathStyle);
    this.entityAnimator = new EntityAnimator(this.entityContainer, {
      baseSpeedPx: 90,
      speedMultiplier: 1,
      spriteSize: 32,
    });
  }

  private async init(): Promise<void> {
    // Load background texture
    try {
      const bgTexture = await PIXI.Assets.load(this.simType.backgroundAsset);
      const bgSprite = new PIXI.Sprite(bgTexture);
      bgSprite.width = this.app.screen.width;
      bgSprite.height = this.app.screen.height;
      bgSprite.alpha = 0.18; // subtle — let the darks show through
      this.bgContainer.addChild(bgSprite);
    } catch {
      // No bg texture — fill with a subtle grid
      this.drawFallbackBackground();
    }

    // Load entity sprite
    const entitySprite = this.simType.entitySprites[0] ?? "";
    await this.entityAnimator.load(entitySprite, 12);

    // Bind resize event
    this.app.renderer.on("resize", () => this.handleResize());

    // Start Ticker loop
    this.app.ticker.add(this.tickLoop.bind(this));
  }

  public triggerResize(): void {
    if (this.app) {
      this.app.resize(); // force Pixi to update internal screen bounds
      this.handleResize();
    }
  }

  private handleResize(): void {
    // 1. Stretch background to new viewport size
    if (this.bgContainer.children.length > 0) {
      const bgSprite = this.bgContainer.children[0] as PIXI.Sprite | PIXI.Graphics;
      if (bgSprite) {
        bgSprite.width = this.app.screen.width;
        bgSprite.height = this.app.screen.height;
      }
    }
    // 2. Re-layout the nodes if graph exists
    if (this.graph) {
      this.setGraph(this.graph);
    }
  }

  // ── Graph Management ───────────────────────────────────────────────────────

  /**
   * Set or update the simulation graph.
   * Recomputes layout, re-renders nodes + edges, clears all running entities.
   */
  setGraph(graph: SimGraph): void {
    this.graph = graph;
    this.entityAnimator.clearAll();
    this.clearNodeOverlays();
    this.nodeContainer.removeChildren();
    this.hudContainer.removeChildren();

    this.layout = computeLayout(
      graph,
      this.simType.layoutStrategy,
      this.app.screen.width,
      this.app.screen.height
    );

    this.pathRenderer.render(this.layout.edgePaths);
    this.renderNodes();
  }

  private renderNodes(): void {
    if (!this.layout || !this.graph) return;

    for (const node of this.graph.nodes) {
      const pos = this.layout.nodePositions.get(node.id);
      if (!pos) continue;

      // ── Station sprite ─────────────────────────────────────────────────
      const spritePath = this.simType.nodeSprites[node.nodeType];
      let containerObj: PIXI.Container | null = null;
      if (spritePath) {
        try {
          const tex = PIXI.Texture.from(spritePath);
          const spriteObj = new PIXI.Sprite(tex);
          spriteObj.anchor.set(0.5);
          spriteObj.width = 48;
          spriteObj.height = 48;
          spriteObj.filters = [checkerboardFilter];
          
          const mask = new PIXI.Graphics();
          mask.beginFill(0xffffff);
          mask.drawCircle(0, 0, 22); // slightly inset from 48/2
          mask.endFill();
          
          containerObj = new PIXI.Container();
          containerObj.x = pos.x;
          containerObj.y = pos.y;
          
          containerObj.addChild(spriteObj);
          containerObj.addChild(mask);
          spriteObj.mask = mask;
          
          this.nodeContainer.addChild(containerObj);
        } catch {
          containerObj = this.makeNodeFallback(node.nodeType, pos);
        }
      } else {
        containerObj = this.makeNodeFallback(node.nodeType, pos);
      }

      // ── Labels ────────────────────────────────────────────────────────
      const labelText = new PIXI.Text(node.label, {
        fontFamily: "monospace",
        fontSize: 10,
        fill: 0xffffff,
        align: "center",
      });
      labelText.anchor.set(0.5, 0);
      labelText.x = pos.x;
      labelText.y = pos.y + 28;
      this.hudContainer.addChild(labelText);

      const statsText = new PIXI.Text("", {
        fontFamily: "monospace",
        fontSize: 9,
        fill: 0x00f2ff,
        align: "center",
      });
      statsText.anchor.set(0.5, 0);
      statsText.x = pos.x;
      statsText.y = pos.y + 40;
      this.hudContainer.addChild(statsText);

      // ── Fill-level bar for containers ──────────────────────────────────
      let levelBarBg: PIXI.Graphics | undefined;
      let levelBarFill: PIXI.Graphics | undefined;
      if (node.nodeType === "container") {
        levelBarBg = new PIXI.Graphics();
        levelBarBg.beginFill(0x111111, 0.8);
        levelBarBg.drawRect(pos.x - 16, pos.y + 54, 32, 6);
        levelBarBg.endFill();

        levelBarFill = new PIXI.Graphics();
        this.hudContainer.addChild(levelBarBg);
        this.hudContainer.addChild(levelBarFill);
      }

      // ── Utilisation ring for resources ─────────────────────────────────
      let utilizationRing: PIXI.Graphics | undefined;
      if (node.nodeType === "resource" || node.nodeType === "priority_resource") {
        utilizationRing = new PIXI.Graphics();
        this.hudContainer.addChild(utilizationRing);
      }

      // ── Queue depth badge ──────────────────────────────────────────────
      let counterBadge: PIXI.Text | undefined;
      if (node.nodeType === "queue" || node.nodeType === "store") {
        counterBadge = new PIXI.Text("0", {
          fontFamily: "monospace",
          fontSize: 11,
          fontWeight: "bold",
          fill: 0xfbef39,
        });
        counterBadge.anchor.set(0.5);
        counterBadge.x = pos.x + 18;
        counterBadge.y = pos.y - 18;
        this.hudContainer.addChild(counterBadge);
      }

      this.nodeOverlays.set(node.id, {
        container: containerObj,
        labelText,
        statsText,
        levelBarBg,
        levelBarFill,
        utilizationRing,
        counterBadge,
      });
    }
  }

  // ── Simulation Tick Processing ─────────────────────────────────────────────

  /**
   * Called by the workspace page every time the sim engine emits a tick.
   * Processes SimLog events to animate entities and updates HUD stats.
   */
  onSimTick(tick: SimTick): void {
    // Update node HUD overlays from stats
    for (const [nodeId, stats] of Object.entries(tick.nodeStats)) {
      this.updateNodeHUD(nodeId, stats);
    }

    // Process entity events
    for (const log of tick.recentLogs) {
      this.processLog(log);
    }
  }

  private processLog(log: SimLog): void {
    if (!this.layout) return;
    const pos = this.layout.nodePositions.get(log.nodeId);
    if (!pos) return;

    switch (log.event) {
      case "arrived": {
        // Spawn entity at the source node
        this.entityAnimator.spawn(log.entityId, pos);
        break;
      }

      case "queued": {
        // Move entity to this queue node and hold it there
        const sourcePath = this.getPathToNode(log.entityId, log.nodeId);
        if (sourcePath) {
          this.entityAnimator.moveTo(log.entityId, sourcePath);
        }
        // After travel, hold at queue position
        setTimeout(() => {
          this.entityAnimator.holdAt(log.entityId, pos, "queued");
        }, this.estimateTravelMs(sourcePath));
        break;
      }

      case "service_start": {
        // Move entity from queue/previous node to this resource
        const path = this.getPathToNode(log.entityId, log.nodeId);
        if (path) this.entityAnimator.moveTo(log.entityId, path);
        setTimeout(() => {
          this.entityAnimator.holdAt(log.entityId, pos, "in_service");
        }, this.estimateTravelMs(path));
        break;
      }

      case "service_end":
      case "routed": {
        // Entity will be picked up by the next event (queued/completed/etc.)
        break;
      }

      case "completed": {
        // Move to sink position, then despawn
        const sinkPath = this.getPathToNode(log.entityId, log.nodeId);
        if (sinkPath) this.entityAnimator.moveTo(log.entityId, sinkPath);
        setTimeout(() => {
          this.entityAnimator.despawn(log.entityId, "completed");
        }, this.estimateTravelMs(sinkPath) + 200);
        break;
      }

      case "reneged": {
        this.entityAnimator.despawn(log.entityId, "reneged");
        break;
      }

      case "breakdown": {
        // Flash the node sprite red to signal breakdown
        this.flashNodeBreakdown(log.nodeId);
        break;
      }

      case "repaired": {
        this.clearNodeBreakdown(log.nodeId);
        break;
      }

      case "transmitted":
      case "broadcast": {
        // Spawn a "packet" entity at the source channel node
        this.entityAnimator.spawn(log.entityId, pos);
        break;
      }

      case "received": {
        const path = this.getPathToNode(log.entityId, log.nodeId);
        if (path) this.entityAnimator.moveTo(log.entityId, path);
        setTimeout(() => {
          this.entityAnimator.despawn(log.entityId, "completed");
        }, this.estimateTravelMs(path) + 100);
        break;
      }

      case "dropped": {
        this.entityAnimator.despawn(log.entityId, "reneged");
        break;
      }
    }
  }

  private updateNodeHUD(nodeId: string, stats: NodeStats): void {
    const overlay = this.nodeOverlays.get(nodeId);
    if (!overlay) return;

    // Stats line (queue depth + utilisation)
    const util = Math.round((stats.utilization ?? 0) * 100);
    const avgWait = stats.avgWaitTime ? `${stats.avgWaitTime.toFixed(1)}s` : "";
    overlay.statsText.text = `${util}% util${avgWait ? " | " + avgWait : ""}`;

    // Queue badge
    if (overlay.counterBadge) {
      const depth = stats.currentDepth ?? 0;
      overlay.counterBadge.text = String(depth);
      // Turn badge red when queue is deep
      overlay.counterBadge.style.fill = depth > 5 ? 0xff4444 : 0xfbef39;
    }

    // Container level bar
    if (overlay.levelBarFill && stats.level !== undefined) {
      const pct = Math.min(1, Math.max(0, stats.level));
      const pos = this.layout?.nodePositions.get(nodeId);
      if (pos) {
        overlay.levelBarFill.clear();
        // Colour: green when full, orange when mid, red when low
        const fillColor = pct > 0.5 ? 0x00ff88 : pct > 0.2 ? 0xfbef39 : 0xff4444;
        overlay.levelBarFill.beginFill(fillColor, 0.9);
        overlay.levelBarFill.drawRect(pos.x - 16, pos.y + 54, 32 * pct, 6);
        overlay.levelBarFill.endFill();
      }
    }

    // Utilisation arc (resource nodes)
    if (overlay.utilizationRing) {
      const pos = this.layout?.nodePositions.get(nodeId);
      if (pos) {
        const util01 = stats.utilization ?? 0;
        overlay.utilizationRing.clear();
        // Background ring
        overlay.utilizationRing.lineStyle(3, 0x333333, 0.8);
        overlay.utilizationRing.drawCircle(pos.x, pos.y, 28);
        // Util arc (approximated as arc sweep)
        const arcColor = util01 > 0.8 ? 0xff4444 : util01 > 0.5 ? 0xfbef39 : 0x00ff88;
        overlay.utilizationRing.lineStyle(3, arcColor, 0.9);
        if (util01 > 0) {
          overlay.utilizationRing.arc(pos.x, pos.y, 28, -Math.PI / 2, -Math.PI / 2 + util01 * Math.PI * 2);
        }
      }
    }
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  /** Estimate MS travel time for a path at current speed (for setTimeout sync). */
  private estimateTravelMs(path: Point[] | null | undefined): number {
    if (!path || path.length < 2) return 0;
    const len = path.reduce((acc, pt, i) => {
      if (i === 0) return 0;
      const dx = pt.x - path[i - 1].x;
      const dy = pt.y - path[i - 1].y;
      return acc + Math.sqrt(dx * dx + dy * dy);
    }, 0);
    const speed = 90 * this.speedMultiplier;
    return (len / speed) * 1000;
  }

  /**
   * Get the edge path from the entity's current (or last known) node to the
   * new target node. Falls back to a direct line if no edge path is found.
   */
  private getPathToNode(entityId: number, targetNodeId: string): Point[] | null {
    if (!this.layout || !this.graph) return null;
    const targetPos = this.layout.nodePositions.get(targetNodeId);
    if (!targetPos) return null;

    // Find an edge whose target is this node
    for (const edge of this.graph.edges) {
      if (edge.target === targetNodeId) {
        const path = this.layout.edgePaths.get(edge.id);
        if (path && path.length >= 2) return path;
      }
    }
    // Fallback: straight line from entity's current position
    return null;
  }

  private flashNodeBreakdown(nodeId: string): void {
    const overlay = this.nodeOverlays.get(nodeId);
    if (!overlay?.container) return;
    let flashing = true;
    const interval = setInterval(() => {
      if (!flashing) { clearInterval(interval); return; }
      if (overlay.container) {
        const s = overlay.container.getChildAt(0) as PIXI.Sprite;
        if (s) {
          s.tint = s.tint === 0xff4444 ? 0xffffff : 0xff4444;
        }
      }
    }, 150);
    // Store interval ID on overlay so clearNodeBreakdown can stop it
    (overlay as any)._breakdownInterval = interval;
  }

  private clearNodeBreakdown(nodeId: string): void {
    const overlay = this.nodeOverlays.get(nodeId) as any;
    if (!overlay) return;
    if (overlay._breakdownInterval) {
      clearInterval(overlay._breakdownInterval);
      overlay._breakdownInterval = undefined;
    }
    if (overlay.container) {
      const s = overlay.container.getChildAt(0) as PIXI.Sprite;
      if (s) s.tint = 0xffffff;
    }
  }

  private clearNodeOverlays(): void {
    for (const [nodeId] of this.nodeOverlays) {
      this.clearNodeBreakdown(nodeId);
    }
    this.nodeOverlays.clear();
  }

  private makeNodeFallback(nodeType: string, pos: Point): PIXI.Container | null {
    const c = new PIXI.Container();
    c.x = pos.x;
    c.y = pos.y;
    
    const g = new PIXI.Graphics();
    const colorMap: Record<string, number> = {
      source:      0x00ff88,
      queue:       0xfbef39,
      resource:    0x00f2ff,
      service:     0x00f2ff,
      decision:    0xb300ff,
      sink:        0xff4444,
      container:   0xb300ff,
      store:       0xb300ff,
      event_trigger:0xfbef39,
      priority_resource: 0xfbef39,
      channel:     0xe879f9,
      broadcaster: 0xff7a00,
    };
    const color = colorMap[nodeType] ?? 0x00f2ff;
    g.lineStyle(2, color, 1);
    g.beginFill(color, 0.2);
    g.drawRoundedRect(-18, -18, 36, 36, 6);
    g.endFill();
    c.addChild(g);
    
    this.nodeContainer.addChild(c);
    return c;
  }

  private drawFallbackBackground(): void {
    const g = new PIXI.Graphics();
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const gridSize = 40;
    g.lineStyle(0.5, 0x1a2030, 0.6);
    for (let x = 0; x <= w; x += gridSize) {
      g.moveTo(x, 0); g.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += gridSize) {
      g.moveTo(0, y); g.lineTo(w, y);
    }
    this.bgContainer.addChild(g);
  }

  // ── Ticker Loop ────────────────────────────────────────────────────────────

  private tickLoop(delta: number): void {
    this.entityAnimator.tick(delta);
    this.pathRenderer.tick(delta);
  }

  // ── Speed Control ──────────────────────────────────────────────────────────

  setSpeed(multiplier: number): void {
    this.speedMultiplier = multiplier;
    this.entityAnimator.setSpeed(multiplier);
  }

  // ── Resize ─────────────────────────────────────────────────────────────────

  resize(width: number, height: number): void {
    this.app.renderer.resize(width, height);
    // Re-render bg
    this.bgContainer.removeChildren();
    this.drawFallbackBackground();
    // Recompute layout if graph is set
    if (this.graph) this.setGraph(this.graph);
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  get activeEntityCount(): number {
    return this.entityAnimator.activeCount;
  }

  get fps(): number {
    return Math.round(this.app.ticker.FPS);
  }

  // ── Destroy ────────────────────────────────────────────────────────────────

  destroy(): void {
    this.clearNodeOverlays();
    this.pathRenderer.destroy();
    this.entityAnimator.destroy();
    this.app.destroy(false, { children: true, texture: false, baseTexture: false });
  }
}
