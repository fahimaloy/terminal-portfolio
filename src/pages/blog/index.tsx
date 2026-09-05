import React, { useCallback, useEffect, useMemo, useState } from 'react';
import SEOMeta from '../../components/SEOMeta';
import BlogSearch from '../../components/blog/BlogSearch';
import BlogReels from '../../components/blog/BlogReels';
import { GlitchText, HudPanel, NeonButton } from '../../components/ui';
import { getBlogPosts } from '../../utils/blogApi';
import type { BlogListItem } from '../../types/blog';

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

  return (
    <>
      <SEOMeta
        title="Blog"
        description="Engineering notes, build logs, and deep dives on full-stack development by Fahim Ahmed."
        path="/blog"
      />

      <main className="min-h-screen relative z-10 px-4 pt-24 pb-10 max-w-6xl mx-auto">
        <header className="text-center mb-6">
          <div className="text-[10px] font-display tracking-[6px] text-neon-cyan text-shadow-neon-cyan mb-2">
            {'// TRANSMISSION_LOG'}
          </div>
          <GlitchText as="h1" accent="cyan" className="text-4xl md:text-6xl">
            BLOG
          </GlitchText>
          <p className="font-body text-xs md:text-sm text-text-muted mt-4 max-w-lg mx-auto">
            Build logs, engineering notes and deep dives from the terminal.
          </p>
        </header>

        {/* Filter drawer affordance — keeps search/tag/sort without a second route */}
        <div className="flex justify-end mb-4">
          <NeonButton
            accent="cyan"
            variant={drawerOpen ? 'outline' : 'ghost'}
            onClick={() => setDrawerOpen((v) => !v)}
          >
            {drawerOpen
              ? 'CLOSE FILTERS'
              : `FILTER${tag || search ? ' • ACTIVE' : ''}`}
          </NeonButton>
        </div>

        {drawerOpen && (
          <div className="mb-6">
            <HudPanel accent="cyan" notch="md" className="p-4">
              <div className="text-[10px] font-display tracking-[3px] text-neon-cyan mb-3">
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
              <p className="font-mono text-[10px] text-text-muted mt-3">
                Filters apply in-place to the reels buffer (page resets to 1).
                No secondary list route.
              </p>
            </HudPanel>
          </div>
        )}

        {/* Loading skeleton — initial buffer only */}
        {loading && items.length === 0 ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-[56dvh] bg-white/[0.03] border border-white/5 clip-notch-md animate-pulse-glow"
              />
            ))}
          </div>
        ) : isEmpty ? (
          <HudPanel accent="magenta" notch="md" className="p-8 text-center">
            <div className="font-display text-sm text-neon-magenta tracking-[3px]">
              NO TRANSMISSIONS FOUND
            </div>
            <p className="font-mono text-[11px] text-text-muted mt-2">
              {'>'} Adjust your search parameters and retry.
            </p>
            {search || tag ? (
              <div className="mt-4 flex justify-center gap-2">
                <NeonButton
                  accent="cyan"
                  variant="outline"
                  onClick={() => {
                    setSearch('');
                    setTag('');
                  }}
                >
                  CLEAR FILTERS
                </NeonButton>
              </div>
            ) : null}
          </HudPanel>
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
          <p className="font-mono text-[10px] text-text-muted text-center mt-6">
            Tip: each card exposes a Permalink to{' '}
            <span className="text-neon-cyan">/blog/[slug]</span> for sharing —
            reels view does not swap routes per swipe.
          </p>
        )}
      </main>
    </>
  );
}
