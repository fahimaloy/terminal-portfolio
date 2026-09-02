import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../../../utils/adminAuth';
import { supabaseAdmin } from '../../../utils/supabaseAdmin';

type Action =
  | 'upsertProfile'
  | 'createSkill'
  | 'updateSkill'
  | 'deleteSkill'
  | 'createProject'
  | 'updateProject'
  | 'deleteProject'
  | 'addProjectMedia'
  | 'deleteProjectMedia'
  | 'createKnowledgeBase'
  | 'updateKnowledgeBase'
  | 'deleteKnowledgeBase'
  | 'createMeeting'
  | 'updateMeeting'
  | 'deleteMeeting';

// Fields allowed for upsert/update per entity (whitelist for security).
const PROFILE_FIELDS = new Set([
  'full_name', 'title', 'bio', 'welcome_message', 'summary',
  'phone', 'email', 'location', 'website', 'github', 'linkedin',
  'resume_url', 'avatar_url', 'is_active',
]);

const SKILL_FIELDS = new Set([
  'name', 'category', 'level', 'icon_key', 'icon_type', 'icon_color',
  'duration', 'sort_order', 'is_visible',
]);

const PROJECT_FIELDS = new Set([
  'title', 'short_title', 'description', 'description_html', 'image_url',
  'thumbnail_url', 'icon_key', 'project_url', 'repo_url', 'languages',
  'tags', 'client_name', 'client_location', 'client_logo', 'featured',
  'featured_order', 'sort_order', 'is_visible',
]);

const MEDIA_FIELDS = new Set([
  'project_id', 'media_type', 'url', 'thumbnail_url', 'video_provider',
  'media_order', 'is_visible',
]);

const KNOWLEDGE_FIELDS = new Set([
  'category', 'content', 'is_visible',
]);

const MEETING_FIELDS = new Set([
  'name', 'email', 'date', 'time', 'reason', 'status',
]);

const filterFields = (payload: Record<string, unknown>, allowed: Set<string>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (allowed.has(key)) {
      result[key] = value;
    }
  }
  return result;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateRequiredFields = (payload: Record<string, unknown>, fields: string[]): string | null => {
  for (const f of fields) {
    const v = payload[f];
    if (v === undefined || v === null || (typeof v === 'string' && !v.trim())) {
      return `Missing required field: ${f}`;
    }
  }
  return null;
};

type Body = {
  action?: Action;
  id?: number;
  payload?: Record<string, unknown>;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, message: 'Method not allowed' });
    return;
  }

  if (!supabaseAdmin) {
    res.status(500).json({ ok: false, message: 'Missing server config' });
    return;
  }

  const admin = await requireAdmin(req, res);
  if (!admin) {
    return;
  }

  const body = (req.body || {}) as Body;
  const action = body.action;

  if (!action) {
    // eslint-disable-next-line no-console
    console.error('[admin/content] Missing action in request body:', body);
    res
      .status(400)
      .json({ ok: false, message: 'Missing "action" field in request body' });
    return;
  }

  // eslint-disable-next-line no-console
  console.log('[admin/content] action:', action, 'id:', body.id);

  try {
    const raw = body.payload || {};

    if (action === 'upsertProfile') {
      const payload = filterFields(raw, PROFILE_FIELDS);
      const { error } = await supabaseAdmin
        .from('profiles')
        .upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'createSkill') {
      const missing = validateRequiredFields(raw, ['name']);
      if (missing) {
        res.status(400).json({ ok: false, message: missing });
        return;
      }
      const payload = filterFields(raw, SKILL_FIELDS);
      const { error } = await supabaseAdmin.from('skills').insert(payload);
      if (error) throw error;
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'updateSkill') {
      const payload = filterFields(raw, SKILL_FIELDS);
      const { error } = await supabaseAdmin
        .from('skills')
        .update(payload)
        .eq('id', body.id || 0);
      if (error) throw error;
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'deleteSkill') {
      const { error } = await supabaseAdmin
        .from('skills')
        .delete()
        .eq('id', body.id || 0);
      if (error) throw error;
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'createProject') {
      const missing = validateRequiredFields(raw, ['title']);
      if (missing) {
        res.status(400).json({ ok: false, message: missing });
        return;
      }
      const payload = filterFields(raw, PROJECT_FIELDS);
      const { error } = await supabaseAdmin.from('projects').insert(payload);
      if (error) throw error;
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'updateProject') {
      const payload = filterFields(raw, PROJECT_FIELDS);
      const { error } = await supabaseAdmin
        .from('projects')
        .update(payload)
        .eq('id', body.id || 0);
      if (error) throw error;
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'deleteProject') {
      const { error } = await supabaseAdmin
        .from('projects')
        .delete()
        .eq('id', body.id || 0);
      if (error) throw error;
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'addProjectMedia') {
      const payload = filterFields(raw, MEDIA_FIELDS);
      const { error } = await supabaseAdmin.from('project_media').insert(payload);
      if (error) throw error;
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'deleteProjectMedia') {
      const { error } = await supabaseAdmin
        .from('project_media')
        .delete()
        .eq('id', body.id || 0);
      if (error) throw error;
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'createKnowledgeBase') {
      const payload = filterFields(raw, KNOWLEDGE_FIELDS);
      const { error } = await supabaseAdmin.from('knowledge_bases').insert(payload);
      if (error) throw error;
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'updateKnowledgeBase') {
      const payload = filterFields(raw, KNOWLEDGE_FIELDS);
      const { error } = await supabaseAdmin
        .from('knowledge_bases')
        .update(payload)
        .eq('id', body.id || 0);
      if (error) throw error;
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'deleteKnowledgeBase') {
      const { error } = await supabaseAdmin
        .from('knowledge_bases')
        .delete()
        .eq('id', body.id || 0);
      if (error) throw error;
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'createMeeting') {
      const missing = validateRequiredFields(raw, ['name', 'email']);
      if (missing) {
        res.status(400).json({ ok: false, message: missing });
        return;
      }
      if (raw.email && !EMAIL_REGEX.test(raw.email as string)) {
        res.status(400).json({ ok: false, message: 'Invalid email address.' });
        return;
      }
      const payload = filterFields(raw, MEETING_FIELDS);
      const { error } = await supabaseAdmin.from('meetings').insert(payload);
      if (error) throw error;
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'updateMeeting') {
      if (raw.email && !EMAIL_REGEX.test(raw.email as string)) {
        res.status(400).json({ ok: false, message: 'Invalid email address.' });
        return;
      }
      const payload = filterFields(raw, MEETING_FIELDS);
      const { error } = await supabaseAdmin
        .from('meetings')
        .update(payload)
        .eq('id', body.id || 0);
      if (error) throw error;
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'deleteMeeting') {
      const { error } = await supabaseAdmin
        .from('meetings')
        .delete()
        .eq('id', body.id || 0);
      if (error) throw error;
      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ ok: false, message: `Unknown action: "${action}"` });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[admin/content] "${action}" failed:`, error);
    // Extract message from Error, Supabase PostgrestError, or plain object
    const errObj = error as Record<string, unknown>;
    const message =
      error instanceof Error
        ? error.message
        : errObj && typeof errObj.message === 'string'
        ? errObj.message
        : 'Unknown error';
    const code =
      errObj && typeof errObj.code === 'string' ? errObj.code : undefined;
    const details =
      errObj && typeof errObj.details === 'string' ? errObj.details : undefined;
    res.status(500).json({
      ok: false,
      message: `Action "${action}" failed: ${message}`,
      ...(code && { code }),
      ...(details && { details }),
    });
  }
}
