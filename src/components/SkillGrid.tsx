// src/components/SkillGrid.tsx
/* ═══════════════════════════════════════════════════════════════════════════════
   SKILL GRID — Enhanced with stagger entrance animations
   Uses anime.js for staggered reveal.
═══════════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useRef } from 'react';
import { PortfolioSkill } from '../utils/api';
import SkillCard from './SkillCard';
import { createScope, animate, stagger } from 'animejs';
import { isReducedMotion } from '../config/animations';

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
        duration: 400,
        ease: 'outExpo',
        delay: stagger(60, { from: 'first' }),
      });
    });

    return () => {
      scope.revert();
      scopeRef.current = null;
    };
  }, [skills]);

  if (!skills.length) return null;

  return (
    <div ref={gridRef} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {skills.map((skill, idx) => (
        <div key={skill.id} className="skill-grid-item opacity-0">
          <SkillCard skill={skill} delay={idx * 60} />
        </div>
      ))}
    </div>
  );
}
