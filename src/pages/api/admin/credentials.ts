import type { NextApiRequest, NextApiResponse } from 'next';
import {
  hashPassword,
  requireAdmin,
  verifyPassword,
} from '../../../utils/adminAuth';
import { supabaseAdmin } from '../../../utils/supabaseAdmin';

type CredentialsBody = {
  currentPassword?: string;
  username?: string;
  password?: string;
  email?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    res.status(405).json({ ok: false, message: 'Method not allowed' });
    return;
  }

  if (!supabaseAdmin) {
    res.status(500).json({ ok: false, message: 'Missing server config' });
    return;
  }

  const admin = await requireAdmin(req, res);
  if (!admin) {
    return;
  }

  const body = (req.body || {}) as CredentialsBody;
  const currentPassword = (body.currentPassword || '').trim();
  const nextUsername = body.username?.trim();
  const nextPassword = body.password?.trim();
  const nextEmail = body.email?.trim();

  if (!currentPassword) {
    res
      .status(400)
      .json({ ok: false, message: 'Current password is required' });
    return;
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('admin_users')
    .select('password_hash')
    .eq('id', admin.id)
    .limit(1)
    .maybeSingle();

  if (existingError || !existing) {
    res.status(404).json({ ok: false, message: 'Admin user not found' });
    return;
  }

  const validCurrentPassword = await verifyPassword(
    currentPassword,
    existing.password_hash,
  );

  if (!validCurrentPassword) {
    res.status(401).json({ ok: false, message: 'Current password is invalid' });
    return;
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (nextUsername) {
    updates.username = nextUsername;
  }

  if (typeof body.email !== 'undefined') {
    updates.email = nextEmail || null;
  }

  if (nextPassword) {
    updates.password_hash = await hashPassword(nextPassword);
  }

  const { data, error } = await supabaseAdmin
    .from('admin_users')
    .update(updates)
    .eq('id', admin.id)
    .select('username, email')
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    const message =
      error?.code === '23505'
        ? 'Username is already taken'
        : 'Failed to update credentials';
    res.status(400).json({ ok: false, message });
    return;
  }

  res.status(200).json({ ok: true, user: data });
}
