// src/pages/__tests__/blog-index.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import React from 'react';

const { mockGetBlogPosts, mockScopeRevertBlog, mockTlAddBlog, mockSplitterRevertBlog, mockStaggerBlog } = vi.hoisted(() => ({
  mockGetBlogPosts: vi.fn(),
  mockScopeRevertBlog: vi.fn(),
  mockTlAddBlog: vi.fn(),
  mockSplitterRevertBlog: vi.fn(),
  mockStaggerBlog: vi.fn((v: unknown) => v as any),
}));

vi.mock('../../utils/blogApi', () => ({
  getBlogPosts: (...args: any[]) => mockGetBlogPosts(...args),
  getBlogPost: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../components/SEOMeta', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('../../components/blog/BlogReels', () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'blog-reels' }, `reels:${props.items.length}`);
  },
}));

vi.mock('../../components/ui/graphics/compositions/BlogEmptyGraphic', () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'blog-empty-graphic-mock', 'data-variant': props.variant }, `variant:${props.variant}`);
  },
}));

vi.mock('../../components/blog/BlogSearch', () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require('react');
    return React.createElement(
      'div',
      { 'data-testid': 'blog-search-mock' },
      React.createElement('input', {
        'data-testid': 'blog-search-input',
        value: props.value,
        onChange: (e: any) => props.onChange(e.target.value),
        placeholder: 'SEARCH',
      }),
      React.createElement(
        'button',
        {
          'data-testid': 'blog-tag-foo-btn',
          onClick: () => props.onTagChange(props.activeTag === 'foo' ? '' : 'foo'),
        },
        'TOGGLE_FOO'
      ),
      React.createElement('div', null, `tags:${props.tags?.join(',')}`),
      `search:${props.value}|tag:${props.activeTag}`
    );
  },
}));

vi.mock('animejs', () => {
  const mockScope: any = {
    add: vi.fn((cb: () => void) => {
      cb();
      return mockScope;
    }),
    revert: mockScopeRevertBlog,
  };
  return {
    __esModule: true,
    createScope: vi.fn(() => mockScope),
    createTimeline: vi.fn(() => ({ add: mockTlAddBlog } as any)),
    splitText: vi.fn(() => ({ chars: [{ style: {} }] as any, words: [{ style: {} }], revert: mockSplitterRevertBlog } as any)),
    stagger: mockStaggerBlog,
    animate: vi.fn(),
    createDrawable: vi.fn(() => []),
    spring: vi.fn(() => 'spring'),
    scrambleText: vi.fn(() => 'SCRAMBLE'),
  };
});

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children }: any) => {
    const React = require('react');
    return React.createElement('a', null, children);
  },
}));

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require('react');
    return React.createElement('img', props);
  },
}));

import BlogIndexPage from '../blog/index';
import { createScope, createTimeline } from 'animejs';

const mockedCreateScope = vi.mocked(createScope);
const mockedCreateTimeline = vi.mocked(createTimeline);

const mockItem: any = {
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
  published_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function emptyResponse(page = 1) {
  return { items: [], total: 0, page, pageSize: 5, hasMore: false };
}

function nonEmptyResponse(page = 1) {
  return { items: [mockItem], total: 1, page, pageSize: 5, hasMore: false };
}

function mockMatchMedia(reduceMatches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)' ? reduceMatches : false,
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any).matchMedia;
}

describe('BlogIndexPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia(false);
    mockGetBlogPosts.mockReset();
    mockGetBlogPosts.mockResolvedValue(emptyResponse());
  });

  afterEach(() => {
    clearMatchMedia();
    vi.clearAllMocks();
  });

  it('empty-state: renders NO TRANSMISSIONS FOUND with key empty and opacity reset before timeline', async () => {
    render(<BlogIndexPage />);
    await waitFor(() => expect(screen.getByText('NO TRANSMISSIONS FOUND')).toBeInTheDocument());

    const headline = document.querySelector<HTMLElement>('.blog-empty-headline');
    expect(headline).not.toBeNull();
    expect(headline!.textContent).toBe('NO TRANSMISSIONS FOUND');

    const graphic = document.querySelector<HTMLElement>('.blog-empty-graphic');
    expect(graphic).not.toBeNull();
    expect(graphic!.style.opacity).toBe('0');
    expect(graphic!.style.transform).toContain('translateY');

    expect(headline!.style.opacity).toBe('0');
    expect(headline!.style.transform).toContain('translateY');

    expect(mockedCreateScope).toHaveBeenCalled();
    expect(mockedCreateTimeline).toHaveBeenCalled();
    expect(mockTlAddBlog).toHaveBeenCalled();

    expect(screen.getByTestId('blog-empty-graphic-mock').getAttribute('data-variant')).toBe('empty');
  });

  it('hasFilters variant: switching search/tag remounts container and shows NO MATCHES', async () => {
    render(<BlogIndexPage />);
    await waitFor(() => expect(screen.getByText('NO TRANSMISSIONS FOUND')).toBeInTheDocument());

    const filterBtn = screen.getByText(/FILTER/);
    await act(async () => {
      fireEvent.click(filterBtn);
    });

    const input = screen.getByTestId('blog-search-input') as HTMLInputElement;
    expect(input).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(input, { target: { value: 'hello' } });
    });

    await waitFor(() => expect(screen.getByText('NO MATCHES')).toBeInTheDocument());

    const headline = document.querySelector<HTMLElement>('.blog-empty-headline');
    expect(headline!.textContent).toBe('NO MATCHES');

    const graphicMock = screen.getByTestId('blog-empty-graphic-mock');
    expect(graphicMock.getAttribute('data-variant')).toBe('no-results');

    expect(screen.getByText('CLEAR FILTERS')).toBeInTheDocument();
    const subcopy = document.querySelector<HTMLElement>('.blog-empty-subcopy');
    expect(subcopy).not.toBeNull();
    expect(subcopy!.textContent).toContain('Adjust your search');
    expect(subcopy!.style.opacity).toBe('0');
  });

  it('before timeline elements are reset to opacity 0 translateY (no stuck)', async () => {
    render(<BlogIndexPage />);
    await waitFor(() => expect(screen.getByText('NO TRANSMISSIONS FOUND')).toBeInTheDocument());

    const headline = document.querySelector<HTMLElement>('.blog-empty-headline')!;
    expect(headline.style.opacity).toBe('0');

    headline.style.opacity = '1';
    headline.style.transform = 'none';

    const filterBtn = screen.getByText(/FILTER/);
    await act(async () => {
      fireEvent.click(filterBtn);
    });
    const tagBtn = screen.getByTestId('blog-tag-foo-btn');
    await act(async () => {
      fireEvent.click(tagBtn);
    });
    await waitFor(() => expect(screen.getByText('NO MATCHES')).toBeInTheDocument());
    const newHeadline = document.querySelector<HTMLElement>('.blog-empty-headline')!;
    expect(newHeadline.style.opacity).toBe('0');
    expect(newHeadline.style.transform).toContain('translateY');
    const graphic = document.querySelector<HTMLElement>('.blog-empty-graphic')!;
    expect(graphic.style.opacity).toBe('0');
  });

  it('unmount does not throw and calls guarded revert', async () => {
    mockSplitterRevertBlog.mockImplementation(() => {
      throw new Error('splitter boom');
    });
    mockScopeRevertBlog.mockImplementation(() => {
      throw new Error('scope boom');
    });

    const { unmount } = render(<BlogIndexPage />);
    await waitFor(() => expect(screen.getByText('NO TRANSMISSIONS FOUND')).toBeInTheDocument());

    expect(() => unmount()).not.toThrow();

    expect(mockSplitterRevertBlog).toHaveBeenCalled();
    expect(mockScopeRevertBlog).toHaveBeenCalled();

    mockSplitterRevertBlog.mockReset();
    mockScopeRevertBlog.mockReset();
    mockSplitterRevertBlog.mockReturnValue(undefined);
    mockScopeRevertBlog.mockReturnValue(undefined);
    const { unmount: u2 } = render(<BlogIndexPage />);
    await waitFor(() => expect(screen.getByText(/NO TRANSMISSIONS|NO MATCHES/)).toBeInTheDocument());
    expect(() => u2()).not.toThrow();
    expect(mockScopeRevertBlog).toHaveBeenCalled();
  });

  it('rapid isEmpty toggle empty -> non-empty -> empty re-resets opacity to 0', async () => {
    let call = 0;
    mockGetBlogPosts.mockImplementation(() => {
      call++;
      if (call === 1) return Promise.resolve(emptyResponse(1));
      if (call === 2) return Promise.resolve(nonEmptyResponse(1));
      return Promise.resolve(emptyResponse(1));
    });

    render(<BlogIndexPage />);
    await waitFor(() => expect(screen.getByText('NO TRANSMISSIONS FOUND')).toBeInTheDocument());

    const filterBtn = screen.getByText(/FILTER/);
    await act(async () => {
      fireEvent.click(filterBtn);
    });
    const input = screen.getByTestId('blog-search-input');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'a' } });
    });
    await waitFor(() => expect(screen.getByTestId('blog-reels')).toBeInTheDocument());
    expect(screen.queryByText('NO TRANSMISSIONS FOUND')).not.toBeInTheDocument();
    expect(screen.queryByText('NO MATCHES')).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.change(input, { target: { value: '' } });
    });
    await waitFor(() => expect(screen.getByText('NO TRANSMISSIONS FOUND')).toBeInTheDocument());
    const headline = document.querySelector<HTMLElement>('.blog-empty-headline')!;
    expect(headline.style.opacity).toBe('0');
    const graphic = document.querySelector<HTMLElement>('.blog-empty-graphic')!;
    expect(graphic.style.opacity).toBe('0');
  });

  it('non-empty state does not render empty headline', async () => {
    mockGetBlogPosts.mockResolvedValue(nonEmptyResponse());
    render(<BlogIndexPage />);
    await waitFor(() => expect(screen.getByTestId('blog-reels')).toBeInTheDocument());
    expect(screen.queryByText('NO TRANSMISSIONS FOUND')).not.toBeInTheDocument();
    expect(screen.queryByText('NO MATCHES')).not.toBeInTheDocument();
  });
});
