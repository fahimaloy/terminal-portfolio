// src/components/ProjectInlineRef.tsx
import React from 'react';
import { PortfolioProject } from '../utils/api';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

const COLORS = [
  { accent: 'text-neon-yellow', border: 'border-neon-yellow/40', glow: 'hud-glow-yellow' },
  { accent: 'text-neon-magenta', border: 'border-neon-magenta/40', glow: 'hud-glow-magenta' },
  { accent: 'text-neon-cyan', border: 'border-neon-cyan/40', glow: 'hud-glow-cyan' },
  { accent: 'text-neon-yellow', border: 'border-neon-yellow/40', glow: 'hud-glow-yellow' },
  { accent: 'text-neon-magenta', border: 'border-neon-magenta/40', glow: 'hud-glow-magenta' },
];

type Props = {
  project: PortfolioProject;
  onOpen?: (project: PortfolioProject) => void;
  isOpen?: boolean;
};

export default function ProjectInlineRef({ project, onOpen, isOpen }: Props) {
  const c = COLORS[project.id % COLORS.length];
  return (
    <button
      onClick={() => onOpen?.(project)}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-display tracking-[1.5px] uppercase border bg-black/40 ${c.accent} ${c.border} ${c.glow} transition-all duration-200 hover:scale-[1.03] active:scale-95 clip-notch-sm`}
      title={`Click to view ${project.title} details`}
    >
      {project.thumbnail_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={project.thumbnail_url}
          alt=""
          className="w-3.5 h-3.5 rounded-full object-cover"
        />
      ) : (
        <span className="w-3.5 h-3.5 rounded-full bg-current opacity-40 flex items-center justify-center text-[8px] font-bold text-black">
          {project.title.charAt(0)}
        </span>
      )}
      <span className="truncate max-w-[120px]">
        {project.short_title || project.title}
      </span>
      {isOpen ? (
        <FiChevronUp className="w-3 h-3" />
      ) : (
        <FiChevronDown className="w-3 h-3" />
      )}
    </button>
  );
}
