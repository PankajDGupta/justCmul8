"use client";

import React, { useEffect, useRef, useState } from "react";
import { SceneManager } from "@/lib/pixi";
import { ClientSimEngine } from "@/lib/simulation/clientEngine";
import { SIM_TYPE_REGISTRY } from "@/lib/simulation/simTypeRegistry";
import type { SimGraph } from "@/lib/simulation/types";

export default function SandboxPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ClientSimEngine | null>(null);
  const sceneRef = useRef<SceneManager | null>(null);

  const [activeSimId, setActiveSimId] = useState<string>("vehicle");
  const [activePreset, setActivePreset] = useState<string>("Fuel Pumps");
  const [isRunning, setIsRunning] = useState(false);

  // Get current config and graph
  const simConfig = SIM_TYPE_REGISTRY[activeSimId as keyof typeof SIM_TYPE_REGISTRY];
  const activeScenario = simConfig?.subScenarios.find((g) => g.label === activePreset);
  const graph: SimGraph = activeScenario ? { nodes: activeScenario.nodes as any, edges: activeScenario.edges } : { nodes: [], edges: [] };

  useEffect(() => {
    let unmounted = false;

    const init = async () => {
      if (!canvasRef.current || !simConfig) return;

      // 1. Init Pixi SceneManager
      const sm = await SceneManager.create(canvasRef.current, simConfig, {
        transparent: false,
        antialias: true,
      });
      if (unmounted) return sm.destroy();
      
      sceneRef.current = sm;
      sm.setGraph(graph);

      // 2. Init Simulation Engine
      const engine = new ClientSimEngine();
      engineRef.current = engine;

      engine.onTick((tick) => {
        if (!unmounted && sceneRef.current) {
          sceneRef.current.onSimTick(tick);
        }
      });

      engine.onComplete((result) => {
        console.log("Sim complete!", result);
        setIsRunning(false);
      });
    };

    init();

    return () => {
      unmounted = true;
      if (engineRef.current) {
        engineRef.current.stop();
        engineRef.current = null;
      }
      if (sceneRef.current) {
        sceneRef.current.destroy();
        sceneRef.current = null;
      }
    };
  }, [activeSimId, activePreset]); // Re-run when type/preset changes

  const toggleEngine = () => {
    if (!engineRef.current || !sceneRef.current) return;

    if (isRunning) {
      engineRef.current.pause();
    } else {
      if (!engineRef.current.isRunning()) {
        // Not running at all, start fresh
        sceneRef.current.setGraph(graph); // reset scene positions
        engineRef.current.start({
          simType: activeSimId as any,
          durationSeconds: 1000,
          tickIntervalSeconds: 0.1,
          speedMultiplier: 1,
          graph: graph,
        });
      } else {
        // Paused, so resume
        engineRef.current.resume();
      }
    }
    setIsRunning(!isRunning);
  };

  const stopEngine = () => {
    if (engineRef.current) engineRef.current.stop();
    if (sceneRef.current) sceneRef.current.setGraph(graph); // reset display
    setIsRunning(false);
  };

  return (
    <div className="flex flex-col h-[100vh] bg-black text-white p-4 space-y-4">
      {/* Header controls */}
      <div className="flex items-center space-x-6 glass-panel p-4 shrink-0">
        <div>
          <h1 className="font-display text-xl text-[var(--neon-cyan)] mb-1">ENGINE SANDBOX</h1>
          <p className="text-sm text-gray-400">Testing Phase 2 (PixiJS) + Phase 3 (Web Worker DES)</p>
        </div>

        <div className="flex-1" />

        {/* Sim Type Selector */}
        <select 
          className="bg-black border border-gray-700 p-2 text-sm text-white"
          value={activeSimId}
          onChange={(e) => {
            const newType = e.target.value;
            setActiveSimId(newType);
            const firstPreset = SIM_TYPE_REGISTRY[newType as keyof typeof SIM_TYPE_REGISTRY]?.subScenarios[0]?.label;
            setActivePreset(firstPreset ?? "");
            stopEngine();
          }}
        >
          {Object.keys(SIM_TYPE_REGISTRY).map(k => (
             <option key={k} value={k}>{k}</option>
          ))}
        </select>

        {/* Preset Selector */}
        {simConfig && (
          <select
            className="bg-black border border-[var(--neon-green)] p-2 text-sm text-white"
            value={activePreset}
            onChange={(e) => {
              setActivePreset(e.target.value);
              stopEngine();
            }}
          >
            {simConfig.subScenarios.map(g => (
              <option key={g.label} value={g.label}>{g.label}</option>
            ))}
          </select>
        )}

        <button 
          onClick={toggleEngine}
          className="px-4 py-2 border border-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)] hover:text-black transition-colors"
        >
          {isRunning ? "PAUSE" : (engineRef.current?.isRunning() ? "RESUME" : "START SIMULATION")}
        </button>

        <button 
          onClick={stopEngine}
          className="px-4 py-2 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
        >
          STOP / RESET
        </button>
      </div>

      {/* Pixi Canvas */}
      <div className="flex-1 relative glass-panel overflow-hidden border border-gray-800 rounded-lg min-h-0">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
}
