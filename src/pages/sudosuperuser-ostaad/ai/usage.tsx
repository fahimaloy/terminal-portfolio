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
    <div className="text-2xl font-display text-[var(--fg-1)]">{value}</div>
    <div className="text-[10px] font-display tracking-[2px] text-[var(--fg-3)] mt-1">
      {label.toUpperCase()}
    </div>
    {sub && (
      <div className="font-mono text-xs text-[var(--fg-3)] mt-0.5">{sub}</div>
    )}
  </HudPanel>
);

// ─── Progress Bar ─────────────────────────────────────────────

const ProgressBar: React.FC<{
  value: number;
  max: number;
  label: string;
  color?: string;
}> = ({ value, max, label, color = 'bg-[var(--bg-3)]' }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2 font-body text-xs">
      <span className="w-20 text-[var(--fg-3)]">{label}</span>
      <div className="flex-1 bg-[var(--bg-2)] border border-[var(--border-subtle)] h-2 rounded-[var(--radius-md)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-16 text-right font-mono text-[var(--fg-1)]">
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
              <p className="text-[10px] font-mono text-[var(--fg-3)] mt-1">
                {'>'} AI MODEL TELEMETRY
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="font-display text-[10px] tracking-[2px] text-[var(--fg-3)]">
                Period:
              </label>
              <select
                className="bg-[var(--bg-2)] border border-[var(--border-subtle)] text-[var(--fg-1)] px-3 py-1.5 font-body text-sm focus:outline-none focus:border-[var(--border-strong)] rounded-[var(--radius-md)] transition-all duration-200 [color-scheme:dark]"
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
                <div className="font-body text-sm text-[var(--fg-3)]">
                  Loading usage data...
                </div>
              </div>
            </div>
          ) : totalLogs === 0 ? (
            <HudPanel accent="cyan" notch="md" className="p-12 text-center">
              <div className="text-5xl mb-4">📭</div>
              <p className="font-display tracking-[2px] text-[var(--fg-1)] text-lg mb-2">
                No usage data yet
              </p>
              <p className="font-body text-sm text-[var(--fg-3)]">
                Usage data will appear here once AI models are used.
              </p>
            </HudPanel>
          ) : (
            <>
              {/* ─── Tab Navigation ────────────────────────── */}
              <div className="flex gap-1 mb-6 border-b border-[var(--border-subtle)] overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 font-display text-[11px] tracking-[2px] rounded-[var(--radius-md)] transition-all duration-200 whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-[var(--bg-3)] text-[var(--fg-2)] border border-[var(--border-subtle)] border-b-transparent'
                        : 'text-[var(--fg-3)] hover:text-[var(--fg-1)] hover:bg-[var(--bg-2)] border border-transparent'
                    }`}
                  >
                    <span className="mr-1">{tab.icon}</span>
                    {tab.label.toUpperCase()}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="ml-1 bg-[var(--bg-3)] text-[var(--bg-1)] text-xs px-1.5 py-0.5 rounded-full">
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
                      color="var(--status-success)"
                      sub={`${overview.successRate}% success rate`}
                    />
                    <StatCard
                      label="Failed"
                      value={overview.failedRequests.toLocaleString()}
                      icon="❌"
                      color="var(--status-error)"
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
                    <div className="text-[10px] font-display tracking-[3px] text-[var(--fg-2)] mb-4">
                      REQUEST DISTRIBUTION
                    </div>
                    <div className="space-y-3">
                      <ProgressBar
                        label="Successful"
                        value={overview.successfulRequests}
                        max={overview.totalRequests}
                        color="bg-[var(--bg-3)]"
                      />
                      <ProgressBar
                        label="Failed"
                        value={overview.failedRequests}
                        max={overview.totalRequests}
                        color="bg-[var(--bg-3)]"
                      />
                    </div>
                  </HudPanel>
                </div>
              )}

              {/* ─── Per Model Tab ─────────────────────────── */}
              {activeTab === 'per-model' && (
                <div className="space-y-4">
                  {modelStats.length === 0 ? (
                    <p className="font-body text-sm text-[var(--fg-3)]">
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
                            <h4 className="font-display tracking-[2px] text-[var(--fg-1)] text-sm">
                              {stat.modelIdentifier}
                            </h4>
                            <p className="font-body text-xs text-[var(--fg-3)]">
                              Provider: {stat.providerName}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-body text-sm text-[var(--fg-1)]">
                              {stat.totalRequests} requests
                            </div>
                            <div className="font-mono text-xs text-[var(--fg-3)]">
                              {stat.avgLatencyMs}ms avg
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                          <div className="text-center">
                            <div className="text-lg font-display text-[var(--fg-1)]">
                              {stat.totalRequests.toLocaleString()}
                            </div>
                            <div className="font-display text-[10px] tracking-[2px] text-[var(--fg-3)]">
                              Total
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-display text-[var(--fg-2)]">
                              {stat.successfulRequests.toLocaleString()}
                            </div>
                            <div className="font-display text-[10px] tracking-[2px] text-[var(--fg-3)]">
                              Success
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-display text-[var(--fg-2)]">
                              {stat.failedRequests.toLocaleString()}
                            </div>
                            <div className="font-display text-[10px] tracking-[2px] text-[var(--fg-3)]">
                              Failed
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-display text-[var(--fg-1)]">
                              {stat.totalTokens.toLocaleString()}
                            </div>
                            <div className="font-display text-[10px] tracking-[2px] text-[var(--fg-3)]">
                              Tokens
                            </div>
                          </div>
                        </div>

                        {stat.failedRequests > 0 && (
                          <div className="w-full bg-[var(--bg-2)] border border-[var(--border-subtle)] h-2 rounded-[var(--radius-md)] overflow-hidden">
                            <div
                              className="h-full bg-[var(--bg-3)] rounded-full"
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
                    <p className="font-body text-sm text-[var(--fg-3)]">
                      No daily data available.
                    </p>
                  ) : (
                    <>
                      <HudPanel accent="cyan" notch="md" className="p-4">
                        <div className="text-[10px] font-display tracking-[3px] text-[var(--fg-2)] mb-4">
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
                                <span className="w-24 text-[var(--fg-3)] font-mono">
                                  {day.date}
                                </span>
                                <div className="flex-1 bg-[var(--bg-2)] border border-[var(--border-subtle)] h-5 rounded-[var(--radius-md)] overflow-hidden flex">
                                  <div
                                    className="bg-[var(--bg-3)] h-full transition-all"
                                    style={{
                                      width: `${
                                        (day.totalRequests / maxVal) * 100
                                      }%`,
                                    }}
                                  />
                                </div>
                                <span className="w-16 text-right font-mono text-[var(--fg-1)]">
                                  {day.totalRequests}
                                </span>
                                <span className="w-12 text-right font-mono text-[var(--fg-3)]">
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
                            <tr className="border-b border-[var(--border-subtle)] text-[var(--fg-3)]">
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
                                className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-2)]"
                              >
                                <td className="p-3 font-mono text-xs text-[var(--fg-2)]">
                                  {day.date}
                                </td>
                                <td className="p-3 text-right font-mono text-[var(--fg-2)]">
                                  {day.totalRequests}
                                </td>
                                <td className="p-3 text-right font-mono text-[var(--fg-2)]">
                                  {day.successfulRequests}
                                </td>
                                <td className="p-3 text-right font-mono text-[var(--fg-2)]">
                                  {day.totalRequests - day.successfulRequests}
                                </td>
                                <td className="p-3 text-right font-mono text-[var(--fg-2)]">
                                  {day.totalTokens.toLocaleString()}
                                </td>
                                <td className="p-3 text-right font-mono text-[var(--fg-2)]">
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
                      <p className="font-body text-sm text-[var(--fg-3)]">
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
                          <tr className="border-b border-[var(--border-subtle)] text-[var(--fg-3)]">
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
                              className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-2)]"
                            >
                              <td className="p-3 font-mono text-xs text-[var(--fg-3)]">
                                {new Date(err.createdAt).toLocaleString()}
                              </td>
                              <td className="p-3 font-mono text-xs text-[var(--fg-2)]">
                                {err.modelIdentifier}
                              </td>
                              <td className="p-3 text-[var(--fg-2)]">
                                {err.providerName}
                              </td>
                              <td className="p-3">
                                <span className="font-display text-[10px] tracking-[2px] bg-[var(--bg-3)] text-[var(--fg-2)] border border-[var(--border-subtle)] px-2 py-0.5 rounded-[var(--radius-md)]">
                                  {err.requestType}
                                </span>
                              </td>
                              <td
                                className="p-3 font-mono text-xs text-[var(--fg-2)] max-w-xs truncate"
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
