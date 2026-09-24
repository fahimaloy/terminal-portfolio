# Portfolio Fix Plan — Comprehensive Audit & Implementation

**Date:** 2026-09-24  
**Scope:** All issues from user report + discovered issues  
**Branch:** `fix/portfolio-issues-2026-09-24`

---

## Executive Summary

| Category              | Issues Found                                                                              | Priority |
| --------------------- | ----------------------------------------------------------------------------------------- | -------- |
| **Duplicate Content** | DEVELOPER PROFILE appears twice (HeroSection label + HudChrome identity badge)            | High     |
| **Unwanted Text**     | "TERMINAL v4.0.0 / STATUS: READY" in HudChrome bottom-right                               | High     |
| **Button Placement**  | Source Code + Blog buttons in HeroSection CTA area — should move to top header            | High     |
| **Dynamic Name**      | Index page shows hardcoded "FAHIM AHMED" — should use `config.json` profile.full_name     | Medium   |
| **Splash Screen**     | Missing username "fahimaloy", generic vector graphics (ScopeRings/SignalTicks)            | High     |
| **WebGL Fallbacks**   | ThreeBackground + WorkspaceCanvas spam console warnings; CSS fallback is static gradients | High     |
| **Webpack HMR**       | 404 on hot-update.json — dev server issue                                                 | Medium   |

---

## Detailed Findings

### 1. Duplicate "DEVELOPER PROFILE" Text

**Locations:**

- `HeroSection.tsx:367` — Label: `{'// ' + (siteTexts.developer_profile_label || 'DEVELOPER PROFILE')}`
- `HudChrome.tsx:70` — Identity badge: `{'// ' + (siteTexts.developer_label || 'DEVELOPER')}`

**Root Cause:** Both components independently render similar labels. HudChrome's identity badge is meant to show when hero is NOT visible (scroll state), but the label text overlaps conceptually.

**Fix:** Remove the label from HeroSection (line 362-368) since HudChrome handles identity contextually. Keep HudChrome's version as it's scroll-aware.

### 2. Unwanted "TERMINAL v4.0.0 / STATUS: READY"

**Location:** `HudChrome.tsx:146-153` — Bottom-right system panel

**Fix:** Remove the entire bottom-right system panel (lines 133-155) or make it configurable via `siteTexts`. User explicitly requested removal.

### 3. Source Code + Blog Buttons → Top Header

**Current:** `HeroSection.tsx:481-498` — Two CTA buttons in hero area with `lucide-react` icons (Code, BookOpen)

**Target:** `HudChrome.tsx` top-right area (alongside status/clock) as compact icon-only buttons

**Design:** Glass-gradient magnetic buttons matching `NeonButton`/`MagneticButton` patterns, using `react-icons/ri` (RiGithubLine, RiFileTextLine or similar) for consistency with existing social icons.

### 4. Dynamic Name from Config

**Current:** `HeroSection.tsx:383` — Hardcoded fallback `'FAHIM AHMED'`

**Source:** `config.json:4` — `"name": "Fahim Ahmed"`

**Fix:** Pass `config.name` through Homepage → HeroChat → HeroSection, or fetch from `getPortfolioProfile()` which reads Supabase `profiles` table. The profile API already returns `full_name`.

### 5. Splash Screen Enhancements

**Current (`BootSequence.tsx`):**

- Shows "FAHIM" wordmark (line 640)
- Shows "PORTFOLIO" sub (line 648)
- Generic ScopeRings + SignalTicks (lines 558-561)
- Keyboard visualization with generic keys (lines 595-606)
- Code streaming shows hardcoded name (line 625)

**Required:**

- Show full name "Fahim Ahmed" with splitText animation
- Show username "@fahimaloy" prominently
- Programming/tech vector graphics: code brackets `{}`, `[]`, `()`; terminal prompt `>_`; git branch; file tree; circuit traces; binary rain; matrix-style glyphs
- Proper anime.js v4 animations using `durations`, `easings`, `springs` from tokens

**New Graphics Primitives Needed:**

- `CodeBrackets` — animated `{ }`, `[ ]`, `( )` pairs
- `TerminalPrompt` — blinking `>_` cursor
- `GitBranch` — branching visualization
- `FileTree` — animated directory structure
- `CircuitTraces` — animated PCB-like paths
- `BinaryRain` — falling 0/1 glyphs (matrix-style)
- `KeyboardLights` — per-key ripple animation (enhance existing)

### 6. WebGL Fallback Strategy — Modern & Reliable

**Current Problems:**

- `ThreeBackground.tsx` & `WorkspaceCanvas.tsx` both log console.warn on WebGL failure
- CSS fallback is static radial gradients with simple `@keyframes aurora-drift`
- No anime.js integration in fallbacks
- `failIfMajorPerformanceCaveat: true` causes false positives in sandboxed envs

**Research Findings:**
| Approach | Pros | Cons |
|----------|------|------|
| **CSS-only gradients + @keyframes** | Zero JS, works everywhere | Static, no interactivity |
| **anime.js v4 DOM/SVG animations** | Full control, uses design tokens, respects reduced-motion | More DOM nodes |
| **Canvas 2D API fallback** | Close to WebGL visual, programmable | More complex, still needs canvas |
| **SVG + anime.js (recommended)** | Scalable, token-driven, declarative, performant | Requires SVG design |

**Recommendation:** **SVG particle field + anime.js v4** — mirrors Three.js particle aesthetic but runs on main thread via SVG. Uses `createScope`, `createTimeline`, `stagger`, `spring` from tokens. Zero WebGL dependency. Respects `prefers-reduced-motion` via `isReducedMotion()` / `canAnimate()`.

**Implementation:**

1. Create new primitive: `ParticleFieldSVG` (or enhance existing `ParticleField.tsx`)
2. Use anime.js `animate()` with `duration: durations.enter`, `ease: easings.outExpo`, `delay: stagger(durations.stagger)`
3. Particles: small circles/rects with CSS variables for colors (`--neon-cyan`, `--neon-magenta`, etc.)
4. Mouse parallax via `uniformsRef.current.uMouse` pattern (already in ThreeBackground)
5. Fallback activates immediately if `!canAnimate()` or WebGL detection fails — no console.warn spam

### 7. Webpack HMR 404 Issue

**Error:** `GET http://localhost:3000/_next/static/webpack/09593db7759bddb4.webpack.hot-update.json 404`

**Cause:** Next.js 12 HMR race condition — client requests hot-update JSON before server generates it. Common in dev with fast refresh.

**Fixes (try in order):**

1. Add `webpackDevMiddleware` config to increase HMR timeout
2. Set `experimental.hmrRetry` in next.config.js (Next 12+)
3. Disable HMR for specific problematic chunks via `module.hot.decline()`
4. Use `next.config.js` → `onDemandEntries` to keep pages in memory longer

```js
// next.config.js additions
experimental: {
  hmrRetry: 3, // retry HMR 3 times
},
onDemandEntries: {
  maxInactiveAge: 60 * 1000, // 60s
  pagesBufferLength: 5,
},
```

---

## Implementation Plan

### Phase 1: Quick Wins (Content & Layout)

| Task                                           | File                               | Lines        | Change                                    |
| ---------------------------------------------- | ---------------------------------- | ------------ | ----------------------------------------- |
| 1.1 Remove HeroSection DEVELOPER PROFILE label | `HeroSection.tsx`                  | 362-368      | Delete `<div data-hero="label">` block    |
| 1.2 Remove HudChrome bottom-right system panel | `HudChrome.tsx`                    | 133-155      | Delete entire bottom-right `div`          |
| 1.3 Move Source Code/Blog buttons to HudChrome | `HudChrome.tsx`                    | 82-105 (new) | Add icon buttons in top-right flex        |
| 1.4 Remove Source Code/Blog from HeroSection   | `HeroSection.tsx`                  | 481-498      | Delete CTA buttons block                  |
| 1.5 Pass dynamic name to HeroSection           | `HeroChat.tsx` → `HeroSection.tsx` | 191-203, 383 | Use `profile?.full_name \|\| config.name` |

### Phase 2: Splash Screen Overhaul

| Task                                     | File                                     | Description                                                                                                                 |
| ---------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 2.1 Create programming vector primitives | `src/components/ui/graphics/primitives/` | New files: `CodeBrackets.tsx`, `TerminalPrompt.tsx`, `GitBranch.tsx`, `FileTree.tsx`, `CircuitTraces.tsx`, `BinaryRain.tsx` |
| 2.2 Update BootSequence wordmark         | `BootSequence.tsx`                       | Replace "FAHIM" → splitText "Fahim Ahmed", add "@fahimaloy"                                                                 |
| 2.3 Replace ScopeRings/SignalTicks       | `BootSequence.tsx`                       | Use new tech graphics with anime.js timeline                                                                                |
| 2.4 Enhance keyboard visualization       | `BootSequence.tsx`                       | Per-key ripple using anime.js stagger                                                                                       |
| 2.5 Animate code streaming               | `BootSequence.tsx`                       | Typewriter effect for code lines using `durations.typing`                                                                   |

### Phase 3: WebGL Fallback Modernization

| Task                                    | File                                                         | Description                                                   |
| --------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------- |
| 3.1 Create `ParticleFieldSVG` primitive | `src/components/ui/graphics/primitives/ParticleFieldSVG.tsx` | SVG-based particle system driven by anime.js v4               |
| 3.2 Refactor `ThreeBackground` fallback | `ThreeBackground.tsx`                                        | Replace CSS gradient with `<ParticleFieldSVG />`              |
| 3.3 Refactor `WorkspaceCanvas` fallback | `WorkspaceCanvas.tsx`                                        | Replace `WorkspaceCanvasFallback` with `<ParticleFieldSVG />` |
| 3.4 Suppress console.warn spam          | Both files                                                   | Only warn once, or use `console.info` for fallback activation |
| 3.5 Add `prefers-reduced-motion` guard  | Both files                                                   | Check `isReducedMotion()` before WebGL init                   |

### Phase 4: Webpack HMR Fix

| Task                          | File             | Description                                       |
| ----------------------------- | ---------------- | ------------------------------------------------- |
| 4.1 Add HMR retry config      | `next.config.js` | Add `experimental.hmrRetry` and `onDemandEntries` |
| 4.2 Test dev server stability | —                | Verify no 404 on hot-update.json                  |

---

## Design Specifications

### Header Icon Buttons (Source Code + Blog)

```tsx
// In HudChrome.tsx top-right, alongside status/clock
<div className="flex items-center gap-2">
  <MagneticButton
    as="a"
    href="https://github.com/fahimaloy"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Source Code"
    className="p-2"
    variant="ghost"
  >
    <RiGithubLine size={16} />
  </MagneticButton>
  <MagneticButton
    as="a"
    href="/blog"
    aria-label="Blog"
    className="p-2"
    variant="ghost"
  >
    <RiFileTextLine size={16} />
  </MagneticButton>
  {/* existing status/clock */}
</div>
```

### Splash Screen Tech Graphics

Each primitive follows the existing pattern: SVG with `pathLength=1000` for `createDrawable`, `stroke="var(--ring-{accent})"`, `className="grat-stroke"`.

**Animation Timeline (BootSequence):**

```
0ms      → Aurora glow (existing)
400ms    → Screen boot glow (existing)
800ms    → Keyboard lights ripple (stagger 40ms/key)
1200ms   → Code brackets draw (createDrawable stagger)
1600ms   → Terminal prompt blink (loop)
2000ms   → Git branch grow (spring)
2400ms   → File tree expand (stagger 60ms)
2800ms   → Circuit traces draw (createDrawable)
3200ms   → Binary rain start (loop)
3600ms   → Wordmark "Fahim Ahmed" (splitText clip cascade)
3800ms   → Sub "@fahimaloy" (fade + slide)
4000ms   → Rail complete → exit
```

---

## Verification Checklist

```bash
# Run all checks
npm run verify

# Individual checks
npm run typecheck      # tsc --noEmit
npm run lint           # next lint
npm run tokens:check   # token drift guard
npm test               # vitest run
npm run test:e2e       # playwright test

# Manual verification
- [ ] No "DEVELOPER PROFILE" duplicate on homepage
- [ ] No "TERMINAL v4.0.0 / STATUS: READY" anywhere
- [ ] Source Code + Blog icons in top header (right side)
- [ ] Hero shows "Fahim Ahmed" from config/profile
- [ ] Splash shows "Fahim Ahmed" + "@fahimaloy" with animations
- [ ] Splash shows tech graphics (brackets, terminal, git, etc.)
- [ ] No WebGL console warnings in sandboxed/headless env
- [ ] Fallback particle field animates smoothly via anime.js
- [ ] No HMR 404 errors in dev console
- [ ] prefers-reduced-motion respected everywhere
```

---

## Risk Assessment

| Risk                               | Likelihood | Impact | Mitigation                                                       |
| ---------------------------------- | ---------- | ------ | ---------------------------------------------------------------- |
| Breaking HudChrome layout          | Low        | Medium | Test at mobile/desktop breakpoints                               |
| anime.js v4 API mismatch           | Low        | High   | Use existing patterns from `BootSequence.tsx`, `HeroSection.tsx` |
| Token drift after changes          | Medium     | High   | Run `npm run tokens:generate && npm run tokens:check`            |
| HMR fix doesn't work               | Medium     | Low    | Multiple fallback configs; can disable HMR if needed             |
| New SVG primitives increase bundle | Low        | Low    | Tree-shakeable, only loaded in BootSequence                      |

---

## File Change Summary

```
src/components/home/HeroSection.tsx        ← Remove label + CTA buttons
src/components/home/HudChrome.tsx          ← Remove system panel + add header icon buttons
src/components/home/HeroChat.tsx           ← Pass dynamic name
src/components/ui/BootSequence.tsx         ← Complete splash redesign
src/components/ui/ThreeBackground.tsx      ← Modern SVG fallback
src/components/ui/WorkspaceCanvas.tsx      ← Modern SVG fallback
src/components/ui/graphics/primitives/     ← 6 new tech graphic primitives
next.config.js                             ← HMR retry config
```

---

## Notes for Implementation

1. **Token Contract:** All new durations/easings/colors MUST use `tokens.css` variables. Run `npm run tokens:generate` after any token changes.

2. **Anime.js v4 Patterns:** Follow `BootSequence.tsx` exactly — `createScope({root})`, `createTimeline({defaults})`, `stagger()`, `spring()`, `onScroll({sync:true})`.

3. **Reduced Motion:** Every animation must check `isReducedMotion()` and `canAnimate()` — return early with instant state.

4. **Cleanup:** Every `createScope`/`createTimeline` must `.revert()` in `useEffect` cleanup.

5. **Accessibility:** All decorative SVG `aria-hidden="true"`. Interactive buttons have `aria-label`.

6. **Testing:** Add Playwright tests for: header buttons navigation, splash screen animation completion, WebGL fallback activation.

---

## Rollback Plan

If any change breaks production:

1. Revert single file via `git checkout HEAD -- <file>`
2. `npm run verify` to confirm
3. Each phase is independently reversible

---

_Generated from systematic codebase audit. All file references verified against current repo state._
