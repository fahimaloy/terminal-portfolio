// src/components/home/HeroSection.tsx
// Hero: label, name, title, bio, stats, CTA buttons, quick-access cards.
import React, { forwardRef } from 'react';
import { useRouter } from 'next/router';
import { Briefcase, Code, Clock, Mail, GitBranch, Link } from 'lucide-react';
import config from '../../../config.json';
import type {
  PortfolioProfile,
  PortfolioSkill,
  PortfolioProject,
  PortfolioExperience,
} from '../../utils/api';
import { GlitchText, NeonButton, Ripple, Tilt3D, StatBar } from '../ui';

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
    icon: <GitBranch size={22} />,
    accent: 'cyan' as const,
    message: 'Show me your GitHub',
  },
  {
    label: 'MY LINKEDIN',
    icon: <Link size={22} />,
    accent: 'cyan' as const,
    message: 'Show me your LinkedIn',
  },
  {
    label: 'EMAIL ME',
    icon: <Mail size={22} />,
    accent: 'yellow' as const,
    message: 'How can I contact you?',
  },
  {
    label: 'MY PROJECTS',
    icon: <Briefcase size={22} />,
    accent: 'magenta' as const,
    message: 'Show me your projects',
  },
  {
    label: 'MY SKILLSETS',
    icon: <Code size={22} />,
    accent: 'green' as const,
    message: 'Show me your skills',
  },
  {
    label: 'MY EXPERIENCE',
    icon: <Clock size={22} />,
    accent: 'cyan' as const,
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

    return (
      <div ref={ref} className="flex flex-col items-center w-full" id="hero">
        {/* Animated label */}
        <div
          data-hero="label"
          className="hero-label text-[10px] font-display tracking-[6px] text-neon-magenta text-shadow-neon-magenta mb-2 opacity-0"
        >
          {'// ' + (siteTexts.developer_profile_label || 'DEVELOPER PROFILE')}
        </div>

        {/* Name with glitch */}
        <div data-hero="name" className="hero-name opacity-0">
          <GlitchText as="h1" accent="magenta" className="text-4xl md:text-6xl">
            {profile?.full_name?.toUpperCase() || 'FAHIM AHMED'}
          </GlitchText>
        </div>

        {/* Title */}
        <div
          data-hero="title"
          className="hero-title font-body text-text-secondary text-sm md:text-base tracking-widest mt-3 opacity-0"
        >
          FULL-STACK{' '}
          <span className="text-neon-yellow text-shadow-neon-yellow font-display tracking-[2px]">
            DEVELOPER
          </span>
        </div>

        {/* Bio */}
        {profile?.bio && (
          <div
            data-hero="bio"
            className="hero-bio text-text-muted text-xs md:text-sm font-body text-center mt-5 max-w-lg opacity-0"
          >
            {profile.bio}
          </div>
        )}

        {/* Stats row */}
        <div data-hero="stats" className="hero-stats flex gap-8 mt-6 opacity-0">
          <div className="text-center">
            <div className="text-2xl font-display text-neon-cyan text-shadow-neon-cyan">
              {projectCount}+
            </div>
            <div className="text-[9px] font-display tracking-[2px] text-text-muted">
              PROJECTS
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-display text-neon-magenta text-shadow-neon-magenta">
              {skillCount}+
            </div>
            <div className="text-[9px] font-display tracking-[2px] text-text-muted">
              SKILLS
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-display text-neon-yellow text-shadow-neon-yellow">
              {expCount}+
            </div>
            <div className="text-[9px] font-display tracking-[2px] text-text-muted">
              EXPERIENCE
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-3 mt-7">
          <NeonButton
            accent="yellow"
            onClick={onOpenChat}
            data-hero="cta"
            className="hero-btn opacity-0"
          >
            START CHAT
          </NeonButton>
          <NeonButton
            accent="cyan"
            variant="outline"
            onClick={() =>
              window.open('https://github.com/fahimaloy', '_blank')
            }
            data-hero="cta"
            className="hero-btn opacity-0"
          >
            VIEW CODE
          </NeonButton>
          <NeonButton
            accent="magenta"
            variant="outline"
            onClick={() => router.push('/blog')}
            data-hero="cta"
            className="hero-btn opacity-0"
          >
            READ BLOG
          </NeonButton>
        </div>

        {/* Quick access cards */}
        <div className="mt-12 w-full" id="quick-commands">
          <div className="text-[9px] font-display tracking-[3px] text-text-muted text-center mb-3">
            {'// ' + (siteTexts.quick_commands_label || 'QUICK COMMANDS')}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {QUICK_CARDS.map((card) => {
              const accent = card.accent;
              const glowClass = `hud-glow-${accent}`;
              const textShadowClass =
                accent === 'yellow'
                  ? 'text-shadow-neon-yellow'
                  : accent === 'magenta'
                  ? 'text-shadow-neon-magenta'
                  : accent === 'cyan'
                  ? 'text-shadow-neon-cyan'
                  : 'text-shadow-neon-green';
              const iconColor =
                accent === 'yellow'
                  ? 'text-neon-yellow'
                  : accent === 'magenta'
                  ? 'text-neon-magenta'
                  : accent === 'cyan'
                  ? 'text-neon-cyan'
                  : 'text-neon-green';
              return (
                <Tilt3D key={card.label} intensity={3}>
                  <Ripple
                    onClick={() => onSend(card.message)}
                    data-hero="card"
                    className={`quick-card clip-notch-md bg-bg-smoke p-4 cursor-pointer ${glowClass} hover:bg-bg-ash transition-colors duration-200 opacity-0`}
                    color={
                      accent === 'yellow'
                        ? 'var(--glow-yellow-soft)'
                        : accent === 'magenta'
                        ? 'var(--glow-magenta-soft)'
                        : accent === 'cyan'
                        ? 'var(--glow-cyan-soft)'
                        : 'var(--glow-green-soft)'
                    }
                  >
                    <div className="text-center">
                      <div
                        className={`text-2xl mb-2 ${iconColor} ${textShadowClass}`}
                      >
                        {card.icon}
                      </div>
                      <div className="font-display text-[10px] tracking-[2px] text-text-primary">
                        {card.label}
                      </div>
                    </div>
                  </Ripple>
                </Tilt3D>
              );
            })}
          </div>
        </div>
      </div>
    );
  },
);

HeroSection.displayName = 'HeroSection';
export default HeroSection;
