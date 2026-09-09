import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import SEOMeta from '../../components/SEOMeta';
import BlogSearch from '../../components/blog/BlogSearch';
import BlogReels from '../../components/blog/BlogReels';
import { getBlogPosts } from '../../utils/blogApi';
import type { BlogListItem } from '../../types/blog';
import BlogEmptyGraphic from '../../components/ui/graphics/compositions/BlogEmptyGraphic';
import { createScope, createTimeline, stagger } from 'animejs';
import { splitText } from 'animejs';
import {
  isReducedMotion,
  canAnimate,
  durations,
  easings,
} from '../../config/animations';

const REELS_PAGE_SIZE = 5;

export default function BlogIndexPage() {
  const [items, setItems] = useState<BlogListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [sort, setSort] = useState<'recent' | 'popular'>('recent');
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const emptyRef = useRef<HTMLDivElement>(null);

  // Filters reset pagination + replace buffer — preserves existing invariant.
  useEffect(() => {
    setPage(1);
  }, [search, tag, sort]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getBlogPosts({ page, pageSize: REELS_PAGE_SIZE, search, tag, sort }).then(
      (res) => {
        if (cancelled) return;
        setTotal(res.total);
        setHasMore(res.hasMore);
        if (page === 1) setItems(res.items);
        else {
          setItems((prev) => {
            const seen = new Set(prev.map((p) => p.id));
            return [...prev, ...res.items.filter((p) => !seen.has(p.id))];
          });
        }
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [page, search, tag, sort]);

  const onLoadMore = useCallback(() => {
    if (!hasMore || loading) return;
    setPage((p) => p + 1);
  }, [hasMore, loading]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    items.forEach((p) => p.tags?.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [items]);

  const isEmpty = !loading && items.length === 0;
  const showReels = !isEmpty && (items.length > 0 || loading);
  const hasFilters = Boolean(search || tag);
  const emptyVariant = hasFilters ? 'no-results' : 'empty';
  const headlineText = hasFilters ? 'NO MATCHES' : 'NO TRANSMISSIONS FOUND';

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

    let headlineSplitter: ReturnType<typeof splitText> | null = null;

    scope.add(() => {
      const graphic = root.querySelectorAll<HTMLElement>('.blog-empty-graphic');
      const headlineEl = root.querySelector<HTMLElement>(
        '.blog-empty-headline',
      );
      const subcopy = root.querySelectorAll<HTMLElement>('.blog-empty-subcopy');
      const cta = root.querySelectorAll<HTMLElement>('.blog-empty-cta');

      if (reduced) {
        const tl = createTimeline({
          defaults: { ease: (easings.smooth ?? 'outExpo') as string },
        } as unknown as Parameters<typeof createTimeline>[0]) as unknown as {
          add: (a: unknown, b: unknown, c?: unknown) => void;
        };
        if (graphic.length)
          tl.add(
            graphic as unknown as HTMLElement[],
            { opacity: [0, 1], duration: 320 } as unknown as Record<
              string,
              unknown
            >,
            0,
          );
        if (headlineEl)
          tl.add(
            headlineEl as unknown as HTMLElement,
            { opacity: [0, 1], y: [8, 0], duration: 420 } as unknown as Record<
              string,
              unknown
            >,
            stagger(40),
          );
        if (subcopy.length)
          tl.add(
            subcopy as unknown as HTMLElement[],
            { opacity: [0, 1], y: [8, 0], duration: 360 } as unknown as Record<
              string,
              unknown
            >,
            stagger(40),
          );
        if (cta.length)
          tl.add(
            cta as unknown as HTMLElement[],
            { opacity: [0, 1], y: [8, 0], duration: 360 } as unknown as Record<
              string,
              unknown
            >,
            stagger(40),
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
            delay: stagger(18, { from: 'first' }),
          } as unknown as Record<string, unknown>,
          stagger(40),
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
          stagger(40),
        );
      }

      if (subcopy.length) {
        tl.add(
          subcopy as unknown as HTMLElement[],
          {
            y: [10, 0],
            opacity: [0, 1],
            duration: 420,
            ease: (easings.smooth ?? 'outExpo') as string,
          } as unknown as Record<string, unknown>,
          stagger(50),
        );
      }

      if (cta.length) {
        tl.add(
          cta as unknown as HTMLElement[],
          {
            y: [10, 0],
            opacity: [0, 1],
            duration: 420,
            ease: (easings.smooth ?? 'outExpo') as string,
          } as unknown as Record<string, unknown>,
          stagger(50),
        );
      }
    });

    return () => {
      try {
        headlineSplitter?.revert();
      } catch {
        // ignore revert failure
      }
      scope.revert();
    };
  }, [isEmpty, search, tag]);

  return (
    <>
      <SEOMeta
        title="Blog"
        description="Engineering notes, build logs, and deep dives on full-stack development by Fahim Ahmed."
        path="/blog"
      />

      <main className="min-h-screen relative z-10 px-4 pt-24 pb-10 max-w-6xl mx-auto">
        <header className="text-center mb-6">
          <div
            className="text-[10px] font-mono tracking-[0.32em] mb-2"
            style={{ color: 'var(--fg-4)' }}
          >
            {'// TRANSMISSION_LOG'}
          </div>
          <h1
            className="text-4xl md:text-6xl font-display font-semibold tracking-[-0.02em] leading-none"
            style={{ color: 'var(--fg-1)' }}
          >
            BLOG
          </h1>
          <p
            className="font-body text-xs md:text-sm mt-4 max-w-lg mx-auto"
            style={{ color: 'var(--fg-3)' }}
          >
            Build logs, engineering notes and deep dives from the terminal.
          </p>
        </header>

        {/* Filter drawer affordance — keeps search/tag/sort without a second route */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setDrawerOpen((v) => !v)}
            className="inline-flex items-center justify-center px-4 py-2 font-mono text-[11px] tracking-[0.14em] border rounded-[var(--radius-md)] transition-colors duration-200"
            style={
              drawerOpen
                ? {
                    background: 'var(--fg-1)',
                    color: 'var(--bg-1)',
                    borderColor: 'var(--fg-1)',
                  }
                : {
                    background: 'transparent',
                    color: 'var(--fg-2)',
                    borderColor: 'var(--border-subtle)',
                  }
            }
          >
            {drawerOpen
              ? 'CLOSE FILTERS'
              : `FILTER${tag || search ? ' • ACTIVE' : ''}`}
          </button>
        </div>

        {drawerOpen && (
          <div className="mb-6">
            <div
              className="p-4 rounded-[var(--radius-lg)] border"
              style={{
                background: 'var(--bg-2)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div
                className="text-[10px] font-mono tracking-[0.24em] mb-3"
                style={{ color: 'var(--fg-4)' }}
              >
                {'// FILTER_DRAWER'}
              </div>
              <BlogSearch
                value={search}
                onChange={setSearch}
                tags={tags}
                activeTag={tag}
                onTagChange={setTag}
                sort={sort}
                onSortChange={setSort}
                resultCount={total}
              />
              <p
                className="font-mono text-[10px] mt-3"
                style={{ color: 'var(--fg-4)' }}
              >
                Filters apply in-place to the reels buffer (page resets to 1).
                No secondary list route.
              </p>
            </div>
          </div>
        )}

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
            ref={emptyRef}
            className="p-8 text-center rounded-[var(--radius-lg)] border"
            style={{
              background: 'var(--bg-2)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="blog-empty-graphic max-w-md mx-auto opacity-0">
              <BlogEmptyGraphic
                variant={emptyVariant as 'empty' | 'no-results'}
              />
            </div>
            <h2
              className="blog-empty-headline font-display text-sm tracking-[0.16em] mt-6 opacity-0"
              style={{ color: 'var(--fg-1)' }}
            >
              {headlineText}
            </h2>
            {hasFilters ? (
              <>
                <p
                  className="blog-empty-subcopy font-mono text-[11px] mt-2 opacity-0"
                  style={{ color: 'var(--fg-4)' }}
                >
                  {'>'} Adjust your search parameters and retry.
                </p>
                <div className="blog-empty-cta mt-4 flex justify-center gap-2 opacity-0">
                  <button
                    onClick={() => {
                      setSearch('');
                      setTag('');
                    }}
                    className="inline-flex items-center justify-center px-4 py-2 font-mono text-[11px] tracking-[0.14em] border rounded-[var(--radius-md)] transition-colors"
                    style={{
                      background: 'transparent',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--fg-2)',
                    }}
                  >
                    CLEAR FILTERS
                  </button>
                </div>
              </>
            ) : null}
          </div>
        ) : showReels ? (
          <BlogReels
            items={items}
            total={total}
            hasMore={hasMore}
            loading={loading}
            onLoadMore={onLoadMore}
            activeTag={tag}
          />
        ) : null}

        {/* Deep-link hint — reels overlay uses in-place expand; /blog/[slug] preserved for SEO/share */}
        {!isEmpty && !loading && (
          <p
            className="font-mono text-[10px] text-center mt-6"
            style={{ color: 'var(--fg-4)' }}
          >
            Tip: each card exposes a Permalink to{' '}
            <span style={{ color: 'var(--fg-2)' }}>/blog/[slug]</span> for
            sharing — reels view does not swap routes per swipe.
          </p>
        )}
      </main>
    </>
  );
}
