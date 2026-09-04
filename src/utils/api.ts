import axios from 'axios';
import config from '../../config.json';
import { supabase, hasSupabaseConfig as hasSupabaseClientConfig } from './supabase';

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_PREFIX = 'portfolio_cache:';

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

const getStorageKey = (key: string) => `${CACHE_PREFIX}${key}`;

const isBrowser = () => typeof window !== 'undefined';

const readCache = <T>(key: string): T | null => {
  const now = Date.now();
  const memoryHit = memoryCache.get(key) as CacheEntry<T> | undefined;

  if (memoryHit && memoryHit.expiresAt > now) {
    return memoryHit.value;
  }

  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = localStorage.getItem(getStorageKey(key));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || parsed.expiresAt <= now) {
      localStorage.removeItem(getStorageKey(key));
      return null;
    }

    memoryCache.set(key, parsed as CacheEntry<unknown>);
    return parsed.value;
  } catch (error) {
    return null;
  }
};

const writeCache = <T>(key: string, value: T): void => {
  const entry: CacheEntry<T> = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value,
  };

  memoryCache.set(key, entry as CacheEntry<unknown>);

  if (!isBrowser()) {
    return;
  }

  try {
    localStorage.setItem(getStorageKey(key), JSON.stringify(entry));
  } catch (error) {
    // Ignore storage quota or privacy-mode failures.
  }
};

const clearPortfolioCache = (): void => {
  memoryCache.clear();
  inFlight.clear();

  if (!isBrowser()) {
    return;
  }

  try {
    const keysToDelete = Array.from(
      { length: localStorage.length },
      (_, i) => localStorage.key(i),
    ).filter((k): k is string => Boolean(k && k.startsWith(CACHE_PREFIX)));

    keysToDelete.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    // Ignore storage availability errors.
  }
};

const isNetworkError = (err: unknown): boolean => {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  return (
    err instanceof TypeError ||
    /Failed to fetch/i.test(msg) ||
    /fetch failed/i.test(msg) ||
    /NetworkError/i.test(msg) ||
    /Load failed/i.test(msg) ||
    /ECONNREFUSED/i.test(msg) ||
    /CORS/i.test(msg)
  );
};

const getCachedOrFetch = async <T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> => {
  const cached = readCache<T>(key);
  if (cached !== null) {
    return cached;
  }

  const pending = inFlight.get(key) as Promise<T> | undefined;
  if (pending) {
    return pending;
  }

  const promise = fetcher()
    .then((result) => {
      writeCache(key, result);
      return result;
    })
    .catch((err) => {
      if (isNetworkError(err)) {
        console.warn(`[getCachedOrFetch] ${key} network error — not caching:`, (err as Error).message || err);
      }
      throw err;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise as Promise<unknown>);
  return promise;
};

export interface PortfolioSkill {
  id: number;
  name: string;
  category: string | null;
  level: string | null;
  icon_key: string | null;
  icon_type: string | null;
  icon_color: string | null;
  duration: string | null;
  sort_order: number;
  is_visible: boolean;
}

export interface PortfolioProject {
  id: number;
  title: string;
  description: string | null;
  description_html: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  short_title: string | null;
  icon_key: string | null;
  project_url: string | null;
  repo_url: string | null;
  languages: string[] | null;
  tags: string[] | null;
  client_name: string | null;
  client_location: string | null;
  client_logo: string | null;
  featured: boolean;
  featured_order: number;
  sort_order: number;
  is_visible: boolean;
}

export interface PortfolioProjectMedia {
  id: number;
  project_id: number;
  media_type: 'image' | 'video';
  url: string;
  thumbnail_url: string | null;
  video_provider: 'youtube' | 'vimeo' | 'direct' | null;
  media_order: number;
  is_visible: boolean;
}

export interface PortfolioKnowledgeBase {
  id: number;
  category: string;
  content: string;
  is_visible: boolean;
  created_at?: string;
}

export interface PortfolioMeeting {
  id: number;
  name: string;
  email: string;
  date: string;
  time: string;
  reason: string | null;
  status: string;
  created_at?: string;
}

export interface PortfolioProfile {
  id: string;
  full_name: string;
  title: string | null;
  bio: string | null;
  welcome_message: string | null;
  summary: string | null;
  phone: string | null;
  email: string | null;
  location: string | null;
  website: string | null;
  github: string | null;
  linkedin: string | null;
  resume_url: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

export interface SiteText {
  id: number;
  key: string;
  value: string;
  category: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

export type PortfolioExperience = {
  id: number;
  title: string;
  company_name: string;
  company_logo: string | null;
  location: string | null;
  from_date: string;
  to_date: string | null;
  is_current: boolean;
  description: string | null;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  projects?: PortfolioProject[];
  skills?: PortfolioSkill[];
};

export type ExperienceProject = {
  experience_id: number;
  project_id: number;
};

const hasSupabaseConfig = (): boolean =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
      hasSupabaseClientConfig(),
  );

// Mutating actions that should invalidate the public cache
const MUTATING_ACTIONS = new Set([
  'upsertProfile',
  'createSkill',
  'updateSkill',
  'deleteSkill',
  'createProject',
  'updateProject',
  'deleteProject',
  'addProjectMedia',
  'deleteProjectMedia',
  'createKnowledgeBase',
  'updateKnowledgeBase',
  'deleteKnowledgeBase',
  'createMeeting',
  'updateMeeting',
  'deleteMeeting',
]);

const adminContentAction = async (
  action: string,
  payload?: Record<string, unknown>,
  id?: number,
): Promise<boolean> => {
  try {
    const { data } = await axios.post('/api/admin/content', {
      action,
      payload,
      id,
    });
    if (data?.ok && MUTATING_ACTIONS.has(action)) {
      clearPortfolioCache();
    }
    return Boolean(data?.ok);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const respData = error.response?.data as Record<string, unknown> | undefined;
      console.error(
        `[adminContentAction] "${action}" failed (${error.response?.status}):`,
        (respData && respData.message) || error.message,
        respData,
      );
    } else {
      console.error(`[adminContentAction] "${action}" failed:`, error);
    }
    return false;
  }
};

export const getPortfolioSkills = async (): Promise<PortfolioSkill[]> => {
  if (!hasSupabaseConfig() || !supabase) {
    return [];
  }

  try {
    return await getCachedOrFetch('skills', async () => {
      try {
        const { data, error } = await supabase!
          .from('skills')
          .select('*')
          .eq('is_visible', true)
          .order('sort_order', { ascending: true })
          .order('id', { ascending: true });

        if (error || !data) {
          return [];
        }

        return data as PortfolioSkill[];
      } catch (e) {
        if (isNetworkError(e)) throw e;
        console.warn('[getPortfolioSkills] query failed', (e as Error).message || e);
        return [];
      }
    });
  } catch (e) {
    if (isNetworkError(e)) {
      console.warn('[getPortfolioSkills] Supabase unavailable — returning empty:', (e as Error).message || e);
      return [];
    }
    throw e;
  }
};

export const getKnowledgeBases = async (): Promise<PortfolioKnowledgeBase[]> => {
  if (!hasSupabaseConfig() || !supabase) {
    return [];
  }

  try {
    return await getCachedOrFetch('knowledge_bases', async () => {
      try {
        const { data, error } = await supabase!
          .from('knowledge_bases')
          .select('*')
          .order('id', { ascending: true });

        if (error || !data) {
          return [];
        }

        return data as PortfolioKnowledgeBase[];
      } catch (e) {
        if (isNetworkError(e)) throw e;
        console.warn('[getKnowledgeBases] query failed', (e as Error).message || e);
        return [];
      }
    });
  } catch (e) {
    if (isNetworkError(e)) {
      console.warn('[getKnowledgeBases] Supabase unavailable — returning empty:', (e as Error).message || e);
      return [];
    }
    throw e;
  }
};

export const getMeetings = async (): Promise<PortfolioMeeting[]> => {
  if (!hasSupabaseConfig() || !supabase) {
    return [];
  }

  try {
    return await getCachedOrFetch('meetings', async () => {
      try {
        const { data, error } = await supabase!
          .from('meetings')
          .select('*')
          .order('created_at', { ascending: false });

        if (error || !data) {
          return [];
        }

        return data as PortfolioMeeting[];
      } catch (e) {
        if (isNetworkError(e)) throw e;
        console.warn('[getMeetings] query failed', (e as Error).message || e);
        return [];
      }
    });
  } catch (e) {
    if (isNetworkError(e)) {
      console.warn('[getMeetings] Supabase unavailable — returning empty:', (e as Error).message || e);
      return [];
    }
    throw e;
  }
};

export const getPortfolioProjects = async (): Promise<PortfolioProject[]> => {
  if (!hasSupabaseConfig() || !supabase) {
    return [];
  }

  try {
    return await getCachedOrFetch('projects', async () => {
      try {
        const { data, error } = await supabase!
          .from('projects')
          .select('*')
          .eq('is_visible', true)
          .order('featured', { ascending: false })
          .order('sort_order', { ascending: true })
          .order('id', { ascending: true });

        if (error || !data) {
          return [];
        }

        return data as PortfolioProject[];
      } catch (e) {
        if (isNetworkError(e)) throw e;
        console.warn('[getPortfolioProjects] query failed', (e as Error).message || e);
        return [];
      }
    });
  } catch (e) {
    if (isNetworkError(e)) {
      console.warn('[getPortfolioProjects] Supabase unavailable — returning empty:', (e as Error).message || e);
      return [];
    }
    throw e;
  }
};

export const getFeaturedPortfolioProjects = async (): Promise<
  PortfolioProject[]
> => {
  if (!hasSupabaseConfig() || !supabase) {
    return [];
  }

  try {
    return await getCachedOrFetch('projects:featured', async () => {
      try {
        const { data, error } = await supabase!
          .from('projects')
          .select('*')
          .eq('is_visible', true)
          .eq('featured', true)
          .order('featured_order', { ascending: true })
          .order('sort_order', { ascending: true })
          .order('id', { ascending: true });

        if (error || !data) {
          return [];
        }

        return data as PortfolioProject[];
      } catch (e) {
        if (isNetworkError(e)) throw e;
        console.warn('[getFeaturedPortfolioProjects] query failed', (e as Error).message || e);
        return [];
      }
    });
  } catch (e) {
    if (isNetworkError(e)) {
      console.warn('[getFeaturedPortfolioProjects] Supabase unavailable — returning empty:', (e as Error).message || e);
      return [];
    }
    throw e;
  }
};

export const getProjectMedia = async (
  projectIds: number[],
): Promise<PortfolioProjectMedia[]> => {
  if (!hasSupabaseConfig() || !supabase || !projectIds.length) {
    return [];
  }

  const key = `project_media:${[...projectIds]
    .sort((a, b) => a - b)
    .join(',')}`;

  try {
    return await getCachedOrFetch(key, async () => {
      try {
        const { data, error } = await supabase!
          .from('project_media')
          .select('*')
          .in('project_id', projectIds)
          .eq('is_visible', true)
          .order('media_order', { ascending: true })
          .order('id', { ascending: true });

        if (error || !data) {
          return [];
        }

        return data as PortfolioProjectMedia[];
      } catch (e) {
        if (isNetworkError(e)) throw e;
        console.warn('[getProjectMedia] query failed', (e as Error).message || e);
        return [];
      }
    });
  } catch (e) {
    if (isNetworkError(e)) {
      console.warn('[getProjectMedia] Supabase unavailable — returning empty:', (e as Error).message || e);
      return [];
    }
    throw e;
  }
};

export const getPortfolioProfile =
  async (): Promise<PortfolioProfile | null> => {
    if (!hasSupabaseConfig() || !supabase) {
      return null;
    }

    try {
      return await getCachedOrFetch('profile:active', async () => {
        try {
          const { data, error } = await supabase!
            .from('profiles')
            .select('*')
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();

          if (error || !data) {
            return null;
          }

          return data as PortfolioProfile;
        } catch (e) {
          if (isNetworkError(e)) throw e;
          console.warn('[getPortfolioProfile] query failed', (e as Error).message || e);
          return null;
        }
      });
    } catch (e) {
      if (isNetworkError(e)) {
        console.warn('[getPortfolioProfile] Supabase unavailable — returning empty:', (e as Error).message || e);
        return null;
      }
      throw e;
    }
  };

export const getSiteTexts = async (): Promise<Record<string, string>> => {
  if (!hasSupabaseConfig() || !supabase) {
    return {};
  }

  try {
    return await getCachedOrFetch('site_texts', async () => {
      try {
        const { data, error } = await supabase!
          .from('site_texts')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (error || !data) {
          return {};
        }

        const texts = data as SiteText[];
        const result: Record<string, string> = {};
        texts.forEach((t) => {
          result[t.key] = t.value;
        });
        return result;
      } catch (e) {
        if (isNetworkError(e)) throw e;
        console.warn('[getSiteTexts] query failed', (e as Error).message || e);
        return {};
      }
    });
  } catch (e) {
    if (isNetworkError(e)) {
      console.warn('[getSiteTexts] Supabase unavailable — returning empty:', (e as Error).message || e);
      return {};
    }
    throw e;
  }
};

export const getSiteTextByKey = async (key: string): Promise<string | null> => {
  if (!hasSupabaseConfig() || !supabase) {
    return null;
  }

  try {
    return await getCachedOrFetch(`site_texts:${key}`, async () => {
      try {
        const { data, error } = await supabase!
          .from('site_texts')
          .select('value')
          .eq('key', key)
          .eq('is_active', true)
          .maybeSingle();

        if (error || !data) {
          return null;
        }

        return (data as { value: string }).value;
      } catch (e) {
        if (isNetworkError(e)) throw e;
        console.warn('[getSiteTextByKey] query failed', (e as Error).message || e);
        return null;
      }
    });
  } catch (e) {
    if (isNetworkError(e)) {
      console.warn('[getSiteTextByKey] Supabase unavailable — returning empty:', (e as Error).message || e);
      return null;
    }
    throw e;
  }
};

export const upsertPortfolioProfile = async (
  payload: Partial<PortfolioProfile>,
): Promise<boolean> => {
  if (!hasSupabaseConfig()) {
    return false;
  }

  const ok = await adminContentAction(
    'upsertProfile',
    payload as unknown as Record<string, unknown>,
  );

  if (ok) {
    clearPortfolioCache();
  }

  return ok;
};

export const createSkill = async (
  payload: Partial<PortfolioSkill>,
): Promise<boolean> => {
  if (!hasSupabaseConfig()) {
    return false;
  }

  const ok = await adminContentAction(
    'createSkill',
    payload as unknown as Record<string, unknown>,
  );

  if (ok) {
    clearPortfolioCache();
  }

  return ok;
};

export const updateSkill = async (
  id: number,
  payload: Partial<PortfolioSkill>,
): Promise<boolean> => {
  if (!hasSupabaseConfig()) {
    return false;
  }

  const ok = await adminContentAction(
    'updateSkill',
    payload as unknown as Record<string, unknown>,
    id,
  );

  if (ok) {
    clearPortfolioCache();
  }

  return ok;
};

export const deleteSkill = async (id: number): Promise<boolean> => {
  if (!hasSupabaseConfig()) {
    return false;
  }

  const ok = await adminContentAction('deleteSkill', undefined, id);
  if (ok) {
    clearPortfolioCache();
  }

  return ok;
};

export const createProject = async (
  payload: Partial<PortfolioProject>,
): Promise<boolean> => {
  if (!hasSupabaseConfig()) {
    return false;
  }

  const ok = await adminContentAction(
    'createProject',
    payload as unknown as Record<string, unknown>,
  );

  if (ok) {
    clearPortfolioCache();
  }

  return ok;
};

export const updateProject = async (
  id: number,
  payload: Partial<PortfolioProject>,
): Promise<boolean> => {
  if (!hasSupabaseConfig()) {
    return false;
  }

  const ok = await adminContentAction(
    'updateProject',
    payload as unknown as Record<string, unknown>,
    id,
  );

  if (ok) {
    clearPortfolioCache();
  }

  return ok;
};

export const deleteProject = async (id: number): Promise<boolean> => {
  if (!hasSupabaseConfig()) {
    return false;
  }

  const ok = await adminContentAction('deleteProject', undefined, id);
  if (ok) {
    clearPortfolioCache();
  }

  return ok;
};

export const addProjectMedia = async (
  payload: Partial<PortfolioProjectMedia>,
): Promise<boolean> => {
  if (!hasSupabaseConfig()) {
    return false;
  }

  const ok = await adminContentAction(
    'addProjectMedia',
    payload as unknown as Record<string, unknown>,
  );

  if (ok) {
    clearPortfolioCache();
  }

  return ok;
};

export const deleteProjectMedia = async (id: number): Promise<boolean> => {
  if (!hasSupabaseConfig()) {
    return false;
  }

  const ok = await adminContentAction('deleteProjectMedia', undefined, id);
  if (ok) {
    clearPortfolioCache();
  }

  return ok;
};

export const createKnowledgeBase = async (
  payload: Partial<PortfolioKnowledgeBase>,
): Promise<boolean> => {
  if (!hasSupabaseConfig()) {
    return false;
  }
  const ok = await adminContentAction(
    'createKnowledgeBase',
    payload as unknown as Record<string, unknown>,
  );
  if (ok) clearPortfolioCache();
  return ok;
};

export const updateKnowledgeBase = async (
  id: number,
  payload: Partial<PortfolioKnowledgeBase>,
): Promise<boolean> => {
  if (!hasSupabaseConfig()) {
    return false;
  }
  const ok = await adminContentAction(
    'updateKnowledgeBase',
    payload as unknown as Record<string, unknown>,
    id,
  );
  if (ok) clearPortfolioCache();
  return ok;
};

export const deleteKnowledgeBase = async (id: number): Promise<boolean> => {
  if (!hasSupabaseConfig()) {
    return false;
  }
  const ok = await adminContentAction('deleteKnowledgeBase', undefined, id);
  if (ok) clearPortfolioCache();
  return ok;
};

export const createMeeting = async (
  payload: Partial<PortfolioMeeting>,
): Promise<boolean> => {
  // We can let the user book a meeting without being admin, so this shouldn't use adminContentAction if booked from frontend.
  // Actually, we'll implement a separate API endpoint for creating meetings from chat/frontend, 
  // but for admin manual creation/updates we use these.
  if (!hasSupabaseConfig()) return false;
  const ok = await adminContentAction(
    'createMeeting',
    payload as unknown as Record<string, unknown>,
  );
  if (ok) clearPortfolioCache();
  return ok;
};

export const updateMeeting = async (
  id: number,
  payload: Partial<PortfolioMeeting>,
): Promise<boolean> => {
  if (!hasSupabaseConfig()) return false;
  const ok = await adminContentAction(
    'updateMeeting',
    payload as unknown as Record<string, unknown>,
    id,
  );
  if (ok) clearPortfolioCache();
  return ok;
};

export const deleteMeeting = async (id: number): Promise<boolean> => {
  if (!hasSupabaseConfig()) return false;
  const ok = await adminContentAction('deleteMeeting', undefined, id);
  if (ok) clearPortfolioCache();
  return ok;
};

export const uploadProjectAsset = async (
  file: File,
  bucket = 'portfolio-media',
): Promise<string | null> => {
  if (!hasSupabaseConfig() || !supabase) {
    return null;
  }

  const filePath = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
  const { error } = await supabase!.storage.from(bucket).upload(filePath, file, {
    upsert: false,
  });

  if (error) {
    return null;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl || null;
};

// ─── Experiences ───────────────────────────────────────

export const getPortfolioExperiences = async (): Promise<PortfolioExperience[]> => {
  if (!hasSupabaseConfig() || !supabase) return [];
  try {
    return await getCachedOrFetch('experiences', async () => {
      try {
        const { data, error } = await supabase!
          .from('experiences')
          .select('*')
          .eq('is_visible', true)
          .order('sort_order', { ascending: true });
        if (error || !data) return [];
        return data as PortfolioExperience[];
      } catch (e) {
        if (isNetworkError(e)) throw e;
        console.warn('[getPortfolioExperiences] query failed', (e as Error).message || e);
        return [];
      }
    });
  } catch (e) {
    if (isNetworkError(e)) {
      console.warn('[getPortfolioExperiences] Supabase unavailable — returning empty:', (e as Error).message || e);
      return [];
    }
    throw e;
  }
};

export const getAllExperiences = async (): Promise<PortfolioExperience[]> => {
  if (!hasSupabaseConfig() || !supabase) return [];
  const { data, error } = await supabase!
    .from('experiences')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error || !data) return [];
  return data as PortfolioExperience[];
};

export const getExperienceProjects = async (experienceId: number): Promise<PortfolioProject[]> => {
  if (!hasSupabaseConfig() || !supabase) return [];
  const { data: links, error: linkError } = await supabase!
    .from('experience_projects')
    .select('project_id')
    .eq('experience_id', experienceId);
  if (linkError || !links?.length) return [];
  const projectIds = links.map((l) => l.project_id);
  const { data: projects, error: projError } = await supabase!
    .from('projects')
    .select('*')
    .in('id', projectIds);
  if (projError) return [];
  return (projects || []) as PortfolioProject[];
};

export const createExperience = async (
  experience: Partial<PortfolioExperience>,
  projectIds: number[] = [],
): Promise<boolean> => {
  if (!hasSupabaseConfig() || !supabase) return false;
  const { data, error } = await supabase!
    .from('experiences')
    .insert({
      title: experience.title,
      company_name: experience.company_name,
      company_logo: experience.company_logo || null,
      location: experience.location || null,
      from_date: experience.from_date,
      to_date: experience.is_current ? null : experience.to_date,
      is_current: experience.is_current || false,
      description: experience.description || null,
      sort_order: experience.sort_order || 0,
      is_visible: experience.is_visible ?? true,
    })
    .select('id')
    .single();
  if (error || !data) return false;
  if (projectIds.length > 0) {
    const links = projectIds.map((pid) => ({ experience_id: data.id, project_id: pid }));
    await supabase!.from('experience_projects').insert(links);
  }
  clearPortfolioCache();
  return true;
};

export const updateExperience = async (
  id: number,
  experience: Partial<PortfolioExperience>,
  projectIds?: number[],
): Promise<boolean> => {
  if (!hasSupabaseConfig() || !supabase) return false;
  const { error } = await supabase!
    .from('experiences')
    .update({
      title: experience.title,
      company_name: experience.company_name,
      company_logo: experience.company_logo || null,
      location: experience.location || null,
      from_date: experience.from_date,
      to_date: experience.is_current ? null : experience.to_date,
      is_current: experience.is_current || false,
      description: experience.description || null,
      sort_order: experience.sort_order || 0,
      is_visible: experience.is_visible ?? true,
    })
    .eq('id', id);
  if (error) return false;
  if (projectIds !== undefined) {
    await supabase!.from('experience_projects').delete().eq('experience_id', id);
    if (projectIds.length > 0) {
      const links = projectIds.map((pid) => ({ experience_id: id, project_id: pid }));
      await supabase!.from('experience_projects').insert(links);
    }
  }
  clearPortfolioCache();
  return true;
};

export const deleteExperience = async (id: number): Promise<boolean> => {
  if (!hasSupabaseConfig() || !supabase) return false;
  const { error } = await supabase!.from('experiences').delete().eq('id', id);
  if (error) return false;
  clearPortfolioCache();
  return true;
};

export const getProjects = async () => {
  // const { data } = await axios.get(
  //   `https://raw.githubusercontent.com/fahimaloy/fahimaloy/main/Projects.md`,
  // );
  return getCachedOrFetch('legacy:projects', async () => {
    const { data } = await axios.get(
      `${process.env.NEXT_PUBLIC_API}/api/allprojects`,
    );
    return data;
  });
};
export const getSkills = async () => {
  return getCachedOrFetch('legacy:skills', async () => {
    const { data } = await axios.get(
      `https://raw.githubusercontent.com/fahimaloy/fahimaloy/main/Skills.md`,
    );

    return data;
  });
};

export const getReadme = async () => {
  return getCachedOrFetch('legacy:readme', async () => {
    const { data } = await axios.get(config.readmeUrl);
    return data;
  });
};

export const getWeather = async (city: string) => {
  try {
    const { data } = await axios.get(`https://wttr.in/${city}?ATm`);
    return data;
  } catch (error) {
    return error;
  }
};

export const getQuote = async () => {
  const { data } = await axios.get('https://api.quotable.io/random');
  return {
    quote: `“${data.content}” — ${data.author}`,
  };
};
