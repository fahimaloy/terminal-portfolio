import React from 'react';
import Image from 'next/image';
import { Code, Briefcase, ArrowUpRight } from 'lucide-react';
import { PortfolioProject } from '../../utils/api';
import { HudPanel } from '../ui';
import { springs } from '../../config/animations';

const ACCENTS = ['cyan', 'magenta', 'yellow', 'green'] as const;

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
    <div className="w-full">
      <div className="flex items-center gap-2 mb-3">
        <div
          className="h-px flex-1"
          style={{ background: 'var(--border-subtle)' }}
        />
        <span
          className="text-[10px] font-mono tracking-[0.2em] px-2 py-1 rounded-full border"
          style={{
            color: 'var(--fg-4)',
            background: 'var(--bg-2)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          FEATURED BUILDS
        </span>
        <div
          className="h-px flex-1"
          style={{ background: 'var(--border-subtle)' }}
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {projects.slice(0, 4).map((project, idx) => {
          const accent = ACCENTS[idx % ACCENTS.length] as unknown as
            | 'cyan'
            | 'magenta'
            | 'yellow'
            | 'green';
          const tags = (project.tags ?? project.languages ?? []).slice(0, 2);
          return (
            <button
              key={project.id}
              onClick={() => onSelect(project)}
              className="group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)] rounded-[var(--radius-lg)]"
              style={{
                transition: `transform 240ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 240ms cubic-bezier(0.16, 1, 0.3, 1)`,
              }}
            >
              <HudPanel
                accent={accent}
                wash
                grid
                className="p-0 overflow-hidden group-hover:scale-[1.015] group-hover:-translate-y-0.5 transition-transform duration-200"
              >
                <div className="w-full h-[96px] overflow-hidden relative bg-black/30">
                  {project.thumbnail_url ? (
                    <Image
                      src={project.thumbnail_url}
                      alt={project.title}
                      width={320}
                      height={96}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{
                        background: `var(--wash-${accent})`,
                        color: 'var(--fg-3)',
                      }}
                    >
                      <Code size={18} />
                    </div>
                  )}
                  <div
                    className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background: 'var(--bg-2)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <ArrowUpRight size={12} style={{ color: 'var(--fg-2)' }} />
                  </div>
                  <div
                    className="absolute inset-x-0 bottom-0 h-[1px] opacity-60"
                    style={{ background: `var(--neon-${accent})` }}
                  />
                </div>
                <div className="p-3">
                  <div
                    className="text-[11px] font-display tracking-[0.08em] leading-tight line-clamp-2"
                    style={{ color: 'var(--fg-1)' }}
                  >
                    {project.short_title || project.title}
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tags.map((t: string, i: number) => (
                        <span
                          key={i}
                          className="text-[9px] font-mono tracking-[0.08em] px-1.5 py-0.5 rounded-full border"
                          style={{
                            background: `var(--wash-${accent})`,
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--fg-2)',
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </HudPanel>
            </button>
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
    <div className="w-full mt-4">
      <HudPanel accent="cyan" wash grid className="p-4">
        <div className="flex items-start gap-4">
          <div
            className="w-20 h-20 overflow-hidden rounded-[var(--radius-md)] flex-shrink-0 relative border"
            style={{
              borderColor: 'var(--border-subtle)',
              background: 'var(--bg-3)',
            }}
          >
            {project.thumbnail_url ? (
              <Image
                src={project.thumbnail_url}
                alt=""
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ color: 'var(--fg-4)' }}
              >
                <Briefcase size={18} />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="font-display text-base tracking-wide"
              style={{ color: 'var(--fg-1)' }}
            >
              {project.title}
            </div>
            {project.description && (
              <div
                className="text-xs mt-1 line-clamp-3"
                style={{ color: 'var(--fg-3)', lineHeight: 1.5 }}
              >
                {project.description}
              </div>
            )}
            <div className="flex flex-wrap gap-1 mt-2">
              {(project.languages ?? project.tags ?? [])
                .slice(0, 4)
                .map((l: string, i: number) => (
                  <span
                    key={i}
                    className="text-[9px] font-mono tracking-[0.08em] px-1.5 py-0.5 rounded-full border"
                    style={{
                      background: 'var(--wash-cyan)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--fg-2)',
                    }}
                  >
                    {l}
                  </span>
                ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center border shrink-0 hover:scale-105 transition-transform"
            style={{
              background: 'var(--bg-2)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--fg-3)',
            }}
            aria-label="Close project"
          >
            ×
          </button>
        </div>
      </HudPanel>
    </div>
  );
}
