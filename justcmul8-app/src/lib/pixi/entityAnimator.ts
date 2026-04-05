/**
 * entityAnimator.ts
 *
 * Manages the lifecycle of SimEntity sprites in the PixiJS scene:
 *   spawn → move (path-follow) → state changes → despawn
 *
 * Uses a sprite pool for performance (avoids create/destroy per entity).
 * Path-following uses a simple linear speed model advanced by PixiJS Ticker delta.
 *
 * Entity visual states:
 *   "moving"     — sprite travels along an edge path at full opacity
 *   "queued"     — sprite sits at queue node, slight idle bob
 *   "in_service" — sprite at resource, glowing tint
 *   "reneged"    — sprite fades out and moves toward exit
 *   "completed"  — sprite reaches sink then fades and returns to pool
 *   "broken"     — (resource) red flash instead of entity movement
 */

import * as PIXI from "pixi.js";
import type { Point } from "./layoutEngine";
import { interpolateAlongPath, pathLength } from "./layoutEngine";
import { checkerboardFilter } from "./checkerboardFilter";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EntityState =
  | "moving"
  | "queued"
  | "in_service"
  | "reneged"
  | "completed";

export interface EntityAnimConfig {
  /** Pixel-per-second travel speed at 1× sim speed. */
  baseSpeedPx: number;
  /** Multiplied by SimParams.speedMultiplier at runtime. */
  speedMultiplier: number;
  /** Path to the entity sprite sheet or image (served from /public). */
  spritePath: string;
  /** Rendered size (square) in pixels. */
  spriteSize: number;
  /** Tint applied while entity is "in_service". */
  serviceTint: number;
  /** Tint applied while entity is "reneged" or fading. */
  renégeTint: number;
}

export const DEFAULT_ENTITY_CONFIG: EntityAnimConfig = {
  baseSpeedPx: 80,
  speedMultiplier: 1,
  spritePath: "",         // set by SceneManager per sim type
  spriteSize: 32,
  serviceTint: 0x00ff88, // neon green
  renégeTint: 0xff4444,  // red
};

// ─── Internal Entity Record ───────────────────────────────────────────────────

interface EntityRecord {
  sprite: PIXI.Container;
  state: EntityState;
  /** Ordered waypoints currently being followed (empty = stationary). */
  path: Point[];
  /** 0–1 progress along current path. */
  progress: number;
  /** Total pixel length of the current path (cached). */
  pathLen: number;
  /** Position to hold when queued / in_service. */
  anchorPos?: Point;
  /** Phase for idle bob animation (radians). */
  bobPhase: number;
}

// ─── Pool ─────────────────────────────────────────────────────────────────────

/** Simple object pool for PixiJS Sprites. */
class SpritePool {
  private available: PIXI.Container[] = [];
  private texture: PIXI.Texture;
  private size: number;
  private container: PIXI.Container;

  constructor(container: PIXI.Container, texture: PIXI.Texture, size: number) {
    this.container = container;
    this.texture = texture;
    this.size = size;
  }

  acquire(): PIXI.Container {
    if (this.available.length > 0) {
      const c = this.available.pop()!;
      c.visible = true;
      c.alpha = 1;
      const s = c.getChildAt(0) as PIXI.Sprite;
      s.tint = 0xffffff;
      s.filters = [checkerboardFilter];
      c.scale.set(1);
      return c;
    }
    
    const c = new PIXI.Container();
    const s = new PIXI.Sprite(this.texture);
    s.anchor.set(0.5);
    s.width = this.size;
    s.height = this.size;
    s.filters = [checkerboardFilter];
    
    const mask = new PIXI.Graphics();
    mask.beginFill(0xffffff);
    mask.drawCircle(0, 0, this.size * 0.45); // slight inset to hide edges completely
    mask.endFill();
    
    c.addChild(s);
    c.addChild(mask);
    s.mask = mask;
    
    this.container.addChild(c);
    return c;
  }

  release(container: PIXI.Container): void {
    container.visible = false;
    container.alpha = 0;
    this.available.push(container);
  }

  /** Pre-warm with N sprites so first entities appear instantly. */
  prewarm(count: number): void {
    for (let i = 0; i < count; i++) {
      const s = this.acquire();
      this.release(s);
    }
  }

  destroy(): void {
    for (const s of this.available) s.destroy();
    this.available = [];
  }
}

// ─── EntityAnimator ───────────────────────────────────────────────────────────

export class EntityAnimator {
  private container: PIXI.Container;
  private pool: SpritePool | null = null;
  private entities = new Map<number, EntityRecord>();
  private cfg: EntityAnimConfig;
  private loaded = false;

  constructor(container: PIXI.Container, cfg: Partial<EntityAnimConfig> = {}) {
    this.container = container;
    this.cfg = { ...DEFAULT_ENTITY_CONFIG, ...cfg };
  }

  /**
   * Load entity texture and pre-warm pool.
   * Must be called before `spawn()`.
   */
  async load(spritePath: string, prewarmCount = 8): Promise<void> {
    this.cfg.spritePath = spritePath;
    try {
      const texture = await PIXI.Assets.load(spritePath);
      this.pool = new SpritePool(this.container, texture, this.cfg.spriteSize);
      this.pool.prewarm(prewarmCount);
      this.loaded = true;
    } catch {
      // Fallback: coloured circle when sprite not found
      const fallbackTexture = this.makeFallbackTexture();
      this.pool = new SpritePool(this.container, fallbackTexture, this.cfg.spriteSize);
      this.pool.prewarm(prewarmCount);
      this.loaded = true;
    }
  }

  /** Spawn a new entity at a given position. Returns false if not yet loaded. */
  spawn(entityId: number, startPos: Point): boolean {
    if (!this.loaded || !this.pool) return false;
    if (this.entities.has(entityId)) return true; // already exists

    const sprite = this.pool.acquire();
    sprite.x = startPos.x;
    sprite.y = startPos.y;

    this.entities.set(entityId, {
      sprite,
      state: "moving",
      path: [],
      progress: 0,
      pathLen: 0,
      bobPhase: Math.random() * Math.PI * 2,
    });
    return true;
  }

  /**
   * Start moving an entity along a new path.
   * If the entity doesn't exist yet, it will be spawned at path[0].
   */
  moveTo(entityId: number, path: Point[]): void {
    if (path.length < 2) return;

    let rec = this.entities.get(entityId);
    if (!rec) {
      const ok = this.spawn(entityId, path[0]);
      if (!ok) return;
      rec = this.entities.get(entityId)!;
    }

    rec.path = path;
    rec.progress = 0;
    rec.pathLen = pathLength(path);
    rec.state = "moving";
    rec.sprite.alpha = 1;
    const s = rec.sprite.getChildAt(0) as PIXI.Sprite;
    s.tint = 0xffffff;
  }

  /** Place entity at a fixed position (queued / in_service). */
  holdAt(entityId: number, pos: Point, state: EntityState): void {
    const rec = this.entities.get(entityId);
    if (!rec) return;
    rec.state = state;
    rec.path = [];
    rec.anchorPos = pos;
    rec.sprite.x = pos.x;
    rec.sprite.y = pos.y;

    const s = rec.sprite.getChildAt(0) as PIXI.Sprite;
    if (state === "in_service") {
      s.tint = this.cfg.serviceTint;
    } else {
      s.tint = 0xffffff;
    }
  }

  /** Fade out entity and return sprite to pool. */
  despawn(entityId: number, state: EntityState = "completed"): void {
    const rec = this.entities.get(entityId);
    if (!rec) return;
    rec.state = state;
    if (state === "reneged") {
      const s = rec.sprite.getChildAt(0) as PIXI.Sprite;
      s.tint = this.cfg.renégeTint;
    }
    // Alpha-fade handled in tick(); entity removed after alpha reaches 0.
  }

  /** Set speedMultiplier (1×, 2×, 5×, 10×). */
  setSpeed(multiplier: number): void {
    this.cfg.speedMultiplier = multiplier;
  }

  /**
   * Advance all entity animations.
   * @param delta PixiJS Ticker delta (frames, ~1 at 60fps)
   */
  tick(delta: number): void {
    const dt = delta / 60; // seconds
    const speed = this.cfg.baseSpeedPx * this.cfg.speedMultiplier;

    for (const [id, rec] of this.entities) {
      switch (rec.state) {

        case "moving": {
          if (rec.path.length < 2 || rec.pathLen === 0) break;
          // Advance progress by distance
          const distThisFrame = speed * dt;
          rec.progress = Math.min(1, rec.progress + distThisFrame / rec.pathLen);

          const pos = interpolateAlongPath(rec.path, rec.progress);
          rec.sprite.x = pos.x;
          rec.sprite.y = pos.y;

          // Rotate sprite to face movement direction
          if (rec.progress < 0.99 && rec.progress > 0.01) {
            const posAhead = interpolateAlongPath(rec.path, Math.min(1, rec.progress + 0.02));
            const angle = Math.atan2(posAhead.y - pos.y, posAhead.x - pos.x);
            rec.sprite.rotation = angle + (Math.PI / 2); // Sprite looks UP, so rotate 90 degrees math wise
          }

          if (rec.progress >= 1) {
            // Reached destination — hold at last point
            rec.path = [];
          }
          break;
        }

        case "queued": {
          // Idle bob animation
          rec.bobPhase += delta * 0.04;
          if (rec.anchorPos) {
            rec.sprite.y = rec.anchorPos.y + Math.sin(rec.bobPhase) * 2;
          }
          break;
        }

        case "in_service": {
          // Gentle pulse
          rec.bobPhase += delta * 0.06;
          rec.sprite.alpha = 0.85 + 0.15 * Math.sin(rec.bobPhase);
          break;
        }

        case "reneged":
        case "completed": {
          // Fade out
          rec.sprite.alpha = Math.max(0, rec.sprite.alpha - dt * 2);
          rec.sprite.scale.set(rec.sprite.scale.x + dt * 0.5); // slight grow-pop
          if (rec.sprite.alpha <= 0) {
            this.pool?.release(rec.sprite);
            this.entities.delete(id);
          }
          break;
        }
      }
    }
  }

  /** Returns count of active (non-pooled) entities. */
  get activeCount(): number {
    return this.entities.size;
  }

  /** Remove all active entities, return sprites to pool. */
  clearAll(): void {
    for (const rec of this.entities.values()) {
      this.pool?.release(rec.sprite);
    }
    this.entities.clear();
  }

  destroy(): void {
    this.clearAll();
    this.pool?.destroy();
  }

  // ── Fallback texture when sprite file is missing ───────────────────────────

  private makeFallbackTexture(): PIXI.Texture {
    const g = new PIXI.Graphics();
    g.beginFill(0x00f2ff, 1);      // Neon cyan circle
    g.drawCircle(16, 16, 12);
    g.endFill();
    g.lineStyle(2, 0xffffff, 0.8);
    g.drawCircle(16, 16, 12);
    const renderer = PIXI.autoDetectRenderer({ width: 32, height: 32, backgroundAlpha: 0 }) as PIXI.Renderer;
    const texture = renderer.generateTexture(g);
    renderer.destroy();
    g.destroy();
    return texture;
  }
}
