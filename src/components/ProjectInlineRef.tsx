// src/components/ProjectInlineRef.tsx
import React from 'react';
import Image from 'next/image';
import { PortfolioProject } from '../utils/api';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

/**
 * `glow` replaces the retired `.hud-glow-*` utility, rebuilt from tokens
 * rather than revived as a class (see AdvancedFeaturesBar for the same move on
 * `text-shadow-neon-*`).
 *
 * The retired rule was a 0.35 outer halo plus a 0.08 inset rim, and both
 * halves are reproduced: `--glow-x` is that outer halo, and `--wash-x` is
 * 0.08 — exactly the alpha the retired hard-coded inset carried.
 *
 * Only the outer radius is recalibrated, 18px → 10px. These chips sit 12px
 * apart in a wrapping strip, so five 18px halos at 0.35 alpha bleed into one
 * smear; a glow that is on every chip at once is not a highlight, it is fog.
 * 10px keeps each chip's own edge lit and leaves the 12px gutter dark.
 *
 * Inline `style`, not an arbitrary Tailwind class: the comma-separated shadow
 * list has to be one literal string for Tailwind to generate it, and this file
 * builds its value per accent at runtime.
 */
const COLORS = [
  {
    accent: 'text-neon-amber',
    border: 'border-neon-amber/40',
    glow: '0 0 10px var(--glow-amber), inset 0 0 10px var(--wash-amber)',
  },
  {
    accent: 'text-neon-coral',
    border: 'border-neon-coral/40',
    glow: '0 0 10px var(--glow-coral), inset 0 0 10px var(--wash-coral)',
  },
  {
    accent: 'text-neon-cyan',
    border: 'border-neon-cyan/40',
    glow: '0 0 10px var(--glow-cyan), inset 0 0 10px var(--wash-cyan)',
  },
  {
    accent: 'text-neon-amber',
    border: 'border-neon-amber/40',
    glow: '0 0 10px var(--glow-amber), inset 0 0 10px var(--wash-amber)',
  },
  {
    accent: 'text-neon-coral',
    border: 'border-neon-coral/40',
    glow: '0 0 10px var(--glow-coral), inset 0 0 10px var(--wash-coral)',
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
      className={`inline-flex items-center gap-1.5 min-h-[44px] min-w-[44px] px-3 py-2 text-[10px] font-display tracking-[1.5px] uppercase border bg-[var(--overlay-black-strong)] ${c.accent} ${c.border} transition-all duration-200 hover:scale-[1.03] active:scale-95 clip-notch-sm`}
      title={`Click to view ${project.title} details`}
      style={{ boxShadow: c.glow }}
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
