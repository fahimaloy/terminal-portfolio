// src/components/home/HeroChat.tsx
//
// Chooses between the two mutually exclusive homepage states: the hero
// (no messages yet) and the chat stream. It also owns the animated counters.
//
// This component deliberately owns NO hero choreography. It used to run a
// second timeline over the same `data-hero="*"` nodes that HeroSection animates;
// under StrictMode's double-invoke the two scopes raced and left the quick
// cards at computed opacity 0. Motion belongs to exactly one owner.

import { useRef, useState, useEffect } from 'react';
import { animate } from 'animejs';
import { isReducedMotion } from '../../config/animations';
import type {
  PortfolioProfile,
  PortfolioProject,
  PortfolioSkill,
  PortfolioExperience,
} from '../../utils/api';
import HeroSection from './HeroSection';
import ChatStream from './ChatStream';
import type { Message } from '../../types/chat';

type Props = {
  profile: PortfolioProfile | null;
  projects: PortfolioProject[];
  skills: PortfolioSkill[];
  experiences: PortfolioExperience[];
  siteTexts: Record<string, string>;
  messages: Message[];
  isLoading: boolean;
  isDataLoading: boolean;
  isInitial: boolean;
  onSend: (text: string, skillFilter?: number[]) => void;
  onRetry?: () => void;
};

/** Counts from 0 to `target`, or jumps straight there under reduced motion. */
function useCounter(target: number, duration = 2000, delay = 0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isReducedMotion()) {
      setValue(target);
      return;
    }
    const timer = setTimeout(() => {
      const obj = { val: 0 };
      animate(obj, {
        val: [0, target],
        duration,
        ease: 'outExpo',
        onUpdate: () => setValue(Math.round(obj.val)),
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [target, duration, delay]);
  return value;
}

export default function HeroChat({
  profile,
  projects,
  skills,
  experiences,
  siteTexts,
  messages,
  isLoading,
  isDataLoading,
  isInitial,
  onSend,
  onRetry,
}: Props) {
  const heroRef = useRef<HTMLDivElement>(null);

  const projectCount = useCounter(projects.length, 1500, 800);
  const skillCount = useCounter(skills.length, 1500, 1000);
  const expCount = useCounter(experiences.length, 1500, 1200);

  if (isInitial && isDataLoading) {
    return (
      <div
        className="flex flex-col items-center w-full space-y-4"
        aria-busy="true"
        aria-label="Loading profile"
      >
        <div className="h-3 w-40 bg-[var(--overlay-white-05)] animate-pulse rounded" />
        <div className="h-16 w-72 bg-[var(--overlay-white-05)] animate-pulse rounded" />
        <div className="h-4 w-56 bg-[var(--overlay-white-05)] animate-pulse rounded" />
        <div className="h-4 w-80 bg-[var(--overlay-white-05)] animate-pulse rounded" />
        <div className="flex gap-8 mt-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center space-y-2">
              <div className="h-8 w-12 bg-[var(--overlay-white-05)] animate-pulse rounded" />
              <div className="h-2 w-12 bg-[var(--overlay-white-05)] animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isInitial) {
    return (
      <HeroSection
        ref={heroRef}
        profile={profile}
        siteTexts={siteTexts}
        projectCount={projectCount}
        skillCount={skillCount}
        expCount={expCount}
        onSend={onSend}
      />
    );
  }

  return (
    <ChatStream
      messages={messages}
      projects={projects}
      skills={skills}
      experiences={experiences}
      isLoading={isLoading}
      onRetry={onRetry}
    />
  );
}
