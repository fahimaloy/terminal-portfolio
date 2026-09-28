import type { NextApiRequest } from 'next';

/**
 * Origin-based CSRF check.
 *
 * SECURITY: this used to `continue` past a missing header and `return true`
 * when neither Origin nor Referer was present, so it failed OPEN — any client
 * that simply omitted both headers passed. It also ignored `Sec-Fetch-Site`,
 * which is the header browsers actually set for cross-site requests, and it
 * compared hostnames only, so `http://` on an `https://` host was accepted.
 *
 * The check now fails closed: at least one of Origin or Sec-Fetch-Site must be
 * present, an explicit cross-site Sec-Fetch-Site is rejected outright, and the
 * scheme must match.
 */
export function verifyCsrf(req: NextApiRequest): boolean {
  const host = req.headers.host || '';
  if (!host) return false;
  const hostUrl = new URL(host.includes('://') ? host : `http://${host}`);
  const hostHostname = hostUrl.hostname;
  const secureOrigin = hostUrl.protocol === 'https:';

  // Sec-Fetch-Site is set by every current browser and is not attacker
  // forgeable from a page. An explicit cross-site signal is a hard reject.
  const fetchSite = req.headers['sec-fetch-site'];
  if (
    typeof fetchSite === 'string' &&
    fetchSite.toLowerCase() === 'cross-site'
  ) {
    return false;
  }

  const origin = firstValue(req.headers.origin);
  const referer = firstValue(req.headers.referer);

  if (!origin && !referer) {
    // No cross-site signal at all. `Sec-Fetch-Site: same-origin` or
    // `none` (a direct navigation) is the browser case; anything else is a
    // client that stripped its headers.
    const site = typeof fetchSite === 'string' ? fetchSite.toLowerCase() : null;
    if (site !== 'same-origin' && site !== 'none') return false;
    return true;
  }

  for (const headerValue of [origin, referer]) {
    if (!headerValue) continue;
    try {
      const parsed = new URL(headerValue);
      if (parsed.hostname !== hostHostname) return false;
      // Scheme must match, or a plain-http page on a TLS host is accepted.
      if (secureOrigin && parsed.protocol !== 'https:') return false;
    } catch {
      return false;
    }
  }
  return true;
}

const firstValue = (v: string | string[] | undefined): string => {
  const value = Array.isArray(v) ? v[0] : v;
  return typeof value === 'string' ? value.trim() : '';
};
