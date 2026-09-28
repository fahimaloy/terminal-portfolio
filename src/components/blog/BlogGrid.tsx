/**
 * BlogGrid — the default /blog view.
 *
 * The reels view is a full-viewport scroll-snap scroller, which fights the
 * page's own scroll and hides how much content there is. The grid is the
 * scannable default; reels stays one click away.
 */

import React from 'react';
import { createScope, animate, stagger } from 'animejs';
import {
  isReducedMotion,
  canAnimate,
  durations,
  easings,
} from '../../config/animations';
import BlogCard from './BlogCard';
import type { BlogListItem } from '../../types/blog';

type Props = {
  items: BlogListItem[];
  loading: boolean;
  onLoadMore: () => void;
  hasMore: boolean;
};

export default function BlogGrid({
  items,
  loading,
  onLoadMore,
  hasMore,
}: Props) {
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const root = rootRef.current;
    if (!root || isReducedMotion() || !canAnimate()) return;

    const scope = createScope({ root });
    scope.add(() => {
      const cards = root.querySelectorAll<HTMLElement>('[data-grid-card]');
      if (!cards.length) return;
      animate(cards, {
        y: [22, 0],
        opacity: [0, 1],
        duration: durations.enter * 1000 * 0.55,
        ease: easings.expoOut,
        delay: stagger(45, { from: 'first' }),
      });
    });
    return () => scope.revert();
  }, [items.length]);

  return (
    <div ref={rootRef} id="blog-list">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((post, i) => (
          <div key={post.id} data-grid-card>
            <BlogCard post={post} index={i} />
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-8">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loading}
            className="rounded-[var(--radius-md)] border min-h-[44px] min-w-[44px] px-6 py-2.5 font-mono text-[11px] tracking-[0.18em] transition-colors disabled:opacity-40"
            style={{
              borderColor: 'var(--border-subtle)',
              color: 'var(--fg-2)',
            }}
          >
            {loading ? 'LOADING…' : 'LOAD MORE'}
          </button>
        </div>
      )}
    </div>
  );
}
