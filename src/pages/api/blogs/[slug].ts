import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../utils/supabaseAdmin';
import type { BlogPost, BlogListItem } from '../../../types/blog';

const NEIGHBOUR_COLUMNS =
  'id, slug, title, excerpt, cover_image_url, cover_image_alt, status, featured, tags, reading_minutes, view_count, seo_title, seo_description, seo_keywords, canonical_url, published_at, created_at, updated_at';

/**
 * GET /api/blogs/[slug]
 * Returns one published post plus prev/next neighbours and related posts.
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

  if (!supabaseAdmin) {
    res.status(500).json({ ok: false, message: 'Missing server config' });
    return;
  }

  const slugParam = req.query.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;

  if (!slug) {
    res.status(400).json({ ok: false, message: 'Slug is required' });
    return;
  }

  try {
    const { data: post, error } = await supabaseAdmin
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!post) {
      res.status(404).json({ ok: false, message: 'Post not found' });
      return;
    }

    const typed = post as unknown as BlogPost;

    // Fire-and-forget view increment; never blocks the response.
    void supabaseAdmin
      .from('blog_posts')
      .update({ view_count: (typed.view_count ?? 0) + 1 })
      .eq('id', typed.id);

    const anchor = typed.published_at ?? typed.created_at;

    const [prevRes, nextRes, relatedRes] = await Promise.all([
      supabaseAdmin
        .from('blog_posts')
        .select(NEIGHBOUR_COLUMNS)
        .eq('status', 'published')
        .lt('published_at', anchor)
        .order('published_at', { ascending: false })
        .limit(1),
      supabaseAdmin
        .from('blog_posts')
        .select(NEIGHBOUR_COLUMNS)
        .eq('status', 'published')
        .gt('published_at', anchor)
        .order('published_at', { ascending: true })
        .limit(1),
      typed.tags && typed.tags.length > 0
        ? supabaseAdmin
            .from('blog_posts')
            .select(NEIGHBOUR_COLUMNS)
            .eq('status', 'published')
            .neq('id', typed.id)
            .overlaps('tags', typed.tags)
            .order('published_at', { ascending: false })
            .limit(3)
        : Promise.resolve({ data: [] as unknown[] }),
    ]);

    res.setHeader(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=300',
    );
    res.status(200).json({
      ok: true,
      data: {
        post: typed,
        prev: ((prevRes.data ?? [])[0] ?? null) as BlogListItem | null,
        next: ((nextRes.data ?? [])[0] ?? null) as BlogListItem | null,
        related: (relatedRes.data ?? []) as unknown as BlogListItem[],
      },
    });
  } catch {
    res.status(500).json({ ok: false, message: 'Failed to load blog post' });
  }
}
