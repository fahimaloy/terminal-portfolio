# Enhancement Plan — Ultra-Premium Developer Portfolio

## User Answers (from ask, 2026-09-24)

- Splash theme: Developer workspace reveal (desk/keyboard/screen lighting, code rendering)
- Duration: 4s, fixed minimum, shows every refresh/open
- Header: Redesign as single premium header (not duplicate)
- Name: Replace with animated single render (no overlap)
- Blog: Both swipe + scroll effects; dark theme + gradient sections
- Quick Commands: Enhanced interactive animations, modern icons
- Start Chat: Remove; header gets Source Code + Blog compact icon buttons
- Three.js: Homepage + splash + blog
- Blog colors: Dark theme with gradient sections

## Analysis — Current State (verified from repo)

### 1. Splash (BootSequence.tsx)

- Duration 860ms, skip at 150ms, sessionStorage once-per-session (`cyberpunk-boot-shown`)
- Uses ScopeRings, SignalTicks (SVG primitives), splitText wordmark, confetti exit
- No physical/reveal theme. Needs: 4000ms, sessionStorage removed, workspace reveal animation

### 2. Header / Label Duplication

- `HeroSection.tsx:368`: `data-hero="label"` renders `// DEVELOPER PROFILE` once (line 368)
- `Homepage.tsx` via `HeroChat` may render separately → duplicate detected by user at top center
- `HeroSection.tsx:374-386`: Name `<h1>` uses `splitText` chars with clip-wrap; overlaps likely from `tracking-[-0.02em]` at `text-7xl` without proper wrap containment

### 3. Quick Commands (HeroSection.tsx:523-563)

- `QUICK_CARDS` array (6 cards): lucide icons (GitBranch, LinkIcon, Mail, Briefcase, Code, Clock)
- Simple grid, basic `border`, `bg-wash-yellow`, static hover
- Needs: magnetic/floating interactive cards with premium icons, color gradients, tilt3d

### 4. Header Buttons (HeroSection.tsx:482-521)

- Three buttons: START CHAT (line 493), VIEW CODE, READ BLOG
- User: remove Start Chat; keep Source Code + Blog as compact header icon buttons
- Header (`HudChrome`) already shows profile icon; add Source/Blog there

### 5. Blog (pages/blog/index.tsx + BlogReels.tsx)

- BlogReels: `scroll-snap-y` mandatory, near-fullscreen cards, `LightningTransition` per card
- No horizontal swipe; needs swipe + scroll-driven animations
- BlogCard (`BlogCard.tsx`) uses warm editorial (`wash-*` / `retro-*` tokens) — needs dark gradient theme

### 6. Three.js / Animation Dependencies

- `animejs@4.5.0` present; `three` not installed
- `createScope`, `createTimeline`, `stagger`, `spring`, `splitText` used extensively
- Need Three.js for: splash 3D workspace reveal, homepage ambient 3D background, blog interactive visuals

### 7. Input / Placeholder (HeroChat / ChatModalHost)

- User wants `/` key to focus input; double Esc to unfocus; placeholder to document this
- Current input in `ChatModalHost` / `ChatInputBar` — needs key listeners

---

## Detailed Plan by Area

### A. SPLASH SCREEN (4s, every refresh, workspace reveal)

**Files:** `src/components/ui/BootSequence.tsx`, `scripts/dev.sh` (dev server unchanged)
**Approach:**

- Remove `STORAGE_KEY` / sessionStorage guard (line 26, 57-58, 68-84). Replace with `useEffect` that always mounts and finishes after 4000ms.
- Redesign sequence: physical workspace reveal using existing SVG primitives + new 3D/animated layer — screen glow, keyboard lighting, code streams, terminal boot sequence.
- Use `animejs` timeline (existing `createTimeline`) to orchestrate 4-second multi-phase animation instead of 860ms.
- Keep close/skip button but only after ~1000ms; not skippable immediately.
- Verify by refreshing `/`; splash must appear.

### B. HEADER / SINGLE PREMIUM HEADER

**Files:** `src/components/home/HeroSection.tsx`, `src/components/home/HudChrome.tsx`
**Approach:**

- Remove duplicate `// DEVELOPER PROFILE` render source — check `HeroChat` / `Homepage` overlay; consolidate label to one `data-hero="label"` in HeroSection only.
- Redesign as single cinematic header block: label + animated hairline + name (animated render) + title, all in one contained block, not split.
- Replace name `splitText` overlap with `clip`-wrapped stagger from bottom with adequate line-height / letter-spacing at `text-7xl`; add `overflow-hidden` container.

### C. NAME ANIMATED SINGLE RENDER

**Files:** `src/components/home/HeroSection.tsx` (line 374-386, 240-255)
**Approach:**

- Instead of `splitText` with clip-wrap that overlaps, use `animejs` timeline to animate the full `<h1>` from `y: 40 → 0`, `opacity: 0 → 1`, with `ease: outExpo`, stagger 18ms per word (not per char) — avoids overlap.
- Keep background gradient (`wash-cyan`) but add `text-shadow-neon` via `global.css` utilities.

### D. QUICK COMMANDS REDESIGN

**Files:** `src/components/home/HeroSection.tsx` (line 523-563)
**Approach:**

- Replace `QUICK_CARDS` UI with magnetic interactive cards using `animejs` + `createScope`:
  - Each card: floating glass pill, gradient border, modern `lucide-react` / `react-icons` icon (replace basic icons with more premium set)
  - Hover: scale 1.05 + glow + tilt via `tilt3d` equivalent (CSS `transform-style: preserve-3d` + mouse position)
  - Animate in with stagger from `first`, spring release on complete
- Preserve click-to-send messages; just upscale visual design

### E. HEADER COMPACT ICON BUTTONS (Source Code / Blog)

**Files:** `src/components/home/HudChrome.tsx`, `src/components/home/HeroSection.tsx`
**Approach:**

- Remove `START CHAT` button from `HeroSection.tsx:493`
- Add compact icon-only buttons to `HudChrome` header (near profile): Source Code (code icon → `/github` open), Blog (book icon → `/blog` push)
- Style: small square/circle glass buttons with neon border, hover glow

### F. INDEX INPUT KEYBOARD SHORTCUTS

**Files:** `src/components/home/ChatInputBar.tsx` or `ChatModalHost`
**Approach:**

- Add `useEffect` keydown listener:
  - `/` when not focused → `inputRef.current?.focus()`
  - Double `Esc` (within ~300ms) when focused → `inputRef.current?.blur()` / reset
- Update placeholder to document: `"Type message... (Press / to focus, Esc to unfocus)"`

### G. BLOG — DARK GRADIENTS + SWIPE + SCROLL EFFECTS

**Files:** `src/pages/blog/index.tsx`, `src/components/blog/BlogReels.tsx`, `src/components/blog/BlogCard.tsx`
**Approach:**

- Theme correction: change `ACCENT_CYCLE` in `BlogCard.tsx` to dark gradient cards (not warm amber). Update `global.css` / tokens if needed — keep existing `var(--*)` system.
- Horizontal swipe: add touch/drag detection to `BlogReels` (use `useDrag` / mouse/touch events) to swipe between cards horizontally, with `snap` to nearest card.
- Scroll effects: enhance existing `ReadingProgress`, `LightningTransition`, and add `onScroll` scroll-driven parallax to cards via `animejs` `onScroll({ sync: true })`.
- Add interactivity: cards expand on click with `animejs` scale/fade (existing `ExpandedOverlay` already present — enhance transition).

### H. THREE.JS INTEGRATION

**Files:** `package.json` (add dependency), new components
**Approach:**

- Install `three`, `@react-three/fiber`, `@react-three/drei` (check if already available — not installed currently)
- Splash: add `Canvas` with a simple 3D scene (terminal/desk scene or abstract code particles) behind the SVG boot sequence; fade in with timeline
- Homepage: ambient background particles or grid using `three` (not full background — ambient ring/particles)
- Blog: interactive 3D elements on expanded cards or section headers
- Ensure `isReducedMotion` gates: show static version

---

## Implementation Order (if approved)

1. Three.js dependency + splash redesign (4s, no session block)
2. Header consolidation + name animation fix
3. Quick Commands redesign + Start Chat removal + header icons
4. Index input keyboard + placeholder
5. Blog theme correction + swipe + scroll animations
6. Three.js homepage/blog integration + verification

## Verification

- `npm run dev` in `portfolio` tmux session already running (port 3000)
- Refresh `/` → splash appears every time
- `/blog` → dark gradient cards, swipe works
- `/` → `/` focuses input; double Esc unfocuses
- `npm run typecheck && npm run lint` must stay green after edits

---

## Approval Request

Plan is complete above. Do NOT implement until you confirm. Key choices for your approval:

1. Splash concept (workspace reveal + 4s fixed) — approve?
2. Design for quick commands (magnetic glass cards vs other) — approve direction?
3. Three.js scope (splash + homepage ambient + blog) — approve scope?
4. Confirm removal of Start Chat + button placements
