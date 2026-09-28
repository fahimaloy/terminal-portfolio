import React, { useState } from 'react';
import Image from 'next/image';
import { Code, Briefcase, ArrowUpRight, ChevronUp } from 'lucide-react';
import { PortfolioProject } from '../../utils/api';
import { resolveTechIcon } from '../../lib/techIcons';
import { HudPanel, NeonButton } from '../ui';
import { springs, type AccentColor } from '../../config/animations';

/* ── WHY THESE NUMBERS ──────────────────────────────────────────────────────
   The featured slice is 4 because the grid is `md:grid-cols-4`: four cards
   fill exactly one row, so the strip reads as a deliberate "row of four"
   rather than an arbitrary cut. The slice size is NOT the bug.

   The bug was that the cut was SILENT — a visitor with 12 projects saw four
   cards and had no way to know the other eight existed, let alone reach them.
   So the slice stays, and two affordances make the cut legible:

     1. a live "01 — 04 / 12" counter in the header, and
     2. a VIEW ALL control that expands the SAME grid in place.

   VIEW ALL expands in place rather than routing or scrolling because
   `Homepage.tsx` (the only caller) is the sole owner of the page's scroll
   container and its project detail state; routing away from it would strand
   the chat, and there is no project grid elsewhere on the homepage to link to.
   Expanding in place keeps the strip inside the one surface that renders it
   and needs no prop plumbing through the caller. */
const VISIBLE_SLICE = 4;

/* Per-card language chips are also a deliberate cut, but a different kind of
   bug: a project built with 9 languages rendered as if it had 4, with no
   overflow affordance at all. Same treatment — keep the cut, disclose the
   remainder with a +N chip. */
const VISIBLE_LANGUAGES = 4;

const ACCENTS: readonly AccentColor[] = ['cyan', 'violet', 'coral', 'ice'];

const pad = (n: number) => String(n).padStart(2, '0');

/* One shared overflow chip so a truncated label list is disclosed the same way
   everywhere in this file. */
function OverflowChip({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="text-[9px] font-mono tracking-[0.08em] px-1.5 py-0.5 rounded-full border"
      style={{
        background: 'var(--bg-2)',
        borderColor: 'var(--border-subtle)',
        // --fg-3, not --fg-4: "+N" is information a visitor reads in order to
        // understand that the list above is incomplete.
        color: 'var(--fg-3)',
      }}
      title={`${count} more`}
    >
      +{count}
    </span>
  );
}

export const projectCardSpring = springs.card as {
  stiffness: 150;
  damping: 14;
};

type StripProps = {
  projects: PortfolioProject[];
  onSelect: (p: PortfolioProject) => void;
};

export function ProjectStrip({ projects, onSelect }: StripProps) {
  const [expanded, setExpanded] = useState(false);

  if (!projects.length) return null;

  const total = projects.length;
  const hiddenCount = Math.max(0, total - VISIBLE_SLICE);
  const visible = expanded ? projects : projects.slice(0, VISIBLE_SLICE);
  // Collapsed and nothing hidden: "12 PROJECTS". Collapsed with more hidden:
  // "01 — 04 / 12". Expanded: "01 — 12 / 12".
  const counter =
    hiddenCount === 0
      ? `${pad(total)} ${total === 1 ? 'PROJECT' : 'PROJECTS'}`
      : `${pad(1)} — ${pad(visible.length)} / ${pad(total)}`;

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
            // DECORATIVE chrome label: it names the section, it is not itself
            // content, and at 10px on --bg-2 --fg-4 (4.65:1) is the step
            // tokens.css sanctions for labels this size. The count beside it
            // carries the information and is on --fg-3.
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
        {/* The disclosure. `aria-live` so expanding the strip announces the
            new range to a screen reader instead of silently swapping cards. */}
        <span
          aria-live="polite"
          className="shrink-0 text-[10px] font-mono tabular-nums tracking-[0.12em]"
          style={{ color: 'var(--fg-3)' }}
        >
          {counter}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {visible.map((project, idx) => {
          // No cast: ACCENTS is typed `readonly AccentColor[]`, so this is
          // already an AccentColor. The previous version cast to a local
          // 4-name union that listed amber/lime (not in ACCENTS) and omitted
          // violet/ice (which are), so the static type disagreed with the
          // values actually rendered.
          const accent = ACCENTS[idx % ACCENTS.length];
          const tags = (project.tags ?? project.languages ?? []).slice(0, 2);

          // Resolve icons BEFORE slicing: entries with no matching icon render
          // as null, so slicing the raw list would under-report the overflow.
          const resolvedLanguages = (project.languages ?? [])
            .map((l) => ({ label: l, hit: resolveTechIcon(l) }))
            .filter((x) => x.hit !== null);
          const shownLanguages = resolvedLanguages.slice(0, VISIBLE_LANGUAGES);
          const hiddenLanguages =
            resolvedLanguages.length - shownLanguages.length;

          return (
            <button
              key={project.id}
              onClick={() => onSelect(project)}
              className="group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)] rounded-[var(--radius-lg)] transition-[transform,box-shadow] duration-200 ease-smooth"
            >
              <HudPanel
                accent={accent}
                wash
                grid
                className="p-0 overflow-hidden group-hover:scale-[1.015] group-hover:-translate-y-0.5 transition-transform duration-200"
              >
                <div
                  className="w-full h-[96px] overflow-hidden relative"
                  style={{ background: 'var(--bg-void)' }}
                >
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
                    className="absolute inset-x-0 bottom-0 h-1px opacity-60"
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
                  {shownLanguages.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 mt-1.5">
                      {shownLanguages.map(({ label, hit }, i) => (
                        <span
                          key={`${label}-${i}`}
                          className="inline-flex items-center gap-1 text-[9px] font-mono tracking-[0.08em] px-1.5 py-0.5 rounded-full border"
                          style={{
                            background: 'var(--wash-cyan)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--fg-2)',
                          }}
                        >
                          {hit && (
                            <hit.Component
                              size={14}
                              color={hit.hex}
                              aria-hidden="true"
                            />
                          )}
                          {label}
                        </span>
                      ))}
                      <OverflowChip count={hiddenLanguages} />
                    </div>
                  )}
                </div>
              </HudPanel>
            </button>
          );
        })}
      </div>

      {hiddenCount > 0 && (
        <div className="flex justify-center mt-3">
          {expanded ? (
            <NeonButton
              variant="ghost"
              size="sm"
              accent="ice"
              onClick={() => setExpanded(false)}
              aria-expanded={false}
              iconRight={<ChevronUp size={14} aria-hidden="true" />}
            >
              SHOW FEATURED {VISIBLE_SLICE}
            </NeonButton>
          ) : (
            <NeonButton
              variant="ghost"
              size="sm"
              accent="ice"
              onClick={() => setExpanded(true)}
              aria-expanded={false}
              iconRight={<ArrowUpRight size={14} aria-hidden="true" />}
            >
              {`VIEW ALL ${pad(total)} PROJECTS`}
            </NeonButton>
          )}
        </div>
      )}
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

  // The detail panel is the one place a visitor is shown a project's actual
  // stack, so a silent cut here is the worst of the three: same disclosure
  // treatment as the card chips.
  const allLabels = project.languages ?? project.tags ?? [];
  const shownLabels = allLabels.slice(0, VISIBLE_LANGUAGES);
  const hiddenLabels = allLabels.length - shownLabels.length;

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
                // DECORATIVE: an icon placeholder, not copy. --fg-4 is
                // intentional here and is not an oversight to be promoted.
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
              {shownLabels.map((l: string, i: number) => (
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
              <OverflowChip count={hiddenLabels} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="relative w-8 h-8 rounded-full flex items-center justify-center border shrink-0 hover:scale-105 transition-transform after:absolute after:inset-[-6px] after:content-['']"
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
