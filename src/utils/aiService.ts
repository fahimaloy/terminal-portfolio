/**
 * AI Service Layer
 *
 * Handles load balancing across AI models with RPM/RPD limits,
 * fallback logic, and usage tracking.
 */

import { supabaseAdmin } from './supabaseAdmin';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
}

export interface AiModelWithProvider extends AiModel {
  provider?: AiProvider;
}

export interface AiRequestLog {
  id: number;
  model_id: number | null;
  provider_id: number | null;
  model_identifier: string | null;
  provider_name: string | null;
  request_type: 'chat' | 'project-match';
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  latency_ms: number;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

// ─── In-memory RPM Tracking ──────────────────────────────────

interface RpmEntry {
  count: number;
  windowStart: number;
}

const rpmStore = new Map<number, RpmEntry>();

function checkRpmLimit(modelId: number, rpmLimit: number): boolean {
  const now = Date.now();
  const entry = rpmStore.get(modelId);

  if (!entry || now - entry.windowStart > 60000) {
    // New window
    rpmStore.set(modelId, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= rpmLimit) {
    return false;
  }

  entry.count += 1;
  return true;
}

function resetRpmForModel(modelId: number): void {
  rpmStore.delete(modelId);
}

// ─── RPD Tracking ─────────────────────────────────────────────

async function checkRpdLimit(modelId: number, rpdLimit: number): Promise<boolean> {
  if (!supabaseAdmin) return true;

  const today = new Date().toISOString().split('T')[0];

  const { count } = await supabaseAdmin
    .from('ai_request_logs')
    .select('*', { count: 'exact', head: true })
    .eq('model_id', modelId)
    .eq('success', true)
    .gte('created_at', today);

  return (count || 0) < rpdLimit;
}

// ─── Model Loading ────────────────────────────────────────────

/**
 * Fetch all active, non-cooldown models ordered by sort_order.
 * Includes provider info.
 */
export async function getActiveModels(): Promise<AiModelWithProvider[]> {
  if (!supabaseAdmin) return [];

  const now = new Date().toISOString();

  // Fetch providers first, then models
  const [{ data: providers }, { data: models }] = await Promise.all([
    supabaseAdmin
      .from('ai_providers')
      .select('*')
      .eq('is_active', true),
    supabaseAdmin
      .from('ai_models')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ]);

  if (!providers || !models) return [];

  const providerMap = new Map<number, AiProvider>();
  for (const p of providers) {
    providerMap.set(p.id, p as AiProvider);
  }

  return (models as AiModel[])
    .filter((m) => {
      // Filter out models on cooldown
      if (m.cooldown_until && new Date(m.cooldown_until) > new Date(now)) {
        return false;
      }
      // Filter out models whose provider is inactive
      const provider = providerMap.get(m.provider_id);
      return provider && provider.is_active;
    })
    .map((m) => ({
      ...m,
      provider: providerMap.get(m.provider_id),
    }));
}

/**
 * Set a model on cooldown (e.g., when RPD limit reached).
 */
export async function setModelCooldown(
  modelId: number,
  cooldownUntil: string,
): Promise<void> {
  if (!supabaseAdmin) return;

  await supabaseAdmin
    .from('ai_models')
    .update({ cooldown_until: cooldownUntil })
    .eq('id', modelId);
}

/**
 * Clear a model's cooldown.
 */
export async function clearModelCooldown(modelId: number): Promise<void> {
  if (!supabaseAdmin) return;

  await supabaseAdmin
    .from('ai_models')
    .update({ cooldown_until: null })
    .eq('id', modelId);

  resetRpmForModel(modelId);
}

// ─── Load Balancing ───────────────────────────────────────────

let currentModelIndex = 0;

/**
 * Get the next available model for a request type using round-robin + fallback.
 * Returns null if no model is available.
 */
export async function getNextAvailableModel(
  requestType: 'chat' | 'project-match',
): Promise<AiModelWithProvider | null> {
  const models = await getActiveModels();
  if (models.length === 0) return null;

  // Try starting from the current index, wrapping around
  const startIndex = currentModelIndex % models.length;
  const tried = new Set<number>();

  for (let i = 0; i < models.length; i++) {
    const idx = (startIndex + i) % models.length;
    if (tried.has(idx)) break;
    tried.add(idx);

    const model = models[idx];
    if (!model.provider) continue;

    // Check RPM limit
    if (model.rpm_limit && model.rpm_limit > 0) {
      if (!checkRpmLimit(model.id, model.rpm_limit)) {
        continue;
      }
    }

    // Check RPD limit
    if (model.rpd_limit && model.rpd_limit > 0) {
      const rpdOk = await checkRpdLimit(model.id, model.rpd_limit);
      if (!rpdOk) {
        // Set cooldown until end of today
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        void setModelCooldown(model.id, endOfDay.toISOString());
        continue;
      }
    }

    // Update index for next call
    currentModelIndex = (idx + 1) % models.length;
    return model;
  }

  return null;
}

// ─── API Calls ────────────────────────────────────────────────

/**
 * Send a message to Gemini using the specified model.
 */
async function callGemini(
  provider: AiProvider,
  model: AiModel,
  systemInstruction: string,
  messages: { role: string; text: string }[],
): Promise<{ text: string; tokens: { prompt: number; completion: number; total: number } }> {
  const genAI = new GoogleGenerativeAI(provider.api_key);

  const genAiModel = genAI.getGenerativeModel({
    model: model.model_name,
    systemInstruction: { role: 'user', parts: [{ text: systemInstruction }] },
  });

  const formattedMessages = messages.map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.text }],
  }));

  const history = formattedMessages.slice(0, -1);
  const currentMsg = formattedMessages[formattedMessages.length - 1]?.parts[0]?.text || '';

  const chat = genAiModel.startChat({ history });
  const result = await chat.sendMessage(currentMsg);
  const responseText = result.response.text();

  // Try to extract token usage
  const usage = result.response.usageMetadata;
  const tokens = {
    prompt: usage?.promptTokenCount || 0,
    completion: usage?.candidatesTokenCount || 0,
    total: usage?.totalTokenCount || 0,
  };

  return { text: responseText, tokens };
}

/**
 * Send a message to an OpenAI-compatible API.
 */
async function callOpenAICompatible(
  provider: AiProvider,
  model: AiModel,
  systemInstruction: string,
  messages: { role: string; text: string }[],
): Promise<{ text: string; tokens: { prompt: number; completion: number; total: number } }> {
  const baseUrl = provider.base_url || 'https://api.openai.com/v1';

  const formattedMessages = [
    { role: 'system', content: systemInstruction },
    ...messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text,
    })),
  ];

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.api_key}`,
    },
    body: JSON.stringify({
      model: model.model_name,
      messages: formattedMessages,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';

  const tokens = {
    prompt: data.usage?.prompt_tokens || 0,
    completion: data.usage?.completion_tokens || 0,
    total: data.usage?.total_tokens || 0,
  };

  return { text, tokens };
}

/**
 * Send a message using a specific model.
 */
async function sendWithModel(
  model: AiModelWithProvider,
  systemInstruction: string,
  messages: { role: string; text: string }[],
): Promise<{ text: string; tokens: { prompt: number; completion: number; total: number } }> {
  if (!model.provider) {
    throw new Error('Model has no associated provider');
  }

  const startTime = Date.now();

  if (model.provider.provider_type === 'gemini') {
    return await callGemini(model.provider, model, systemInstruction, messages);
  } else if (model.provider.provider_type === 'openai_compatible') {
    return await callOpenAICompatible(model.provider, model, systemInstruction, messages);
  } else {
    throw new Error(`Unknown provider type: ${model.provider.provider_type}`);
  }
}

// ─── Public API ───────────────────────────────────────────────

export interface AiResponse {
  text: string;
  modelIdentifier: string;
  modelId: number;
  providerId: number;
}

/**
 * Send a message through the AI system with automatic load balancing and fallback.
 * Tries each available model in order until one succeeds or all fail.
 */
export async function sendMessageWithFallback(
  requestType: 'chat' | 'project-match',
  systemInstruction: string,
  messages: { role: string; text: string }[],
): Promise<AiResponse> {
  const startTime = Date.now();
  let lastError: Error | null = null;
  let triedModels: AiModelWithProvider[] = [];

  // Try up to all models
  for (let attempt = 0; attempt < 5; attempt++) {
    const model = await getNextAvailableModel(requestType);
    if (!model) {
      // No models available at all
      throw new Error(
        triedModels.length > 0
          ? 'All AI models are currently rate-limited or unavailable. Please try again later.'
          : 'No AI models configured. Please add models in the admin panel.',
      );
    }

    // Avoid trying the same model twice in one request
    if (triedModels.some((m) => m.id === model.id)) {
      continue;
    }
    triedModels.push(model);

    try {
      const result = await sendWithModel(model, systemInstruction, messages);
      const latency = Date.now() - startTime;

      // Log success
      void recordRequest({
        modelId: model.id,
        providerId: model.provider!.id,
        modelIdentifier: model.identifier,
        providerName: model.provider!.name,
        requestType,
        promptTokens: result.tokens.prompt,
        completionTokens: result.tokens.completion,
        totalTokens: result.tokens.total,
        latencyMs: latency,
        success: true,
      });

      return {
        text: result.text,
        modelIdentifier: model.identifier,
        modelId: model.id,
        providerId: model.provider!.id,
      };
    } catch (error: any) {
      lastError = error;
      const latency = Date.now() - startTime;

      // Log failure
      void recordRequest({
        modelId: model.id,
        providerId: model.provider!.id,
        modelIdentifier: model.identifier,
        providerName: model.provider!.name,
        requestType,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        latencyMs: latency,
        success: false,
        errorMessage: error.message,
      });

      // Put model on temporary cooldown (30 seconds for transient errors)
      const cooldownUntil = new Date(Date.now() + 30000).toISOString();
      void setModelCooldown(model.id, cooldownUntil);

      // Continue to next model
    }
  }

  throw new Error(
    lastError
      ? `All AI models failed. Last error: ${lastError.message}`
      : 'No AI models available',
  );
}

/**
 * Generate content (non-streaming, single turn) with load balancing.
 * Used by project-match API.
 */
export async function generateWithFallback(
  requestType: 'chat' | 'project-match',
  systemInstruction: string,
  prompt: string,
): Promise<AiResponse> {
  const messages = [{ role: 'user' as const, text: prompt }];
  return sendMessageWithFallback(requestType, systemInstruction, messages);
}

// ─── Request Logging ──────────────────────────────────────────

export interface RecordRequestParams {
  modelId: number;
  providerId: number;
  modelIdentifier: string;
  providerName: string;
  requestType: 'chat' | 'project-match';
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
}

async function recordRequest(params: RecordRequestParams): Promise<void> {
  if (!supabaseAdmin) return;

  try {
    await supabaseAdmin.from('ai_request_logs').insert({
      model_id: params.modelId,
      provider_id: params.providerId,
      model_identifier: params.modelIdentifier,
      provider_name: params.providerName,
      request_type: params.requestType,
      prompt_tokens: params.promptTokens,
      completion_tokens: params.completionTokens,
      total_tokens: params.totalTokens,
      latency_ms: params.latencyMs,
      success: params.success,
      error_message: params.errorMessage || null,
    });
  } catch (err) {
    // Silently fail logging - don't crash the request
    console.error('Failed to log AI request:', err);
  }
}

// ─── Analytics Queries ────────────────────────────────────────

export interface ModelUsageSummary {
  modelId: number;
  modelIdentifier: string;
  providerName: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: number;
  avgLatencyMs: number;
  lastUsed: string | null;
}

export interface DailyUsage {
  date: string;
  totalRequests: number;
  successfulRequests: number;
  totalTokens: number;
}

export async function getUsageOverview(): Promise<{
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: number;
  avgLatencyMs: number;
}> {
  if (!supabaseAdmin) {
    return { totalRequests: 0, successfulRequests: 0, failedRequests: 0, totalTokens: 0, avgLatencyMs: 0 };
  }

  const { data } = await supabaseAdmin
    .from('ai_request_logs')
    .select('success, total_tokens, latency_ms');

  if (!data) {
    return { totalRequests: 0, successfulRequests: 0, failedRequests: 0, totalTokens: 0, avgLatencyMs: 0 };
  }

  const total = data.length;
  const successful = data.filter((r) => r.success).length;
  const failed = total - successful;
  const totalTokens = data.reduce((sum, r) => sum + (r.total_tokens || 0), 0);
  const avgLatencyMs = total > 0
    ? Math.round(data.reduce((sum, r) => sum + (r.latency_ms || 0), 0) / total)
    : 0;

  return { totalRequests: total, successfulRequests: successful, failedRequests: failed, totalTokens, avgLatencyMs };
}

export async function getModelUsageSummaries(): Promise<ModelUsageSummary[]> {
  if (!supabaseAdmin) return [];

  const { data: models } = await supabaseAdmin
    .from('ai_models')
    .select('id, identifier, provider_id');

  const { data: providers } = await supabaseAdmin
    .from('ai_providers')
    .select('id, name');

  if (!models || !providers) return [];

  const providerMap = new Map(providers.map((p) => [p.id, p.name]));

  const summaries: ModelUsageSummary[] = [];

  for (const model of models) {
    const { data: logs } = await supabaseAdmin
      .from('ai_request_logs')
      .select('success, total_tokens, latency_ms, created_at')
      .eq('model_id', model.id);

    if (!logs || logs.length === 0) {
      summaries.push({
        modelId: model.id,
        modelIdentifier: model.identifier,
        providerName: providerMap.get(model.provider_id) || 'Unknown',
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalTokens: 0,
        avgLatencyMs: 0,
        lastUsed: null,
      });
      continue;
    }

    const total = logs.length;
    const successful = logs.filter((r) => r.success).length;
    const failed = total - successful;
    const totalTokens = logs.reduce((sum, r) => sum + (r.total_tokens || 0), 0);
    const avgLatencyMs = Math.round(logs.reduce((sum, r) => sum + (r.latency_ms || 0), 0) / total);
    const lastUsed = logs.reduce((latest, r) => {
      return r.created_at > latest ? r.created_at : latest;
    }, logs[0].created_at);

    summaries.push({
      modelId: model.id,
      modelIdentifier: model.identifier,
      providerName: providerMap.get(model.provider_id) || 'Unknown',
      totalRequests: total,
      successfulRequests: successful,
      failedRequests: failed,
      totalTokens,
      avgLatencyMs,
      lastUsed,
    });
  }

  return summaries.sort((a, b) => b.totalRequests - a.totalRequests);
}

export async function getDailyUsage(days: number = 30): Promise<DailyUsage[]> {
  if (!supabaseAdmin) return [];

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await supabaseAdmin
    .from('ai_request_logs')
    .select('created_at, success, total_tokens')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true });

  if (!data) return [];

  // Group by date
  const dailyMap = new Map<string, { total: number; success: number; tokens: number }>();

  for (const row of data) {
    const date = row.created_at.split('T')[0];
    const existing = dailyMap.get(date) || { total: 0, success: 0, tokens: 0 };
    existing.total += 1;
    if (row.success) existing.success += 1;
    existing.tokens += row.total_tokens || 0;
    dailyMap.set(date, existing);
  }

  return Array.from(dailyMap.entries())
    .map(([date, stats]) => ({
      date,
      totalRequests: stats.total,
      successfulRequests: stats.success,
      totalTokens: stats.tokens,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getRecentLogs(limit: number = 100): Promise<AiRequestLog[]> {
  if (!supabaseAdmin) return [];

  const { data } = await supabaseAdmin
    .from('ai_request_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data || []) as AiRequestLog[];
}
