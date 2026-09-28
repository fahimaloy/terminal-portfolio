/**
 * identity.ts — single source of truth for who this site is.
 *
 * Before this module the name lived in four places that could disagree:
 * `config.json`, the Supabase `profiles` row, a hardcoded fallback in
 * HeroSection, and a hardcoded string in the splash. The Supabase row is
 * currently a placeholder ("Your Name"), which is why the hero rendered
 * "YOUR NAME" even though `config.json` says "Fahim Ahmed".
 *
 * Resolution order: config.json (checked in, always correct) → Supabase
 * override only when it is a real name → the config value. A database
 * placeholder can never win.
 */

import config from '../../config.json';

type ProfileLike = {
  full_name?: string | null;
  username?: string | null;
} | null;

/**
 * Character allowlist for a human name. A blocklist of placeholder strings is
 * open by construction — `<img src=x onerror=…>` is not on any list. This is
 * the positive form: a value containing markup is rejected because markup
 * contains characters a name does not.
 */
const NAME_CHARACTERS = /^[\p{L}\p{M}][\p{L}\p{M} .,'’-]*$/u;
const MAX_NAME_LENGTH = 80;

/** Values a CMS row can hold that are not an actual person. */
const NOT_A_NAME: Record<string, true> = {
  '': true,
  'your name': true,
  your_name: true,
  yourname: true,
  name: true,
  test: true,
  admin: true,
};

export const FALLBACK_NAME: string = config.name ?? 'Fahim Ahmed';
export const FALLBACK_HANDLE: string = config.social?.github ?? 'fahimaloy';

/** Type guard: `value` is a usable personal name, not a CMS placeholder. */
function isRealName(value?: string | null): value is string {
  if (!value) return false;
  const n = value.trim();
  if (n.length < 2 || n.length > MAX_NAME_LENGTH) return false;
  if (!NAME_CHARACTERS.test(n)) return false;
  return !NOT_A_NAME[n.toLowerCase()];
}

export function resolveName(profile?: ProfileLike): string {
  return isRealName(profile?.full_name)
    ? profile.full_name.trim()
    : FALLBACK_NAME.trim();
}

export function resolveHandle(profile?: ProfileLike): string {
  const raw = profile?.username?.trim().replace(/^@/, '') ?? '';
  return isRealName(raw) ? raw : FALLBACK_HANDLE;
}
