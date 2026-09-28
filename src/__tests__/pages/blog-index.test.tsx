// src/__tests__/pages/blog-index.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  waitFor,
  act,
  fireEvent,
} from '@testing-library/react';

const {
  mockGetBlogPosts,
  mockScopeRevertBlog,
  mockTlAddBlog,
  mockSplitterRevertBlog,
  mockStaggerBlog,
  mockReplace,
  mockAsPath,
} = vi.hoisted(() => ({
  mockGetBlogPosts: vi.fn(),
  mockScopeRevertBlog: vi.fn(),
  mockTlAddBlog: vi.fn(),
  mockSplitterRevertBlog: vi.fn(),
  mockStaggerBlog: vi.fn((v: unknown) => v as never),
  mockReplace: vi.fn(),
  mockAsPath: { value: '/blog' },
}));

vi.mock('../../utils/blogApi', () => ({
  getBlogPosts: (...args: unknown[]) => mockGetBlogPosts(...args),
  getBlogPost: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../components/SEOMeta', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('../../components/blog/BlogReels', () => ({
  __esModule: true,
  default: (props: { items: unknown[] }) => {
    const React = require('react');
    return React.createElement(
      'div',
      { 'data-testid': 'blog-reels' },
      `reels:${props.items.length}`,
    );
  },
}));

vi.mock('../../components/blog/BlogGrid', () => ({
  __esModule: true,
  default: (props: { items: unknown[] }) => {
    const React = require('react');
    return React.createElement(
      'div',
      { 'data-testid': 'blog-grid' },
      `grid:${props.items.length}`,
    );
  },
}));

vi.mock('../../components/ui/graphics/compositions/BlogEmptyGraphic', () => ({
  __esModule: true,
  default: (props: { variant: string }) => {
    const React = require('react');
    return React.createElement(
      'div',
      {
        'data-testid': 'blog-empty-graphic-mock',
        'data-variant': props.variant,
      },
      `variant:${props.variant}`,
    );
  },
}));

vi.mock('animejs', () => {
  const mockScope = {
    add: vi.fn((cb: () => void) => {
      cb();
      return mockScope;
    }),
    revert: mockScopeRevertBlog,
  };
  return {
    __esModule: true,
    createScope: vi.fn(() => mockScope),
    createTimeline: vi.fn(() => ({ add: mockTlAddBlog }) as never),
    splitText: vi.fn(
      () =>
        ({
          chars: [{ style: {} }],
          words: [{ style: {} }],
          revert: mockSplitterRevertBlog,
        }) as never,
    ),
    stagger: mockStaggerBlog,
    animate: vi.fn(),
    createDrawable: vi.fn(() => []),
    spring: vi.fn(() => 'spring'),
  };
});

vi.mock('next/router', () => ({
  __esModule: true,
  // `asPath` tracks the last replace(), the way the real router does —
  // otherwise the page can never see its own URL change and the sync effect
  // would short-circuit on every write.
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
  default: ({ children }: { children: unknown }) => {
    const React = require('react');
    return React.createElement('a', null, children);
  },
}));

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: unknown) => {
    const React = require('react');
    return React.createElement('img', props as never);
  },
}));

import BlogIndexPage from '../../pages/blog/index';
import { createScope, createTimeline } from 'animejs';

const mockedCreateScope = vi.mocked(createScope);
const mockedCreateTimeline = vi.mocked(createTimeline);

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

function emptyResponse(page = 1) {
  return { items: [], total: 0, page, pageSize: 9, hasMore: false, facets: [] };
}

function nonEmptyResponse(page = 1) {
  return {
    items: [mockItem],
    total: 1,
    page,
    pageSize: 9,
    hasMore: false,
    facets: [{ tag: 'foo', count: 3 }],
  };
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

const searchInput = () =>
  screen.getByLabelText('Search blog posts') as HTMLInputElement;
const tagButton = () => screen.getByRole('button', { name: /Filter by tag/ });

describe('BlogIndexPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAsPath.value = '/blog';
    mockMatchMedia(false);
    mockGetBlogPosts.mockReset();
    mockGetBlogPosts.mockResolvedValue(emptyResponse());
  });

  afterEach(() => {
    clearMatchMedia();
    vi.clearAllMocks();
  });

  it('renders the persistent header with a search field and filter buttons', async () => {
    render(<BlogIndexPage />);
    await waitFor(() => expect(mockGetBlogPosts).toHaveBeenCalled());

    // Search is always visible — it is not behind a disclosure.
    expect(searchInput()).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Filter by tag/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Sort order/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /All filters/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Grid view' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Reels view' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('requests tag facets from the API instead of deriving them from the page buffer', async () => {
    mockGetBlogPosts.mockResolvedValue(nonEmptyResponse());
    render(<BlogIndexPage />);
    await waitFor(() =>
      expect(screen.getByTestId('blog-grid')).toBeInTheDocument(),
    );

    expect(mockGetBlogPosts).toHaveBeenCalledWith(
      expect.objectContaining({ facets: true }),
    );

    await act(async () => {
      fireEvent.click(tagButton());
    });
    // 'foo' is present on a post that is NOT on the current page, which is the
    // whole point of facets.
    expect(screen.getByRole('button', { name: /FOO/ })).toBeInTheDocument();
  });

  it('empty state shows the empty copy, not the filtered copy', async () => {
    render(<BlogIndexPage />);
    await waitFor(() =>
      expect(screen.getByText('NO TRANSMISSIONS YET')).toBeInTheDocument(),
    );

    const headline = document.querySelector<HTMLElement>(
      '.blog-empty-headline',
    );
    expect(headline).not.toBeNull();
    const graphic = document.querySelector<HTMLElement>('.blog-empty-graphic');
    expect(graphic).not.toBeNull();
    // `reveal`, not `opacity-0`: the hiding rule must be scoped to
    // `prefers-reduced-motion: no-preference`, and a Tailwind opacity class
    // survives scope.revert() and strands the empty state invisible.
    expect(graphic!.classList.contains('reveal')).toBe(true);
    expect(graphic!.classList.contains('opacity-0')).toBe(false);

    expect(mockedCreateScope).toHaveBeenCalled();
    expect(mockedCreateTimeline).toHaveBeenCalled();
    expect(mockTlAddBlog).toHaveBeenCalled();
    expect(
      screen
        .getByTestId('blog-empty-graphic-mock')
        .getAttribute('data-variant'),
    ).toBe('empty');
  });

  it('searching switches the empty state to the filtered variant and offers a reset', async () => {
    render(<BlogIndexPage />);
    await waitFor(() =>
      expect(screen.getByText('NO TRANSMISSIONS YET')).toBeInTheDocument(),
    );

    await act(async () => {
      fireEvent.change(searchInput(), { target: { value: 'hello' } });
    });

    await waitFor(() =>
      expect(screen.getByText('NO MATCHES')).toBeInTheDocument(),
    );
    expect(
      screen
        .getByTestId('blog-empty-graphic-mock')
        .getAttribute('data-variant'),
    ).toBe('no-results');
    expect(screen.getByText('CLEAR FILTERS')).toBeInTheDocument();
  });

  it('sorting alone counts as an active filter', async () => {
    render(<BlogIndexPage />);
    await waitFor(() =>
      expect(screen.getByText('NO TRANSMISSIONS YET')).toBeInTheDocument(),
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Sort order/ }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'MOST READ' }));
    });

    await waitFor(() =>
      expect(screen.getByText('NO MATCHES')).toBeInTheDocument(),
    );
  });

  it('filters are mirrored into the URL so the view is shareable', async () => {
    render(<BlogIndexPage />);
    await waitFor(() => expect(mockGetBlogPosts).toHaveBeenCalled());

    await act(async () => {
      fireEvent.change(searchInput(), { target: { value: 'react' } });
    });
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(
        '/blog?q=react',
        undefined,
        expect.objectContaining({ shallow: true }),
      ),
    );
  });

  it('clearing the search drops the query from the URL', async () => {
    render(<BlogIndexPage />);
    await waitFor(() => expect(mockGetBlogPosts).toHaveBeenCalled());

    await act(async () => {
      fireEvent.change(searchInput(), { target: { value: 'react' } });
    });
    // Wait for the debounced write to land before clearing, otherwise the
    // "clear" would race the pending debounce and the assertion would be
    // testing the scheduler, not the behaviour.
    await waitFor(() => expect(mockAsPath.value).toBe('/blog?q=react'));

    mockReplace.mockClear();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    });
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(
        '/blog',
        undefined,
        expect.objectContaining({ shallow: true }),
      ),
    );
    expect(mockAsPath.value).toBe('/blog');
  });

  it('grid is the default view and reels is opt-in', async () => {
    mockGetBlogPosts.mockResolvedValue(nonEmptyResponse());
    render(<BlogIndexPage />);
    await waitFor(() =>
      expect(screen.getByTestId('blog-grid')).toBeInTheDocument(),
    );
    expect(screen.queryByTestId('blog-reels')).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Reels view' }));
    });
    await waitFor(() =>
      expect(screen.getByTestId('blog-reels')).toBeInTheDocument(),
    );
    expect(screen.queryByTestId('blog-grid')).not.toBeInTheDocument();
  });

  it('unmount does not throw even when the scope and splitter throw', async () => {
    mockSplitterRevertBlog.mockImplementation(() => {
      throw new Error('splitter boom');
    });
    mockScopeRevertBlog.mockImplementation(() => {
      throw new Error('scope boom');
    });

    const { unmount } = render(<BlogIndexPage />);
    await waitFor(() =>
      expect(screen.getByText('NO TRANSMISSIONS YET')).toBeInTheDocument(),
    );
    expect(() => unmount()).not.toThrow();
    expect(mockScopeRevertBlog).toHaveBeenCalled();
  });
});
