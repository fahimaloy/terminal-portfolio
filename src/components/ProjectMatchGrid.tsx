// src/components/ProjectMatchGrid.tsx
/* ═══════════════════════════════════════════════════════════════════════════════
   PROJECT MATCH GRID — expandable 2-col grid replacing ProjectTableView
   in chat RAG + marker paths. Table rows → InlineProjectCard tiles; expand
   chevron pushes inline detail with spring(card). Respects skillFilter.
   Token-only: washes via HudPanel + InlineProjectCard accents; no raw hex.
   Motion: useMotionScope create guard + scope.revert() cleanup; reduced →
   opacity-only, no spring.
═══════════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { animate, spring } from 'animejs';
import { ChevronDown } from 'lucide-react';
import { PortfolioProject, PortfolioSkill } from '../utils/api';
import InlineProjectCard from './InlineProjectCard';
import HudPanel from './ui/HudPanel';
import { useMotionScope } from '../hooks/useMotionScope';
import { springs } from '../config/animations';

type ProjectMatchGridProps = {
  projects: PortfolioProject[];
  skills: PortfolioSkill[];
  skillFilter?: number[];
  onSelect?: (p: PortfolioProject) => void;
};

export default function ProjectMatchGrid({
  projects,
  skills,
  skillFilter,
  onSelect,
}: ProjectMatchGridProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const motionScope = useMotionScope(detailRef);

  const filtered = useMemo(() => {
    if (!skillFilter?.length) return projects;
    return projects.filter((p) =>
      p.tags?.some((t) => {
        const skill = skills.find((s) => s.name === t);
        return skill && skillFilter.includes(skill.id);
      }),
    );
  }, [projects, skills, skillFilter]);

  const expanded =
    expandedId !== null
      ? filtered.find((p) => p.id === expandedId) ?? null
      : null;

  useEffect(() => {
    if (expanded === null || !detailRef.current) return;
    const scope = motionScope.create();
    if (!scope) return;
    scope.add(() => {
      animate(detailRef.current!, {
        opacity: [0, 1],
        y: [12, 0],
        ...spring(springs.card),
      });
    });
    // motionScope holds the scope handle; re-fire when the expanded target changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);
  const toggle = (project: PortfolioProject) => {
    setExpandedId(expandedId === project.id ? null : project.id);
    onSelect?.(project);
  };

  if (!filtered.length) {
    return (
      <div className="text-center text-text-muted py-8">
        No projects found matching the selected filters.
      </div>
    );
  }
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((project) => {
          const open = expandedId === project.id;
          return (
            <div key={project.id} className="flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <InlineProjectCard
                    project={project}
                    skills={skills}
                    onClick={() => toggle(project)}
                  />
                </div>
                <button
                  onClick={() => toggle(project)}
                  aria-expanded={open}
                  aria-label={
                    open
                      ? 'Collapse project'
                      : `Expand ${project.short_title || project.title}`
                  }
                  className="mt-1 w-8 h-8 rounded-full flex items-center justify-center border shrink-0 transition-transform"
                  style={{
                    background: 'var(--bg-2)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--fg-2)',
                    transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                >
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {expanded && (
        <div ref={detailRef} className="w-full mt-3">
          <HudPanel accent="cyan" wash grid className="p-4">
            <div
              className="font-display text-base tracking-wide"
              style={{ color: 'var(--fg-1)' }}
            >
              {expanded.title}
            </div>
            {expanded.description && (
              <div
                className="text-xs mt-1 line-clamp-4"
                style={{ color: 'var(--fg-3)', lineHeight: 1.5 }}
              >
                {expanded.description}
              </div>
            )}
            <div className="flex flex-wrap gap-1 mt-2">
              {(expanded.languages ?? expanded.tags ?? [])
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
          </HudPanel>
        </div>
      )}
    </div>
  );
}
