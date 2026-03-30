import type { NextApiRequest, NextApiResponse } from 'next';
import {
  ensureDefaultAdminSeeded,
  getAuthenticatedAdmin,
} from '../../../utils/adminAuth';
import { supabaseAdmin } from '../../../utils/supabaseAdmin';

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

  await ensureDefaultAdminSeeded();

  const admin = await getAuthenticatedAdmin(req);
  if (!admin) {
    res.status(200).json({ ok: true, authenticated: false });
    return;
  }

  res.status(200).json({ ok: true, authenticated: true, user: admin });
}
