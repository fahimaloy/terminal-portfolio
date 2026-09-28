// src/components/ExperienceTimeline.tsx
/* ═══════════════════════════════════════════════════════════════════════════════
   EXPERIENCE TIMELINE

   What this component actually does, in full. An earlier version of this
   header promised four effects and implemented one; the list below is
   exhaustive. If you add an effect, add it here — if you remove one, remove
   it here.

   WHAT IT DOES
   - One staggered entrance on mount, inside a createScope that is reverted on
     unmount and whenever `experiences` changes:
       · .timeline-node    — scales 0.5 -> 1 while fading in
       · .timeline-content — slides in from x: 20 while fading in
     One animate() call each, content cards finishing faster than the nodes.
   - Expand/collapse per row: React state only, no animation.

   WHAT IT DELIBERATELY DOES NOT DO
   - NO line draw on scroll. The vertical rule is a plain absolutely-positioned
     div with a Tailwind gradient (from-neon-cyan via-neon-coral to-neon-amber),
     not an SVG, so `createDrawable` cannot reach it. It has never been drawn
     progressively and this header no longer claims that it is.
   - NO icon pop-in. The company-logo / initials tile is static markup.
   - NO alternating slide. Every .timeline-content slides in from the same
     x: 20; the rows do not alternate direction.

   Adding the line draw is possible (an <svg> <path> with an SVG gradient, plus
   createDrawable and vector-effect="non-scaling-stroke"), but it is a visual
   change to a user-visible component and is deliberately left out of scope
   rather than half-done.
═══════════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useState, useRef } from 'react';
import { PortfolioExperience } from '../utils/api';
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  Briefcase,
} from 'lucide-react';
import { animate, createScope, stagger } from 'animejs';
import {
  durations,
  easings,
  isReducedMotion,
  canAnimate,
} from '../config/animations';

type ExperienceTimelineProps = {
  experiences: PortfolioExperience[];
};

export default function ExperienceTimeline({
  experiences,
}: ExperienceTimelineProps) {
  const [expandedId, setExpandedId] = useState<number | null>(
    experiences.length > 0 ? experiences[0].id : null,
  );
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // canAnimate() as well as isReducedMotion(): canAnimate() is also false
    // during SSR and in jsdom (no matchMedia), and the repo rule is that a
    // component must render its final resting value when motion cannot run.
    // The .reveal class in global.css is scoped to `no-preference` for the
    // same reason, so the rows are visible in both of those cases.
    if (!timelineRef.current || isReducedMotion() || !canAnimate()) return;

    const scope = createScope({ root: timelineRef.current });

    scope.add(() => {
      // Node dots. durations[500] is the 500ms this used to hardcode, so the
      // cadence is unchanged and now sourced from a --dur-* token.
      const nodes = timelineRef.current!.querySelectorAll('.timeline-node');
      animate(nodes, {
        opacity: [0, 1],
        scale: [0.5, 1],
        duration: durations[500] * 1000,
        ease: easings.outExpo,
        delay: stagger(durations.stagger * 1000, { from: 'first' }),
      });

      // Content cards. Previously 400ms — there is no --dur-400, so this uses
      // the next token down, durations[300], which keeps the intended
      // relationship (cards resolve faster than their node).
      const contents =
        timelineRef.current!.querySelectorAll('.timeline-content');
      animate(contents, {
        opacity: [0, 1],
        x: [20, 0],
        duration: durations[300] * 1000,
        ease: easings.outExpo,
        delay: stagger(durations.stagger * 1000, { from: 'first' }),
      });
    });

    return () => scope.revert();
  }, [experiences]);

  if (!experiences.length) {
    return (
      <div className="text-center text-text-muted py-8">
        No experiences to display.
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <div ref={timelineRef} className="relative pl-8">
      {/* Vertical line */}
      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-neon-cyan via-neon-coral to-neon-amber" />

      <div className="space-y-6">
        {experiences.map((exp, idx) => (
          <div key={exp.id} className="relative">
            {/* Circle node */}
            <div className="timeline-node absolute -left-5 top-4 w-3 h-3 rounded-full bg-neon-cyan border-2 border-bg-void shadow-[0_0_8px_var(--neon-cyan)] reveal" />

            {/* Content card */}
            <div className="timeline-content bg-[var(--overlay-white-05)] border-[var(--overlay-white-10)] rounded-xl p-4 ml-2 reveal">
              {/* Header row */}
              <div className="flex items-start gap-3">
                {/* Company logo or initials */}
                {exp.company_logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={exp.company_logo}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--neon-violet)] to-[var(--neon-cyan)] flex items-center justify-center text-sm font-bold text-[var(--fg-1)] flex-shrink-0">
                    {exp.company_name
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="font-display text-sm text-neon-cyan text-shadow-neon-cyan">
                    {exp.title}
                  </div>
                  <div className="text-xs text-[var(--fg-1)] mt-0.5">
                    {exp.company_name}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-text-muted">
                    <span className="flex items-center gap-1">
                      <Calendar size={10} />
                      {formatDate(exp.from_date)} –{' '}
                      {exp.is_current
                        ? 'Present'
                        : exp.to_date
                          ? formatDate(exp.to_date)
                          : ''}
                    </span>
                    {exp.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={10} /> {exp.location}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() =>
                    setExpandedId(expandedId === exp.id ? null : exp.id)
                  }
                  className="grid place-items-center min-h-[44px] min-w-[44px] -mr-2 text-text-muted hover:text-[var(--fg-1)]"
                  aria-label={expandedId === exp.id ? 'Collapse' : 'Expand'}
                >
                  {expandedId === exp.id ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </button>
              </div>

              {/* Expanded content */}
              {expandedId === exp.id && (
                <div className="mt-3 pt-3 border-t border-[var(--overlay-white-10)] space-y-3">
                  {exp.description && (
                    <p className="text-sm text-text-secondary">
                      {exp.description}
                    </p>
                  )}
                  {exp.projects && exp.projects.length > 0 && (
                    <div>
                      <div className="text-[10px] text-text-muted mb-2">
                        PROJECTS
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {exp.projects.map((proj) => (
                          <div
                            key={proj.id}
                            className="px-3 py-1.5 bg-neon-amber/10 border border-neon-amber/20 rounded-lg text-xs text-neon-amber"
                          >
                            {proj.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
