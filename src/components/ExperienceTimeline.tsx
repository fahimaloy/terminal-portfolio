// src/components/ExperienceTimeline.tsx
/* ═══════════════════════════════════════════════════════════════════════════════
   EXPERIENCE TIMELINE — Enhanced with anime.js animations
   - Line draw on scroll (SVG createDrawable)
   - Stagger node entrance
   - Icon pop-in
   - Alternating slide content
═══════════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useState, useRef } from 'react';
import { PortfolioExperience } from '../utils/api';
import { ChevronDown, ChevronUp, MapPin, Calendar, Briefcase } from 'lucide-react';
import { animate, createScope, stagger } from 'animejs';
import { isReducedMotion } from '../config/animations';

type ExperienceTimelineProps = {
  experiences: PortfolioExperience[];
};

export default function ExperienceTimeline({ experiences }: ExperienceTimelineProps) {
  const [expandedId, setExpandedId] = useState<number | null>(
    experiences.length > 0 ? experiences[0].id : null,
  );
  const timelineRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);

  useEffect(() => {
    if (!timelineRef.current || isReducedMotion()) return;

    const scope = createScope({ root: timelineRef.current });
    scopeRef.current = scope;

    scope.add(() => {
      // Animate nodes with stagger
      const nodes = timelineRef.current!.querySelectorAll('.timeline-node');
      animate(nodes, {
        opacity: [0, 1],
        scale: [0.5, 1],
        duration: 500,
        ease: 'outExpo',
        delay: stagger(100, { from: 'first' }),
      });

      // Animate content cards with stagger
      const contents = timelineRef.current!.querySelectorAll('.timeline-content');
      animate(contents, {
        opacity: [0, 1],
        x: [20, 0],
        duration: 400,
        ease: 'outExpo',
        delay: stagger(100, { from: 'first' }),
      });
    });

    return () => {
      scope.revert();
      scopeRef.current = null;
    };
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
      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-neon-cyan via-neon-magenta to-neon-yellow" />

      <div className="space-y-6">
        {experiences.map((exp, idx) => (
          <div key={exp.id} className="relative">
            {/* Circle node */}
            <div className="timeline-node absolute -left-5 top-4 w-3 h-3 rounded-full bg-neon-cyan border-2 border-bg-void shadow-[0_0_8px_var(--neon-cyan)] opacity-0" />

            {/* Content card */}
            <div className="timeline-content bg-white/5 border border-white/10 rounded-xl p-4 ml-2 opacity-0">
              {/* Header row */}
              <div className="flex items-start gap-3">
                {/* Company logo or initials */}
                {exp.company_logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={exp.company_logo} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" loading="lazy" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                    {exp.company_name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="font-display text-sm text-neon-cyan text-shadow-neon-cyan">
                    {exp.title}
                  </div>
                  <div className="text-xs text-white mt-0.5">{exp.company_name}</div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-text-muted">
                    <span className="flex items-center gap-1">
                      <Calendar size={10} />
                      {formatDate(exp.from_date)} – {exp.is_current ? 'Present' : exp.to_date ? formatDate(exp.to_date) : ''}
                    </span>
                    {exp.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={10} /> {exp.location}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setExpandedId(expandedId === exp.id ? null : exp.id)}
                  className="text-text-muted hover:text-white"
                  aria-label={expandedId === exp.id ? 'Collapse' : 'Expand'}
                >
                  {expandedId === exp.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {/* Expanded content */}
              {expandedId === exp.id && (
                <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                  {exp.description && (
                    <p className="text-sm text-text-secondary">{exp.description}</p>
                  )}
                  {exp.projects && exp.projects.length > 0 && (
                    <div>
                      <div className="text-[10px] text-text-muted mb-2">PROJECTS</div>
                      <div className="flex flex-wrap gap-2">
                        {exp.projects.map((proj) => (
                          <div
                            key={proj.id}
                            className="px-3 py-1.5 bg-neon-yellow/10 border border-neon-yellow/20 rounded-lg text-xs text-neon-yellow"
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
