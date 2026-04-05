"use client";
import React, { useEffect, useRef } from "react";
import type { SimState } from "@/app/dashboard/project/[id]/page";
import { SceneManager } from "@/lib/pixi";
import { ClientSimEngine } from "@/lib/simulation/clientEngine";
import { SIM_TYPE_REGISTRY } from "@/lib/simulation/simTypeRegistry";

interface ViewportPanelProps {
  nodes: any[];
  edges: any[];
  simState: SimState;
  simType: string;
  engine: ClientSimEngine | null;
}

export default function ViewportPanel({ nodes, edges, simState, simType, engine }: ViewportPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SceneManager | null>(null);

  useEffect(() => {
    let unmounted = false;
    const simConfig = SIM_TYPE_REGISTRY[simType as keyof typeof SIM_TYPE_REGISTRY];

    const init = async () => {
      if (!canvasRef.current || !simConfig) return;

      // Init Pixi SceneManager
      const sm = await SceneManager.create(canvasRef.current, simConfig, {
        transparent: false,
        antialias: true,
      });
      if (unmounted) return sm.destroy();
      
      sceneRef.current = sm;
      sm.setGraph({ nodes, edges });
    };

    init();

    return () => {
      unmounted = true;
      if (sceneRef.current) {
        sceneRef.current.destroy();
        sceneRef.current = null;
      }
    };
  }, [simType]); // Re-create scene if simType changes entirely

  // Listen to CSS flexbox resize events using ResizeObserver
  useEffect(() => {
    if (!canvasRef.current || !canvasRef.current.parentElement) return;
    
    const ob = new ResizeObserver(() => {
      if (sceneRef.current) {
        sceneRef.current.triggerResize();
      }
    });
    
    ob.observe(canvasRef.current.parentElement);
    return () => ob.disconnect();
  }, []);

  // Sync graph updates to scene
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setGraph({ nodes, edges });
    }
  }, [nodes, edges]);

  // Sync engine ticks to scene
  useEffect(() => {
    if (!engine) return;
    
    // The engine allows registering an onTick hook. 
    // We register it here to push ticks straight into the SceneManager
    engine.onTick((tick) => {
      if (sceneRef.current) {
        sceneRef.current.onSimTick(tick);
      }
    });
  }, [engine]);

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--bg-secondary)" }}>
      <div className="px-3 py-2 flex items-center gap-2 border-b" style={{ borderColor: "rgba(0,242,255,0.1)" }}>
        <span className="text-xs tracking-widest" style={{ fontFamily: "var(--font-mono)", color: "var(--neon-cyan)" }}>
          2D VIEWPORT
        </span>
        {simState === "running" && (
          <span className="ml-auto w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--neon-green)" }} />
        )}
      </div>
      <div className="flex-1 relative overflow-hidden scanlines">
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          style={{ width: "100%", height: "100%" }}
        />
        {simState === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ background: "rgba(0,0,0,0.4)" }}>
            <div className="text-center">
              <div className="text-xs tracking-widest mb-1" style={{ color: "var(--neon-cyan)", fontFamily: "var(--font-mono)" }}>VIEWPORT READY</div>
              <div className="text-[10px] text-gray-400" style={{ fontFamily: "var(--font-mono)" }}>Run simulation to animate</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
