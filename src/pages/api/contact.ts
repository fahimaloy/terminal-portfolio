import type { NextApiRequest, NextApiResponse } from 'next';
import { checkRateLimit, getClientIp } from '../../utils/rateLimit';

type ContactBody = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Rate limiting: 5 requests per 60 seconds per IP
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`contact:${clientIp}`, { maxRequests: 5, windowSeconds: 60 });
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString());
    return res.status(429).json({ message: 'Too many requests. Please try again later.' });
  }

  try {
    const { name, email, subject, message } = req.body as ContactBody;

    // Validate inputs
    if (!name || !email || !message) {
      return res
        .status(400)
        .json({ message: 'Name, email, and message are required.' });
    }

    if (name.length > 100) {
      return res
        .status(400)
        .json({ message: 'Name must be 100 characters or less.' });
    }

    if (subject && subject.length > 200) {
      return res
        .status(400)
        .json({ message: 'Subject must be 200 characters or less.' });
    }

    if (message.length < 10) {
      return res
        .status(400)
        .json({ message: 'Message must be at least 10 characters.' });
    }

    if (message.length > 5000) {
      return res
        .status(400)
        .json({ message: 'Message must be 5000 characters or less.' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email address.' });
    }

    // Store in Supabase if configured, otherwise log
    const { supabaseAdmin } = await import('../../utils/supabaseAdmin');
    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.from('contact_messages').insert({
        name: name.trim(),
        email: email.trim(),
        subject: subject?.trim() || null,
        message: message.trim(),
        status: 'unread',
      });

      if (error) {
        // eslint-disable-next-line no-console
        console.error('Contact insert error:', error);
        return res.status(500).json({ message: 'Failed to save message.' });
      }
    } else {
      // Fallback: log
      // eslint-disable-next-line no-console
      console.log('Contact message received:', {
        name,
        email,
        subject,
        message,
      });
    }

    return res.status(200).json({
      success: true,
      message:
        'Thank you! Your message has been received. I will get back to you soon.',
    });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('Contact API Error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
