// src/components/InlineProjectCard.tsx
import React from 'react';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { PortfolioProject, PortfolioSkill } from '../utils/api';
import { HudPanel } from './ui';
import type { AccentColor } from '../config/animations';
import { HOVER_LIFT_TRANSITION } from '../config/animations';

type InlineProjectCardProps = {
  project: PortfolioProject;
  skills: PortfolioSkill[];
  onClick?: () => void;
};

/**
 * Per-id accent rotation. Typed as the app-wide `AccentColor` rather than a
 * locally re-spelled union, so adding an accent to `tokens.css` widens this
 * list without anyone hand-editing a second copy of the six names. Order is
 * load-bearing: the accent is `ACCENT_BY_ID[project.id % length]`, so it
 * decides which colour a given project id gets.
 */
const ACCENT_BY_ID: readonly AccentColor[] = [
  'cyan',
  'coral',
  'amber',
  'lime',
  'violet',
  'ice',
];

/**
 * The house card lift — 2px of travel plus a 1.5% scale, a 16px halo in the
 * card's OWN accent published as `--card-glow`, and `--dur-hover` /
 * `--ease-out`.
 *
 * The transition is imported rather than spelled out here so this card, the
 * `ProjectPreview` tab strip and `SkillCard` cannot drift apart: see
 * `HOVER_LIFT_TRANSITION` in `src/config/animations.ts` for why it reads a CSS
 * var instead of a `duration-*` class (a compiled Tailwind duration is a
 * literal and cannot see the reduced-motion block that collapses
 * `--dur-hover` to 0ms), and for why the lift must ride the interactive
 * element rather than the `HudPanel` inside it.
 */

export default function InlineProjectCard({
  project,
  skills,
  onClick,
}: InlineProjectCardProps) {
  const accent = ACCENT_BY_ID[project.id % ACCENT_BY_ID.length];
  const projectSkills = skills.filter((s) => project.tags?.includes(s.name));

  return (
    <button
      onClick={onClick}
      // The focus ring follows the ACTIVE accent role (`--accent-color`), not
      // `--neon-cyan`: a cyan ring on a coral card contradicts the switcher.
      // Same call `AccentSwitcher.tsx:283` already makes.
      className="group text-left inline-block max-w-xs w-full min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] rounded-[var(--radius-lg)] hover:-translate-y-0.5 hover:scale-[1.015] hover:shadow-[0_0_16px_var(--card-glow)]"
      style={
        {
          cursor: onClick ? 'pointer' : 'default',
          '--card-glow': `var(--glow-${accent}-sm)`,
          // token-lint-ignore -- inline transition reads CSS vars, not Tailwind classes
          transition: HOVER_LIFT_TRANSITION,
        } as React.CSSProperties
      }
    >
      <HudPanel accent={accent} wash grid className="p-0 overflow-hidden">
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
              style={{ color: 'var(--fg-3)' }}
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
