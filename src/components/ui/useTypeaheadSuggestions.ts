// src/components/ui/useTypeaheadSuggestions.ts
import { useMemo } from 'react';

export type Suggestion = {
  id: string;
  label: string;
  hint?: string;
  score?: number;
  payload?: unknown;
};

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'is',
  'are',
  'and',
  'or',
  'to',
  'of',
  'in',
  'on',
  'for',
  'with',
  'as',
  'at',
  'by',
  'be',
  'this',
  'that',
  'it',
  'from',
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9+]+/)
    .filter((w) => w && !STOP_WORDS.has(w));
}

function score(query: string[], target: string[]): number {
  if (query.length === 0) return 0;
  const t = new Set(target);
  let hits = 0;
  for (const q of query) {
    if (t.has(q)) hits += 1;
    else if (Array.from(t).some((w) => w.startsWith(q))) hits += 0.5;
  }
  return hits / query.length;
}

export function useTypeaheadSuggestions(
  query: string,
  pool: Suggestion[],
  limit = 5,
): Suggestion[] {
  return useMemo(() => {
    const q = tokenize(query);
    if (q.length === 0) return pool.slice(0, limit);
    const ranked = pool
      .map((s) => ({
        ...s,
        score: score(q, tokenize(`${s.label} ${s.hint ?? ''}`)),
      }))
      .filter((s) => (s.score ?? 0) > 0)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, limit);
    return ranked;
  }, [query, pool, limit]);
}
