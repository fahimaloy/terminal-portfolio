// src/pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../utils/supabaseAdmin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  sendMessageWithFallback,
  getActiveModels,
} from '../../utils/aiService';
import { checkRateLimit, getClientIp } from '../../utils/rateLimit';
import { detectIntent } from '../../utils/intentDetection';

// Session abuse tracking
const sessionAbuse = new Map<string, { count: number; resetAt: number; bannedUntil: number }>();

function checkSessionAbuse(sessionId: string): boolean {
  const now = Date.now();
  const session = sessionAbuse.get(sessionId);
  if (session && session.bannedUntil > now) return true;
  if (session && session.resetAt < now) {
    sessionAbuse.delete(sessionId);
  }
  return false;
}

function recordAbuse(sessionId: string): boolean {
  const now = Date.now();
  const session = sessionAbuse.get(sessionId) || { count: 0, resetAt: now + 5 * 60 * 1000, bannedUntil: 0 };
  if (session.bannedUntil > now) return true;
  session.count += 1;
  if (session.count >= 10) {
    session.bannedUntil = now + 15 * 60 * 1000;
  }
  sessionAbuse.set(sessionId, session);
  return session.count >= 10;
}

async function buildRAGResponse(
  intent: string,
  skillFilter: number[] | undefined,
) {
  if (!supabaseAdmin) return null;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('is_active', true)
    .maybeSingle();

  switch (intent) {
    case 'list_projects': {
      let query = supabaseAdmin.from('projects').select('*').eq('is_visible', true);
      if (skillFilter && skillFilter.length > 0) {
        const { data: skills } = await supabaseAdmin.from('skills').select('name').in('id', skillFilter);
        if (skills?.length) {
          query = query.overlaps('tags', skills.map((s: any) => s.name));
        }
      }
      const { data: projects } = await query.order('sort_order');
      return {
        text: `Here are my projects${skillFilter?.length ? ' filtered by selected skills' : ''}:\n\n[[PROJECT_TABLE]]`,
        type: 'rag' as const,
        response_type: 'project_table' as const,
        data: { projects },
      };
    }

    case 'list_skills': {
      let query = supabaseAdmin.from('skills').select('*').eq('is_visible', true);
      if (skillFilter && skillFilter.length > 0) {
        query = query.in('id', skillFilter);
      }
      const { data: skills } = await query.order('sort_order');
      return {
        text: `Here are my technical skills:\n\n[[SKILL_LIST:${skills?.map((s: any) => s.id).join(',')}]]`,
        type: 'rag' as const,
        response_type: 'skill_list' as const,
        data: { skills },
      };
    }

    case 'list_experience': {
      const { data: experiences } = await supabaseAdmin
        .from('experiences')
        .select('*')
        .eq('is_visible', true)
        .order('from_date', { ascending: false });

      const enriched = await Promise.all(
        (experiences || []).map(async (exp: any) => {
          const { data: links } = await supabaseAdmin!
            .from('experience_projects')
            .select('project_id')
            .eq('experience_id', exp.id);
          if (!links?.length) return { ...exp, projects: [] };
          const { data: projs } = await supabaseAdmin!
            .from('projects')
            .select('id, title, short_title, thumbnail_url')
            .in('id', links.map((l: any) => l.project_id));
          return { ...exp, projects: projs || [] };
        }),
      );

      return {
        text: `Here's my professional experience:\n\n[[EXPERIENCE_TIMELINE]]`,
        type: 'rag' as const,
        response_type: 'experience_timeline' as const,
        data: { experiences: enriched },
      };
    }

    case 'about_me':
      return {
        text: [
          profile?.summary || profile?.bio || `Hi, I'm ${profile?.full_name || 'Fahim'}.`,
          profile?.welcome_message || '',
          profile?.bio || '',
        ].filter(Boolean).join('\n\n'),
        type: 'rag' as const,
        response_type: 'profile_info' as const,
        data: { profile },
      };

    case 'contact_info':
      return {
        text: [
          `You can reach me through:`,
          profile?.email ? `Email: ${profile.email}` : '',
          profile?.github ? `GitHub: ${profile.github}` : '',
          profile?.linkedin ? `LinkedIn: ${profile.linkedin}` : '',
          profile?.phone ? `Phone: ${profile.phone}` : '',
          profile?.website ? `Website: ${profile.website}` : '',
        ].filter(Boolean).join('\n'),
        type: 'rag' as const,
        response_type: 'contact_info' as const,
        data: { profile },
      };

    default:
      return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Rate limiting: 15 requests per 60 seconds per IP
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`chat:${clientIp}`, {
    maxRequests: 15,
    windowSeconds: 60,
  });
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString());
    return res.status(429).json({ message: 'Too many requests. Please slow down.' });
  }

  try {
    const { messages, skill_filter } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: 'Invalid messages format' });
    }

    // Session abuse check
    const sessionId = (req.headers['x-session-id'] as string) || clientIp;
    if (checkSessionAbuse(sessionId)) {
      return res.status(429).json({ message: 'Session temporarily banned due to abuse.' });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ message: 'Database config missing' });
    }

    const lastMessage = messages[messages.length - 1]?.text || '';
    const intent = detectIntent(lastMessage);

    // RAG-first: if intent matches, return DB data without AI
    if (intent && intent !== 'skill_detail') {
      const ragResponse = await buildRAGResponse(intent, skill_filter);
      if (ragResponse) {
        return res.status(200).json(ragResponse);
      }
    }

    // AI path: fetch full context and send to AI.
    // Only reached when RAG didn't handle the request — saves 6 queries on intent hits.
    const [
      { data: profile },
      { data: skills },
      { data: projects },
      { data: media },
      { data: knowledge },
      { data: experiences },
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').eq('is_active', true).maybeSingle(),
      supabaseAdmin.from('skills').select('*').eq('is_visible', true),
      supabaseAdmin.from('projects').select('*').eq('is_visible', true),
      supabaseAdmin.from('project_media').select('*').eq('is_visible', true),
      supabaseAdmin.from('knowledge_bases').select('*').eq('is_visible', true),
      supabaseAdmin.from('experiences').select('*').eq('is_visible', true),
    ]);

    const contextStr = `
Profile: ${profile ? JSON.stringify(profile) : 'N/A'}
Skills: ${skills ? JSON.stringify(skills) : 'N/A'}
Projects: ${projects ? JSON.stringify(projects) : 'N/A'}
Project Media: ${media ? JSON.stringify(media) : 'N/A'}
Experiences: ${experiences ? JSON.stringify(experiences) : 'N/A'}
Knowledge Base: ${knowledge ? JSON.stringify(knowledge) : 'N/A'}
`;

    const systemInstruction = `
You are an AI assistant for a portfolio website. Your sole purpose is to answer questions about the portfolio owner's professional life, projects, skills, and experience.

RULES:
1. Stay strictly on-topic. If asked about coding help, general knowledge, math, personal secrets, or anything outside this portfolio, politely decline.
2. Keep answers concise, professional, and friendly.
3. If the user wants to book a meeting or contact, encourage them to use the built-in forms.
4. For code generation, inappropriate content, or off-topic requests, respond: "I'm Fahim's portfolio assistant. I can help you learn about my skills, projects, and experience."

STRUCTURED MARKERS - USE THESE EXACTLY:

When listing or mentioning skills, use: [[SKILL:id]] or [[SKILL_LIST:id1,id2,...]]
When mentioning a project inline: [[PROJECT_REF:id]]
When listing multiple projects: [[PROJECT_LIST:id1,id2,id3]]
When showing a single project detail: [[PROJECT_SINGLE:id]]
When showing experience: [[EXPERIENCE_TIMELINE]]
When showing a project table: [[PROJECT_TABLE]]

Example: "I specialize in [[SKILL:1]] and [[SKILL:2]]. Here are some relevant projects: [[PROJECT_LIST:1,3,5]]"

Context Data:
${contextStr}
`;

    const dbModels = await getActiveModels();

    if (dbModels.length > 0) {
      const response = await sendMessageWithFallback('chat', systemInstruction, messages);
      return res.status(200).json({ text: response.text, type: 'ai' });
    }

    // Fallback to env var Gemini
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        message: 'No AI models configured. Please add models in admin dashboard or set GEMINI_API_KEY.',
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const formattedMessages = messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: { role: 'user', parts: [{ text: systemInstruction }] },
    });

    const history = formattedMessages.slice(0, -1);
    const currentMsg = formattedMessages[formattedMessages.length - 1].parts[0].text;
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(currentMsg);
    const responseText = result.response.text();

    return res.status(200).json({ text: responseText, type: 'ai' });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return res.status(500).json({ message: 'Error communicating with AI' });
  }
}
