// src/components/InlineProjectCard.tsx
import React from 'react';
import { PortfolioProject, PortfolioSkill } from '../utils/api';

const GRADIENTS = [
  'from-purple-500/20 to-blue-500/20',
  'from-cyan-500/20 to-teal-500/20',
  'from-pink-500/20 to-rose-500/20',
  'from-amber-500/20 to-orange-500/20',
  'from-emerald-500/20 to-green-500/20',
];

type InlineProjectCardProps = {
  project: PortfolioProject;
  skills: PortfolioSkill[];
  onClick?: () => void;
};

export default function InlineProjectCard({ project, skills, onClick }: InlineProjectCardProps) {
  const gradient = GRADIENTS[project.id % GRADIENTS.length];
  const projectSkills = skills.filter((s) => project.tags?.includes(s.name));

  return (
    <div
      onClick={onClick}
      className={`bg-gradient-to-br ${gradient} border border-white/10 rounded-xl p-3 cursor-pointer hover:border-neon-cyan/30 transition-all inline-block max-w-xs`}
    >
      {project.thumbnail_url && (
        <img
          src={project.thumbnail_url}
          alt={project.title}
          className="w-full h-24 object-cover rounded-lg mb-2"
        />
      )}
      <div className="font-display text-sm text-neon-cyan text-shadow-neon-cyan">
        {project.title}
      </div>
      {project.short_title && (
        <div className="text-[10px] text-text-muted mt-0.5">{project.short_title}</div>
      )}
      {projectSkills.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {projectSkills.slice(0, 3).map((s) => (
            <span
              key={s.id}
              className="text-[9px] px-1.5 py-0.5 bg-white/10 rounded-full text-text-secondary"
            >
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
