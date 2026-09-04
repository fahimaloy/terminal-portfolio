import type { NextApiRequest } from 'next';

export function verifyCsrf(req: NextApiRequest): boolean {
  const host = req.headers.host || '';
  const hostHostname = host.split(':')[0];
  for (const headerValue of [req.headers.origin, req.headers.referer]) {
    if (!headerValue) continue;
    const value = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    try {
      const parsedHostname = new URL(value).hostname;
      if (parsedHostname !== hostHostname) {
        return false;
      }
    } catch {
      return false;
    }
  }
  return true;
}
