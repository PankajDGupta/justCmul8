# Specification: Source Node (Entity Generator)

This functional specification defines the requirements for the **Source Node** module, which serves as the primary architect for injecting dynamic components into a simulated system environment.

---

## Implementation

### 1. Arrival Logic (Stochastic & Deterministic)
* **Stochastic (HPP):** Support constant rate $\lambda$ arrivals using exponential inter-arrival distributions to model random processes.
* **Stochastic (NHPP):** Implement time-varying arrival rates $\lambda(t)$ where the arrival rate is a function of time, suitable for environments like emergency departments.
* **NHPP Algorithms:** Support the **Thinning approach** (using a majorizing rate $\bar{\lambda}$) and **Non-linear Time Transformation** for generating complex arrival patterns.
* **Table-Driven:** Allow arrivals to be generated according to specific timestamps and quantities defined in an external database or CSV.

### 2. Entity Property Initialization
* **Entities per Arrival:** Define the number of units entering the system simultaneously using integers or statistical distributions (e.g., $Disc(0.2, 1, 0.5, 2)$).
* **Attribute Binding (Labels):** Initialize internal states, relational keys, or priority levels (e.g., `lbl_Priority`) at the moment of entity creation.
* **Probabilistic Part Mix:** Support "RandomRow" selection based on weighted proportions to facilitate the generation of heterogeneous populations.

### 3. Lifecycle Actions & Programmatic Logic
* **State Hooks:** Execute custom code "On Before Arrival" (setup logic), "On At Exit" (initialization), or "On Discard".
* **Performance Profiling:** Support `TimeMeasureStart` to establish entry timestamps for calculating lead-time KPIs and system throughput.
* **Distributed System Mapping:** Provide "Host Emulation" to profile kernel launch timing and network synchronization for distributed AI operations.

### 4. Operational Constraints & Boundaries
* **Max Arrivals:** Limit the total count of entities generated to prevent model saturation.
* **Duration Limit:** Automatically terminate entity arrivals after a specific elapsed simulation time (e.g., 120 minutes).
* **Shift Synchronization:** Integrate with operational shift patterns to stop arrivals during off-hours or maintenance periods.

---

## Entity Taxonomy Support

| Entity Type | Definition & Role | Required Source Node Properties |
| :--- | :--- | :--- |
| **Transient Entity** | Passive units of work (parts, customers) | Inter-arrival distributions, initial priority |
| **Stateful Agent** | Autonomous entities with internal logic | Statechart initialization, custom class binding |
| **Network Packet** | Data units for communication simulation | Message size $M$, protocol-specific timing |
| **Continuous Flow** | Fluid or bulk material representation | Initial flow rate, volume, and tank level |

---

## Scope Limits

* **No Change to Shape Rendering:** Do not modify the visual representation of shapes inherited from previous units.
* **No Change to Drag/Drop Logic:** Keep the shape panel and drag preview interactions consistent with existing canvas standards.
* **Focus on Generation:** This specification is strictly focused on arrival logic and attribute initialization, not downstream processing.

---

## Check When Done

* [ ] Nodes correctly trigger arrival events based on defined inter-arrival distributions.
* [ ] NHPP arrivals correctly follow time-varying schedules $\lambda(t)$.
* [ ] Initial attribute assignment (labels) is successfully bound to entities upon creation.
* [ ] "Entities per Arrival" logic correctly batches entities for simultaneous entry.
* [ ] The node respects `Max Arrivals` and `Duration Limit` constraints.
* [ ] Programmatic hooks (`On At Exit`) execute without disrupting the event list flow.
* [ ] `npm run build` passes without type errors.