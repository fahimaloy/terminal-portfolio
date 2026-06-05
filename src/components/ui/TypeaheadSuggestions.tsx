// src/components/ui/TypeaheadSuggestions.tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Suggestion } from './useTypeaheadSuggestions';
import { motionTokens } from './motionConfig';

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
  return (
    <AnimatePresence>
      {open && (
        <motion.ul
          role="listbox"
          aria-label="Suggestions"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: motionTokens.dur.tap, ease: motionTokens.ease }}
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
        </motion.ul>
      )}
    </AnimatePresence>
  );
}
