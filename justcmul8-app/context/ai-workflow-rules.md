# AI Workflow Rules

## Approach

Build JustCmul8 incrementally using a spec-driven workflow. The files inside
`context/` define what to build, how to build it, and the current state of
progress. The files in `spec/` (especially `spec/nodes/*.md`) are the
authoritative source of truth for simulation node behaviour.

Always implement against these specs — do not infer or invent behaviour from
scratch. If a spec is silent on a detail, resolve it in the relevant context
file before writing code.

## Scoping Rules

- Work on one feature unit at a time (e.g. one node type, one panel, one API
  route).
- Prefer small, verifiable increments over large speculative changes.
- Do not combine unrelated system boundaries in a single implementation step.
  For example, do not modify the Pyodide worker and the React canvas in the
  same step.

## When to Split Work

Split an implementation step if it combines:

- UI changes and Web Worker / simulation engine changes.
- Multiple unrelated node types in `codeGenerator.ts`.
- A new data model change and the UI that consumes it.
- Behaviour not clearly defined in `spec/nodes/<type>.md`.

If a change cannot be verified end-to-end quickly, the scope is too broad —
split it.

## Handling Missing Requirements

- Do not invent product behaviour not defined in the context or spec files.
- If a requirement is ambiguous, resolve it in the relevant spec or context
  file before implementing.
- If a requirement is missing, add it as an open question in
  `context/progress-tracker.md` before continuing.

## Protected Files

Do not modify the following unless explicitly instructed:

- `samplecontext/*` — template files; never edit, only use as reference.
- `src/components/ui/*` — generated/shared UI primitives.
- `node_modules/*` — third-party library internals.
- `spec/nodes/*.md` — canonical node specs; discuss changes in
  `progress-tracker.md` first.

## Keeping Docs in Sync

Update the relevant context file whenever an implementation changes:

- System architecture or boundaries → `context/architecture.md`
- Storage model decisions → `context/architecture.md`
- Code conventions or standards → `context/code-standards.md`
- Feature scope or status → `context/progress-tracker.md`
- UI tokens or component library → `context/ui-context.md`

## Before Moving to the Next Unit

1. The current unit works end-to-end within its defined scope.
2. No invariant defined in `context/architecture.md` was violated.
3. `context/progress-tracker.md` reflects the completed work.
4. `npm run build` passes with zero TypeScript errors.
