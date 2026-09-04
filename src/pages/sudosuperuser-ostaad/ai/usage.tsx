import Head from 'next/head';
import React, { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { useAdminGuard } from '../../../utils/adminPageGuard';
import { GlitchText, HudPanel, NeonButton } from '../../../components/ui';
import {
  UsageData,
  UsageOverview,
  ModelUsageStat,
  DailyUsageStat,
  RecentError,
  fetchUsage,
} from '../../../utils/aiApi';

// ─── Stat Card ────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: string;
  color?: string;
  sub?: string;
}> = ({ label, value, icon, color, sub }) => (
  <HudPanel accent="cyan" notch="sm" className="p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-2xl">{icon}</span>
      {color && (
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
    </div>
    <div className="text-2xl font-display text-text-primary">{value}</div>
    <div className="text-[10px] font-display tracking-[2px] text-text-muted mt-1">
      {label.toUpperCase()}
    </div>
    {sub && (
      <div className="font-mono text-xs text-text-muted mt-0.5">{sub}</div>
    )}
  </HudPanel>
);

// ─── Progress Bar ─────────────────────────────────────────────

const ProgressBar: React.FC<{
  value: number;
  max: number;
  label: string;
  color?: string;
}> = ({ value, max, label, color = 'bg-neon-magenta' }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2 font-body text-xs">
      <span className="w-20 text-text-muted">{label}</span>
      <div className="flex-1 bg-white/[0.03] border border-white/10 h-2 clip-notch-sm overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-16 text-right font-mono text-text-primary">
        {value.toLocaleString()}
      </span>
    </div>
  );
};

// ─── Usage Page ───────────────────────────────────────────────

const AiUsagePage = () => {
  const { authorized, loading, user } = useAdminGuard();
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'per-model' | 'daily' | 'errors'
  >('overview');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const data = await fetchUsage(days);
    setUsageData(data);
    setIsLoading(false);
  }, [days]);

  useEffect(() => {
    if (authorized) {
      loadData();
    }
  }, [authorized, loadData]);

  if (!authorized) return null;

  const overview = usageData?.overview;
  const modelStats = usageData?.modelStats || [];
  const dailyStats = usageData?.dailyStats || [];
  const recentErrors = usageData?.recentErrors || [];
  const totalLogs = usageData?.totalLogs || 0;

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: '📊' },
    { id: 'per-model' as const, label: 'Per Model', icon: '🤖' },
    { id: 'daily' as const, label: 'Daily Trends', icon: '📈' },
    {
      id: 'errors' as const,
      label: 'Errors',
      icon: '⚠️',
      count: recentErrors.length,
    },
  ];

  return (
    <>
      <Head>
        <title>AI Usage & Reports - Admin Panel</title>
      </Head>

      <AdminLayout user={user} isLoading={loading}>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <GlitchText
                accent="cyan"
                className="text-2xl font-display tracking-[2px]"
              >
                USAGE & REPORTS
              </GlitchText>
              <p className="text-[10px] font-mono text-text-muted mt-1">
                {'>'} AI MODEL TELEMETRY
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="font-display text-[10px] tracking-[2px] text-text-muted">
                Period:
              </label>
              <select
                className="bg-bg-smoke border border-white/10 text-text-primary px-3 py-1.5 font-body text-sm focus:outline-none focus:border-neon-cyan clip-notch-sm transition-all duration-200 [color-scheme:dark]"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last year</option>
              </select>
              <NeonButton
                variant="outline"
                accent="cyan"
                onClick={loadData}
                disabled={isLoading}
                loading={isLoading}
              >
                {isLoading ? 'LOADING…' : 'REFRESH'}
              </NeonButton>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <div className="text-center">
                <div className="text-4xl mb-4 animate-pulse">⏳</div>
                <div className="font-body text-sm text-text-muted">
                  Loading usage data...
                </div>
              </div>
            </div>
          ) : totalLogs === 0 ? (
            <HudPanel accent="cyan" notch="md" className="p-12 text-center">
              <div className="text-5xl mb-4">📭</div>
              <p className="font-display tracking-[2px] text-text-primary text-lg mb-2">
                No usage data yet
              </p>
              <p className="font-body text-sm text-text-muted">
                Usage data will appear here once AI models are used.
              </p>
            </HudPanel>
          ) : (
            <>
              {/* ─── Tab Navigation ────────────────────────── */}
              <div className="flex gap-1 mb-6 border-b border-white/10 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 font-display text-[11px] tracking-[2px] clip-notch-sm transition-all duration-200 whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-neon-magenta/15 text-neon-magenta border border-neon-magenta/30 border-b-transparent'
                        : 'text-text-muted hover:text-text-primary hover:bg-white/[0.03] border border-transparent'
                    }`}
                  >
                    <span className="mr-1">{tab.icon}</span>
                    {tab.label.toUpperCase()}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="ml-1 bg-neon-magenta text-black text-xs px-1.5 py-0.5 rounded-full">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* ─── Overview Tab ──────────────────────────── */}
              {activeTab === 'overview' && overview && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                      label="Total Requests"
                      value={overview.totalRequests.toLocaleString()}
                      icon="📨"
                    />
                    <StatCard
                      label="Successful"
                      value={overview.successfulRequests.toLocaleString()}
                      icon="✅"
                      color="#22c55e"
                      sub={`${overview.successRate}% success rate`}
                    />
                    <StatCard
                      label="Failed"
                      value={overview.failedRequests.toLocaleString()}
                      icon="❌"
                      color="#ef4444"
                    />
                    <StatCard
                      label="Total Tokens"
                      value={overview.totalTokens.toLocaleString()}
                      icon="🔤"
                    />
                    <StatCard
                      label="Avg Latency"
                      value={`${overview.avgLatencyMs}ms`}
                      icon="⏱"
                    />
                    <StatCard
                      label="Period"
                      value={`${usageData.daysQueried} days`}
                      icon="📅"
                    />
                  </div>

                  <HudPanel accent="cyan" notch="md" className="p-6">
                    <div className="text-[10px] font-display tracking-[3px] text-neon-cyan mb-4">
                      REQUEST DISTRIBUTION
                    </div>
                    <div className="space-y-3">
                      <ProgressBar
                        label="Successful"
                        value={overview.successfulRequests}
                        max={overview.totalRequests}
                        color="bg-neon-green"
                      />
                      <ProgressBar
                        label="Failed"
                        value={overview.failedRequests}
                        max={overview.totalRequests}
                        color="bg-neon-red"
                      />
                    </div>
                  </HudPanel>
                </div>
              )}

              {/* ─── Per Model Tab ─────────────────────────── */}
              {activeTab === 'per-model' && (
                <div className="space-y-4">
                  {modelStats.length === 0 ? (
                    <p className="font-body text-sm text-text-muted">
                      No model-specific data available.
                    </p>
                  ) : (
                    modelStats.map((stat) => (
                      <HudPanel
                        key={stat.modelIdentifier}
                        accent="cyan"
                        notch="md"
                        className="p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-display tracking-[2px] text-text-primary text-sm">
                              {stat.modelIdentifier}
                            </h4>
                            <p className="font-body text-xs text-text-muted">
                              Provider: {stat.providerName}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-body text-sm text-text-primary">
                              {stat.totalRequests} requests
                            </div>
                            <div className="font-mono text-xs text-text-muted">
                              {stat.avgLatencyMs}ms avg
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                          <div className="text-center">
                            <div className="text-lg font-display text-text-primary">
                              {stat.totalRequests.toLocaleString()}
                            </div>
                            <div className="font-display text-[10px] tracking-[2px] text-text-muted">
                              Total
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-display text-neon-green">
                              {stat.successfulRequests.toLocaleString()}
                            </div>
                            <div className="font-display text-[10px] tracking-[2px] text-text-muted">
                              Success
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-display text-neon-red">
                              {stat.failedRequests.toLocaleString()}
                            </div>
                            <div className="font-display text-[10px] tracking-[2px] text-text-muted">
                              Failed
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-display text-text-primary">
                              {stat.totalTokens.toLocaleString()}
                            </div>
                            <div className="font-display text-[10px] tracking-[2px] text-text-muted">
                              Tokens
                            </div>
                          </div>
                        </div>

                        {stat.failedRequests > 0 && (
                          <div className="w-full bg-white/[0.03] border border-white/10 h-2 clip-notch-sm overflow-hidden">
                            <div
                              className="h-full bg-neon-red rounded-full"
                              style={{
                                width: `${
                                  stat.totalRequests > 0
                                    ? (stat.failedRequests /
                                        stat.totalRequests) *
                                      100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        )}
                      </HudPanel>
                    ))
                  )}
                </div>
              )}

              {/* ─── Daily Trends Tab ──────────────────────── */}
              {activeTab === 'daily' && (
                <div className="space-y-4">
                  {dailyStats.length === 0 ? (
                    <p className="font-body text-sm text-text-muted">
                      No daily data available.
                    </p>
                  ) : (
                    <>
                      <HudPanel accent="cyan" notch="md" className="p-4">
                        <div className="text-[10px] font-display tracking-[3px] text-neon-cyan mb-4">
                          DAILY REQUEST VOLUME (LAST {dailyStats.length} DAYS)
                        </div>
                        <div className="space-y-1">
                          {dailyStats.map((day) => {
                            const maxVal = Math.max(
                              ...dailyStats.map((d) => d.totalRequests),
                            );
                            return (
                              <div
                                key={day.date}
                                className="flex items-center gap-2 font-body text-xs"
                              >
                                <span className="w-24 text-text-muted font-mono">
                                  {day.date}
                                </span>
                                <div className="flex-1 bg-white/[0.03] border border-white/10 h-5 clip-notch-sm overflow-hidden flex">
                                  <div
                                    className="bg-neon-magenta shadow-[0_0_8px_var(--glow-magenta)] h-full transition-all"
                                    style={{
                                      width: `${
                                        (day.totalRequests / maxVal) * 100
                                      }%`,
                                    }}
                                  />
                                </div>
                                <span className="w-16 text-right font-mono text-text-primary">
                                  {day.totalRequests}
                                </span>
                                <span className="w-12 text-right font-mono text-text-muted">
                                  {day.totalTokens > 0
                                    ? `${(day.totalTokens / 1000).toFixed(1)}k`
                                    : '—'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </HudPanel>

                      <HudPanel
                        accent="cyan"
                        notch="md"
                        className="overflow-x-auto"
                      >
                        <table className="w-full font-body text-sm">
                          <thead>
                            <tr className="border-b border-white/10 text-text-muted">
                              <th className="p-3 text-left font-display text-[10px] tracking-[2px]">
                                Date
                              </th>
                              <th className="p-3 text-right font-display text-[10px] tracking-[2px]">
                                Requests
                              </th>
                              <th className="p-3 text-right font-display text-[10px] tracking-[2px]">
                                Successful
                              </th>
                              <th className="p-3 text-right font-display text-[10px] tracking-[2px]">
                                Failed
                              </th>
                              <th className="p-3 text-right font-display text-[10px] tracking-[2px]">
                                Tokens
                              </th>
                              <th className="p-3 text-right font-display text-[10px] tracking-[2px]">
                                Success Rate
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {dailyStats.map((day) => (
                              <tr
                                key={day.date}
                                className="border-b border-white/5 hover:bg-white/[0.03]"
                              >
                                <td className="p-3 font-mono text-xs text-text-secondary">
                                  {day.date}
                                </td>
                                <td className="p-3 text-right font-mono text-text-secondary">
                                  {day.totalRequests}
                                </td>
                                <td className="p-3 text-right font-mono text-neon-green">
                                  {day.successfulRequests}
                                </td>
                                <td className="p-3 text-right font-mono text-neon-red">
                                  {day.totalRequests - day.successfulRequests}
                                </td>
                                <td className="p-3 text-right font-mono text-text-secondary">
                                  {day.totalTokens.toLocaleString()}
                                </td>
                                <td className="p-3 text-right font-mono text-text-secondary">
                                  {day.totalRequests > 0
                                    ? `${Math.round(
                                        (day.successfulRequests /
                                          day.totalRequests) *
                                          100,
                                      )}%`
                                    : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </HudPanel>
                    </>
                  )}
                </div>
              )}

              {/* ─── Errors Tab ────────────────────────────── */}
              {activeTab === 'errors' && (
                <div className="space-y-4">
                  {recentErrors.length === 0 ? (
                    <HudPanel
                      accent="green"
                      notch="md"
                      className="p-8 text-center"
                    >
                      <div className="text-4xl mb-2">✨</div>
                      <p className="font-body text-sm text-text-muted">
                        No errors recorded. Everything is running smoothly!
                      </p>
                    </HudPanel>
                  ) : (
                    <HudPanel
                      accent="red"
                      notch="md"
                      className="overflow-x-auto"
                    >
                      <table className="w-full font-body text-sm">
                        <thead>
                          <tr className="border-b border-white/10 text-text-muted">
                            <th className="p-3 text-left font-display text-[10px] tracking-[2px]">
                              Time
                            </th>
                            <th className="p-3 text-left font-display text-[10px] tracking-[2px]">
                              Model
                            </th>
                            <th className="p-3 text-left font-display text-[10px] tracking-[2px]">
                              Provider
                            </th>
                            <th className="p-3 text-left font-display text-[10px] tracking-[2px]">
                              Type
                            </th>
                            <th className="p-3 text-left font-display text-[10px] tracking-[2px]">
                              Error
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentErrors.map((err) => (
                            <tr
                              key={err.id}
                              className="border-b border-white/5 hover:bg-white/[0.03]"
                            >
                              <td className="p-3 font-mono text-xs text-text-muted">
                                {new Date(err.createdAt).toLocaleString()}
                              </td>
                              <td className="p-3 font-mono text-xs text-neon-red">
                                {err.modelIdentifier}
                              </td>
                              <td className="p-3 text-text-secondary">
                                {err.providerName}
                              </td>
                              <td className="p-3">
                                <span className="font-display text-[10px] tracking-[2px] bg-neon-red/15 text-neon-red border border-neon-red/30 px-2 py-0.5 clip-notch-sm">
                                  {err.requestType}
                                </span>
                              </td>
                              <td
                                className="p-3 font-mono text-xs text-neon-red max-w-xs truncate"
                                title={err.errorMessage}
                              >
                                {err.errorMessage}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </HudPanel>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </AdminLayout>
    </>
  );
};

export default AiUsagePage;
