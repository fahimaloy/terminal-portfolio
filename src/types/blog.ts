// src/types/blog.ts
/* Blog domain types shared by API routes, admin CRUD, and public pages. */

export type BlogStatus = 'draft' | 'published';

export interface BlogTag {
  id: number;
  name: string;
  slug: string;
}

export interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  /** Short reels card line — falls back to excerpt when null */
  teaser: string | null;
  /** Sanitized HTML produced by the TipTap editor */
  content_html: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  status: BlogStatus;
  featured: boolean;
  tags: string[];
  /** Minutes, derived from word count when not stored */
  reading_minutes: number | null;
  view_count: number;
  /* SEO */
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  canonical_url: string | null;
  /* Timestamps (ISO strings) */
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Lightweight shape used by listing/search endpoints (no content_html). */
export type BlogListItem = Omit<BlogPost, 'content_html'>;

export interface BlogListResponse {
  items: BlogListItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface BlogQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  tag?: string;
  status?: BlogStatus;
  featured?: boolean;
  sort?: 'recent' | 'popular';
}

/** Payload accepted by create/update endpoints. */
export interface BlogUpsertInput {
  slug?: string;
  title: string;
  excerpt?: string | null;
  teaser?: string | null;
  content_html: string;
  cover_image_url?: string | null;
  cover_image_alt?: string | null;
  status?: BlogStatus;
  featured?: boolean;
  tags?: string[];
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string[] | null;
  canonical_url?: string | null;
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 96);
}

/** Strip tags and estimate reading time at 200 wpm (min 1). */
export function estimateReadingMinutes(html: string): number {
  const text = html.replace(/<[^>]*>/g, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function excerptFromHtml(html: string, max = 180): string {
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
