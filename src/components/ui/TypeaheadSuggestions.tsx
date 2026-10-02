// src/components/ui/TypeaheadSuggestions.tsx
/* ═══════════════════════════════════════════════════════════════════════════════
   TYPEAHEAD SUGGESTIONS — the popup under the chat input.

   LIFECYCLE. `isMounted`, not `open`, owns the render gate. The gate used to be
   `if (!open) return null;`, which detached `listRef` on the very commit that
   flipped the prop — so the effect's first line (`if (!listRef.current) return;`)
   bailed out on the close branch and the exit animation at the bottom of that
   effect was unreachable dead code. The author had written a close animation
   that could never run and the popup cut out instantly on every dismissal.

   The subtree now outlives the `open` flip until the exit timeline's
   `onComplete` (or its deadline backstop) drops it. `open === false` while
   `isMounted === true` is the ~80ms the popup is on its way out.

   THE EMPTY HINT IS NOT A LIFECYCLE GUARD. `suggestions.length === 0` renders
   the `emptyHint` row, so "open with nothing to match" is a *state this popup
   has content for*, not a state it should refuse to render in. Folding that
   into the mount gate would give `isMounted` a second writer — the exact
   mistake this gate exists to undo — and would leave `isMounted` true with no
   node for the exit to animate.
   ═════════════════════════════════════════════════════════════════════════════ */

import React, { useRef, useEffect, useState } from 'react';
import { animate, createScope, createTimeline } from 'animejs';
import { Suggestion } from './useTypeaheadSuggestions';
import { useMotionScope } from '../../hooks/useMotionScope';
import {
  isReducedMotion,
  canAnimate,
  durations,
  easings,
} from '../../config/animations';

/* -- TIMING ------------------------------------------------------------------
   `durations` is seconds; anime v4 wants milliseconds, so both directions are
   ×1000. The old code handed anime `durations.tap` raw — 0.1 *milliseconds* —
   which is its own kind of cut-off, independent of the dead-node bug. */
const ENTER_MS = durations.tap * 1000; // 100ms — --dur-tap

/* The exit is the enter pair backwards, compressed to 80% of the enter: 80ms.
   A typeahead is a transient caret affordance and the next keystroke will
   replace it, so the dismissal has to clear the input line faster than the
   arrival took to fill it. 0.8 is the compression factor, not a magic number.

   EASING. Both directions use --ease-smooth, so open and close read as one
   motion. The tempting mirror of a decelerating enter is --ease-expoIn, and it
   is wrong at this length: expoIn puts its visible movement in the last ~20% of
   the curve, so an accelerating 80ms exit sits at full opacity for roughly the
   first 64ms — a caret popup that refuses to leave is read as a stutter, not
   as an ease-out. `--ease-smooth` starts moving on the first frame and lands
   soft, which is the whole of the acceleration the exit needs. */
const EXIT_FACTOR = 0.8;
const EXIT_MS = ENTER_MS * EXIT_FACTOR; // 80ms — --dur-tap × 1000 × 0.8

type Props = {
  query: string;
  suggestions: Suggestion[];
  onSelect: (s: Suggestion) => void;
  open: boolean;
  emptyHint?: string;
  className?: string;
};

export default function TypeaheadSuggestions({
  query,
  suggestions,
  onSelect,
  open,
  emptyHint = 'NO MATCHES',
  className = '',
}: Props) {
  /* `isMounted`, NOT `open`, is the render gate. See the file header. It is
     initialised from `open` and only ever cleared by a completed exit (or
     skipped outright under reduced motion), so the two are equal in the steady
     state and differ only for the ~80ms the popup is leaving. */
  const [isMounted, setIsMounted] = useState(open);
  /* Bumped on every open and every exit start. An exit's completion callback
     may only unmount while its own token is still the current one, so a
     completion that arrives after the popup was re-opened is inert instead of
     yanking a live popup out of the DOM. */
  const exitTokenRef = useRef(0);
  const listRef = useRef<HTMLUListElement>(null);
  const motionScope = useMotionScope(listRef);

  // Entrance — owns nothing but the inline style anime writes.
  //
  // `isMounted` is in the dependency list on purpose. When the popup is opened
  // from a closed state this effect first runs with `isMounted === false` (the
  // list is not in the DOM yet, so `listRef` is null and there is nothing to
  // animate); the exit effect below then sets it, and this one re-runs on the
  // commit that actually created the node. Without that dependency the first
  // open after a close would mount silently.
  //
  // The cleanup reverts the entrance scope. That is what makes the rapid-toggle
  // path exact rather than approximate: React flushes every passive destroy
  // before any passive create, so closing cancels the in-flight enter and
  // restores the resting inline opacity *before* the exit tween reads its
  // `[1, 0]` starting value. Two tweens never write `opacity` on this node.
  useEffect(() => {
    if (!open || !isMounted) return;
    motionScope.run((scope) => {
      // No scope is built when the visitor asked for reduced motion, or when
      // the environment cannot animate. The resting inline `opacity: 1` below
      // is the final state in that case, so there is nothing to do.
      if (!scope) return;
      scope.add(() => {
        // Live re-check: `mediaQueries.reduceMotion` is read from the actual
        // MediaQueryList on each `scope.execute()`, so a visitor who switches
        // reduced motion on between the effect body and this callback is not
        // held through the entrance they just opted out of. Same guard the exit
        // carries, and for the same reason.
        if (scope.matches.reduceMotion) return;
        const el = listRef.current;
        if (!el) return;
        animate(el, {
          opacity: [0, 1],
          y: [-4, 0],
          duration: ENTER_MS,
          ease: easings.smooth as unknown as string,
        });
      });
    });
    return () => {
      motionScope.revert();
    };
  }, [open, isMounted, motionScope]);

  // Exit — and the owner of the mount gate above.
  //
  // Both directions live in one effect on purpose: the subtree's lifecycle has
  // exactly one writer, which is what makes the rapid-toggle case fall out of
  // the cleanup instead of needing a separate "did we come back?" flag.
  //
  //   open  -> guarantee the subtree exists, so the entrance has refs.
  //   close -> animate out, then drop the subtree once the popup is invisible.
  //
  // RAPID RE-OPEN. React runs this effect's cleanup before the next pass, so
  // re-opening mid-exit reverts the in-flight timeline — which restores the
  // pre-exit inline styles and cancels the timer without firing `onComplete` —
  // and clears the deadline. `exitTokenRef` is the belt to those braces: the
  // open branch bumps it, so even a completion callback that somehow survived
  // cancellation resolves to a stale token and does nothing.
  useEffect(() => {
    if (open) {
      // Invalidate any exit still in flight before re-showing the popup.
      exitTokenRef.current += 1;
      setIsMounted(true);
      return;
    }
    // Already fully unmounted — this pass is the effect re-running after
    // `setIsMounted(false)`. Animating again here would restart the exit
    // forever, since each completion would flip the state and re-trigger.
    if (!isMounted) return;

    const list = listRef.current;

    // No ref (nothing rendered) or the visitor asked for less motion: there is
    // no exit to watch, so leave on this tick rather than after 80ms of nothing.
    if (!list || isReducedMotion() || !canAnimate()) {
      setIsMounted(false);
      return;
    }

    const token = (exitTokenRef.current += 1);
    const finish = () => {
      if (exitTokenRef.current !== token) return;
      setIsMounted(false);
    };

    const scope = createScope({
      mediaQueries: { reduceMotion: '(prefers-reduced-motion: reduce)' },
      defaults: { duration: EXIT_MS, ease: easings.smooth },
    } as Parameters<typeof createScope>[0]);

    scope.add(() => {
      // Live re-check: a visitor who switches reduced motion on while the popup
      // is open is not held through the 80ms they just opted out of.
      if (scope.matches.reduceMotion) {
        finish();
        return;
      }
      // Created inside the scope callback, so the timeline registers itself with
      // the scope and `scope.revert()` in the cleanup below becomes its owner.
      const tl = createTimeline({ onComplete: finish });
      tl.add(
        list,
        {
          opacity: [1, 0],
          // The enter's drift, reversed: the popup leaves back the way it came.
          y: [0, -4],
          duration: EXIT_MS,
          ease: easings.smooth as unknown as string,
        },
        0,
      );
    });

    // Deadline backstop. `onComplete` is the intended signal; this is the
    // guarantee the popup still leaves if that signal never arrives — a
    // throttled rAF in a backgrounded tab, an engine that skips the final
    // callback, a throw inside a tick. Deliberately 2x the exit so it never
    // wins the race on the happy path; the cleanup below owns it.
    const timer = setTimeout(finish, EXIT_MS * 2);

    return () => {
      clearTimeout(timer);
      try {
        scope.revert();
      } catch {}
    };
  }, [open, isMounted]);

  // Gate on `isMounted`, not `open`: the subtree has to outlive the `open`
  // flip long enough for the exit above to be seen.
  if (!isMounted) return null;

  return (
    <ul
      ref={listRef}
      role="listbox"
      aria-label="Suggestions"
      style={{ opacity: 1 }}
      className={`font-body text-sm ${className}`}
    >
      {suggestions.length === 0 ? (
        <li className="px-3 py-2 text-text-muted uppercase tracking-widest text-xs">
          {emptyHint}
        </li>
      ) : (
        suggestions.map((s) => (
          <li
            key={s.id}
            role="option"
            aria-selected="false"
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(s);
            }}
            className="px-3 py-2 cursor-pointer flex justify-between items-center hover:bg-[var(--overlay-white-05)] text-text-primary"
          >
            <span className="truncate">{s.label}</span>
            {s.hint && (
              <span className="ml-3 text-[10px] uppercase tracking-widest text-text-muted">
                {s.hint}
              </span>
            )}
          </li>
        ))
      )}
    </ul>
  );
}
