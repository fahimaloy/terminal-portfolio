import React, { useCallback, useEffect, useMemo, useState } from 'react';
import SEOMeta from '../../components/SEOMeta';
import BlogSearch from '../../components/blog/BlogSearch';
import BlogReels from '../../components/blog/BlogReels';
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
            className="p-8 text-center rounded-[var(--radius-lg)] border"
            style={{
              background: 'var(--bg-2)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div
              className="font-display text-sm tracking-[0.16em]"
              style={{ color: 'var(--fg-1)' }}
            >
              NO TRANSMISSIONS FOUND
            </div>
            <p
              className="font-mono text-[11px] mt-2"
              style={{ color: 'var(--fg-4)' }}
            >
              {'>'} Adjust your search parameters and retry.
            </p>
            {search || tag ? (
              <div className="mt-4 flex justify-center gap-2">
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
