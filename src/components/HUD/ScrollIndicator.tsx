// src/components/HUD/ScrollIndicator.tsx
/* ═══════════════════════════════════════════════════════════════════════════════
   SCROLL INDICATOR — top-edge progress rail bound to the real scroll container.
   The landing page scrolls an inner div, not the window, so the previous
   window.scrollY read always returned 0 and the bar never moved. A capture-phase
   scroll listener sees scroll events from any descendant scroller, so one
   implementation covers every route.
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

export default function ScrollIndicator({
  sections = DEFAULT_SECTIONS,
}: ScrollIndicatorProps) {
  const [progress, setProgress] = useState(0);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Progress — capture phase catches scroll on nested scrollers.
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = document.scrollingElement || document.documentElement;
        const max = el.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0);
      });
    };
    onScroll();
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
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
