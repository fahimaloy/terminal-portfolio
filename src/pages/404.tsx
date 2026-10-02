// src/pages/404.tsx
/* 404 — premium with splitText + scrambleText + drawable bracket + morph orb

   OPACITY OWNERSHIP (P3.10)
   --------------------------
   There is exactly ONE system that owns opacity on this page, and it is the
   `tl` timeline built inside the effect below. There is deliberately no
   MutationObserver, no rAF poll and no "rescue" loop racing it — an earlier
   version had one, and two writers of `style.opacity` on the same node is
   precisely how the page could end up half-faded or permanently in a loop.

   The two branches are mutually exclusive by construction, so they cannot
   fight:
     - motion allowed  -> `scope.add()` runs, the timeline owns every node.
     - motion declined -> NO scope and NO timeline is ever created, and the
       one-shot normalisation below puts every `[data-notfound-anim]` node at
       its final visible state before paint.
   Because the fallback is a single synchronous pass (not an observer), and it
   only runs where the timeline does not exist, the previous race is gone.

   The residual pass at the end of the timeline is the safety net that keeps
   that invariant true: any node that opts into `data-notfound-anim` but is not
   otherwise claimed by the timeline is faded in by the timeline itself, so
   adding a twelfth animated element can never render nothing forever.
   THAT is why every `.reveal` element below carries `data-notfound-anim` —
   drop the marker from a node and it becomes the one node no system owns. */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { HudPanel, NeonButton, StatBar } from '../components/ui';
import {
  createScope,
  createTimeline,
  stagger,
  createDrawable,
  spring,
} from 'animejs';
import { splitText, scrambleText } from 'animejs';
import {
  durations,
  easings,
  springs,
  isReducedMotion,
  canAnimate,
} from '../config/animations';
import MorphOrb from '../components/ui/graphics/primitives/MorphOrb';
import Bracket from '../components/ui/graphics/primitives/Bracket';

/* ── TIMING — every value derived from a --dur-* token (no literals) ──────────
   `durations` is seconds; anime v4 wants milliseconds. The three cadences the
   choreography used to spell out as 18 / 22 / 60 ms are now multipliers of
   --dur-stagger (60ms), so retiming the token retimes the whole entrance. */
const STEP_MS = durations.stagger * 1000; // 60ms — cascade block offsets
const GLYPH_STEP_MS = STEP_MS * 0.3; // 18ms — per-glyph cascade
const BLOCK_STEP_MS = STEP_MS * 0.37; // 22ms — diagnostic rows + buttons

/* ── PRE-NAVIGATION EXIT ──────────────────────────────────────────────────────
   The two recovery buttons used to call `router.push` / `router.back` on the
   same tick as the click, so the page was replaced with no acknowledgement that
   anything had been pressed.

   TIMING. 300ms (--dur-300) for the exit itself:
     - it is well under the 640ms (--dur-enter) entrance, so the pair reads as
       "out fast, in deliberate" rather than as one idea applied twice;
     - it is subordinate to the site-wide route transition that _app.tsx is
       starting at the same moment. Two full-weight transitions racing would
       smear into a single long dissolve, so this one is deliberately the small
       one and does not compete for the visitor's attention;
     - and it is the whole of the latency. See the threshold note below.

   WHEN NAVIGATION FIRES — on completion, not at a partial progress. The exit
   eases in (`expoIn`), which means the visible part of the fade is concentrated
   in the last ~20% of the duration: at 60% progress the page is still ~94%
   opaque, and at 75% it is still ~88%. Firing `router.push` there does not read
   as "the exit has gone far enough", it reads as the exit being cut off
   mid-fade — strictly worse than waiting out 300ms. So for an accelerating exit
   curve "far enough along" and "complete" are within a frame or two of each
   other, and the only real lever on perceived latency is the duration itself.
   That is why 300ms is a hard budget rather than a tuning knob.

   `NAV_DEADLINE_MS` is the anti-stall backstop and is deliberately longer than
   the exit, so on the happy path it never wins the race. It exists for the case
   where the animation does not deliver: a backgrounded tab with throttled rAF,
   an engine that skips the final callback, or a throw inside a tick. A visitor
   on a 404 page who clicks "go home" and nothing happens is a far worse
   outcome than no animation at all, so navigation is wired to three paths —
   completion, deadline, and the catch around the animation itself — that all
   funnel through one idempotent `fire()`. */
const EXIT_MS = durations[300] * 1000; // 300ms
const NAV_DEADLINE_MS = durations.exit * 1000 + durations.stagger * 1000 * 2; // 520ms
/** Matches the direction of `exitAnim` in config/animations.ts, at a
    deliberately smaller amount so this exit stays subordinate to the route
    transition running alongside it. Distance, not time, so not a --dur-* token. */
const EXIT_DRIFT_PX = 12;

export default function NotFoundPage() {
  const router = useRouter();
  const [glitchText] = useState('404');
  const [particles, setParticles] = useState<
    { x: number; y: number; dur: number; delay: number; color: string }[]
  >([]);
  const pageRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);
  // The scramble fallback drives `textContent` on its own timer. It has to be
  // reachable from the effect cleanup, otherwise it keeps writing to a
  // detached node after the route changes — the same class of bug as the
  // observer this file used to carry.
  const scrambleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Pre-navigation exit state. `navStateRef` is the idempotence key for the
  // whole thing: exactly one navigation per visit, no matter how many of the
  // paths below fire or in what order.
  const navStateRef = useRef<'idle' | 'pending' | 'fired'>('idle');
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitScopeRef = useRef<ReturnType<typeof createScope> | null>(null);

  const targetMsg =
    "THE PAGE YOU'RE LOOKING FOR ISN'T IN THE LOCAL NETWORK. THE ROUTE MAY HAVE BEEN DECOMMISSIONED OR NEVER EXISTED.";

  // Particles — reduced 20 -> 12, token-only colors.
  // DECORATIVE ONLY: these are background dots, not copy. --fg-4 here is
  // deliberate — the particle field sits behind content at low opacity and
  // carries no information, so it stays on the weakest ramp step.
  useEffect(() => {
    const colors = [
      'var(--fg-3)',
      'var(--fg-4)',
      'var(--border-subtle)',
      'var(--border-strong)',
    ];
    setParticles(
      Array.from({ length: 12 }, (_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        dur: 3 + Math.random() * 4,
        delay: Math.random() * 3,
        color: colors[i % 4],
      })),
    );
  }, []);

  // Premium motion: splitText cascades + bracket drawable + diag stagger + scrambleText
  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;
    const reduced = isReducedMotion() || !canAnimate();

    // Reduced-motion: there is no entrance to run, so the page is already in
    // its final state. `.reveal` (src/styles/global.css:54) is scoped to
    // `prefers-reduced-motion: no-preference`, so the hidden initial state
    // cancels itself for these users without a single line of JS.
    //
    // What remains is one generic normalisation, not the old 11-element rescue
    // loop. It neutralises an inline opacity/transform left behind by a prior
    // render or an HMR-swapped animation. Because the set comes from the one
    // `data-notfound-anim` marker that the timeline is built from, an element
    // added to the animation later is covered automatically — there is no
    // hand-maintained list here to forget to update.
    if (reduced) {
      if (subtitleRef.current) subtitleRef.current.textContent = targetMsg;
      root
        .querySelectorAll<HTMLElement>('[data-notfound-anim]')
        .forEach((el) => {
          el.style.opacity = '1';
          el.style.transform = 'none';
        });
      return;
    }

    const scope = createScope({
      root,
      mediaQueries: { reduceMotion: '(prefers-reduced-motion: reduce)' },
      defaults: {
        duration: durations.enter * 1000,
        ease: easings.expoOut,
      },
    } as Parameters<typeof createScope>[0]);
    scopeRef.current = scope;

    let splitter404: ReturnType<typeof splitText> | null = null;
    let splitterSignal: ReturnType<typeof splitText> | null = null;
    let splitterNotfound: ReturnType<typeof splitText> | null = null;

    scope.add(() => {
      const el404 = root.querySelector<HTMLElement>('[data-notfound="404"]');
      const elSignal = root.querySelector<HTMLElement>(
        '[data-notfound="signal"]',
      );
      const elNotfound = root.querySelector<HTMLElement>(
        '[data-notfound="notfound"]',
      );
      const subtitleEl = subtitleRef.current;

      // Try splitText for cascades
      try {
        if (el404) {
          splitter404 = splitText(el404, {
            chars: true,
            words: { wrap: 'clip' },
          });
        }
      } catch {
        splitter404 = null;
      }
      try {
        if (elSignal) {
          splitterSignal = splitText(elSignal, {
            chars: true,
            words: { wrap: 'clip' },
          });
        }
      } catch {
        splitterSignal = null;
      }
      try {
        if (elNotfound) {
          splitterNotfound = splitText(elNotfound, {
            chars: true,
            words: { wrap: 'clip' },
          });
        }
      } catch {
        splitterNotfound = null;
      }

      const chars404 = (splitter404?.chars as unknown as HTMLElement[]) ?? [];
      const charsSignal =
        (splitterSignal?.chars as unknown as HTMLElement[]) ?? [];
      const charsNotfound =
        (splitterNotfound?.chars as unknown as HTMLElement[]) ?? [];

      const bracketStrokes = root.querySelectorAll<SVGGeometryElement>(
        '.notfound-bracket [data-graphic="grat-stroke"]',
      );
      let bracketDrawables: unknown = [];
      try {
        if (bracketStrokes.length) {
          bracketDrawables = createDrawable(
            '.notfound-bracket [data-graphic="grat-stroke"]',
          );
        }
      } catch {
        bracketDrawables = [];
      }

      const diagItems = root.querySelectorAll<HTMLElement>('.diag-item');
      const btns = root.querySelectorAll<HTMLElement>('.notfound-btn');

      // Every node this page animates is declared once, in the markup, with
      // `data-notfound-anim`. This set is what that declaration resolves to, and
      // it is the same set the reduced-motion branch uses — so the entrance and
      // its fallback can never drift apart. `targeted` records what the timeline
      // below actually handed to anime, so the residual pass at the end can
      // catch an element that declared itself and then got skipped.
      const declared = Array.from(
        root.querySelectorAll<HTMLElement>('[data-notfound-anim]'),
      );
      const targeted = new Set<Element>([
        ...(el404 ? [el404] : []),
        ...(elSignal ? [elSignal] : []),
        ...(elNotfound ? [elNotfound] : []),
      ]);

      const tl = createTimeline({
        defaults: { ease: easings.expoOut },
      });

      /** Record that anime has taken ownership of these nodes. */
      const claim = (els: ArrayLike<Element> | null | undefined) => {
        if (!els) return;
        for (let i = 0; i < els.length; i++) targeted.add(els[i]);
      };

      // Bracket drawable frame — draw ['0 0','0 1']
      if (
        bracketDrawables &&
        (bracketDrawables as unknown as unknown[]).length !== 0
      ) {
        tl.add(
          bracketDrawables as unknown as HTMLElement[],
          {
            draw: ['0 0', '0 1'],
            duration: durations.draw * 1000,
            ease: (easings.smooth as unknown as string) ?? 'linear',
          } as any,
          0,
        );
        claim(bracketStrokes);
      } else if (bracketStrokes.length) {
        tl.add(
          bracketStrokes as unknown as HTMLElement[],
          {
            opacity: [0, 1],
            duration: durations.enter * 1000 * 0.45,
            delay: stagger(durations.stagger * 1000, { from: 'first' }),
          } as any,
          0,
        );
        claim(bracketStrokes);
      }

      // 404 cascade — chars y clip stagger
      if (chars404.length) {
        tl.add(
          chars404,
          {
            y: ['112%', '0%'],
            opacity: [0, 1],
            duration: durations.enter * 1000 * 0.52,
            ease: easings.expoOut,
            delay: stagger(GLYPH_STEP_MS, { from: 'first' }),
          } as any,
          stagger(STEP_MS),
        );
        claim(chars404);
      } else if (el404) {
        tl.add(el404, { y: [14, 0], opacity: [0, 1] }, stagger(STEP_MS));
      }

      // SIGNAL_LOST cascade — from center
      if (charsSignal.length) {
        tl.add(
          charsSignal,
          {
            y: ['112%', '0%'],
            opacity: [0, 1],
            duration: durations.enter * 1000 * 0.46,
            ease: easings.expoOut,
            delay: stagger(GLYPH_STEP_MS, { from: 'center' }),
          } as any,
          stagger(STEP_MS),
        );
        claim(charsSignal);
      } else if (elSignal) {
        tl.add(elSignal, { y: [12, 0], opacity: [0, 1] }, stagger(STEP_MS));
      }

      // NOT_FOUND cascade — from first
      if (charsNotfound.length) {
        tl.add(
          charsNotfound,
          {
            y: ['112%', '0%'],
            opacity: [0, 1],
            duration: durations.enter * 1000 * 0.42,
            ease: easings.expoOut,
            delay: stagger(GLYPH_STEP_MS, { from: 'first' }),
          } as any,
          stagger(STEP_MS),
        );
        claim(charsNotfound);
      } else if (elNotfound) {
        tl.add(elNotfound, { y: [10, 0], opacity: [0, 1] }, stagger(STEP_MS));
      }

      // Diagnostic items stagger
      if (diagItems.length) {
        tl.add(
          diagItems,
          {
            opacity: [0, 1],
            x: [-10, 0],
            duration: durations.enter * 1000 * 0.45,
            ease: easings.expoOut,
            delay: stagger(STEP_MS * 0.45, {
              from: 'first',
            }),
          } as any,
          stagger(STEP_MS),
        );
        claim(diagItems);
      }

      // Buttons spring
      if (btns.length) {
        const btnSpring = spring(
          springs.soft as unknown as Record<string, number>,
        ) as unknown as string;
        tl.add(
          btns,
          {
            opacity: [0, 1],
            y: [20, 0],
            scale: [0.9, 1],
            duration: durations.enter * 1000 * 0.42,
            ease: btnSpring ?? easings.expoOut,
            delay: stagger(BLOCK_STEP_MS, { from: 'first' }),
          } as any,
          stagger(BLOCK_STEP_MS, { from: 'first' }),
        );
        claim(btns);
      }

      // ScrambleText for subtitle — sequenced via tl to preserve stagger after headers
      if (subtitleEl) {
        const hasScramble = typeof scrambleText === 'function';
        if (hasScramble) {
          try {
            // Ensure starting content is the target so scramble knows end state
            subtitleEl.textContent = targetMsg;
            tl.add(
              subtitleEl,
              {
                innerHTML: scrambleText({
                  text: targetMsg,
                  chars: 'upper',
                  duration: durations.scramble * 1000,
                  ease: easings.expoOut,
                  from: 'left',
                  revealRate: STEP_MS,
                  settleDuration: durations[300] * 1000,
                }),
                duration: durations.scramble * 1000,
                ease: easings.expoOut,
              } as any,
              stagger(STEP_MS),
            );
            claim([subtitleEl]);
          } catch {
            // Fallback to static if scramble fails
            subtitleEl.textContent = targetMsg;
            claim([subtitleEl]);
          }
        } else {
          // Fallback interval (guarded, but scramble should be available).
          // Two things this must get right, both of them the lesson of the
          // observer that used to live in this file:
          //   1. Own the node. `claim` it, or the residual pass below also
          //      animates it and two systems write `textContent`/`opacity`.
          //   2. Own the clock. Route the handle through `scrambleTimerRef` so
          //      unmount stops it, instead of letting it write to a detached
          //      node after the route changes.
          // The tick is derived from --dur-scramble divided by the message
          // length, so the whole reveal still takes exactly one scramble
          // token regardless of how long the copy is.
          let index = 0;
          const chars =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
          const tick = Math.max(
            1,
            (durations.scramble * 1000) / targetMsg.length,
          );
          const interval = setInterval(() => {
            let result = '';
            for (let i = 0; i < targetMsg.length; i++) {
              if (i < index || targetMsg[i] === ' ') result += targetMsg[i];
              else result += chars[Math.floor(Math.random() * chars.length)];
            }
            // Drive the visible text directly — anime is not touching this
            // node in this branch, so this is the single writer.
            subtitleEl.textContent = result;
            index++;
            if (index > targetMsg.length) {
              clearInterval(interval);
              scrambleTimerRef.current = null;
            }
          }, tick);
          scrambleTimerRef.current = interval;
          claim([subtitleEl]);
        }
      }

      // Residual pass — the whole point of `declared`.
      //
      // An element that opts into `data-notfound-anim` also carries `.reveal`,
      // which holds it at opacity 0 until something fades it in. If a future
      // edit adds a twelfth animated element and forgets the `tl.add` that
      // reveals it, the old `opacity-0`-class approach left it invisible
      // forever, and the only defence was a hand-written reset loop that had
      // to be updated in lockstep. Instead: subtract everything anime already
      // owns from the declared set and fade whatever is left over. Adding an
      // element to the animation cannot silently render nothing, and it cannot
      // double-animate either, because anything the timeline already claimed
      // is excluded by `targeted` rather than re-animated.
      const residual = declared.filter((el) => !targeted.has(el));
      if (residual.length) {
        tl.add(
          residual,
          {
            opacity: [0, 1],
            duration: durations.enter * 1000 * 0.45,
            ease: easings.expoOut,
            delay: stagger(durations.stagger * 1000, { from: 'first' }),
          } as any,
          0,
        );
      }
    });

    return () => {
      if (scrambleTimerRef.current !== null) {
        clearInterval(scrambleTimerRef.current);
        scrambleTimerRef.current = null;
      }
      try {
        splitter404?.revert();
      } catch {}
      try {
        splitterSignal?.revert();
      } catch {}
      try {
        splitterNotfound?.revert();
      } catch {}
      scope.revert();
      scopeRef.current = null;
    };
  }, [targetMsg]);

  // ── Pre-navigation exit ─────────────────────────────────────────────────────
  // The two recovery buttons. Every path here ends in `fire()`, and `fire()` is
  // idempotent, so navigation cannot be skipped *and* cannot be duplicated.
  const navigateWithExit = useCallback((run: () => void) => {
    // A second click while the exit is in flight is a no-op, not a second push.
    if (navStateRef.current !== 'idle') return;
    navStateRef.current = 'pending';

    const fire = () => {
      if (navStateRef.current === 'fired') return;
      navStateRef.current = 'fired';
      if (navTimerRef.current !== null) {
        clearTimeout(navTimerRef.current);
        navTimerRef.current = null;
      }
      run();
    };

    // Path 1 — there is no exit to watch. Reduced motion, no motion capability,
    // or a root that never rendered: navigate on the same tick as the click.
    const root = pageRef.current;
    if (!root || isReducedMotion() || !canAnimate()) {
      fire();
      return;
    }

    // Path 2 — the exit ran to completion (wired into the timeline's onComplete).
    // Path 3 — the deadline below. Path 4 — the catch at the bottom.
    try {
      const scope = createScope({
        root,
        mediaQueries: { reduceMotion: '(prefers-reduced-motion: reduce)' },
        defaults: { duration: EXIT_MS, ease: easings.expoIn },
      } as Parameters<typeof createScope>[0]);
      exitScopeRef.current = scope;

      scope.add(() => {
        // Live re-check, same as the entrance scope: if reduced motion is
        // switched on between mount and click, skip straight to navigation.
        if (scope.matches.reduceMotion) {
          fire();
          return;
        }
        const tl = createTimeline({ onComplete: fire });
        // One node, one tween: the page root. The entrance timeline only ever
        // claimed descendants, so nothing else in this file writes `opacity` or
        // `transform` on this element and there is no second writer to race.
        // `opacity` + `transform` only — nothing here triggers layout.
        tl.add(
          root,
          {
            opacity: [1, 0],
            y: [0, -EXIT_DRIFT_PX],
            duration: EXIT_MS,
            ease: easings.expoIn,
          },
          0,
        );
      });

      // Path 3 — the backstop. Armed only once the animation actually started,
      // so it can never precede the exit it is standing in for.
      navTimerRef.current = setTimeout(fire, NAV_DEADLINE_MS);
    } catch {
      // Path 4 — the animation itself failed (a missing anime export, a thrown
      // tick). Swallow it and navigate: a dead button on a 404 page is a much
      // worse failure than a missing animation.
      try {
        exitScopeRef.current?.revert();
      } catch {}
      exitScopeRef.current = null;
      fire();
    }
  }, []);

  // Unmount owns the exit's timers and tweens. Clearing the deadline here is
  // also what stops a stale `fire()` from pushing a second navigation after the
  // route has already changed.
  useEffect(
    () => () => {
      if (navTimerRef.current !== null) {
        clearTimeout(navTimerRef.current);
        navTimerRef.current = null;
      }
      try {
        exitScopeRef.current?.revert();
      } catch {}
      exitScopeRef.current = null;
    },
    [],
  );

  return (
    <>
      <Head>
        <title>404 // SIGNAL_LOST | Fahimaloy Portfolio</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div
        ref={pageRef}
        className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden"
      >
        {/* Floating particles — 12 dots */}
        <div
          ref={particlesRef}
          className="absolute inset-0 pointer-events-none"
        >
          {particles.map((p, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full opacity-40"
              style={{
                background: p.color,
                left: `${p.x}%`,
                top: `${p.y}%`,
                animation: `float ${p.dur}s ease-in-out infinite`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="w-full max-w-2xl space-y-6 relative z-10">
          {/* Header with morph orb behind glitch text */}
          <div className="text-center relative">
            {/* Morph orb behind glitch text — token-only via var(--*) */}
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[54%] opacity-55"
              aria-hidden="true"
            >
              <MorphOrb accent="coral" size={220} />
            </div>
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[54%] opacity-30 translate-x-3 translate-y-2"
              aria-hidden="true"
            >
              <MorphOrb accent="cyan" size={146} />
            </div>
            {/* Aurora wash behind orb — var(--aurora-*) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: 280,
                height: 280,
                background: 'var(--aurora-1)',
                filter: 'blur(48px)',
                opacity: 0.07,
              }}
            />

            <div
              data-notfound-anim
              className="text-[10px] font-display tracking-[6px] mb-3 diag-item reveal"
              style={{ color: 'var(--fg-3)' }}
            >
              {'// ERROR // 404'}
            </div>
            {/* 404 — splitText target. Deliberately NOT `reveal`: splitText
                wraps this element's glyphs in per-character spans and animates
                those, so hiding the parent would hide the cascade with it. */}
            <h1
              data-notfound="404"
              data-notfound-anim
              className="font-display tracking-wide text-7xl md:text-9xl"
              style={{ color: 'var(--fg-1)' }}
            >
              {glitchText}
            </h1>
            <div
              data-notfound="signal"
              data-notfound-anim
              className="font-display tracking-[4px] mt-4 diag-item reveal"
              style={{ color: 'var(--fg-2)' }}
            >
              SIGNAL_LOST
            </div>
            {/* Scramble subtitle — innerHTML driven by scrambleText */}
            <div
              ref={subtitleRef}
              data-notfound="subtitle"
              data-notfound-anim
              className="font-body text-sm mt-3 max-w-md mx-auto diag-item reveal min-h-[3rem]"
              style={{ color: 'var(--fg-3)' }}
            >
              {targetMsg}
            </div>
          </div>

          {/* Diagnostic — HudPanel wrapped in bracket drawable frame */}
          <div className="relative notfound-diagnostic">
            <Bracket className="notfound-bracket pointer-events-none absolute inset-0 opacity-60" />
            <HudPanel
              accent="coral"
              title="// DIAGNOSTIC_LOG"
              className="p-4 space-y-3 relative"
            >
              <div data-notfound-anim className="diag-item reveal">
                <StatBar label="UPLINK" value={0} accent="coral" />
              </div>
              <div data-notfound-anim className="diag-item reveal">
                <StatBar label="ROUTE_INTEGRITY" value={12} accent="coral" />
              </div>
              <div data-notfound-anim className="diag-item reveal">
                <StatBar label="SIGNAL_STRENGTH" value={5} accent="amber" />
              </div>
              <div className="text-[10px] font-mono space-y-1">
                <div
                  data-notfound="notfound"
                  data-notfound-anim
                  className="diag-item reveal"
                  style={{ color: 'var(--fg-3)' }}
                >
                  {'>'} STATUS: NOT_FOUND
                </div>
                <div
                  data-notfound-anim
                  className="diag-item reveal"
                  style={{ color: 'var(--fg-3)' }}
                >
                  {'>'} PATH: {router.asPath || '/'}
                </div>
                <div
                  data-notfound-anim
                  className="diag-item reveal"
                  style={{ color: 'var(--fg-3)' }}
                >
                  {'>'} SUGGESTION: RETURN TO ROOT
                </div>
              </div>
            </HudPanel>
          </div>

          <div className="flex justify-center gap-3">
            <NeonButton
              accent="amber"
              data-notfound-anim
              onClick={() => navigateWithExit(() => router.push('/'))}
              className="notfound-btn reveal"
            >
              RETURN TO ROOT
            </NeonButton>
            <NeonButton
              accent="cyan"
              variant="outline"
              data-notfound-anim
              onClick={() => navigateWithExit(() => router.back())}
              className="notfound-btn reveal"
            >
              GO BACK
            </NeonButton>
          </div>
        </div>
      </div>
    </>
  );
}
