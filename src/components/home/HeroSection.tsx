// src/components/home/HeroSection.tsx
// Hero: label, name, title, bio, stats, CTA buttons, quick-access cards.
import React, { forwardRef, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import {
  Briefcase,
  Code,
  Clock,
  Mail,
  GitBranch,
  Link as LinkIcon,
} from 'lucide-react';
import { createScope, createTimeline, stagger } from 'animejs';
import config from '../../../config.json';
import type {
  PortfolioProfile,
  PortfolioSkill,
  PortfolioProject,
  PortfolioExperience,
} from '../../utils/api';
import { durations, easings } from '../../config/animations';

type HeroSectionProps = {
  profile: PortfolioProfile | null;
  projects: PortfolioProject[];
  skills: PortfolioSkill[];
  experiences: PortfolioExperience[];
  siteTexts: Record<string, string>;
  projectCount: number;
  skillCount: number;
  expCount: number;
  onSend: (text: string) => void;
  onOpenChat: () => void;
};

const QUICK_CARDS = [
  {
    label: 'MY GITHUB',
    icon: <GitBranch size={20} />,
    message: 'Show me your GitHub',
  },
  {
    label: 'MY LINKEDIN',
    icon: <LinkIcon size={20} />,
    message: 'Show me your LinkedIn',
  },
  {
    label: 'EMAIL ME',
    icon: <Mail size={20} />,
    message: 'How can I contact you?',
  },
  {
    label: 'MY PROJECTS',
    icon: <Briefcase size={20} />,
    message: 'Show me your projects',
  },
  {
    label: 'MY SKILLSETS',
    icon: <Code size={20} />,
    message: 'Show me your skills',
  },
  {
    label: 'MY EXPERIENCE',
    icon: <Clock size={20} />,
    message: 'Show me your experience',
  },
];

const HeroSection = forwardRef<HTMLDivElement, HeroSectionProps>(
  (
    {
      profile,
      projects,
      skills,
      experiences,
      siteTexts,
      projectCount,
      skillCount,
      expCount,
      onSend,
      onOpenChat,
    },
    ref,
  ) => {
    const router = useRouter();
    const innerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const root = innerRef.current;
      if (!root) return;
      const scope = createScope({
        root,
        mediaQueries: { reduceMotion: '(prefers-reduced-motion: reduce)' },
        defaults: {
          duration: durations[700] ? durations[700] * 1000 : 700,
          ease: easings.outExpo ?? 'outExpo',
          composition: 'blend',
        },
      } as Parameters<typeof createScope>[0]);

      scope.add(() => {
        const label = root.querySelectorAll('[data-hero="label"]');
        const name = root.querySelectorAll('[data-hero="name"]');
        const title = root.querySelectorAll('[data-hero="title"]');
        const bio = root.querySelectorAll('[data-hero="bio"]');
        const stats = root.querySelectorAll('[data-hero="stats"] > div');
        const ctas = root.querySelectorAll('[data-hero="cta"]');
        const cards = root.querySelectorAll('[data-hero="card"]');
        const tl = createTimeline({ defaults: { ease: 'outExpo' } });
        if (label.length) tl.add(label, { y: [16, 0], opacity: [0, 1] }, 0);
        if (name.length)
          tl.add(name, { y: [16, 0], opacity: [0, 1] }, stagger(70));
        if (title.length)
          tl.add(title, { y: [16, 0], opacity: [0, 1] }, stagger(70));
        if (bio.length)
          tl.add(bio, { y: [12, 0], opacity: [0, 1] }, stagger(70));
        if (stats.length)
          tl.add(
            stats,
            { y: [14, 0], opacity: [0, 1], duration: 600 },
            stagger(60, { from: 'first' }),
          );
        if (ctas.length)
          tl.add(
            ctas,
            { y: [12, 0], opacity: [0, 1] },
            stagger(60, { from: 'first' }),
          );
        if (cards.length)
          tl.add(
            cards,
            { y: [16, 0], opacity: [0, 1], scale: [0.98, 1] },
            stagger(60, { from: 'first' }),
          );
      });

      return () => scope.revert();
    }, []);

    const setRefs = (el: HTMLDivElement | null) => {
      (innerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref)
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
    };

    return (
      <div
        ref={setRefs}
        className="flex flex-col items-center w-full"
        id="hero"
      >
        {/* Label */}
        <div
          data-hero="label"
          className="hero-label text-[10px] font-mono tracking-[0.32em] opacity-0"
          style={{ color: 'var(--fg-4)' }}
        >
          {'// ' + (siteTexts.developer_profile_label || 'DEVELOPER PROFILE')}
        </div>

        {/* Name — plain editorial, no glitch */}
        <div data-hero="name" className="hero-name opacity-0 mt-1">
          <h1
            className="text-4xl md:text-6xl font-display font-semibold tracking-[-0.02em] leading-none"
            style={{ color: 'var(--fg-1)' }}
          >
            {profile?.full_name?.toUpperCase() || 'FAHIM AHMED'}
          </h1>
        </div>

        {/* Title */}
        <div
          data-hero="title"
          className="hero-title font-body text-sm md:text-base tracking-[0.18em] mt-3 opacity-0"
          style={{ color: 'var(--fg-3)' }}
        >
          FULL-STACK{' '}
          <span
            className="font-display tracking-[0.14em]"
            style={{ color: 'var(--fg-3)' }}
          >
            DEVELOPER
          </span>
        </div>

        {/* Bio */}
        {profile?.bio && (
          <div
            data-hero="bio"
            className="hero-bio text-xs md:text-sm font-body text-center mt-5 max-w-lg leading-relaxed opacity-0"
            style={{ color: 'var(--fg-3)' }}
          >
            {profile.bio}
          </div>
        )}

        {/* Stats row */}
        <div data-hero="stats" className="hero-stats flex gap-8 mt-6">
          <div className="text-center opacity-0">
            <div
              className="text-2xl font-display font-medium"
              style={{ color: 'var(--fg-1)' }}
            >
              {projectCount}+
            </div>
            <div
              className="text-[9px] font-mono tracking-[0.2em]"
              style={{ color: 'var(--fg-4)' }}
            >
              PROJECTS
            </div>
          </div>
          <div className="text-center opacity-0">
            <div
              className="text-2xl font-display font-medium"
              style={{ color: 'var(--fg-1)' }}
            >
              {skillCount}+
            </div>
            <div
              className="text-[9px] font-mono tracking-[0.2em]"
              style={{ color: 'var(--fg-4)' }}
            >
              SKILLS
            </div>
          </div>
          <div className="text-center opacity-0">
            <div
              className="text-2xl font-display font-medium"
              style={{ color: 'var(--fg-1)' }}
            >
              {expCount}+
            </div>
            <div
              className="text-[9px] font-mono tracking-[0.2em]"
              style={{ color: 'var(--fg-4)' }}
            >
              EXPERIENCE
            </div>
          </div>
        </div>

        {/* CTA Buttons — editorial flat */}
        <div className="flex flex-wrap gap-3 mt-7 justify-center">
          <button
            data-hero="cta"
            onClick={onOpenChat}
            className="hero-btn opacity-0 inline-flex items-center justify-center px-5 py-2.5 font-mono text-[11px] tracking-[0.16em] border rounded-[var(--radius-md)] transition-colors duration-200"
            style={{
              background: 'var(--fg-1)',
              color: 'var(--bg-1)',
              borderColor: 'var(--fg-1)',
            }}
          >
            START CHAT
          </button>
          <button
            data-hero="cta"
            onClick={() =>
              window.open('https://github.com/fahimaloy', '_blank')
            }
            className="hero-btn opacity-0 inline-flex items-center justify-center px-5 py-2.5 font-mono text-[11px] tracking-[0.16em] border rounded-[var(--radius-md)] transition-colors duration-200"
            style={{
              background: 'transparent',
              color: 'var(--fg-1)',
              borderColor: 'var(--border-strong)',
            }}
          >
            VIEW CODE
          </button>
          <button
            data-hero="cta"
            onClick={() => router.push('/blog')}
            className="hero-btn opacity-0 inline-flex items-center justify-center px-5 py-2.5 font-mono text-[11px] tracking-[0.16em] border rounded-[var(--radius-md)] transition-colors duration-200"
            style={{
              background: 'transparent',
              color: 'var(--fg-2)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            READ BLOG
          </button>
        </div>

        {/* Quick access cards */}
        <div className="mt-12 w-full" id="quick-commands">
          <div
            className="text-[9px] font-mono tracking-[0.28em] text-center mb-3"
            style={{ color: 'var(--fg-4)' }}
          >
            {'// ' + (siteTexts.quick_commands_label || 'QUICK COMMANDS')}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {QUICK_CARDS.map((card) => (
              <button
                key={card.label}
                data-hero="card"
                onClick={() => onSend(card.message)}
                className="quick-card text-left p-4 cursor-pointer border rounded-[var(--radius-lg)] transition-colors duration-200 opacity-0"
                style={{
                  background: 'var(--bg-2)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--fg-1)',
                }}
              >
                <div className="text-center">
                  <div
                    className="flex justify-center mb-2"
                    style={{ color: 'var(--fg-3)' }}
                  >
                    {card.icon}
                  </div>
                  <div
                    className="font-mono text-[10px] tracking-[0.18em]"
                    style={{ color: 'var(--fg-2)' }}
                  >
                    {card.label}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  },
);

HeroSection.displayName = 'HeroSection';
export default HeroSection;
