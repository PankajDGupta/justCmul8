"use client";
import React from "react";

const PALETTE_NODES = {
  core: [
    { type: "source", label: "Source", icon: "⬢", color: "var(--neon-cyan)", desc: "Entity generator" },
    { type: "queue", label: "Queue", icon: "⬢", color: "var(--neon-yellow)", desc: "Waiting buffer" },
    { type: "resource", label: "Resource", icon: "⬢", color: "var(--neon-green)", desc: "Server / machine" },
    { type: "service", label: "Service", icon: "⬢", color: "var(--neon-orange)", desc: "Processing step" },
    { type: "decision", label: "Decision", icon: "⬢", color: "var(--neon-purple)", desc: "Route by condition" },
    { type: "sink", label: "Sink", icon: "⬢", color: "var(--neon-red)", desc: "Termination / KPI" },
  ],
  advanced: [
    { type: "priority_resource", label: "Priority", icon: "⚡", color: "var(--neon-yellow)", desc: "Priority resource" },
    { type: "container", label: "Container", icon: "⚡", color: "var(--neon-cyan)", desc: "Level / tank" },
    { type: "store", label: "Store", icon: "⚡", color: "var(--neon-purple)", desc: "Async store" },
    { type: "event_trigger", label: "Trigger", icon: "⚡", color: "var(--neon-magenta)", desc: "Event condition" },
  ],
};

interface NodePaletteProps { simType: string; }

export default function NodePalette({ simType }: NodePaletteProps) {
  function onDragStart(e: React.DragEvent, nodeType: string) {
    e.dataTransfer.setData("application/reactflow", nodeType);
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <div className="p-2 space-y-4">
      <div className="pt-2 pb-1 px-1">
        <span className="text-xs tracking-widest" style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>NODES</span>
      </div>

      <div className="space-y-1">
        <span className="text-xs px-1" style={{ fontFamily: "var(--font-mono)", color: "var(--neon-green)", opacity: 0.7 }}>CORE</span>
        {PALETTE_NODES.core.map((n) => (
          <div key={n.type} draggable onDragStart={(e) => onDragStart(e, n.type)}
            className="flex items-center gap-2 p-2 rounded cursor-grab active:cursor-grabbing transition-all group"
            style={{ border: "1px solid transparent" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = `${n.color}10`; e.currentTarget.style.borderColor = `${n.color}30`; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}>
            <span style={{ color: n.color, fontSize: "1rem" }}>{n.icon}</span>
            <div>
              <div className="text-xs font-medium text-white" style={{ fontFamily: "var(--font-body)" }}>{n.label}</div>
              <div className="text-xs" style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontSize: "0.65rem" }}>{n.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <span className="text-xs px-1" style={{ fontFamily: "var(--font-mono)", color: "var(--neon-yellow)", opacity: 0.7 }}>ADVANCED</span>
        {PALETTE_NODES.advanced.map((n) => (
          <div key={n.type} draggable onDragStart={(e) => onDragStart(e, n.type)}
            className="flex items-center gap-2 p-2 rounded cursor-grab active:cursor-grabbing transition-all"
            style={{ border: "1px solid transparent" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = `${n.color}10`; e.currentTarget.style.borderColor = `${n.color}30`; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}>
            <span style={{ color: n.color, fontSize: "1rem" }}>{n.icon}</span>
            <div>
              <div className="text-xs font-medium text-white" style={{ fontFamily: "var(--font-body)" }}>{n.label}</div>
              <div className="text-xs" style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontSize: "0.65rem" }}>{n.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
