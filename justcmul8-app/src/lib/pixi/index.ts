/**
 * src/lib/pixi/index.ts
 * Barrel export for the PixiJS scene system.
 * Import from "@/lib/pixi" in workspace/viewport components.
 */

export { computeLayout, interpolateAlongPath, pathLength } from "./layoutEngine";
export type { Point, LayoutResult } from "./layoutEngine";

export { PathRenderer } from "./pathRenderer";

export { EntityAnimator, DEFAULT_ENTITY_CONFIG } from "./entityAnimator";
export type { EntityState, EntityAnimConfig } from "./entityAnimator";

export { SceneManager } from "./sceneManager";
export type { SceneManagerOptions } from "./sceneManager";
