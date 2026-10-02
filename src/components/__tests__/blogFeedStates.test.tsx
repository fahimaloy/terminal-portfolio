// src/components/__tests__/blogFeedStates.test.tsx
/* The blog feed has THREE facts to report, and for its whole life it reported
   two. `getBlogPosts` used to `catch` every failure and resolve to
   `EMPTY_LIST`, so a dead Supabase connection and a blog with zero posts
   produced an identical promise and an identical render: the cheerful
   "Nothing here yet" room, over a total outage.

   This file is the guard for the difference.

   ── Placement note ─────────────────────────────────────────────────────────
   This exercises `src/pages/blog/index.tsx`, which by repo convention lives
   beside its subject at `src/__tests__/pages/blog-index.test.tsx`. It sits here
   because this change's write scope is `src/components/__tests__/**` and that
   file is held by another agent. Nothing about the test depends on where it
   lives; move it when the scope allows. The pre-existing
   `blog-index.test.tsx` is deliberately NOT edited — it guards the EMPTY state
   and the animation choreography, and it still passes unchanged, which is
   itself part of the evidence that this did not regress anything. */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
  act,
} from '@testing-library/react';

const { mockGetBlogPosts, mockAsPath, mockReplace } = vi.hoisted(() => ({
  mockGetBlogPosts: vi.fn(),
  mockAsPath: { value: '/blog' },
  mockReplace: vi.fn(),
}));

vi.mock('../../utils/blogApi', () => ({
  __esModule: true,
  getBlogPosts: (...args: unknown[]) => mockGetBlogPosts(...args),
  // The page does not use the singular reader, but the barrel has to satisfy
  // the module shape for anything that reaches it through the mock.
  getBlogPost: vi.fn(() => Promise.resolve(null)),
  getFeaturedBlogPosts: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../components/SEOMeta', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('../../components/blog/BlogReels', () => ({
  __esModule: true,
  default: (props: { items: unknown[]; onLoadMore: () => void }) => {
    const React = require('react');
    return React.createElement(
      'div',
      { 'data-testid': 'blog-reels' },
      React.createElement(
        'button',
        {
          type: 'button',
          'data-testid': 'blog-reels-load-more',
          onClick: props.onLoadMore,
        },
        `reels:${props.items.length}`,
      ),
    );
  },
}));

vi.mock('../../components/blog/BlogGrid', () => ({
  __esModule: true,
  default: (props: { items: unknown[]; onLoadMore: () => void }) => {
    const React = require('react');
    return React.createElement(
      'div',
      { 'data-testid': 'blog-grid' },
      React.createElement(
        'button',
        {
          type: 'button',
          'data-testid': 'blog-grid-load-more',
          onClick: props.onLoadMore,
        },
        `grid:${props.items.length}`,
      ),
    );
  },
}));

vi.mock('../../components/ui/graphics/compositions/BlogEmptyGraphic', () => ({
  __esModule: true,
  default: ({ variant }: { variant: string }) => {
    const React = require('react');
    return React.createElement(
      'div',
      { 'data-testid': 'blog-empty-graphic', 'data-variant': variant },
      `variant:${variant}`,
    );
  },
}));

vi.mock('next/router', () => ({
  __esModule: true,
  useRouter: () => ({
    isReady: true,
    asPath: mockAsPath.value,
    query: {},
    replace: (url: string, _as?: unknown, _opts?: unknown) => {
      mockAsPath.value = url;
      return mockReplace(url, _as, _opts);
    },
    push: vi.fn(),
  }),
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: unknown; href: string }) => {
    const React = require('react');
    return React.createElement('a', { href }, children);
  },
}));

import BlogIndexPage from '../../pages/blog/index';

/* jsdom ships no `window.matchMedia`. `src/pages/blog/index.tsx` now builds a
   `createScope({ mediaQueries: { reduceMotion: … } })` for its empty-state
   choreography, and anime's `new Scope()` reads `win.matchMedia` in its
   constructor (`node_modules/animejs/dist/modules/scope/scope.js:77`) — so
   without this the scope THROWS inside a passive effect during mount and takes
   the whole component down, which is not a state this file is meant to test.

   Same shape as the stub in `ProjectMatchGrid.test.tsx` and the other component
   tests; the repo provides it per file rather than in `vitest.setup.ts`.
   `matches: false` = motion allowed, i.e. the production default. LOADING /
   EMPTY / ERROR are decided by the request, not by motion, so this stub is only
   here to stop the scope from throwing. */
function mockMatchMedia(reduceMatches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches:
        query === '(prefers-reduced-motion: reduce)' ? reduceMatches : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

mockMatchMedia(false);

const EMPTY_HEADLINE = 'Nothing here yet';
const EMPTY_SUBCOPY = 'Nothing published yet — check back soon.';
const FAULT_HEADLINE = 'The blog feed did not load';

const mockItem = {
  id: 1,
  slug: 'test-post',
  title: 'Test Post',
  excerpt: 'excerpt text',
  teaser: null,
  content_html: '<p>hello</p>',
  cover_image_url: null,
  cover_image_alt: null,
  status: 'published',
  featured: false,
  tags: ['foo'],
  reading_minutes: 2,
  view_count: 10,
  seo_title: null,
  seo_description: null,
  seo_keywords: null,
  canonical_url: null,
  published_at: '2026-01-01T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

/** A successful response carrying zero rows. This is the ONLY shape that may
 *  ever render the empty room. */
function emptyResponse() {
  return {
    items: [],
    total: 0,
    page: 1,
    pageSize: 9,
    hasMore: false,
    facets: [],
  };
}

function postsResponse(count = 1, hasMore = false) {
  return {
    items: Array.from({ length: count }, (_, i) => ({
      ...mockItem,
      id: i + 1,
    })),
    total: count,
    page: 1,
    pageSize: 9,
    hasMore,
    facets: [{ tag: 'foo', count: 1 }],
  };
}

const retryButton = () => screen.getByRole('button', { name: /retry feed/i });

describe('BlogIndexPage — LOADING / EMPTY / ERROR', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAsPath.value = '/blog';
    mockGetBlogPosts.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('LOADING: a pending fetch shows the skeleton and neither of the other two states', async () => {
    let release: (value: unknown) => void = () => {};
    mockGetBlogPosts.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );

    render(<BlogIndexPage />);

    // Three pulsing blocks — the existing initial-buffer skeleton.
    expect(document.querySelectorAll('.animate-pulse')).toHaveLength(3);
    expect(screen.queryByText(EMPTY_HEADLINE)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // Settle the dangling promise so nothing is left in flight at teardown.
    await act(async () => {
      release(emptyResponse());
    });
  });

  it('EMPTY: a successful zero-row response still renders the existing empty content, unchanged', async () => {
    mockGetBlogPosts.mockResolvedValue(emptyResponse());
    render(<BlogIndexPage />);

    await waitFor(() =>
      expect(screen.getByText(EMPTY_HEADLINE)).toBeInTheDocument(),
    );

    // The regression this whole change exists to protect: the ERROR path must
    // not be able to swallow EMPTY. Both halves of the original empty room.
    expect(screen.getByText(EMPTY_SUBCOPY)).toBeInTheDocument();
    expect(screen.getByTestId('blog-empty-graphic')).toHaveAttribute(
      'data-variant',
      'empty',
    );
    // The filterless variant's CTA, not the filtered one.
    expect(screen.getByRole('link', { name: 'Back home' })).toBeInTheDocument();
    expect(screen.queryByText('Clear filters')).not.toBeInTheDocument();

    // And no trace of a fault: this response was a success.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(FAULT_HEADLINE)).not.toBeInTheDocument();
  });

  it('ERROR: a rejected fetch renders a diagnostic fault readout, never the empty room', async () => {
    mockGetBlogPosts.mockRejectedValue(
      Object.assign(new Error('supabase unreachable'), {
        response: { data: { message: 'Supabase unreachable' } },
      }),
    );
    render(<BlogIndexPage />);

    const alert = await screen.findByRole('alert');

    expect(alert).toHaveTextContent(FAULT_HEADLINE);
    // It says what failed and where, rather than apologising for nothing.
    expect(alert).toHaveTextContent('STATUS');
    expect(alert).toHaveTextContent('REQUEST_FAILED');
    expect(alert).toHaveTextContent('SOURCE');
    expect(alert).toHaveTextContent('/api/blogs');
    // The transport's own words survive to the surface.
    expect(alert).toHaveTextContent('REPORTED');
    expect(alert).toHaveTextContent('Supabase unreachable');

    // The heart of the defect: an outage must never look like an empty blog.
    expect(screen.queryByText(EMPTY_HEADLINE)).not.toBeInTheDocument();
    expect(screen.queryByText(EMPTY_SUBCOPY)).not.toBeInTheDocument();
    expect(screen.queryByTestId('blog-empty-graphic')).not.toBeInTheDocument();
  });

  it('ERROR: falls back to site copy when the transport carries no usable message', async () => {
    // `{}` defeats every branch of getErrorMessage's narrowing, which is
    // exactly the case that must not render a blank readout row.
    mockGetBlogPosts.mockRejectedValue({});
    render(<BlogIndexPage />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The blog feed could not be reached.');
  });

  it('the three states never render the same DOM', async () => {
    /* Read the DOM only AFTER `act` resolves.
     *
     * Reading `container.innerHTML` from inside the `act` callback captures the
     * container before React has committed the mount, which yields `""`. That
     * does not show up uniformly: EMPTY and ERROR each set state from their
     * `.then`/`.catch`, which forces a commit and papers over the race, while
     * LOADING has no state update at all — so it is the one state that renders
     * an empty string and the assertion below fails for a reason that has
     * nothing to do with the state machine under test. */
    const capture = async (): Promise<string> => {
      let container!: HTMLElement;
      await act(async () => {
        ({ container } = render(<BlogIndexPage />));
      });
      return container.innerHTML;
    };

    // LOADING — a fetch that never comes back.
    mockGetBlogPosts.mockImplementation(() => new Promise(() => {}));
    const loadingHtml = await capture();
    cleanup();

    // EMPTY — a successful response with no rows.
    mockGetBlogPosts.mockResolvedValue(emptyResponse());
    const emptyHtml = await capture();
    cleanup();

    // ERROR — the same outcome as EMPTY used to produce.
    mockGetBlogPosts.mockRejectedValue(new Error('boom'));
    const errorHtml = await capture();
    cleanup();

    // Pairwise distinct, and none of them is empty markup — the assertion the
    // old two-state design could not have satisfied.
    expect(loadingHtml.length).toBeGreaterThan(0);
    expect(emptyHtml.length).toBeGreaterThan(0);
    expect(errorHtml.length).toBeGreaterThan(0);
    expect(loadingHtml).not.toBe(emptyHtml);
    expect(loadingHtml).not.toBe(errorHtml);
    expect(emptyHtml).not.toBe(errorHtml);
  });

  it('ERROR: retry triggers a fresh fetch even though no input changed', async () => {
    mockGetBlogPosts.mockRejectedValueOnce(new Error('transient outage'));
    render(<BlogIndexPage />);

    const firstCall = mockGetBlogPosts.mock.calls[0];
    await screen.findByRole('alert');

    // A recovered database. Deliberately the SAME arguments as the failed call:
    // if retry were expressed as `setPage(1)` (already 1) or as a re-render, the
    // effect would not re-run and this would still be showing the fault.
    mockGetBlogPosts.mockResolvedValueOnce(postsResponse());
    await act(async () => {
      fireEvent.click(retryButton());
    });

    await waitFor(() =>
      expect(screen.getByTestId('blog-grid')).toBeInTheDocument(),
    );
    expect(mockGetBlogPosts).toHaveBeenCalledTimes(2);
    expect(mockGetBlogPosts.mock.calls[1]).toEqual(firstCall);
    // And the fault is gone — a successful retry must not leave the readout up.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('ERROR: retry re-arms a failing fetch instead of stranding the reader on a dead button', async () => {
    mockGetBlogPosts.mockRejectedValue(new Error('still down'));
    render(<BlogIndexPage />);
    await screen.findByRole('alert');

    await act(async () => {
      fireEvent.click(retryButton());
    });
    await waitFor(() => expect(mockGetBlogPosts).toHaveBeenCalledTimes(2));

    // Still failing: the readout stays, and says so again.
    expect(screen.getByRole('alert')).toHaveTextContent('still down');

    // Now it comes back — with zero rows, which is the case that must land on
    // EMPTY and not be mistaken for a second failure.
    mockGetBlogPosts.mockResolvedValue(emptyResponse());
    await act(async () => {
      fireEvent.click(retryButton());
    });
    await waitFor(() =>
      expect(screen.getByText(EMPTY_HEADLINE)).toBeInTheDocument(),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(mockGetBlogPosts).toHaveBeenCalledTimes(3);
  });

  it('ERROR: a failure with posts already on screen keeps them and offers retry in a strip', async () => {
    mockGetBlogPosts.mockResolvedValueOnce(postsResponse(2, true));
    render(<BlogIndexPage />);
    await waitFor(() =>
      expect(screen.getByTestId('blog-grid')).toBeInTheDocument(),
    );

    // "Load more" fails. The reader already has two posts; a page takeover
    // would destroy readable content to describe a partial failure.
    //
    // `mockResolvedValue`, NOT `mockResolvedValueOnce`: the one-shot form leaves
    // the mock with no default, so the second fetch (the failing "load more")
    // would receive `undefined` instead of a promise and the page would throw
    // on `.then` before the rejection under test ever ran.
    mockGetBlogPosts.mockResolvedValue(postsResponse(2, true));
    mockGetBlogPosts.mockRejectedValueOnce(new Error('range request failed'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('blog-grid-load-more'));
    });

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'range request failed',
      ),
    );
    // The posts survived.
    expect(screen.getByTestId('blog-grid')).toHaveTextContent('grid:2');
    // And it is the strip, not the full-page fault: no alert role.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(FAULT_HEADLINE)).not.toBeInTheDocument();

    // The strip carries its own retry.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^retry$/i }));
    });
    await waitFor(() => expect(mockGetBlogPosts).toHaveBeenCalledTimes(3));
  });
});
