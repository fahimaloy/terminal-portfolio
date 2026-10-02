/**
 * ambient.ts — the tuning surface for the scene's idle and scroll behaviour.
 *
 * Everything here is a pure function of its arguments, which is the only reason
 * the numbers are testable. Each test below names the decision it protects
 * rather than the function it calls, so a future change to a constant fails
 * with the reason it failed instead of a bare number mismatch.
 */

import { describe, it, expect } from 'vitest';
import {
  ALIVE_REST_GAIN,
  ALIVE_RUSH_GAIN,
  DEPTH_HALF_LIFE_MS,
  DEPTH_TRAVEL,
  IDLE_ATTACK_MS,
  IDLE_RELEASE_MS,
  RUSH_FALL_MS,
  RUSH_FULL_VH_PER_S,
  RUSH_RISE_MS,
  SCROLL_SOFT_MAX_VH,
  aliveGain,
  blendAnchor,
  clamp01,
  damp,
  idleAnchor,
  layerTravel,
  presenceFromQuiet,
  rushFromVelocity,
  scrollDepth,
  scrollViewports,
  type DepthLayer,
  type SceneAnchor,
} from '../ambient';

const anchor = (): SceneAnchor => ({ x: 0, y: 0 });

describe('idle presence — the time constant', () => {
  it('holds full presence for the whole attack window', () => {
    // The scene must not react to the pointer before the visitor has actually
    // moved it. 90ms is ~5 frames and sits at the direct-manipulation
    // threshold; anything shorter and a resting scene would twitch at a stray
    // pixel of pointer noise.
    expect(presenceFromQuiet(0)).toBe(1);
    expect(presenceFromQuiet(IDLE_ATTACK_MS / 2)).toBe(1);
    expect(presenceFromQuiet(IDLE_ATTACK_MS)).toBe(1);
  });

  it('reaches full rest at the release constant, not before', () => {
    expect(presenceFromQuiet(IDLE_RELEASE_MS)).toBe(0);
    expect(presenceFromQuiet(IDLE_RELEASE_MS * 2)).toBe(0);
    expect(presenceFromQuiet(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('barely reacts to a brief pause for thought', () => {
    // The number the release constant exists to protect. Reading is not
    // motionless: a visitor tracks a sentence with the cursor, and small
    // involuntary moves keep presence high. A 500ms gap of true stillness —
    // a hand leaving the mouse to reach for a drink — must not start the scene
    // wandering. At 500ms this is still 0.94; a 800ms release would have
    // dropped it to roughly 0.2 and the attract behaviour would fire during
    // every natural pause in reading.
    expect(presenceFromQuiet(500)).toBeGreaterThan(0.9);
  });

  it('has fully handed over by two seconds of real stillness', () => {
    // The other half of the same decision, and it is deliberate rather than
    // accidental. Someone reading a long article by scrolling the wheel NEVER
    // moves the pointer — a wheel generates no `pointermove`, and neither does
    // a two-finger trackpad scroll. For them this is not an edge case, it is
    // the steady state after the first screenful, and arriving at "the scene
    // is running on its own" is the correct outcome for a reader. The two
    // behaviours are built to cover each other: the attract anchor carries
    // motion while the visitor is not scrolling, and the depth parallax carries
    // motion while they are.
    expect(presenceFromQuiet(2000)).toBeLessThan(0.25);
  });

  it('descends monotonically through the release window', () => {
    let previous = 1;
    for (let ms = 0; ms <= IDLE_RELEASE_MS; ms += 50) {
      const p = presenceFromQuiet(ms);
      expect(p).toBeLessThanOrEqual(previous);
      expect(p).toBeGreaterThanOrEqual(0);
      previous = p;
    }
  });

  it('starts and ends the release with no velocity step', () => {
    // A linear release has a visible corner at each end; smoothstep has zero
    // derivative at both. Sampled just inside each boundary because the
    // function is discontinuous in the second derivative there, not the first.
    const early =
      presenceFromQuiet(IDLE_ATTACK_MS + 1) - presenceFromQuiet(IDLE_ATTACK_MS);
    const late =
      presenceFromQuiet(IDLE_RELEASE_MS) -
      presenceFromQuiet(IDLE_RELEASE_MS - 1);
    expect(Math.abs(early)).toBeLessThan(1e-3);
    expect(Math.abs(late)).toBeLessThan(1e-3);
  });

  it('depends only on elapsed quiet time, never on how it was sampled', () => {
    // `presenceFromQuiet` takes no dt and keeps no state, which is the whole
    // reason it is immune to refresh rate. Two scenes that have been still for
    // the same 1300ms agree exactly, no matter how many frames either of them
    // has drawn to get there — a 30Hz machine and a 144Hz one converge on the
    // same number rather than drifting apart because one counted more steps.
    // Two scenes, 1300ms of stillness each, sampled on completely different
    // grids: one at 144Hz and one at 30Hz. At the shared moment of 1300ms they
    // must report the same number — which is only true because the function
    // takes elapsed time and keeps no state, rather than taking a dt and
    // integrating. A 30Hz machine and a 144Hz machine converge instead of
    // drifting apart because one of them counted more steps.
    const at = (frameMs: number, frames: number) => {
      const step = 1300 / frames;
      let value = 0;
      for (let i = 1; i <= frames; i++) value = presenceFromQuiet(i * step);
      return value;
    };
    const highRefresh = at(6.96, 187);
    const lowRefresh = at(33.33, 39);

    expect(highRefresh).toBeCloseTo(presenceFromQuiet(1300), 6);
    expect(lowRefresh).toBeCloseTo(presenceFromQuiet(1300), 6);
    expect(highRefresh).toBeCloseTo(lowRefresh, 6);
    // The input is remembered exactly, so nothing accumulates across calls.
    expect(presenceFromQuiet(1300)).toBe(presenceFromQuiet(1300));
  });

  it('treats a visitor who never moved as fully resting', () => {
    // `movedAt` stays 0 and its last-change time stays negative infinity, so the
    // quiet time is infinite. Someone who has loaded the page and not touched
    // the mouse should find something to look at.
    expect(presenceFromQuiet(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('resolves unusable input to resting rather than throwing', () => {
    expect(presenceFromQuiet(Number.NaN)).toBe(0);
    expect(presenceFromQuiet(Number.NEGATIVE_INFINITY)).toBe(0);
  });
});

describe('scroll depth — the mapping from page position to layer travel', () => {
  it('treats the top of the page as zero depth', () => {
    expect(scrollViewports(0, 900)).toBe(0);
    expect(scrollDepth(0)).toBe(0);
  });

  it('expresses scroll in viewport heights, not pixels', () => {
    // 4500px on a 900px window is five viewport heights. In pixels this number
    // would mean something different on every device and the parallax would not
    // survive a resize.
    expect(scrollViewports(4500, 900)).toBe(5);
  });

  it('refuses to divide by a collapsed or missing viewport', () => {
    // Mobile URL-bar transitions and a headless first paint can both hand this
    // a zero. A NaN here would poison the depth for the rest of the session,
    // because damp would propagate it forever.
    expect(scrollViewports(1200, 0)).toBe(0);
    expect(scrollViewports(1200, Number.NaN)).toBe(0);
    expect(scrollViewports(1200, Number.POSITIVE_INFINITY)).toBe(0);
    expect(scrollViewports(Number.NaN, 900)).toBe(0);
  });

  it('never reports negative depth when the page overscrolls on iOS', () => {
    // Rubber-banding genuinely produces negative scrollY on Safari. That is a
    // real input, not an error, and it must not pull the layers the wrong way.
    expect(scrollViewports(-80, 900)).toBe(0);
  });

  it('reads as linear over the first viewport of scroll', () => {
    // The first screenful is the scroll most visitors perform, and it has to
    // feel like a straight line. Saturation is only allowed to become visible
    // well past it.
    const oneViewport = scrollDepth(1);
    expect(oneViewport).toBeGreaterThan(0.9);
    expect(oneViewport).toBeLessThan(1);
  });

  it('degrades continuously instead of hitting a clamp wall', () => {
    // A clamped map snaps velocity to zero mid-article and the background
    // visibly "gives up" while the page is still moving. Every step of the
    // mapping has to stay positive out to the saturation point, all the way
    // past the length of a typical post.
    // From the first step, not from 0 — depth is correctly 0 at 0 and 0 is not
    // greater than 0.
    let previous = 0;
    for (let vh = 0.25; vh <= 20; vh += 0.25) {
      const d = scrollDepth(vh);
      expect(d).toBeGreaterThan(previous);
      previous = d;
    }
  });

  it('asymptotes rather than exceeding the saturation depth', () => {
    expect(scrollDepth(1e6)).toBeLessThanOrEqual(SCROLL_SOFT_MAX_VH);
    expect(scrollDepth(1e6)).toBeGreaterThan(SCROLL_SOFT_MAX_VH * 0.99);
  });

  it('is monotonic and pinned at zero for unusable input', () => {
    expect(scrollDepth(3)).toBeGreaterThan(scrollDepth(2));
    expect(scrollDepth(-5)).toBe(0);
    expect(scrollDepth(Number.NaN)).toBe(0);
  });
});

describe('layer travel — the differential parallax rates', () => {
  it('keeps every layer below the content speed', () => {
    // A rate at or above 1.0 puts the backdrop in front of the page. That does
    // not read as distant; it reads as a slide transition stuck halfway.
    for (const [layer, travel] of Object.entries(DEPTH_TRAVEL)) {
      expect(travel, layer).toBeGreaterThan(0);
    }
    const rates: Record<DepthLayer, number> = {
      grid: 0.48,
      tubes: 0.42,
      particles: 0.3,
      core: 0.22,
    };
    for (const [layer, rate] of Object.entries(rates)) {
      expect(rate, layer).toBeGreaterThan(0);
      expect(rate, layer).toBeLessThan(1);
    }
  });

  it('gives every layer a different rate, and orders them by distance', () => {
    // Depth is read from the SPREAD between layers. A single shared factor
    // would translate the whole scene as one flat cut-out and read as broken
    // rather than deep. The core is farthest and lags least; the grid is
    // closest and lags most.
    const hero = { grid: 0.48, tubes: 0.42, particles: 0.3, core: 0.22 };
    expect(new Set(Object.values(hero)).size).toBe(4);
    expect(hero.core).toBeLessThan(hero.particles);
    expect(hero.particles).toBeLessThan(hero.tubes);
    expect(hero.tubes).toBeLessThan(hero.grid);
  });

  it('scales travel by both depth and rate', () => {
    expect(layerTravel(1, 0.5, 1.1)).toBeCloseTo(0.55, 10);
    expect(layerTravel(2, 0.5, 1.1)).toBeCloseTo(1.1, 10);
    expect(layerTravel(2, 0.5, 0)).toBe(0);
  });

  it('produces no travel for unusable input rather than NaN', () => {
    // A NaN written into a group's position silently deletes the layer from
    // the render for the rest of the session.
    expect(layerTravel(Number.NaN, 0.5, 1.1)).toBe(0);
    expect(layerTravel(3, Number.NaN, 1.1)).toBe(0);
    expect(layerTravel(-1, 0.5, 1.1)).toBe(0);
  });

  it('moves the nearest layer further than the farthest at equal depth', () => {
    // The same rate applied at different depths would displace the near layer
    // by the same world amount as the far one, which reads as no depth at all.
    const at = (layer: DepthLayer) => layerTravel(3, 0.4, DEPTH_TRAVEL[layer]);
    expect(at('grid')).toBeGreaterThan(at('core'));
  });
});

describe('scroll smoothing', () => {
  it('closes half the remaining distance in one half-life', () => {
    const start = 0;
    expect(damp(start, 1, 140, 140)).toBeCloseTo(0.5, 10);
    expect(damp(start, 1, 100, 300)).toBeCloseTo(0.875, 10);
  });

  it('is frame-rate independent, unlike a raw lerp factor', () => {
    // The bug this exists to prevent: `x += (target - x) * 0.045` is a
    // per-FRAME step, so identical scenes settle at different speeds on a
    // 120Hz and a 60Hz display. Two frames of 30ms must equal one frame of
    // 60ms.
    let oneBigStep = 0;
    oneBigStep = damp(oneBigStep, 1, 140, 60);
    let twoSmallSteps = 0;
    twoSmallSteps = damp(twoSmallSteps, 1, 140, 30);
    twoSmallSteps = damp(twoSmallSteps, 1, 140, 30);
    expect(twoSmallSteps).toBeCloseTo(oneBigStep, 10);
  });

  it('treats a zero-length frame as a pause, not a teleport', () => {
    // A single pathological frame (a tab restoring, a breakpoint, a GC pause)
    // must not launch every depth layer across the screen in one tick.
    expect(damp(0, 5, 140, 0)).toBe(0);
    expect(damp(3, 5, 140, Number.NaN)).toBe(3);
    expect(damp(3, 5, 0, 16)).toBe(3);
  });

  it('settles toward the target without overshooting', () => {
    let value = 0;
    for (let i = 0; i < 400; i++) value = damp(value, 6, 140, 16.7);
    expect(value).toBeCloseTo(6, 3);
    expect(value).toBeLessThanOrEqual(6);
  });

  it('uses a half-life short enough that a flick still feels attached', () => {
    // ~8 frames at 60Hz: long enough to erase trackpad spikes, short enough
    // that the scene has essentially arrived by the time the finger stops.
    expect(DEPTH_HALF_LIFE_MS).toBeGreaterThan(60);
    expect(DEPTH_HALF_LIFE_MS).toBeLessThan(250);
  });

  it('recovers from a non-finite current value instead of propagating it', () => {
    expect(damp(Number.NaN, 4, 140, 16)).toBe(4);
  });
});

describe('rush — the fast-scroll lift', () => {
  it('is full only above a genuinely fast scroll', () => {
    expect(rushFromVelocity(0)).toBe(0);
    expect(rushFromVelocity(0.2)).toBeLessThan(0.25);
    expect(rushFromVelocity(RUSH_FULL_VH_PER_S)).toBe(1);
    expect(rushFromVelocity(RUSH_FULL_VH_PER_S * 4)).toBe(1);
  });

  it('is unsigned, so reversing scroll direction cannot flash the field', () => {
    // A signed value passing through zero at the top of a flick-back would
    // strobe the field. Only the SPEED of travel is being sold here.
    expect(rushFromVelocity(-1)).toBe(rushFromVelocity(1));
  });

  it('snaps up and eases down', () => {
    // Brightness that decays as fast as it rises reads as a flicker.
    expect(RUSH_RISE_MS).toBeLessThan(RUSH_FALL_MS);
  });

  it('is zero for unusable velocity', () => {
    expect(rushFromVelocity(Number.NaN)).toBe(0);
    expect(rushFromVelocity(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('aliveGain — the guarantee that rest never dims the scene', () => {
  it('is exactly 1.0 while the visitor is driving the scene', () => {
    // Byte-for-byte the behaviour the shader had before idle existed, so an
    // engaged session changes not one pixel.
    expect(aliveGain(1, 0)).toBe(1);
  });

  it('never drops below 1.0 anywhere in the range', () => {
    // The load-bearing invariant. If this could go below 1, a resting scene
    // would subtract brightness, and the chat shockwave's 2.6x peak would be
    // scaled down by a background the user did not know was interacting.
    for (const presence of [0, 0.25, 0.5, 0.75, 1]) {
      for (const rush of [0, 0.5, 1]) {
        expect(aliveGain(presence, rush)).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('can only ADD to the shockwave, so the pulse survives a resting scene', () => {
    // The shockwave peaks at 2.6x via the shader's own vFade. Engaged: 2.6x.
    // Fully resting: 2.6 * 1.14. The quiet makes the event louder, never
    // dimmer — which is exactly the read we want before a chat send.
    const engaged = 2.6 * aliveGain(1, 0);
    const resting = 2.6 * aliveGain(0, 0);
    expect(engaged).toBeCloseTo(2.6, 10);
    expect(resting).toBeGreaterThan(engaged);
  });

  it('stays a small lift, because it sits behind body text', () => {
    // The field is additive over the page. A big resting gain would put
    // paragraph text back under the 4.5:1 ceiling the hero numbers were tuned
    // against, and it would do so precisely when nobody is interacting and
    // therefore not watching for it.
    expect(aliveGain(0, 0)).toBeCloseTo(1 + ALIVE_REST_GAIN, 10);
    expect(aliveGain(0, 1)).toBeCloseTo(
      1 + ALIVE_REST_GAIN + ALIVE_RUSH_GAIN,
      10,
    );
    expect(aliveGain(0, 1)).toBeLessThan(1.25);
  });

  it('rises monotonically as the visitor goes quiet and as scroll speeds up', () => {
    expect(aliveGain(0.5, 0)).toBeGreaterThan(aliveGain(1, 0));
    expect(aliveGain(0, 0.5)).toBeGreaterThan(aliveGain(0, 0));
  });

  it('clamps out-of-range and unusable input', () => {
    expect(aliveGain(5, 5)).toBe(aliveGain(1, 1));
    // A negative presence clamps toward RESTING, not toward engaged — the same
    // "when in doubt, show the attract state" rule presenceFromQuiet applies.
    expect(aliveGain(-3, -3)).toBeCloseTo(1 + ALIVE_REST_GAIN, 10);
    expect(Number.isFinite(aliveGain(Number.NaN, Number.NaN))).toBe(true);
    expect(aliveGain(Number.NaN, Number.NaN)).toBeCloseTo(
      1 + ALIVE_REST_GAIN,
      10,
    );
  });
});

describe('attract anchor', () => {
  it('stays inside the normalised pointer space', () => {
    // The anchor shares the -1..1 space the pointer uses, so anything outside
    // it would push the rig past the range a real cursor can reach — the
    // resting scene could then frame something an engaged one never could.
    for (let t = 0; t < 900; t += 3.7) {
      const a = idleAnchor(anchor(), t);
      expect(Math.abs(a.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(a.y)).toBeLessThanOrEqual(1);
    }
  });

  it('never repeats its composition on any timescale a visitor will sit through', () => {
    // This is the actual mechanism behind "the scene never returns to exactly
    // the same frame". A single sine loops visibly within minutes; two sines at
    // a rational frequency ratio loop too. Sampled across ten minutes, no frame
    // should come back.
    const seen = new Set<string>();
    for (let t = 0; t < 600; t += 0.5) {
      const a = idleAnchor(anchor(), t);
      seen.add(`${a.x.toFixed(3)}:${a.y.toFixed(3)}`);
    }
    expect(seen.size).toBeGreaterThan(1100);
  });

  it('moves slowly enough to read as a drift, not a wobble', () => {
    // Roughly 0.05 normalised units per second. A visitor watching the hero
    // should have to wait a few seconds to notice the framing has changed.
    const a = idleAnchor(anchor(), 0);
    const b = idleAnchor(anchor(), 1);
    const moved = Math.hypot(b.x - a.x, b.y - a.y);
    expect(moved).toBeGreaterThan(0);
    expect(moved).toBeLessThan(0.12);
  });

  it('writes into the supplied object instead of allocating per frame', () => {
    // The frame loop runs 60-120x/s for the life of the canvas; the rest of
    // the scene is careful never to allocate there.
    const out = anchor();
    expect(idleAnchor(out, 3)).toBe(out);
  });

  it('resolves unusable time to the origin rather than NaN', () => {
    const a = idleAnchor(anchor(), Number.NaN);
    expect(Number.isFinite(a.x)).toBe(true);
    expect(Number.isFinite(a.y)).toBe(true);
  });
});

describe('anchor blending — the handoff between pointer and attract', () => {
  it('gives the pointer total authority the instant it moves', () => {
    const out = blendAnchor(anchor(), 0.5, -0.25, 0.9, 0.9, 1);
    expect(out.x).toBeCloseTo(0.5, 10);
    expect(out.y).toBeCloseTo(-0.25, 10);
  });

  it('is pure anchor at full rest', () => {
    const out = blendAnchor(anchor(), 0.5, -0.25, 0.9, 0.4, 0);
    expect(out.x).toBeCloseTo(0.9, 10);
    expect(out.y).toBeCloseTo(0.4, 10);
  });

  it('crossfades continuously, so the switch is never a cut', () => {
    // A hard switch between two motion profiles reads as a glitch. Halfway
    // must be exactly halfway between the two framings.
    const out = blendAnchor(anchor(), 0, 0, 1, 1, 0.5);
    expect(out.x).toBeCloseTo(0.5, 10);
    expect(out.y).toBeCloseTo(0.5, 10);
  });

  it('stays continuous across the whole presence range', () => {
    // The rig's own damp hides the rest of the handoff, but only if the target
    // moves smoothly. A jump anywhere in this range would be visible as a
    // single-frame jerk on the first pointer move.
    let previous = blendAnchor(anchor(), 0.2, 0.2, 1, 1, 0).x;
    for (let p = 0; p <= 1.0001; p += 0.01) {
      const out = blendAnchor(anchor(), 0.2, 0.2, 1, 1, p);
      expect(Math.abs(out.x - previous)).toBeLessThan(0.02);
      previous = out.x;
    }
  });

  it('clamps presence, so a stray value cannot invert the blend', () => {
    expect(blendAnchor(anchor(), 0.5, 0.5, 0, 0, 9).x).toBeCloseTo(0.5, 10);
    expect(blendAnchor(anchor(), 0.5, 0.5, 1, 1, -9).x).toBeCloseTo(1, 10);
  });
});

describe('clamp01', () => {
  it('bounds, and resolves non-finite input to zero', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(Number.NaN)).toBe(0);
    expect(clamp01(Number.POSITIVE_INFINITY)).toBe(0);
  });
});
