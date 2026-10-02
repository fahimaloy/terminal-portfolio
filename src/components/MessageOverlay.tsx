// src/components/MessageOverlay.tsx
/* ═══════════════════════════════════════════════════════════════════════════════
   MESSAGE OVERLAY — Anime.js v4 animations
   Spring entrance for quick suggestion chips, animated typing dots.
══════════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { FiSend, FiX, FiSliders } from 'react-icons/fi';
import * as LucideIcons from 'lucide-react';
import { createScope, createTimeline, animate, stagger } from 'animejs';
import AdvancedFeaturesBar, { FeatureMode } from './AdvancedFeaturesBar';
import ContactForm from './ContactForm';
import MeetingForm from './MeetingForm';
import ProjectMatchForm from './ProjectMatchForm';
import SkillFilterPanel from './SkillFilterPanel';
import { PortfolioProject, PortfolioSkill } from '../utils/api';
import {
  HudPanel,
  NeonButton,
  Ripple,
  TypeaheadSuggestions,
  useTypeaheadSuggestions,
} from './ui';
import {
  durations,
  easings,
  isReducedMotion,
  canAnimate,
} from '../config/animations';
import { useEnhancedTypeaheadSuggestions } from '../hooks/useEnhancedSuggestions';

type SuggestionShape = {
  label: string;
  icon?: React.ReactNode;
  match?: string[];
};

const QUICK_SUGGESTIONS: SuggestionShape[] = [
  {
    label: 'Show me your projects',
    icon: <LucideIcons.Briefcase size={18} />,
    match: ['projects', 'work'],
  },
  {
    label: 'What are your skills?',
    icon: <LucideIcons.Code size={18} />,
    match: ['skills', 'tech'],
  },
  {
    label: 'Which frameworks do you use?',
    icon: <LucideIcons.Layers size={18} />,
    match: ['frameworks', 'tools'],
  },
  {
    label: 'Tell me about yourself',
    icon: <LucideIcons.User size={18} />,
    match: ['about', 'bio'],
  },
  {
    label: 'Show your experience',
    icon: <LucideIcons.Clock size={18} />,
    match: ['experience', 'work'],
  },
  {
    label: 'How can I contact you?',
    icon: <LucideIcons.Mail size={18} />,
    match: ['contact', 'email'],
  },
];

/* ── EXIT TIMING ──────────────────────────────────────────────────────────────
   The enter treatment above is two different cadences: a 200ms (--dur-200)
   backdrop fade and a 350ms (--dur-transition) expoOut slide up from y:60.

   The exit is that pair played backwards and compressed to 80% of the enter,
   so a close reads as the mirror of the open rather than as a second, slower
   idea. 80% is the compression factor, not a magic number: it lands the panel
   at 280ms, which is the longest a visitor will accept waiting for a sheet to
   disappear without reading it as lag, while still being long enough to be seen
   at all. A modal that leaves in one frame reads as a glitch; a modal that
   takes the full 350ms to leave reads as unresponsive.

   Only the panel governs the unmount. It is the content the visitor was
   reading, it is the slower of the two, and unmounting on its completion is
   what makes the backdrop disappear "slightly before" the panel for free —
   no ordering to get wrong. */
const EXIT_PANEL_MS = durations.transition * 1000 * 0.8; // 280ms
const EXIT_BACKDROP_MS = durations[200] * 1000 * 0.8; // 160ms
/** Mirrors the enter's `y: [60, 0]` — the panel leaves downward, from where it came. */
const EXIT_PANEL_OFFSET_PX = 60;

type MessageOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: (text: string, skillFilter?: number[]) => void;
  isLoading: boolean;
  suggestions?: SuggestionShape[];
  onSuggestionClick?: (label: string) => void;
  projects: PortfolioProject[];
  skills?: PortfolioSkill[];
  conversationHistory?: string[];
  useEnhancedSuggestions?: boolean;
};

function TypingDots() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || isReducedMotion()) return;
    const dots = containerRef.current.querySelectorAll('.typing-dot');
    if (!dots.length) return;
    animate(dots, {
      scale: [1, 1.4, 1],
      opacity: [0.4, 1, 0.4],
      // Token-backed rather than the raw 800/200ms literals this used to
      // carry. The bounce is now a touch tighter, which reads more like a
      // cursor than a loading spinner.
      duration: durations.transition * 1000,
      loop: true,
      ease: easings.sineInOut as unknown as string,
      delay: stagger(durations.stagger * 1000 * 3),
    });
  }, []);

  return (
    <div ref={containerRef} className="flex items-center gap-1 px-3 py-2">
      <div className="typing-dot w-2 h-2 rounded-full bg-neon-cyan opacity-60" />
      <div className="typing-dot w-2 h-2 rounded-full bg-neon-cyan opacity-60" />
      <div className="typing-dot w-2 h-2 rounded-full bg-neon-cyan opacity-60" />
    </div>
  );
}

export default function MessageOverlay({
  isOpen,
  onClose,
  inputValue,
  onInputChange,
  onSend,
  isLoading,
  suggestions,
  onSuggestionClick,
  projects,
  skills = [],
  conversationHistory = [],
  useEnhancedSuggestions = false,
}: MessageOverlayProps) {
  const [mode, setMode] = useState<FeatureMode>('chat');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [skillFilter, setSkillFilter] = useState<number[]>([]);
  const [showSkillFilter, setShowSkillFilter] = useState(false);
  const chipsRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);
  const [hasTypedSinceOpen, setHasTypedSinceOpen] = useState(false);

  /* `isMounted`, NOT `isOpen`, is the render gate.
     `return null` on `isOpen === false` removed the whole subtree on the same
     commit that flipped the prop, so any animation started in an effect
     afterwards was animating a detached node — nothing on screen ever saw it.
     The subtree now stays mounted until the exit has actually finished.

     It is initialised from `isOpen` and only ever set to `false` by a completed
     exit (or skipped outright under reduced motion), so the two are equal in
     the steady state and differ only for the 280ms the overlay is leaving. */
  const [isMounted, setIsMounted] = useState(isOpen);
  /* Bumped on every open and every exit start. An exit's completion callback
     may only unmount while its own token is still the current one, so a
     completion that arrives after the overlay was re-opened is inert instead of
     yanking a live overlay out of the DOM. */
  const exitTokenRef = useRef(0);

  const enhancedSuggestions = useEnhancedTypeaheadSuggestions(
    inputValue,
    8,
    conversationHistory || [],
  );

  const basicSuggestionPool = useMemo(() => {
    return (suggestions ?? []).map((s, i) => ({
      id: `s-${i}`,
      label: s.label,
      hint: s.icon ? undefined : undefined,
      payload: s,
    }));
  }, [suggestions]);

  const suggestionPool = useEnhancedSuggestions
    ? enhancedSuggestions
    : basicSuggestionPool;

  const filtered = useTypeaheadSuggestions(inputValue, suggestionPool, 8);

  // Hardened quick-commands visibility (spec):
  // - On open/focus with empty input -> section is empty (no cards mounted)
  // - After user types "/" or any text and then erases to length 0 -> cards reappear
  const isEmptyRaw = inputValue.length === 0;
  const showQuickCommands = hasTypedSinceOpen && isEmptyRaw;

  const prevOpenRef = useRef(isOpen);
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    if (!wasOpen && isOpen) setHasTypedSinceOpen(false);
    prevOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (inputValue.length > 0 && !hasTypedSinceOpen) setHasTypedSinceOpen(true);
  }, [inputValue, hasTypedSinceOpen]);

  // Entrance animation for backdrop + panel
  //
  // `isMounted` is in the dependency list on purpose. When the overlay is opened
  // from a closed state this effect runs first with `isMounted === false` (the
  // subtree is not in the DOM yet, so there is nothing to animate); the effect
  // below then sets it and this one re-runs on the commit that actually created
  // `backdropRef` / `panelRef`. Without that dependency the first open of a
  // session would mount silently.
  useEffect(() => {
    if (!isOpen || !isMounted) return;
    if (isReducedMotion()) return;
    if (backdropRef.current) {
      animate(backdropRef.current, {
        opacity: [0, 1],
        duration: durations[200] * 1000,
        ease: easings.expoOut as unknown as string,
      });
    }
    if (panelRef.current) {
      animate(panelRef.current, {
        y: [60, 0],
        opacity: [0, 1],
        duration: durations.transition * 1000,
        ease: easings.expoOut as unknown as string,
      });
    }
  }, [isOpen, isMounted]);

  // Exit animation, and the owner of the mount gate above.
  //
  // Both directions live in one effect on purpose: the subtree's lifecycle has
  // exactly one writer, which is what makes the rapid-toggle case fall out of
  // the cleanup instead of needing a separate "did we come back?" flag.
  //
  //   open  -> guarantee the subtree exists, so the effect above has refs.
  //   close -> animate out, then drop the subtree once the panel is invisible.
  //
  // RAPID RE-OPEN. React runs this effect's cleanup before the next pass, so
  // re-opening mid-exit reverts the in-flight timeline — which restores the
  // pre-exit inline styles and, crucially, cancels the timer without firing
  // `onComplete` — and clears the deadline. `exitTokenRef` is the belt to those
  // braces: the open branch bumps it, so even a completion callback that somehow
  // survived cancellation resolves to a stale token and does nothing. A toggle
  // storm therefore leaves the overlay visible and correctly re-animated, never
  // stuck at `opacity: 0`.
  useEffect(() => {
    if (isOpen) {
      // Invalidate any exit still in flight before re-showing the overlay.
      exitTokenRef.current += 1;
      setIsMounted(true);
      return;
    }
    // Already fully unmounted — the previous exit finished and this is just the
    // effect re-running after `setIsMounted(false)`. Animating again here would
    // restart the exit forever.
    if (!isMounted) return;

    const panel = panelRef.current;
    const backdrop = backdropRef.current;

    // No refs (nothing rendered) or the visitor asked for less motion: there is
    // no exit to watch, so leave on this tick rather than after 280ms of nothing.
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
      defaults: {
        duration: EXIT_PANEL_MS,
        ease: easings.expoIn,
      },
    } as Parameters<typeof createScope>[0]);

    scope.add(() => {
      // Live re-check: `mediaQueries.reduceMotion` is read from the actual
      // MediaQueryList on each `scope.execute()`, so a visitor who switches
      // reduced motion on while the overlay is open is not held through the
      // 280ms they just opted out of.
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
          y: [0, EXIT_PANEL_OFFSET_PX],
          duration: EXIT_PANEL_MS,
          ease: easings.expoIn,
        },
        0,
      );
    });

    // Deadline backstop. `onComplete` is the intended signal; this is the
    // guarantee that the overlay still leaves if that signal never arrives — a
    // throttled rAF in a backgrounded tab, an engine that skips the final
    // callback, a throw inside a tick. It is deliberately generous (2x the exit)
    // so it never wins the race on the happy path, and the cleanup below owns it.
    const timer = setTimeout(finish, EXIT_PANEL_MS * 2);

    return () => {
      clearTimeout(timer);
      try {
        scope.revert();
      } catch {}
    };
  }, [isOpen, isMounted]);

  // Stagger entrance for quick suggestion chips — 30-40ms, expoOut, reduced-motion fallback
  // Also clean up previous scope whenever visibility toggles off
  useEffect(() => {
    if (!showQuickCommands) {
      scopeRef.current?.revert();
      scopeRef.current = null;
      return;
    }
    if (!chipsRef.current) return;
    if (isReducedMotion() || !canAnimate()) {
      const chips =
        chipsRef.current.querySelectorAll<HTMLElement>('.suggestion-chip');
      chips.forEach((c) => {
        c.style.opacity = '1';
      });
      return;
    }

    const scope = createScope({ root: chipsRef.current });
    scopeRef.current = scope;

    scope.add(() => {
      const chips = chipsRef.current!.querySelectorAll('.suggestion-chip');
      if (!chips.length) return;
      (animate as any)(chips, {
        opacity: [0, 1],
        y: [12, 0],
        scale: [0.96, 1],
        duration: durations.enter * 1000 * 0.5,
        ease: (easings.expoOut as unknown as string) ?? 'outExpo',
        delay: stagger(durations.stagger * 1000, { from: 'first' }),
        composition: 'blend',
      });
    });

    return () => scope.revert();
  }, [showQuickCommands]);

  useEffect(() => {
    if (isOpen && mode === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mode === 'chat') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, mode]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Gate on `isMounted`, not `isOpen`: the subtree has to outlive the `isOpen`
  // flip long enough for the exit above to be seen. `isOpen === false` while
  // `isMounted === true` is the 280ms the overlay is on its way out.
  if (!isMounted) return null;

  const handleSend = () => {
    if (inputValue.trim() && !isLoading) {
      onSend(inputValue, skillFilter.length > 0 ? skillFilter : undefined);
      setSkillFilter([]);
      setHasTypedSinceOpen(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleBackToChat = () => {
    setMode('chat');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleQuickSuggestion = (label: string) => {
    onSend(label, skillFilter.length > 0 ? skillFilter : undefined);
    setSkillFilter([]);
    setHasTypedSinceOpen(false);
  };

  return (
    <>
      <div
        ref={backdropRef}
        onClick={onClose}
        className="fixed inset-0 z-40 backdrop-blur-md reveal"
        style={{ background: 'var(--surface-overlay)' }}
      />
      <div
        ref={panelRef}
        className="fixed left-0 right-0 bottom-0 z-50 flex flex-col reveal"
        style={{ maxHeight: '85vh' }}
      >
        <div
          className="w-full max-w-3xl mx-auto px-4 flex flex-col"
          // This sheet is `fixed bottom-0`, so it sat under the iOS home
          // indicator — the composer row was the thing a thumb reaches for, and
          // the home indicator is exactly where the thumb rests. `pb-6` alone
          // is not enough on a notched device; the safe-area inset has to be
          // the floor.
          style={{
            maxHeight: '85vh',
            paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
          }}
        >
          <div className="flex justify-end mb-2">
            <NeonButton
              variant="ghost"
              accent="coral"
              onClick={onClose}
              iconLeft={<FiX />}
            >
              CLOSE
            </NeonButton>
          </div>

          {mode === 'contact' && (
            <ContactForm onBackToChat={handleBackToChat} />
          )}
          {mode === 'meeting' && (
            <MeetingForm onBackToChat={handleBackToChat} />
          )}
          {mode === 'project_match' && (
            <ProjectMatchForm
              onBackToChat={handleBackToChat}
              projects={projects}
            />
          )}

          {mode === 'chat' && (
            <Ripple color="var(--glow-amber-sm)">
              <HudPanel
                accent="amber"
                className="overflow-hidden accent-hairline"
              >
                <AdvancedFeaturesBar activeMode={mode} onModeChange={setMode} />

                {showQuickCommands && (
                  <div className="p-3 border-t border-[var(--border-subtle)]">
                    <div className="text-[9px] font-display tracking-[2px] text-text-muted mb-2">
                      {'// QUICK COMMANDS'}
                    </div>
                    <div
                      ref={chipsRef}
                      className="grid grid-cols-2 md:grid-cols-3 gap-2"
                    >
                      {QUICK_SUGGESTIONS.map((s, i) => {
                        const accents = ['cyan', 'coral', 'amber'] as const;
                        const accent = accents[i % accents.length];
                        return (
                          <button
                            key={s.label}
                            onClick={() => handleQuickSuggestion(s.label)}
                            onMouseEnter={(e) => {
                              if (isReducedMotion() || !canAnimate()) return;
                              (animate as any)(e.currentTarget, {
                                scale: 1.02,
                                duration: durations.hover * 1000,
                                ease:
                                  (easings.smooth as unknown as string) ??
                                  'linear',
                                composition: 'blend',
                              });
                            }}
                            onMouseLeave={(e) => {
                              if (isReducedMotion() || !canAnimate()) return;
                              (animate as any)(e.currentTarget, {
                                scale: 1,
                                duration: durations.hover * 1000,
                                ease:
                                  (easings.smooth as unknown as string) ??
                                  'linear',
                                composition: 'blend',
                              });
                            }}
                            className="suggestion-chip p-2.5 rounded-lg bg-[var(--overlay-card-bg)] border border-[var(--overlay-card-border)] hover:bg-neon-cyan/10 hover:border-neon-cyan/30 transition-colors text-left reveal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)]"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-neon-cyan">{s.icon}</span>
                              <span className="text-[10px] font-display tracking-wider text-text-primary leading-tight">
                                {s.label
                                  .split(' ')
                                  .slice(0, 3)
                                  .join(' ')
                                  .toUpperCase()}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {suggestions &&
                  suggestions.length > 0 &&
                  inputValue.length > 0 && (
                    <div className="px-4 py-2 border-t border-[var(--border-subtle)]">
                      <TypeaheadSuggestions
                        query={inputValue}
                        suggestions={filtered}
                        onSelect={(s) =>
                          onSuggestionClick?.(
                            (s.payload as SuggestionShape)?.label ?? s.label,
                          )
                        }
                        open
                      />
                    </div>
                  )}

                {showSkillFilter && skills.length > 0 && (
                  <SkillFilterPanel
                    skills={skills}
                    selectedIds={skillFilter}
                    onChange={setSkillFilter}
                  />
                )}

                {skillFilter.length > 0 && (
                  <div className="px-4 py-2 border-t border-[var(--border-subtle)] flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] text-text-muted">
                      FILTERED BY:
                    </span>
                    {skillFilter.map((id) => {
                      const skill = skills.find((s) => s.id === id);
                      if (!skill) return null;
                      return (
                        <span
                          key={id}
                          className="relative inline-flex items-center gap-1 px-2 py-0.5 min-h-[44px] min-w-[44px] bg-neon-cyan/10 border border-neon-cyan/20 rounded-lg text-[10px] text-neon-cyan"
                        >
                          {skill.name}
                          <button
                            onClick={() =>
                              setSkillFilter((prev) =>
                                prev.filter((i) => i !== id),
                              )
                            }
                            type="button"
                            aria-label={`Remove ${skill.name} filter`}
                            className="grid place-items-center w-4 h-4 hover:text-neon-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-coral)] rounded-sm after:absolute after:inset-[-14px] after:content-['']"
                          >
                            <FiX size={10} aria-hidden="true" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-end p-3 border-t border-[var(--border-subtle)]">
                  {skills.length > 0 && (
                    <button
                      onClick={() => setShowSkillFilter(!showSkillFilter)}
                      className={`grid place-items-center w-11 h-11 rounded-lg mr-2 transition-all ${
                        showSkillFilter
                          ? 'bg-neon-cyan/20 text-neon-cyan'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                      title="Filter by skills"
                    >
                      <FiSliders size={16} />
                    </button>
                  )}
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Ask about my development projects, skills, or experience..."
                    maxLength={2000}
                    rows={2}
                    className="flex-1 min-h-[44px] min-w-[44px] bg-transparent border-none text-text-primary px-2 py-2 focus:outline-none placeholder-text-muted text-sm font-body resize-none focus:shadow-[0_0_12px_var(--glow-amber)] transition-all duration-200"
                    disabled={isLoading}
                  />
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-[10px] font-mono text-text-muted">
                      {inputValue.length}/2000
                    </span>
                    <NeonButton
                      accent="amber"
                      iconRight={isLoading ? undefined : <FiSend />}
                      loading={isLoading}
                      onClick={handleSend}
                      disabled={!inputValue.trim()}
                    >
                      SEND
                    </NeonButton>
                  </div>
                </div>

                {isLoading && (
                  <div className="px-4 py-2 border-t border-[var(--border-subtle)]">
                    <HudPanel
                      accent="cyan"
                      className="inline-flex items-center gap-2"
                    >
                      <span className="text-[9px] font-mono text-text-muted mr-2">
                        PROCESSING:
                      </span>
                      <TypingDots />
                    </HudPanel>
                  </div>
                )}
              </HudPanel>
            </Ripple>
          )}
        </div>
      </div>
    </>
  );
}
