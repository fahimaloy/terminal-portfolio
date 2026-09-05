// src/components/blog/BlogReels.tsx
// Reels-style blog: scroll-snap y mandatory, near-fullscreen cards,
// reuses BlogCard chrome (HudPanel+Tilt3D), LightningTransition per-card,
// ReadingProgress → pager dots, RichTextRenderer for expanded view.
// Preserves /blog/[slug] SSR route — expanded is in-place overlay.
// Respects isReducedMotion(): stacked static fallback.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown, X, Calendar, Clock, Eye } from 'lucide-react';
import { isReducedMotion } from '../../config/animations';
import {
  useCoverPreload,
  useBulkCoverPreload,
} from '../../hooks/useCoverPreload';
import { getBlogPost } from '../../utils/blogApi';
import type { BlogListItem, BlogPost } from '../../types/blog';
import { HudPanel, NeonChip, NeonButton, GlitchText } from '../ui';
import LightningTransition from './LightningTransition';
import RichTextRenderer from '../RichTextRenderer';

function formatDate(iso: string | null): string {
  if (!iso) return 'DRAFT';
  return new Date(iso)
    .toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    .toUpperCase();
}

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
  const reduced = typeof window !== 'undefined' ? isReducedMotion() : false;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [bolt, setBolt] = useState(0);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, BlogPost>>({});
  const [detailLoading, setDetailLoading] = useState<string | null>(null);

  const coverUrls = items.map((p) => p.cover_image_url);
  useCoverPreload(coverUrls, active);
  useBulkCoverPreload(items.slice(0, 5).map((p) => p.cover_image_url));

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

  // Lightning per-card transition (not route change).
  const prevActiveRef = useRef(active);
  useEffect(() => {
    if (prevActiveRef.current !== active && !reduced) {
      prevActiveRef.current = active;
      setBolt((t) => t + 1);
    }
  }, [active, reduced]);

  // Preload / buffer append when near end.
  useEffect(() => {
    if (!hasMore || loading) return;
    if (active >= items.length - 2) onLoadMore();
  }, [active, hasMore, loading, items.length, onLoadMore]);

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
            accent={(['cyan', 'magenta', 'yellow', 'green'] as const)[i % 4]}
            notch="md"
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
              accent="cyan"
              variant="outline"
              onClick={onLoadMore}
              disabled={loading}
            >
              {loading ? 'LOADING…' : 'LOAD MORE'}
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
        <div className="w-px h-6 bg-white/10" />
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
                ? 'h-6 bg-neon-cyan shadow-[0_0_8px_var(--glow-cyan)]'
                : 'h-1.5 bg-white/20 hover:bg-white/40'
            }`}
          />
        ))}
        <div className="w-px h-6 bg-white/10" />
        <span className="font-mono text-[9px] text-text-muted mt-1">
          {String(active + 1).padStart(2, '0')}/
          {String(Math.max(items.length, total || items.length)).padStart(
            2,
            '0',
          )}
        </span>
      </div>

      {/* Linear progress — thin bar at top of scroller */}
      <div className="sticky top-0 z-10 h-[2px] bg-white/[0.06] -mx-4">
        <div
          className="h-full transition-all duration-150"
          style={{
            width: `${items.length ? ((active + 1) / items.length) * 100 : 0}%`,
            background:
              'linear-gradient(90deg, var(--neon-cyan), var(--neon-yellow), var(--neon-magenta))',
            boxShadow: '0 0 8px var(--glow-cyan-sm)',
          }}
        />
      </div>

      <div
        ref={scrollerRef}
        className="relative -mx-4 h-[calc(100dvh-96px)] md:h-[calc(100dvh-120px)] overflow-y-auto overflow-x-hidden overscroll-contain"
        style={{ scrollSnapType: 'y mandatory', scrollBehavior: 'smooth' }}
        aria-label="Blog reels"
      >
        {items.map((post, i) => {
          const isActive = i === active;
          return (
            <section
              key={post.id}
              className="relative flex items-center justify-center p-4 md:p-6"
              // @ts-ignore scrollSnapStop not in some csstype/React.CSSProperties lib versions — valid CSS at runtime
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
                  accent={
                    (['cyan', 'magenta', 'yellow', 'green'] as const)[i % 4]
                  }
                  notch="md"
                  className="overflow-hidden flex flex-col max-h-[min(78dvh,720px)]"
                >
                  {/* Cover — next/image + preload; bottleneck solved as data fetch */}
                  <div className="relative aspect-[16/9] md:aspect-[16/7] overflow-hidden bg-black/40 shrink-0">
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
                        <span className="font-display text-4xl text-text-muted">
                          {post.title.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="flex items-center gap-2 text-[10px] font-mono text-white/80">
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={10} /> {formatDate(post.published_at)}
                        </span>
                        {post.reading_minutes ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock size={10} /> {post.reading_minutes} MIN
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1">
                          <Eye size={10} /> {post.view_count ?? 0}
                        </span>
                      </div>
                      <GlitchText
                        as="h2"
                        accent={
                          (['cyan', 'magenta', 'yellow', 'green'] as const)[
                            i % 4
                          ]
                        }
                        className="text-xl md:text-2xl mt-1 line-clamp-2"
                      >
                        {post.title}
                      </GlitchText>
                    </div>
                    {post.featured ? (
                      <div className="absolute top-3 left-3">
                        <NeonChip accent="yellow">FEATURED</NeonChip>
                      </div>
                    ) : null}
                  </div>

                  <div className="p-4 space-y-3 overflow-y-auto">
                    {post.excerpt ? (
                      <p className="text-sm text-text-secondary line-clamp-3">
                        {post.excerpt}
                      </p>
                    ) : null}
                    {post.tags?.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {post.tags.slice(0, 4).map((tag) => (
                          <NeonChip key={tag} accent="cyan">
                            {tag.toUpperCase()}
                          </NeonChip>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <NeonButton
                        accent="cyan"
                        onClick={() => openExpanded(post.slug)}
                        disabled={detailLoading === post.slug}
                      >
                        {detailLoading === post.slug
                          ? 'LOADING…'
                          : expandedSlug === post.slug
                          ? 'CLOSE'
                          : 'READ'}
                      </NeonButton>
                      <Link href={`/blog/${post.slug}`} legacyBehavior>
                        <a className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-neon-yellow/30 text-neon-yellow font-display text-[11px] tracking-[1.5px] hover:bg-neon-yellow/10 transition-colors clip-notch-sm">
                          PERMALINK
                        </a>
                      </Link>
                    </div>
                    {expandedSlug === post.slug && (
                      <div className="pt-3 border-t border-white/5">
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
                  <div className="flex justify-center mt-3 text-text-muted">
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] tracking-[2px] opacity-60">
                      SWIPE <ChevronDown size={12} className="animate-bounce" />
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
            <span className="font-mono text-[11px] text-text-muted">
              LOADING NEXT TRANSMISSIONS…
            </span>
          ) : hasMore ? (
            <NeonButton accent="cyan" variant="outline" onClick={onLoadMore}>
              LOAD MORE
            </NeonButton>
          ) : (
            <span className="font-mono text-[11px] text-text-muted">
              END OF TRANSMISSIONS — {String(total).padStart(2, '0')} ENTRIES
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
      <div className="flex items-center gap-2 text-[10px] font-mono text-text-muted">
        <Calendar size={10} /> {formatDate(post.published_at)}
        {post.reading_minutes ? (
          <span className="inline-flex items-center gap-1">
            <Clock size={10} /> {post.reading_minutes} MIN
          </span>
        ) : null}
        <Eye size={10} /> {post.view_count ?? 0}
      </div>
      <div className="font-display text-lg text-text-primary">{post.title}</div>
      {post.excerpt ? (
        <p className="text-sm text-text-secondary line-clamp-3">
          {post.excerpt}
        </p>
      ) : null}
      <div className="flex gap-2">
        <NeonButton
          accent="cyan"
          onClick={expanded ? onClose : onExpand}
          disabled={detailLoading}
        >
          {detailLoading ? 'LOADING…' : expanded ? 'CLOSE' : 'READ'}
        </NeonButton>
        <Link href={`/blog/${post.slug}`} legacyBehavior>
          <a className="inline-flex items-center px-3 py-1.5 border border-neon-yellow/30 text-neon-yellow font-display text-[11px] clip-notch-sm">
            PERMALINK
          </a>
        </Link>
      </div>
      {expanded ? <ExpandedDetail post={post} detail={detail} /> : null}
      <div className="text-[10px] text-text-muted">
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
  if (!html) return <p className="text-sm text-text-muted">No content.</p>;
  if (isHtml)
    return (
      <RichTextRenderer
        html={html}
        className="max-h-[50dvh] overflow-y-auto pr-2"
      />
    );
  return <p className="text-sm text-text-secondary">{html}</p>;
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
      className="fixed inset-0 z-40 flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[85dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <HudPanel accent="yellow" notch="md" className="p-4 md:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center border border-white/10 hover:border-neon-cyan/40 text-text-muted hover:text-text-primary transition-colors clip-notch-sm"
            aria-label="Close"
          >
            <X size={14} />
          </button>
          {detailLoading ? (
            <p className="font-mono text-sm text-text-muted">
              LOADING TRANSMISSION…
            </p>
          ) : detail ? (
            <div className="space-y-4">
              <div className="pr-8">
                <GlitchText
                  as="h2"
                  accent="yellow"
                  className="text-xl md:text-2xl"
                >
                  {detail.title}
                </GlitchText>
                {detail.excerpt ? (
                  <p className="text-sm text-text-secondary mt-2">
                    {detail.excerpt}
                  </p>
                ) : null}
              </div>
              <RichTextRenderer html={detail.content_html} />
              <div className="flex gap-2 pt-2">
                <Link href={`/blog/${detail.slug}`} legacyBehavior>
                  <a className="inline-flex items-center gap-1 px-3 py-1.5 bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan font-display text-[11px] clip-notch-sm">
                    OPEN PAGE
                  </a>
                </Link>
                <NeonButton
                  accent="magenta"
                  variant="outline"
                  onClick={onClose}
                >
                  CLOSE
                </NeonButton>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pr-8">
              <p className="font-display text-sm text-text-primary">
                Could not load full transmission. Use permalink.
              </p>
              <Link href={`/blog/${slug}`} legacyBehavior>
                <a className="inline-flex items-center px-3 py-1.5 border border-neon-cyan/30 text-neon-cyan font-display text-[11px] clip-notch-sm">
                  OPEN /blog/{slug}
                </a>
              </Link>
            </div>
          )}
        </HudPanel>
      </div>
    </div>
  );
}
