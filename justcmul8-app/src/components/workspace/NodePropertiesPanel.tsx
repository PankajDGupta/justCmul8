import React from "react";
import type { Node } from "@xyflow/react";
import { SIM_TYPE_REGISTRY } from "@/lib/simulation/simTypeRegistry";
import { Settings, Image as ImageIcon, Type, Clock, Users, Route, Plus, Trash2, Tag, Zap, BarChart2, Calendar, Code, Shuffle } from "lucide-react";
import SourcePropertiesPanel from "./SourcePropertiesPanel";

interface NodePropertiesPanelProps {
  node: Node;
  simType: string;
  onUpdate: (id: string, partialData: any) => void;
}

// ─── Shared input / select styles ─────────────────────────────────────────────
const inputCls = "w-full bg-black/50 border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 transition-colors";
const inputStyle = { borderColor: "rgba(0,242,255,0.2)" };
const selectCls = inputCls;
const labelCls = "text-xs text-gray-400 mb-1 block";
const sectionCls = "space-y-3 pt-4 border-t";
const sectionBorderStyle = { borderColor: "rgba(255,255,255,0.08)" };
const sectionHeadingCls = "text-xs font-bold tracking-widest mb-2 flex items-center gap-1.5";

function SectionHeading({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <div className={sectionHeadingCls} style={{ color: "var(--neon-cyan)" }}>
      <Icon size={12} />
      {children}
    </div>
  );
}

// ─── Source Node Properties → delegated to SourcePropertiesPanel ─────────────
function SourceProperties({ params, nodeId, onUpdate }: { params: any; nodeId: string; onUpdate: (id: string, data: any) => void }) {
  return <SourcePropertiesPanel params={params} nodeId={nodeId} onUpdate={onUpdate} />;
}

/*  ↓ old inline implementation removed – see SourcePropertiesPanel.tsx  */
function _OldSourcePropertiesInline({ params, nodeId, onUpdate }: { params: any; nodeId: string; onUpdate: (id: string, data: any) => void }) {
  function setParam(key: string, value: any) {
    onUpdate(nodeId, { params: { ...params, [key]: value } });
  }

  const schedule: { simTime: number; count: number }[] = params.schedule || [];

  function addScheduleEntry() {
    const last = schedule[schedule.length - 1];
    const newEntry = { simTime: last ? last.simTime + 10 : 0, count: 1 };
    setParam("schedule", [...schedule, newEntry]);
  }

  function updateScheduleEntry(idx: number, field: "simTime" | "count", val: number) {
    const updated = schedule.map((e, i) => i === idx ? { ...e, [field]: val } : e);
    setParam("schedule", updated);
  }

  function removeScheduleEntry(idx: number) {
    setParam("schedule", schedule.filter((_, i) => i !== idx));
  }

  const useSchedule = schedule.length > 0;

  return (
    <>
      {/* ── 1. Arrival Timing ─────────────────────────────────────────────── */}
      <div className={sectionCls} style={sectionBorderStyle}>
        <SectionHeading icon={Clock}>Arrival Timing</SectionHeading>

        {/* Infinite Arrivals Toggle */}
        <div className="flex items-center justify-between">
          <label className={labelCls + " mb-0"}>Infinite Arrivals</label>
          <button
            onClick={() => {
              const newVal = !params.infiniteArrivals;
              const updates: any = { params: { ...params, infiniteArrivals: newVal } };
              if (newVal) updates.params.maxEntities = undefined;
              onUpdate(nodeId, updates);
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-all"
            style={{
              background: params.infiniteArrivals ? "rgba(0,242,255,0.2)" : "rgba(255,255,255,0.05)",
              border: "1px solid",
              borderColor: params.infiniteArrivals ? "rgba(0,242,255,0.5)" : "rgba(255,255,255,0.1)",
              color: params.infiniteArrivals ? "var(--neon-cyan)" : "var(--text-muted)",
            }}
          >
            {params.infiniteArrivals ? "∞ ON" : "∞ OFF"}
          </button>
        </div>

        {/* Max Entities (only when not infinite) */}
        {!params.infiniteArrivals && (
          <div>
            <label className={labelCls}>Max Entities (cap)</label>
            <input
              type="number" min={1}
              value={params.maxEntities || ""}
              placeholder="Unlimited"
              onChange={(e) => setParam("maxEntities", e.target.value === "" ? undefined : Number(e.target.value))}
              className={inputCls} style={inputStyle}
            />
          </div>
        )}

        {/* Mode toggle: rate-based vs schedule */}
        <div className="flex rounded overflow-hidden border" style={{ borderColor: "rgba(0,242,255,0.15)" }}>
          {["Rate-Based", "Schedule"].map((mode) => {
            const active = mode === "Schedule" ? useSchedule : !useSchedule;
            return (
              <button
                key={mode}
                onClick={() => {
                  if (mode === "Schedule" && !useSchedule) addScheduleEntry();
                  if (mode === "Rate-Based" && useSchedule) setParam("schedule", []);
                }}
                className="flex-1 py-1.5 text-[11px] font-mono font-bold transition-all"
                style={{
                  background: active ? "rgba(0,242,255,0.15)" : "transparent",
                  color: active ? "var(--neon-cyan)" : "var(--text-muted)",
                }}
              >
                {mode}
              </button>
            );
          })}
        </div>

        {!useSchedule ? (
          <>
            <div>
              <label className={labelCls}>Inter-Arrival Distribution</label>
              <select value={params.distribution || "exponential"} onChange={(e) => setParam("distribution", e.target.value)} className={selectCls} style={inputStyle}>
                <option value="exponential">Exponential (random, memoryless)</option>
                <option value="uniform">Uniform (min/max range)</option>
                <option value="normal">Normal (Gaussian)</option>
                <option value="deterministic">Deterministic (fixed)</option>
                <option value="poisson">Poisson</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Arrival Rate (entities / time unit)</label>
              <input
                type="number" min={0.0001} step={0.1}
                value={params.arrivalRate ?? 1}
                onChange={(e) => setParam("arrivalRate", Number(e.target.value))}
                className={inputCls} style={inputStyle}
              />
              <p className="text-[10px] text-gray-500 mt-1">Mean inter-arrival time = {params.arrivalRate > 0 ? (1 / params.arrivalRate).toFixed(2) : "∞"} units</p>
            </div>
          </>
        ) : (
          <>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={labelCls + " mb-0"}>Arrival Schedule</label>
                <button
                  onClick={addScheduleEntry}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono"
                  style={{ background: "rgba(0,242,255,0.1)", color: "var(--neon-cyan)", border: "1px solid rgba(0,242,255,0.2)" }}
                >
                  <Plus size={10} /> ADD
                </button>
              </div>
              <div className="space-y-1.5">
                <div className="grid grid-cols-[1fr_1fr_auto] gap-1 text-[10px] text-gray-500 font-mono px-1">
                  <span>Sim Time</span><span>Count</span><span />
                </div>
                {schedule.map((entry, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-1 items-center">
                    <input
                      type="number" min={0}
                      value={entry.simTime}
                      onChange={(e) => updateScheduleEntry(idx, "simTime", Number(e.target.value))}
                      className="bg-black/50 border rounded px-2 py-1 text-xs text-white focus:outline-none"
                      style={inputStyle}
                    />
                    <input
                      type="number" min={1}
                      value={entry.count}
                      onChange={(e) => updateScheduleEntry(idx, "count", Number(e.target.value))}
                      className="bg-black/50 border rounded px-2 py-1 text-xs text-white focus:outline-none"
                      style={inputStyle}
                    />
                    <button onClick={() => removeScheduleEntry(idx)} className="text-red-400 hover:text-red-300 p-1">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {schedule.length === 0 && (
                  <p className="text-[10px] text-gray-600 italic px-1">No entries yet. Click ADD.</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className={labelCls + " mb-0"}>Recurring Schedule</label>
              <button
                onClick={() => setParam("scheduleRecurring", !params.scheduleRecurring)}
                className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-all"
                style={{
                  background: params.scheduleRecurring ? "rgba(0,242,255,0.2)" : "rgba(255,255,255,0.05)",
                  border: "1px solid",
                  borderColor: params.scheduleRecurring ? "rgba(0,242,255,0.5)" : "rgba(255,255,255,0.1)",
                  color: params.scheduleRecurring ? "var(--neon-cyan)" : "var(--text-muted)",
                }}
              >
                {params.scheduleRecurring ? "Repeating" : "One-Time"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── 2. Entity Attributes ──────────────────────────────────────────── */}
      <div className={sectionCls} style={sectionBorderStyle}>
        <SectionHeading icon={Users}>Entity Attributes</SectionHeading>
        <p className="text-[10px] text-gray-500 -mt-1">Attributes stamped on each entity at creation.</p>

        <div>
          <label className={labelCls}>Entity Class / Type</label>
          <select
            value={params.entityClass || "customer"}
            onChange={(e) => setParam("entityClass", e.target.value)}
            className={selectCls} style={inputStyle}
          >
            <option value="customer">Customer</option>
            <option value="patient">Patient</option>
            <option value="staff">Staff Member</option>
            <option value="vip">VIP</option>
            <option value="standard">Standard</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>Priority Level</label>
          <select
            value={params.priorityLevel || "standard"}
            onChange={(e) => setParam("priorityLevel", e.target.value)}
            className={selectCls} style={inputStyle}
          >
            <option value="standard">Standard (default)</option>
            <option value="priority">Priority (faster service)</option>
            <option value="urgent">Urgent (highest priority)</option>
          </select>
          <p className="text-[10px] text-gray-500 mt-1">
            Used by downstream <span style={{ color: "var(--neon-yellow)" }}>Priority Resource</span> nodes.
          </p>
        </div>
      </div>

      {/* ── 3. Routing Logic ──────────────────────────────────────────────── */}
      <div className={sectionCls} style={sectionBorderStyle}>
        <SectionHeading icon={Route}>Routing Logic</SectionHeading>

        <div>
          <label className={labelCls}>Output Routing Mode</label>
          <select
            value={params.routingMode || "round_robin"}
            onChange={(e) => setParam("routingMode", e.target.value)}
            className={selectCls} style={inputStyle}
          >
            <option value="round_robin">Round Robin (balanced distribution)</option>
            <option value="broadcast">Broadcast (send to ALL outputs)</option>
            <option value="priority">Priority (entity class drives route)</option>
          </select>
          <p className="text-[10px] text-gray-500 mt-1">
            {params.routingMode === "broadcast"
              ? "Each entity is duplicated and sent to every connected output node."
              : params.routingMode === "priority"
              ? "Entities are routed based on their Entity Class / Priority Level."
              : "Each entity alternates across connected output nodes evenly."}
          </p>
        </div>
      </div>
    </>
  );
}

// ─── Queue Properties ────────────────────────────────────────────────────────────
function QueueProperties({ params, nodeId, onUpdate }: { params: any; nodeId: string; onUpdate: (id: string, data: any) => void }) {
  function setParam(key: string, value: any) {
    onUpdate(nodeId, { params: { ...params, [key]: value } });
  }

  return (
    <>
      {/* ── 1. Capacity and Discipline ─────────────────────────────────────── */}
      <div className={sectionCls} style={sectionBorderStyle}>
        <SectionHeading icon={Settings}>Capacity & Discipline</SectionHeading>
        
        <div>
          <label className={labelCls}>Capacity (-1 for unlimited)</label>
          <input type="number" value={params?.capacity ?? -1} onChange={(e) => setParam("capacity", Number(e.target.value))} className={inputCls} style={inputStyle} />
        </div>
        
        <div className="mt-3">
          <label className={labelCls}>Discipline</label>
          <select value={params?.discipline || "FIFO"} onChange={(e) => setParam("discipline", e.target.value)} className={selectCls} style={inputStyle}>
            <option value="FIFO">FIFO (First-In, First-Out)</option>
            <option value="LIFO">LIFO (Last-In, First-Out)</option>
            <option value="PRIORITY">Priority</option>
          </select>
        </div>
      </div>

      {/* ── 2. Patience (Reneging) ─────────────────────────────────────────── */}
      <div className={sectionCls} style={sectionBorderStyle}>
        <SectionHeading icon={Clock}>Patience (Renege)</SectionHeading>

        <div>
          <label className={labelCls}>Patience Distribution</label>
          <select
            value={params?.patienceDistribution || "none"}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "none") {
                const newParams = { ...params };
                delete newParams.patienceDistribution;
                delete newParams.patienceTimeout;
                delete newParams.patienceMin;
                delete newParams.patienceMax;
                onUpdate(nodeId, { params: newParams });
              } else {
                onUpdate(nodeId, { params: { ...params, patienceDistribution: val, patienceMin: 1, patienceMax: 3 } });
              }
            }}
            className={selectCls} style={inputStyle}
          >
            <option value="none">Infinite (No Renege)</option>
            <option value="uniform">Uniform (Min/Max)</option>
            <option value="exponential">Exponential (Mean)</option>
            <option value="deterministic">Deterministic (Fixed)</option>
          </select>
        </div>

        {params?.patienceDistribution === "uniform" && (
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div>
              <label className={labelCls}>Min Patience</label>
              <input type="number" value={params?.patienceMin || 1}
                onChange={(e) => setParam("patienceMin", Number(e.target.value))}
                className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className={labelCls}>Max Patience</label>
              <input type="number" value={params?.patienceMax || 3}
                onChange={(e) => setParam("patienceMax", Number(e.target.value))}
                className={inputCls} style={inputStyle} />
            </div>
          </div>
        )}

        {(params?.patienceDistribution === "exponential" || params?.patienceDistribution === "deterministic") && (
          <div className="mt-3">
            <label className={labelCls}>Patience Timeout (Mean)</label>
            <input type="number" value={params?.patienceTimeout || 5}
              onChange={(e) => setParam("patienceTimeout", Number(e.target.value))}
              className={inputCls} style={inputStyle} />
          </div>
        )}
      </div>

      {/* ── 3. Sold-Out / Capacity Broadcast ───────────────────────────────── */}
      <div className={sectionCls} style={sectionBorderStyle}>
        <SectionHeading icon={Zap}>Sold-Out / Broadcast</SectionHeading>

        <div>
          <label className={labelCls}>Sold Out Threshold</label>
          <input type="number" placeholder="e.g. 0" value={params?.soldOutThreshold ?? ""} onChange={(e) => setParam("soldOutThreshold", e.target.value === "" ? undefined : Number(e.target.value))} className={inputCls} style={inputStyle} />
          <p className="text-[10px] text-gray-500 mt-1">Leave empty to disable. Triggers when downstream capacity &lt;= this value.</p>
        </div>

        {params?.soldOutThreshold !== undefined && (
          <div className="flex items-center justify-between mt-3">
            <label className={labelCls + " mb-0"}>Broadcast Renege</label>
            <button
              onClick={() => setParam("broadcastRenege", !params?.broadcastRenege)}
              className="px-2 py-1 rounded text-[10px] font-mono border transition-colors"
              style={{
                background: params?.broadcastRenege ? "rgba(255,0,128,0.2)" : "transparent",
                borderColor: params?.broadcastRenege ? "#ff0080" : "rgba(255,255,255,0.1)",
                color: params?.broadcastRenege ? "#ff0080" : "var(--text-muted)"
              }}
            >
              {params?.broadcastRenege ? "ON" : "OFF"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Store / Buffer Properties ──────────────────────────────────────────────────
function StoreProperties({ params, nodeId, onUpdate }: { params: any; nodeId: string; onUpdate: (id: string, data: any) => void }) {
  function setParam(key: string, value: any) {
    onUpdate(nodeId, { params: { ...params, [key]: value } });
  }

  return (
    <div className={sectionCls} style={sectionBorderStyle}>
      <SectionHeading icon={Settings}>Buffer Settings</SectionHeading>
      
      <div>
        <label className={labelCls}>Capacity (-1 for infinite)</label>
        <input type="number" value={params?.capacity ?? -1} onChange={(e) => setParam("capacity", Number(e.target.value))} className={inputCls} style={inputStyle} />
      </div>

      <div className="flex items-center justify-between mt-3">
        <label className={labelCls + " mb-0"}>Priority Retrieval</label>
        <button
          onClick={() => setParam("isPriority", !params?.isPriority)}
          className="px-2 py-1 rounded text-[10px] font-mono border transition-colors"
          style={{
            background: params?.isPriority ? "rgba(0,242,255,0.2)" : "transparent",
            borderColor: params?.isPriority ? "var(--neon-cyan)" : "rgba(255,255,255,0.1)",
            color: params?.isPriority ? "var(--neon-cyan)" : "var(--text-muted)"
          }}
        >
          {params?.isPriority ? "ON" : "OFF"}
        </button>
      </div>

      <div className="flex items-center justify-between mt-3">
        <label className={labelCls + " mb-0"}>Enable Filter</label>
        <button
          onClick={() => setParam("filterEnabled", !params?.filterEnabled)}
          className="px-2 py-1 rounded text-[10px] font-mono border transition-colors"
          style={{
            background: params?.filterEnabled ? "rgba(255,0,128,0.2)" : "transparent",
            borderColor: params?.filterEnabled ? "#ff0080" : "rgba(255,255,255,0.1)",
            color: params?.filterEnabled ? "#ff0080" : "var(--text-muted)"
          }}
        >
          {params?.filterEnabled ? "ON" : "OFF"}
        </button>
      </div>

      {params?.filterEnabled && (
        <div className="bg-black/30 p-3 rounded mt-3 border space-y-3" style={{ borderColor: "rgba(255,0,128,0.3)" }}>
          <div>
            <label className={labelCls}>Property to Check</label>
            <input type="text" placeholder="e.g. entityClass" value={params?.filterProperty || ""} onChange={(e) => setParam("filterProperty", e.target.value)} className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className={labelCls}>Operator</label>
            <select value={params?.filterOperator || "=="} onChange={(e) => setParam("filterOperator", e.target.value)} className={selectCls} style={inputStyle}>
              <option value="==">Equals (==)</option>
              <option value="!=">Not Equals (!=)</option>
              <option value=">">Greater Than (&gt;)</option>
              <option value="<">Less Than (&lt;)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Value</label>
            <input type="text" placeholder="e.g. vip" value={params?.filterValue || ""} onChange={(e) => setParam("filterValue", e.target.value)} className={inputCls} style={inputStyle} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Resource Properties ──────────────────────────────────────────────────────
function ResourceProperties({ params, nodeId, nodeType, onUpdate }: { params: any; nodeId: string; nodeType: string; onUpdate: (id: string, data: any) => void }) {
  function setParam(key: string, value: any) {
    onUpdate(nodeId, { params: { ...params, [key]: value } });
  }

  return (
    <>
      {/* ── 1. Capacity and Processing ─────────────────────────────────────── */}
      <div className={sectionCls} style={sectionBorderStyle}>
        <SectionHeading icon={Settings}>Capacity & Processing</SectionHeading>
        
        <div>
          <label className={labelCls}>Capacity (Parallel servers)</label>
          <input type="number" min={1} value={params?.capacity || 1} onChange={(e) => setParam("capacity", Number(e.target.value))} className={inputCls} style={inputStyle} />
        </div>
        
        <div className="mt-3">
          <label className={labelCls}>Service Distribution</label>
          <select value={params?.serviceDistribution || "exponential"} onChange={(e) => setParam("serviceDistribution", e.target.value)} className={selectCls} style={inputStyle}>
            <option value="exponential">Exponential</option>
            <option value="uniform">Uniform</option>
            <option value="normal">Normal</option>
            <option value="deterministic">Deterministic</option>
          </select>
        </div>

        <div className="mt-3">
          <label className={labelCls}>Service Time Mean</label>
          <input type="number" min={0} step={0.1} value={params?.serviceTimeMean ?? 1} onChange={(e) => setParam("serviceTimeMean", Number(e.target.value))} className={inputCls} style={inputStyle} />
        </div>
      </div>

      {/* ── 2. Preemption ──────────────────────────────────────────────────── */}
      {nodeType === "priority_resource" && (
        <div className={sectionCls} style={sectionBorderStyle}>
          <SectionHeading icon={Zap}>Preemption</SectionHeading>
          <div className="flex items-center justify-between">
            <label className={labelCls + " mb-0"}>Is Preemptive</label>
            <button
              onClick={() => setParam("isPreemptive", !params?.isPreemptive)}
              className="px-2 py-1 rounded text-[10px] font-mono border transition-colors"
              style={{
                background: params?.isPreemptive ? "rgba(255,0,128,0.2)" : "transparent",
                borderColor: params?.isPreemptive ? "#ff0080" : "rgba(255,255,255,0.1)",
                color: params?.isPreemptive ? "#ff0080" : "var(--text-muted)"
              }}
            >
              {params?.isPreemptive ? "YES" : "NO"}
            </button>
          </div>
          <p className="text-[10px] text-gray-500 mt-1">If YES, high priority entities will interrupt currently processing ones if full.</p>
        </div>
      )}

      {/* ── 3. Reliability (Machine Breakdowns) ────────────────────────────── */}
      <div className={sectionCls} style={sectionBorderStyle}>
        <SectionHeading icon={Zap}>Reliability (Breakdowns)</SectionHeading>

        <div>
          <label className={labelCls}>MTBF (Mean Time Between Failures)</label>
          <input type="number" placeholder="e.g. 100 (empty = no failure)" value={params?.meanTimeBetweenFailures || ""} onChange={(e) => setParam("meanTimeBetweenFailures", e.target.value === "" ? undefined : Number(e.target.value))} className={inputCls} style={inputStyle} />
        </div>

        {params?.meanTimeBetweenFailures !== undefined && (
          <>
            <div className="mt-3">
              <label className={labelCls}>Repair Distribution</label>
              <select value={params?.repairDistribution || "exponential"} onChange={(e) => setParam("repairDistribution", e.target.value)} className={selectCls} style={inputStyle}>
                <option value="exponential">Exponential</option>
                <option value="uniform">Uniform</option>
                <option value="normal">Normal</option>
                <option value="deterministic">Deterministic</option>
              </select>
            </div>
            <div className="mt-3">
              <label className={labelCls}>Repair Time Mean</label>
              <input type="number" min={0} step={0.1} value={params?.repairTimeMean ?? 5} onChange={(e) => setParam("repairTimeMean", Number(e.target.value))} className={inputCls} style={inputStyle} />
            </div>
            <div className="mt-3">
              <label className={labelCls}>Repairman Node ID (Optional)</label>
              <input type="text" placeholder="e.g. node_123" value={params?.repairmanNodeId || ""} onChange={(e) => setParam("repairmanNodeId", e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            {params?.repairmanNodeId && (
              <div className="mt-3">
                <label className={labelCls}>Repair Priority</label>
                <input type="number" value={params?.repairPriority ?? 1} onChange={(e) => setParam("repairPriority", Number(e.target.value))} className={inputCls} style={inputStyle} />
                <p className="text-[10px] text-gray-500 mt-1">Lower number = higher priority when requesting repairman.</p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ─── Interrupter Properties ──────────────────────────────────────────────────
function InterrupterProperties({ params, nodeId, onUpdate }: { params: any; nodeId: string; onUpdate: (id: string, data: any) => void }) {
  function setParam(key: string, value: any) {
    onUpdate(nodeId, { params: { ...params, [key]: value } });
  }
  return (
    <div className={sectionCls} style={sectionBorderStyle}>
      <SectionHeading icon={Settings}>Interrupt Settings</SectionHeading>
      <div>
        <label className={labelCls}>Target Node ID</label>
        <input type="text" placeholder="ID of node to interrupt" value={params?.targetNodeId || ""} onChange={(e) => setParam("targetNodeId", e.target.value)} className={inputCls} style={inputStyle} />
      </div>
      <div className="mt-3">
        <label className={labelCls}>Cause Message</label>
        <input type="text" placeholder="e.g. System Failure" value={params?.cause || ""} onChange={(e) => setParam("cause", e.target.value)} className={inputCls} style={inputStyle} />
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
export default function NodePropertiesPanel({ node, simType, onUpdate }: NodePropertiesPanelProps) {
  const config = SIM_TYPE_REGISTRY[simType as keyof typeof SIM_TYPE_REGISTRY];
  if (!config) return null;

  const data = node.data || {};
  const { nodeType, label, customSprite, params, spriteSize } = data as any;

  const availableSprites = Array.from(new Set(Object.values(config.nodeSprites)));

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--bg-secondary)", fontFamily: "var(--font-body)" }}>
      {/* Header */}
      <div className="p-4 flex items-center gap-2 border-b" style={{ borderColor: "rgba(0,242,255,0.1)" }}>
        <Settings size={16} style={{ color: "var(--neon-cyan)" }} />
        <span className="text-xs tracking-widest font-bold" style={{ color: "var(--neon-cyan)", fontFamily: "var(--font-mono)" }}>
          NODE PROPERTIES
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {/* Label */}
        <div className="space-y-4">
          <div>
            <label className={labelCls + " flex items-center gap-1"}><Type size={12} /> Label / Name</label>
            <input
              type="text"
              value={label || ""}
              onChange={(e) => onUpdate(node.id, { label: e.target.value })}
              className={inputCls} style={inputStyle}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Node Type</label>
            <div className="text-sm px-3 py-2 bg-black/30 rounded border mt-1 capitalize"
              style={{ borderColor: "rgba(255,255,255,0.05)", color: "var(--text-muted)" }}>
              {nodeType?.replace(/_/g, " ")}
            </div>
          </div>
        </div>



        {nodeType === "source" && (
          <SourceProperties params={params || {}} nodeId={node.id} onUpdate={onUpdate} />
        )}

        {nodeType === "queue" && (
          <QueueProperties params={params || {}} nodeId={node.id} onUpdate={onUpdate} />
        )}

        {nodeType === "store" && (
          <StoreProperties params={params || {}} nodeId={node.id} onUpdate={onUpdate} />
        )}

        {nodeType === "interrupter" && (
          <InterrupterProperties params={params || {}} nodeId={node.id} onUpdate={onUpdate} />
        )}

        {(nodeType === "resource" || nodeType === "priority_resource") && (
          <ResourceProperties params={params || {}} nodeId={node.id} nodeType={nodeType} onUpdate={onUpdate} />
        )}

        {/* Generic params viewer for all other node types */}
        {nodeType !== "source" && nodeType !== "queue" && nodeType !== "store" && nodeType !== "interrupter" && nodeType !== "resource" && nodeType !== "priority_resource" && params && Object.keys(params).length > 0 && (
          <div>
            <label className={labelCls}>Simulation Parameters</label>
            <div className="bg-black/50 border rounded p-3 text-xs font-mono" style={{ borderColor: "rgba(0,242,255,0.1)" }}>
              {Object.entries(params).map(([k, v]) => (
                <div key={k} className="flex justify-between mb-1">
                  <span className="text-gray-400">{k}</span>
                  <span className="text-neon-cyan">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
