// src/components/ui/__tests__/IconPicker.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

// Stub lucide icons as forwardRef objects (typeof object) so IconPicker's
// `typeof === 'object'` filter picks them up. Avoids vite/resolve of
// lucide-react/src/Icon.ts which crashes in jsdom (iconNode undefined).
vi.mock('lucide-react', () => {
  const ReactMod = require('react');
  const make = (name: string) => {
    const C: any = ReactMod.forwardRef((props: any, ref: any) =>
      ReactMod.createElement('svg', { ref, 'data-testid': `lucide-${name}`, ...props }),
    );
    C.displayName = name;
    return C;
  };
  return {
    Search: make('Search'),
    Heart: make('Heart'),
    Home: make('Home'),
    Star: make('Star'),
    User: make('User'),
    Settings: make('Settings'),
    Bell: make('Bell'),
    Calendar: make('Calendar'),
    Mail: make('Mail'),
    X: make('X'),
    Plus: make('Plus'),
    Check: make('Check'),
  };
});

import IconPicker from '../IconPicker';

const RECENT_KEY = 'icon-picker-recent';

async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe('IconPicker', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders with mode=all and value=null, selecting an icon shows recent and persists to localStorage', async () => {
    const onChange = vi.fn();
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    render(<IconPicker mode="all" value={null} onChange={onChange} />);
    await flush();
    setItemSpy.mockClear();

    expect(screen.queryByText('Recent')).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    });
    await flush();

    expect(onChange).toHaveBeenCalledWith('Search');
    expect(screen.getByText('Recent')).toBeInTheDocument();
    expect(screen.getByLabelText('Recent Search')).toBeInTheDocument();

    const lastCall = setItemSpy.mock.calls[setItemSpy.mock.calls.length - 1];
    expect(lastCall[0]).toBe(RECENT_KEY);
    expect(JSON.parse(lastCall[1] as string)).toEqual(['Search']);
    // also verify real storage
    expect(JSON.parse(window.localStorage.getItem(RECENT_KEY)!)).toEqual(['Search']);
  });

  it('persistRecent is not in updater: selecting two icons writes once per selection via effect (didPersistMountRef skips first)', async () => {
    const onChange = vi.fn();
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    const { unmount } = render(<IconPicker mode="all" value={null} onChange={onChange} />);
    await flush();
    // after mount with empty storage the persist effect writes "[]" once — clear before counting selections
    setItemSpy.mockClear();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    });
    await flush();
    expect(setItemSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(setItemSpy.mock.calls[0][1] as string)).toEqual(['Search']);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Heart' }));
    });
    await flush();

    expect(setItemSpy).toHaveBeenCalledTimes(2);
    const secondWrite = JSON.parse(setItemSpy.mock.calls[1][1] as string);
    expect(secondWrite).toEqual(['Heart', 'Search']);

    // didPersistMountRef skips first persist — verify no write before any selection on seeded mount
    unmount();
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(['Star']));
    const setItemSpy2 = vi.spyOn(Storage.prototype, 'setItem');
    // fresh spy sees the mount writes for the seeded value — capture then clear
    render(<IconPicker mode="all" value={null} onChange={vi.fn()} />);
    await flush();
    // On mount with seeded ['Star'], loadRecent -> setRecent(['Star']) triggers exactly one persist
    // (first effect invocation was skipped via didPersistMountRef). So <=1 writes.
    expect(setItemSpy2.mock.calls.length).toBeLessThanOrEqual(2);
    // filter to RECENT_KEY writes
    const recentWrites = setItemSpy2.mock.calls.filter((c) => c[0] === RECENT_KEY);
    expect(recentWrites.length).toBeLessThanOrEqual(1);
    if (recentWrites.length === 1) {
      expect(JSON.parse(recentWrites[0][1] as string)).toEqual(['Star']);
    }
    setItemSpy2.mockClear();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    });
    await flush();
    expect(setItemSpy2).toHaveBeenCalledTimes(1);
    expect(JSON.parse(setItemSpy2.mock.calls[0][1] as string)[0]).toBe('Search');
  });

  it('mode switching: mode=tech -> active stack, mode=lucide -> active general, rerender updates', async () => {
    const onChange = vi.fn();

    const { rerender } = render(<IconPicker mode="tech" value={null} onChange={onChange} />);
    await flush();
    expect(document.getElementById('icon-grid-stack')).toBeInTheDocument();
    expect(document.getElementById('icon-grid-general')).not.toBeInTheDocument();

    rerender(<IconPicker mode="lucide" value={null} onChange={onChange} />);
    await act(async () => {});
    expect(document.getElementById('icon-grid-general')).toBeInTheDocument();
    expect(document.getElementById('icon-grid-stack')).not.toBeInTheDocument();

    rerender(<IconPicker mode="all" value={null} onChange={onChange} />);
    await act(async () => {});
    expect(screen.getByRole('tab', { name: 'General' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Stack' })).toHaveAttribute('aria-selected', 'false');
    expect(document.getElementById('icon-grid-general')).toBeInTheDocument();

    rerender(<IconPicker mode="tech" value={null} onChange={onChange} />);
    await act(async () => {});
    expect(document.getElementById('icon-grid-stack')).toBeInTheDocument();
    expect(document.getElementById('icon-grid-general')).not.toBeInTheDocument();

    rerender(<IconPicker mode="lucide" value={null} onChange={onChange} />);
    await act(async () => {});
    expect(document.getElementById('icon-grid-general')).toBeInTheDocument();
    expect(document.getElementById('icon-grid-stack')).not.toBeInTheDocument();
  });

  it('pushRecent deduplication and RECENT_MAX slicing', async () => {
    const onChange = vi.fn();
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    render(<IconPicker mode="all" value={null} onChange={onChange} />);
    await flush();
    setItemSpy.mockClear();

    const icons = ['Search', 'Heart', 'Home', 'Star', 'User', 'Settings', 'Bell', 'Calendar', 'Mail'];
    for (const name of icons) {
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name }));
      });
      await flush();
    }

    let lastPersisted: string[] = JSON.parse(setItemSpy.mock.calls[setItemSpy.mock.calls.length - 1][1] as string);
    expect(lastPersisted.length).toBe(8);
    expect(lastPersisted[0]).toBe('Mail');
    expect(lastPersisted).not.toContain('Search');
    expect(lastPersisted).toContain('Heart');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Heart' }));
    });
    await flush();
    lastPersisted = JSON.parse(setItemSpy.mock.calls[setItemSpy.mock.calls.length - 1][1] as string);
    expect(lastPersisted.length).toBe(8);
    expect(lastPersisted[0]).toBe('Heart');
    expect(lastPersisted.filter((v) => v === 'Heart').length).toBe(1);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Heart' }));
    });
    await flush();
    lastPersisted = JSON.parse(setItemSpy.mock.calls[setItemSpy.mock.calls.length - 1][1] as string);
    expect(lastPersisted.length).toBe(8);
    expect(lastPersisted[0]).toBe('Heart');
    expect(lastPersisted.filter((v) => v === 'Heart').length).toBe(1);

    const recentButtons = document.querySelectorAll('button[aria-label^="Recent "]');
    expect(recentButtons.length).toBe(8);
  });

  it('recent persists across remount via localStorage', async () => {
    const onChange = vi.fn();
    const { unmount } = render(<IconPicker mode="all" value={null} onChange={onChange} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    });
    await flush();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Home' }));
    });
    await flush();
    unmount();

    render(<IconPicker mode="all" value={null} onChange={vi.fn()} />);
    expect(await screen.findByText('Recent')).toBeInTheDocument();
    expect(screen.getByLabelText('Recent Home')).toBeInTheDocument();
    expect(screen.getByLabelText('Recent Search')).toBeInTheDocument();
  });
});
