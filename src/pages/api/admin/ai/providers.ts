import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../../../../utils/adminAuth';
import { supabaseAdmin } from '../../../../utils/supabaseAdmin';

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
    // GET - List all providers (with masked API keys)
    if (req.method === 'GET') {
      const { data } = await supabaseAdmin
        .from('ai_providers')
        .select('*')
        .order('id', { ascending: true });

      // Mask API keys for security
      const masked = (data || []).map((p) => ({
        ...p,
        api_key: maskApiKey(p.api_key),
      }));

      res.status(200).json({ ok: true, providers: masked });
      return;
    }

    // POST - Create a provider
    if (req.method === 'POST') {
      const { name, provider_type, identifier_slug, api_key, base_url } = req.body || {};

      if (!name || !provider_type || !identifier_slug || !api_key) {
        res.status(400).json({ ok: false, message: 'name, provider_type, identifier_slug, and api_key are required' });
        return;
      }

      if (!['gemini', 'openai_compatible'].includes(provider_type)) {
        res.status(400).json({ ok: false, message: 'provider_type must be "gemini" or "openai_compatible"' });
        return;
      }

      if (provider_type === 'openai_compatible' && !base_url) {
        res.status(400).json({ ok: false, message: 'base_url is required for openai_compatible providers' });
        return;
      }

      const { data, error } = await supabaseAdmin
        .from('ai_providers')
        .insert({
          name,
          provider_type,
          identifier_slug,
          api_key,
          base_url: base_url || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          res.status(409).json({ ok: false, message: 'A provider with this identifier slug already exists' });
          return;
        }
        throw error;
      }

      res.status(200).json({ ok: true, provider: { ...data, api_key: maskApiKey(data.api_key) } });
      return;
    }

    // PATCH - Update a provider
    if (req.method === 'PATCH') {
      const { id, name, provider_type, identifier_slug, api_key, base_url, is_active } = req.body || {};

      if (!id) {
        res.status(400).json({ ok: false, message: 'id is required' });
        return;
      }

      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (provider_type !== undefined) updateData.provider_type = provider_type;
      if (identifier_slug !== undefined) updateData.identifier_slug = identifier_slug;
      if (api_key !== undefined) updateData.api_key = api_key;
      if (base_url !== undefined) updateData.base_url = base_url;
      if (is_active !== undefined) updateData.is_active = is_active;
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabaseAdmin
        .from('ai_providers')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          res.status(409).json({ ok: false, message: 'A provider with this identifier slug already exists' });
          return;
        }
        throw error;
      }

      res.status(200).json({ ok: true, provider: { ...data, api_key: maskApiKey(data.api_key) } });
      return;
    }

    // DELETE - Delete a provider
    if (req.method === 'DELETE') {
      const { id } = req.body || {};

      if (!id) {
        res.status(400).json({ ok: false, message: 'id is required' });
        return;
      }

      const { error } = await supabaseAdmin
        .from('ai_providers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      res.status(200).json({ ok: true });
      return;
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    res.status(405).json({ ok: false, message: 'Method not allowed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process request';
    res.status(400).json({ ok: false, message });
  }
}

function maskApiKey(key: string): string {
  if (key.length <= 8) return key.slice(0, 4) + '****';
  return key.slice(0, 4) + '****' + key.slice(-4);
}
