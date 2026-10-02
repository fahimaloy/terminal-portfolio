// src/components/ProjectDetailDrawer.tsx
/* ═══════════════════════════════════════════════════════════════════════════════
   PROJECT DETAIL DRAWER — right drawer replacing the centered modal for
   chat project mentions. Spring(gentle) x [100%,0] entrance, ESC + backdrop
   close, Bracket chrome (data-graphic), token-only styling.

   LIFECYCLE. `isMounted`, not `isOpen`, owns the render gate. Gating on
   `isOpen` detached `backdropRef` / `panelRef` on the very commit that flipped
   the prop, so the close animation started by the old `handleClose` was
   animating a dead node and the visitor saw an instant cut with no exit -- the
   classic "animate a node you are about to unmount" defect. The subtree now
   outlives the prop flip until the exit timeline's `onComplete` (or its
   deadline backstop) drops it. `isOpen === false` while `isMounted === true` is
   the ~320ms the drawer is on its way out.
═══════════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { X, ExternalLink, Code } from 'lucide-react';
import { animate, createScope, createTimeline, spring } from 'animejs';
import { PortfolioProject, PortfolioSkill } from '../utils/api';
import RichTextRenderer from './RichTextRenderer';
import Bracket from './ui/graphics/primitives/Bracket';
import { useMotionScope } from '../hooks/useMotionScope';
import {
  isReducedMotion,
  canAnimate,
  springs,
  durations,
  easings,
} from '../config/animations';

/* -- TIMING ------------------------------------------------------------------
   The enter is two cadences: a 384ms (--dur-enter x 0.6) backdrop fade and an
   open-ended spring(gentle) slide from x:100%.

   The exit is that pair played backwards and compressed to 80% of the enter, so
   a close reads as the mirror of the open rather than as a second, slower idea.
   80% is the compression factor, not a magic number: it lands the panel at
   320ms, the longest a visitor will accept waiting for a sheet to disappear
   without reading it as lag, while still being long enough to be seen at all. A
   drawer that leaves in one frame reads as a glitch; one that takes the full
   --dur-exit to leave reads as unresponsive.

   The backdrop derives from its own enter duration. The panel derives from
   --dur-exit, the concrete token standing in for the enter's open-ended spring
   (and the one this drawer's exit already used).

   Only the panel governs the unmount. It is the content the visitor was reading,
   it is the slower of the two (320 > 307.2), and unmounting on its completion is
   what makes the backdrop disappear "slightly before" the panel for free -- no
   ordering to get wrong. */
const ENTER_BACKDROP_MS = durations.enter * 1000 * 0.6; // --dur-enter x 0.6
const EXIT_FACTOR = 0.8;
const EXIT_BACKDROP_MS = ENTER_BACKDROP_MS * EXIT_FACTOR; // ~307ms
const EXIT_PANEL_MS = durations.exit * 1000 * EXIT_FACTOR; // --dur-exit x 0.8 = 320ms
/** Mirrors the enter's `x: ['100%', '0%']` -- the panel leaves to the right, from where it came. */
const EXIT_PANEL_X = '100%';

type ProjectDetailDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  projects: PortfolioProject[];
  skills: PortfolioSkill[];
};

export default function ProjectDetailDrawer({
  isOpen,
  onClose,
  projects,
  skills,
}: ProjectDetailDrawerProps) {
  const [isVisible, setIsVisible] = useState(false);
  /* `isMounted`, NOT `isOpen`, is the render gate. See the file header: the
     subtree stays mounted until the exit has actually finished. It is
     initialised from `isOpen` and only ever cleared by a completed exit (or
     skipped outright under reduced motion), so the two are equal in the steady
     state and differ only for the ~320ms the drawer is leaving. */
  const [isMounted, setIsMounted] = useState(isOpen);
  /* Bumped on every open and every exit start. An exit's completion callback
     may only unmount while its own token is still the current one, so a
     completion that arrives after the drawer was re-opened is inert instead of
     yanking a live drawer out of the DOM. */
  const exitTokenRef = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const motionScope = useMotionScope(panelRef);
  const project = projects[0] ?? null;

  // Entrance -- owns `isVisible` only. `isMounted` is in the deps on purpose: the
  // refs do not exist until the commit that `setIsMounted(true)` triggers, so
  // without it the first open after a close would mount silently.
  useEffect(() => {
    if (!isOpen || !isMounted) return;
    motionScope.run((scope) => {
      if (!scope) {
        setIsVisible(true);
        return;
      }
      animate(backdropRef.current!, {
        opacity: [0, 1],
        duration: ENTER_BACKDROP_MS,
        ease: easings.outExpo as unknown as string,
      });
      animate(panelRef.current!, {
        opacity: [0, 1],
        x: ['100%', '0%'],
        ...spring(springs.gentle),
      });
      setIsVisible(true);
    });
    return () => {
      motionScope.revert();
    };
  }, [isOpen, isMounted, motionScope]);

  // Exit -- and the owner of the mount gate above.
  //
  // Both directions live in one effect on purpose: the subtree's lifecycle has
  // exactly one writer, which is what makes the rapid-toggle case fall out of
  // the cleanup instead of needing a separate "did we come back?" flag.
  //
  //   open  -> guarantee the subtree exists, so the entrance has refs.
  //   close -> animate out, then drop the subtree once the panel is invisible.
  //
  // RAPID RE-OPEN. React runs this effect's cleanup before the next pass, so
  // re-opening mid-exit reverts the in-flight timeline -- which restores the
  // pre-exit inline styles and cancels the timer without firing `onComplete` --
  // and clears the deadline. `exitTokenRef` is the belt to those braces: the
  // open branch bumps it, so even a completion callback that somehow survived
  // cancellation resolves to a stale token and does nothing.
  useEffect(() => {
    if (isOpen) {
      // Invalidate any exit still in flight before re-showing the drawer.
      exitTokenRef.current += 1;
      setIsMounted(true);
      return;
    }
    // Already fully unmounted -- this pass is the effect re-running after
    // `setIsMounted(false)`. Animating again here would restart the exit
    // forever, since each completion would flip the state and re-trigger.
    if (!isMounted) return;

    const panel = panelRef.current;
    const backdrop = backdropRef.current;

    // No refs (nothing rendered) or the visitor asked for less motion: there is
    // no exit to watch, so leave on this tick rather than after 320ms of nothing.
    if (!panel || !backdrop || isReducedMotion() || !canAnimate()) {
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
      defaults: { duration: EXIT_PANEL_MS, ease: easings.expoIn },
    } as Parameters<typeof createScope>[0]);

    scope.add(() => {
      // Live re-check: `mediaQueries.reduceMotion` is read from the actual
      // MediaQueryList on each `scope.execute()`, so a visitor who switches
      // reduced motion on while the drawer is open is not held through the
      // 320ms they just opted out of.
      if (scope.matches.reduceMotion) {
        finish();
        return;
      }
      // Created inside the scope callback, so the timeline registers itself with
      // the scope and `scope.revert()` in the cleanup below becomes its owner.
      const tl = createTimeline({ onComplete: finish });
      tl.add(
        backdrop,
        {
          opacity: [1, 0],
          duration: EXIT_BACKDROP_MS,
          ease: easings.expoIn,
        },
        0,
      );
      tl.add(
        panel,
        {
          opacity: [1, 0],
          x: ['0%', EXIT_PANEL_X],
          duration: EXIT_PANEL_MS,
          ease: easings.expoIn,
        },
        0,
      );
    });

    // Deadline backstop. `onComplete` is the intended signal; this is the
    // guarantee the drawer still leaves if that signal never arrives -- a
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
  }, [isOpen, isMounted]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Gate on `isMounted`, not `isOpen`: the subtree has to outlive the `isOpen`
  // flip long enough for the exit above to be seen.
  //
  // `!project` stays a separate, non-lifecycle guard and is deliberately NOT
  // folded into `isMounted`: with an empty `projects` array there is genuinely
  // nothing to show, whereas `isMounted` means only "the drawer is on screen
  // right now". Merging the two would give the mount state a second writer --
  // the very mistake this gate exists to undo -- and would leave `isMounted`
  // true with no node for the exit to animate.
  if (!isMounted || !project) return null;

  const projectSkills = skills.filter((s) => project.tags?.includes(s.name));

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={project.title}
    >
      <div
        ref={backdropRef}
        className="absolute inset-0"
        onClick={onClose}
        style={{
          background: 'var(--overlay-void-75)',
          opacity: isReducedMotion() ? 1 : 0,
        }}
      />
      <div
        ref={panelRef}
        className="absolute top-0 right-0 h-[100dvh] w-full sm:w-[420px] overflow-y-auto border-l"
        style={{
          background: 'var(--bg-2)',
          borderColor: 'var(--border-subtle)',
          opacity: isReducedMotion() || isVisible ? undefined : 0,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <Bracket
            accent="cyan"
            className="absolute inset-2 opacity-60"
            strokeWidth={1}
          />
        </div>
        <div className="relative p-5 space-y-4">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center border after:absolute after:inset-[-6px] after:content-['']"
            style={{
              background: 'var(--bg-3)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--fg-2)',
            }}
            aria-label="Close project details"
          >
            <X size={16} />
          </button>
          {project.thumbnail_url && (
            <div
              className="w-full aspect-video rounded-[var(--radius-lg)] overflow-hidden border"
              style={{
                borderColor: 'var(--border-subtle)',
                background: 'var(--bg-3)',
              }}
            >
              <Image
                src={project.thumbnail_url}
                alt={project.title}
                width={640}
                height={360}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <h3
            className="font-display text-lg leading-snug pr-10"
            style={{ color: 'var(--fg-1)' }}
          >
            {project.title}
          </h3>
          {projectSkills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {projectSkills.map((s) => (
                <span
                  key={s.id}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                  style={{
                    background: 'var(--wash-cyan)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--fg-2)',
                  }}
                >
                  {s.name}
                </span>
              ))}
            </div>
          )}
          <div
            className="text-sm leading-relaxed"
            style={{ color: 'var(--fg-2)' }}
          >
            {project.description_html ? (
              <RichTextRenderer html={project.description_html} />
            ) : (
              project.description
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {(project.languages ?? [])
              .slice(0, 6)
              .map((l: string, i: number) => (
                <span
                  key={i}
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded-full border"
                  style={{
                    background: 'var(--bg-3)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--fg-3)',
                  }}
                >
                  {l}
                </span>
              ))}
          </div>
          <div className="flex gap-4">
            {project.project_url && (
              <a
                href={project.project_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 min-h-[44px] min-w-[44px] text-xs hover:underline"
                style={{ color: 'var(--neon-amber)' }}
              >
                <ExternalLink size={12} /> Live Demo
              </a>
            )}
            {project.repo_url && (
              <a
                href={project.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 min-h-[44px] min-w-[44px] text-xs hover:underline"
                style={{ color: 'var(--neon-amber)' }}
              >
                <Code size={12} /> Repository
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
