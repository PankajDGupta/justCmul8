# UI Context

## Theme

Dark only. No light mode. The design language is a high-intensity cyberpunk
technical workspace: near-black backgrounds (`#0a0a0f` / `#0d0d15`), layered
surfaces via glassmorphism, and vivid neon accents (cyan, magenta, yellow, red)
for interactive elements, status indicators, and decorative chrome. The display
font (`Orbitron`) and mono font (`JetBrains Mono`) reinforce the sci-fi / HUD
aesthetic.

## Colors

All components must use these tokens — no hardcoded hex values.

| Role                   | CSS Variable         | Value                        |
| ---------------------- | -------------------- | ---------------------------- |
| Page background        | `--bg-primary`       | `#0a0a0f`                    |
| Secondary background   | `--bg-secondary`     | `#0d0d15`                    |
| Surface (glass)        | `--bg-surface`       | `rgba(0, 0, 0, 0.40)`        |
| Surface alt (glass)    | `--bg-surface-alt`   | `rgba(10, 10, 20, 0.60)`     |
| Primary text           | `--text-primary`     | `#ffffff`                    |
| Secondary text         | `--text-secondary`   | `#9ca3af`                    |
| Muted text             | `--text-muted`       | `#4b5563`                    |
| Accent text            | `--text-accent`      | `#00f2ff`  (= neon cyan)     |
| Neon cyan (primary)    | `--neon-cyan`        | `#00f2ff`                    |
| Neon magenta           | `--neon-magenta`     | `#ff00ff`                    |
| Neon purple            | `--neon-purple`      | `#7000ff`                    |
| Neon green (success)   | `--neon-green`       | `#10b981`                    |
| Neon yellow (warning)  | `--neon-yellow`      | `#fbbf24`                    |
| Neon red (error/alert) | `--neon-red`         | `#ef4444`                    |
| Neon orange            | `--neon-orange`      | `#f97316`                    |

## Typography

| Role         | Font                           | CSS Variable      |
| ------------ | ------------------------------ | ----------------- |
| Display / HUD| Orbitron (wght 400–900)        | `--font-display`  |
| UI body text | Inter (wght 300–700)           | `--font-body`     |
| Code / mono  | JetBrains Mono (wght 400–600)  | `--font-mono`     |

All three are loaded from Google Fonts in `globals.css`. Use the utility
classes `.font-display`, `.font-body`, `.font-mono` to apply them.

## Border Radius

| Context                  | Value  | Usage                                   |
| ------------------------ | ------ | --------------------------------------- |
| Inline / small UI        | `6px`  | Inputs (`.input-cyber`), badges         |
| Cards / panels           | `8px`  | `.glass-panel`, `.glass-panel-heavy`    |
| Modals / overlays        | `12px` | Dialog boxes, confirmation modals       |
| Notched decorative cards | —      | Use `.notched-card` / `.notched-card-sm`|

Cyber buttons (`.btn-cyber-primary`, `.btn-cyber-ghost`, `.btn-cyber-danger`)
use `border-radius: 0` intentionally — they rely on the corner-bracket
`::before` pseudo-element for visual framing.

## Component Library

The project uses **hand-crafted CSS components** (not shadcn/ui or Radix) on
top of Tailwind v4. Reusable patterns are defined as named CSS classes in
`src/app/globals.css`:

| Class                  | Purpose                                                         |
| ---------------------- | --------------------------------------------------------------- |
| `.glass-panel`         | Standard frosted-glass surface with cyan border                 |
| `.glass-panel-heavy`   | Heavier blur, darker surface for overlapping panels             |
| `.notched-card`        | Diagonal corner-cut card (16 px notch)                          |
| `.notched-card-sm`     | Diagonal corner-cut card (10 px notch)                          |
| `.card-cyber`          | Corner-bracket card with `::before` chrome                      |
| `.btn-cyber-primary`   | Cyan corner-bracket button (primary CTA)                        |
| `.btn-cyber-ghost`     | Greyed ghost button that glows cyan on hover                    |
| `.btn-cyber-danger`    | Red corner-bracket button (destructive action)                  |
| `.input-cyber`         | Terminal-style monospaced input field                           |
| `.cyber-grid`          | Scrolling cyan grid background (landing sections)               |
| `.cyber-grid-canvas`   | Static cyan grid background (React Flow canvas)                 |
| `.text-glow-cyan`      | Cyan text-shadow glow                                           |
| `.text-glow-magenta`   | Magenta text-shadow glow                                        |
| `.text-glow-pulse`     | Pulsing animated cyan glow                                      |
| `.border-glow-cyan`    | Box-shadow cyan border glow                                     |
| `.hover-glow-cyan`     | Adds full neon glow on hover                                    |
| `.animate-pulse-glow`  | Box-shadow pulse animation                                      |
| `.animate-float`       | Slow vertical float animation                                   |
| `.section-label`       | Monospaced section header with decorative side lines            |
| `.marquee-track`       | Infinitely scrolling horizontal ticker                          |
| `.scanlines::after`    | CRT scanline overlay                                            |
| `.preloader-bar`       | Top-of-page loading progress bar (cyan → purple gradient)       |

## Layout Patterns

- **Workspace**: Full-viewport 3-panel split — left sidebar (Node Palette,
  fixed ~220 px), centre canvas (React Flow, flex-grow), right sidebar (tabbed
  aux panel, fixed ~320 px).
- **Sidebars**: Fixed width; inner content scrolls independently. Top border
  separator uses `rgba(0, 242, 255, 0.15)`.
- **Right panel tabs**: Tabs switch between NodePropertiesPanel,
  SimResultsPanel, and AIChatPanel. Tab bar uses `.glass-panel` with cyan
  active indicator.
- **Dashboard**: Centred content column (max ~900 px) on a `--bg-primary`
  background with scrolling `cyber-grid`.
- **Auth pages** (login / sign-up): Centred card using `.glass-panel-heavy`
  on `--bg-primary` with subtle `cyber-grid` beneath.
- **Navbar**: Fixed top bar with bottom border, blur backdrop, logo left,
  nav links + auth button right. Hides on scroll-down, re-appears on scroll-up
  (Framer Motion).

## Icons

Lucide React v1. Stroke-based icons only. Standard sizes:
- `h-4 w-4` (16 px) — inline text icons, small badges.
- `h-5 w-5` (20 px) — buttons, list items.
- `h-6 w-6` (24 px) — section headings, empty-state illustrations.

The custom `JustCmul8Icon` SVG component (used in the Navbar and auth pages)
lives in `src/components/ui/` and is **not** a Lucide icon.
