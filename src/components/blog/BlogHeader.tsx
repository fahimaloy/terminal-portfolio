/**
 * BlogHeader — the persistent control surface at the top of /blog.
 *
 * The previous implementation hid search, sort and tags behind a text button
 * labelled FILTER, so the only way to filter was to go looking for it. This
 * keeps search always visible and moves every filter into an icon button with
 * an `aria-pressed` state, then mirrors the whole state into the URL so a
 * filtered view can be shared and the back button works.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  X,
  Tag,
  ArrowUpDown,
  LayoutGrid,
  GalleryVerticalEnd,
  ArrowLeft,
  SlidersHorizontal,
} from 'lucide-react';
import type { BlogSort, BlogView, BlogTagFacet } from '../../types/blog';

type Props = {
  search: string;
  onSearch: (next: string) => void;
  tag: string;
  onTag: (next: string) => void;
  sort: BlogSort;
  onSort: (next: BlogSort) => void;
  view: BlogView;
  onView: (next: BlogView) => void;
  facets: BlogTagFacet[];
  total: number;
};

const SORTS: { value: BlogSort; label: string }[] = [
  { value: 'recent', label: 'RECENT' },
  { value: 'popular', label: 'MOST READ' },
];

export default function BlogHeader({
  search,
  onSearch,
  tag,
  onTag,
  sort,
  onSort,
  view,
  onView,
  facets,
  total,
}: Props) {
  const [local, setLocal] = useState(search);
  const [openPanel, setOpenPanel] = useState<'tags' | 'sort' | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Keep the field in sync when the URL / clear-all resets it.
  useEffect(() => setLocal(search), [search]);

  // Debounce so typing does not hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      if (local !== search) onSearch(local);
    }, 280);
    return () => clearTimeout(t);
  }, [local, search, onSearch]);

  // "/" focuses search, Escape clears/closes — the same affordances the chat
  // input already teaches users.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
      if (e.key === '/' && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (openPanel) setOpenPanel(null);
        else if (filtersOpen) setFiltersOpen(false);
        else if (local) {
          setLocal('');
          onSearch('');
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [local, onSearch, openPanel, filtersOpen]);

  // Dismiss popovers on outside click.
  useEffect(() => {
    if (!openPanel && !filtersOpen) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpenPanel(null);
        setFiltersOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [openPanel, filtersOpen]);

  const clearAll = useCallback(() => {
    setLocal('');
    onSearch('');
    onTag('');
  }, [onSearch, onTag]);

  const activeCount =
    (tag ? 1 : 0) + (search ? 1 : 0) + (sort !== 'recent' ? 1 : 0);

  return (
    <div
      ref={rootRef}
      id="blog-header"
      className="sticky top-0 z-[var(--z-header)] -mx-4 px-4 pt-16 md:pt-20 pb-3"
      style={{
        background: 'var(--surface-overlay)',
        backdropFilter: 'var(--glass-blur-md)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Row 1 — identity + view switch */}
        <div className="flex items-center justify-between gap-4 mb-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 min-h-[44px] min-w-[44px] font-mono text-[11px] tracking-[0.18em] shrink-0"
            style={{ color: 'var(--fg-3)' }}
          >
            <ArrowLeft size={14} aria-hidden="true" />
            BACK
          </Link>

          <div className="text-center">
            <div
              className="font-mono text-[10px] tracking-[0.32em]"
              style={{ color: 'var(--fg-3)' }}
            >
              {'// TRANSMISSION_LOG'}
            </div>
            <h1
              className="font-display font-semibold tracking-[-0.02em] leading-none text-3xl md:text-4xl"
              style={{ color: 'var(--fg-1)' }}
            >
              BLOG
            </h1>
          </div>

          {/* View toggle */}
          <div
            role="group"
            aria-label="Layout"
            className="flex items-center gap-1 shrink-0"
          >
            <IconToggle
              label="Grid view"
              active={view === 'grid'}
              onClick={() => onView('grid')}
            >
              <LayoutGrid size={15} />
            </IconToggle>
            <IconToggle
              label="Reels view"
              active={view === 'reels'}
              onClick={() => onView('reels')}
            >
              <GalleryVerticalEnd size={15} />
            </IconToggle>
          </div>
        </div>

        {/* Row 2 — search + filter buttons. Wraps below 640px: three 40px
            buttons plus gaps left the field about 90px of text and truncated
            "Search transmissions" to "Search tra". */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 basis-full sm:basis-auto min-w-0">
            <Search
              size={15}
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--fg-3)' }}
            />
            <input
              ref={inputRef}
              type="search"
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              placeholder="Search transmissions…"
              aria-label="Search blog posts"
              className="w-full rounded-[var(--radius-md)] border py-2.5 pl-10 pr-9 sm:pr-20 font-mono text-xs tracking-wide focus:outline-none"
              style={{
                background: 'var(--bg-2)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--fg-1)',
              }}
            />
            {local ? (
              <button
                type="button"
                onClick={() => {
                  setLocal('');
                  onSearch('');
                }}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-6 h-6 after:absolute after:inset-[-10px] after:content-['']"
                style={{ color: 'var(--fg-3)' }}
              >
                <X size={14} />
              </button>
            ) : (
              <kbd
                aria-hidden="true"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:block font-mono text-[9px] px-1.5 py-0.5 rounded border"
                style={{
                  color: 'var(--fg-3)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                /
              </kbd>
            )}
          </div>

          <IconToggle
            label="Filter by tag"
            active={openPanel === 'tags'}
            badge={tag ? 1 : 0}
            onClick={() => setOpenPanel(openPanel === 'tags' ? null : 'tags')}
          >
            <Tag size={15} />
          </IconToggle>

          <IconToggle
            label="Sort order"
            active={openPanel === 'sort'}
            badge={sort === 'popular' ? 1 : 0}
            onClick={() => setOpenPanel(openPanel === 'sort' ? null : 'sort')}
          >
            <ArrowUpDown size={15} />
          </IconToggle>

          <IconToggle
            label="All filters"
            active={filtersOpen}
            badge={activeCount}
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <SlidersHorizontal size={15} />
          </IconToggle>
        </div>

        {/* Active filter chips */}
        {activeCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {search && (
              <FilterChip
                label={`“${search}”`}
                onClear={() => {
                  setLocal('');
                  onSearch('');
                }}
              />
            )}
            {tag && <FilterChip label={tag} onClear={() => onTag('')} />}
            {sort !== 'recent' && (
              <FilterChip
                label={sort === 'popular' ? 'MOST READ' : 'RECENT'}
                onClear={() => onSort('recent')}
              />
            )}
            <button
              type="button"
              onClick={clearAll}
              className="min-h-[44px] min-w-[44px] px-2 font-mono text-[10px] tracking-[0.16em]"
              style={{ color: 'var(--neon-cyan)' }}
            >
              CLEAR ALL
            </button>
          </div>
        )}

        {/* Popovers */}
        {openPanel === 'tags' && (
          <Panel label="TAGS">
            {facets.length === 0 ? (
              <p
                className="font-mono text-[10px]"
                style={{ color: 'var(--fg-3)' }}
              >
                NO TAGS YET
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {facets.map((f) => {
                  const active = tag === f.tag;
                  return (
                    <button
                      key={f.tag}
                      type="button"
                      onClick={() => onTag(active ? '' : f.tag)}
                      aria-pressed={active}
                      className="inline-flex items-center gap-1.5 rounded-full border min-h-[44px] min-w-[44px] px-3 py-2 font-mono text-[10px] tracking-[0.14em] transition-colors"
                      style={{
                        background: active ? 'var(--neon-cyan)' : 'var(--bg-3)',
                        color: active ? 'var(--bg-void)' : 'var(--fg-2)',
                        borderColor: active
                          ? 'var(--neon-cyan)'
                          : 'var(--border-subtle)',
                      }}
                    >
                      {f.tag.toUpperCase()}
                      <span style={{ opacity: 0.6 }}>{f.count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </Panel>
        )}

        {openPanel === 'sort' && (
          <Panel label="SORT">
            <div className="flex flex-wrap gap-2">
              {SORTS.map((s) => {
                const active = sort === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => onSort(s.value)}
                    aria-pressed={active}
                    className="rounded-[var(--radius-sm)] border min-h-[44px] min-w-[44px] px-3 py-2 font-mono text-[10px] tracking-[0.16em] transition-colors"
                    style={{
                      background: active ? 'var(--neon-cyan)' : 'var(--bg-3)',
                      color: active ? 'var(--bg-void)' : 'var(--fg-2)',
                      borderColor: active
                        ? 'var(--neon-cyan)'
                        : 'var(--border-subtle)',
                    }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </Panel>
        )}

        {filtersOpen && (
          <Panel label="FILTERS">
            <div className="space-y-4">
              <div>
                <p
                  className="font-mono text-[10px] tracking-[0.2em] mb-2"
                  style={{ color: 'var(--fg-3)' }}
                >
                  SORT
                </p>
                <div className="flex gap-2">
                  {SORTS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => onSort(s.value)}
                      aria-pressed={sort === s.value}
                      className="rounded-[var(--radius-sm)] border min-h-[44px] min-w-[44px] px-3 py-2 font-mono text-[10px] tracking-[0.16em]"
                      style={{
                        borderColor:
                          sort === s.value
                            ? 'var(--neon-cyan)'
                            : 'var(--border-subtle)',
                        color:
                          sort === s.value ? 'var(--neon-cyan)' : 'var(--fg-2)',
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <p
                className="font-mono text-[10px]"
                style={{ color: 'var(--fg-3)' }}
              >
                {String(total).padStart(2, '0')} ENTRIES MATCH
              </p>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

function Panel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="mt-3 rounded-[var(--radius-lg)] border p-4"
      style={{
        background: 'var(--bg-2)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      <div
        className="font-mono text-[10px] tracking-[0.24em] mb-3"
        style={{ color: 'var(--fg-3)' }}
      >
        {'// ' + label}
      </div>
      {children}
    </div>
  );
}

function FilterChip({
  label,
  onClear,
}: {
  label: string;
  onClear: () => void;
}) {
  return (
    <span
      className="relative inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] tracking-[0.12em]"
      style={{
        background: 'var(--wash-cyan)',
        color: 'var(--neon-cyan)',
        borderColor: 'var(--glow-cyan-30)',
      }}
    >
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Remove filter ${label}`}
        className="grid place-items-center w-6 h-6 opacity-70 hover:opacity-100 after:absolute after:inset-[-10px] after:content-['']"
      >
        <X size={11} />
      </button>
    </span>
  );
}

function IconToggle({
  label,
  active,
  badge,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={badge ? `${label} (${badge} active)` : label}
      title={label}
      className="relative grid place-items-center w-11 h-11 rounded-[var(--radius-md)] border transition-colors"
      style={{
        background: active ? 'var(--wash-cyan)' : 'var(--bg-2)',
        color: active ? 'var(--neon-cyan)' : 'var(--fg-2)',
        borderColor: active ? 'var(--glow-cyan-30)' : 'var(--border-subtle)',
      }}
    >
      {children}
      {badge ? (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 grid place-items-center rounded-full font-mono text-[9px]"
          style={{ background: 'var(--neon-cyan)', color: 'var(--bg-void)' }}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}
