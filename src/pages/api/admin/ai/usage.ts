import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../../../../utils/adminAuth';
import { supabaseAdmin } from '../../../../utils/supabaseAdmin';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ ok: false, message: 'Method not allowed' });
    return;
  }

  if (!supabaseAdmin) {
    res.status(500).json({ ok: false, message: 'Missing server config' });
    return;
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const days = Math.min(Math.max(parseInt(req.query.days as string) || 30, 1), 365);
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Fetch all logs within the period
    const { data: logs, error } = await supabaseAdmin
      .from('ai_request_logs')
      .select('*')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    const allLogs = logs || [];

    // ─── Overview Stats ─────────────────────────────────────
    const totalRequests = allLogs.length;
    const successfulRequests = allLogs.filter((l) => l.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const totalTokens = allLogs.reduce((sum, l) => sum + (l.total_tokens || 0), 0);
    const avgLatencyMs = totalRequests > 0
      ? Math.round(allLogs.reduce((sum, l) => sum + (l.latency_ms || 0), 0) / totalRequests)
      : 0;

    // ─── Per-Model Stats ────────────────────────────────────
    const modelStatsMap = new Map<string, {
      modelId: number | null;
      modelIdentifier: string;
      providerName: string;
      totalRequests: number;
      successfulRequests: number;
      failedRequests: number;
      totalTokens: number;
      avgLatencyMs: number;
      requestsByDate: Record<string, number>;
    }>();

    for (const log of allLogs) {
      const key = log.model_identifier || `unknown-${log.model_id || log.provider_id}`;
      if (!modelStatsMap.has(key)) {
        modelStatsMap.set(key, {
          modelId: log.model_id,
          modelIdentifier: log.model_identifier || 'Unknown',
          providerName: log.provider_name || 'Unknown',
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          totalTokens: 0,
          avgLatencyMs: 0,
          requestsByDate: {},
        });
      }

      const stats = modelStatsMap.get(key)!;
      stats.totalRequests += 1;
      if (log.success) stats.successfulRequests += 1;
      else stats.failedRequests += 1;
      stats.totalTokens += log.total_tokens || 0;

      const date = log.created_at.split('T')[0];
      stats.requestsByDate[date] = (stats.requestsByDate[date] || 0) + 1;
    }

    // Calculate averages
    for (const stats of modelStatsMap.values()) {
      stats.avgLatencyMs = stats.totalRequests > 0
        ? Math.round(
            allLogs
              .filter((l) => l.model_identifier === stats.modelIdentifier)
              .reduce((sum, l) => sum + (l.latency_ms || 0), 0) / stats.totalRequests,
          )
        : 0;
    }

    // ─── Daily Stats ────────────────────────────────────────
    const dailyStatsMap = new Map<string, {
      totalRequests: number;
      successfulRequests: number;
      totalTokens: number;
    }>();

    for (const log of allLogs) {
      const date = log.created_at.split('T')[0];
      if (!dailyStatsMap.has(date)) {
        dailyStatsMap.set(date, { totalRequests: 0, successfulRequests: 0, totalTokens: 0 });
      }
      const ds = dailyStatsMap.get(date)!;
      ds.totalRequests += 1;
      if (log.success) ds.successfulRequests += 1;
      ds.totalTokens += log.total_tokens || 0;
    }

    const dailyStats = Array.from(dailyStatsMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ─── Recent Errors ──────────────────────────────────────
    const recentErrors = allLogs
      .filter((l) => !l.success)
      .slice(0, 50)
      .map((l) => ({
        id: l.id,
        modelIdentifier: l.model_identifier,
        providerName: l.provider_name,
        requestType: l.request_type,
        errorMessage: l.error_message,
        createdAt: l.created_at,
      }));

    res.status(200).json({
      ok: true,
      overview: {
        totalRequests,
        successfulRequests,
        failedRequests,
        totalTokens,
        avgLatencyMs,
        successRate: totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 100) : 0,
      },
      modelStats: Array.from(modelStatsMap.values()).sort((a, b) => b.totalRequests - a.totalRequests),
      dailyStats,
      recentErrors,
      totalLogs: allLogs.length,
      daysQueried: days,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch usage data';
    res.status(400).json({ ok: false, message });
  }
}
