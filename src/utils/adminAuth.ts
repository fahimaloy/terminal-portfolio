import crypto from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from './supabaseAdmin';

export type AdminUser = {
  id: string;
  username: string;
  email: string | null;
};

const SESSION_COOKIE_NAME = 'portfolio_admin_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

const ADMIN_DEFAULT_USERNAME =
  process.env.ADMIN_DEFAULT_USERNAME || 'fahimaloy';
const ADMIN_DEFAULT_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || 'dibona';
const ADMIN_DEFAULT_EMAIL =
  process.env.ADMIN_DEFAULT_EMAIL || 'private.fahimaloy@proton.me';

const SCRYPT_KEY_LEN = 64;

const toHex = (buffer: Buffer) => buffer.toString('hex');

const scryptAsync = (password: string, salt: string): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEY_LEN, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey as Buffer);
    });
  });

export const hashPassword = async (password: string): Promise<string> => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scryptAsync(password, salt);
  return `v1$${salt}$${toHex(hash)}`;
};

export const verifyPassword = async (
  password: string,
  encodedHash: string,
): Promise<boolean> => {
  const [version, salt, expectedHash] = encodedHash.split('$');
  if (version !== 'v1' || !salt || !expectedHash) {
    return false;
  }

  const actual = await scryptAsync(password, salt);
  const expected = Buffer.from(expectedHash, 'hex');

  if (expected.length !== actual.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    new Uint8Array(actual),
    new Uint8Array(expected),
  );
};

const parseCookies = (cookieHeader?: string): Record<string, string> => {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, part) => {
      const separator = part.indexOf('=');
      if (separator < 0) {
        return acc;
      }

      const key = part.slice(0, separator).trim();
      const value = decodeURIComponent(part.slice(separator + 1));
      acc[key] = value;
      return acc;
    }, {});
};

const createSessionCookieValue = (token: string) =>
  `${SESSION_COOKIE_NAME}=${encodeURIComponent(
    token,
  )}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(
    SESSION_TTL_MS / 1000,
  )}; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''}`;

const clearSessionCookieValue = () =>
  `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; ${
    process.env.NODE_ENV === 'production' ? 'Secure;' : ''
  }`;

const sessionTokenHash = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

export const ensureDefaultAdminSeeded = async (): Promise<void> => {
  if (!supabaseAdmin) {
    return;
  }

  const { data } = await supabaseAdmin
    .from('admin_users')
    .select('id')
    .eq('username', ADMIN_DEFAULT_USERNAME)
    .limit(1)
    .maybeSingle();

  if (data) {
    return;
  }

  const passwordHash = await hashPassword(ADMIN_DEFAULT_PASSWORD);

  await supabaseAdmin.from('admin_users').upsert(
    {
      username: ADMIN_DEFAULT_USERNAME,
      email: ADMIN_DEFAULT_EMAIL,
      password_hash: passwordHash,
      is_active: true,
    },
    { onConflict: 'username' },
  );
};

export const createSession = async (
  res: NextApiResponse,
  userId: string,
): Promise<void> => {
  if (!supabaseAdmin) {
    throw new Error('Missing Supabase server configuration');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = sessionTokenHash(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  const { error } = await supabaseAdmin.from('admin_sessions').insert({
    user_id: userId,
    session_token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (error) {
    throw new Error('Failed to create admin session');
  }

  res.setHeader('Set-Cookie', createSessionCookieValue(token));
};

export const clearSession = async (
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> => {
  if (supabaseAdmin) {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies[SESSION_COOKIE_NAME];

    if (token) {
      await supabaseAdmin
        .from('admin_sessions')
        .delete()
        .eq('session_token_hash', sessionTokenHash(token));
    }
  }

  res.setHeader('Set-Cookie', clearSessionCookieValue());
};

export const getAuthenticatedAdmin = async (
  req: NextApiRequest,
): Promise<AdminUser | null> => {
  if (!supabaseAdmin) {
    return null;
  }

  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE_NAME];

  if (!token) {
    return null;
  }

  const tokenHash = sessionTokenHash(token);

  const { data, error } = await supabaseAdmin
    .from('admin_sessions')
    .select('id, expires_at, admin_users ( id, username, email, is_active )')
    .eq('session_token_hash', tokenHash)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const expiresAt = new Date(data.expires_at).getTime();
  const user = Array.isArray(data.admin_users)
    ? data.admin_users[0]
    : data.admin_users;

  if (
    !user ||
    !user.is_active ||
    Number.isNaN(expiresAt) ||
    expiresAt < Date.now()
  ) {
    await supabaseAdmin.from('admin_sessions').delete().eq('id', data.id);
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
  };
};

export const requireAdmin = async (
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<AdminUser | null> => {
  const admin = await getAuthenticatedAdmin(req);

  if (!admin) {
    res.status(401).json({ ok: false, message: 'Unauthorized' });
    return null;
  }

  return admin;
};

export const getDefaultAdminUsername = (): string => ADMIN_DEFAULT_USERNAME;
