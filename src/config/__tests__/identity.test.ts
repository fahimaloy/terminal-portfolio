import { describe, it, expect } from 'vitest';
import {
  resolveName,
  resolveHandle,
  FALLBACK_NAME,
  FALLBACK_HANDLE,
} from '../identity';

describe('identity', () => {
  it('prefers a real name from the profile', () => {
    expect(resolveName({ full_name: 'Ada Lovelace' })).toBe('Ada Lovelace');
  });

  it('accepts non-ASCII names and name punctuation', () => {
    expect(resolveName({ full_name: "Renée O'Neill" })).toBe("Renée O'Neill");
    expect(resolveName({ full_name: 'Иван Петров' })).toBe('Иван Петров');
  });

  it.each([
    ['Your Name', 'CMS placeholder'],
    ['yourname', 'CMS placeholder'],
    ['admin', 'CMS placeholder'],
    ['A', 'too short'],
  ])('falls back for %s (%s)', (value) => {
    expect(resolveName({ full_name: value })).toBe(FALLBACK_NAME);
  });

  it('rejects markup rather than enumerating it', () => {
    // A blocklist of placeholder strings passes anything not on it, including
    // this. The allowlist is what makes it fail.
    expect(resolveName({ full_name: '<img src=x onerror=alert(1)>' })).toBe(
      FALLBACK_NAME,
    );
    expect(resolveName({ full_name: 'Jane<script>' })).toBe(FALLBACK_NAME);
    expect(resolveName({ full_name: 'x'.repeat(200) })).toBe(FALLBACK_NAME);
  });

  it('resolves the handle, stripping a leading @', () => {
    expect(resolveHandle({ username: '@octocat' })).toBe('octocat');
    expect(resolveHandle({ username: 'octocat' })).toBe('octocat');
    expect(resolveHandle(null)).toBe(FALLBACK_HANDLE);
  });
});
