// src/components/ui/__tests__/useTypeaheadSuggestions.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useTypeaheadSuggestions,
  Suggestion,
} from '../useTypeaheadSuggestions';

const POOL: Suggestion[] = [
  { id: '1', label: 'React component patterns', hint: 'article' },
  { id: '2', label: 'Vue tutorial', hint: 'article' },
  { id: '3', label: 'TypeScript generics deep dive', hint: 'guide' },
  { id: '4', label: 'Node.js performance', hint: 'article' },
  { id: '5', label: 'CSS grid tricks', hint: 'tip' },
];

describe('useTypeaheadSuggestions', () => {
  it('returns first N when query is empty', () => {
    const { result } = renderHook(() => useTypeaheadSuggestions('', POOL, 3));
    expect(result.current).toHaveLength(3);
  });

  it('matches a single word', () => {
    const { result } = renderHook(() =>
      useTypeaheadSuggestions('typescript', POOL, 5),
    );
    expect(result.current[0]?.id).toBe('3');
  });

  it('matches multiple tokens', () => {
    const { result } = renderHook(() =>
      useTypeaheadSuggestions('react patterns', POOL, 5),
    );
    expect(result.current[0]?.id).toBe('1');
  });

  it('falls back to empty array when nothing matches', () => {
    const { result } = renderHook(() =>
      useTypeaheadSuggestions('zzzqqq', POOL, 5),
    );
    expect(result.current).toHaveLength(0);
  });

  it('ignores stop words in the query', () => {
    const { result } = renderHook(() =>
      useTypeaheadSuggestions('the react and patterns', POOL, 5),
    );
    expect(result.current[0]?.id).toBe('1');
  });
});
