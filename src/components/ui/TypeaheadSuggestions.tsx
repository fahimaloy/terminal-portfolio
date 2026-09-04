// src/components/ui/TypeaheadSuggestions.tsx
import React, { useRef, useEffect } from 'react';
import { animate } from 'animejs';
import { Suggestion } from './useTypeaheadSuggestions';
import { isReducedMotion } from '../../config/animations';
import { durations, easings } from '../../config/animations';

type Props = {
  query: string;
  suggestions: Suggestion[];
  onSelect: (s: Suggestion) => void;
  open: boolean;
  emptyHint?: string;
  className?: string;
};

export default function TypeaheadSuggestions({
  query,
  suggestions,
  onSelect,
  open,
  emptyHint = 'NO MATCHES',
  className = '',
}: Props) {
  const listRef = useRef<HTMLUListElement>(null);
  const prevOpen = useRef(open);

  useEffect(() => {
    if (!listRef.current) return;

    // Open: animate in
    if (open && !prevOpen.current) {
      if (isReducedMotion()) return;
      animate(listRef.current, {
        opacity: [0, 1],
        y: [-4, 0],
        duration: durations.tap,
        ease: easings.smooth,
      });
    }

    // Close: animate out
    if (!open && prevOpen.current) {
      if (isReducedMotion()) return;
      animate(listRef.current, {
        opacity: [1, 0],
        y: [0, -4],
        duration: durations.tap,
        ease: easings.smooth,
      });
    }

    prevOpen.current = open;
  }, [open]);

  if (!open) return null;

  return (
    <ul
      ref={listRef}
      role="listbox"
      aria-label="Suggestions"
      style={{ opacity: 1 }}
      className={`font-body text-sm ${className}`}
    >
      {suggestions.length === 0 ? (
        <li className="px-3 py-2 text-text-muted uppercase tracking-widest text-xs">
          {emptyHint}
        </li>
      ) : (
        suggestions.map((s) => (
          <li
            key={s.id}
            role="option"
            aria-selected="false"
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(s);
            }}
            className="px-3 py-2 cursor-pointer flex justify-between items-center hover:bg-white/5 text-text-primary"
          >
            <span className="truncate">{s.label}</span>
            {s.hint && (
              <span className="ml-3 text-[10px] uppercase tracking-widest text-text-muted">
                {s.hint}
              </span>
            )}
          </li>
        ))
      )}
    </ul>
  );
}
