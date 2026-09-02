import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../../../utils/adminAuth';
import { supabaseAdmin } from '../../../utils/supabaseAdmin';

interface SiteText {
  id?: number;
  key: string;
  value: string;
  category?: string;
  description?: string;
  is_active?: boolean;
  sort_order?: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!supabaseAdmin) {
    res.status(500).json({ ok: false, message: 'Missing server config' });
    return;
  }

  const admin = await requireAdmin(req, res);
  if (!admin) {
    return;
  }

  try {
    switch (req.method) {
      case 'GET': {
        const { data, error } = await supabaseAdmin
          .from('site_texts')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (error) {
          throw error;
        }

        res.status(200).json({ ok: true, data });
        return;
      }

      case 'POST': {
        const body = req.body as SiteText;

        // Validate required fields
        if (!body.key || !body.value) {
          res.status(400).json({
            ok: false,
            message: 'Key and Value are required fields',
          });
          return;
        }

        // Check if key already exists
        const { data: existing, error: existingError } = await supabaseAdmin
          .from('site_texts')
          .select('id')
          .eq('key', body.key)
          .maybeSingle();

        if (existingError) {
          throw existingError;
        }

        if (existing) {
          res.status(409).json({
            ok: false,
            message: `A site text with key '${body.key}' already exists`,
          });
          return;
        }

        // Get next sort_order
        const { count, error: countError } = await supabaseAdmin
          .from('site_texts')
          .select('*', { count: 'exact', head: true });

        if (countError) {
          throw countError;
        }

        const sortOrder = (count || 0) + 1;

        const { error } = await supabaseAdmin.from('site_texts').insert({
          key: body.key,
          value: body.value,
          category: body.category || 'ui',
          description: body.description || `Text for ${body.key}`,
          is_active: body.is_active !== undefined ? body.is_active : true,
          sort_order: body.sort_order || sortOrder,
        });

        if (error) {
          throw error;
        }

        res
          .status(201)
          .json({ ok: true, message: 'Site text created successfully' });
        return;
      }

      case 'PUT': {
        const body = req.body as { id: number; value: string; key?: string };

        if (!body.id || !body.value) {
          res.status(400).json({
            ok: false,
            message: 'ID and Value are required fields',
          });
          return;
        }

        const { error } = await supabaseAdmin
          .from('site_texts')
          .update({
            value: body.value,
            ...(body.key && { key: body.key }),
            updated_at: new Date().toISOString(),
          })
          .eq('id', body.id);

        if (error) {
          throw error;
        }

        res
          .status(200)
          .json({ ok: true, message: 'Site text updated successfully' });
        return;
      }

      case 'DELETE': {
        const body = req.body as { id: number };

        if (!body.id) {
          res.status(400).json({
            ok: false,
            message: 'ID is required',
          });
          return;
        }

        // Soft delete by setting is_active to false
        const { error } = await supabaseAdmin
          .from('site_texts')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', body.id);

        if (error) {
          throw error;
        }

        res
          .status(200)
          .json({ ok: true, message: 'Site text deleted successfully' });
        return;
      }

      default:
        res.setHeader('Allow', 'GET, POST, PUT, DELETE');
        res.status(405).json({ ok: false, message: 'Method not allowed' });
        return;
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred';
    // eslint-disable-next-line no-console
    console.error('[admin/site-texts] Error:', error);
    res.status(500).json({ ok: false, message });
  }
}
