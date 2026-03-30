import type { NextApiRequest, NextApiResponse } from 'next';
import { clearSession } from '../../../utils/adminAuth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, message: 'Method not allowed' });
    return;
  }

  await clearSession(req, res);
  res.status(200).json({ ok: true });
}
