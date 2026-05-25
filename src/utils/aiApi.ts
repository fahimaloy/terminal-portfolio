/**
 * Client-side API helpers for AI Providers and Models management.
 */

import axios from 'axios';

// ─── Types ────────────────────────────────────────────────────

export interface AiProvider {
  id: number;
  name: string;
  provider_type: 'gemini' | 'openai_compatible';
  identifier_slug: string;
  api_key: string;
  base_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiModel {
  id: number;
  provider_id: number;
  model_name: string;
  display_name: string | null;
  identifier: string;
  sort_order: number;
  is_active: boolean;
  rpm_limit: number | null;
  rpd_limit: number | null;
  cooldown_until: string | null;
  created_at: string;
  updated_at: string;
  provider?: { id: number; name: string; provider_type: string; identifier_slug: string } | null;
}

// ─── Providers ────────────────────────────────────────────────

export async function fetchProviders(): Promise<AiProvider[]> {
  try {
    const { data } = await axios.get('/api/admin/ai/providers');
    if (data.ok) return data.providers;
    return [];
  } catch {
    return [];
  }
}

export async function createProvider(payload: {
  name: string;
  provider_type: 'gemini' | 'openai_compatible';
  identifier_slug: string;
  api_key: string;
  base_url?: string;
}): Promise<AiProvider | null> {
  try {
    const { data } = await axios.post('/api/admin/ai/providers', payload);
    if (data.ok) return data.provider;
    throw new Error(data.message || 'Failed to create provider');
  } catch (err: any) {
    throw new Error(err.response?.data?.message || err.message || 'Failed to create provider');
  }
}

export async function updateProvider(
  id: number,
  payload: Partial<AiProvider>,
): Promise<AiProvider | null> {
  try {
    const { data } = await axios.patch('/api/admin/ai/providers', { id, ...payload });
    if (data.ok) return data.provider;
    return null;
  } catch {
    return null;
  }
}

export async function deleteProvider(id: number): Promise<boolean> {
  try {
    const { data } = await axios.delete('/api/admin/ai/providers', { data: { id } });
    return data.ok;
  } catch {
    return false;
  }
}

// ─── Models ───────────────────────────────────────────────────

export async function fetchModels(): Promise<AiModel[]> {
  try {
    const { data } = await axios.get('/api/admin/ai/models');
    if (data.ok) return data.models;
    return [];
  } catch {
    return [];
  }
}

export async function createModels(payload: {
  provider_id: number;
  model_names: string[];
  display_name?: string;
  identifier_slug: string;
  rpm_limit?: number | null;
  rpd_limit?: number | null;
}): Promise<AiModel[] | null> {
  try {
    const { data } = await axios.post('/api/admin/ai/models', payload);
    if (data.ok) return data.models;
    throw new Error(data.message || 'Failed to create models');
  } catch (err: any) {
    throw new Error(err.response?.data?.message || err.message || 'Failed to create models');
  }
}

export async function updateModel(
  id: number,
  payload: Partial<AiModel>,
): Promise<AiModel | null> {
  try {
    const { data } = await axios.patch('/api/admin/ai/models', { id, ...payload });
    if (data.ok) return data.model;
    return null;
  } catch {
    return null;
  }
}

export async function deleteModel(id: number): Promise<boolean> {
  try {
    const { data } = await axios.delete('/api/admin/ai/models', { data: { id } });
    return data.ok;
  } catch {
    return false;
  }
}

// ─── Actions ──────────────────────────────────────────────────

export async function testConnection(payload: {
  provider_type: 'gemini' | 'openai_compatible';
  api_key: string;
  base_url?: string;
}): Promise<{ models: string[]; count: number }> {
  try {
    const { data } = await axios.post('/api/admin/ai/test-connection', payload);
    if (data.ok) return { models: data.models, count: data.count };
    throw new Error(data.message || 'Connection failed');
  } catch (err: any) {
    throw new Error(err.response?.data?.message || err.message || 'Connection test failed');
  }
}

export async function reorderModels(modelIds: number[]): Promise<boolean> {
  try {
    const { data } = await axios.post('/api/admin/ai/reorder', { modelIds });
    return data.ok;
  } catch {
    return false;
  }
}

// ─── Usage ────────────────────────────────────────────────────

export interface UsageOverview {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: number;
  avgLatencyMs: number;
  successRate: number;
}

export interface ModelUsageStat {
  modelId: number | null;
  modelIdentifier: string;
  providerName: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: number;
  avgLatencyMs: number;
  requestsByDate: Record<string, number>;
}

export interface DailyUsageStat {
  date: string;
  totalRequests: number;
  successfulRequests: number;
  totalTokens: number;
}

export interface RecentError {
  id: number;
  modelIdentifier: string;
  providerName: string;
  requestType: string;
  errorMessage: string;
  createdAt: string;
}

export interface UsageData {
  overview: UsageOverview;
  modelStats: ModelUsageStat[];
  dailyStats: DailyUsageStat[];
  recentErrors: RecentError[];
  totalLogs: number;
  daysQueried: number;
}

export async function fetchUsage(days: number = 30): Promise<UsageData | null> {
  try {
    const { data } = await axios.get(`/api/admin/ai/usage?days=${days}`);
    if (data.ok) return data;
    return null;
  } catch {
    return null;
  }
}

// ─── Fetch All (combined) ─────────────────────────────────────

export async function fetchAllAiData(): Promise<{
  providers: AiProvider[];
  models: AiModel[];
}> {
  try {
    const { data } = await axios.get('/api/admin/ai');
    if (data.ok) return { providers: data.providers || [], models: data.models || [] };
    return { providers: [], models: [] };
  } catch {
    return { providers: [], models: [] };
  }
}
