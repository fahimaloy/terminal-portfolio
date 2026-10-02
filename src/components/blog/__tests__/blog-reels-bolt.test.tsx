// src/components/blog/__tests__/blog-reels-bolt.test.tsx
/* The reels' entry page turn — the flash that never fired.
 *
 * `BlogReels` rendered `<LightningTransition trigger={bolt} />` for as long as
 * anyone could remember, and `setBolt` had no caller: the wipe sat inert on
 * every visit. The trigger has to be ARMED, because `LightningTransition`
 * swallows its own first effect pass (its `firstRun` ref) and can only ever run
 * from a post-mount CHANGE of `trigger`.
 *
 * What this file pins is the COUNT, not merely the presence of a flash:
 *
 *   1. once per mount — the beat is opening the view;
 *   2. not again when more posts load, when a filter changes, when the reader
 *      opens a card, or when the scroller moves;
 *   3. again on the next mount, because grid⇄reels swaps the component type;
 *   4. never under reduced motion.
 *
 * `LightningTransition` is NOT mocked. The observable is `createTimeline`,
 * because that is the only thing in this subtree that builds one: the flash
 * curtain's `createTimeline` lives inside `useFlashCurtain`'s `flash()`, which
 * nothing calls, so a timeline appearing here can only be the wipe. Using the
 * real component also means the assertions below hold against the component's
 * actual contract (`firstRun`, the reduced-motion branch, `pointer-events`).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import React from 'react';

const { mockTlAdd, mockTlCall, mockTlRevert, mockGetBlogPost } = vi.hoisted(
  () => ({
    mockTlAdd: vi.fn(),
    mockTlCall: vi.fn(),
    mockTlRevert: vi.fn(),
    mockGetBlogPost: vi.fn(async () => ({ post: null })),
  }),
);

vi.mock('animejs', () => {
  const scope = {
    add: vi.fn((cb: () => void) => {
      cb();
      return scope;
    }),
    revert: vi.fn(),
  };
  return {
    __esModule: true,
    // `useFlashCurtain` is the only other importer; its `createTimeline` is
    // unreachable, so counting timelines here counts wipes.
    createTimeline: vi.fn(() => ({
      add: mockTlAdd,
      call: mockTlCall,
      revert: mockTlRevert,
    })),
    createScope: vi.fn(() => scope),
    animate: vi.fn(),
    onScroll: vi.fn(() => ({ scroll: 0 })),
    stagger: vi.fn((v: unknown) => v as never),
    spring: vi.fn(() => 'spring'),
  };
});

vi.mock('../../ui', () => ({
  __esModule: true,
  HudPanel: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'hud-panel' }, children),
  NeonChip: ({ children }: any) => React.createElement('span', null, children),
  NeonButton: ({ children, ...rest }: any) =>
    React.createElement('button', rest, children),
  GlitchText: ({ children }: any) => React.createElement('h2', null, children),
}));

vi.mock('../../RichTextRenderer', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('../../../utils/blogApi', () => ({
  __esModule: true,
  // The expanded-card fetch. Resolving with a null `post` takes the deliberate
  // fallback branch in `openExpanded`, which still opens the card — so the
  // "opened a card" assertion does not depend on a blog payload.
  getBlogPost: () => mockGetBlogPost(),
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children }: any) => React.createElement('a', null, children),
}));

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) =>
    React.createElement('img', { alt: props.alt ?? '', src: props.src }),
}));

import { createTimeline } from 'animejs';
import BlogReels from '../BlogReels';
import { durations } from '../../../config/animations';
import type { BlogListItem } from '../../../types/blog';

const mockedCreateTimeline = vi.mocked(createTimeline);

/** How many wipes have run. One `createTimeline` per wipe, by construction. */
const wipes = () => mockedCreateTimeline.mock.calls.length;

function makeItem(
  overrides: Partial<BlogListItem> & { id: number; slug: string },
): BlogListItem {
  return {
    title: 'Test Post',
    excerpt: 'excerpt text',
    teaser: null,
    cover_image_url: null,
    cover_image_alt: null,
    status: 'published',
    featured: false,
    tags: ['reels'],
    reading_minutes: 2,
    view_count: 10,
    seo_title: null,
    seo_description: null,
    seo_keywords: null,
    canonical_url: null,
    published_at: '2026-01-01T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const items = [
  makeItem({ id: 1, slug: 'first-post' }),
  makeItem({ id: 2, slug: 'second-post', title: 'Second Post' }),
];

function renderReels(
  props: Partial<React.ComponentProps<typeof BlogReels>> = {},
) {
  return render(
    <BlogReels
      items={items}
      total={items.length}
      hasMore={false}
      loading={false}
      onLoadMore={vi.fn()}
      activeTag="all"
      {...props}
    />,
  );
}

function mockMatchMedia(reduceMatches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches:
        query === '(prefers-reduced-motion: reduce)' ? reduceMatches : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function clearMatchMedia() {
  Reflect.deleteProperty(window, 'matchMedia');
}

/** The wipe's own root, as rendered by the real `LightningTransition`. */
function flashRoot(container: HTMLElement): HTMLElement | null {
  return (
    container.querySelector<HTMLElement>('.lt-sheet')?.parentElement ?? null
  );
}

describe('BlogReels — the entry page turn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBlogPost.mockClear();
    mockGetBlogPost.mockResolvedValue({ post: null });
    mockMatchMedia(false);
  });

  afterEach(() => {
    clearMatchMedia();
    vi.clearAllMocks();
  });

  it('fires once, as a real token-timed wipe, when the reel view opens', () => {
    const { container } = renderReels();

    // The bug: zero. `setBolt` had no caller, so this was the whole flash.
    expect(wipes()).toBe(1);

    // Not a stub: the real component covered, handed off at the midpoint and
    // lifted, with every beat derived from the shared duration tokens.
    const coverMs = durations.enter * 1000 * 0.5;
    const handOffMs = durations.enter * 1000 * 0.6;
    const liftAtMs = durations.enter * 1000 * 0.66;
    const liftMs = durations.exit * 1000 * 0.8;
    expect(mockTlAdd).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ duration: coverMs }),
      0,
    );
    expect(mockTlCall).toHaveBeenCalledWith(expect.any(Function), handOffMs);
    expect(mockTlAdd).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ duration: liftMs }),
      liftAtMs,
    );

    // And it occludes while it runs, which is the whole reason it cannot be
    // wired to a reel change (see the header note in BlogReels.tsx).
    expect(flashRoot(container)?.style.pointerEvents).toBe('auto');
  });

  it('does not fire again when the reader scrolls, opens a card, loads more or filters', async () => {
    const { container, rerender } = renderReels();
    expect(wipes()).toBe(1);

    // Opening a card is the largest state change this view has that does not
    // need layout, so it is the strongest available probe.
    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Read' })[0]);
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // A scroll on the snap scroller. jsdom has no layout, so the index cannot
    // actually advance — the point here is narrower and still real: the scroll
    // listener runs and the wipe does not answer it.
    const scroller = container.querySelector<HTMLElement>(
      '[aria-label="Blog reels"]',
    );
    expect(scroller).not.toBeNull();
    await act(async () => {
      scroller!.scrollTop = 400;
      scroller!.dispatchEvent(new Event('scroll'));
      await new Promise((resolve) => setTimeout(resolve, 40));
    });

    // A filter change reaches this component as new props.
    rerender(
      <BlogReels
        items={[...items, makeItem({ id: 3, slug: 'third-post' })]}
        total={3}
        hasMore
        loading={false}
        onLoadMore={vi.fn()}
        activeTag="reels"
      />,
    );

    expect(wipes()).toBe(1);
  });

  it('fires again on the next mount, because the mount is the beat', () => {
    // `/blog` renders `view === 'reels' ? <BlogReels/> : <BlogGrid/>`, so
    // switching away and back replaces the component type: "once per mount" is
    // "each time the reel view opens", not once per session.
    const first = renderReels();
    expect(wipes()).toBe(1);
    first.unmount();
    expect(mockTlRevert).toHaveBeenCalledTimes(1);

    renderReels();
    expect(wipes()).toBe(2);
  });

  it('never fires under reduced motion', () => {
    mockMatchMedia(true);
    const { container } = renderReels();

    // The reduced branch renders the stacked fallback and no flash root at all.
    expect(wipes()).toBe(0);
    expect(flashRoot(container)).toBeNull();
    expect(container.querySelector('[aria-label="Blog reels"]')).toBeNull();
    // Sanity: the cards are there, so nothing failed to render.
    expect(screen.getAllByRole('button', { name: 'Read' })).toHaveLength(
      items.length,
    );
  });
});
