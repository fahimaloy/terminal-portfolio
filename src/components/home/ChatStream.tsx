import React, { useRef, useEffect } from 'react';
import { createScope, animate, stagger } from 'animejs';
import ChatMessage from '../ChatMessage';
import { HudPanel } from '../ui';
import GridLattice from '../ui/graphics/primitives/GridLattice';
import ScopeRings from '../ui/graphics/primitives/ScopeRings';
import {
  PortfolioProject,
  PortfolioSkill,
  PortfolioExperience,
} from '../../utils/api';
import {
  durations,
  easings,
  isReducedMotion,
  canAnimate,
} from '../../config/animations';

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
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);
  const prevRef = useRef(0);

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

  // Message entrance — y+opacity stagger gated by reduced-motion.
  useEffect(() => {
    // Revert any prior scope before early returns so rapid toggles / empty
    // states don't leak a live anime scope.
    scopeRef.current?.revert();
    scopeRef.current = null;
    const root = listRef.current;
    if (!root || messages.length === 0) {
      prevRef.current = messages.length;
      return;
    }
    if (typeof window === 'undefined') {
      prevRef.current = messages.length;
      return;
    }
    if (isReducedMotion() || !canAnimate()) {
      const nodes = root.querySelectorAll<HTMLElement>('[data-chat-msg]');
      nodes.forEach((el) => {
        el.style.opacity = '1';
      });
      prevRef.current = messages.length;
      return;
    }
    const scope = createScope({ root });
    scopeRef.current = scope;
    const prevLen = prevRef.current;
    const delta = messages.length - prevLen;
    scope.add(() => {
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
    return () => {
      scope.revert();
      if (scopeRef.current === scope) scopeRef.current = null;
    };
  }, [messages.length]);

  return (
    <div
      className="relative w-full flex-1 overflow-y-auto mb-4 pr-2"
      role="log"
      aria-live="polite"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <GridLattice opacity={0.04} color="var(--grid-1)" />
      </div>
      <div ref={listRef} className="relative flex flex-col gap-4 py-4">
        {messages.map((msg, idx) => (
          <div key={idx} data-chat-msg>
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
