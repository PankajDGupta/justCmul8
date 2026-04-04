"use client";
import React from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Hexagon, ArrowLeft, Play, Pause, Square, FastForward, Save } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// Dynamic imports to avoid SSR issues with canvas libs
const NodeCanvas = dynamic(() => import("@/components/workspace/NodeCanvas"), { ssr: false });
const ViewportPanel = dynamic(() => import("@/components/workspace/ViewportPanel"), { ssr: false });
const AIChatPanel = dynamic(() => import("@/components/workspace/AIChatPanel"), { ssr: false });
const NodePalette = dynamic(() => import("@/components/workspace/NodePalette"), { ssr: false });

export type SimState = "idle" | "running" | "paused";

interface Project { id: string; name: string; sim_type: string; graph_json: string; }

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [project, setProject] = React.useState<Project | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [simState, setSimState] = React.useState<SimState>("idle");
  const [speed, setSpeed] = React.useState(1);
  const [saved, setSaved] = React.useState(true);
  const [nodes, setNodes] = React.useState<any[]>([]);
  const [edges, setEdges] = React.useState<any[]>([]);
  const saveTimer = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    loadProject();
  }, [id]);

  async function loadProject() {
    const { data } = await supabase.from("projects").select("*").eq("id", id).single();
    if (!data) { router.push("/dashboard"); return; }
    setProject(data);
    const graph = JSON.parse(data.graph_json || '{"nodes":[],"edges":[]}');
    setNodes(graph.nodes || []);
    setEdges(graph.edges || []);
    setLoading(false);
  }

  function onGraphChange(newNodes: any[], newEdges: any[]) {
    setNodes(newNodes);
    setEdges(newEdges);
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => autoSave(newNodes, newEdges), 1500);
  }

  async function autoSave(n: any[], e: any[]) {
    if (!project) return;
    await supabase.from("projects").update({
      graph_json: JSON.stringify({ nodes: n, edges: e }),
      updated_at: new Date().toISOString(),
    }).eq("id", project.id);
    setSaved(true);
  }

  const speedOptions = [1, 2, 5, 10];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="text-neon-cyan text-sm animate-pulse" style={{ fontFamily: "var(--font-mono)" }}>LOADING WORKSPACE...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      {/* Top Toolbar */}
      <div className="flex-shrink-0 h-12 flex items-center gap-3 px-4 border-b" style={{ background: "var(--bg-secondary)", borderColor: "rgba(0,242,255,0.15)" }}>
        <Link href="/dashboard" className="flex items-center gap-1 text-xs transition-colors" style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--neon-cyan)")} onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}>
          <ArrowLeft size={14} /> BACK
        </Link>
        <div className="w-px h-6" style={{ background: "rgba(0,242,255,0.15)" }} />
        <Hexagon size={16} style={{ fill: "rgba(0,242,255,0.15)", stroke: "#00f2ff" }} />
        <span className="font-display font-bold text-sm text-neon-cyan tracking-wider truncate max-w-xs" style={{ fontFamily: "var(--font-display)" }}>
          {project?.name}
        </span>
        <div className="flex-1" />

        {/* Sim Controls */}
        <div className="flex items-center gap-2">
          {simState === "idle" || simState === "paused" ? (
            <button id="toolbar-run" onClick={() => setSimState("running")} className="btn-cyber-primary" style={{ padding: "4px 12px", fontSize: "0.7rem" }}>
              <Play size={12} /> RUN
            </button>
          ) : (
            <button id="toolbar-pause" onClick={() => setSimState("paused")} className="btn-cyber-ghost" style={{ padding: "4px 12px", fontSize: "0.7rem" }}>
              <Pause size={12} /> PAUSE
            </button>
          )}
          <button id="toolbar-stop" onClick={() => setSimState("idle")} className="btn-cyber-ghost" style={{ padding: "4px 10px", fontSize: "0.7rem" }}>
            <Square size={12} />
          </button>
          <div className="flex items-center gap-1">
            <FastForward size={12} style={{ color: "var(--text-muted)" }} />
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}
              className="text-xs rounded px-1 py-0.5" style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(0,242,255,0.2)", color: "var(--neon-cyan)", fontFamily: "var(--font-mono)" }}>
              {speedOptions.map((s) => <option key={s} value={s}>{s}x</option>)}
            </select>
          </div>
        </div>

        <div className="w-px h-6" style={{ background: "rgba(0,242,255,0.15)" }} />
        <div className="flex items-center gap-1.5 text-xs" style={{ fontFamily: "var(--font-mono)", color: saved ? "var(--neon-green)" : "var(--neon-yellow)" }}>
          <Save size={12} />
          {saved ? "SAVED" : "SAVING..."}
        </div>
      </div>

      {/* 4-Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Node Palette */}
        <div className="w-48 flex-shrink-0 overflow-y-auto border-r" style={{ borderColor: "rgba(0,242,255,0.1)", background: "var(--bg-secondary)" }}>
          <NodePalette simType={project?.sim_type || "human_queue"} />
        </div>

        {/* Center-Left: React Flow Canvas */}
        <div className="flex-1 min-w-0">
          <NodeCanvas
            nodes={nodes}
            edges={edges}
            onChange={onGraphChange}
            simState={simState}
            simType={project?.sim_type || "human_queue"}
          />
        </div>

        {/* Center-Right: Pixi.js Viewport */}
        <div className="w-80 flex-shrink-0 border-l" style={{ borderColor: "rgba(0,242,255,0.1)" }}>
          <ViewportPanel nodes={nodes} simState={simState} simType={project?.sim_type || "human_queue"} />
        </div>

        {/* Right: AI Chat */}
        <div className="w-72 flex-shrink-0 border-l" style={{ borderColor: "rgba(0,242,255,0.1)" }}>
          <AIChatPanel
            simType={project?.sim_type || "human_queue"}
            currentGraph={{ nodes, edges }}
            onGraphGenerated={(n, e) => onGraphChange(n, e)}
          />
        </div>
      </div>
    </div>
  );
}
