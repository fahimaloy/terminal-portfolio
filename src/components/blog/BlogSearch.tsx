// src/components/blog/BlogSearch.tsx
/* Instant search + tag filter + sort controls for the blog index. */

import React, { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { HudPanel, NeonChip } from '../ui';

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
    <HudPanel accent="cyan" notch="md" className="p-4 space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-neon-cyan"
        />
        <input
          type="search"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          placeholder="SEARCH TRANSMISSIONS..."
          aria-label="Search blog posts"
          className="w-full bg-bg-smoke border border-white/10 text-text-primary pl-10 pr-10 py-2.5 font-mono text-xs tracking-wider focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted transition-all duration-200 clip-notch-sm"
        />
        {local && (
          <button
            onClick={() => {
              setLocal('');
              onChange('');
            }}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-neon-red transition-colors"
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
              className={`px-2.5 py-1 font-display text-[9px] tracking-[2px] border transition-colors duration-200 clip-notch-sm ${
                sort === mode
                  ? 'border-neon-cyan/40 bg-neon-cyan/15 text-neon-cyan'
                  : 'border-white/10 text-text-muted hover:text-text-primary'
              }`}
            >
              {mode === 'recent' ? 'RECENT' : 'TOP'}
            </button>
          ))}
        </div>
        <span className="font-mono text-[9px] text-text-muted">
          {String(resultCount).padStart(2, '0')} ENTRIES
        </span>
      </div>

      {/* Tag filter */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-white/5">
          <span className="pt-1">
            <NeonChip
              accent={activeTag === '' ? 'yellow' : 'cyan'}
              onClick={() => onTagChange('')}
            >
              ALL
            </NeonChip>
          </span>
          {tags.map((tag) => (
            <span key={tag} className="pt-1">
              <NeonChip
                accent={activeTag === tag ? 'yellow' : 'cyan'}
                onClick={() => onTagChange(activeTag === tag ? '' : tag)}
              >
                {tag.toUpperCase()}
              </NeonChip>
            </span>
          ))}
        </div>
      )}
    </HudPanel>
  );
}
