// src/components/HUD/ScrollIndicator.tsx
/* ═══════════════════════════════════════════════════════════════════════════════
   SCROLL INDICATOR — top-edge progress rail bound to the real scroll container.
   The landing page scrolls an inner div, not the window, so the previous
   window.scrollY read always returned 0 and the bar never moved. A capture-phase
   scroll listener sees scroll events from any descendant scroller, so one
   implementation covers every route.

   The listener was fixed; the MEASUREMENT was not. It kept reading
   document.scrollingElement, whose scrollHeight equals the viewport on a
   h-[100dvh] overflow-hidden page — so max was 0, progress was always 0, and
   the most HUD-looking element on the site was pinned at zero. The scroller is
   now resolved from the scroll event itself (resolveScroller) and measured with
   its own scrollTop / scrollHeight / clientHeight.
═══════════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from 'react';

interface ScrollIndicatorProps {
  sections?: { id: string; label: string }[];
}

const DEFAULT_SECTIONS = [
  { id: 'hero', label: 'DEVELOPER PROFILE' },
  { id: 'blog-header', label: 'TRANSMISSION LOG' },
  { id: 'blog-list', label: 'ARTICLES' },
  { id: 'not-found', label: 'SIGNAL LOST' },
];

/** The window's own scroller — standards mode always answers, quirks never. */
function windowScroller(): Element {
  return document.scrollingElement || document.documentElement;
}

/**
 * Which element the visitor is actually scrolling.
 *
 * A scroll event's `target` IS the scroller that moved: `document` when the
 * window scrolls, the element itself when an inner `overflow-y-auto` container
 * scrolls. Nothing is searched or guessed, so this stays correct on a route
 * whose layout changes without a remount.
 */
function resolveScroller(target: EventTarget | null): Element {
  if (
    !target ||
    target === document ||
    target === window ||
    target === document.body
  ) {
    return windowScroller();
  }
  if (target instanceof Element) return target;
  return windowScroller();
}

export default function ScrollIndicator({
  sections = DEFAULT_SECTIONS,
}: ScrollIndicatorProps) {
  const [progress, setProgress] = useState(0);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Progress — capture phase catches scroll on nested scrollers.
  useEffect(() => {
    let raf = 0;
    // Last known scroller. A resize fires with no event to read a target from,
    // so the remembered one is reused instead of snapping back to the window.
    let scroller: Element | null = null;
    // Latest coalesced scroll target, consumed by the next frame.
    let pending: EventTarget | null = null;

    const compute = (target: EventTarget | null) => {
      let el: Element;
      if (target) {
        el = resolveScroller(target);
        scroller = el;
      } else if (
        scroller &&
        scroller.isConnected &&
        scroller.scrollHeight > scroller.clientHeight
      ) {
        // Still in the tree and still scrollable — keep reading it.
        el = scroller;
      } else {
        // Nothing scrolled yet (first paint), or the remembered scroller
        // stopped scrolling (route change, content shrank): fall back.
        el = windowScroller();
        scroller = el;
      }

      // Only scroll geometry: three cheap reads on an element that was just
      // scrolled, so no rect/offset flush and no interleaved write→read.
      const max = el.scrollHeight - el.clientHeight;
      // A container shorter than its viewport has nothing to travel — max <= 0
      // must not divide, and must not report a negative position.
      setProgress(max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0);
    };

    const onScroll = (event: Event) => {
      // Coalescing keeps the LAST target, not the first: if the window and an
      // inner container both move inside one frame, the frame must be measured
      // against the scroller that is actually being scrolled now.
      pending = event.target;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const target = pending;
        pending = null;
        compute(target);
      });
    };
    const onResize = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        pending = null;
        compute(null);
      });
    };

    compute(null);
    document.addEventListener('scroll', onScroll, {
      capture: true,
      passive: true,
    });
    window.addEventListener('resize', onResize);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Section tracking — only observed when the ids actually exist on the route.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const targets = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const match = sections.find((s) => s.id === entry.target.id);
          if (match) setActiveSection(match.label);
        }
      },
      { threshold: 0.4 },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  // One tree, always. The previous version branched on `isReducedMotion()`
  // here, which returns false on the server (no `window`) and the user's real
  // preference in the browser — two different trees, so React threw
  // "Hydration failed" on every load for reduced-motion users. The only
  // difference between the branches was presentational, so CSS now owns it:
  // `.scroll-rail__fill` and `.scroll-rail__label` are display:none under
  // `prefers-reduced-motion: reduce`, which leaves exactly the plain 2px rail
  // the old branch rendered. No JS, no mismatch, no post-mount swap.
  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[var(--z-hud)] pointer-events-none"
    >
      <div className="h-[2px] bg-[var(--overlay-white-05)]">
        <div
          ref={barRef}
          className="scroll-rail__fill h-full"
          style={{
            width: `${progress * 100}%`,
            background: 'var(--border-gradient-rainbow)',
            boxShadow: '0 0 10px var(--glow-cyan-sm)',
            transition: 'width 120ms linear',
          }}
        />
      </div>

      {/* Section name — only while a real section is in view, and never on
          small screens where it collided with the HUD corner ornaments. */}
      {activeSection && (
        <div className="scroll-rail__label absolute top-3 left-1/2 -translate-x-1/2 hidden md:block">
          <div
            className="font-mono text-[9px] tracking-[0.32em]"
            style={{ color: 'var(--fg-3)' }}
          >
            {'// ' + activeSection}
          </div>
        </div>
      )}
    </div>
  );
}
