import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { ArrowLeft, Clock, Eye, Calendar } from 'lucide-react';
import { createScope, createTimeline, createDrawable, spring } from 'animejs';
import { splitText } from 'animejs';
import SEOMeta from '../../components/SEOMeta';
import RichTextRenderer from '../../components/RichTextRenderer';
import ReadingProgress from '../../components/blog/ReadingProgress';
import LightningTransition from '../../components/blog/LightningTransition';
import BlogCard from '../../components/blog/BlogCard';
import type { BlogPost, BlogListItem } from '../../types/blog';
import {
  isReducedMotion,
  canAnimate,
  durations,
  easings,
  springs,
} from '../../config/animations';
import { HairlineDivider } from '../../components/ui/graphics';
import { formatDate } from '../../utils/dateFormat';

interface Props {
  post: BlogPost;
  prev: BlogListItem | null;
  next: BlogListItem | null;
  related: BlogListItem[];
}

/* ═══════════════════════════════════════════════════════════════════════════
   HERO BEAT ORDER
   ═══════════════════════════════════════════════════════════════════════════
   This hero used to start seven groups at timeline position 0 and let their
   durations be the only thing that told them apart. Seven simultaneous
   entrances is the same picture as one: a reader cannot perceive a hierarchy
   when nothing is allowed to arrive first, and the longest group (a 1.4s
   hairline draw) was the loudest thing on screen while doing nothing a reader
   can read.

   So the order below IS the hierarchy, and it is stated here rather than left
   to be re-derived from seven zeroes:

     0ms    title     the only thing on screen that opens alone — a per-char
                      rise whose cascade is normalised so a four-word headline
                      and a forty-character one cost the same 240ms
     ~122   aurora    decoration, and the reason it starts early and finishes
                      last: slow, blurred, no translation, and washed in over
                      ~840ms, so it is felt as the room getting warmer rather
                      than watched. It never moves, so it cannot lead the eye
     ~192   shelf     the rule's container fades up, empty
     ~218   rule      the line draws itself across that shelf, finishing at
                      ~500 — just as the meta lands on it
     ~499   meta      date / read time / views, onto a shelf now fully drawn
     ~640   excerpt   the standfirst, once title and metadata are legible
     ~768   tags      last of the reading group
     ~896   back      utility chrome, a full 1.4 enters in, because it is the
                      one element on this screen the reader will never be
                      looking for and it must not pull the eye off the title

   Every number is a fraction of a shared duration token — no raw millisecond
   literals — so retiming `--dur-enter` in tokens.css retimes the whole
   sequence and the ORDER survives it. `token-lint` cannot see inside a plain
   object literal, so the discipline that keeps these honest is the comment
   above, not the linter.
   ─────────────────────────────────────────────────────────────────────────── */
const ENTER_MS = (durations.enter ?? 0.64) * 1000;
const STEP_MS = durations.stagger * 1000;

/** When each group starts, as a fraction of `--dur-enter`. */
const BEAT = {
  title: 0,
  aurora: ENTER_MS * 0.19,
  shelf: ENTER_MS * 0.3,
  rule: ENTER_MS * 0.34,
  meta: ENTER_MS * 0.78,
  excerpt: ENTER_MS,
  tags: ENTER_MS * 1.2,
  back: ENTER_MS * 1.4,
} as const;

/** How long each group takes. */
const HOLD = {
  titleChar: ENTER_MS * 0.56,
  /** Only reached when `splitText` yields no characters. */
  titleBlock: ENTER_MS * 0.52,
  ruleDraw: ENTER_MS * 0.44,
  shelf: ENTER_MS * 0.3,
  meta: ENTER_MS * 0.44,
  excerpt: ENTER_MS * 0.62,
  tags: ENTER_MS * 0.46,
  back: ENTER_MS * 0.36,
  aurora: (durations.draw ?? 1.4) * 1000 * 0.6,
} as const;

/**
 * Reduced motion keeps the order and loses the travel: same sequence, same
 * legible hierarchy, shorter and with nothing to read past. Timing is scaled
 * rather than swapped for a different set, so the two branches cannot drift
 * into two different compositions.
 */
const CALM = 0.55;
const calm = (ms: number): number => ms * CALM;

/**
 * How long the page-turn sheet may stay shut waiting for `routeChangeComplete`
 * before it retires anyway. This is a fail-open, not a budget: the cover beats
 * are ~320ms and the site-wide sweep it hides behind is ~880ms, so anything past
 * ~1s means the router has gone quiet and leaving a full-screen sheet up is the
 * worse failure.
 */
const RELEASE_DEADLINE_MS = durations.transition * 1000 * 3;

/**
 * Steps a cascade spreads its delay over, however many targets it has. A
 * headline split into 40 characters used to cost 3.5 seconds to finish
 * arriving, which is not a cascade a reader waits out.
 */
const CASCADE_STEPS = 8;

/**
 * Per-target delay for a cascade, normalised across the whole group: the
 * FIRST target always starts at 0 and the cascade always spans
 * `min(n - 1, CASCADE_STEPS)` steps, so adding characters to a headline
 * changes its texture and not its duration.
 */
const cascade = (index: number, length: number): number =>
  length <= 1
    ? 0
    : (index / (length - 1)) *
      Math.min(length - 1, CASCADE_STEPS) *
      STEP_MS *
      0.5;

export default function BlogReaderPage({ post, prev, next, related }: Props) {
  const router = useRouter();
  const articleRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  const [boltTrigger, setBoltTrigger] = useState(0);
  const [boltRelease, setBoltRelease] = useState(0);
  const pendingHref = useRef<string | null>(null);

  // Hero entrance — premium: splitText title cascade + meta drawable rule + aurora wash
  // The ORDER is the point, and it lives in BEAT/HOLD above rather than in the
  // timeline body, so the composition can be read without reading 250 lines.
  useEffect(() => {
    const root = heroRef.current;
    if (!root) return;
    const reduced = isReducedMotion() || !canAnimate();

    const scope = createScope({
      root,
      mediaQueries: { reduceMotion: '(prefers-reduced-motion: reduce)' },
      defaults: {
        duration: (durations.enter ?? 0.48) * 1000,
        ease: (easings.smooth ?? easings.outExpo ?? 'outExpo') as string,
        composition: 'blend',
      },
    } as Parameters<typeof createScope>[0]);

    let titleSplitter: ReturnType<typeof splitText> | null = null;

    scope.add(() => {
      const backLink = root.querySelectorAll<HTMLElement>('.reader-back');
      const meta = root.querySelectorAll<HTMLElement>('.reader-meta');
      const titleEl = root.querySelector<HTMLElement>('.reader-title');
      const excerptEl = root.querySelectorAll<HTMLElement>('.reader-excerpt');
      const tagsWrap = root.querySelectorAll<HTMLElement>('.reader-tags');
      const tagChips = root.querySelectorAll<HTMLElement>('.reader-tag');
      const hairlineLines = root.querySelectorAll<SVGGeometryElement>(
        '.reader-hairline line',
      );
      const hairlineWraps =
        root.querySelectorAll<HTMLElement>('.reader-hairline');
      const auroraWash = root.querySelectorAll<HTMLElement>('.reader-aurora');

      if (reduced) {
        // Same sequence, same order, less travel. Deliberately not a second
        // set of numbers: two parallel timetables drift, and then the
        // reduced-motion reader gets a different composition to the one the
        // timing table above describes.
        const tl = createTimeline({
          defaults: { ease: (easings.outExpo ?? 'outExpo') as string },
        } as any);
        if (titleEl)
          tl.add(
            titleEl as unknown as HTMLElement,
            {
              y: [14, 0],
              opacity: [0, 1],
              duration: calm(HOLD.titleBlock),
            } as any,
            BEAT.title,
          );
        if (auroraWash.length)
          tl.add(
            auroraWash as unknown as HTMLElement[],
            {
              opacity: [0, 1],
              duration: calm(HOLD.aurora),
            } as any,
            BEAT.aurora,
          );
        if (hairlineWraps.length)
          tl.add(
            hairlineWraps as unknown as HTMLElement[],
            {
              opacity: [0, 1],
              duration: calm(HOLD.shelf),
            } as any,
            BEAT.shelf,
          );
        if (meta.length)
          tl.add(
            meta as unknown as HTMLElement[],
            {
              y: [12, 0],
              opacity: [0, 1],
              duration: calm(HOLD.meta),
            } as any,
            BEAT.meta,
          );
        if (excerptEl.length)
          tl.add(
            excerptEl as unknown as HTMLElement[],
            {
              y: [12, 0],
              opacity: [0, 1],
              duration: calm(HOLD.excerpt),
            } as any,
            BEAT.excerpt,
          );
        if (tagsWrap.length)
          tl.add(
            tagsWrap as unknown as HTMLElement[],
            {
              opacity: [0, 1],
              duration: calm(HOLD.tags),
            } as any,
            BEAT.tags,
          );
        if (tagChips.length)
          tl.add(
            tagChips as unknown as HTMLElement[],
            {
              y: [8, 0],
              opacity: [0, 1],
              duration: calm(HOLD.tags),
            } as any,
            BEAT.tags,
          );
        if (backLink.length)
          tl.add(
            backLink as unknown as HTMLElement[],
            {
              y: [12, 0],
              opacity: [0, 1],
              duration: calm(HOLD.back),
            } as any,
            BEAT.back,
          );
        return;
      }

      const tl = createTimeline({
        defaults: { ease: (easings.smooth ?? 'outExpo') as string },
      } as any);

      const softSpring = spring(
        springs.soft as unknown as Record<string, number>,
      ) as unknown as string;

      // The split runs BEFORE the timeline is built, not on the beat. The title
      // owns position 0, and an entrance cannot be placed on targets that do
      // not exist yet.
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
      const titleChars =
        (titleSplitter?.chars as unknown as HTMLElement[]) ?? [];

      // 1 ── The title. Alone, on beat zero.
      //
      // One cascade, not two. The old timeline put `stagger(...)` in the
      // timeline POSITION *and* a second `stagger(...)` in `delay`, so the two
      // compounded: a forty-character headline took 3.5s to finish arriving.
      // `cascade` normalises the span across the group instead, so the texture
      // changes with the headline and the duration does not.
      if (titleChars.length) {
        tl.add(
          titleChars as unknown as HTMLElement[],
          {
            y: ['112%', '0%'],
            opacity: [0, 1],
            duration: HOLD.titleChar,
            ease: (easings.expoOut ?? easings.outExpo ?? 'outExpo') as string,
            delay: cascade,
          } as any,
          BEAT.title,
        );
      } else if (titleEl) {
        // No split available (fonts late, splitText unsupported): the block
        // still gets its own beat and its own spring.
        tl.add(
          titleEl as unknown as HTMLElement,
          {
            y: [16, 0],
            opacity: [0, 1],
            duration: HOLD.titleBlock,
            ease: softSpring ?? (easings.smooth as string),
          } as any,
          BEAT.title,
        );
      }

      // 2 ── Decoration. Under the title, and still rising after the reader has
      // finished it — slow, blurred, and never translated, so it reads as the
      // room getting warmer rather than as something arriving. Starting it
      // first (as the old timeline did, at position 0) is what made it
      // compete: a full-screen wash arriving alongside the title is the loudest
      // thing in the composition.
      if (auroraWash.length) {
        tl.add(
          auroraWash as unknown as HTMLElement[],
          {
            opacity: [0, 1],
            duration: HOLD.aurora,
            ease: (easings.smooth ?? 'outExpo') as string,
          } as any,
          BEAT.aurora,
        );
      }

      // 3 ── The shelf: an empty rule first, then the line drawing itself
      // across it. Previously the container only faded up 220ms before the draw
      // ENDED, so the first 60% of a 1400ms draw was rendered into opacity 0.
      if (hairlineWraps.length) {
        tl.add(
          hairlineWraps as unknown as HTMLElement[],
          {
            opacity: [0, 1],
            duration: HOLD.shelf,
            ease: (easings.smooth ?? 'outExpo') as string,
          } as any,
          BEAT.shelf,
        );
      }

      const hairlineDrawable = hairlineLines.length
        ? (createDrawable('.reader-hairline line') as unknown as HTMLElement[])
        : ([] as unknown as HTMLElement[]);
      if ((hairlineDrawable as unknown as unknown[]).length) {
        tl.add(
          hairlineDrawable as unknown as HTMLElement[],
          {
            draw: ['0 0', '0 1'],
            duration: HOLD.ruleDraw,
            ease: (easings.smooth ?? 'linear') as string,
          } as any,
          BEAT.rule,
        );
      } else if (hairlineWraps.length) {
        tl.add(
          hairlineWraps as unknown as HTMLElement[],
          {
            opacity: [0, 1],
            scaleX: [0, 1],
            duration: calm(HOLD.ruleDraw),
            ease: (easings.smooth ?? 'outExpo') as string,
          } as any,
          BEAT.rule,
        );
      }

      // 4 ── The metadata lands on a shelf that is now fully drawn.
      if (meta.length) {
        tl.add(
          meta as unknown as HTMLElement[],
          {
            y: [12, 0],
            opacity: [0, 1],
            duration: HOLD.meta,
            ease: (easings.smooth ?? 'outExpo') as string,
          } as any,
          BEAT.meta,
        );
      }

      // 5 ── The standfirst, once the title and the metadata are legible.
      if (excerptEl.length) {
        tl.add(
          excerptEl as unknown as HTMLElement[],
          {
            y: [12, 0],
            opacity: [0, 1],
            duration: HOLD.excerpt,
            ease: softSpring ?? (easings.smooth as string),
          } as any,
          BEAT.excerpt,
        );
      }

      // 6 ── Tags.
      if (tagChips.length) {
        tl.add(
          tagChips as unknown as HTMLElement[],
          {
            y: [10, 0],
            opacity: [0, 1],
            scale: [0.98, 1],
            duration: HOLD.tags,
            ease: softSpring ?? (easings.smooth as string),
            delay: cascade,
          } as any,
          BEAT.tags,
        );
      } else if (tagsWrap.length) {
        tl.add(
          tagsWrap as unknown as HTMLElement[],
          {
            y: [10, 0],
            opacity: [0, 1],
            duration: HOLD.tags,
            ease: softSpring ?? (easings.smooth as string),
          } as any,
          BEAT.tags,
        );
      }

      // 7 ── Utility chrome last, a full 1.4 enters in. The back link is the one
      // element on this screen the reader will never be looking for, and it is
      // the only group that was previously competing with the title for the
      // opening beat.
      if (backLink.length) {
        tl.add(
          backLink as unknown as HTMLElement[],
          {
            y: [14, 0],
            opacity: [0, 1],
            duration: HOLD.back,
            ease: (easings.smooth ?? 'outExpo') as string,
          } as any,
          BEAT.back,
        );
      }
    });

    return () => {
      try {
        titleSplitter?.revert();
      } catch {}
      scope.revert();
    };
  }, [post.id]);

  // Lightning-wrapped navigation between posts (muted wipe).
  //
  // Two files animate this route and neither one owns the other, so the handoff
  // is stated here instead of being re-derived in both:
  //
  //   LightningTransition  cover  →  `onCovered`  →  RETIRE WHEN TOLD
  //   RouteTransition      push   →  covers → holds → retreats
  //
  // The sheet's `onCovered` is the swap point and it now fires when the sheet is
  // FULLY shut, not at 60% of it. `router.push` therefore runs behind an opaque
  // sheet, and the new tree has committed before the sheet is allowed to lift.
  const swapTo = useCallback((slug: string) => {
    pendingHref.current = `/blog/${slug}`;
    setBoltTrigger((t) => t + 1);
  }, []);

  const handleCovered = useCallback(() => {
    const href = pendingHref.current;
    pendingHref.current = null;
    if (href) router.push(href);
  }, [router]);

  // Retire the sheet once the swap has landed.
  //
  // `RouteTransition` keeps its own curtain shut until `routeChangeComplete` and
  // only then starts to retreat, so a lift at this moment happens entirely
  // behind that curtain — the reader sees one transition, not two. Lifting on
  // our own clock instead (the previous behaviour, 66% of a 640ms sheet) put a
  // vertical wipe and a horizontal sweep on screen together for ~320ms, with
  // each file cleaning up only its own three layers.
  //
  // The deadline is the half of the rule that keeps a visitor from being
  // stranded behind an occluder if the router goes quiet: whichever fires first
  // retires the sheet, and `LightningTransition` restores pointer events in its
  // own `onComplete`, so a dropped event cannot leave the reader locked out of
  // the page.
  useEffect(() => {
    if (boltTrigger === 0) return;
    let settled = false;
    let deadline = 0;

    const retire = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(deadline);
      router.events.off('routeChangeComplete', retire);
      router.events.off('routeChangeError', retire);
      setBoltRelease((r) => r + 1);
    };

    router.events.on('routeChangeComplete', retire);
    router.events.on('routeChangeError', retire);
    deadline = window.setTimeout(retire, RELEASE_DEADLINE_MS);

    return () => {
      settled = true;
      window.clearTimeout(deadline);
      router.events.off('routeChangeComplete', retire);
      router.events.off('routeChangeError', retire);
    };
  }, [boltTrigger, router]);

  return (
    <>
      <SEOMeta
        title={post.seo_title || post.title}
        description={post.seo_description || post.excerpt || post.title}
        image={post.cover_image_url || undefined}
        path={`/blog/${post.slug}`}
        blogPost={post}
      />

      <ReadingProgress targetRef={articleRef} />
      <LightningTransition
        trigger={boltTrigger}
        onCovered={handleCovered}
        release={boltRelease}
      />

      {/* `relative`, no z-index — the page-root half of the contract stated in
          `_app.tsx` and of the identical note on `blog/index.tsx`. A page root
          must not open a stacking context, or the overlays it renders get
          trapped in a band the shell's fixed accent strip, mounted OUTSIDE at
          `z-[var(--z-hud)]`, can never out-rank. Nothing in the reading flow
          depends on the z-index it used to carry: `--z-hud` already paints the
          strip above ordinary page content, and the stage it lives in already
          sits above the scene.

          The sheet above is deliberately OUTSIDE this article, which is what lets
          its `z-80` full-screen page turn cover the strip with no ancestor
          z-index in the way.

          It is NOT above the shell's `z-[85]` curtain, and no z-index here can
          make it so: `RouteTransition` mounts the curtain as a SIBLING of the
          `rt-stage` that holds this whole page, so the curtain paints over
          whatever the page renders, and `rt-stage` takes a `transform` during
          the sweep, which re-parents the sheet's `fixed inset-0` into that stage
          and hands it the stage's x-shift and opacity too. Two occluders that
          cross cannot be fixed with stacking order — one of them has to be
          scheduled out of the other's way. The page-turn sheet is the one that
          waits: it covers, swaps the tree the instant it is fully shut, and
          holds until `routeChangeComplete`, so its lift is spent behind the
          still-closed curtain and the reader only ever sees the horizontal
          sweep. See the note above `swapTo` for the sequence and
          `RELEASE_DEADLINE_MS` for the fail-open. */}
      <article
        ref={articleRef}
        className="relative min-h-screen"
        data-theme="editorial"
      >
        {/* Full-screen hero — aurora wash + cover + splitText title + drawable rule.
            Arrival order is BEAT/HOLD at the top of this file; the cover no longer
            parallaxes (that was a second scroll listener on a route that already
            has one, and the scene's rule is that scroll is sampled in the frame
            loop, never in a listener of its own). */}
        <div
          ref={heroRef}
          className="relative min-h-screen flex flex-col justify-end overflow-hidden px-4 pb-16 pt-28"
        >
          {/* Soft aurora wash behind cover — token-only var(--aurora-*) */}
          <div
            aria-hidden="true"
            className="reader-aurora pointer-events-none absolute inset-0 reveal overflow-hidden"
          >
            <div
              style={{
                position: 'absolute',
                top: '-8%',
                left: '-6%',
                width: '58%',
                height: '56%',
                borderRadius: '9999px',
                background:
                  'radial-gradient(ellipse at center, var(--aurora-1) 0%, transparent 72%)',
                filter: 'blur(64px)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '-6%',
                right: '-8%',
                width: '48%',
                height: '52%',
                borderRadius: '9999px',
                background:
                  'radial-gradient(ellipse at center, var(--aurora-2) 0%, transparent 72%)',
                filter: 'blur(56px)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '-10%',
                left: '10%',
                width: '52%',
                height: '48%',
                borderRadius: '9999px',
                background:
                  'radial-gradient(ellipse at center, var(--aurora-3) 0%, transparent 72%)',
                filter: 'blur(48px)',
              }}
            />
          </div>
          {/* Cover. Static: it sits under the void gradient above it anyway, so
              the 4% overscale that parallax depended on was only ever visible
              as a moving edge behind a 75–97% wash. */}
          {post.cover_image_url && (
            <div className="absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.cover_image_url}
                alt={post.cover_image_alt || post.title}
                className="w-full h-full object-cover opacity-[0.28]"
              />
            </div>
          )}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, var(--overlay-void-75) 0%, var(--overlay-void-50) 45%, var(--overlay-void-97) 100%)',
            }}
          />

          <div className="relative max-w-3xl mx-auto w-full">
            <Link href="/blog" legacyBehavior>
              <a
                className="reader-back inline-flex items-center gap-2 min-h-[44px] min-w-[44px] font-mono text-[11px] tracking-[0.1em] mb-6 reveal transition-colors hover:opacity-80"
                style={{ color: 'var(--fg-3)' }}
              >
                <ArrowLeft size={13} /> Back to the archive
              </a>
            </Link>

            <div
              className="reader-meta flex flex-wrap items-center gap-3 text-[11px] font-mono mb-4 reveal"
              style={{ color: 'var(--fg-3)' }}
            >
              <span className="inline-flex items-center gap-1">
                <Calendar size={11} />{' '}
                {/* Article page deliberately departs from formatDate's DRAFT/
                    short-month defaults: a missing date renders nothing, and
                    the wider measure takes the long month name. */}
                {formatDate(post.published_at, { empty: '', month: 'long' })}
              </span>
              {post.reading_minutes ? (
                <span className="inline-flex items-center gap-1">
                  <Clock size={11} /> {post.reading_minutes} min read
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1">
                <Eye size={11} /> {post.view_count ?? 0} views
              </span>
            </div>

            {/* Drawable hairline rule under meta — animated via createDrawable draw ['0 0','0 1'] */}
            <HairlineDivider className="reader-hairline w-full max-w-xl mb-5 reveal" />

            {/* The blog's one display voice — the hero wordmark's recipe
                (NAME_TYPE in HeroSection): mono at display size, medium weight,
                +0.01em tracking, 1.14 leading. Sentence case, never upper-cased;
                mono never takes negative tracking. */}
            <h1
              className="reader-title font-mono font-medium tracking-[0.01em] leading-[1.14] text-[clamp(1.875rem,6vw,3.25rem)] reveal"
              style={{ color: 'var(--fg-1)' }}
            >
              {post.title}
            </h1>

            {post.excerpt && (
              <p
                className="reader-excerpt font-body text-sm md:text-base mt-5 max-w-2xl leading-relaxed reveal"
                style={{ color: 'var(--fg-2)' }}
              >
                {post.excerpt}
              </p>
            )}

            {post.tags?.length > 0 && (
              <div className="reader-tags flex flex-wrap gap-1.5 mt-5 reveal">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="reader-tag inline-flex px-2.5 py-1 rounded-full font-mono text-[11px] tracking-[0.1em] border reveal"
                    style={{
                      background: 'var(--bg-2)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--fg-3)',
                    }}
                  >
                    {tag.toUpperCase()}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="max-w-3xl mx-auto px-4 pb-20">
          <RichTextRenderer
            html={post.content_html}
            className="rich-prose font-body text-sm md:text-base leading-relaxed mx-auto max-w-[68ch]"
          />

          {/* Prev / Next — editorial cards, no HudPanel/Neon */}
          <nav className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-16">
            {prev ? (
              <button
                onClick={() => swapTo(prev.slug)}
                className="text-left group"
              >
                <div
                  className="p-4 h-full rounded-[var(--radius-lg)] border transition-colors duration-200 hover:border-[var(--border-strong)]"
                  style={{
                    background: 'var(--bg-2)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div
                    className="text-[11px] font-mono tracking-[0.1em] mb-1"
                    style={{ color: 'var(--fg-3)' }}
                  >
                    {'\u25C0 Previous'}
                  </div>
                  <div
                    className="font-body font-semibold text-sm line-clamp-2"
                    style={{ color: 'var(--fg-1)' }}
                  >
                    {prev.title}
                  </div>
                </div>
              </button>
            ) : (
              <div />
            )}
            {next ? (
              <button
                onClick={() => swapTo(next.slug)}
                className="text-right group"
              >
                <div
                  className="p-4 h-full rounded-[var(--radius-lg)] border transition-colors duration-200 hover:border-[var(--border-strong)]"
                  style={{
                    background: 'var(--bg-2)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div
                    className="text-[11px] font-mono tracking-[0.1em] mb-1"
                    style={{ color: 'var(--fg-3)' }}
                  >
                    {'Next \u25B6'}
                  </div>
                  <div
                    className="font-body font-semibold text-sm line-clamp-2"
                    style={{ color: 'var(--fg-1)' }}
                  >
                    {next.title}
                  </div>
                </div>
              </button>
            ) : (
              <div />
            )}
          </nav>

          {/* Related */}
          {related.length > 0 && (
            <section className="mt-16">
              <div
                className="text-[12px] font-mono tracking-[0.1em] mb-4"
                style={{ color: 'var(--fg-3)' }}
              >
                {'// Related reading'}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {related.map((r, i) => (
                  <BlogCard key={r.id} post={r} index={i} />
                ))}
              </div>
            </section>
          )}

          <div className="flex justify-center mt-14">
            <button
              onClick={() => router.push('/blog')}
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-5 py-2.5 font-body text-sm border rounded-[var(--radius-md)] transition-colors duration-200 hover:border-[var(--glow-amber-sm)] hover:text-[var(--neon-amber)]"
              style={{
                background: 'transparent',
                borderColor: 'var(--border-subtle)',
                color: 'var(--fg-2)',
              }}
            >
              All posts
            </button>
          </div>
        </div>
      </article>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const slug = String(ctx.params?.slug ?? '');

  // Required here, inside the function, not at module top level: a top-level
  // import of the server-only Supabase client lands in the client bundle.

  const { supabaseAdmin } = await import('../../utils/supabaseAdmin');

  if (!supabaseAdmin || !slug) {
    return { notFound: true };
  }

  const { data: post } = await supabaseAdmin
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (!post) {
    return { notFound: true };
  }

  const typed = post as unknown as BlogPost;
  const anchor = typed.published_at ?? typed.created_at;

  const cols =
    'id, slug, title, excerpt, cover_image_url, cover_image_alt, status, featured, tags, reading_minutes, view_count, seo_title, seo_description, seo_keywords, canonical_url, published_at, created_at, updated_at';

  const [prevRes, nextRes, relatedRes] = await Promise.all([
    supabaseAdmin
      .from('blog_posts')
      .select(cols)
      .eq('status', 'published')
      .lt('published_at', anchor)
      .order('published_at', { ascending: false })
      .limit(1),
    supabaseAdmin
      .from('blog_posts')
      .select(cols)
      .eq('status', 'published')
      .gt('published_at', anchor)
      .order('published_at', { ascending: true })
      .limit(1),
    typed.tags?.length
      ? supabaseAdmin
          .from('blog_posts')
          .select(cols)
          .eq('status', 'published')
          .neq('id', typed.id)
          .overlaps('tags', typed.tags)
          .order('published_at', { ascending: false })
          .limit(3)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  // Best-effort view increment.
  void supabaseAdmin
    .from('blog_posts')
    .update({ view_count: (typed.view_count ?? 0) + 1 })
    .eq('id', typed.id);

  return {
    props: {
      post: typed,
      prev: ((prevRes.data ?? [])[0] ?? null) as BlogListItem | null,
      next: ((nextRes.data ?? [])[0] ?? null) as BlogListItem | null,
      related: (relatedRes.data ?? []) as unknown as BlogListItem[],
    },
  };
};
