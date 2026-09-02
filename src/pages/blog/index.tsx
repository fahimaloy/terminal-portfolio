import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createScope, animate, stagger } from 'animejs';
import SEOMeta from '../../components/SEOMeta';
import BlogCard from '../../components/blog/BlogCard';
import BlogSearch from '../../components/blog/BlogSearch';
import { GlitchText, NeonButton, HudPanel } from '../../components/ui';
import { getBlogPosts } from '../../utils/blogApi';
import type { BlogListItem } from '../../types/blog';
import { isReducedMotion } from '../../config/animations';

const PAGE_SIZE = 9;

export default function BlogIndexPage() {
  const [items, setItems] = useState<BlogListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [sort, setSort] = useState<'recent' | 'popular'>('recent');
  const [loading, setLoading] = useState(true);

  const gridRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);

  // Reset to page 1 whenever filters change.
  useEffect(() => {
    setPage(1);
  }, [search, tag, sort]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getBlogPosts({ page, pageSize: PAGE_SIZE, search, tag, sort }).then(
      (res) => {
        if (cancelled) return;
        setItems(res.items);
        setTotal(res.total);
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [page, search, tag, sort]);

  // Stagger the grid in whenever results change.
  useEffect(() => {
    if (loading || !gridRef.current || isReducedMotion()) return;

    const scope = createScope({ root: gridRef.current });
    scopeRef.current = scope;

    scope.add(() => {
      const cards = gridRef.current!.querySelectorAll('.blog-grid-item');
      if (!cards.length) return;
      animate(cards, {
        opacity: [0, 1],
        y: [24, 0],
        scale: [0.94, 1],
        duration: 460,
        ease: 'outExpo',
        delay: stagger(70, { from: 'first' }),
      });
    });

    return () => scope.revert();
  }, [items, loading]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    items.forEach((p) => p.tags?.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <SEOMeta
        title="Blog"
        description="Engineering notes, build logs, and deep dives on full-stack development by Fahim Ahmed."
        path="/blog"
      />

      <main className="min-h-screen relative z-10 px-4 pt-24 pb-20 max-w-6xl mx-auto">
        {/* Header */}
        <header className="text-center mb-10">
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

        {/* Controls */}
        <div className="mb-8">
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
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/3] bg-white/[0.03] border border-white/5 clip-notch-md animate-pulse-glow"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <HudPanel accent="magenta" notch="md" className="p-8 text-center">
            <div className="font-display text-sm text-neon-magenta tracking-[3px]">
              NO TRANSMISSIONS FOUND
            </div>
            <p className="font-mono text-[11px] text-text-muted mt-2">
              {'>'} Adjust your search parameters and retry.
            </p>
          </HudPanel>
        ) : (
          <div
            ref={gridRef}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {items.map((post, i) => (
              <div key={post.id} className="blog-grid-item opacity-0">
                <BlogCard post={post} index={i} />
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <nav
            className="flex items-center justify-center gap-4 mt-10"
            aria-label="Pagination"
          >
            <NeonButton
              accent="cyan"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              PREV
            </NeonButton>
            <span className="font-mono text-[10px] text-text-muted">
              {String(page).padStart(2, '0')} /{' '}
              {String(totalPages).padStart(2, '0')}
            </span>
            <NeonButton
              accent="cyan"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              NEXT
            </NeonButton>
          </nav>
        )}
      </main>
    </>
  );
}
