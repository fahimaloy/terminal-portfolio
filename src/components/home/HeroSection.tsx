// src/components/home/HeroSection.tsx
// Hero: label, name, title, bio, stats, CTA buttons, quick-access cards.
import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Briefcase,
  Code,
  Clock,
  Mail,
  GitBranch,
  Link as LinkIcon,
  MousePointer,
  Keyboard,
} from 'lucide-react';
import {
  animate,
  createScope,
  createTimeline,
  stagger,
  createDrawable,
  onScroll,
  spring,
} from 'animejs';
import { splitText } from 'animejs';
import config from '../../../config.json';
import type {
  PortfolioProfile,
  PortfolioSkill,
  PortfolioProject,
  PortfolioExperience,
} from '../../utils/api';
import {
  durations,
  easings,
  springs,
  isReducedMotion,
  canAnimate,
} from '../../config/animations';
import { HairlineDivider } from '../ui/graphics';
import GridLattice from '../ui/graphics/primitives/GridLattice';

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
    shortcut: 'G',
  },
  {
    label: 'MY LINKEDIN',
    icon: <LinkIcon size={20} />,
    message: 'Show me your LinkedIn',
    shortcut: 'L',
  },
  {
    label: 'EMAIL ME',
    icon: <Mail size={20} />,
    message: 'How can I contact you?',
    shortcut: 'E',
  },
  {
    label: 'MY PROJECTS',
    icon: <Briefcase size={20} />,
    message: 'Show me your projects',
    shortcut: 'P',
  },
  {
    label: 'MY SKILLSETS',
    icon: <Code size={20} />,
    message: 'Show me your skills',
    shortcut: 'S',
  },
  {
    label: 'MY EXPERIENCE',
    icon: <Clock size={20} />,
    message: 'Show me your experience',
    shortcut: 'X',
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
    const cardRefs = useRef<Record<string, HTMLElement>>({});
    const [reduced, setReduced] = useState(false);

    // Check reduced motion preference
    useEffect(() => {
      setReduced(isReducedMotion());
    }, []);

    useEffect(() => {
      const root = innerRef.current;
      if (!root) return;

      const reduced = isReducedMotion();

      const scope = createScope({
        root,
        mediaQueries: { reduceMotion: '(prefers-reduced-motion: reduce)' },
        defaults: {
          duration: durations[700] ? durations[700] * 1000 : 700,
          ease: easings.outExpo ?? 'outExpo',
          composition: 'blend',
        },
      } as Parameters<typeof createScope>[0]);

      let nameSplitter: ReturnType<typeof splitText> | null = null;
      let titleSplitter: ReturnType<typeof splitText> | null = null;

      scope.add(() => {
        const label = root.querySelectorAll<HTMLElement>('[data-hero="label"]');
        const nameWrap =
          root.querySelectorAll<HTMLElement>('[data-hero="name"]');
        const titleWrap = root.querySelectorAll<HTMLElement>(
          '[data-hero="title"]',
        );
        const nameEl = root.querySelector<HTMLElement>('[data-hero="name"] h1');
        const titleEl = root.querySelector<HTMLElement>('[data-hero="title"]');
        const bio = root.querySelectorAll<HTMLElement>('[data-hero="bio"]');
        const stats = root.querySelectorAll<HTMLElement>(
          '[data-hero="stats"] > div',
        );
        const ctas = root.querySelectorAll<HTMLElement>('[data-hero="cta"]');
        const cards = root.querySelectorAll<HTMLElement>('[data-hero="card"]');

        const hairlineLines = root.querySelectorAll<SVGGeometryElement>(
          '.hero-hairline line',
        );
        const hairlineDrawable =
          !reduced && hairlineLines.length > 0
            ? createDrawable('.hero-hairline line')
            : [];

        // Split name/title chars with clip wrap when motion is allowed.
        if (!reduced) {
          try {
            if (nameEl) {
              nameSplitter = splitText(nameEl, {
                chars: true,
                words: { wrap: 'clip' },
              });
            }
          } catch {
            nameSplitter = null;
          }
          try {
            if (titleEl) {
              titleSplitter = splitText(titleEl, {
                chars: true,
                words: { wrap: 'clip' },
              });
            }
          } catch {
            titleSplitter = null;
          }
        }

        const nameChars =
          (nameSplitter?.chars as unknown as HTMLElement[]) ?? [];
        const titleChars =
          (titleSplitter?.chars as unknown as HTMLElement[]) ?? [];

        const tl = createTimeline({ defaults: { ease: 'outExpo' } });

        if (reduced) {
          if (label.length) tl.add(label, { y: [16, 0], opacity: [0, 1] }, 0);
          if (nameWrap.length)
            tl.add(nameWrap, { y: [16, 0], opacity: [0, 1] }, stagger(70));
          if (titleWrap.length)
            tl.add(titleWrap, { y: [16, 0], opacity: [0, 1] }, stagger(70));
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
          return;
        }

        const softSpring = spring(
          springs.soft as unknown as Record<string, number>,
        ) as unknown as string;

        // Label
        if (label.length) tl.add(label, { y: [16, 0], opacity: [0, 1] }, 0);

        // Hairline drawable under label/name — line-draw ['0 0','0 1']
        if ((hairlineDrawable as unknown as HTMLElement[]).length) {
          tl.add(
            hairlineDrawable as unknown as HTMLElement[],
            {
              draw: ['0 0', '0 1'],
              duration: durations.draw * 1000,
              ease: easings.smooth ?? 'linear',
            },
            stagger(40, { from: 'first' }),
          );
          // Also fade the container wrapper
          const hairlineWraps =
            root.querySelectorAll<HTMLElement>('.hero-hairline');
          if (hairlineWraps.length) {
            tl.add(
              hairlineWraps,
              {
                opacity: [0, 1],
                duration: durations.enter * 1000 * 0.35,
                ease: easings.smooth,
              },
              '-200',
            );
          }
        }

        // Name chars — clip cascade stagger 16-22 from first
        if (nameChars.length) {
          tl.add(
            nameChars,
            {
              y: ['112%', '0%'],
              opacity: [0, 1],
              duration: durations.enter * 1000 * 0.52,
              ease: easings.expoOut ?? 'outExpo',
              delay: stagger(18, { from: 'first' }),
            },
            stagger(70),
          );
        } else if (nameWrap.length) {
          tl.add(nameWrap, { y: [16, 0], opacity: [0, 1] }, stagger(70));
        }

        // Title chars — stagger from center
        if (titleChars.length) {
          tl.add(
            titleChars,
            {
              y: ['112%', '0%'],
              opacity: [0, 1],
              duration: durations.enter * 1000 * 0.46,
              ease: easings.expoOut ?? 'outExpo',
              delay: stagger(20, { from: 'center' }),
            },
            stagger(70),
          );
        } else if (titleWrap.length) {
          tl.add(titleWrap, { y: [16, 0], opacity: [0, 1] }, stagger(70));
        }

        // Bio with soft spring
        if (bio.length)
          tl.add(
            bio,
            {
              y: [12, 0],
              opacity: [0, 1],
              duration: 560,
              ease: softSpring ?? easings.smooth,
            },
            stagger(70),
          );

        // Stats staggered spring
        if (stats.length)
          tl.add(
            stats,
            {
              y: [14, 0],
              opacity: [0, 1],
              duration: 600,
              ease: softSpring ?? easings.smooth,
              delay: stagger(22, { from: 'first' }),
            },
            stagger(60, { from: 'first' }),
          );

        // CTAs with spring
        if (ctas.length)
          tl.add(
            ctas,
            {
              y: [12, 0],
              opacity: [0, 1],
              duration: 520,
              ease: softSpring ?? easings.smooth,
              delay: stagger(18, { from: 'first' }),
            },
            stagger(60, { from: 'first' }),
          );

        // Cards — stagger spring; draggable is optional and gated by canAnimate()
        // Keep stagger spring for cards; horizontal drag via createDraggable is skipped
        // here to avoid scroll-jank and to keep token-lint/typecheck green — re-enable
        // by targeting [data-hero="rail"] with createDraggable gated by canAnimate().
        if (cards.length) {
          tl.add(
            cards,
            {
              y: [16, 0],
              opacity: [0, 1],
              scale: [0.98, 1],
              duration: 560,
              ease: softSpring ?? easings.smooth,
              delay: stagger(22, { from: 'first' }),
            },
            stagger(60, { from: 'first' }),
          );
        }

        // Reference canAnimate to guard any future draggable wiring without dead-code lint.
        // Scroll-driven stats reveal (premium anime.js v4 pattern with onScroll)
        if (!reduced && stats.length && typeof onScroll === 'function') {
          const statsContainer = root.querySelector('[data-hero="stats"]');
          if (statsContainer) {
            scope.add('scroll-stats', (scopeRef: any) => {
              const statEls = root.querySelectorAll(
                '[data-hero="stats"] > div',
              );
              statEls.forEach((el, i) => {
                animate(el as HTMLElement, {
                  opacity: [0, 1],
                  y: [20, 0],
                  duration: 550,
                  ease: 'outExpo',
                  delay: i * 80,
                  autoplay: onScroll({
                    container: window,
                    sync: false,
                  }),
                });
              });
            });
          }
        }
        void canAnimate;
      });

      return () => {
        try {
          nameSplitter?.revert();
        } catch {}
        try {
          titleSplitter?.revert();
        } catch {}
        scope.revert();
      };
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
        {/* Hairline divider drawable under label/name */}
        <HairlineDivider className="hero-hairline w-24 mx-auto mt-2 opacity-0" />
        {/* Name — premium gradient display typography */}
        <div data-hero="name" className="hero-name opacity-0 mt-2">
          <h1
            className="text-6xl md:text-8xl lg:text-9xl font-display font-bold tracking-[-0.05em] leading-[0.82]"
            style={{
              background: 'var(--gradient-hero-name)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter:
                'drop-shadow(0 0 25px var(--glow-text-cyan)) drop-shadow(0 2px 30px var(--glow-text-magenta))',
            }}
          >
            {profile?.full_name?.toUpperCase() ||
              config.name?.toUpperCase() ||
              'FAHIM AHMED'}
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
            className="hero-bio text-[15px] font-body text-center mt-5 max-w-lg leading-relaxed opacity-0"
            style={{ color: 'var(--fg-2)' }}
          >
            {profile.bio}
          </div>
        )}

        {/* Stats row */}
        <div data-hero="stats" className="hero-stats flex gap-8 mt-6 relative">
          <GridLattice
            opacity={0.03}
            color="var(--grid-1)"
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
          />
          <div className="text-center opacity-0">
            <div
              className="text-2xl font-display font-bold"
              style={{
                color: 'var(--fg-1)',
                background: 'var(--overlay-card-bg)',
                backdropFilter: 'blur(12px)',
                padding: '8px 16px',
                boxShadow: '0 4px 30px var(--overlay-black-medium)',
                borderRadius: 'var(--radius-sm)',
              }}
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
              style={{
                color: 'var(--fg-1)',
                background: 'var(--overlay-card-bg)',
                backdropFilter: 'blur(12px)',
                border: '1px solid var(--overlay-card-border)',
                padding: '8px 16px',
                boxShadow: '0 4px 30px var(--overlay-black-medium)',
                borderRadius: 'var(--radius-sm)',
              }}
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
              style={{
                color: 'var(--fg-1)',
                background: 'var(--overlay-card-bg)',
                backdropFilter: 'blur(12px)',
                border: '1px solid var(--overlay-card-border)',
                padding: '8px 16px',
                boxShadow: '0 4px 30px var(--overlay-black-medium)',
                borderRadius: 'var(--radius-sm)',
              }}
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

        {/* Quick access cards */}
        <div className="mt-12 w-full" id="quick-commands">
          <div
            className="text-[9px] font-mono tracking-[0.28em] text-center mb-3"
            style={{ color: 'var(--fg-4)' }}
          >
            {'// ' + (siteTexts.quick_commands_label || 'QUICK COMMANDS')}
          </div>
          <div
            data-hero="rail"
            className="grid grid-cols-2 md:grid-cols-3 gap-3"
          >
            {QUICK_CARDS.map((card) => (
              <button
                key={card.label}
                data-hero="card"
                onClick={() => onSend(card.message)}
                onMouseEnter={() => {
                  if (!reduced && canAnimate()) {
                    animate(cardRefs.current[card.label], {
                      scale: 1.02,
                      boxShadow:
                        '0 0 30px var(--glow-cyan-sm), inset 0 1px 0 var(--overlay-card-shadow-inner)',
                      duration: durations.hover * 1000,
                      ease: easings.smooth,
                    });
                  }
                }}
                onMouseLeave={() => {
                  if (!reduced && canAnimate()) {
                    animate(cardRefs.current[card.label], {
                      scale: 1,
                      boxShadow:
                        'inset 0 1px 0 var(--overlay-card-shadow-inner), 0 8px 32px var(--overlay-card-shadow-outer)',
                      duration: durations.hover * 1000,
                      ease: easings.smooth,
                    });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSend(card.message);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`${card.label}, press ${card.shortcut}`}
                ref={(el) => {
                  if (el) cardRefs.current[card.label] = el;
                }}
                className="quick-card text-left p-4 cursor-pointer border rounded-[var(--radius-lg)] transition-all duration-300 hover:shadow-[0_0_25px_var(--glow-cyan-sm)] hover:-translate-y-0.5 opacity-0 hover:border-[var(--glow-cyan-30)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-1)]"
                style={{
                  background: 'var(--overlay-card-bg)',
                  backdropFilter: 'blur(20px) saturate(1.2)',
                  borderColor: 'var(--glow-cyan-zone)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  color: 'var(--fg-1)',
                  boxShadow:
                    'inset 0 1px 0 var(--overlay-card-shadow-inner), 0 8px 32px var(--overlay-card-shadow-outer)',
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
