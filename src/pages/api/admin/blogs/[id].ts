import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../../../../utils/adminAuth';
import { supabaseAdmin } from '../../../../utils/supabaseAdmin';
import {
  slugify,
  estimateReadingMinutes,
  excerptFromHtml,
  type BlogUpsertInput,
} from '../../../../types/blog';

/**
 * /api/admin/blogs/[id]
 *   GET    — fetch one post (any status) for the editor
 *   PUT    — update a post
 *   DELETE — remove a post
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!supabaseAdmin) {
    res.status(500).json({ ok: false, message: 'Missing server config' });
    return;
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const idParam = req.query.id;
  const id = Number(Array.isArray(idParam) ? idParam[0] : idParam);

  if (!Number.isFinite(id)) {
    res.status(400).json({ ok: false, message: 'Invalid post id' });
    return;
  }

  try {
    switch (req.method) {
      case 'GET': {
        const { data, error } = await supabaseAdmin
          .from('blog_posts')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          res.status(404).json({ ok: false, message: 'Post not found' });
          return;
        }

        res.status(200).json({ ok: true, data });
        return;
      }

      case 'PUT': {
        const body = req.body as BlogUpsertInput;

        if (!body?.title?.trim()) {
          res.status(400).json({ ok: false, message: 'Title is required' });
          return;
        }
        if (!body?.content_html?.trim()) {
          res.status(400).json({ ok: false, message: 'Content is required' });
          return;
        }

        const { data: current, error: currentError } = await supabaseAdmin
          .from('blog_posts')
          .select('id, status, published_at')
          .eq('id', id)
          .maybeSingle();

        if (currentError) throw currentError;
        if (!current) {
          res.status(404).json({ ok: false, message: 'Post not found' });
          return;
        }

        const slug = slugify(body.slug?.trim() || body.title);

        const { data: clash, error: clashError } = await supabaseAdmin
          .from('blog_posts')
          .select('id')
          .eq('slug', slug)
          .neq('id', id)
          .maybeSingle();

        if (clashError) throw clashError;
        if (clash) {
          res
            .status(409)
            .json({ ok: false, message: 'Another post already uses this slug' });
          return;
        }

        const status = body.status === 'published' ? 'published' : 'draft';
        const wasPublished = current.status === 'published';

        // Preserve the original publish date; set it on first publish only.
        let publishedAt: string | null = current.published_at ?? null;
        if (status === 'published' && !wasPublished) {
          publishedAt = new Date().toISOString();
        } else if (status === 'draft') {
          publishedAt = null;
        }

        const payload = {
          slug,
          title: body.title.trim(),
          excerpt: body.excerpt?.trim() || excerptFromHtml(body.content_html),
          content_html: body.content_html,
          cover_image_url: body.cover_image_url ?? null,
          cover_image_alt: body.cover_image_alt ?? null,
          status,
          featured: Boolean(body.featured),
          tags: Array.isArray(body.tags) ? body.tags : [],
          reading_minutes: estimateReadingMinutes(body.content_html),
          seo_title: body.seo_title ?? null,
          seo_description: body.seo_description ?? null,
          seo_keywords: Array.isArray(body.seo_keywords)
            ? body.seo_keywords
            : null,
          canonical_url: body.canonical_url ?? null,
          published_at: publishedAt,
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabaseAdmin
          .from('blog_posts')
          .update(payload)
          .eq('id', id)
          .select('*')
          .single();

        if (error) throw error;

        res.status(200).json({ ok: true, data });
        return;
      }

      case 'DELETE': {
        const { error } = await supabaseAdmin
          .from('blog_posts')
          .delete()
          .eq('id', id);

        if (error) throw error;

        res.status(200).json({ ok: true });
        return;
      }

      default:
        res.setHeader('Allow', 'GET, PUT, DELETE');
        res.status(405).json({ ok: false, message: 'Method not allowed' });
        return;
    }
  } catch {
    res.status(500).json({ ok: false, message: 'Blog operation failed' });
  }
}
