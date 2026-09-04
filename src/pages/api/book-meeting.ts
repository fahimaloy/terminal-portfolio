import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../utils/supabaseAdmin';
import { checkRateLimit, getClientIp } from '../../utils/rateLimit';
import { verifyCsrf } from '../../utils/csrf';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  if (!verifyCsrf(req)) {
    return res.status(403).json({ message: 'Invalid origin.' });
  }

  // Rate limiting: 3 meeting bookings per 10 minutes per IP
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`book-meeting:${clientIp}`, {
    maxRequests: 3,
    windowSeconds: 600,
  });
  if (!rateLimit.allowed) {
    res.setHeader(
      'Retry-After',
      Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
    );
    return res
      .status(429)
      .json({ message: 'Too many booking attempts. Please try again later.' });
  }

  try {
    const { name, email, date, time, reason } = req.body;

    if (!name || !email || !date || !time) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (name.length > 100) {
      return res
        .status(400)
        .json({ message: 'Name must be 100 characters or less.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email address.' });
    }

    if (reason && reason.length > 1000) {
      return res
        .status(400)
        .json({ message: 'Reason must be 1000 characters or less.' });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ message: 'Database config missing' });
    }

    const { error } = await supabaseAdmin.from('meetings').insert({
      name: name.trim(),
      email: email.trim(),
      date,
      time,
      reason: reason?.trim() || null,
      status: 'pending',
    });

    if (error) {
      throw error;
    }

    return res
      .status(200)
      .json({ ok: true, message: 'Meeting booked successfully' });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('Book Meeting Error:', error);
    return res.status(500).json({ message: 'Error booking meeting' });
  }
}
