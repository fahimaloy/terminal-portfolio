// src/components/HUD/ScrollIndicator.tsx
/* ═══════════════════════════════════════════════════════════════════════════════
   SCROLL INDICATOR — Top-edge scroll progress bar with anime.js
   Shows scroll progress and current section name.
═══════════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useRef, useState } from 'react';
import { animate } from 'animejs';
import { isReducedMotion } from '../../config/animations';

interface ScrollIndicatorProps {
  sections?: { id: string; label: string }[];
}

export default function ScrollIndicator({
  sections = [
    { id: 'hero', label: 'DEVELOPER_PROFILE' },
    { id: 'projects', label: 'PROJECTS' },
    { id: 'skills', label: 'SKILLSETS' },
    { id: 'experience', label: 'EXPERIENCE' },
    { id: 'contact', label: 'CONTACT' },
  ],
}: ScrollIndicatorProps) {
  const [progress, setProgress] = useState(0);
  const [activeSection, setActiveSection] = useState(sections[0]?.label || '');
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isReducedMotion()) return;

    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollTop = window.scrollY;
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          const p = docHeight > 0 ? Math.min(1, scrollTop / docHeight) : 0;
          setProgress(p);

          // Determine active section
          for (let i = sections.length - 1; i >= 0; i--) {
            const el = document.getElementById(sections[i].id);
            if (el) {
              const rect = el.getBoundingClientRect();
              if (rect.top <= 200) {
                setActiveSection(sections[i].label);
                break;
              }
            }
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [sections]);

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] pointer-events-none">
      {/* Progress bar */}
      <div className="h-[2px] bg-white/[0.03]">
        <div
          ref={barRef}
          className="h-full bg-gradient-to-r from-neon-cyan via-neon-yellow to-neon-magenta"
          style={{
            width: `${progress * 100}%`,
            boxShadow: '0 0 8px var(--neon-cyan), 0 0 16px var(--neon-magenta)',
            transition: 'width 0.1s linear',
          }}
        />
      </div>

      {/* Section name — shows current section */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2">
        <div className="font-mono text-[9px] tracking-[4px] text-text-muted opacity-60">
          {'// ' + activeSection}
        </div>
      </div>
    </div>
  );
}
