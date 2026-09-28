import React, { useRef, useEffect } from 'react';
import { animate, stagger } from 'animejs';
import { useMotionScope } from '../../hooks/useMotionScope';
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

type Message = {
  role: 'user' | 'model';
  text: string;
  responseType?: string;
  responseData?: unknown;
};

type Props = {
  messages: Message[];
  projects: PortfolioProject[];
  skills: PortfolioSkill[];
  experiences: PortfolioExperience[];
  isLoading: boolean;
};

export default function ChatStream({
  messages,
  projects,
  skills,
  experiences,
  isLoading,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef(0);
  const { run, revert } = useMotionScope(listRef);

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
        {messages.map((msg, idx) => (
          <div
            key={idx}
            data-chat-msg
            // Only the newest message is a live region. Announcing the whole
            // log re-reads the entire conversation on every append.
            aria-live={idx === messages.length - 1 ? 'polite' : 'off'}
          >
            <ChatMessage
              role={msg.role}
              text={msg.text}
              projects={projects}
              skills={skills}
              experiences={experiences}
              responseType={msg.responseType}
              responseData={msg.responseData}
            />
          </div>
        ))}
        {isLoading && (
          <div className="flex w-full justify-start" data-chat-msg>
            <HudPanel
              accent="cyan"
              notch="sm"
              className="px-4 py-3 flex items-center gap-2"
            >
              <ScopeRings accent="cyan" size={20} />
              <span
                className="font-mono text-[10px] tracking-[0.18em]"
                style={{ color: 'var(--fg-3)' }}
              >
                THINKING
              </span>
            </HudPanel>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
