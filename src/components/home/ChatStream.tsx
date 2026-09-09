import React, { useRef, useEffect } from 'react';
import { createScope, animate, stagger } from 'animejs';
import ChatMessage from '../ChatMessage';
import { HudPanel } from '../ui';
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

  useEffect(() => {
    if (messages.length > 0)
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }),
        100,
      );
  }, [messages]);

  // Message entrance — y+opacity stagger gated by reduced-motion.
  useEffect(() => {
    const root = listRef.current;
    if (!root || messages.length === 0) return;
    if (typeof window === 'undefined') return;
    if (isReducedMotion() || !canAnimate()) {
      const items = root.querySelectorAll<HTMLElement>('[data-chat-msg]');
      items.forEach((el) => {
        el.style.opacity = '1';
      });
      return;
    }
    const scope = createScope({ root });
    scopeRef.current = scope;
    scope.add(() => {
      const items = root.querySelectorAll<HTMLElement>('[data-chat-msg]');
      if (!items.length) return;
      (animate as any)(items, {
        y: [12, 0],
        opacity: [0, 1],
        duration: durations.enter * 1000 * 0.52,
        ease: (easings.expoOut as unknown as string) ?? 'outExpo',
        delay: stagger(34, { from: 'first' }),
      });
    });
    return () => {
      scope.revert();
      scopeRef.current = null;
    };
  }, [messages.length]);

  return (
    <div
      className="w-full flex-1 overflow-y-auto mb-4 pr-2"
      role="log"
      aria-live="polite"
    >
      <div ref={listRef} className="flex flex-col gap-4 py-4">
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
              <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse-dot" />
              <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse-dot [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse-dot [animation-delay:0.4s]" />
            </HudPanel>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
