import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../utils/supabaseAdmin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { sendMessageWithFallback, getActiveModels } from '../../utils/aiService';
import { checkRateLimit, getClientIp } from '../../utils/rateLimit';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Rate limiting: 20 requests per 60 seconds per IP
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`chat:${clientIp}`, { maxRequests: 20, windowSeconds: 60 });
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString());
    return res.status(429).json({ message: 'Too many requests. Please slow down.' });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: 'Invalid messages format' });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ message: 'Database config missing' });
    }

    // Fetch necessary data to build context
    const [
      { data: profile },
      { data: skills },
      { data: projects },
      { data: media },
      { data: knowledge },
    ] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .maybeSingle(),
      supabaseAdmin.from('skills').select('*').eq('is_visible', true),
      supabaseAdmin.from('projects').select('*').eq('is_visible', true),
      supabaseAdmin.from('project_media').select('*').eq('is_visible', true),
      supabaseAdmin.from('knowledge_bases').select('*').eq('is_visible', true),
    ]);

    // Construct Context String
    const contextStr = `
Profile: ${profile ? JSON.stringify(profile) : 'N/A'}
Skills: ${skills ? JSON.stringify(skills) : 'N/A'}
Projects: ${projects ? JSON.stringify(projects) : 'N/A'}
Project Media: ${media ? JSON.stringify(media) : 'N/A'}
Additional Knowledge Base: ${knowledge ? JSON.stringify(knowledge) : 'N/A'}
    `;

    const systemInstruction = `
You are an AI assistant for a portfolio website. Your sole purpose is to answer questions about the portfolio owner's professional life, working information, projects, and skills.
You are given the following JSON context about the portfolio owner. Rely STRICTLY on this data.
If asked about anything outside of this professional context (e.g., personal life secrets if not in context, coding help, general knowledge, math problems, random facts), politely decline and state you are only here to discuss professional details.
If the user wants to book a meeting or contact, encourage them to use the built-in "Book a Meeting" button/form on the UI. Keep your answers concise, professional, and friendly.

IMPORTANT - STRUCTURED PROJECT REFERENCES:
When your response references ANY project from the portfolio, you MUST use these exact markers:

1. If you want to show a list of multiple projects (e.g., "here are similar projects I've done"): Add [[PROJECT_LIST:id1,id2,id3]] at the end of your response where id1, id2, id3 are the actual project IDs from the data.

2. If you are showing details of a single project (e.g., "this project was built with..."): Add [[PROJECT_SINGLE:id]] at the end of your response.

3. If you mention a project inline in text (e.g., "similar to my work on Project X"): Add [[PROJECT_REF:id]] right after the project name mention in the text.

EXAMPLES:
- "I've done similar work in these projects: [[PROJECT_LIST:1,3,5]]"
- "My Hospital Management System project [[PROJECT_REF:2]] uses Vue.js"
- "Here are the details of my Go Auth project [[PROJECT_SINGLE:3]]"

Always include the project ID numbers that match the actual projects in the context data. Do NOT make up IDs.

Context Data:
${contextStr}
    `;

    // Check if DB-configured models exist, otherwise fall back to env var
    const dbModels = await getActiveModels();

    if (dbModels.length > 0) {
      // Use the new load-balanced AI service
      const response = await sendMessageWithFallback('chat', systemInstruction, messages);
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

    // Map messages for Gemini
    const formattedMessages = messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: { role: 'user', parts: [{ text: systemInstruction }] },
    });

    // Start chat with history (except the last message which is the current prompt)
    const history = formattedMessages.slice(0, -1);
    const currentMsg =
      formattedMessages[formattedMessages.length - 1].parts[0].text;

    const chat = model.startChat({
      history,
    });

    const result = await chat.sendMessage(currentMsg);
    const responseText = result.response.text();

    return res.status(200).json({ text: responseText });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('Chat Error:', error);
    return res
      .status(500)
      .json({ message: error.message || 'Error communicating with AI' });
  }
}
