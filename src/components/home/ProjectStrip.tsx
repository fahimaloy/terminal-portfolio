import React from 'react';
import Image from 'next/image';
import { Code, Briefcase } from 'lucide-react';
import { PortfolioProject } from '../../utils/api';
import { HudPanel, Ripple } from '../ui';
import { springs } from '../../config/animations';

const ACCENTS = ['yellow', 'magenta', 'cyan', 'green'] as const;

// Single spring config for InlineProjectCard → ProjectDetail transition
// Canonical HUD card spring — keep in sync with animations.ts springs.card.
export const projectCardSpring = springs.card as {
  stiffness: 150;
  damping: 14;
};

type StripProps = {
  projects: PortfolioProject[];
  onSelect: (p: PortfolioProject) => void;
};

export function ProjectStrip({ projects, onSelect }: StripProps) {
  if (!projects.length) return null;
  return (
    <div className="w-full mb-4">
      <div className="flex flex-wrap justify-center gap-3">
        {projects.slice(0, 4).map((project, idx) => {
          const accent = ACCENTS[(idx + 3) % ACCENTS.length];
          return (
            <Ripple
              key={project.id}
              onClick={() => onSelect(project)}
              className="w-[150px] cursor-pointer"
            >
              <HudPanel
                accent={accent}
                notch="sm"
                className="p-2 hud-glow-yellow group"
              >
                <div className="w-full h-16 overflow-hidden bg-black/40 mb-2 relative">
                  {project.thumbnail_url ? (
                    <Image
                      src={project.thumbnail_url}
                      alt={project.title}
                      width={150}
                      height={64}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted">
                      <Code size={16} />
                    </div>
                  )}
                </div>
                <div className="text-[10px] font-display tracking-[1.5px] text-center text-text-primary">
                  {project.short_title || project.title}
                </div>
              </HudPanel>
            </Ripple>
          );
        })}
      </div>
    </div>
  );
}

type DetailProps = {
  project: PortfolioProject | null;
  open: boolean;
  onClose: () => void;
};

export function ProjectInlineDetail({ project, open, onClose }: DetailProps) {
  if (!open || !project) return null;
  return (
    <div className="w-full mb-4">
      <HudPanel accent="yellow" notch="md" className="p-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 overflow-hidden bg-black/40 flex-shrink-0 relative">
            {project.thumbnail_url ? (
              <Image
                src={project.thumbnail_url}
                alt=""
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-muted">
                <Briefcase size={16} />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-base text-text-primary tracking-wider">
              {project.title}
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {project.languages?.map((l, i) => (
                <span
                  key={i}
                  className="text-[9px] font-display tracking-[1px] px-1.5 py-0.5 bg-neon-yellow/20 text-neon-yellow border border-neon-yellow/30"
                >
                  {l}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan rounded"
            aria-label="Close project"
          >
            ×
          </button>
        </div>
      </HudPanel>
    </div>
  );
}
