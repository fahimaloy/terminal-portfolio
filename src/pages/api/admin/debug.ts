import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../utils/supabaseAdmin';
import {
  ensureDefaultAdminSeeded,
  getDefaultAdminUsername,
} from '../../../utils/adminAuth';
import { requireAdmin } from '../../../utils/adminAuth';

/**
 * Admin diagnostics.
 *
 * SECURITY: this endpoint used to be reachable by any anonymous caller. It
 * returned the admin row's username, email and id — a clean confirmation
 * oracle for a login brute force — and it called `ensureDefaultAdminSeeded()`
 * on the way, so it was also a write path that could re-seed the admin row
 * from `ADMIN_DEFAULT_PASSWORD`.
 *
 * It is now gated exactly like every other route under /api/admin, and is
 * refused outright in production. If you need a health check in production,
 * expose one that reports only "reachable" / "not reachable" and nothing else.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ message: 'Method Not Allowed' });
    return;
  }

  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ message: 'Not Found' });
    return;
  }

  if (!(await requireAdmin(req, res))) return;

  if (!supabaseAdmin) {
    res.status(500).json({
      ok: false,
      message:
        'Missing server config — set SUPABASE_SECRET_KEY (server-only, never the NEXT_PUBLIC_ variant)',
    });
    return;
  }

  try {
    await ensureDefaultAdminSeeded();

    const username = getDefaultAdminUsername();

    // Never select password_hash: this endpoint must not be able to leak
    // even its length.
    const { data, error } = await supabaseAdmin
      .from('admin_users')
      .select('id, username, email, is_active')
      .eq('username', username)
      .limit(1)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        ok: false,
        message: 'Database error',
      });
    }

    if (!data) {
      return res.status(404).json({
        ok: false,
        message: `Admin user '${username}' not found after seeding attempt`,
      });
    }

    return res.status(200).json({
      ok: true,
      admin: {
        id: data.id,
        username: data.username,
        email: data.email,
        is_active: data.is_active,
      },
    });
  } catch {
    return res.status(500).json({ ok: false, message: 'Unexpected error' });
  }
}
