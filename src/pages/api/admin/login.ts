import type { NextApiRequest, NextApiResponse } from 'next';
import {
  createSession,
  ensureDefaultAdminSeeded,
  getDefaultAdminUsername,
  verifyPassword,
} from '../../../utils/adminAuth';
import { supabaseAdmin } from '../../../utils/supabaseAdmin';
import { checkRateLimit, getClientIp } from '../../../utils/rateLimit';

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

  // Rate limiting: 10 login attempts per 10 minutes per IP
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`login:${clientIp}`, {
    maxRequests: 10,
    windowSeconds: 600,
  });
  if (!rateLimit.allowed) {
    res.setHeader(
      'Retry-After',
      Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
    );
    res
      .status(429)
      .json({ ok: false, message: 'Too many login attempts. Please try again later.' });
    return;
  }

  ensureDefaultAdminSeeded().catch(console.error);

  const body = (req.body || {}) as LoginBody;

  const validationErrors = validateInput(body);
  if (validationErrors.length > 0) {
    res.status(400).json({
      ok: false,
      message: validationErrors[0].message,
      validationErrors,
    });
    return;
  }

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
      console.error('Database query error:', error);
      res
        .status(500)
        .json({ ok: false, message: 'Server error. Please try again later.' });
      return;
    }

    if (!data || !data.is_active) {
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
    console.error('Login handler error:', err);
    res.status(500).json({
      ok: false,
      message: 'An unexpected error occurred. Please try again.',
    });
  }
}
