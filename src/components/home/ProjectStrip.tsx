import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Code, Briefcase, ArrowUpRight, ChevronUp } from 'lucide-react';
import { createScope, createTimeline } from 'animejs';
import { PortfolioProject } from '../../utils/api';
import { resolveTechIcon } from '../../lib/techIcons';
import { HudPanel, NeonButton } from '../ui';
import {
  canAnimate,
  durations,
  easings,
  isReducedMotion,
  springs,
  type AccentColor,
} from '../../config/animations';

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

/* `aria-controls` target for both disclosure branches. Both buttons toggle the
   same grid, so both point at the one element it lives in. */
const STRIP_GRID_ID = 'project-strip-grid';

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
      <div id={STRIP_GRID_ID} className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
              // This branch IS the expanded state: the grid below it is showing
              // every project. Announcing `false` here told assistive tech the
              // opposite of what was on screen.
              aria-expanded
              aria-controls={STRIP_GRID_ID}
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
              // Collapsed: the grid is sliced to VISIBLE_SLICE.
              aria-expanded={false}
              aria-controls={STRIP_GRID_ID}
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

/* ── INLINE DETAIL — LIFECYCLE ──────────────────────────────────────────────────
   `isMounted`, NOT `open`, owns the render gate. Gating on `open` detached the
   panel root on the very commit that flipped the prop, so anything started
   afterwards animated a dead node and the visitor saw an instant cut. The panel
   now outlives the `open` flip until its exit finishes.

   Same lifecycle as `ProjectDetailDrawer` (see its file header) — deliberately
   not a third variant. The entrance is NOT duplicated here: `HudPanel` already
   owns the arrival, so this wrapper owns only the departure. A re-open mid-exit
   therefore returns the panel to its resting state instead of replaying a
   second arrival on top of the one `HudPanel` runs.

   The parent's `onClose` clears `project` in the same batch as `open`
   (`Homepage.tsx` sets both), so the panel has to remember what it was showing:
   `lastProjectRef` is the content the exit animates away. ────────────────────── */

/* The exit is `--dur-exit` compressed to 80%, the same factor the drawer and the
   message overlay use for theirs: a close reads as the mirror of the open rather
   than as a second, slower idea. */
const EXIT_FACTOR = 0.8;
const EXIT_PANEL_MS = durations.exit * 1000 * EXIT_FACTOR; // --dur-exit x 0.8 = 320ms
/** Mirrors `HudPanel`'s `ENTER_RISE_PX`: a distance, not a timing, so it is not a `--dur-*` token. */
const EXIT_SINK_PX = 8;

type DetailProps = {
  project: PortfolioProject | null;
  open: boolean;
  onClose: () => void;
};

export function ProjectInlineDetail({ project, open, onClose }: DetailProps) {
  /* Initialised from `open` and only ever cleared by a completed exit (or
     skipped outright under reduced motion), so the two are equal in the steady
     state and differ only for the ~320ms the panel is leaving. */
  const [isMounted, setIsMounted] = useState(open);
  /* Bumped on every open and every exit start, so a completion that outlived
     its exit resolves to a stale token and does nothing. */
  const exitTokenRef = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);
  /* `Homepage.tsx` clears `detailProject` in the same batch that flips `open`
     to false, so by the time the exit runs there is nothing left to render.
     Without this the exit would have no node to animate. */
  const lastProjectRef = useRef<PortfolioProject | null>(project);

  useEffect(() => {
    if (project) lastProjectRef.current = project;
  }, [project]);

  const shownProject = project ?? lastProjectRef.current;

  // Exit — and the owner of the mount gate above.
  //
  // Both directions live in one effect on purpose: the subtree's lifecycle has
  // exactly one writer, which is what makes the rapid-toggle case fall out of
  // the cleanup instead of needing a separate "did we come back?" flag.
  //
  //   open  -> guarantee the subtree exists, so the exit has a node.
  //   close -> animate out, then drop the subtree once it is invisible.
  //
  // RAPID RE-OPEN. React runs this effect's cleanup before the next pass, so
  // re-opening mid-exit reverts the in-flight timeline — which restores the
  // pre-exit inline styles and cancels the timer without firing `onComplete` —
  // and clears the deadline. `exitTokenRef` is the belt to those braces: the
  // open branch bumps it, so even a completion callback that somehow survived
  // cancellation resolves to a stale token and does nothing.
  useEffect(() => {
    if (open) {
      exitTokenRef.current += 1;
      setIsMounted(true);
      return;
    }
    // Already unmounted — this is the effect re-running after
    // `setIsMounted(false)`. Animating again here would restart the exit
    // forever, since each completion would flip the state and re-trigger.
    if (!isMounted) return;

    const panel = panelRef.current;

    // No node (nothing rendered) or the visitor asked for less motion: there is
    // no exit to watch, so leave on this tick rather than after 320ms of
    // nothing. The state transition is NOT guarded by reduced motion — only the
    // animation is, so a reduced-motion visitor can never be stranded here.
    if (!panel || isReducedMotion() || !canAnimate()) {
      setIsMounted(false);
      return;
    }

    const token = (exitTokenRef.current += 1);
    const finish = () => {
      if (exitTokenRef.current !== token) return;
      setIsMounted(false);
    };

    const scope = createScope({
      mediaQueries: { reduceMotion: '(prefers-reduced-motion: reduce)' },
      defaults: {
        duration: EXIT_PANEL_MS,
        ease: easings.expoIn,
      },
    } as Parameters<typeof createScope>[0]);

    scope.add(() => {
      // Live re-check: `mediaQueries.reduceMotion` is re-read from the actual
      // MediaQueryList on each `scope.execute()`, so a visitor who switches
      // reduced motion on while the panel is open is not held through the 320ms
      // they just opted out of.
      if (scope.matches.reduceMotion) {
        finish();
        return;
      }
      // Created inside the scope callback, so the timeline registers itself with
      // the scope and `scope.revert()` in the cleanup below becomes its owner.
      const tl = createTimeline({ onComplete: finish });
      tl.add(
        panel,
        {
          opacity: [1, 0],
          translateY: [0, EXIT_SINK_PX],
          duration: EXIT_PANEL_MS,
          ease: easings.expoIn,
        },
        0,
      );
    });

    // Deadline backstop. `onComplete` is the intended signal; this is the
    // guarantee the panel still leaves if that signal never arrives — a
    // throttled rAF in a backgrounded tab, an engine that skips the final
    // callback, a throw inside a tick. Deliberately 2x the exit so it never
    // wins the race on the happy path; the cleanup below owns it.
    const timer = setTimeout(finish, EXIT_PANEL_MS * 2);

    return () => {
      clearTimeout(timer);
      try {
        scope.revert();
      } catch {}
    };
  }, [open, isMounted]);

  // `!shownProject` stays a separate, non-lifecycle guard and is deliberately
  // NOT folded into `isMounted`: it means "there is genuinely nothing to show",
  // whereas `isMounted` means only "the panel is on screen right now". Merging
  // the two would give the mount state a second writer and would leave
  // `isMounted` true with no node for the exit to animate.
  if (!isMounted || !shownProject) return null;

  // The detail panel is the one place a visitor is shown a project's actual
  // stack, so a silent cut here is the worst of the three: same disclosure
  // treatment as the card chips.
  const allLabels = shownProject.languages ?? shownProject.tags ?? [];
  const shownLabels = allLabels.slice(0, VISIBLE_LANGUAGES);
  const hiddenLabels = allLabels.length - shownLabels.length;

  return (
    <div ref={panelRef} className="w-full mt-4">
      <HudPanel accent="cyan" wash grid className="p-4">
        <div className="flex items-start gap-4">
          <div
            className="w-20 h-20 overflow-hidden rounded-[var(--radius-md)] flex-shrink-0 relative border"
            style={{
              borderColor: 'var(--border-subtle)',
              background: 'var(--bg-3)',
            }}
          >
            {shownProject.thumbnail_url ? (
              <Image
                src={shownProject.thumbnail_url}
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
              {shownProject.title}
            </div>
            {shownProject.description && (
              <div
                className="text-xs mt-1 line-clamp-3"
                style={{ color: 'var(--fg-3)', lineHeight: 1.5 }}
              >
                {shownProject.description}
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
