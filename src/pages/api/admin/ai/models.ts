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
    // GET - List all models with provider info
    if (req.method === 'GET') {
      const [{ data: models }, { data: providers }] = await Promise.all([
        supabaseAdmin
          .from('ai_models')
          .select('*')
          .order('sort_order', { ascending: true }),
        supabaseAdmin
          .from('ai_providers')
          .select('id, name, provider_type, identifier_slug'),
      ]);

      const providerMap = new Map((providers || []).map((p) => [p.id, p]));

      const enriched = (models || []).map((m) => ({
        ...m,
        provider: providerMap.get(m.provider_id) || null,
      }));

      res.status(200).json({ ok: true, models: enriched });
      return;
    }

    // POST - Create model(s)
    if (req.method === 'POST') {
      const { provider_id, model_names, display_name, identifier_slug, rpm_limit, rpd_limit } = req.body || {};

      if (!provider_id || !model_names || !Array.isArray(model_names) || model_names.length === 0) {
        res.status(400).json({ ok: false, message: 'provider_id and model_names (array) are required' });
        return;
      }

      if (!identifier_slug) {
        res.status(400).json({ ok: false, message: 'identifier_slug is required' });
        return;
      }

      // Verify provider exists and get current max sort_order
      const [{ data: provider }, { data: existingModels }] = await Promise.all([
        supabaseAdmin.from('ai_providers').select('*').eq('id', provider_id).single(),
        supabaseAdmin.from('ai_models').select('sort_order').order('sort_order', { ascending: false }).limit(1),
      ]);

      if (!provider) {
        res.status(404).json({ ok: false, message: 'Provider not found' });
        return;
      }

      let nextSortOrder = (existingModels?.[0]?.sort_order || 0) + 1;

      // Create model records
      const modelRecords = model_names.map((modelName: string) => {
        const identifier = `${identifier_slug}-${modelName.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase()}`;
        const record = {
          provider_id,
          model_name: modelName,
          display_name: display_name || modelName,
          identifier,
          sort_order: nextSortOrder++,
          is_active: true,
          rpm_limit: rpm_limit || null,
          rpd_limit: rpd_limit || null,
        };
        return record;
      });

      const { data, error } = await supabaseAdmin
        .from('ai_models')
        .insert(modelRecords)
        .select();

      if (error) {
        if (error.code === '23505') {
          res.status(409).json({ ok: false, message: 'One or more model identifiers already exist' });
          return;
        }
        throw error;
      }

      res.status(200).json({ ok: true, models: data || [] });
      return;
    }

    // PATCH - Update a model (limit values, toggle, display_name, etc.)
    if (req.method === 'PATCH') {
      const { id, ...updateFields } = req.body || {};

      if (!id) {
        res.status(400).json({ ok: false, message: 'id is required' });
        return;
      }

      const allowedFields = [
        'display_name', 'rpm_limit', 'rpd_limit', 'is_active',
        'model_name', 'sort_order', 'cooldown_until',
      ];

      const updateData: Record<string, unknown> = {};
      for (const field of allowedFields) {
        if (updateFields[field] !== undefined) {
          updateData[field] = updateFields[field];
        }
      }

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({ ok: false, message: 'No valid fields to update' });
        return;
      }

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabaseAdmin
        .from('ai_models')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      res.status(200).json({ ok: true, model: data });
      return;
    }

    // DELETE - Delete a model
    if (req.method === 'DELETE') {
      const { id } = req.body || {};

      if (!id) {
        res.status(400).json({ ok: false, message: 'id is required' });
        return;
      }

      const { error } = await supabaseAdmin
        .from('ai_models')
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
