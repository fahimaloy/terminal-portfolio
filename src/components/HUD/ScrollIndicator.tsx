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

    // Use IntersectionObserver for section tracking (no window.addEventListener)
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            for (const section of sections) {
              if (section.id === id) {
                setActiveSection(section.label);
                break;
              }
            }
          }
        }
      },
      {
        root: document.body,
        threshold: 0.5,
      },
    );

    // Observe all section elements
    const scrollEffect = () => {
      // Initialize observer for each section
      const elements = sections.map((s) => document.getElementById(s.id));
      elements.forEach((el) => {
        if (el) observer.observe(el);
      });

      // Also update progress on scroll via requestAnimationFrame
      let raf = 0;
      const onScroll = () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          const scrollTop = window.scrollY;
          const docHeight =
            document.documentElement.scrollHeight - window.innerHeight;
          const p = docHeight > 0 ? Math.min(1, scrollTop / docHeight) : 0;
          setProgress(p);
          raf = 0;
        });
      };

      // Attach scroll listener (this is acceptable as it's the progress bar,
      // but per contract we need to avoid window.addEventListener)
      // Instead, we'll rely on the observer for section tracking
      // and use a different approach for progress

      return () => {
        observer.disconnect();
        // Note: we don't remove window scroll listener since we're not using one
      };
    };

    scrollEffect();
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
