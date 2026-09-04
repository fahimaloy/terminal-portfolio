import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../utils/supabaseAdmin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateWithFallback, getActiveModels } from '../../utils/aiService';
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

  // Rate limiting: 10 requests per 60 seconds per IP
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`project-match:${clientIp}`, {
    maxRequests: 10,
    windowSeconds: 60,
  });
  if (!rateLimit.allowed) {
    res.setHeader(
      'Retry-After',
      Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
    );
    return res
      .status(429)
      .json({ message: 'Too many requests. Please try again later.' });
  }

  try {
    const { description } = req.body;

    if (!description || typeof description !== 'string') {
      return res
        .status(400)
        .json({ message: 'Project description is required.' });
    }

    if (description.length > 5000) {
      return res
        .status(400)
        .json({ message: 'Description must be 5000 characters or less.' });
    }

    if (description.length < 20) {
      return res.status(400).json({
        message:
          'Please provide a more detailed description (at least 20 characters).',
      });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ message: 'Database config missing.' });
    }

    // Fetch projects, skills, and profile
    const [{ data: profile }, { data: skills }, { data: projects }] =
      await Promise.all([
        supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('is_active', true)
          .maybeSingle(),
        supabaseAdmin.from('skills').select('*').eq('is_visible', true),
        supabaseAdmin.from('projects').select('*').eq('is_visible', true),
      ]);

    const contextStr = `
Profile: ${JSON.stringify(profile)}
Skills: ${JSON.stringify(skills)}
Projects: ${JSON.stringify(projects)}
    `;

    const systemInstruction = `
You are a project-matching AI for a portfolio website. Your job is to analyze a client's project description and determine if the portfolio owner has done any similar work.

Context Data (portfolio owner):
${contextStr}

Instructions:
1. Carefully analyze the client's project description.
2. Compare it against the portfolio owner's projects, skills, and technologies.
3. Determine if the portfolio owner has done similar projects. Consider:
   - Technology stack similarities (languages, frameworks)
   - Domain/industry similarities
   - Feature/capability similarities
4. Your response MUST use these markers for project references:
   - If multiple similar projects found: mention them in text and add [[PROJECT_LIST:id1,id2,id3]] at the end
   - If one similar project found: mention it and add [[PROJECT_SINGLE:id]] at the end
   - Even if no exact match, reference relevant skills/projects: [[PROJECT_REF:id]] for inline mentions
5. Structure your response:
   - First paragraph: Acknowledge the client's request and provide a general assessment
   - Second paragraph: Explain similarities found (or explain why it's different/new territory)
   - Third paragraph: If similar projects exist, describe what was done and how it relates
   - Fourth paragraph: If there are unique aspects not covered by existing projects, explain how you (AI) can help tailor a solution
   - Fifth paragraph: Encourage to book a meeting or contact for further discussion
6. Be honest — if there are no similar projects, say so and highlight relevant skills/technologies the owner has that could apply.
7. Keep the tone professional and helpful. Do not hallucinate or fabricate information.
8. Always include the project reference markers where applicable.
`;

    // Check if DB-configured models exist, otherwise fall back to env var
    const dbModels = await getActiveModels();

    if (dbModels.length > 0) {
      // Use the new load-balanced AI service
      const response = await generateWithFallback(
        'project-match',
        systemInstruction,
        description,
      );
      return res.status(200).json({ text: response.text });
    }

    // ─── Fallback to env var Gemini ──────────────────────────
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        message:
          'No AI models configured. Please add models in the admin dashboard or set GEMINI_API_KEY in .env',
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: { role: 'user', parts: [{ text: systemInstruction }] },
    });

    const result = await model.generateContent(description);
    const responseText = result.response.text();

    return res.status(200).json({ text: responseText });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('Project Match Error:', error);
    return res
      .status(500)
      .json({ message: error.message || 'Error processing your request.' });
  }
}
