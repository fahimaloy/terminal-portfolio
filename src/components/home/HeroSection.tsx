// src/components/home/HeroSection.tsx
// Hero: eyebrow, name, title, bio, stats, quick-access cards.
//
// This component is the SOLE owner of hero choreography. HeroChat used to run a
// second timeline over the same `data-hero="*"` nodes, and both the Tailwind
// `opacity-0` class and anime.js were writing opacity — under
// `reactStrictMode: true` the double-invoke left the quick cards at computed
// opacity 0. Rules that follow from that:
//   1. Exactly one scope writes a given element.
//   2. No `opacity-*` class on anything the scope animates — initial state is
//      set in JS so `scope.revert()` restores the *animated* value, not the class.
//   3. Cleanup order is scope first, then splitText — otherwise revert() runs
//      against a DOM the splitter has already rebuilt.
//   4. The name is solid colour. The split word wrapper must be taller than the
//      glyph box or `overflow: clip` crops descenders (the "cyan blob" bug).

import React, { forwardRef, useEffect, useRef } from 'react';
import {
  animate,
  createTimeline,
  createDrawable,
  stagger,
  spring,
  splitText,
  type TextSplitter,
} from 'animejs';
import {
  Briefcase,
  Code,
  Clock,
  Mail,
  GitBranch,
  Link as LinkIcon,
} from 'lucide-react';
import { resolveName } from '../../config/identity';
import type { PortfolioProfile } from '../../utils/api';
import {
  durations,
  easings,
  springs,
  isReducedMotion,
  canAnimate,
} from '../../config/animations';
import { useMotionScope } from '../../hooks/useMotionScope';
import { HairlineDivider } from '../ui/graphics';
import GridLattice from '../ui/graphics/primitives/GridLattice';

type HeroSectionProps = {
  profile: PortfolioProfile | null;
  siteTexts: Record<string, string>;
  projectCount: number;
  skillCount: number;
  expCount: number;
  onSend: (text: string) => void;
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

// Shared by the name and its sweep overlay so both lay out identically.
const NAME_TYPE =
  'font-display font-bold uppercase tracking-[-0.045em] leading-[1.02] ' +
  'text-[clamp(2.5rem,8vw,7rem)]';

const HeroSection = forwardRef<HTMLDivElement, HeroSectionProps>(
  ({ profile, siteTexts, projectCount, skillCount, expCount, onSend }, ref) => {
    const innerRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<Record<string, HTMLElement>>({});
    const name = resolveName(profile);

    // `respectReduced: false` on purpose: this component already builds a
    // zero-duration version of the same timeline when motion is reduced, so
    // handing it a null scope would duplicate that branch. The hook still
    // guarantees one scope and a clean StrictMode double-invoke.
    const { run, revert, hoverRef } = useMotionScope(innerRef, {
      respectReduced: false,
      mediaQueries: { reduceMotion: '(prefers-reduced-motion: reduce)' },
      defaults: { ease: easings.outExpo ?? 'outExpo' },
    });

    useEffect(() => {
      const root = innerRef.current;
      if (!root) return;

      const reduced = isReducedMotion();
      const ms = (seconds: number) => seconds * 1000;
      let nameSplitter: TextSplitter | null = null;

      run((scope) => {
        if (!scope) return;
        const label = root.querySelectorAll<HTMLElement>('[data-hero="label"]');
        const nameWrap = root.querySelector<HTMLElement>('[data-hero="name"]');
        const nameEl = nameWrap?.querySelector<HTMLElement>('h1') ?? null;
        const sweep = root.querySelector<HTMLElement>('[data-hero="sweep"]');
        const titleEl = root.querySelector<HTMLElement>('[data-hero="title"]');
        const bio = root.querySelectorAll<HTMLElement>('[data-hero="bio"]');
        const stats = root.querySelectorAll<HTMLElement>(
          '[data-hero="stats"] > div',
        );
        const cards = root.querySelectorAll<HTMLElement>('[data-hero="card"]');
        const hairlineWrap = root.querySelector<HTMLElement>('.hero-hairline');

        // Initial state lives here, not in a CSS class, so scope.revert() can
        // never strand an element at opacity 0.
        const hidden: HTMLElement[] = [
          nameWrap,
          titleEl,
          ...label,
          ...bio,
          ...stats,
          ...cards,
        ].filter((el): el is HTMLElement => Boolean(el));
        hidden.forEach((el) => {
          el.style.opacity = '0';
        });

        const tl = createTimeline({ defaults: { ease: 'outExpo' } });

        if (reduced) {
          // Same choreography, zero duration. Every add needs its own
          // `duration: 1` — anime's default is ~1000ms, so omitting it made
          // the reduced-motion path play a full second of tweens.
          const instant = { duration: 1 };
          if (label.length)
            tl.add(label, { y: [12, 0], opacity: [0, 1], ...instant }, 0);
          if (nameWrap)
            tl.add(
              nameWrap,
              { y: [12, 0], opacity: [0, 1], ...instant },
              stagger(60),
            );
          if (titleEl)
            tl.add(
              titleEl,
              { y: [12, 0], opacity: [0, 1], ...instant },
              stagger(60),
            );
          if (bio.length)
            tl.add(
              bio,
              { y: [10, 0], opacity: [0, 1], ...instant },
              stagger(60),
            );
          if (stats.length)
            tl.add(
              stats,
              { y: [10, 0], opacity: [0, 1], ...instant },
              stagger(40, { from: 'first' }),
            );
          if (cards.length)
            tl.add(
              cards,
              {
                y: [10, 0],
                opacity: [0, 1],
                scale: [0.99, 1],
                ...instant,
              },
              stagger(40, { from: 'first' }),
            );
          return;
        }

        const softSpring = spring(
          springs.soft as unknown as Record<string, number>,
        ) as unknown as string;

        // Hairline draw under the lockup.
        if (hairlineWrap) {
          const draw = createDrawable(hairlineWrap);
          if ((draw as unknown as HTMLElement[]).length) {
            tl.add(
              draw as unknown as HTMLElement[],
              {
                draw: ['0 0', '0 1'],
                duration: ms(durations.draw),
                ease: easings.smooth,
              },
              0,
            );
          }
          tl.add(
            hairlineWrap,
            { opacity: [0, 1], duration: ms(durations.enter) * 0.4 },
            0,
          );
        }

        if (label.length) tl.add(label, { y: [12, 0], opacity: [0, 1] }, 120);

        // Name — word-level clip cascade. Chars only fade: a per-char clip box
        // sized to the line box is what cropped the glyphs.
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

        const nameWords =
          (nameSplitter?.words as unknown as HTMLElement[]) ?? [];
        const nameChars =
          (nameSplitter?.chars as unknown as HTMLElement[]) ?? [];

        // The wrapper starts hidden, so it must always be faded back in —
        // animating only the split words left the parent at opacity 0.
        if (nameWrap) {
          tl.add(
            nameWrap,
            { opacity: [0, 1], duration: ms(durations.enter) * 0.35 },
            200,
          );
        }

        if (nameWords.length) {
          // The clip wrapper hugs the line box; give it descender headroom.
          nameWords.forEach((w) => {
            w.style.paddingBottom = '0.14em';
          });
          tl.add(
            nameWords,
            {
              y: ['0.7em', '0em'],
              duration: ms(durations.enter) * 0.72,
              ease: easings.expoOut,
              delay: stagger(70),
            },
            220,
          );
        } else if (nameWrap) {
          tl.add(nameWrap, { y: [18, 0], duration: ms(durations.enter) }, 220);
        }
        if (nameChars.length) {
          tl.add(
            nameChars,
            { opacity: [0, 1], duration: ms(durations.enter) * 0.5 },
            260,
          );
        }

        // Specular sweep — one shot, then never again. The name stays a solid
        // colour; only this overlay is a gradient, and it is transient.
        if (sweep) {
          tl.add(
            sweep,
            {
              opacity: [0, 1],
              backgroundPositionX: ['150%', '-150%'],
              duration: 1100,
              ease: easings.smooth,
            },
            900,
          );
          tl.add(sweep, { opacity: 0, duration: 1 }, 2010);
        }

        if (titleEl)
          tl.add(
            titleEl,
            {
              y: [10, 0],
              opacity: [0, 1],
              duration: ms(durations.enter) * 0.5,
            },
            620,
          );
        if (bio.length)
          tl.add(
            bio,
            {
              y: [10, 0],
              opacity: [0, 1],
              duration: ms(durations.enter) * 0.45,
            },
            820,
          );
        if (stats.length)
          tl.add(
            stats,
            {
              y: [14, 0],
              opacity: [0, 1],
              duration: 600,
              ease: softSpring,
              delay: stagger(60, { from: 'first' }),
            },
            920,
          );
        if (cards.length)
          tl.add(
            cards,
            {
              y: [16, 0],
              opacity: [0, 1],
              scale: [0.98, 1],
              duration: 560,
              ease: softSpring,
              delay: stagger(60, { from: 'first' }),
            },
            1180,
          );
      });

      return () => {
        // Order matters: restore animated properties first, then let the
        // splitter put the original text nodes back.
        revert();
        try {
          nameSplitter?.revert();
        } catch {
          /* splitter already reverted */
        }
        nameSplitter = null;
      };
    }, [run, revert]);

    // Hover rides the component's own scope so it is cancelled on unmount and
    // never races the intro timeline on the same properties.
    const hover = (el: HTMLElement | undefined, scale: number, y: number) => {
      if (!el) return;
      hoverRef.current?.revert();
      hoverRef.current = animate(el, {
        scale,
        y,
        duration: durations.hover * 1000,
        ease: easings.smooth,
      });
    };

    const setRefs = (el: HTMLDivElement | null) => {
      innerRef.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    };

    return (
      <div
        ref={setRefs}
        className="flex flex-col items-center w-full"
        id="hero"
      >
        <HairlineDivider className="hero-hairline w-24 mx-auto mb-3" />

        {/* Eyebrow */}
        <div
          data-hero="label"
          className="font-mono text-[10px] tracking-[0.34em] mb-3 text-center"
          style={{ color: 'var(--fg-3)' }}
        >
          {'// ' + (siteTexts.developer_label || 'DEVELOPER PROFILE')}
        </div>

        {/* Name — solid colour, single restrained glow */}
        <div data-hero="name" className="hero-name relative">
          <h1
            className={`hero-name-el ${NAME_TYPE}`}
            style={{
              color: 'var(--fg-1)',
              textShadow:
                '0 0 56px var(--glow-cyan-zone), 0 0 18px var(--glow-cyan-faint)',
            }}
          >
            {name}
          </h1>
          <span
            data-hero="sweep"
            aria-hidden="true"
            className={`hero-name-sweep absolute inset-0 ${NAME_TYPE}`}
            style={{
              color: 'transparent',
              opacity: 0,
              backgroundImage:
                'linear-gradient(100deg, transparent 38%, var(--glow-cyan-30) 50%, transparent 62%)',
              backgroundSize: '220% 100%',
              backgroundPositionX: '150%',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              pointerEvents: 'none',
            }}
          >
            {name}
          </span>
        </div>

        {/* Title */}
        <div
          data-hero="title"
          className="hero-title font-body text-sm md:text-base tracking-[0.18em] mt-4 text-center"
          style={{ color: 'var(--fg-2)' }}
        >
          FULL-STACK{' '}
          <span className="font-display tracking-[0.14em]">DEVELOPER</span>
        </div>

        {/* Bio */}
        {profile?.bio && (
          <div
            data-hero="bio"
            className="hero-bio text-[15px] font-body text-center mt-5 max-w-lg leading-relaxed"
            style={{ color: 'var(--fg-2)' }}
          >
            {profile.bio}
          </div>
        )}

        {/* Stats */}
        <div
          data-hero="stats"
          className="hero-stats flex gap-4 md:gap-8 mt-7 relative"
        >
          <GridLattice
            opacity={0.05}
            color="var(--grid-1)"
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
          />
          {[
            { value: projectCount, label: 'PROJECTS' },
            { value: skillCount, label: 'SKILLS' },
            { value: expCount, label: 'EXPERIENCE' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div
                className="text-2xl md:text-3xl font-display font-bold tabular-nums"
                style={{ color: 'var(--fg-1)' }}
              >
                {s.value}
                <span style={{ color: 'var(--neon-cyan)' }}>+</span>
              </div>
              <div
                className="text-[9px] font-mono tracking-[0.2em] mt-1"
                style={{ color: 'var(--fg-3)' }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Quick access cards */}
        <div className="mt-8 w-full" id="quick-commands">
          <div
            className="text-[10px] font-mono tracking-[0.28em] text-center mb-3"
            style={{ color: 'var(--fg-3)' }}
          >
            {'// ' + (siteTexts.quick_commands_label || 'QUICK COMMANDS')}
          </div>
          <div
            data-hero="rail"
            className="grid grid-cols-2 md:grid-cols-3 gap-2.5 max-w-2xl mx-auto"
          >
            {QUICK_CARDS.map((card) => (
              <button
                key={card.label}
                data-hero="card"
                type="button"
                onClick={() => onSend(card.message)}
                onMouseEnter={() => {
                  if (isReducedMotion() || !canAnimate()) return;
                  hover(cardRefs.current[card.label], 1.03, -2);
                }}
                onMouseLeave={() => {
                  if (isReducedMotion() || !canAnimate()) return;
                  hover(cardRefs.current[card.label], 1, 0);
                }}
                aria-label={card.label.replace('MY ', '').toLowerCase()}
                ref={(el) => {
                  if (el) cardRefs.current[card.label] = el;
                }}
                className="text-left p-4 cursor-pointer border rounded-[var(--radius-lg)] transition-colors duration-300 hover:border-[var(--glow-cyan-30)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-1)]"
                style={{
                  background: 'var(--card-bg)',
                  backdropFilter: 'var(--glass-blur-md)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--fg-1)',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <div className="flex items-center gap-3">
                  <span style={{ color: 'var(--neon-cyan)' }}>{card.icon}</span>
                  <span
                    className="font-mono text-[10px] tracking-[0.16em]"
                    style={{ color: 'var(--fg-2)' }}
                  >
                    {card.label}
                  </span>
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
