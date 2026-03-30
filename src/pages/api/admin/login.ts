import type { NextApiRequest, NextApiResponse } from 'next';
import {
  createSession,
  ensureDefaultAdminSeeded,
  getDefaultAdminUsername,
  verifyPassword,
} from '../../../utils/adminAuth';
import { supabaseAdmin } from '../../../utils/supabaseAdmin';

type LoginBody = {
  username?: string;
  password?: string;
};

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

  await ensureDefaultAdminSeeded();

  const body = (req.body || {}) as LoginBody;
  const username = (body.username || getDefaultAdminUsername()).trim();
  const password = (body.password || '').trim();

  if (!password) {
    res.status(400).json({ ok: false, message: 'Password is required' });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('admin_users')
    .select('id, username, password_hash, email, is_active')
    .eq('username', username)
    .limit(1)
    .maybeSingle();

  if (error || !data || !data.is_active) {
    res.status(401).json({ ok: false, message: 'Invalid credentials' });
    return;
  }

  const valid = await verifyPassword(password, data.password_hash);

  if (!valid) {
    res.status(401).json({ ok: false, message: 'Invalid credentials' });
    return;
  }

  await createSession(res, data.id);

  res.status(200).json({
    ok: true,
    user: {
      username: data.username,
      email: data.email,
    },
  });
}
