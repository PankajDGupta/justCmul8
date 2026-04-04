"use client";
import React from "react";
import type { SimState } from "@/app/dashboard/project/[id]/page";

const SIM_ICONS: Record<string, string[]> = {
  human_queue: ["🧍", "🧍‍♀️", "🧍‍♂️"],
  vehicle: ["🚗", "🚙", "🚐"],
  liquid: ["💧", "🔵", "⚪"],
  manufacturing: ["⚙️", "🔧", "📦"],
  logistics: ["📦", "🚛", "📫"],
};

interface ViewportPanelProps {
  nodes: any[];
  simState: SimState;
  simType: string;
}

interface Entity {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  icon: string;
  color: string;
}

let entityCounter = 0;

export default function ViewportPanel({ nodes, simState, simType }: ViewportPanelProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const entities = React.useRef<Entity[]>([]);
  const animFrame = React.useRef<number>(0);
  const icons = SIM_ICONS[simType] || SIM_ICONS.human_queue;

  // Spawn entities when running
  React.useEffect(() => {
    if (simState !== "running") return;
    const interval = setInterval(() => {
      if (entities.current.length < 15) {
        entities.current.push({
          id: entityCounter++,
          x: 20,
          y: 40 + Math.random() * 140,
          targetX: 20 + Math.random() * 260,
          targetY: 20 + Math.random() * 180,
          icon: icons[Math.floor(Math.random() * icons.length)],
          color: ["#00f2ff", "#10b981", "#fbbf24"][Math.floor(Math.random() * 3)],
        });
      }
    }, 800);
    return () => clearInterval(interval);
  }, [simState, icons]);

  // Clear on stop
  React.useEffect(() => {
    if (simState === "idle") entities.current = [];
  }, [simState]);

  // Animation loop
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function draw() {
      const w = canvas!.width;
      const h = canvas!.height;
      ctx.clearRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = "rgba(0,242,255,0.06)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      // Scanlines
      ctx.fillStyle = "rgba(0,0,0,0.04)";
      for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 2);

      if (simState === "idle") {
        ctx.fillStyle = "rgba(0,242,255,0.3)";
        ctx.font = "10px JetBrains Mono, monospace";
        ctx.textAlign = "center";
        ctx.fillText("VIEWPORT READY • RUN SIMULATION TO ANIMATE", w / 2, h / 2);
        return;
      }

      // Move and draw entities
      entities.current = entities.current.filter((e) => e.x < w + 30);
      entities.current.forEach((ent) => {
        const dx = ent.targetX - ent.x;
        const dy = ent.targetY - ent.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 2) { ent.x += (dx / dist) * 1.5; ent.y += (dy / dist) * 1.5; }
        else { ent.targetX = 20 + Math.random() * (w - 40); ent.targetY = 20 + Math.random() * (h - 40); }

        // Glow
        ctx.shadowColor = ent.color;
        ctx.shadowBlur = 8;
        ctx.font = "16px serif";
        ctx.textAlign = "center";
        ctx.fillText(ent.icon, ent.x, ent.y);
        ctx.shadowBlur = 0;
      });

      animFrame.current = requestAnimationFrame(draw);
    }

    animFrame.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrame.current);
  }, [simState]);

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--bg-secondary)" }}>
      <div className="px-3 py-2 flex items-center gap-2 border-b" style={{ borderColor: "rgba(0,242,255,0.1)" }}>
        <span className="text-xs tracking-widest" style={{ fontFamily: "var(--font-mono)", color: "var(--neon-cyan)" }}>2D VIEWPORT</span>
        {simState === "running" && (
          <span className="ml-auto w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--neon-green)" }} />
        )}
      </div>
      <div className="flex-1 relative overflow-hidden scanlines">
        <canvas
          ref={canvasRef}
          width={320}
          height={400}
          className="w-full h-full"
          style={{ display: "block" }}
        />
      </div>
    </div>
  );
}
