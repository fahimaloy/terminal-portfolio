// src/components/ProjectInlineRef.tsx
import React from 'react';
import Image from 'next/image';
import { PortfolioProject } from '../utils/api';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

const COLORS = [
  {
    accent: 'text-neon-amber',
    border: 'border-neon-amber/40',
    glow: 'hud-glow-amber',
  },
  {
    accent: 'text-neon-coral',
    border: 'border-neon-coral/40',
    glow: 'hud-glow-coral',
  },
  {
    accent: 'text-neon-cyan',
    border: 'border-neon-cyan/40',
    glow: 'hud-glow-cyan',
  },
  {
    accent: 'text-neon-amber',
    border: 'border-neon-amber/40',
    glow: 'hud-glow-amber',
  },
  {
    accent: 'text-neon-coral',
    border: 'border-neon-coral/40',
    glow: 'hud-glow-coral',
  },
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
      className={`inline-flex items-center gap-1.5 min-h-[44px] min-w-[44px] px-3 py-2 text-[10px] font-display tracking-[1.5px] uppercase border bg-[var(--overlay-black-strong)] ${c.accent} ${c.border} ${c.glow} transition-all duration-200 hover:scale-[1.03] active:scale-95 clip-notch-sm`}
      title={`Click to view ${project.title} details`}
    >
      {project.thumbnail_url ? (
        <Image
          src={project.thumbnail_url}
          alt=""
          width={14}
          height={14}
          className="w-3.5 h-3.5 rounded-full object-cover"
        />
      ) : (
        <span className="w-3.5 h-3.5 rounded-full bg-current opacity-40 flex items-center justify-center text-[8px] font-bold text-[var(--bg-void)]">
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
