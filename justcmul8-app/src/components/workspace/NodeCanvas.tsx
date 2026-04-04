"use client";
import React, { useCallback } from "react";
import {
  ReactFlow, ReactFlowProvider,
  Background, Controls, MiniMap, addEdge, useNodesState, useEdgesState,
  type Connection, type Edge, type Node, BackgroundVariant, type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { SimState } from "@/app/dashboard/project/[id]/page";

// Node color map matching palette
const NODE_COLORS: Record<string, string> = {
  source: "#00f2ff",
  queue: "#fbbf24",
  resource: "#10b981",
  service: "#f97316",
  decision: "#7000ff",
  sink: "#ef4444",
  priority_resource: "#fbbf24",
  container: "#00f2ff",
  store: "#7000ff",
  event_trigger: "#ff00ff",
};

const NODE_LABELS: Record<string, string> = {
  source: "Source", queue: "Queue", resource: "Resource",
  service: "Service", decision: "Decision", sink: "Sink",
  priority_resource: "Priority Resource", container: "Container",
  store: "Store", event_trigger: "Event Trigger",
};

function CyberNode({ data, selected }: { data: any; selected: boolean }) {
  const color = NODE_COLORS[data.nodeType] || "#00f2ff";
  return (
    <div style={{
      background: "rgba(0,0,0,0.75)",
      border: `1px solid ${color}${selected ? "ff" : "60"}`,
      borderLeft: `3px solid ${color}`,
      borderRadius: "4px",
      padding: "8px 12px",
      minWidth: "120px",
      boxShadow: selected ? `0 0 12px ${color}50` : `0 0 4px ${color}20`,
      fontFamily: "var(--font-body)",
    }}>
      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#fff" }}>{data.label}</div>
      {data.params && (
        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
          {JSON.stringify(data.params)}
        </div>
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = { cyberNode: CyberNode as any };

let nodeIdCounter = 1;

interface NodeCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onChange: (nodes: Node[], edges: Edge[]) => void;
  simState: SimState;
  simType: string;
}

export default function NodeCanvas({ nodes: initNodes, edges: initEdges, onChange, simState, simType }: NodeCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges);
  const reactFlowWrapper = React.useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = React.useState<any>(null);

  React.useEffect(() => {
    onChange(nodes, edges);
  }, [nodes, edges]);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ ...params, animated: simState === "running" }, eds));
  }, [simState]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const nodeType = e.dataTransfer.getData("application/reactflow");
    if (!nodeType || !reactFlowInstance) return;
    const bounds = reactFlowWrapper.current?.getBoundingClientRect();
    const position = reactFlowInstance.screenToFlowPosition({
      x: e.clientX - (bounds?.left || 0),
      y: e.clientY - (bounds?.top || 0),
    });
    const newNode: Node = {
      id: `node_${nodeIdCounter++}`,
      type: "cyberNode",
      position,
      data: { label: NODE_LABELS[nodeType] || nodeType, nodeType },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [reactFlowInstance]);

  return (
    <div ref={reactFlowWrapper} className="w-full h-full cyber-grid-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode="Delete"
        style={{ background: "transparent" }}
      >
        <Background variant={BackgroundVariant.Dots} size={1} color="rgba(0,242,255,0.08)" gap={24} />
        <Controls />
        <MiniMap
          nodeColor={(n) => NODE_COLORS[(n.data as any)?.nodeType] || "#00f2ff"}
          maskColor="rgba(10,10,20,0.7)"
        />
      </ReactFlow>
    </div>
  );
}
