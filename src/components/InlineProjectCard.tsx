// src/components/InlineProjectCard.tsx
import React from 'react';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { PortfolioProject, PortfolioSkill } from '../utils/api';
import { HudPanel } from './ui';

type InlineProjectCardProps = {
  project: PortfolioProject;
  skills: PortfolioSkill[];
  onClick?: () => void;
};

const ACCENT_BY_ID = [
  'cyan',
  'magenta',
  'yellow',
  'green',
  'purple',
  'blue',
] as const;

export default function InlineProjectCard({
  project,
  skills,
  onClick,
}: InlineProjectCardProps) {
  const accent = ACCENT_BY_ID[project.id % ACCENT_BY_ID.length] as unknown as
    | 'cyan'
    | 'magenta'
    | 'yellow'
    | 'green'
    | 'purple'
    | 'blue';
  const projectSkills = skills.filter((s) => project.tags?.includes(s.name));

  return (
    <button
      onClick={onClick}
      className="group text-left inline-block max-w-xs w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)] rounded-[var(--radius-lg)]"
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <HudPanel
        accent={accent}
        wash
        grid
        className="p-0 overflow-hidden group-hover:scale-[1.015] transition-transform duration-200"
      >
        {project.thumbnail_url && (
          <div
            className="relative h-20 overflow-hidden border-b"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <Image
              src={project.thumbnail_url}
              alt={project.title}
              width={320}
              height={80}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
            />
            <div
              className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <ArrowUpRight size={12} style={{ color: 'var(--fg-2)' }} />
            </div>
          </div>
        )}
        <div className="p-3">
          <div
            className="font-display text-sm leading-tight line-clamp-2"
            style={{ color: 'var(--fg-1)' }}
          >
            {project.title}
          </div>
          {project.short_title && (
            <div
              className="text-[10px] mt-1 line-clamp-1"
              style={{ color: 'var(--fg-4)' }}
            >
              {project.short_title}
            </div>
          )}
          {projectSkills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {projectSkills.slice(0, 3).map((s) => (
                <span
                  key={s.id}
                  className="text-[9px] px-1.5 py-0.5 rounded-full border"
                  style={{
                    background: `var(--wash-${accent})`,
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--fg-2)',
                  }}
                >
                  {s.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </HudPanel>
    </button>
  );
}
