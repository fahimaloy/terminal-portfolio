import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SEOMeta from '../../components/SEOMeta';
import BlogHeader from '../../components/blog/BlogHeader';
import BlogGrid from '../../components/blog/BlogGrid';
import BlogReels from '../../components/blog/BlogReels';
import { getBlogPosts } from '../../utils/blogApi';
import type {
  BlogListItem,
  BlogSort,
  BlogTagFacet,
  BlogView,
} from '../../types/blog';
import BlogEmptyGraphic from '../../components/ui/graphics/compositions/BlogEmptyGraphic';
import { createScope, createTimeline, stagger } from 'animejs';
import { splitText, type TextSplitter } from 'animejs';
import {
  isReducedMotion,
  canAnimate,
  durations,
  easings,
} from '../../config/animations';

const REELS_PAGE_SIZE = 5;
const GRID_PAGE_SIZE = 9;

/** Reads a single query param without tripping Next's array|string union. */
const q = (v: string | string[] | undefined): string =>
  (Array.isArray(v) ? v[0] : v)?.trim() ?? '';

export default function BlogIndexPage() {
  const router = useRouter();
  const [items, setItems] = useState<BlogListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [sort, setSort] = useState<BlogSort>('recent');
  const [view, setView] = useState<BlogView>('grid');
  const [facets, setFacets] = useState<BlogTagFacet[]>([]);
  const [loading, setLoading] = useState(true);
  const emptyRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<HTMLElement>(null);

  const ready = router.isReady;
  const pageSize = view === 'reels' ? REELS_PAGE_SIZE : GRID_PAGE_SIZE;

  // Hydrate from the URL once, so a shared or bookmarked filtered view renders
  // the same result. Filters are not stored in component state alone.
  useEffect(() => {
    if (!ready) return;
    const r = router.query;
    setSearch(q(r.q));
    setTag(q(r.tag));
    const s = q(r.sort);
    setSort(s === 'popular' ? 'popular' : 'recent');
    const v = q(r.view);
    setView(v === 'reels' ? 'reels' : 'grid');
  }, [ready]);

  // Mirror state back into the URL (shallow — no data refetch from the router).
  useEffect(() => {
    if (!ready) return;
    const next: Record<string, string> = {};
    if (search) next.q = search;
    if (tag) next.tag = tag;
    if (sort !== 'recent') next.sort = sort;
    if (view !== 'grid') next.view = view;
    const qs = new URLSearchParams(next).toString();
    const target = qs ? `/blog?${qs}` : '/blog';
    if (router.asPath !== target) {
      router.replace(target, undefined, { shallow: true, scroll: false });
    }
  }, [ready, search, tag, sort, view]);

  // Filters reset pagination + replace the buffer.
  useEffect(() => {
    setPage(1);
  }, [search, tag, sort, view]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setLoading(true);
    getBlogPosts({
      page,
      pageSize,
      search,
      tag,
      sort,
      facets: true,
    }).then((res) => {
      if (cancelled) return;
      setTotal(res.total);
      setHasMore(res.hasMore);
      if (res.facets) setFacets(res.facets);
      if (page === 1) setItems(res.items);
      else {
        setItems((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...res.items.filter((p) => !seen.has(p.id))];
        });
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, page, pageSize, search, tag, sort]);
  const onLoadMore = useCallback(() => {
    if (!hasMore || loading) return;
    setPage((p) => p + 1);
  }, [hasMore, loading]);

  const isEmpty = !loading && items.length === 0;
  const showList = !isEmpty && (items.length > 0 || loading);
  const hasFilters = Boolean(search || tag || sort !== 'recent');
  const emptyVariant = hasFilters ? 'no-results' : 'empty';
  const headlineText = hasFilters ? 'No matches' : 'Nothing here yet';

  // One-time beat for the mode change. The homepage is a cyan HUD and the blog
  // is a warm room; until now the two swapped with nothing between them —
  // LightningTransition only fires between slugs, so the discontinuity landed
  // on the route a visitor takes straight out of the hero. One warm breath of
  // light over the room, and the deck line lifting into place. Atmosphere, not
  // choreography: no stagger cascade, no transform on the grid, nothing the
  // reader has to wait for.
  //
  // The veil rests at opacity 0 in the markup, so the reduced-motion path and
  // the no-JS path are the same no-op — an invisible element, never a scrim
  // stranded over the page. The deck is NOT hidden in markup: content first,
  // and it only hides if this effect actually runs and can finish.
  useEffect(() => {
    const root = roomRef.current;
    if (!root) return;
    if (isReducedMotion() || !canAnimate()) return;

    const scope = createScope({
      root,
      mediaQueries: { reduceMotion: '(prefers-reduced-motion: reduce)' },
      defaults: {
        duration: durations.enter * 1000,
        ease: (easings.outExpo ?? 'outExpo') as string,
        composition: 'blend',
      },
    } as Parameters<typeof createScope>[0]);

    scope.add(() => {
      const veil = root.querySelector<HTMLElement>('.room-veil');
      const deck = root.querySelector<HTMLElement>('.blog-deck');
      if (!veil || !deck) return;

      deck.style.opacity = '0';
      deck.style.transform = 'translateY(10px)';

      const tl = createTimeline({
        defaults: { ease: (easings.outExpo ?? 'outExpo') as string },
      } as unknown as Parameters<typeof createTimeline>[0]) as unknown as {
        add: (a: unknown, b: unknown, c?: unknown) => void;
      };

      tl.add(
        veil,
        {
          opacity: [0.9, 0],
          duration: durations.enter * 1000 * 1.55,
          ease: (easings.outExpo ?? 'outExpo') as string,
        } as unknown as Record<string, unknown>,
        0,
      );
      tl.add(
        deck,
        {
          opacity: [0, 1],
          y: [10, 0],
          duration: durations.enter * 1000 * 0.78,
          ease: (easings.outExpo ?? 'outExpo') as string,
        } as unknown as Record<string, unknown>,
        durations.enter * 1000 * 0.18,
      );
    });

    return () => {
      try {
        scope.revert();
      } catch {
        // scope may already be gone on unmount
      }
    };
  }, []);

  // Empty-state entrance: headline splitText chars stagger + graphic/CTA via createTimeline
  useEffect(() => {
    if (!isEmpty) return;
    const root = emptyRef.current;
    if (!root) return;

    const reduced = isReducedMotion() || !canAnimate();

    const scope = createScope({
      root,
      mediaQueries: { reduceMotion: '(prefers-reduced-motion: reduce)' },
      defaults: {
        duration: (durations.enter ?? 0.48) * 1000,
        ease: (easings.smooth ?? 'outExpo') as string,
        composition: 'blend',
      },
    } as Parameters<typeof createScope>[0]);

    let headlineSplitter: TextSplitter | null = null;

    scope.add(() => {
      const graphic = root.querySelectorAll<HTMLElement>('.blog-empty-graphic');
      const headlineEl = root.querySelector<HTMLElement>(
        '.blog-empty-headline',
      );
      const subcopy = root.querySelectorAll<HTMLElement>('.blog-empty-subcopy');
      const cta = root.querySelectorAll<HTMLElement>('.blog-empty-cta');

      // Reset to initial hidden state so rapid isEmpty toggles always re-fade
      const hiddenTransform = reduced
        ? {
            graphic: '',
            headline: 'translateY(8px)',
            subcopy: 'translateY(8px)',
            cta: 'translateY(8px)',
          }
        : {
            graphic: 'translateY(14px)',
            headline: 'translateY(12px)',
            subcopy: 'translateY(10px)',
            cta: 'translateY(10px)',
          };
      graphic.forEach((el) => {
        el.style.opacity = '0';
        el.style.transform = hiddenTransform.graphic;
      });
      if (headlineEl) {
        headlineEl.style.opacity = '0';
        headlineEl.style.transform = hiddenTransform.headline;
      }
      subcopy.forEach((el) => {
        el.style.opacity = '0';
        el.style.transform = hiddenTransform.subcopy;
      });
      cta.forEach((el) => {
        el.style.opacity = '0';
        el.style.transform = hiddenTransform.cta;
      });

      if (reduced) {
        const tl = createTimeline({
          defaults: { ease: (easings.smooth ?? 'outExpo') as string },
        } as unknown as Parameters<typeof createTimeline>[0]) as unknown as {
          add: (a: unknown, b: unknown, c?: unknown) => void;
        };
        if (graphic.length)
          tl.add(
            graphic as unknown as HTMLElement[],
            {
              opacity: [0, 1],
              duration: durations.enter * 1000 * 0.5,
            } as unknown as Record<string, unknown>,
            0,
          );
        if (headlineEl)
          tl.add(
            headlineEl as unknown as HTMLElement,
            {
              opacity: [0, 1],
              y: [8, 0],
              duration: durations.enter * 1000 * 0.65,
            } as unknown as Record<string, unknown>,
            stagger(durations.stagger * 1000 * 0.67),
          );
        if (subcopy.length)
          tl.add(
            subcopy as unknown as HTMLElement[],
            {
              opacity: [0, 1],
              y: [8, 0],
              duration: durations.enter * 1000 * 0.56,
            } as unknown as Record<string, unknown>,
            stagger(durations.stagger * 1000 * 0.67),
          );
        if (cta.length)
          tl.add(
            cta as unknown as HTMLElement[],
            {
              opacity: [0, 1],
              y: [8, 0],
              duration: durations.enter * 1000 * 0.56,
            } as unknown as Record<string, unknown>,
            stagger(durations.stagger * 1000 * 0.67),
          );
        return;
      }

      const tl = createTimeline({
        defaults: { ease: (easings.smooth ?? 'outExpo') as string },
      } as unknown as Parameters<typeof createTimeline>[0]) as unknown as {
        add: (a: unknown, b: unknown, c?: unknown) => void;
      };

      if (graphic.length) {
        tl.add(
          graphic as unknown as HTMLElement[],
          {
            opacity: [0, 1],
            y: [14, 0],
            duration: (durations.enter ?? 0.48) * 1000 * 0.52,
            ease: (easings.smooth ?? 'outExpo') as string,
          } as unknown as Record<string, unknown>,
          0,
        );
      }

      try {
        if (headlineEl) {
          headlineSplitter = splitText(headlineEl, {
            chars: true,
            words: { wrap: 'clip' },
          });
        }
      } catch {
        headlineSplitter = null;
      }

      const headlineChars =
        (headlineSplitter?.chars as unknown as HTMLElement[]) ?? [];
      if (headlineChars.length) {
        tl.add(
          headlineChars as unknown as HTMLElement[],
          {
            y: ['112%', '0%'],
            opacity: [0, 1],
            duration: (durations.enter ?? 0.48) * 1000 * 0.5,
            ease: (easings.expoOut ?? 'outExpo') as string,
            delay: stagger(durations.stagger * 1000 * 0.3, { from: 'first' }),
          } as unknown as Record<string, unknown>,
          stagger(durations.stagger * 1000 * 0.67),
        );
      } else if (headlineEl) {
        tl.add(
          headlineEl as unknown as HTMLElement,
          {
            y: [12, 0],
            opacity: [0, 1],
            duration: (durations.enter ?? 0.48) * 1000 * 0.52,
            ease: (easings.smooth ?? 'outExpo') as string,
          } as unknown as Record<string, unknown>,
          stagger(durations.stagger * 1000 * 0.67),
        );
      }

      if (subcopy.length) {
        tl.add(
          subcopy as unknown as HTMLElement[],
          {
            y: [10, 0],
            opacity: [0, 1],
            duration: (durations.enter ?? 0.48) * 1000 * 0.65,
            ease: (easings.smooth ?? 'outExpo') as string,
          } as unknown as Record<string, unknown>,
          stagger(durations.stagger * 1000 * 0.83),
        );
      }

      if (cta.length) {
        tl.add(
          cta as unknown as HTMLElement[],
          {
            y: [10, 0],
            opacity: [0, 1],
            duration: (durations.enter ?? 0.48) * 1000 * 0.65,
            ease: (easings.smooth ?? 'outExpo') as string,
          } as unknown as Record<string, unknown>,
          stagger(durations.stagger * 1000 * 0.83),
        );
      }
    });

    return () => {
      // Scope FIRST, then the splitter. Reverting the splitter rebuilds the
      // DOM the scope is still bound to, so the order is load-bearing — the
      // same rule HeroSection and useMotionScope document.
      try {
        scope.revert();
      } catch {
        // scope may already be gone on a rapid empty ⇄ non-empty toggle
      }
      try {
        headlineSplitter?.revert();
      } catch {
        // splitText may have been GC'd after rapid unmount — ignore
      }
    };
  }, [isEmpty, search, tag]);

  return (
    <>
      <SEOMeta
        title="Blog"
        description="Engineering notes, build logs, and deep dives on full-stack development by Fahim Ahmed."
        path="/blog"
      />

      {/* `editorial-room` carries the room's display voice — see the rule in
            global.css. The h1 is rendered by BlogHeader. */}
      <main
        ref={roomRef}
        className="editorial-room min-h-screen relative z-10 px-4 pt-24 pb-10 max-w-6xl mx-auto"
        data-theme="editorial"
      >
        {/* The mode-change beat. Painted with the reading room's own wash token
            and decorative only; it fades in and clears once on mount. */}
        <div
          aria-hidden="true"
          className="room-veil pointer-events-none absolute inset-0"
          style={{
            opacity: 0,
            background:
              'radial-gradient(120% 78% at 50% 0%, var(--wash-amber), transparent 62%)',
          }}
        />

        <BlogHeader
          search={search}
          onSearch={setSearch}
          tag={tag}
          onTag={setTag}
          sort={sort}
          onSort={setSort}
          view={view}
          onView={setView}
          facets={facets}
          total={total}
        />

        <p
          className="blog-deck font-body text-sm md:text-base mt-8 mb-8 max-w-xl mx-auto text-center leading-relaxed"
          style={{ color: 'var(--fg-2)' }}
        >
          Build logs, engineering notes and deep dives from the terminal.
        </p>

        {/* Loading skeleton — initial buffer only */}
        {loading && items.length === 0 ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-[56dvh] rounded-[var(--radius-lg)] border animate-pulse"
                style={{
                  background: 'var(--bg-2)',
                  borderColor: 'var(--border-subtle)',
                }}
              />
            ))}
          </div>
        ) : isEmpty ? (
          <div
            key={emptyVariant}
            ref={emptyRef}
            className="p-8 text-center rounded-[var(--radius-lg)] border"
            style={{
              background:
                'radial-gradient(120% 90% at 50% 0%, var(--wash-amber), transparent 55%), var(--bg-2)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="blog-empty-graphic max-w-md mx-auto reveal">
              <BlogEmptyGraphic
                variant={emptyVariant as 'empty' | 'no-results'}
              />
            </div>
            <h2
              className="blog-empty-headline font-body font-semibold text-lg md:text-xl tracking-[-0.01em] mt-6 reveal"
              style={{ color: 'var(--fg-1)' }}
            >
              {headlineText}
            </h2>
            {hasFilters ? (
              <>
                <p
                  className="blog-empty-subcopy font-body text-sm mt-2 reveal"
                  style={{ color: 'var(--fg-2)' }}
                >
                  Adjust your filters and try again.
                </p>
                <div className="blog-empty-cta mt-4 flex justify-center gap-2 reveal">
                  <button
                    onClick={() => {
                      // Must reset sort too: hasFilters folds sort into the
                      // empty-state test, so clearing search+tag alone leaves
                      // a sort-only filter behind and the CTA dead-ends.
                      setSearch('');
                      setTag('');
                      setSort('recent');
                    }}
                    className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-4 py-2 font-body text-sm border rounded-[var(--radius-md)] transition-colors hover:border-[var(--glow-amber-sm)] hover:text-[var(--neon-amber)]"
                    style={{
                      background: 'transparent',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--fg-2)',
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              </>
            ) : (
              <>
                <p
                  className="blog-empty-subcopy font-body text-sm mt-2 reveal"
                  style={{ color: 'var(--fg-2)' }}
                >
                  Nothing published yet — check back soon.
                </p>
                <div className="blog-empty-cta mt-4 flex justify-center gap-2 reveal">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-4 py-2 font-body text-sm border rounded-[var(--radius-md)] hover:border-[var(--glow-amber-sm)] hover:text-[var(--neon-amber)]"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--fg-2)',
                    }}
                  >
                    Back home
                  </Link>
                </div>
              </>
            )}
          </div>
        ) : showList ? (
          view === 'reels' ? (
            <BlogReels
              items={items}
              total={total}
              hasMore={hasMore}
              loading={loading}
              onLoadMore={onLoadMore}
              activeTag={tag}
            />
          ) : (
            <BlogGrid
              items={items}
              loading={loading}
              onLoadMore={onLoadMore}
              hasMore={hasMore}
            />
          )
        ) : null}
      </main>
    </>
  );
}
