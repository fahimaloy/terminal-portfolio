import axios from 'axios';
import config from '../../config.json';
import { supabase } from './supabase';

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
    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    // Ignore storage availability errors.
  }
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
  sort_order: number;
  is_visible: boolean;
}

export interface PortfolioProject {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  short_title: string | null;
  icon_key: string | null;
  project_url: string | null;
  repo_url: string | null;
  languages: string[] | null;
  tags: string[] | null;
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

export interface PortfolioProfile {
  id: string;
  full_name: string;
  title: string | null;
  bio: string | null;
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

const hasSupabaseConfig = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

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
    return Boolean(data?.ok);
  } catch (error) {
    return false;
  }
};

export const getPortfolioSkills = async (): Promise<PortfolioSkill[]> => {
  if (!hasSupabaseConfig() || !supabase) {
    return [];
  }

  return getCachedOrFetch('skills', async () => {
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .eq('is_visible', true)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });

    if (error || !data) {
      return [];
    }

    return data as PortfolioSkill[];
  });
};

export const getPortfolioProjects = async (): Promise<PortfolioProject[]> => {
  if (!hasSupabaseConfig() || !supabase) {
    return [];
  }

  return getCachedOrFetch('projects', async () => {
    const { data, error } = await supabase
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
  });
};

export const getFeaturedPortfolioProjects = async (): Promise<
  PortfolioProject[]
> => {
  if (!hasSupabaseConfig() || !supabase) {
    return [];
  }

  return getCachedOrFetch('projects:featured', async () => {
    const { data, error } = await supabase
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
  });
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

  return getCachedOrFetch(key, async () => {
    const { data, error } = await supabase
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
  });
};

export const getPortfolioProfile =
  async (): Promise<PortfolioProfile | null> => {
    if (!hasSupabaseConfig() || !supabase) {
      return null;
    }

    return getCachedOrFetch('profile:active', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      return data as PortfolioProfile;
    });
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

export const uploadProjectAsset = async (
  file: File,
  bucket = 'portfolio-media',
): Promise<string | null> => {
  if (!hasSupabaseConfig() || !supabase) {
    return null;
  }

  const filePath = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
  const { error } = await supabase.storage.from(bucket).upload(filePath, file, {
    upsert: false,
  });

  if (error) {
    return null;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl || null;
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
