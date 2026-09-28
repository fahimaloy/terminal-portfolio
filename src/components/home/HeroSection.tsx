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
//
// ── Boot-gate contract (added P3.2) ─────────────────────────────────────────
// The entrance used to start at absolute position 0 of a mount effect with
// nothing gating it, while the splash covered the screen until ~4.7s. The
// visitor never watched the reveal: they were shown a finished, static hero.
//
// The gate is a window event rather than lifted state or context. That is the
// repo's existing idiom for crossing this boundary — `Homepage.tsx` dispatches
// `portfolio:chat-send` / `portfolio:chat-mode` and `_app.tsx` owns the
// listener — and it is the only contract that survives the tree's real shape:
// the hero is four levels below the shell, `Homepage.tsx` and `HeroChat.tsx`
// are not ours to thread props through, and the hero can mount *after* the
// splash has gone (it waits on a Supabase load) or re-mount under StrictMode.
// Hence two read paths, both exported by the splash itself:
//   1. `BOOT_COMPLETE_EVENT` — the live signal, for a hero that is already up.
//   2. `BOOT_DONE_ATTR` on `<html>` — the sticky latch, for a hero that arrives
//      late. A listener can miss the broadcast; the latch cannot be missed.
// The fail-open watchdog lives in `_app.tsx`, one level above the splash, so
// it still fires if the splash itself dies. This component holds no timer of
// its own: a single owner means one bound on how long the hero can wait, and
// it is a ceiling on the *splash*, not a competing race to reveal.
//
// This is also why the entrance runs from a layout effect: the nodes are set
// to `opacity: 0` in the same commit, before the browser can paint the hero
// unmasked. A passive effect would leave one fully-formed frame on screen
// between the signal and the reveal — a flash, which is the failure the gate
// exists to prevent.

import React, { forwardRef, useEffect, useLayoutEffect, useRef } from 'react';
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
import { BOOT_COMPLETE_EVENT, BOOT_DONE_ATTR } from '../ui/BootSequence';

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

// ── Type voice (P3.11) — decision, not deferral ────────────────────────────
// The hero is a mono lockup, and this constant is where that decision lives.
//
// The case for it: every other string in the hero was already mono (eyebrow,
// stats label, quick-command header, card labels) or body prose (bio). The
// display face appeared in exactly three places — the name, the last word of
// the role, the stats number — so the loudest, most-seen element on the page
// was the single exception to its own system. Orbitron is also the stock tell
// of the entire genre; mono is the voice the rest of this hero was already
// speaking in small doses. Scaling it up makes the page more distinctive, not
// less, and it costs no new typeface.
//
// Two corrections travel with the swap because they are consequences of it,
// not preferences:
//   1. `font-bold` → `font-medium`. `_document.tsx` requests JetBrains Mono at
//      400 and 500 only, so a 700 would be a *faux* bold — smeared strokes on a
//      7rem monospaced face, and the single fastest way to make this read as
//      drift rather than intent.
//   2. tracking −0.045em → 0.01em, leading 1.02 → 1.14. Tight negative tracking
//      is a proportional-face trick; monospaced sidebearings are already even,
//      so tightening it collides the glyphs. The taller leading is the usual
//      cost of the mono em-box, and the name is a two-line-capable lockup.
//
// Shared by the name and its sweep overlay so both lay out identically.
const NAME_TYPE =
  'font-mono font-medium uppercase tracking-[0.01em] leading-[1.14] ' +
  'text-[clamp(2.5rem,8vw,7rem)]';

// ── Beat grid ───────────────────────────────────────────────────────────────
// Every absolute offset and one-off length in the entrance below used to be a
// hand-typed millisecond literal, which is how a retimed token silently left
// the choreography behind. They are expressed on a 10ms grid sized from
// `--dur-tap` instead. The conversion is exact, so nothing here re-times the
// reveal: beat(12) is the old 120ms, beat(201) the old 2010ms.
const beat = (steps: number) => (durations.tap * 1000 * steps) / 10;

/** Cascade step — `--dur-stagger` is the step the whole system staggers by. */
const STEP = durations.stagger * 1000;
const STEP_TIGHT = STEP * (2 / 3); // 40 — reduced-motion list reveal
const STEP_NAME = STEP * (7 / 6); //  70 — per-word name cascade

/** Absolute positions in the entrance timeline. */
const AT = {
  start: 0, // the hairline is already in place when the hero unmasks
  label: beat(12), //  120
  nameIn: beat(20), //  200
  words: beat(22), //  220
  chars: beat(26), //  260
  title: beat(62), //  620
  bio: beat(82), //  820
  sweep: beat(90), //  900
  stats: beat(92), //  920
  cards: beat(118), // 1180
  sweepOut: beat(201), // 2010 — the gradient has crossed the name by now
} as const;

/** One-off tween lengths that have no duration token of their own. */
const LEN = {
  sweep: beat(110), // 1100 — one pass of the specular gradient
  stats: beat(60), //   600
  cards: beat(56), //   560
  /**
   * Near-zero for the reduced-motion branch. Anime's default tween is ~1000ms,
   * so omitting a duration there made "no animation" play a full second.
   */
  instant: beat(0.1), // 1
} as const;

/** Role line fallback when the CMS has no `profiles.title` yet. */
const FALLBACK_ROLE = 'FULL-STACK DEVELOPER';

/**
 * Has the splash already cleared? The latch is written by `_app.tsx` at the
 * same moment it broadcasts, so a hero that mounts late — or re-mounts under
 * StrictMode after the reveal — reads this instead of waiting for an event
 * that will never fire again.
 */
function bootAlreadyCleared(): boolean {
  return (
    typeof document !== 'undefined' &&
    document.documentElement.hasAttribute(BOOT_DONE_ATTR)
  );
}

/**
 * Layout effect on the client, passive on the server: the hero is server
 * rendered, and `useLayoutEffect` warns when it is.
 */
const useIsoLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const HeroSection = forwardRef<HTMLDivElement, HeroSectionProps>(
  ({ profile, siteTexts, projectCount, skillCount, expCount, onSend }, ref) => {
    const innerRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<Record<string, HTMLElement>>({});
    const name = resolveName(profile);
    // Role line. This used to be a hardcoded "FULL-STACK DEVELOPER" on a site
    // where every other word comes from the CMS: `profiles.title` is the role
    // field behind the same `profile` prop that already drives the name, so
    // there is no new fetch path — only the existing data finally being read.
    const role = (profile?.title ?? '').trim() || FALLBACK_ROLE;
    // The last word keeps the lockup, so an edited title still reads as a label
    // rather than a sentence. It is now carried by tracking alone — the hero
    // has no second face to switch to (P3.11).
    const roleTailAt = role.lastIndexOf(' ');

    // `respectReduced: false` on purpose: this component already builds a
    // zero-duration version of the same timeline when motion is reduced, so
    // handing it a null scope would duplicate that branch. The hook still
    // guarantees one scope and a clean StrictMode double-invoke.
    const { run, revert, hoverRef } = useMotionScope(innerRef, {
      respectReduced: false,
      mediaQueries: { reduceMotion: '(prefers-reduced-motion: reduce)' },
      defaults: { ease: easings.outExpo },
    });

    // Gated on the splash — see the boot-gate contract in the header.
    useIsoLayoutEffect(() => {
      const root = innerRef.current;
      if (!root) return;

      const reduced = isReducedMotion();
      const ms = (seconds: number) => seconds * 1000;
      let nameSplitter: TextSplitter | null = null;
      let revealed = false;
      let detach: (() => void) | null = null;
      let disposeReveal: (() => void) | null = null;

      /**
       * Build and start the entrance. Idempotent per effect run, and `run()`
       * reverts any previous scope first, so the StrictMode double-invoke
       * rebuilds rather than stacking a second timeline on the same nodes.
       */
      const reveal = () => {
        if (revealed) return;
        run((scope) => {
          if (!scope) return;
          revealed = true;
          const label = root.querySelectorAll<HTMLElement>(
            '[data-hero="label"]',
          );
          const nameWrap =
            root.querySelector<HTMLElement>('[data-hero="name"]');
          const nameEl = nameWrap?.querySelector<HTMLElement>('h1') ?? null;
          const sweep = root.querySelector<HTMLElement>('[data-hero="sweep"]');
          const titleEl = root.querySelector<HTMLElement>(
            '[data-hero="title"]',
          );
          const bio = root.querySelectorAll<HTMLElement>('[data-hero="bio"]');
          const stats = root.querySelectorAll<HTMLElement>(
            '[data-hero="stats"] > div',
          );
          const cards =
            root.querySelectorAll<HTMLElement>('[data-hero="card"]');
          const hairlineWrap =
            root.querySelector<HTMLElement>('.hero-hairline');

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

          const tl = createTimeline({ defaults: { ease: easings.outExpo } });

          if (reduced) {
            // Same choreography, zero duration. Every add needs its own
            // explicit near-zero length (`LEN.instant`) — anime's default is
            // ~1000ms, so omitting it made the reduced-motion path play a full
            // second of tweens.
            const instant = { duration: LEN.instant };
            if (label.length)
              tl.add(label, { y: [12, 0], opacity: [0, 1], ...instant }, 0);
            if (nameWrap)
              tl.add(
                nameWrap,
                { y: [12, 0], opacity: [0, 1], ...instant },
                stagger(STEP),
              );
            if (titleEl)
              tl.add(
                titleEl,
                { y: [12, 0], opacity: [0, 1], ...instant },
                stagger(STEP),
              );
            if (bio.length)
              tl.add(
                bio,
                { y: [10, 0], opacity: [0, 1], ...instant },
                stagger(STEP),
              );
            if (stats.length)
              tl.add(
                stats,
                { y: [10, 0], opacity: [0, 1], ...instant },
                stagger(STEP_TIGHT, { from: 'first' }),
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
                stagger(STEP_TIGHT, { from: 'first' }),
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
                AT.start,
              );
            }
            tl.add(
              hairlineWrap,
              { opacity: [0, 1], duration: ms(durations.enter) * 0.4 },
              AT.start,
            );
          }

          if (label.length)
            tl.add(label, { y: [12, 0], opacity: [0, 1] }, AT.label);

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
              AT.nameIn,
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
                delay: stagger(STEP_NAME),
              },
              AT.words,
            );
          } else if (nameWrap) {
            tl.add(
              nameWrap,
              { y: [18, 0], duration: ms(durations.enter) },
              AT.words,
            );
          }
          if (nameChars.length) {
            tl.add(
              nameChars,
              { opacity: [0, 1], duration: ms(durations.enter) * 0.5 },
              AT.chars,
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
                duration: LEN.sweep,
                ease: easings.smooth,
              },
              AT.sweep,
            );
            tl.add(sweep, { opacity: 0, duration: LEN.instant }, AT.sweepOut);
          }

          if (titleEl)
            tl.add(
              titleEl,
              {
                y: [10, 0],
                opacity: [0, 1],
                duration: ms(durations.enter) * 0.5,
              },
              AT.title,
            );
          if (bio.length)
            tl.add(
              bio,
              {
                y: [10, 0],
                opacity: [0, 1],
                duration: ms(durations.enter) * 0.45,
              },
              AT.bio,
            );
          if (stats.length)
            tl.add(
              stats,
              {
                y: [14, 0],
                opacity: [0, 1],
                duration: LEN.stats,
                ease: softSpring,
                delay: stagger(STEP, { from: 'first' }),
              },
              AT.stats,
            );
          if (cards.length)
            tl.add(
              cards,
              {
                y: [16, 0],
                opacity: [0, 1],
                scale: [0.98, 1],
                duration: LEN.cards,
                ease: softSpring,
                delay: stagger(STEP, { from: 'first' }),
              },
              AT.cards,
            );
        }); // end of run((scope) => …)

        // Order matters: restore animated properties first, then let the
        // splitter put the original text nodes back.
        disposeReveal = () => {
          revert();
          try {
            nameSplitter?.revert();
          } catch {
            /* splitter already reverted */
          }
          nameSplitter = null;
        };
      };

      // Reduced motion: the splash is a 420ms panel and the branch inside
      // reveal() plays this same choreography in a single frame. Waiting for
      // a signal that cannot teach the visitor anything would only delay the
      // page they asked for without motion.
      if (reduced) {
        reveal();
      } else {
        const onBootComplete = () => reveal();
        window.addEventListener(BOOT_COMPLETE_EVENT, onBootComplete);
        detach = () =>
          window.removeEventListener(BOOT_COMPLETE_EVENT, onBootComplete);
        // Latch *after* subscribing, so a signal landing between the two
        // cannot be missed. If the splash already cleared — the hero
        // mounted after it, or StrictMode re-ran this effect — the reveal
        // starts on this frame instead of waiting for a second broadcast.
        if (bootAlreadyCleared()) reveal();
      }

      return () => {
        detach?.();
        disposeReveal?.();
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
          className="hero-title font-mono text-sm md:text-base tracking-[0.18em] mt-4 text-center"
          style={{ color: 'var(--fg-2)' }}
        >
          {roleTailAt === -1 ? (
            role
          ) : (
            <>
              {role.slice(0, roleTailAt)}{' '}
              <span className="tracking-[0.14em]">
                {role.slice(roleTailAt + 1)}
              </span>
            </>
          )}
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
            // Label leads, number supports. The digits used to be 3xl bold
            // while the words that give them meaning sat at 9px, so the row
            // shouted meaningless numbers and hid the content. DOM order stays
            // value-first — it still reads "12+ PROJECTS" aloud — and
            // `flex-col-reverse` lifts the label to the top for the eye.
            <div
              key={s.label}
              className="flex flex-col-reverse gap-1.5 text-center"
            >
              <div
                className="font-mono text-lg md:text-xl font-medium tabular-nums"
                style={{ color: 'var(--fg-3)' }}
              >
                {s.value}
                <span style={{ color: 'var(--neon-cyan)' }}>+</span>
              </div>
              <div
                className="font-mono text-[11px] md:text-xs tracking-[0.24em] uppercase"
                style={{ color: 'var(--fg-2)' }}
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
