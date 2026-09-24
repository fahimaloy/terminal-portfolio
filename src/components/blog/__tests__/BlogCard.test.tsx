// src/components/blog/__tests__/BlogCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => {
    const React = require('react');
    return React.createElement(React.Fragment, null, children);
  },
}));

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const React = require('react');
    return React.createElement('img', props);
  },
}));

import BlogCard from '../BlogCard';
import type { BlogListItem } from '../../../types/blog';

function post(overrides: Partial<BlogListItem> = {}): BlogListItem {
  return {
    id: 11,
    slug: 'retro-paper',
    title: 'Retro Paper Reading',
    excerpt: 'A warm reading surface with amber ink.',
    teaser: null,
    cover_image_url: 'https://example.com/cover.png',
    cover_image_alt: null,
    status: 'published',
    featured: false,
    tags: ['design', 'blog', 'retro', 'extra'],
    reading_minutes: 6,
    view_count: 42,
    seo_title: null,
    seo_description: null,
    seo_keywords: null,
    canonical_url: null,
    published_at: '2026-03-04T10:00:00.000Z',
    created_at: '2026-03-04T10:00:00.000Z',
    updated_at: '2026-03-04T10:00:00.000Z',
    ...overrides,
  };
}

describe('BlogCard', () => {
  it('renders cover, tag shelf, reading time, and clamped excerpt', () => {
    render(<BlogCard post={post()} index={0} />);
    expect(screen.getByText('Retro Paper Reading')).toBeInTheDocument();
    expect(screen.getByText(/6 MIN/)).toBeInTheDocument();
    expect(screen.getByText(/A warm reading surface/)).toBeInTheDocument();
    // Tag shelf shows the first three tags plus an overflow chip
    expect(screen.getByText('DESIGN')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
    // Cover uses the full-bleed aspect shell with a 240px floor
    const cover = document.querySelector(
      '.aspect-\\[4\\/3\\].min-h-\\[240px\\]',
    );
    expect(cover).not.toBeNull();
  });

  it('renders an initial-letter fallback when no cover exists', () => {
    render(<BlogCard post={post({ cover_image_url: null })} index={1} />);
    expect(screen.getByText('R')).toBeInTheDocument();
  });
});
