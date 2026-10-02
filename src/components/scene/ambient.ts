/**
 * ambient — the scene's idle and scroll behaviour, as pure functions.
 *
 * Two behaviours live here, and neither of them belongs inside a component:
 *
 *   1. IDLE / ATTRACT. `useScenePointer` has always recorded `movedAt` — the
 *      `performance.now()` of the last pointermove — and until now nothing read
 *      it. The scene therefore answered the pointer and nothing else, so the
 *      moment a visitor stopped moving the mouse the background was a loop
 *      playing to an empty room. `presenceFromQuiet` turns that timestamp into
 *      a continuous 0..1 "how much is the user driving this right now".
 *
 *   2. SCROLL DEPTH. `SceneLayer` is `fixed inset-0`, so the background never
 *      moved when the page did: content slid through a photograph and the scene
 *      read as wallpaper. Each layer now answers page scroll with a RATE — the
 *      fraction of content speed it moves at. A rate of 1.0 welds the backdrop
 *      to the page and depth collapses. The eye reads distance from the
 *      DIFFERENCE between layers, so the rates here are deliberately spread
 *      rather than shared; they are art direction and live in SceneCanvas's
 *      VARIANTS, while the per-layer world-unit scale (`DEPTH_TRAVEL`) is a
 *      property of where each layer sits in the scene and lives here.
 *
 * Everything is exported and pure on purpose: every number below is a tuning
 * decision, and a tuning decision nobody can assert on in a test is one that
 * somebody eventually "fixes" to a different value.
 *
 * ── On timing constants ────────────────────────────────────────────────────
 * These are scene-behaviour timings in MILLISECONDS, not anime.js timings, so
 * they are deliberately NOT read from `src/config/animations.ts`. That module
 * holds UI transition durations in seconds for an animation library, and
 * nothing in the `--dur-*` vocabulary covers a 2.6-second release. The
 * precedent is in the files this module sits between: `ParticleField` decays
 * its shockwave over a hardcoded 0.9s and `CoreObject` spins at a hardcoded
 * `speed = 0.08`, neither tokenised.
 */

/* ── Idle ─────────────────────────────────────────────────────────────────── */

/**
 * How long the pointer may be STILL before `presence` starts to fall.
 *
 * 90ms is about 5-6 frames at 60Hz and sits right at the edge of the classic
 * ~100ms threshold for "direct manipulation feels instant". Below it, any
 * perceptible lag between the cursor and the scene would read as the background
 * being broken rather than atmospheric. It is deliberately much shorter than
 * the release: engaging is an answer to an action, disengaging is not.
 */
export const IDLE_ATTACK_MS = 90;

/**
 * How long the pointer may be still before the scene is fully on its own.
 *
 * 2600ms ≈ 156 frames at 60Hz. It has to clear two constraints from opposite
 * ends.
 *
 * Downward, a brief pause for thought must not disturb anything. Reading is not
 * motionless — a visitor tracks the line they are on — and a 500ms gap of true
 * stillness is still 0.94 present, so a hand leaving the mouse for a moment
 * changes nothing.
 *
 * Upward, two seconds of real stillness SHOULD hand the scene over, and the
 * asymmetry is the point rather than an accident: a mouse wheel generates no
 * `pointermove` and neither does a two-finger trackpad scroll, so for anyone
 * reading a long article this is not an edge case but the steady state after
 * the first screenful. The two behaviours are meant to cover each other — the
 * attract anchor carries the motion while the visitor is not scrolling, and the
 * depth parallax carries it while they are.
 *
 * A shorter tail (say 800ms) would collapse those two into a single state and
 * lose whichever one the visitor was not currently using.
 */
export const IDLE_RELEASE_MS = 2600;

/**
 * 1 while the pointer is driving the scene, 0 while it runs on its own, and a
 * continuous blend in between.
 *
 * A hard switch between two motion profiles reads as a glitch — a visible
 * discontinuity in every layer at the same instant. This is a function of
 * elapsed TIME rather than of frames, which makes it frame-rate independent for
 * free and keeps the published time constants honest: at 30fps and at 144fps
 * the release takes the same 2.6 seconds.
 *
 * A smoothstep rather than a linear ramp, because the eye is far more sensitive
 * to acceleration than to velocity here: a linear release has a visible "start"
 * and "stop" corner, and this is a slow ambient change that should have neither.
 *
 * Non-finite input resolves to RESTING (0). If the quiet time cannot be
 * determined, showing the visitor the attract behaviour is the safe answer; it
 * is the state designed to be pleasant to watch, and it is also the state the
 * scene is in by default on first load.
 */
export function presenceFromQuiet(quietMs: number): number {
  if (!Number.isFinite(quietMs)) return 0;
  if (quietMs <= IDLE_ATTACK_MS) return 1;
  if (quietMs >= IDLE_RELEASE_MS) return 0;
  const t = (quietMs - IDLE_ATTACK_MS) / (IDLE_RELEASE_MS - IDLE_ATTACK_MS);
  // smoothstep: 1 - (3t² - 2t³)
  return 1 - t * t * (3 - 2 * t);
}

/* ── Scroll ───────────────────────────────────────────────────────────────── */

/**
 * Where page scroll saturates, in viewport heights.
 *
 * The mapping from scroll to depth is deliberately asymptotic rather than
 * linear. A linear map is correct-looking for the first screenful and then
 * either runs the layers out of frame on a long article or hits a clamp, and a
 * clamp is the worst of both: velocity snaps to zero mid-scroll and the
 * background visibly "gives up" while the page is still moving.
 *
 * `SOFT_MAX * (1 - e^(-v / SOFT_MAX))` is linear to within 8% over the first
 * viewport of scroll — so the response during the scroll a visitor is most
 * likely to perform is indistinguishable from a straight line — and then decays
 * continuously, so velocity always trends smoothly to zero rather than hitting
 * a wall. At three viewports it is still at 79% of linear, at six, 63%.
 *
 * Six viewport-heights of saturation is well past the length of the landing
 * page and comfortably past a typical blog index. A long-form article goes
 * deeper, and by then the scene has settled into its far position, which is
 * also what depth should feel like at that distance.
 */
export const SCROLL_SOFT_MAX_VH = 6;

/**
 * Scroll position expressed in VIEWPORT HEIGHTS rather than pixels.
 *
 * Viewport heights, not pixels, because the whole system is a ratio of content
 * speed: a layer's travel has to be expressible as a fraction of how far the
 * content has moved, and that fraction only means something relative to the
 * height of the frame doing the moving.
 */
export function scrollViewports(
  scrollY: number,
  viewportHeight: number,
): number {
  if (!Number.isFinite(scrollY) || !Number.isFinite(viewportHeight)) return 0;
  if (viewportHeight <= 0) return 0;
  return Math.max(0, scrollY) / viewportHeight;
}

/** Scroll viewports → saturating depth. See `SCROLL_SOFT_MAX_VH`. */
export function scrollDepth(viewports: number): number {
  const v = Number.isFinite(viewports) && viewports > 0 ? viewports : 0;
  return SCROLL_SOFT_MAX_VH * (1 - Math.exp(-v / SCROLL_SOFT_MAX_VH));
}

/**
 * Smoothing half-life for the scroll depth, in ms.
 *
 * 140ms ≈ 8 frames at 60Hz. Scroll position is instantaneous and spiky on a
 * trackpad — a single flick can deliver hundreds of pixels in one frame — so an
 * unsmoothed value makes every depth layer teleport. 140ms is short enough
 * that a scroll still feels attached to the finger (it settles in about two
 * frames of a 60Hz flick) and long enough to erase the spikes entirely.
 *
 * Deliberately a HALF-LIFE rather than a per-frame lerp factor: see `damp`.
 */
export const DEPTH_HALF_LIFE_MS = 140;

/**
 * The layers that answer scroll, each with a different rate.
 *
 * Every layer is BELOW 1.0. A rate at or above the content's own speed would
 * put the backdrop in front of the page, and a backdrop that outruns the
 * content does not read as depth — it reads as a slide transition that is
 * stuck halfway.
 */
export type DepthLayer = 'grid' | 'tubes' | 'particles' | 'core';

/**
 * World units each layer travels per viewport-height of depth, at rate 1.0.
 *
 * This is a property of where the layer SITS in the scene, not of art
 * direction, so it does not live in VARIANTS — but the effective travel still
 * has to be taste-checked per layer, because layers at different depths need
 * different amounts of world travel to look equally displaced:
 *
 *   - `grid` 1.1 and `particles` 1.1 sit near the camera and read as large
 *     world motion, which is correct for a floor you are travelling over and
 *     for a field you are flying through. Both wrap or extend far enough that
 *     the total travel never reveals an edge.
 *   - `tubes` 0.7 is deliberately smaller. A tube is a legible discrete
 *     object about three units across; move it by the grid's full travel and
 *     it wanders out of frame and looks broken rather than near.
 *   - `core` 0.8 at z -14, where the visible world is two and a half times
 *     taller than at the origin, so 0.8 world units there is a small, distant
 *     drift — which is what the far subject of the composition should do.
 */
export const DEPTH_TRAVEL: Record<DepthLayer, number> = {
  grid: 1.1,
  tubes: 0.7,
  particles: 1.1,
  core: 0.8,
};

/** Depth (viewport heights, saturated) + a layer's rate → world-unit offset. */
export function layerTravel(
  depth: number,
  rate: number,
  travel: number,
): number {
  const d = Number.isFinite(depth) && depth > 0 ? depth : 0;
  const r = Number.isFinite(rate) && rate > 0 ? rate : 0;
  return d * r * travel;
}

/**
 * Scroll speed that counts as a full-strength rush, in viewport heights/second.
 *
 * One viewport height a second is a comfortable reading scroll and it is
 * already 5-6× faster than most wheel ticks. Anything quicker is a flick.
 */
export const RUSH_FULL_VH_PER_S = 1.1;

/** Rush half-lives. Asymmetric: brightness snaps up and eases back down. */
export const RUSH_RISE_MS = 90;
export const RUSH_FALL_MS = 460;

/** Signed scroll speed → a clamped 0..1 rush. Unsigned on purpose. */
export function rushFromVelocity(viewportHeightsPerSecond: number): number {
  if (!Number.isFinite(viewportHeightsPerSecond)) return 0;
  return clamp01(Math.abs(viewportHeightsPerSecond) / RUSH_FULL_VH_PER_S);
}

/* ── How much the scene is doing its own thing ─────────────────────────────── */

/**
 * Peak brightness the field gains while resting. Applied as a MULTIPLIER that
 * is always >= 1 (see `aliveGain`), never as a dip below the tuned value.
 */
export const ALIVE_REST_GAIN = 0.14;

/** Peak extra brightness while scrolling fast, on top of the resting gain. */
export const ALIVE_RUSH_GAIN = 0.06;

/**
 * How alive the particle field is right now, as a multiplier on its tuned
 * opacity. Returns a value in [1, 1.20].
 *
 * The asymmetry is the whole point. While the visitor is driving the scene the
 * field is at exactly 1.0 — byte-for-byte the behaviour it had before idle
 * existed, so nothing about an engaged session changes. The gain only ever
 * ADDS, and only as the visitor goes quiet or scrolls fast.
 *
 * That also protects the chat shockwave, which is the one thing in the scene
 * that must stay a sharp event. The shockwave's brightness arrives as the
 * shader's `vFade`, which peaks at 2.6x. Because `uAlive` multiplies in
 * ADDITION to it and never reduces it, the peak is 2.6x while engaged and 3.12x
 * at full rest — so the sharper the silence before a send, the bigger the
 * pulse. The quiet can make the event louder; it can never make it dimmer.
 */
export function aliveGain(presence: number, rush: number): number {
  const p = clamp01(presence);
  const r = clamp01(rush);
  return 1 + (1 - p) * ALIVE_REST_GAIN + r * ALIVE_RUSH_GAIN;
}

/* ── Attract anchor ───────────────────────────────────────────────────────── */

/** A normalised (-1..1, y-up) target, matching the scene pointer's space. */
export type SceneAnchor = { x: number; y: number };

/**
 * The point the scene drifts toward when nobody is driving it.
 *
 * A sum of two sines per axis with incommensurate frequencies — periods of
 * about 146s and 367s on x, 170s and 487s on y. That is the actual mechanism
 * behind "the composition never returns to exactly the same frame": a single
 * sine is perfectly periodic and loops visibly within a couple of minutes, and
 * two sines at a rational frequency ratio would loop too. At these ratios the
 * combined orbit has no period a visitor will ever sit through.
 *
 * Amplitudes (0.8 and 0.6 peak, in the same normalised space the pointer uses)
 * are chosen so the rig traverses its entire parallax range over a few minutes
 * of rest. Anything smaller and the scene looks parked; anything larger and a
 * resting scene is more active than an engaged one.
 *
 * Writes into `out` rather than returning a fresh object: this runs every frame
 * for the life of the canvas, and the rest of the scene is careful never to
 * allocate in the frame loop.
 */
export function idleAnchor(out: SceneAnchor, timeSeconds: number): SceneAnchor {
  const t = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  out.x = Math.sin(t * 0.043) * 0.55 + Math.sin(t * 0.0171 + 1.7) * 0.25;
  out.y = Math.cos(t * 0.037) * 0.4 + Math.sin(t * 0.0129 + 0.4) * 0.2;
  return out;
}

/**
 * Blend the attract anchor with the live pointer by `presence`.
 *
 * `presence = 1` is the pointer, verbatim — the visitor's cursor has total
 * authority the instant they move it. `presence = 0` is the anchor alone. In
 * between, the pointer's authority grows linearly while the anchor keeps
 * running underneath, so the handoff is a continuous crossfade rather than a
 * switch between two framings.
 */
export function blendAnchor(
  out: SceneAnchor,
  pointerX: number,
  pointerY: number,
  anchorX: number,
  anchorY: number,
  presence: number,
): SceneAnchor {
  const p = clamp01(presence);
  out.x = anchorX + (pointerX - anchorX) * p;
  out.y = anchorY + (pointerY - anchorY) * p;
  return out;
}

/* ── Smoothing ────────────────────────────────────────────────────────────── */

/**
 * Frame-rate-independent exponential approach to `target`.
 *
 * Expressed as a half-life because that is the only form of these constants
 * that means the same thing at 60Hz and 144Hz. A raw
 * `x += (target - x) * 0.045` is a per-FRAME step: the same value runs the
 * motion at double speed on a 120Hz display and nearly triple on a 144Hz one.
 * This repo has already shipped that bug twice — `NeonTubes` and the
 * `ParallaxRig` lerp both needed the same repair — so this is the shape to
 * reach for instead.
 *
 * A non-positive or non-finite dt returns `current` unchanged rather than
 * jumping: a zero-length frame is a pause, not a teleport.
 */
export function damp(
  current: number,
  target: number,
  halfLifeMs: number,
  dtMs: number,
): number {
  if (!Number.isFinite(current)) return target;
  if (!Number.isFinite(target)) return current;
  if (!(dtMs > 0) || !(halfLifeMs > 0)) return current;
  return current + (target - current) * (1 - Math.pow(0.5, dtMs / halfLifeMs));
}

/** Clamp to 0..1, resolving non-finite input to 0. */
export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
