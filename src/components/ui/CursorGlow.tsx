// src/components/ui/CursorGlow.tsx
/* The pointer instrument: a small HUD reticle that acquires under the cursor and
 * drags a two-ring motion trail behind it. Everything it draws is a hairline
 * built from the accent role tokens, so it repaints with AccentSwitcher. */

import React, { useEffect, useRef } from 'react';
import { animate, createScope, createTimeline } from 'animejs';
import type { Scope } from 'animejs';
import { canAnimate, durations, easings } from '../../config/animations';

interface CursorGlowProps {
  /** Any CSS colour. Omit it to follow the active accent. */
  color?: string;
  /** Diameter of the main ring, in px. Every other part is a proportion of it. */
  size?: number;
  /** Scales every alpha on the instrument. 1 is the designed value. */
  intensity?: number;
}

/* ── GEOMETRY ────────────────────────────────────────────────────────────────
   One number should size the whole instrument, so `size` is the main ring and
   the rest are proportions of it. Ordered by radius, so nothing collides:

     core 0.16 · ring 1.00 · ticks 1.34 · brackets 1.70
     echo 2.10 · echo 2.55 · halo 3.20

   The two echoes sit outside the brackets because they are the ones that
   travel — a trail wants open space around it to read as motion.
   ─────────────────────────────────────────────────────────────────────────── */
const HALO_SPAN = 3.2;
const NEAR_ECHO_SPAN = 2.1;
const FAR_ECHO_SPAN = 2.55;
const BRACKET_SPAN = 1.7;
const BRACKET_ARM = 0.26;
const TICK_SPAN = 1.34;
const CORE_SPAN = 0.16;

/** The crosshair hairline fades over this fraction of the ring. */
const FADE_RUN = 1.6;

/* ── ALPHAS ──────────────────────────────────────────────────────────────────
   Nothing here is opaque. A reticle that sits over the whole site has to stay
   quieter than the content above it, so every layer is a fraction and the
   instrument reads as light rather than as an object.
   ─────────────────────────────────────────────────────────────────────────── */
const HALO_ALPHA = 0.85;
const RING_ALPHA = 0.5;
const BRACKET_ALPHA = 0.45;
const TICK_ALPHA = 0.4;
const CORE_ALPHA = 0.95;
const NEAR_ECHO_ALPHA = 0.34;
const FAR_ECHO_ALPHA = 0.16;

/* ── TIMING ──────────────────────────────────────────────────────────────────
   Exponential smoothing rather than a fixed-duration tween, so the follow
   never restarts, never queues, and stays frame-rate independent. Each layer
   has its own time constant and the echoes trail the lead, which is what makes
   a fast flick leave a streak instead of a step.

     lead 200ms · near echo 300ms · far echo 500ms

   These are the token values the old animatable already leaned on, retimed as
   smoothing constants instead of tween lengths.
   ─────────────────────────────────────────────────────────────────────────── */
const LEAD_TAU_MS = durations[200] * 1000;
const NEAR_TAU_MS = durations[300] * 1000;
const FAR_TAU_MS = durations[500] * 1000;

/** Frame-time ceiling. A tab that was hidden for a minute must not teleport. */
const MAX_FRAME_MS = LEAD_TAU_MS;

/** Sub-pixel rest threshold. Below this nothing is visibly moving. */
const SETTLE_PX = 0.1;

/* ── ENTRANCE ────────────────────────────────────────────────────────────────
   The acquisition beat: the wash blooms in from wide, the corner brackets snap
   out of a larger box, the crosshair draws itself out of the centre. One-shot —
   a perpetual loop would keep anime's rAF engine awake for the whole session in
   exchange for a decorative 34px instrument.
   ─────────────────────────────────────────────────────────────────────────── */
const HALO_ENTER_SCALE = 2.1;
const BRACKET_ENTER_SCALE = 1.9;
const TICK_ENTER_SCALE = 0.2;

const REDUCE_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export default function CursorGlow({
  color,
  size = 34,
  intensity = 1,
}: CursorGlowProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const bracketsRef = useRef<HTMLDivElement>(null);
  const ticksRef = useRef<HTMLDivElement>(null);
  const nearEchoRef = useRef<HTMLDivElement>(null);
  const farEchoRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<Scope | null>(null);
  const motionRef = useRef(false);

  /* Props feed the frame loop through refs, not through its dependency list —
     a resized instrument must not tear down and rebuild the pointer rig. */
  const sizeRef = useRef(size);
  const intensityRef = useRef(intensity);
  useEffect(() => {
    sizeRef.current = size;
    intensityRef.current = intensity;
  }, [size, intensity]);

  /* Accent role tokens, so the reticle repaints with the AccentSwitcher for
     free. A caller override replaces the crisp layers and is mixed down (never
     used raw) for the wash, so a solid colour cannot become a hard disc. */
  const accent = color ?? 'var(--accent-color)';
  const accentHairline = color ?? 'var(--accent-glow)';
  const accentWash = color
    ? `color-mix(in srgb, ${color} 10%, transparent)`
    : 'var(--accent-wash)';

  const alpha = (base: number) => clamp01(base * intensity);

  const haloPx = HALO_SPAN * size;
  const nearPx = NEAR_ECHO_SPAN * size;
  const farPx = FAR_ECHO_SPAN * size;
  const bracketPx = BRACKET_SPAN * size;
  const armPx = BRACKET_SPAN * BRACKET_ARM * size;
  const tickPx = TICK_SPAN * size;
  const corePx = CORE_SPAN * size;

  /* anime owns root opacity and the one-shot entrance scales. The scope exists
     only so that a single `revert()` on unmount undoes every tween — the follow
     loop below is plain rAF and writes nothing anime knows about. */
  useEffect(() => {
    scopeRef.current = createScope({
      root: rootRef.current ?? undefined,
      mediaQueries:
        typeof window.matchMedia === 'function'
          ? { reduceMotion: REDUCE_MOTION_QUERY }
          : undefined,
      defaults: { ease: easings.expoOut },
    });
    return () => {
      scopeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const rootEl = rootRef.current;
    const haloEl = haloRef.current;
    const bracketsEl = bracketsRef.current;
    const ticksEl = ticksRef.current;
    const nearEl = nearEchoRef.current;
    const farEl = farEchoRef.current;
    if (!rootEl || !haloEl || !bracketsEl || !ticksEl || !nearEl || !farEl)
      return;

    let raf = 0;
    let last = 0;
    let acquired = false;
    let armed = false;

    const target = { x: 0, y: 0 };
    const lead = { x: 0, y: 0 };
    const trail = [
      { el: nearEl, x: 0, y: 0, tau: NEAR_TAU_MS, alpha: NEAR_ECHO_ALPHA },
      { el: farEl, x: 0, y: 0, tau: FAR_TAU_MS, alpha: FAR_ECHO_ALPHA },
    ];

    /* ── the one rAF ────────────────────────────────────────────────────────
       Coalesced: `schedule` is a no-op while a frame is already pending, so a
       1000Hz mouse produces exactly one write per paint. It parks the instant
       the instrument is at rest and wakes on the next event — the component
       costs nothing at idle.
       ─────────────────────────────────────────────────────────────────────── */
    const frame = (now: number) => {
      raf = 0;
      const dt = last > 0 ? Math.min(now - last, MAX_FRAME_MS) : MAX_FRAME_MS;
      last = now;
      // Reduced motion keeps tracking, it only stops lagging: a readout that
      // pinned itself in the corner would be worse than one that sits still.
      const calm = !motionRef.current;

      const leadK = calm ? 1 : 1 - Math.exp(-dt / LEAD_TAU_MS);
      lead.x += (target.x - lead.x) * leadK;
      lead.y += (target.y - lead.y) * leadK;
      rootEl.style.transform = `translate3d(${lead.x.toFixed(2)}px, ${lead.y.toFixed(2)}px, 0)`;

      const fadeRun = FADE_RUN * sizeRef.current;
      let rested =
        Math.abs(target.x - lead.x) < SETTLE_PX &&
        Math.abs(target.y - lead.y) < SETTLE_PX;

      for (let i = 0; i < trail.length; i += 1) {
        const node = trail[i];
        const k = calm ? 1 : 1 - Math.exp(-dt / node.tau);
        node.x += (target.x - node.x) * k;
        node.y += (target.y - node.y) * k;
        node.el.style.transform = `translate3d(${node.x.toFixed(2)}px, ${node.y.toFixed(2)}px, 0)`;

        // Distance from the lead is what turns concentric rings (at rest) into
        // a comet tail (in motion), so one number drives the whole trail.
        const distance = Math.hypot(lead.x - node.x, lead.y - node.y);
        const fade = distance >= fadeRun ? 0 : 1 - distance / fadeRun;
        node.el.style.opacity = (
          node.alpha *
          fade *
          intensityRef.current
        ).toFixed(3);

        if (
          Math.abs(target.x - node.x) >= SETTLE_PX ||
          Math.abs(target.y - node.y) >= SETTLE_PX
        )
          rested = false;
      }

      if (rested) {
        last = 0;
        return;
      }
      raf = window.requestAnimationFrame(frame);
    };

    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(frame);
    };

    /* ── presence ───────────────────────────────────────────────────────────
       Root opacity is anime's alone; every layer underneath inherits it, so
       presence is a single property instead of seven.
       ─────────────────────────────────────────────────────────────────────── */
    const acquire = () => {
      if (acquired) return;
      acquired = true;
      const scope = scopeRef.current;
      if (!motionRef.current || !scope) {
        rootEl.style.opacity = '1';
        return;
      }
      if (!armed) {
        armed = true;
        scope.execute(() =>
          createTimeline({
            defaults: {
              ease: easings.expoOut,
              duration: durations.enter * 1000,
            },
          })
            .add(haloEl, { scale: [HALO_ENTER_SCALE, 1] }, 0)
            .add(
              bracketsEl,
              {
                scale: [BRACKET_ENTER_SCALE, 1],
                delay: durations.stagger * 1000,
              },
              0,
            )
            .add(
              ticksEl,
              {
                scale: [TICK_ENTER_SCALE, 1],
                delay: durations.stagger * 1000 * 2,
              },
              0,
            ),
        );
      }
      scope.execute(() =>
        animate(rootEl, {
          opacity: [0, 1],
          duration: durations.enter * 1000,
          ease: easings.expoOut,
        }),
      );
    };

    const release = () => {
      if (!acquired) return;
      acquired = false;
      const scope = scopeRef.current;
      if (!motionRef.current || !scope) {
        rootEl.style.opacity = '0';
        return;
      }
      scope.execute(() =>
        animate(rootEl, {
          opacity: 0,
          duration: durations.exit * 1000,
          ease: easings.quadOut,
        }),
      );
    };

    /* ── pointer ────────────────────────────────────────────────────────────
       One passive listener on window, values into plain objects, never state.
       Touch is ignored on purpose: a finger dragging a phone would otherwise
       smear a 100px reticle across whatever the finger is scrolling.
       ─────────────────────────────────────────────────────────────────────── */
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const x = event.clientX;
      const y = event.clientY;
      // First sighting seeds every layer, or the instrument streaks in from the
      // page origin instead of simply being there.
      if (!acquired) {
        lead.x = x;
        lead.y = y;
        for (let i = 0; i < trail.length; i += 1) {
          trail[i].x = x;
          trail[i].y = y;
        }
      }
      target.x = x;
      target.y = y;
      acquire();
      schedule();
    };

    const onLeave = () => release();

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave, { passive: true });
    window.addEventListener('blur', onLeave);

    /* A live `prefers-reduced-motion` flip calms the follow immediately; the
       scope's own media query handles anime's half. */
    const mq =
      typeof window.matchMedia === 'function'
        ? window.matchMedia(REDUCE_MOTION_QUERY)
        : null;
    const syncMotion = () => {
      motionRef.current = canAnimate();
    };
    syncMotion();
    mq?.addEventListener?.('change', syncMotion);

    const scope = scopeRef.current;
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
      mq?.removeEventListener?.('change', syncMotion);
      scopeRef.current = null;
      if (scope) {
        try {
          scope.revert();
        } catch {
          /* anime throws if the scope was already reverted; nothing to undo. */
        }
      }
    };
  }, []);

  /* ── markup ─────────────────────────────────────────────────────────────────
     Children are centred on the instrument with static offsets (left/top plus a
     negative margin) rather than a translate, so the trail rings can own their
     whole transform and the entrance timeline can own its own.
     ─────────────────────────────────────────────────────────────────────────── */
  const bracketEdge = (edges: string) => ({
    borderTop: edges.includes('t') ? `1px solid ${accent}` : undefined,
    borderRight: edges.includes('r') ? `1px solid ${accent}` : undefined,
    borderBottom: edges.includes('b') ? `1px solid ${accent}` : undefined,
    borderLeft: edges.includes('l') ? `1px solid ${accent}` : undefined,
  });

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      data-cursor-glow=""
      className="pointer-events-none fixed left-0 top-0 z-[1]"
      style={{ opacity: 0, willChange: 'transform, opacity' }}
    >
      <div
        ref={haloRef}
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          width: haloPx,
          height: haloPx,
          marginLeft: -haloPx / 2,
          marginTop: -haloPx / 2,
          // A gradient that is already soft, rather than a hard disc pushed
          // through a 20px blur — one less full-screen filter buffer.
          background: `radial-gradient(circle, ${accentWash} 0%, transparent 68%)`,
          opacity: alpha(HALO_ALPHA),
          willChange: 'transform',
        }}
      />
      <div
        ref={farEchoRef}
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          width: farPx,
          height: farPx,
          marginLeft: -farPx / 2,
          marginTop: -farPx / 2,
          border: `1px solid ${accentHairline}`,
          opacity: 0,
          willChange: 'transform, opacity',
        }}
      />
      <div
        ref={nearEchoRef}
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          width: nearPx,
          height: nearPx,
          marginLeft: -nearPx / 2,
          marginTop: -nearPx / 2,
          border: `1px solid ${accentHairline}`,
          opacity: 0,
          willChange: 'transform, opacity',
        }}
      />
      <div
        ref={bracketsRef}
        className="absolute left-1/2 top-1/2"
        style={{
          width: bracketPx,
          height: bracketPx,
          marginLeft: -bracketPx / 2,
          marginTop: -bracketPx / 2,
          opacity: alpha(BRACKET_ALPHA),
          willChange: 'transform',
        }}
      >
        {(['tl', 'tr', 'br', 'bl'] as const).map((corner) => (
          <div
            key={corner}
            className={`absolute ${
              corner.includes('l') ? 'left-0' : 'right-0'
            } ${corner.includes('t') ? 'top-0' : 'bottom-0'}`}
            style={{
              width: armPx,
              height: armPx,
              ...bracketEdge(corner),
            }}
          />
        ))}
      </div>
      <div
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          width: size,
          height: size,
          marginLeft: -size / 2,
          marginTop: -size / 2,
          border: `1px solid ${accentHairline}`,
          opacity: alpha(RING_ALPHA),
        }}
      />
      <div
        ref={ticksRef}
        className="absolute left-1/2 top-1/2"
        style={{
          width: tickPx,
          height: tickPx,
          marginLeft: -tickPx / 2,
          marginTop: -tickPx / 2,
          opacity: alpha(TICK_ALPHA),
          willChange: 'transform',
        }}
      >
        <div
          className="absolute left-0 top-1/2"
          style={{
            width: tickPx,
            height: 1,
            marginTop: -0.5,
            background: `linear-gradient(90deg, transparent, ${accentHairline}, transparent)`,
          }}
        />
        <div
          className="absolute left-1/2 top-0"
          style={{
            width: 1,
            height: tickPx,
            marginLeft: -0.5,
            background: `linear-gradient(180deg, transparent, ${accentHairline}, transparent)`,
          }}
        />
      </div>
      <div
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          width: corePx,
          height: corePx,
          marginLeft: -corePx / 2,
          marginTop: -corePx / 2,
          background: accent,
          opacity: alpha(CORE_ALPHA),
        }}
      />
    </div>
  );
}
