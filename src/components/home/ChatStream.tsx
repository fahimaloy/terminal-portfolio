import React, { useRef, useEffect } from 'react';
import ChatMessage from '../ChatMessage';
import { HudPanel } from '../ui';
import {
  PortfolioProject,
  PortfolioSkill,
  PortfolioExperience,
} from '../../utils/api';

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
  useEffect(() => {
    if (messages.length > 0)
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }),
        100,
      );
  }, [messages]);
  return (
    <div
      className="w-full flex-1 overflow-y-auto mb-4 pr-2"
      role="log"
      aria-live="polite"
    >
      <div className="flex flex-col gap-4 py-4">
        {messages.map((msg, idx) => (
          <ChatMessage
            key={idx}
            role={msg.role}
            text={msg.text}
            projects={projects}
            skills={skills}
            experiences={experiences}
            responseType={msg.responseType}
            responseData={msg.responseData}
          />
        ))}
        {isLoading && (
          <div className="flex w-full justify-start">
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
