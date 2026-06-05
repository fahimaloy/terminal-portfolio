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
    res.status(400).json({ ok: false, message: 'Missing "action" field in request body' });
    return;
  }

  // eslint-disable-next-line no-console
  console.log('[admin/content] action:', action, 'id:', body.id);

  try {
    if (action === 'upsertProfile') {
      const { error } = await supabaseAdmin
        .from('profiles')
        .upsert(body.payload || {}, { onConflict: 'id' });
      if (error) {
        throw error;
      }
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'createSkill') {
      const { error } = await supabaseAdmin
        .from('skills')
        .insert(body.payload || {});
      if (error) {
        throw error;
      }
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'updateSkill') {
      const { error } = await supabaseAdmin
        .from('skills')
        .update(body.payload || {})
        .eq('id', body.id || 0);
      if (error) {
        throw error;
      }
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'deleteSkill') {
      const { error } = await supabaseAdmin
        .from('skills')
        .delete()
        .eq('id', body.id || 0);
      if (error) {
        throw error;
      }
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'createProject') {
      const { error } = await supabaseAdmin
        .from('projects')
        .insert(body.payload || {});
      if (error) {
        throw error;
      }
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'updateProject') {
      const { error } = await supabaseAdmin
        .from('projects')
        .update(body.payload || {})
        .eq('id', body.id || 0);
      if (error) {
        throw error;
      }
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'deleteProject') {
      const { error } = await supabaseAdmin
        .from('projects')
        .delete()
        .eq('id', body.id || 0);
      if (error) {
        throw error;
      }
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'addProjectMedia') {
      const { error } = await supabaseAdmin
        .from('project_media')
        .insert(body.payload || {});
      if (error) {
        throw error;
      }
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'deleteProjectMedia') {
      const { error } = await supabaseAdmin
        .from('project_media')
        .delete()
        .eq('id', body.id || 0);
      if (error) {
        throw error;
      }
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'createKnowledgeBase') {
      const { error } = await supabaseAdmin
        .from('knowledge_bases')
        .insert(body.payload || {});
      if (error) {
        throw error;
      }
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'updateKnowledgeBase') {
      const { error } = await supabaseAdmin
        .from('knowledge_bases')
        .update(body.payload || {})
        .eq('id', body.id || 0);
      if (error) {
        throw error;
      }
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'deleteKnowledgeBase') {
      const { error } = await supabaseAdmin
        .from('knowledge_bases')
        .delete()
        .eq('id', body.id || 0);
      if (error) {
        throw error;
      }
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'createMeeting') {
      const { error } = await supabaseAdmin
        .from('meetings')
        .insert(body.payload || {});
      if (error) {
        throw error;
      }
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'updateMeeting') {
      const { error } = await supabaseAdmin
        .from('meetings')
        .update(body.payload || {})
        .eq('id', body.id || 0);
      if (error) {
        throw error;
      }
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'deleteMeeting') {
      const { error } = await supabaseAdmin
        .from('meetings')
        .delete()
        .eq('id', body.id || 0);
      if (error) {
        throw error;
      }
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
        : (errObj && typeof errObj.message === 'string' ? errObj.message : 'Unknown error');
    const code = errObj && typeof errObj.code === 'string' ? errObj.code : undefined;
    const details = errObj && typeof errObj.details === 'string' ? errObj.details : undefined;
    res.status(500).json({
      ok: false,
      message: `Action "${action}" failed: ${message}`,
      ...(code && { code }),
      ...(details && { details }),
    });
  }
}
