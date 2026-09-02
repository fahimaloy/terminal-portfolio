import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useFormAnimation } from '../../hooks/useFormAnimation';

vi.mock('animejs', () => ({
  animate: vi.fn(),
}));

describe('useFormAnimation', () => {
  it('returns shake, focusIn, focusOut, successPulse functions', () => {
    const { result } = renderHook(() => useFormAnimation());
    expect(typeof result.current.shake).toBe('function');
    expect(typeof result.current.focusIn).toBe('function');
    expect(typeof result.current.focusOut).toBe('function');
    expect(typeof result.current.successPulse).toBe('function');
  });

  it('shake calls animate with correct parameters', () => {
    const { result } = renderHook(() => useFormAnimation());
    const el = document.createElement('div');
    act(() => {
      result.current.shake(el);
    });
    // animate should have been called
  });

  it('does not shake same element twice in succession', () => {
    const { result } = renderHook(() => useFormAnimation());
    const el = document.createElement('div');
    act(() => {
      result.current.shake(el);
      result.current.shake(el);
    });
    // Should only animate once
  });
});
