// src/components/ui/TypewriterText.tsx
// Editorial stagger-fade — replaces typewriter+glitch with muted y+opacity choreography.
//
// P3.3: this is the *painting* primitive, and it paints the WHOLE string up
// front — every character is mounted at once as a `.tw-char` span, and the
// reveal is a y+opacity cascade over them. Nothing is appended, so nothing
// re-lays-out, so no autoscroll has to chase it and there is no O(n²) render.
// The policy (which message reveals, and when it counts as settled) lives in
// ChatStream; the "are we allowed to animate at all" test lives here.
import React, { useEffect, useRef } from 'react';
import { animate, createScope, stagger } from 'animejs';
import { durations, easings, isReducedMotion } from '../../config/animations';

type Props = {
  text: string;
  startDelay?: number;
  showCursor?: boolean;
  onDone?: () => void;
  className?: string;
};

export default function TypewriterText({
  text,
  startDelay = 0,
  showCursor: _showCursor = false,
  onDone,
  className = '',
}: Props) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // Reduced motion (or no letters at all) is a COMPLETE answer, not a pending
    // one: call onDone synchronously so the caller's "settled" bookkeeping
    // resolves instead of latching. `.reveal { opacity: 0 }` is itself scoped
    // to `prefers-reduced-motion: no-preference` in global.css, so the
    // characters are already visible here and nothing is ever hidden.
    if (isReducedMotion()) {
      onDoneRef.current?.();
      return;
    }
    const letters = root.querySelectorAll('.tw-char');
    const count = letters.length;
    if (!count) {
      onDoneRef.current?.();
      return;
    }
    const scope = createScope({
      root,
      mediaQueries: { reduceMotion: '(prefers-reduced-motion: reduce)' },
      defaults: {
        duration: durations.tap * 1000,
        ease: easings.outExpo,
        composition: 'blend',
      },
    } as Parameters<typeof createScope>[0]);

    let cancelled = false;
    const timer = startDelay > 0 ? setTimeout(run, startDelay) : null;
    if (!timer) run();

    function run() {
      if (cancelled) return;
      scope.add(() => {
        animate(letters, {
          y: [8, 0],
          opacity: [0, 1],
          duration: durations.tap * 1000,
          ease: easings.outExpo,
          // P3.3: the per-character delay is DERIVED from --dur-typing (1800ms)
          // so the whole reveal is bounded no matter how long the reply is. It
          // used to be a hardcoded `stagger(40)`, i.e. a flat 25 chars/sec,
          // which meant a 300-character answer took ~12s to finish fading and a
          // 1000-character one never seemed to settle at all. Long answers now
          // reveal faster per character (down to ~6ms) while the total stays
          // pinned to the token.
          delay: stagger((durations.typing * 1000) / Math.max(count - 1, 1), {
            from: 'first',
          }),
          onComplete: () => {
            // The scope has been reverted by the time a straggler callback
            // lands, so without this guard a late onComplete would resolve the
            // caller's "settled" flag against an unmounted tree.
            if (cancelled) return;
            onDoneRef.current?.();
          },
        });
      });
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      scope.revert();
    };
  }, [text, startDelay]);

  return (
    <span ref={rootRef} className={className} aria-label={text}>
      {Array.from(text).map((ch, i) => (
        <span
          key={i}
          className="tw-char inline-block reveal"
          style={{ whiteSpace: ch === ' ' ? 'pre' : undefined }}
        >
          {ch === ' ' ? '\u00A0' : ch}
        </span>
      ))}
    </span>
  );
}
