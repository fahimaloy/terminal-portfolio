import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../utils/supabaseAdmin';
import {
  ensureDefaultAdminSeeded,
  getDefaultAdminUsername,
} from '../../../utils/adminAuth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ message: 'Method Not Allowed' });
    return;
  }

  if (!supabaseAdmin) {
    res.status(500).json({
      ok: false,
      message: 'Missing server config - check SUPABASE_SERVICE_ROLE_KEY',
    });
    return;
  }

  try {
    // Try to seed the admin user first
    await ensureDefaultAdminSeeded();

    const username = getDefaultAdminUsername();

    // Check if admin user exists
    const { data, error } = await supabaseAdmin
      .from('admin_users')
      .select('id, username, email, is_active, password_hash')
      .eq('username', username)
      .limit(1)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        ok: false,
        message: 'Database error',
        error: error.message,
        details: error,
      });
    }

    if (!data) {
      return res.status(404).json({
        ok: false,
        message: `Admin user '${username}' not found after seeding attempt`,
      });
    }

    // Return success without exposing password hash
    return res.status(200).json({
      ok: true,
      admin: {
        id: data.id,
        username: data.username,
        email: data.email,
        is_active: data.is_active,
        password_hash_length: data.password_hash?.length || 0,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      message: 'Unexpected error',
      error: err.message,
    });
  }
}
