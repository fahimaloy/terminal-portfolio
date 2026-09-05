// src/components/home/HeroChat.tsx — hero entrance + chat stream wrapper extracted from Homepage
import React, { useRef, useEffect, useState } from 'react';
import { createTimeline, createScope, animate, spring, stagger } from 'animejs';
import { isReducedMotion } from '../../config/animations';
import {
  PortfolioProfile,
  PortfolioProject,
  PortfolioSkill,
  PortfolioExperience,
} from '../../utils/api';
import HeroSection from './HeroSection';
import ChatStream from './ChatStream';

type Message = {
  role: 'user' | 'model';
  text: string;
  responseType?: string;
  responseData?: unknown;
};

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
  onOpenChat: () => void;
};

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
  onOpenChat,
}: Props) {
  const heroRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);

  const projectCount = useCounter(projects.length, 1500, 800);
  const skillCount = useCounter(skills.length, 1500, 1000);
  const expCount = useCounter(experiences.length, 1500, 1200);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isDataLoading || !heroRef.current || isReducedMotion()) return;
    const root = heroRef.current;
    const scope = createScope({ root });
    scopeRef.current = scope;
    scope.add(() => {
      const tl = createTimeline({ defaults: { ease: 'outExpo' } });
      const label = root.querySelector('[data-hero="label"]');
      if (label)
        tl.add(label, { opacity: [0, 1], y: [8, 0], duration: 400 }, 0);
      const name = root.querySelector('[data-hero="name"]');
      if (name)
        tl.add(
          name,
          {
            opacity: [0, 1],
            y: [20, 0],
            scale: [0.95, 1],
            ...spring({ stiffness: 100, damping: 12 }),
          },
          200,
        );
      const title = root.querySelector('[data-hero="title"]');
      if (title)
        tl.add(title, { opacity: [0, 1], y: [10, 0], duration: 400 }, 600);
      const bio = root.querySelector('[data-hero="bio"]');
      if (bio) tl.add(bio, { opacity: [0, 1], y: [10, 0], duration: 400 }, 800);
      const stats = root.querySelector('[data-hero="stats"]');
      if (stats)
        tl.add(stats, { opacity: [0, 1], y: [10, 0], duration: 400 }, 900);
      const btns = root.querySelectorAll('[data-hero="cta"]');
      if (btns.length)
        tl.add(
          btns,
          { opacity: [0, 1], y: [12, 0], duration: 350, delay: stagger(80) },
          1000,
        );
      const cards = root.querySelectorAll('[data-hero="card"]');
      if (cards.length)
        tl.add(
          cards,
          {
            opacity: [0, 1],
            y: [24, 0],
            scale: [0.92, 1],
            delay: stagger(60, { from: 'first' }),
            ...spring({ stiffness: 150, damping: 14 }),
          },
          1200,
        );
    });
    return () => scope.revert();
  }, [isDataLoading]);

  if (isInitial && isDataLoading) {
    return (
      <div className="flex flex-col items-center w-full space-y-4">
        <div className="h-4 w-32 bg-white/5 animate-pulse rounded" />
        <div className="h-12 w-64 bg-white/5 animate-pulse rounded" />
        <div className="h-6 w-48 bg-white/5 animate-pulse rounded" />
        <div className="h-4 w-80 bg-white/5 animate-pulse rounded mt-2" />
        <div className="flex gap-8 mt-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center space-y-2">
              <div className="h-8 w-12 bg-white/5 animate-pulse rounded" />
              <div className="h-2 w-12 bg-white/5 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isInitial && !isDataLoading) {
    return (
      <HeroSection
        ref={heroRef}
        profile={profile}
        projects={projects}
        skills={skills}
        experiences={experiences}
        siteTexts={siteTexts}
        projectCount={projectCount}
        skillCount={skillCount}
        expCount={expCount}
        onSend={onSend}
        onOpenChat={onOpenChat}
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
    />
  );
}
