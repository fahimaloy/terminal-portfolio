import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../utils/supabaseAdmin';
import type { BlogListItem } from '../../../types/blog';

const LIST_COLUMNS =
  'id, slug, title, excerpt, cover_image_url, cover_image_alt, status, featured, tags, reading_minutes, view_count, seo_title, seo_description, seo_keywords, canonical_url, published_at, created_at, updated_at';

const MAX_PAGE_SIZE = 50;

function toInt(value: unknown, fallback: number): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function toStr(value: unknown): string {
  const v = Array.isArray(value) ? value[0] : value;
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * GET /api/blogs
 * Public listing: published posts only, with search, tag filter, sort, pagination.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ ok: false, message: 'Method not allowed' });
    return;
  }

  // Return empty results when Supabase is not configured
  if (!supabaseAdmin) {
    res.status(200).json({
      ok: true,
      data: {
        items: [],
        total: 0,
        page: 1,
        pageSize: 9,
        hasMore: false,
      },
    });
    return;
  }

  try {
    const page = toInt(req.query.page, 1);
    const pageSize = Math.min(toInt(req.query.pageSize, 9), MAX_PAGE_SIZE);
    const search = toStr(req.query.search);
    const tag = toStr(req.query.tag);
    const sort = toStr(req.query.sort) === 'popular' ? 'popular' : 'recent';
    const featuredOnly = toStr(req.query.featured) === 'true';

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabaseAdmin
      .from('blog_posts')
      .select(LIST_COLUMNS, { count: 'exact' })
      .eq('status', 'published');

    if (featuredOnly) {
      query = query.eq('featured', true);
    }

    if (tag) {
      query = query.contains('tags', [tag]);
    }

    if (search) {
      const safe = search.replace(/[%,()]/g, ' ');
      query = query.or(
        `title.ilike.%${safe}%,excerpt.ilike.%${safe}%`,
      );
    }

    query =
      sort === 'popular'
        ? query.order('view_count', { ascending: false })
        : query.order('published_at', { ascending: false, nullsFirst: false });

    const { data, error, count } = await query.range(from, to);

    if (error) {
      throw error;
    }

    const items = (data ?? []) as unknown as BlogListItem[];
    const total = count ?? items.length;

    res.setHeader(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=300',
    );
    res.status(200).json({
      ok: true,
      data: {
        items,
        total,
        page,
        pageSize,
        hasMore: from + items.length < total,
      },
    });
  } catch {
    // Return empty results on any error (Supabase connection, query, etc.)
    res.status(200).json({
      ok: true,
      data: {
        items: [],
        total: 0,
        page: 1,
        pageSize: 9,
        hasMore: false,
      },
    });
  }
}
