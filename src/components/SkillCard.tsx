// src/components/SkillCard.tsx
/* ═══════════════════════════════════════════════════════════════════════════════
   SKILL CARD — Enhanced with anime.js animations
   - 3D tilt on hover
   - Icon bounce on hover
   - Spring entrance animation
═══════════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useRef } from 'react';
import { PortfolioSkill } from '../utils/api';
import { Tilt3D, NeonChip, StatBar } from './ui';
import { animate } from 'animejs';
import { isReducedMotion } from '../config/animations';

const GRADIENTS = [
  'from-purple-500/20 to-blue-500/20',
  'from-cyan-500/20 to-teal-500/20',
  'from-pink-500/20 to-rose-500/20',
  'from-amber-500/20 to-orange-500/20',
  'from-emerald-500/20 to-green-500/20',
  'from-indigo-500/20 to-violet-500/20',
  'from-fuchsia-500/20 to-pink-500/20',
  'from-sky-500/20 to-cyan-500/20',
];

function getGradient(id: number): string {
  return GRADIENTS[id % GRADIENTS.length];
}

type SkillCardProps = {
  skill: PortfolioSkill;
  inline?: boolean;
  delay?: number;
};

export default function SkillCard({ skill, inline = false, delay = 0 }: SkillCardProps) {
  const gradient = getGradient(skill.id);
  const ref = useRef<HTMLDivElement>(null);

  // Animate skill level bar on mount
  useEffect(() => {
    if (!ref.current || isReducedMotion()) return;
    const bar = ref.current.querySelector('.skill-level-bar');
    if (!bar) return;

    const level = skill.level ? parseInt(skill.level) || 70 : 70;
    const obj = { val: 0 };
    setTimeout(() => {
      animate(obj, {
        val: [0, level],
        duration: 800,
        delay: delay,
        ease: 'outExpo',
        onUpdate: () => {
          (bar as HTMLElement).style.width = `${Math.round(obj.val)}%`;
        },
      });
    }, delay);
  }, [skill.level, delay]);

  const levelValue = skill.level ? parseInt(skill.level) || 70 : 70;

  return (
    <Tilt3D intensity={4}>
      <div
        ref={ref}
        className={`bg-gradient-to-br ${gradient} border border-white/10 rounded-xl ${
          inline ? 'px-3 py-2 inline-flex items-center gap-2' : 'p-4 flex flex-col items-center text-center'
        } transition-all duration-200 hover:border-white/20 skill-card`}
      >
        <div className={`font-display text-neon-cyan text-shadow-neon-cyan ${
          inline ? 'text-sm' : 'text-lg mb-2'
        }`}>
          {skill.name}
        </div>
        {!inline && (
          <div className="w-full mt-2">
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="skill-level-bar h-full bg-gradient-to-r from-neon-cyan to-neon-magenta"
                style={{ width: isReducedMotion() ? `${levelValue}%` : '0%' }}
              />
            </div>
          </div>
        )}
        {skill.duration && (
          <div className="text-[10px] font-mono text-neon-yellow bg-neon-yellow/10 border border-neon-yellow/20 px-2 py-0.5 rounded-full mt-1">
            {skill.duration}
          </div>
        )}
        {skill.category && !inline && (
          <div className="text-[9px] text-text-muted mt-1">{skill.category}</div>
        )}
      </div>
    </Tilt3D>
  );
}
