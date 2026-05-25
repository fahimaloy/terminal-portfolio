import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../utils/supabaseAdmin';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { name, email, date, time, reason } = req.body;

    if (!name || !email || !date || !time) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ message: 'Database config missing' });
    }

    const { error } = await supabaseAdmin.from('meetings').insert({
      name,
      email,
      date,
      time,
      reason: reason || null,
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
    return res
      .status(500)
      .json({ message: error.message || 'Error booking meeting' });
  }
}
