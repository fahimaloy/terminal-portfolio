import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../../../../utils/adminAuth';
import { supabaseAdmin } from '../../../../utils/supabaseAdmin';

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

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    // Fetch all providers and models
    const [{ data: providers }, { data: models }] = await Promise.all([
      supabaseAdmin
        .from('ai_providers')
        .select('*')
        .order('id', { ascending: true }),
      supabaseAdmin
        .from('ai_models')
        .select('*')
        .order('sort_order', { ascending: true }),
    ]);

    res.status(200).json({
      ok: true,
      providers: providers || [],
      models: models || [],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch AI data';
    res.status(400).json({ ok: false, message });
  }
}
