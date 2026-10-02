// src/components/blog/LightningTransition.tsx
/* Muted editorial wipe — warm overlay, no neon bolts.
 *
 * TWO MODES, and which one is in play is a prop rather than a guess:
 *
 *  · SELF-LIFTING (`release` omitted) — the archive's reels turn. Cover, hand
 *    off, lift, all on one clock. Nobody else is animating, so there is nobody
 *    to consult. This is the mode `blog/BlogReels.tsx` mounts.
 *
 *  · HELD (`release` supplied) — a post-to-post page turn. The cover is only
 *    the first half of that transition. `router.push` starts the site-wide
 *    horizontal sweep, whose occluder `RouteTransition` mounts as a SIBLING of
 *    the stage that holds this page — so it paints above whatever this sheet
 *    does, and it deliberately stays shut until `routeChangeComplete`. A
 *    self-lifting sheet therefore lifts while that sweep is still crossing it,
 *    and the reader watches two occluders cross for ~320ms.
 *
 *    So in held mode the sheet covers, hands the swap to its caller the instant
 *    it is fully shut, and waits to be told the swap landed. Its lift is then
 *    spent entirely behind the closed curtain and the reader sees one
 *    transition. See the note above `swapTo` in `pages/blog/[slug].tsx`.
 */

import React, { useEffect, useRef } from 'react';
import { createTimeline } from 'animejs';
import { isReducedMotion, durations, easings } from '../../config/animations';

interface Props {
  /** Increment/change this to fire the transition. */
  trigger: number;
  /**
   * Fires the instant the sheet is FULLY opaque — the only moment a tree swap
   * is invisible. (It used to fire at 60% of `--dur-enter` and was called
   * `onMidpoint`, which described its position in the tween rather than the
   * state of the screen.)
   */
  onCovered?: () => void;
  /**
   * Hold the sheet closed until this value changes, then lift it. Omit it and
   * the sheet lifts on its own clock. Increment it once the navigation has
   * committed.
   */
  release?: number;
  onComplete?: () => void;
}

/** Every beat is a fraction of a shared duration token. */
const COVER = 0.5;
const SETTLE = 0.1;
const LIFT_AT = 0.66;
const LIFT = 0.8;

export default function LightningTransition({
  trigger,
  onCovered,
  release,
  onComplete,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const firstRun = useRef(true);
  /** In held mode: covered, and now waiting for `release`. A lift before this is a bug. */
  const covered = useRef(false);
  const held = release !== undefined;

  // Beat 1 — the cover, and the swap point.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const root = rootRef.current;
    if (!root) return;

    const coverMs = durations.enter * 1000 * COVER;
    const settleMs = durations.enter * 1000 * SETTLE;
    const liftAtMs = durations.enter * 1000 * LIFT_AT;
    const liftMs = durations.exit * 1000 * LIFT;

    if (isReducedMotion()) {
      // Nothing to animate and nothing to wait behind, so the swap happens now
      // and the sheet is simply re-armed for the next turn.
      covered.current = false;
      onCovered?.();
      onComplete?.();
      return;
    }

    root.style.pointerEvents = 'auto';

    const sheet = root.querySelector<HTMLElement>('.lt-sheet');

    const tl = createTimeline({
      defaults: { ease: easings.expoOut },
      // Held mode has no business restoring pointer events here: the sheet is
      // still up and still blocking, and doing it now would let a reader click
      // a link through a visible occluder.
      onComplete: held
        ? undefined
        : () => {
            root.style.pointerEvents = 'none';
            onComplete?.();
          },
    });

    // The sheet is a page turn, not a strobe: it covers, hands off the moment
    // it is fully shut, then either lifts on its own clock or waits to be told
    // the swap landed.
    if (sheet) {
      tl.add(sheet, { scaleY: [0, 1], opacity: [0, 1], duration: coverMs }, 0);
    }

    // The swap rides one `--dur-enter`-fraction AFTER the sheet is shut, so the
    // caller is never handed a half-covered screen. Expressed as
    // `coverMs + settleMs` rather than an independent fraction of the same
    // duration: "the tree changes behind an opaque sheet" is then arithmetic,
    // not a coincidence between two numbers that happen to be in the right
    // order today. Retime `--dur-enter` and the relationship cannot invert.
    tl.call(() => onCovered?.(), coverMs + settleMs);

    covered.current = held;
    if (!held && sheet) {
      tl.add(
        sheet,
        { scaleY: [1, 0], opacity: [1, 0], duration: liftMs },
        liftAtMs,
      );
    }

    return () => {
      covered.current = false;
      tl.revert();
    };
  }, [trigger, onCovered, onComplete, held]);

  // Beat 2 — held mode only: retire the sheet now that the swap has landed.
  // The caller owns this clock because only the caller knows when the router
  // settled, and it carries its own fail-open deadline so a dropped event
  // cannot strand a reader behind a full-screen sheet.
  useEffect(() => {
    if (!held || !covered.current) return;
    const root = rootRef.current;
    const sheet = root?.querySelector<HTMLElement>('.lt-sheet');
    if (!root || !sheet) return;
    covered.current = false;

    const liftMs = durations.exit * 1000 * LIFT;

    const tl = createTimeline({
      defaults: { ease: easings.expoOut },
      onComplete: () => {
        root.style.pointerEvents = 'none';
        onComplete?.();
      },
    });

    // No from-keyframe. The release can land while the cover's own tween is
    // still running on a fast navigation, and `scaleY: [1, 0]` would snap the
    // sheet fully shut for a frame before closing it. Anime animates from
    // whatever the element actually holds.
    tl.add(sheet, { scaleY: 0, opacity: 0, duration: liftMs }, 0);

    return () => {
      tl.revert();
    };
  }, [release, held, onComplete]);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="fixed inset-0 z-[80] pointer-events-none overflow-hidden"
    >
      <div
        className="lt-sheet absolute inset-0 origin-top opacity-0"
        style={{ background: 'var(--bg-1)' }}
      />
    </div>
  );
}
