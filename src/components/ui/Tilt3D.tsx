// src/components/ui/Tilt3D.tsx
/* ═══════════════════════════════════════════════════════════════════════════════
   TILT — pointer-follow 3D tilt for HUD cards.

   This used to allocate a FRESH anime.js instance on every `mousemove`, one per
   event per card, cancelling the previous one first. A 1000Hz mouse over a grid
   of `SkillCard`s meant hundreds of tween allocations per second, each restarted
   before it could settle — jank, GC pressure, and a follow that never arrived.

   It is now one coalesced rAF per card that eases toward the pointer with
   exponential smoothing, `k = 1 - exp(-dt / tau)`. That is frame-rate
   independent (two 100ms frames and one 200ms frame land in the same place), it
   never restarts and never queues, and it allocates nothing per event. The loop
   parks itself the moment the card is at rest and wakes on the next pointer
   event, so a grid of cards costs nothing until one is actually hovered.

   Every time constant is a token, read as a smoothing constant rather than a
   tween length — which is why there is no easing curve here at all.
   ═══════════════════════════════════════════════════════════════════════════════ */

import React, { useCallback, useEffect, useRef } from 'react';
import { canAnimate, durations } from '../../config/animations';

type Props = {
  children: React.ReactNode;
  /**
   * Peak tilt. The pointer is mapped to [-0.5, 0.5] on each axis before it is
   * scaled, so the extreme rotation is HALF this value: `4` swings ±2° at the
   * edges, `3` (the admin stat cards) swings ±1.5°. Unchanged by the rewrite.
   */
  intensity?: number;
  className?: string;
};

/* ── TIMING ────────────────────────────────────────────────────────────────
   FOLLOW is the lag while the pointer is on the card, and is deliberately the
   same lead constant CursorGlow uses so the two pointer instruments feel like
   one system. RETURN is slower: leaving a card should settle back rather than
   snap, which is what the old 500ms reset tween was reaching for.

   These are time constants, not tween lengths. `k` is derived from `dt` on
   every frame, so they retime themselves instead of restarting.
   ─────────────────────────────────────────────────────────────────────────── */
const FOLLOW_TAU_MS = durations[200] * 1000;
const RETURN_TAU_MS = durations[500] * 1000;

/** Frame-time ceiling. A tab that was hidden for a minute must not teleport. */
const MAX_FRAME_MS = FOLLOW_TAU_MS;

/* dt assumed when a frame is the FIRST after a park (`last === 0`). It must
   read as one ordinary refresh, not as a whole time constant: with the
   ceiling here, `k = 1 - e^-1` = 0.632, so a hover entry would jump 63% of
   the way to full tilt in the very first frame (≈1.26° of 2° in 16ms) —
   the card pops instead of leaning. One nominal 60Hz frame gives
   `k ≈ 0.080`, so entry starts at the same rate as every frame after it.
   Derived from the token so it follows the follow-τ if that ever retimes. */
const NOMINAL_FRAME_MS = FOLLOW_TAU_MS / 12;

/** Sub-hundredth-degree rest threshold. Below this nothing is visibly moving. */
const SETTLE_DEG = 0.01;

const REDUCE_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/* Mutable per-instance state. Held in a ref and rebuilt by the effect, so a
   prop change retimes the follow instead of tearing the rig down. */
type Rig = {
  /** Pending frame handle, 0 when parked. */
  raf: number;
  /** Previous frame timestamp; 0 means no frame has run yet. */
  last: number;
  /** True while easing back to flat after the pointer has left. */
  returning: boolean;
  /** Target tilt in degrees. */
  tx: number;
  ty: number;
  /** Current tilt in degrees. */
  cx: number;
  cy: number;
  /** Installed by the effect; null once unmounted, which makes the handlers inert. */
  schedule: (() => void) | null;
};

const makeRig = (): Rig => ({
  raf: 0,
  last: 0,
  returning: false,
  tx: 0,
  ty: 0,
  cx: 0,
  cy: 0,
  schedule: null,
});

export default function Tilt3D({
  children,
  intensity = 4,
  className = '',
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const rigRef = useRef<Rig | null>(null);
  const motionRef = useRef(false);

  /* Props reach the frame loop through a ref: a new `intensity` must retune the
     next frame, not restart the rig. */
  const intensityRef = useRef(intensity);
  useEffect(() => {
    intensityRef.current = intensity;
  }, [intensity]);

  /* ── the frame loop ───────────────────────────────────────────────────────
     One write per paint, whatever the pointer rate. `schedule` is a no-op while
     a frame is already pending.
     ─────────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // Annotated rather than inferred: `frame` below is a hoisted declaration, so
    // TypeScript will not carry this effect's narrowing into it, and every write
    // from inside the loop would read as `possibly null`.
    const el: HTMLDivElement = node;
    const rig = makeRig();

    const write = (x: number, y: number) => {
      el.style.transform = `rotateX(${x.toFixed(3)}deg) rotateY(${y.toFixed(3)}deg)`;
    };

    function frame(now: number) {
      rig.raf = 0;
      const dt =
        rig.last > 0
          ? Math.min(now - rig.last, MAX_FRAME_MS)
          : NOMINAL_FRAME_MS;
      rig.last = now;

      const tau = rig.returning ? RETURN_TAU_MS : FOLLOW_TAU_MS;
      const k = 1 - Math.exp(-dt / tau);
      rig.cx += (rig.tx - rig.cx) * k;
      rig.cy += (rig.ty - rig.cy) * k;

      const settled =
        Math.abs(rig.tx - rig.cx) < SETTLE_DEG &&
        Math.abs(rig.ty - rig.cy) < SETTLE_DEG;
      if (settled) {
        // Land exactly on the target, so a released card is genuinely square,
        // then park: no frame is pending, so idle cards cost nothing.
        rig.cx = rig.tx;
        rig.cy = rig.ty;
        write(rig.cx, rig.cy);
        rig.last = 0;
        el.style.willChange = '';
        return;
      }

      write(rig.cx, rig.cy);
      rig.raf = window.requestAnimationFrame(frame);
    }

    rig.schedule = () => {
      if (!rig.raf) {
        // Only the card that is actually moving is promoted to its own layer;
        // a grid of `will-change: transform` divs is a grid of GPU textures.
        el.style.willChange = 'transform';
        rig.raf = window.requestAnimationFrame(frame);
      }
    };

    /* Hand the card back flat and stop dead: for a live reduced-motion flip,
       where easing a frozen tilt home would itself be motion. */
    const rest = () => {
      rig.tx = 0;
      rig.ty = 0;
      rig.cx = 0;
      rig.cy = 0;
      rig.returning = false;
      if (rig.raf) window.cancelAnimationFrame(rig.raf);
      rig.raf = 0;
      rig.last = 0;
      el.style.transform = '';
      el.style.willChange = '';
    };

    const syncMotion = () => {
      const next = canAnimate();
      const was = motionRef.current;
      motionRef.current = next;
      if (next || !was) return;
      rest();
    };

    syncMotion();
    rigRef.current = rig;

    const mq =
      typeof window.matchMedia === 'function'
        ? window.matchMedia(REDUCE_MOTION_QUERY)
        : null;
    mq?.addEventListener?.('change', syncMotion);

    return () => {
      if (rig.raf) window.cancelAnimationFrame(rig.raf);
      rig.raf = 0;
      rig.last = 0;
      rig.schedule = null;
      mq?.removeEventListener?.('change', syncMotion);
      // Only clear the ref if it is still ours: a StrictMode remount rebuilds
      // the rig, and clearing that one would leave the card permanently inert.
      if (rigRef.current === rig) rigRef.current = null;
      // Leave the node as we found it, so a remount cannot inherit a tilt.
      el.style.transform = '';
      el.style.willChange = '';
    };
  }, []);

  /* ── pointer ──────────────────────────────────────────────────────────────
     One handler per card, values into plain numbers, never state. Reduced
     motion gets no tilt at all, which is what this component has always done:
     a card that leans after the cursor is still motion, however short.
     ─────────────────────────────────────────────────────────────────────────── */
  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    const rig = rigRef.current;
    if (!el || !rig || !motionRef.current) return;
    const r = el.getBoundingClientRect();
    // A collapsed card (a zero-height row, `display:none` on a hidden tab) has
    // no inside to map against; dividing by it would hand the transform a NaN.
    if (r.width <= 0 || r.height <= 0) return;
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    // `tx`/`ty` are the ROTATION targets, not the pointer offsets: rotateX
    // answers the vertical offset (negated, so the edge nearest the cursor
    // dips away from it) and rotateY answers the horizontal one. Transposing
    // these two reads as a glitch rather than as a tweak — the card nods to a
    // sideways cursor instead of turning to it — and it preserves the original
    // magnitude, so nothing but an axis assertion would catch it.
    rig.tx = -ny * intensityRef.current;
    rig.ty = nx * intensityRef.current;
    rig.returning = false;
    rig.schedule?.();
  }, []);

  const onLeave = useCallback(() => {
    const rig = rigRef.current;
    if (!rig || !motionRef.current) return;
    rig.tx = 0;
    rig.ty = 0;
    rig.returning = true;
    rig.schedule?.();
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        transformStyle: 'preserve-3d',
        // Perspective lives here, on the parent of the transformed content:
        // with preserve-3d the children share this vanishing point, so the card
        // itself rotates flat while its contents foreshorten.
        perspective: '800px',
      }}
      className={className}
    >
      {children}
    </div>
  );
}
