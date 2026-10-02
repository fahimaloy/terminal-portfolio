// src/components/SkillGrid.tsx
/* ═══════════════════════════════════════════════════════════════════════════════
   SKILL GRID — Enhanced with stagger entrance animations
   Uses anime.js for staggered reveal.
═══════════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useRef } from 'react';
import { PortfolioSkill } from '../utils/api';
import SkillCard from './SkillCard';
import { createScope, animate, stagger } from 'animejs';
import { durations, easings, isReducedMotion } from '../config/animations';

type SkillGridProps = {
  skills: PortfolioSkill[];
};

export default function SkillGrid({ skills }: SkillGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);

  useEffect(() => {
    if (!gridRef.current || isReducedMotion()) return;

    const scope = createScope({ root: gridRef.current });
    scopeRef.current = scope;

    scope.add(() => {
      const cards = gridRef.current!.querySelectorAll('.skill-grid-item');
      if (cards.length === 0) return;

      animate(cards, {
        opacity: [0, 1],
        y: [20, 0],
        scale: [0.9, 1],
        // Was 400ms — no --dur-400 exists, so this takes the next token down
        // (durations[300]), matching ExperienceTimeline's card tween.
        duration: durations[300] * 1000,
        ease: easings.outExpo,
        delay: stagger(durations.stagger * 1000, { from: 'first' }),
      });
    });

    return () => {
      scope.revert();
      scopeRef.current = null;
    };
  }, [skills]);

  if (!skills.length) return null;

  return (
    <div
      ref={gridRef}
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
    >
      {skills.map((skill, idx) => (
        <div key={skill.id} className="skill-grid-item reveal">
          <SkillCard skill={skill} />
        </div>
      ))}
    </div>
  );
}
