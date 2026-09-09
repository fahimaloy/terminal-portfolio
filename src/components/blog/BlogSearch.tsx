// src/components/blog/BlogSearch.tsx
/* Instant search + tag filter + sort controls for the blog index. */

import React, { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { createScope, animate, stagger, spring } from 'animejs';
import {
  durations,
  easings,
  springs,
  isReducedMotion,
  canAnimate,
} from '../../config/animations';

interface Props {
  value: string;
  onChange: (next: string) => void;
  tags: string[];
  activeTag: string;
  onTagChange: (tag: string) => void;
  sort: 'recent' | 'popular';
  onSortChange: (sort: 'recent' | 'popular') => void;
  resultCount: number;
}

export default function BlogSearch({
  value,
  onChange,
  tags,
  activeTag,
  onTagChange,
  sort,
  onSortChange,
  resultCount,
}: Props) {
  const [local, setLocal] = useState(value);
  const chipsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep local in sync when parent resets (e.g. CLEAR FILTERS)
  useEffect(() => {
    setLocal(value);
  }, [value]);

  // Debounce keystrokes before hitting the API.
  useEffect(() => {
    const t = setTimeout(() => {
      if (local !== value) onChange(local);
    }, 280);
    return () => clearTimeout(t);
  }, [local, value, onChange]);

  // Stagger entrance for tag chips when tags change — gated
  useEffect(() => {
    const root = chipsRef.current;
    if (!root) return;
    if (isReducedMotion() || !canAnimate()) return;
    if (!tags.length) return;

    const scope = createScope({ root } as Parameters<typeof createScope>[0]);

    scope.add(() => {
      const chips = root.querySelectorAll<HTMLElement>('.blog-search-chip');
      if (!chips.length) return;
      (animate as unknown as (a: unknown, b: unknown) => void)(
        chips as unknown as HTMLElement[],
        {
          y: [8, 0],
          opacity: [0, 1],
          duration: (durations.enter ?? 0.48) * 1000 * 0.45,
          ease: (easings.smooth as string) ?? 'outExpo',
          delay: stagger(30, { from: 'first' }),
        },
      );
    });

    return () => scope.revert();
  }, [tags]);

  const handleFocus = () => {
    if (isReducedMotion() || !canAnimate()) return;
    const el = inputRef.current;
    if (!el) return;
    const eased = spring(
      springs.stiff as unknown as Record<string, number>,
    ) as unknown as string;
    (animate as unknown as (a: unknown, b: unknown) => void)(
      el as unknown as HTMLElement,
      {
        borderColor: 'var(--ring-cyan)',
        boxShadow: '0 0 0 3px var(--glow-cyan-sm)',
        duration: (durations.hover ?? 0.24) * 1000,
        ease: eased ?? (easings.smooth as string),
      },
    );
  };

  const handleBlur = () => {
    if (isReducedMotion() || !canAnimate()) return;
    const el = inputRef.current;
    if (!el) return;
    const eased = spring(
      springs.soft as unknown as Record<string, number>,
    ) as unknown as string;
    (animate as unknown as (a: unknown, b: unknown) => void)(
      el as unknown as HTMLElement,
      {
        borderColor: 'var(--border-subtle)',
        boxShadow: '0 0 0 0 transparent',
        duration: (durations.hover ?? 0.24) * 1000,
        ease: eased ?? (easings.smooth as string),
      },
    );
  };

  return (
    <div
      className="rounded-[var(--radius-lg)] border p-4 space-y-3"
      style={{ background: 'var(--bg-2)', borderColor: 'var(--border-subtle)' }}
    >
      {/* Search input */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--fg-4)' } as React.CSSProperties}
        />
        <input
          ref={inputRef}
          type="search"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="SEARCH TRANSMISSIONS..."
          aria-label="Search blog posts"
          className="w-full rounded-[var(--radius-md)] border pl-10 pr-10 py-2.5 font-mono text-xs tracking-wider focus:outline-none placeholder:text-[var(--fg-4)] transition-colors duration-200"
          style={
            {
              background: 'var(--bg-3)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--fg-1)',
            } as React.CSSProperties
          }
        />
        {local && (
          <button
            onClick={() => {
              setLocal('');
              onChange('');
            }}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: 'var(--fg-4)' } as React.CSSProperties}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Sort + count */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {(['recent', 'popular'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onSortChange(mode)}
              className="px-2.5 py-1 font-mono text-[9px] tracking-[0.16em] border rounded-[var(--radius-sm)] transition-colors duration-200"
              style={
                sort === mode
                  ? {
                      borderColor: 'var(--fg-3)',
                      background: 'var(--bg-3)',
                      color: 'var(--fg-1)',
                    }
                  : {
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--fg-4)',
                      background: 'transparent',
                    }
              }
            >
              {mode === 'recent' ? 'RECENT' : 'TOP'}
            </button>
          ))}
        </div>
        <span className="font-mono text-[9px]" style={{ color: 'var(--fg-4)' }}>
          {String(resultCount).padStart(2, '0')} ENTRIES
        </span>
      </div>

      {/* Tag filter */}
      {tags.length > 0 && (
        <div
          ref={chipsRef}
          className="flex flex-wrap gap-1.5 pt-3"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <button
            onClick={() => onTagChange('')}
            className="blog-search-chip px-2 py-1 rounded-full font-mono text-[10px] tracking-[0.14em] border transition-colors"
            style={
              activeTag === ''
                ? {
                    background: 'var(--fg-1)',
                    color: 'var(--bg-1)',
                    borderColor: 'var(--fg-1)',
                  }
                : {
                    background: 'var(--bg-3)',
                    color: 'var(--fg-3)',
                    borderColor: 'var(--border-subtle)',
                  }
            }
          >
            ALL
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagChange(activeTag === tag ? '' : tag)}
              className="blog-search-chip px-2 py-1 rounded-full font-mono text-[10px] tracking-[0.14em] border transition-colors"
              style={
                activeTag === tag
                  ? {
                      background: 'var(--fg-1)',
                      color: 'var(--bg-1)',
                      borderColor: 'var(--fg-1)',
                    }
                  : {
                      background: 'var(--bg-3)',
                      color: 'var(--fg-3)',
                      borderColor: 'var(--border-subtle)',
                    }
              }
            >
              {tag.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
