import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../../../../utils/adminAuth';
import { supabaseAdmin } from '../../../../utils/supabaseAdmin';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, message: 'Method not allowed' });
    return;
  }

  if (!supabaseAdmin) {
    res.status(500).json({ ok: false, message: 'Missing server config' });
    return;
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const { modelIds } = req.body || {};

    if (!modelIds || !Array.isArray(modelIds) || modelIds.length === 0) {
      res.status(400).json({ ok: false, message: 'modelIds (array) is required' });
      return;
    }

    // Update sort_order for each model based on array position
    const updates = modelIds.map((id: number, index: number) => ({
      id,
      sort_order: index + 1,
      updated_at: new Date().toISOString(),
    }));

    for (const update of updates) {
      const { error } = await supabaseAdmin
        .from('ai_models')
        .update({ sort_order: update.sort_order, updated_at: update.updated_at })
        .eq('id', update.id);

      if (error) throw error;
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reorder models';
    res.status(400).json({ ok: false, message });
  }
}
