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
 * /api/admin/blogs
 *   GET  — list all posts (any status) for the admin table
 *   POST — create a post
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

  try {
    switch (req.method) {
      case 'GET': {
        const { data, error } = await supabaseAdmin
          .from('blog_posts')
          .select('*')
          .order('updated_at', { ascending: false });

        if (error) throw error;

        res.status(200).json({ ok: true, data });
        return;
      }

      case 'POST': {
        const body = req.body as BlogUpsertInput;

        if (!body?.title?.trim()) {
          res.status(400).json({ ok: false, message: 'Title is required' });
          return;
        }
        if (!body?.content_html?.trim()) {
          res.status(400).json({ ok: false, message: 'Content is required' });
          return;
        }

        const slug = slugify(body.slug?.trim() || body.title);

        const { data: clash, error: clashError } = await supabaseAdmin
          .from('blog_posts')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();

        if (clashError) throw clashError;
        if (clash) {
          res.status(409).json({
            ok: false,
            message: 'A post with this slug already exists',
          });
          return;
        }

        const status = body.status === 'published' ? 'published' : 'draft';

        const payload = {
          slug,
          title: body.title.trim(),
          excerpt: body.excerpt?.trim() || excerptFromHtml(body.content_html),
          teaser: body.teaser?.trim() || null,
          content_html: body.content_html,
          cover_image_url: body.cover_image_url ?? null,
          cover_image_alt: body.cover_image_alt ?? null,
          status,
          featured: Boolean(body.featured),
          tags: Array.isArray(body.tags) ? body.tags : [],
          reading_minutes: estimateReadingMinutes(body.content_html),
          view_count: 0,
          seo_title: body.seo_title ?? null,
          seo_description: body.seo_description ?? null,
          seo_keywords: Array.isArray(body.seo_keywords)
            ? body.seo_keywords
            : null,
          canonical_url: body.canonical_url ?? null,
          published_at:
            status === 'published' ? new Date().toISOString() : null,
        };

        const { data, error } = await supabaseAdmin
          .from('blog_posts')
          .insert(payload)
          .select('*')
          .single();

        if (error) throw error;

        res.status(201).json({ ok: true, data });
        return;
      }

      default:
        res.setHeader('Allow', 'GET, POST');
        res.status(405).json({ ok: false, message: 'Method not allowed' });
        return;
    }
  } catch {
    res.status(500).json({ ok: false, message: 'Blog operation failed' });
  }
}
