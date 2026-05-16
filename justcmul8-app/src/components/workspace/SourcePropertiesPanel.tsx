import React from "react";
import { Clock, Users, Route, Tag, Shuffle, BarChart2, Calendar, Code, Zap, Plus, Trash2 } from "lucide-react";

const inputCls = "w-full bg-black/50 border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 transition-colors";
const inputStyle = { borderColor: "rgba(0,242,255,0.2)" };
const selectCls = inputCls;
const labelCls = "text-xs text-gray-400 mb-1 block";
const sectionCls = "space-y-3 pt-4 border-t";
const sectionBorderStyle = { borderColor: "rgba(255,255,255,0.08)" };
const sectionHeadingCls = "text-xs font-bold tracking-widest mb-2 flex items-center gap-1.5";

function SH({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <div className={sectionHeadingCls} style={{ color: "var(--neon-cyan)" }}>
      <Icon size={12} />{children}
    </div>
  );
}

function Toggle({ value, onToggle, labelOn, labelOff, color = "cyan" }: { value: boolean; onToggle: () => void; labelOn: string; labelOff: string; color?: string }) {
  const c = color === "pink" ? { bg: "rgba(255,0,128,0.2)", bc: "#ff0080", text: "#ff0080" } : { bg: "rgba(0,242,255,0.2)", bc: "rgba(0,242,255,0.5)", text: "var(--neon-cyan)" };
  return (
    <button onClick={onToggle}
      className="px-3 py-1 rounded text-xs font-mono transition-all"
      style={{ background: value ? c.bg : "rgba(255,255,255,0.05)", border: "1px solid", borderColor: value ? c.bc : "rgba(255,255,255,0.1)", color: value ? c.text : "var(--text-muted)" }}>
      {value ? labelOn : labelOff}
    </button>
  );
}

function AddBtn({ onClick, label = "ADD" }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono"
      style={{ background: "rgba(0,242,255,0.1)", color: "var(--neon-cyan)", border: "1px solid rgba(0,242,255,0.2)" }}>
      <Plus size={10} />{label}
    </button>
  );
}

export default function SourceProperties({ params, nodeId, onUpdate }: { params: any; nodeId: string; onUpdate: (id: string, data: any) => void }) {
  function setParam(key: string, value: any) {
    onUpdate(nodeId, { params: { ...params, [key]: value } });
  }

  // ── Schedule helpers ────────────────────────────────────────────────────────
  const schedule: { simTime: number; count: number }[] = params.schedule || [];
  const useSchedule = schedule.length > 0;
  const isNhpp = (params.distribution || "exponential").startsWith("nhpp_");

  // ── NHPP rate table helpers ─────────────────────────────────────────────────
  const nhppRates: { simTime: number; rate: number }[] = params.nhppRates || [];

  // ── Entity labels helpers ───────────────────────────────────────────────────
  const entityLabels: { key: string; value: string }[] = params.entityLabels || [];

  // ── Part mix helpers ────────────────────────────────────────────────────────
  const partMix: { entityClass: string; weight: number }[] = params.partMix || [];

  // ── Shift windows helpers ───────────────────────────────────────────────────
  const shiftWindows: { startTime: number; endTime: number }[] = params.shiftWindows || [];

  return (
    <>
      {/* ── 1. Arrival Timing ────────────────────────────────────────────────── */}
      <div className={sectionCls} style={sectionBorderStyle}>
        <SH icon={Clock}>Arrival Timing</SH>

        {/* Infinite / Max cap */}
        <div className="flex items-center justify-between">
          <label className={labelCls + " mb-0"}>Infinite Arrivals</label>
          <Toggle value={!!params.infiniteArrivals} labelOn="∞ ON" labelOff="∞ OFF"
            onToggle={() => {
              const nv = !params.infiniteArrivals;
              onUpdate(nodeId, { params: { ...params, infiniteArrivals: nv, maxEntities: nv ? undefined : params.maxEntities } });
            }} />
        </div>

        {!params.infiniteArrivals && (
          <div>
            <label className={labelCls}>Max Entities (cap)</label>
            <input type="number" min={1} value={params.maxEntities || ""} placeholder="Unlimited"
              onChange={(e) => setParam("maxEntities", e.target.value === "" ? undefined : Number(e.target.value))}
              className={inputCls} style={inputStyle} />
          </div>
        )}

        {/* Duration Limit */}
        <div>
          <label className={labelCls}>Source Duration Limit (sim-time)</label>
          <input type="number" min={0} value={params.durationLimit ?? ""} placeholder="No limit"
            onChange={(e) => setParam("durationLimit", e.target.value === "" ? undefined : Number(e.target.value))}
            className={inputCls} style={inputStyle} />
          <p className="text-[10px] text-gray-500 mt-1">Stop arrivals after this sim-time regardless of global duration.</p>
        </div>

        {/* Mode selector: Rate / Schedule */}
        <div className="flex rounded overflow-hidden border" style={{ borderColor: "rgba(0,242,255,0.15)" }}>
          {["Rate-Based", "Schedule"].map((mode) => {
            const active = mode === "Schedule" ? useSchedule : !useSchedule;
            return (
              <button key={mode}
                onClick={() => {
                  if (mode === "Schedule" && !useSchedule) setParam("schedule", [{ simTime: 0, count: 1 }]);
                  if (mode === "Rate-Based" && useSchedule) setParam("schedule", []);
                }}
                className="flex-1 py-1.5 text-[11px] font-mono font-bold transition-all"
                style={{ background: active ? "rgba(0,242,255,0.15)" : "transparent", color: active ? "var(--neon-cyan)" : "var(--text-muted)" }}>
                {mode}
              </button>
            );
          })}
        </div>

        {!useSchedule ? (
          <>
            {/* Distribution selector incl. NHPP */}
            <div>
              <label className={labelCls}>Inter-Arrival Distribution</label>
              <select value={params.distribution || "exponential"} onChange={(e) => setParam("distribution", e.target.value)} className={selectCls} style={inputStyle}>
                <option value="exponential">Exponential – HPP (memoryless)</option>
                <option value="uniform">Uniform (min/max range)</option>
                <option value="normal">Normal (Gaussian)</option>
                <option value="deterministic">Deterministic (fixed)</option>
                <option value="poisson">Poisson</option>
                <option value="nhpp_thinning">NHPP – Thinning (Lewis-Shedler)</option>
                <option value="nhpp_time_transform">NHPP – Non-linear Time Transform</option>
              </select>
            </div>

            {!isNhpp && (
              <div>
                <label className={labelCls}>Arrival Rate (entities / time unit)</label>
                <input type="number" min={0.0001} step={0.1} value={params.arrivalRate ?? 1}
                  onChange={(e) => setParam("arrivalRate", Number(e.target.value))}
                  className={inputCls} style={inputStyle} />
                <p className="text-[10px] text-gray-500 mt-1">
                  Mean inter-arrival = {params.arrivalRate > 0 ? (1 / params.arrivalRate).toFixed(2) : "∞"} units
                </p>
              </div>
            )}

            {/* NHPP rate table */}
            {isNhpp && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className={labelCls + " mb-0"}>λ(t) Rate Table</label>
                  <AddBtn onClick={() => {
                    const last = nhppRates[nhppRates.length - 1];
                    setParam("nhppRates", [...nhppRates, { simTime: last ? last.simTime + 10 : 0, rate: 1 }]);
                  }} />
                </div>
                <div className="grid grid-cols-[1fr_1fr_auto] gap-1 text-[10px] text-gray-500 font-mono px-1">
                  <span>Sim Time</span><span>Rate λ(t)</span><span />
                </div>
                {nhppRates.map((r, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-1 items-center">
                    <input type="number" min={0} value={r.simTime}
                      onChange={(e) => setParam("nhppRates", nhppRates.map((x, j) => j === i ? { ...x, simTime: Number(e.target.value) } : x))}
                      className="bg-black/50 border rounded px-2 py-1 text-xs text-white focus:outline-none" style={inputStyle} />
                    <input type="number" min={0} step={0.1} value={r.rate}
                      onChange={(e) => setParam("nhppRates", nhppRates.map((x, j) => j === i ? { ...x, rate: Number(e.target.value) } : x))}
                      className="bg-black/50 border rounded px-2 py-1 text-xs text-white focus:outline-none" style={inputStyle} />
                    <button onClick={() => setParam("nhppRates", nhppRates.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 p-1"><Trash2 size={12} /></button>
                  </div>
                ))}
                {nhppRates.length === 0 && <p className="text-[10px] text-gray-600 italic px-1">No entries. Click ADD.</p>}

                <div>
                  <label className={labelCls}>Majorizing Rate λ̄ (auto if blank)</label>
                  <input type="number" min={0} step={0.1} value={params.nhppMajorizingRate ?? ""}
                    placeholder="Auto (max of table)"
                    onChange={(e) => setParam("nhppMajorizingRate", e.target.value === "" ? undefined : Number(e.target.value))}
                    className={inputCls} style={inputStyle} />
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Schedule table */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={labelCls + " mb-0"}>Arrival Schedule</label>
                <AddBtn onClick={() => {
                  const last = schedule[schedule.length - 1];
                  setParam("schedule", [...schedule, { simTime: last ? last.simTime + 10 : 0, count: 1 }]);
                }} />
              </div>
              <div className="space-y-1.5">
                <div className="grid grid-cols-[1fr_1fr_auto] gap-1 text-[10px] text-gray-500 font-mono px-1">
                  <span>Sim Time</span><span>Count</span><span />
                </div>
                {schedule.map((entry, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-1 items-center">
                    <input type="number" min={0} value={entry.simTime}
                      onChange={(e) => setParam("schedule", schedule.map((x, i) => i === idx ? { ...x, simTime: Number(e.target.value) } : x))}
                      className="bg-black/50 border rounded px-2 py-1 text-xs text-white focus:outline-none" style={inputStyle} />
                    <input type="number" min={1} value={entry.count}
                      onChange={(e) => setParam("schedule", schedule.map((x, i) => i === idx ? { ...x, count: Number(e.target.value) } : x))}
                      className="bg-black/50 border rounded px-2 py-1 text-xs text-white focus:outline-none" style={inputStyle} />
                    <button onClick={() => setParam("schedule", schedule.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 p-1"><Trash2 size={12} /></button>
                  </div>
                ))}
                {schedule.length === 0 && <p className="text-[10px] text-gray-600 italic px-1">No entries. Click ADD.</p>}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className={labelCls + " mb-0"}>Recurring Schedule</label>
              <Toggle value={!!params.scheduleRecurring} labelOn="Repeating" labelOff="One-Time"
                onToggle={() => setParam("scheduleRecurring", !params.scheduleRecurring)} />
            </div>
          </>
        )}
      </div>

      {/* ── 2. Batch / Entities per Arrival ─────────────────────────────────── */}
      <div className={sectionCls} style={sectionBorderStyle}>
        <SH icon={Users}>Entities per Arrival (Batch)</SH>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Count (mean)</label>
            <input type="number" min={1} value={params.entitiesPerArrival ?? 1}
              onChange={(e) => setParam("entitiesPerArrival", Number(e.target.value))}
              className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className={labelCls}>Batch Distribution</label>
            <select value={params.batchDistribution || "deterministic"}
              onChange={(e) => setParam("batchDistribution", e.target.value)}
              className={selectCls} style={inputStyle}>
              <option value="deterministic">Fixed</option>
              <option value="poisson">Poisson</option>
              <option value="uniform">Uniform ±1</option>
            </select>
          </div>
        </div>
        <p className="text-[10px] text-gray-500">Entities spawned simultaneously per arrival event.</p>
      </div>

      {/* ── 3. Entity Attributes ─────────────────────────────────────────────── */}
      <div className={sectionCls} style={sectionBorderStyle}>
        <SH icon={Tag}>Entity Attributes</SH>
        <p className="text-[10px] text-gray-500 -mt-1">Stamped on every entity at creation (Attribute Binding).</p>

        <div>
          <label className={labelCls}>Entity Class / Type</label>
          <select value={params.entityClass || "customer"} onChange={(e) => setParam("entityClass", e.target.value)} className={selectCls} style={inputStyle}>
            <option value="customer">Customer</option>
            <option value="patient">Patient</option>
            <option value="staff">Staff Member</option>
            <option value="vip">VIP</option>
            <option value="standard">Standard</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>Priority Level</label>
          <select value={params.priorityLevel || "standard"} onChange={(e) => setParam("priorityLevel", e.target.value)} className={selectCls} style={inputStyle}>
            <option value="standard">Standard (default)</option>
            <option value="priority">Priority (faster service)</option>
            <option value="urgent">Urgent (highest priority)</option>
          </select>
        </div>

        {/* Custom KV Labels */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelCls + " mb-0"}>Custom Labels (key=value)</label>
            <AddBtn onClick={() => setParam("entityLabels", [...entityLabels, { key: "", value: "" }])} />
          </div>
          {entityLabels.map((lbl, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-1 items-center mb-1">
              <input type="text" placeholder="key" value={lbl.key}
                onChange={(e) => setParam("entityLabels", entityLabels.map((x, j) => j === i ? { ...x, key: e.target.value } : x))}
                className="bg-black/50 border rounded px-2 py-1 text-xs text-white focus:outline-none" style={inputStyle} />
              <input type="text" placeholder="value" value={lbl.value}
                onChange={(e) => setParam("entityLabels", entityLabels.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                className="bg-black/50 border rounded px-2 py-1 text-xs text-white focus:outline-none" style={inputStyle} />
              <button onClick={() => setParam("entityLabels", entityLabels.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 p-1"><Trash2 size={12} /></button>
            </div>
          ))}
          {entityLabels.length === 0 && <p className="text-[10px] text-gray-600 italic">No labels. Click ADD.</p>}
        </div>
      </div>

      {/* ── 4. Probabilistic Part Mix ─────────────────────────────────────────── */}
      <div className={sectionCls} style={sectionBorderStyle}>
        <SH icon={Shuffle}>Probabilistic Part Mix</SH>
        <p className="text-[10px] text-gray-500 -mt-1">RandomRow: entity class sampled by weight each arrival.</p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400">Overrides Entity Class when active.</span>
          <AddBtn onClick={() => setParam("partMix", [...partMix, { entityClass: "customer", weight: 50 }])} />
        </div>
        {partMix.length > 0 && (
          <div className="space-y-1.5">
            <div className="grid grid-cols-[1fr_80px_auto] gap-1 text-[10px] text-gray-500 font-mono px-1">
              <span>Entity Class</span><span>Weight</span><span />
            </div>
            {partMix.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_auto] gap-1 items-center">
                <input type="text" value={row.entityClass}
                  onChange={(e) => setParam("partMix", partMix.map((x, j) => j === i ? { ...x, entityClass: e.target.value } : x))}
                  className="bg-black/50 border rounded px-2 py-1 text-xs text-white focus:outline-none" style={inputStyle} />
                <input type="number" min={0} value={row.weight}
                  onChange={(e) => setParam("partMix", partMix.map((x, j) => j === i ? { ...x, weight: Number(e.target.value) } : x))}
                  className="bg-black/50 border rounded px-2 py-1 text-xs text-white focus:outline-none" style={inputStyle} />
                <button onClick={() => setParam("partMix", partMix.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 p-1"><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 5. Routing Logic ──────────────────────────────────────────────────── */}
      <div className={sectionCls} style={sectionBorderStyle}>
        <SH icon={Route}>Routing Logic</SH>
        <div>
          <label className={labelCls}>Output Routing Mode</label>
          <select value={params.routingMode || "round_robin"} onChange={(e) => setParam("routingMode", e.target.value)} className={selectCls} style={inputStyle}>
            <option value="round_robin">Round Robin (balanced)</option>
            <option value="broadcast">Broadcast (send to ALL)</option>
            <option value="priority">Priority (entity class drives route)</option>
          </select>
        </div>
      </div>

      {/* ── 6. Shift Synchronisation ──────────────────────────────────────────── */}
      <div className={sectionCls} style={sectionBorderStyle}>
        <SH icon={Calendar}>Shift Synchronisation</SH>
        <p className="text-[10px] text-gray-500 -mt-1">Arrivals are blocked outside configured shift windows.</p>
        <div className="flex justify-end">
          <AddBtn label="ADD SHIFT" onClick={() => setParam("shiftWindows", [...shiftWindows, { startTime: 0, endTime: 60 }])} />
        </div>
        {shiftWindows.length > 0 && (
          <div className="space-y-1.5">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-1 text-[10px] text-gray-500 font-mono px-1">
              <span>Start Time</span><span>End Time</span><span />
            </div>
            {shiftWindows.map((w, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-1 items-center">
                <input type="number" min={0} value={w.startTime}
                  onChange={(e) => setParam("shiftWindows", shiftWindows.map((x, j) => j === i ? { ...x, startTime: Number(e.target.value) } : x))}
                  className="bg-black/50 border rounded px-2 py-1 text-xs text-white focus:outline-none" style={inputStyle} />
                <input type="number" min={0} value={w.endTime}
                  onChange={(e) => setParam("shiftWindows", shiftWindows.map((x, j) => j === i ? { ...x, endTime: Number(e.target.value) } : x))}
                  className="bg-black/50 border rounded px-2 py-1 text-xs text-white focus:outline-none" style={inputStyle} />
                <button onClick={() => setParam("shiftWindows", shiftWindows.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 p-1"><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 7. KPI Profiling ──────────────────────────────────────────────────── */}
      <div className={sectionCls} style={sectionBorderStyle}>
        <SH icon={BarChart2}>KPI Profiling</SH>
        <div className="flex items-center justify-between">
          <div>
            <label className={labelCls + " mb-0"}>TimeMeasureStart</label>
            <p className="text-[10px] text-gray-500">Stamps arrivalTime on each entity for lead-time KPIs.</p>
          </div>
          <Toggle value={!!params.timeMeasureStart} labelOn="ON" labelOff="OFF"
            onToggle={() => setParam("timeMeasureStart", !params.timeMeasureStart)} />
        </div>
      </div>

      {/* ── 8. Lifecycle Hooks ────────────────────────────────────────────────── */}
      <div className={sectionCls} style={sectionBorderStyle}>
        <SH icon={Code}>Lifecycle Hooks</SH>
        <p className="text-[10px] text-gray-500 -mt-1">Python snippets — use <code>env</code>, <code>entity</code>, <code>random</code>.</p>

        {[
          { key: "onBeforeArrival", label: "On Before Arrival", hint: "Runs before each batch is spawned." },
          { key: "onAtExit", label: "On At Exit", hint: "Runs after entity dict is built." },
          { key: "onDiscard", label: "On Discard", hint: "Runs when entity is dropped (cap/shift)." },
        ].map(({ key, label, hint }) => (
          <div key={key}>
            <label className={labelCls}>{label}</label>
            <p className="text-[10px] text-gray-600 mb-1">{hint}</p>
            <textarea rows={3} value={params[key] || ""} placeholder={`# ${label}`}
              onChange={(e) => setParam(key, e.target.value)}
              className="w-full bg-black/60 border rounded px-3 py-2 text-xs text-green-300 font-mono focus:outline-none focus:border-cyan-400 resize-y"
              style={inputStyle} />
          </div>
        ))}
      </div>
    </>
  );
}
