// src/components/blog/BlogReels.tsx
// Reels-style blog: scroll-snap y mandatory, near-fullscreen cards,
// reuses BlogCard chrome (HudPanel+Tilt3D), LightningTransition once on entry,
// ReadingProgress → pager dots, RichTextRenderer for expanded view.
// Preserves /blog/[slug] SSR route — expanded is in-place overlay.
// Respects prefers-reduced-motion: stacked static fallback, mount-gated so
// the server and the client render the same tree.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown, X, Calendar, Clock, Eye } from 'lucide-react';
import {
  useCoverPreload,
  useBulkCoverPreload,
} from '../../hooks/useCoverPreload';
import { useMotionPreference } from '../../hooks/useMotionPreference';
import { getBlogPost } from '../../utils/blogApi';
import { formatDate } from '../../utils/dateFormat';
import type { BlogListItem, BlogPost } from '../../types/blog';
import { HudPanel, NeonChip, NeonButton, GlitchText } from '../ui';
import { durations, easings } from '../../config/animations';
import type { AccentColor } from '../../config/animations';
import { useFlashCurtain } from '../../hooks/useFlashCurtain';
import FlashCurtain from './FlashCurtain';
import LightningTransition from './LightningTransition';
import RichTextRenderer from '../RichTextRenderer';
import { animate, onScroll, createScope } from 'animejs';

// One accent cycle for the whole reels view. Warm-first, drawn from the same
// six site accents the grid uses — declared once here instead of repeating an
// inline tuple at every call site.
const REEL_ACCENTS: readonly AccentColor[] = [
  'amber',
  'lime',
  'ice',
  'coral',
  'violet',
  'cyan',
];

type Props = {
  items: BlogListItem[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  activeTag: string;
};

export default function BlogReels({
  items,
  total,
  hasMore,
  loading,
  onLoadMore,
}: Props) {
  // The reduced branch below renders an entirely different tree (stacked
  // cards vs a snap scroller). isReducedMotion() is false on the server and
  // the user's real preference in the browser, so reading it during render
  // guaranteed a hydration mismatch; the hook gates on mount instead.
  const { reduced } = useMotionPreference();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [bolt, setBolt] = useState(0);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, BlogPost>>({});
  const [detailLoading, setDetailLoading] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const { flash } = useFlashCurtain(containerRef, flashRef, {
    durationMs: durations.exit * 1000,
  });

  const coverUrls = items.map((p) => p.cover_image_url);
  useCoverPreload(coverUrls, active);
  useBulkCoverPreload(items.slice(0, 5).map((p) => p.cover_image_url));

  // The entry page turn. `LightningTransition` swallows its own first effect
  // pass (its `firstRun` ref), so the wipe can only ever run from a post-mount
  // CHANGE of `trigger`: the trigger has to be armed, it cannot be handed over
  // already raised. `setBolt` had no caller, which is why the flash sat inert
  // on every visit to this view.
  //
  // ONCE per mount, and once per mount only. Not per card, whatever the header
  // note used to say: the sheet is an opaque `var(--bg-1)` `fixed inset-0` wipe
  // that holds `pointer-events: auto` on itself for the whole pass (~740ms out
  // of --dur-enter/--dur-exit), so arming it per snap would black out the
  // viewport and swallow the scroller between cards. Switching grid⇄reels swaps
  // the component type, so "once per mount" reads as "each time the reel view
  // opens" — which is the beat this is for.
  //
  // Gated on the hook's `reduced` rather than on `isReducedMotion()`: this view
  // only mounts client-side, after the archive's own fetch resolves, so the
  // render-time value is already the live preference (there is no reels view in
  // the server HTML to hydrate). See useMotionPreference.
  const boltFiredRef = useRef(false);
  useEffect(() => {
    if (boltFiredRef.current) return;
    // Latched before the motion check, not after: this is one page turn per
    // opening of the view, decided once. Flipping the OS preference while the
    // reels are open must not hand the visitor a second one.
    boltFiredRef.current = true;
    if (reduced) return;
    setBolt((n) => n + 1);
  }, [reduced]);

  // Active index via scroll + intersection.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || reduced) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const h = el.clientHeight || 1;
        const idx = Math.round(el.scrollTop / h);
        const clamped = Math.max(0, Math.min(items.length - 1, idx));
        setActive((prev) => (prev === clamped ? prev : clamped));
        raf = 0;
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [items.length, reduced]);
  // Horizontal swipe drag (touch + mouse pointer) — scrolls scroller
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || reduced) return;
    let startY = 0;
    let startTop = 0;
    let tracking = false;
    const isInteractive = (t: EventTarget | null) => {
      if (!t) return false;
      const n = t as HTMLElement;
      return !!n.closest(
        'a,button,input,textarea,[role="button"],[data-no-swipe]',
      );
    };
    const onDown = (e: PointerEvent) => {
      if (isInteractive(e.target)) return;
      tracking = true;
      startY = e.clientY;
      startTop = el.scrollTop;
      el.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!tracking) return;
      el.scrollTop = startTop - (e.clientY - startY);
    };
    const onUp = () => {
      tracking = false;
    };
    el.addEventListener('pointerdown', onDown, { passive: false });
    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    };
  }, [reduced]);

  // Scroll-driven parallax on card covers via animejs onScroll
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || reduced || !items.length) return;
    const scope = createScope({ root: el }).add(() => {
      const covers = el.querySelectorAll('[data-reel-cover]');
      covers.forEach((cover) => {
        animate(cover, {
          translateY: [30, -20],
          ease: easings.expoOut,
          duration: durations.sceneIntro * 1000 * 0.55,
          autoplay: onScroll({
            container: el,
            sync: true,
            target: cover,
            start: 'top bottom',
            end: 'bottom top',
          } as any),
        });
      });
    });
    return () => scope.revert();
  }, [reduced, items.length]);

  const openExpanded = useCallback(
    async (slug: string) => {
      if (detailCache[slug]) {
        setExpandedSlug(slug);
        return;
      }
      setDetailLoading(slug);
      const res = await getBlogPost(slug);
      setDetailLoading(null);
      if (res?.post) {
        setDetailCache((m) => ({ ...m, [slug]: res.post }));
        setExpandedSlug(slug);
      } else {
        // Fallback: still expand to excerpt + deep link if fetch fails.
        setExpandedSlug(slug);
      }
    },
    [detailCache],
  );

  // Reduced-motion fallback — static stacked cards, normal scroll.
  if (reduced) {
    return (
      <div className="space-y-6">
        {items.map((post, i) => (
          <HudPanel
            key={post.id}
            accent={REEL_ACCENTS[i % REEL_ACCENTS.length]}
            className="overflow-hidden"
          >
            <ReelsCardInner
              post={post}
              i={i}
              onExpand={() => openExpanded(post.slug)}
              expanded={expandedSlug === post.slug}
              detail={detailCache[post.slug]}
              detailLoading={detailLoading === post.slug}
              onClose={() => setExpandedSlug(null)}
            />
          </HudPanel>
        ))}
        {hasMore && (
          <div className="flex justify-center pt-4">
            <NeonButton
              accent="amber"
              variant="outline"
              onClick={onLoadMore}
              disabled={loading}
            >
              {loading ? 'Loading…' : 'Load more'}
            </NeonButton>
          </div>
        )}
        <ExpandedOverlay
          slug={expandedSlug}
          detail={expandedSlug ? detailCache[expandedSlug] : undefined}
          detailLoading={!!detailLoading}
          onClose={() => setExpandedSlug(null)}
        />
      </div>
    );
  }

  // Snap reels
  return (
    <>
      <LightningTransition trigger={bolt} />

      {/* Pager — ReadingProgress adapted to reels index */}
      <div
        className="fixed right-3 top-1/2 -translate-y-1/2 z-20 hidden md:flex flex-col items-center gap-1.5"
        aria-hidden="true"
      >
        <div className="w-px h-6 bg-[var(--overlay-white-10)]" />
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              const el = scrollerRef.current;
              if (!el) return;
              el.scrollTo({ top: i * el.clientHeight, behavior: 'smooth' });
            }}
            aria-label={`Go to card ${i + 1}`}
            className={`w-1.5 rounded-full transition-all ${
              i === active
                ? 'h-6 bg-[var(--neon-amber)] shadow-[0_0_8px_var(--glow-amber)]'
                : 'h-1.5 bg-[var(--overlay-white-20)] hover:bg-[var(--overlay-white-40)]'
            }`}
          />
        ))}
        <div className="w-px h-6 bg-[var(--overlay-white-10)]" />
        <span className="font-mono text-[11px] text-[var(--fg-3)] mt-1">
          {String(active + 1).padStart(2, '0')}/
          {String(Math.max(items.length, total || items.length)).padStart(
            2,
            '0',
          )}
        </span>
      </div>

      {/* Linear progress — thin bar at top of scroller */}
      <div className="sticky top-0 z-10 h-[2px] bg-[var(--overlay-white-06)] -mx-4">
        <div
          className="h-full transition-all duration-150"
          style={{
            width: `${items.length ? ((active + 1) / items.length) * 100 : 0}%`,
            background:
              'linear-gradient(90deg, var(--neon-amber), var(--neon-lime), var(--neon-ice))',
            boxShadow: '0 0 8px var(--glow-amber-sm)',
          }}
        />
      </div>

      <div
        ref={scrollerRef}
        className="relative -mx-4 h-[calc(100dvh-96px)] md:h-[calc(100dvh-120px)] overflow-y-auto overflow-x-hidden overscroll-contain"
        style={{ scrollSnapType: 'y mandatory', scrollBehavior: 'smooth' }}
        aria-label="Blog reels"
      >
        <div
          ref={containerRef}
          className="absolute inset-0 pointer-events-none"
        >
          <FlashCurtain ref={flashRef} />
        </div>
        {items.map((post, i) => {
          const isActive = i === active;
          return (
            <section
              key={post.id}
              data-slide-index={String(i)}
              className="relative flex items-center justify-center p-4 md:p-6"
              style={
                {
                  height: 'calc(100dvh - 96px)',
                  scrollSnapAlign: 'start',
                  scrollSnapStop: 'always',
                } as React.CSSProperties
              }
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${items.length}: ${post.title}`}
            >
              {/* Full-bleed card chrome — BlogCard vocabulary scaled to viewport */}
              <div
                className={`w-full max-w-3xl transition-all ${
                  isActive ? 'scale-[1.01]' : 'scale-[0.985] opacity-90'
                }`}
              >
                <HudPanel
                  accent={REEL_ACCENTS[i % REEL_ACCENTS.length]}
                  className="overflow-hidden flex flex-col max-h-[min(78dvh,720px)]"
                >
                  {/* Cover — next/image + preload; bottleneck solved as data fetch */}
                  <div
                    className="relative aspect-[16/9] md:aspect-[16/7] overflow-hidden bg-[var(--overlay-black-strong)] shrink-0"
                    data-reel-cover
                  >
                    {post.cover_image_url ? (
                      <Image
                        src={post.cover_image_url}
                        alt={post.cover_image_alt || post.title}
                        layout="fill"
                        objectFit="cover"
                        sizes="(max-width: 768px) 100vw, 720px"
                        priority={i <= 1}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="font-body font-semibold text-4xl text-[var(--fg-3)]">
                          {post.title.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--overlay-black-70)] via-[var(--overlay-black-10)] to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div
                        className="flex items-center gap-2 text-[11px] font-mono"
                        style={{ color: 'var(--fg-2)' }}
                      >
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={11} /> {formatDate(post.published_at)}
                        </span>
                        {post.reading_minutes ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock size={11} /> {post.reading_minutes} min
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1">
                          <Eye size={11} /> {post.view_count ?? 0}
                        </span>
                      </div>
                      <GlitchText
                        as="h2"
                        accent={REEL_ACCENTS[i % REEL_ACCENTS.length]}
                        className="text-xl md:text-2xl mt-1 line-clamp-2"
                      >
                        {post.title}
                      </GlitchText>
                    </div>
                    {post.featured ? (
                      <div className="absolute top-3 left-3">
                        <NeonChip accent="amber">Featured</NeonChip>
                      </div>
                    ) : null}
                  </div>

                  <div className="p-4 space-y-3 overflow-y-auto">
                    {(post.teaser ?? post.excerpt) ? (
                      <p className="text-sm text-[var(--fg-2)] line-clamp-3 leading-relaxed">
                        {post.teaser ?? post.excerpt}
                      </p>
                    ) : null}
                    {post.tags?.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {post.tags.slice(0, 4).map((tag) => (
                          <NeonChip key={tag} accent="amber">
                            {tag}
                          </NeonChip>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <NeonButton
                        accent="amber"
                        onClick={() => openExpanded(post.slug)}
                        disabled={detailLoading === post.slug}
                      >
                        {detailLoading === post.slug
                          ? 'Loading…'
                          : expandedSlug === post.slug
                            ? 'Close'
                            : 'Read'}
                      </NeonButton>
                      <Link href={`/blog/${post.slug}`} legacyBehavior>
                        {/* Translucent amber, expressed as tokens rather than as
                            `neon-amber/30`. A stock-Tailwind accent compiles to
                            a literal hex and therefore cannot respond to the
                            [data-theme='editorial'] scope; a raw `var()` opacity
                            modifier is worse — `border-[var(--x)]/30` and even
                            `border-[color:var(--x)]/30` emit *no* declaration at
                            all in Tailwind 3.4 (parseColor() rejects a bare
                            var(), so withAlphaValue() falls through to its
                            default). `--glow-amber` (0.35) is the nearest token
                            to 0.30 and `--wash-amber` (0.08) the nearest to the
                            0.10 hover wash, matching how the rest of the blog
                            tree already carries amber translucency. `clip-notch-sm`
                            was a backwards-compat alias for this same radius. */}
                        <a className="inline-flex items-center gap-1.5 min-h-[44px] min-w-[44px] px-3 py-2 border border-[var(--glow-amber)] text-[var(--neon-amber)] font-body text-[13px] hover:bg-[var(--wash-amber)] transition-colors rounded-[var(--radius-sm)]">
                          Permalink
                        </a>
                      </Link>
                    </div>
                    {expandedSlug === post.slug && (
                      <div className="pt-3 border-t border-[var(--overlay-white-05)]">
                        <ExpandedDetail
                          post={post}
                          detail={detailCache[post.slug]}
                        />
                      </div>
                    )}
                  </div>
                </HudPanel>

                {/* Swipe hint on first card */}
                {i === 0 && items.length > 1 ? (
                  <div className="flex justify-center mt-3">
                    <span
                      className="inline-flex items-center gap-1 font-mono text-[11px] tracking-[0.1em]"
                      style={{ color: 'var(--fg-3)' }}
                    >
                      Scroll{' '}
                      <ChevronDown size={12} className="animate-bounce" />
                    </span>
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}

        {/* Sentinel: buffer end state */}
        <div
          className="flex justify-center py-6"
          style={{ scrollSnapAlign: 'start' }}
        >
          {loading ? (
            <span
              className="font-body text-[13px]"
              style={{ color: 'var(--fg-3)' }}
            >
              Loading more…
            </span>
          ) : hasMore ? (
            <NeonButton accent="amber" variant="outline" onClick={onLoadMore}>
              Load more
            </NeonButton>
          ) : (
            <span
              className="font-body text-[13px]"
              style={{ color: 'var(--fg-3)' }}
            >
              End of the archive — {String(total).padStart(2, '0')} entries
            </span>
          )}
        </div>
      </div>

      {/* Expanded overlay for active post (reels stays underneath) */}
      <ExpandedOverlay
        slug={expandedSlug}
        detail={expandedSlug ? detailCache[expandedSlug] : undefined}
        detailLoading={!!detailLoading}
        onClose={() => setExpandedSlug(null)}
      />
    </>
  );
}

function ReelsCardInner({
  post,
  i,
  onExpand,
  expanded,
  detail,
  detailLoading,
  onClose,
}: {
  post: BlogListItem;
  i: number;
  onExpand: () => void;
  expanded: boolean;
  detail?: BlogPost;
  detailLoading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="p-4 space-y-3">
      <div
        className="flex items-center gap-2 text-[11px] font-mono"
        style={{ color: 'var(--fg-3)' }}
      >
        <Calendar size={11} /> {formatDate(post.published_at)}
        {post.reading_minutes ? (
          <span className="inline-flex items-center gap-1">
            <Clock size={11} /> {post.reading_minutes} min
          </span>
        ) : null}
        <Eye size={11} /> {post.view_count ?? 0}
      </div>
      <div className="font-body font-semibold text-lg text-[var(--fg-1)]">
        {post.title}
      </div>
      {(post.teaser ?? post.excerpt) ? (
        <p className="text-sm text-[var(--fg-2)] line-clamp-3 leading-relaxed">
          {post.teaser ?? post.excerpt}
        </p>
      ) : null}
      <div className="flex gap-2">
        <NeonButton
          accent="amber"
          onClick={expanded ? onClose : onExpand}
          disabled={detailLoading}
        >
          {detailLoading ? 'Loading…' : expanded ? 'Close' : 'Read'}
        </NeonButton>
        <Link href={`/blog/${post.slug}`} legacyBehavior>
          <a className="inline-flex items-center min-h-[44px] min-w-[44px] px-3 py-2 border border-[var(--glow-amber)] text-[var(--neon-amber)] font-body text-[13px] rounded-[var(--radius-sm)]">
            Permalink
          </a>
        </Link>
      </div>
      {expanded ? <ExpandedDetail post={post} detail={detail} /> : null}
      {/* --fg-3, not --fg-4: at 11px this needs the full AA text ratio and
          --fg-4 (4.66:1 on --bg-3) is only barely there. */}
      <div className="text-[11px]" style={{ color: 'var(--fg-3)' }}>
        #{String(i + 1).padStart(2, '0')}
      </div>
    </div>
  );
}

function ExpandedDetail({
  post,
  detail,
}: {
  post: BlogListItem;
  detail?: BlogPost;
}) {
  const html = detail?.content_html || post.excerpt || '';
  const isHtml = !!detail?.content_html;
  if (!html)
    return (
      <p className="text-sm" style={{ color: 'var(--fg-3)' }}>
        No content yet.
      </p>
    );
  if (isHtml)
    return (
      <RichTextRenderer
        html={html}
        className="max-h-[50dvh] overflow-y-auto pr-2"
      />
    );
  return (
    <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-2)' }}>
      {html}
    </p>
  );
}

function ExpandedOverlay({
  slug,
  detail,
  detailLoading,
  onClose,
}: {
  slug: string | null;
  detail?: BlogPost;
  detailLoading: boolean;
  onClose: () => void;
}) {
  if (!slug) return null;
  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-end md:items-center justify-center p-4 bg-[var(--overlay-black-60)] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      {/* `z-[var(--z-modal)]` (200) rather than a bare `z-40`. The two are not
          equivalent, and the old number was a coincidence rather than a layer:
          the sticky archive header in `BlogHeader` is `--z-header`, which is
          also 40, so the dialog only covered that header because it happened to
          come later in the DOM. Name the band instead of tying with it.

          It beats the shell's fixed accent strip (`--z-hud`, 30) outright, which
          is the point — but only now that the page root in `blog/index.tsx` has
          no z-index of its own to trap this in. The ceiling is the stage, not
          this number: `RouteTransition` renders the page inside a `z-10` stage
          with its `z-[85]` curtain as a SIBLING, so nothing inside the page can
          reach the curtain no matter how high it is set. */}
      <div
        className="w-full max-w-3xl max-h-[85dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <HudPanel accent="amber" className="p-4 md:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center border border-[var(--overlay-white-10)] hover:border-[var(--glow-amber)] text-[var(--fg-3)] hover:text-[var(--fg-1)] transition-colors rounded-[var(--radius-sm)] after:absolute after:inset-[-6px] after:content-['']"
            aria-label="Close"
          >
            <X size={14} />
          </button>
          {detailLoading ? (
            <p className="font-body text-sm" style={{ color: 'var(--fg-3)' }}>
              Loading the full post…
            </p>
          ) : detail ? (
            <div className="space-y-4">
              <div className="pr-8">
                <GlitchText
                  as="h2"
                  accent="amber"
                  className="text-xl md:text-2xl"
                >
                  {detail.title}
                </GlitchText>
                {detail.excerpt ? (
                  <p className="text-sm text-[var(--fg-2)] mt-2 leading-relaxed">
                    {detail.excerpt}
                  </p>
                ) : null}
              </div>
              <RichTextRenderer html={detail.content_html} />
              <div className="flex gap-2 pt-2">
                <Link href={`/blog/${detail.slug}`} legacyBehavior>
                  <a className="inline-flex items-center gap-1 min-h-[44px] min-w-[44px] px-3 py-2 bg-[var(--wash-amber)] border border-[var(--glow-amber)] text-[var(--neon-amber)] font-body text-[13px] rounded-[var(--radius-sm)]">
                    Open page
                  </a>
                </Link>
                <NeonButton accent="coral" variant="outline" onClick={onClose}>
                  Close
                </NeonButton>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pr-8">
              <p className="font-body font-semibold text-sm text-[var(--fg-1)]">
                Could not load the full post. Open the permalink instead.
              </p>
              <Link href={`/blog/${slug}`} legacyBehavior>
                <a className="inline-flex items-center min-h-[44px] min-w-[44px] px-3 py-2 border border-[var(--glow-amber)] text-[var(--neon-amber)] font-body text-[13px] rounded-[var(--radius-sm)]">
                  Open /blog/{slug}
                </a>
              </Link>
            </div>
          )}
        </HudPanel>
      </div>
    </div>
  );
}
