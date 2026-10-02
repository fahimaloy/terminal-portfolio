import React, { useRef, useEffect, useState, useCallback } from 'react';
import { animate, stagger } from 'animejs';
import { useMotionScope } from '../../hooks/useMotionScope';
import { useMotionPreference } from '../../hooks/useMotionPreference';
import ChatMessage from '../ChatMessage';
import { HudPanel } from '../ui';
import GridLattice from '../ui/graphics/primitives/GridLattice';
import ScopeRings from '../ui/graphics/primitives/ScopeRings';
import {
  PortfolioProject,
  PortfolioSkill,
  PortfolioExperience,
} from '../../utils/api';
import { durations, easings } from '../../config/animations';
import type { Message } from '../../types/chat';

type Props = {
  messages: Message[];
  projects: PortfolioProject[];
  skills: PortfolioSkill[];
  experiences: PortfolioExperience[];
  isLoading: boolean;
  onRetry?: () => void;
};

export default function ChatStream({
  messages,
  projects,
  skills,
  experiences,
  isLoading,
  onRetry,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef(0);
  const { run, revert } = useMotionScope(listRef);

  // ── P3.3 · reveal policy ────────────────────────────────────────────────────
  // The typewriter reveal is a *view* concern, not a data one. The whole reply
  // already arrives in one `axios.post` and is appended whole — the reveal is a
  // client-side paint over the string we received, so there is no second request
  // and no transport change.
  //
  // Only ONE message may be mid-reveal at a time, and it must be the newest
  // assistant reply that arrived *during this mount*. A conversation restored
  // from history (or any navigation that remounts with messages already
  // present) must render instantly, never replay.
  //
  // The rule is deliberately SUPERSEDE, not QUEUE: a new send while a previous
  // reveal is mid-flight moves the reveal to the newest message. The older one
  // simply loses `reveal` and therefore renders its full, final text — it is
  // never left stranded half-typed, and the newer message is never dropped. A
  // queue instead would force the reader to wait out an animation for text they
  // have already sent past.
  const { reduced } = useMotionPreference();

  // How many messages were present on the very first render. Anything at or
  // below this index is history and renders flat. A cleared conversation
  // (messages.length === 0) resets it, so a fresh chat can still reveal.
  const historyCountRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length === 0) historyCountRef.current = 0;
  }, [messages.length]);

  // Which message is being revealed, and whether that reveal has finished.
  // `revealIndex` is null when nothing is animating; `settled` is what a11y
  // reads — false means "mid-reveal, do not announce this yet".
  const [revealIndex, setRevealIndex] = useState<number | null>(null);
  const [settled, setSettled] = useState(true);

  // Arm the reveal for a newly-arrived assistant reply. Guarded so it only ever
  // fires for messages appended after mount, never for restored history.
  useEffect(() => {
    const last = messages.length - 1;
    if (last < historyCountRef.current) return;
    const msg = messages[last];
    if (!msg || msg.role !== 'model' || msg.isError) return;
    if (reduced) return; // see the reduced-motion note below
    // Supersede: the previous reveal (if any) loses `reveal` in this same
    // render pass, so it flips to its full final text rather than being frozen
    // half-typed. Nothing is stranded and nothing is dropped.
    setRevealIndex(last);
    setSettled(false);
  }, [messages, reduced]);

  // Reduced motion: no reveal is armed, so the message paints its full text on
  // the first frame and must be announced immediately — there is no partial
  // text to withhold and no callback that will ever arrive.
  useEffect(() => {
    if (reduced) {
      setRevealIndex(null);
      setSettled(true);
    }
  }, [reduced]);

  const markRevealDone = useCallback(() => {
    setSettled(true);
  }, []);

  // Autoscroll only when the newest message is >120px below the viewport
  // bottom, so reading history is never yanked away mid-scroll.
  useEffect(() => {
    if (messages.length === 0) return;
    const t = setTimeout(() => {
      const el = bottomRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const distance = rect.top - window.innerHeight;
      if (distance > 120) {
        el.scrollIntoView({ block: 'end', behavior: 'smooth' });
      } else if (distance > 0) {
        el.scrollIntoView({ block: 'end' });
      }
    }, 100);
    return () => clearTimeout(t);
  }, [messages]);

  // Message entrance — y+opacity stagger, with reduced motion collapsing to a
  // plain reveal. `run` owns the scope lifecycle: it reverts the previous one
  // first, so rapid toggles and empty states can never leak a live scope.
  useEffect(() => {
    const root = listRef.current;
    if (!root || messages.length === 0) {
      revert();
      prevRef.current = messages.length;
      return;
    }
    const prevLen = prevRef.current;
    const delta = messages.length - prevLen;
    const revealAll = () =>
      root.querySelectorAll<HTMLElement>('[data-chat-msg]').forEach((el) => {
        el.style.opacity = '1';
      });

    run((scope) => {
      if (!scope) {
        revealAll();
        return;
      }
      if (delta > 1) {
        const all = root.querySelectorAll<HTMLElement>('[data-chat-msg]');
        const newNodes =
          prevLen > 0 ? Array.from(all).slice(prevLen) : Array.from(all);
        const targets = newNodes.length > 0 ? newNodes : Array.from(all);
        if (targets.length === 0) return;
        (animate as any)(targets, {
          y: [12, 0],
          opacity: [0, 1],
          duration: durations.enter * 1000 * 0.52,
          ease: (easings.expoOut as unknown as string) ?? 'outExpo',
          delay: stagger(durations.stagger * 1000, { from: 'first' }),
        });
      } else {
        const last = root.querySelector<HTMLElement>(
          '[data-chat-msg]:last-child',
        );
        if (!last) return;
        (animate as any)(last, {
          y: [12, 0],
          opacity: [0, 1],
          duration: durations.enter * 1000 * 0.52,
          ease: (easings.expoOut as unknown as string) ?? 'outExpo',
        });
      }
    });
    prevRef.current = messages.length;
  }, [messages.length, run, revert]);

  return (
    <div
      className="relative w-full flex-1 min-h-0 mb-4 pr-2"
      role="log"
      aria-busy={isLoading}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <GridLattice opacity={0.04} color="var(--grid-1)" />
      </div>
      <div ref={listRef} className="relative flex flex-col gap-4 py-4">
        {messages.map((msg, idx) => {
          const revealing = revealIndex === idx;
          const isNewest = idx === messages.length - 1;
          return (
            <div
              key={idx}
              data-chat-msg
              // Only the newest message is a live region. Announcing the whole
              // log re-reads the entire conversation on every append.
              aria-live={
                isNewest && !(revealing && !settled) ? 'polite' : 'off'
              }
              // P3.3: while the reveal is in flight the region is busy, so AT
              // withholds the announcement instead of reading out a partial
              // sentence as if it were the final answer. It opens the moment
              // the message reports done.
              aria-busy={revealing && !settled}
            >
              <ChatMessage
                role={msg.role}
                text={msg.text}
                projects={projects}
                skills={skills}
                experiences={experiences}
                responseType={msg.responseType}
                responseData={msg.responseData}
                ts={msg.ts}
                isError={msg.isError}
                onRetry={onRetry}
                // P3.3: only the armed message reveals. Everything else —
                // history, the user's own turn, an error card, and any message
                // that a newer send has superseded — renders flat.
                reveal={revealing}
                onRevealDone={markRevealDone}
              />
            </div>
          );
        })}
        {isLoading && (
          <div className="flex w-full justify-start" data-chat-msg>
            <HudPanel
              accent="cyan"
              className="px-4 py-3 flex items-center gap-3 accent-hairline"
              // `enter={false}` — this panel is mounted INSIDE the
              // `[data-chat-msg]` wrapper at :219, so it is already inside the
              // `y:[12,0], opacity:[0,1]` animation this component drives over
              // `[data-chat-msg]` (see :132-165). Its own fade would compound
              // with the one the wrapper is already running.
              enter={false}
            >
              <ScopeRings accent="cyan" size={20} />
              <div className="flex items-baseline gap-2 min-w-0">
                <span
                  className="font-mono text-[10px] tracking-[0.2em] uppercase leading-none"
                  style={{ color: 'var(--neon-cyan)' }}
                >
                  Thinking
                </span>
                {/* A blinking caret, so the row reads as an in-progress stream
                    rather than a finished label. Decorative — the word
                    "thinking" already carries the state for assistive tech. */}
                <span
                  aria-hidden="true"
                  className="w-px h-3 shrink-0 animate-pulse"
                  style={{ background: 'var(--neon-cyan)' }}
                />
              </div>
            </HudPanel>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
