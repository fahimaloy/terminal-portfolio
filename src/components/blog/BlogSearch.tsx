// src/components/blog/BlogSearch.tsx
/* Instant search + tag filter + sort controls for the blog index. */

import React, { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

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

  // Debounce keystrokes before hitting the API.
  useEffect(() => {
    const t = setTimeout(() => {
      if (local !== value) onChange(local);
    }, 280);
    return () => clearTimeout(t);
  }, [local, value, onChange]);

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
          type="search"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
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
          className="flex flex-wrap gap-1.5 pt-3"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <button
            onClick={() => onTagChange('')}
            className="px-2 py-1 rounded-full font-mono text-[10px] tracking-[0.14em] border transition-colors"
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
              className="px-2 py-1 rounded-full font-mono text-[10px] tracking-[0.14em] border transition-colors"
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
