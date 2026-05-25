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

interface ValidationError {
  field: string;
  message: string;
}

const validateInput = (body: LoginBody): ValidationError[] => {
  const errors: ValidationError[] = [];

  const username = body.username?.trim();
  const password = body.password;

  // Username validation
  if (!username || username.length === 0) {
    errors.push({ field: 'username', message: 'Username is required' });
  } else if (username.length < 2) {
    errors.push({
      field: 'username',
      message: 'Username must be at least 2 characters',
    });
  } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push({
      field: 'username',
      message: 'Username can only contain letters, numbers, and underscores',
    });
  }

  // Password validation
  if (!password || password.length === 0) {
    errors.push({ field: 'password', message: 'Password is required' });
  }

  return errors;
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

  // Seed default admin if needed (non-blocking)
  // eslint-disable-next-line no-console
  ensureDefaultAdminSeeded().catch(console.error);

  const body = (req.body || {}) as LoginBody;

  // Validate input before processing
  const validationErrors = validateInput(body);
  if (validationErrors.length > 0) {
    res.status(400).json({
      ok: false,
      message: validationErrors[0].message,
      validationErrors,
    });
    return;
  }

  // Use provided username or default - but only if valid
  const providedUsername = body.username?.trim();
  const username =
    providedUsername && providedUsername.length > 0
      ? providedUsername
      : getDefaultAdminUsername();

  const password = body.password;

  if (!password) {
    res.status(400).json({ ok: false, message: 'Password is required' });
    return;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('admin_users')
      .select('id, username, password_hash, email, is_active')
      .eq('username', username)
      .limit(1)
      .maybeSingle();

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Database query error:', error);
      res
        .status(500)
        .json({ ok: false, message: 'Server error. Please try again later.' });
      return;
    }

    if (!data || !data.is_active) {
      // Use generic message to prevent username enumeration
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
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Login handler error:', err);
    res.status(500).json({
      ok: false,
      message: 'An unexpected error occurred. Please try again.',
    });
  }
}
