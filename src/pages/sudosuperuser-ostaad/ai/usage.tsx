import Head from 'next/head';
import React, { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { useAdminGuard } from '../../../utils/adminPageGuard';
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
  <div className="glass-panel rounded-xl p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-2xl">{icon}</span>
      {color && (
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
    </div>
    <div className="text-2xl font-bold text-white">{value}</div>
    <div className="text-xs text-gray-400 mt-1">{label}</div>
    {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
  </div>
);

// ─── Progress Bar ─────────────────────────────────────────────

const ProgressBar: React.FC<{
  value: number;
  max: number;
  label: string;
  color?: string;
}> = ({ value, max, label, color = 'bg-purple-500' }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-gray-400">{label}</span>
      <div className="flex-1 bg-gray-800 h-2 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-16 text-right text-white">
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Usage & Reports</h2>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400">Period:</label>
              <select
                className="form-premium-input rounded-xl p-2 text-white text-sm focus:outline-none"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last year</option>
              </select>
              <button
                onClick={loadData}
                disabled={isLoading}
                className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white text-sm font-medium rounded-xl transition-all shadow-lg disabled:opacity-50"
              >
                {isLoading ? '⟳' : 'Refresh'}
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <div className="text-center">
                <div className="text-4xl mb-4 animate-pulse">⏳</div>
                <div className="text-gray-400">Loading usage data...</div>
              </div>
            </div>
          ) : totalLogs === 0 ? (
            <div className="text-center text-gray-400 p-12 glass-deep rounded-xl">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-lg mb-2">No usage data yet</p>
              <p className="text-sm">
                Usage data will appear here once AI models are used.
              </p>
            </div>
          ) : (
            <>
              {/* ─── Tab Navigation ────────────────────────── */}
              <div className="flex gap-1 mb-6 border-b border-gray-800 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30 border-b-transparent'
                        : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <span className="mr-1">{tab.icon}</span>
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="ml-1 bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full">
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

                  <div className="glass-deep rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">
                      Request Distribution
                    </h3>
                    <div className="space-y-3">
                      <ProgressBar
                        label="Successful"
                        value={overview.successfulRequests}
                        max={overview.totalRequests}
                        color="bg-lime-500"
                      />
                      <ProgressBar
                        label="Failed"
                        value={overview.failedRequests}
                        max={overview.totalRequests}
                        color="bg-red-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Per Model Tab ─────────────────────────── */}
              {activeTab === 'per-model' && (
                <div className="space-y-4">
                  {modelStats.length === 0 ? (
                    <p className="text-gray-400">
                      No model-specific data available.
                    </p>
                  ) : (
                    modelStats.map((stat) => (
                      <div
                        key={stat.modelIdentifier}
                        className="glass-deep rounded-xl p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-bold text-white">
                              {stat.modelIdentifier}
                            </h4>
                            <p className="text-xs text-gray-400">
                              Provider: {stat.providerName}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-white">
                              {stat.totalRequests} requests
                            </div>
                            <div className="text-xs text-gray-500">
                              {stat.avgLatencyMs}ms avg
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                          <div className="text-center">
                            <div className="text-lg font-bold text-white">
                              {stat.totalRequests.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-400">Total</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-lime-400">
                              {stat.successfulRequests.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-400">Success</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-red-400">
                              {stat.failedRequests.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-400">Failed</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-white">
                              {stat.totalTokens.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-400">Tokens</div>
                          </div>
                        </div>

                        {stat.failedRequests > 0 && (
                          <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-500 rounded-full"
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
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ─── Daily Trends Tab ──────────────────────── */}
              {activeTab === 'daily' && (
                <div className="space-y-4">
                  {dailyStats.length === 0 ? (
                    <p className="text-gray-400">No daily data available.</p>
                  ) : (
                    <>
                      <div className="glass-deep rounded-xl p-4">
                        <h3 className="text-lg font-bold text-white mb-4">
                          Daily Request Volume (last {dailyStats.length} days)
                        </h3>
                        <div className="space-y-1">
                          {dailyStats.map((day) => {
                            const maxVal = Math.max(
                              ...dailyStats.map((d) => d.totalRequests),
                            );
                            return (
                              <div
                                key={day.date}
                                className="flex items-center gap-2 text-xs"
                              >
                                <span className="w-24 text-gray-400 font-mono">
                                  {day.date}
                                </span>
                                <div className="flex-1 bg-gray-800 h-5 rounded overflow-hidden flex">
                                  <div
                                    className="bg-purple-500 h-full transition-all"
                                    style={{
                                      width: `${
                                        (day.totalRequests / maxVal) * 100
                                      }%`,
                                    }}
                                  />
                                </div>
                                <span className="w-16 text-right text-white">
                                  {day.totalRequests}
                                </span>
                                <span className="w-12 text-right text-gray-500">
                                  {day.totalTokens > 0
                                    ? `${(day.totalTokens / 1000).toFixed(1)}k`
                                    : '—'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="overflow-x-auto glass-deep rounded-xl">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-800 text-gray-400">
                              <th className="p-3 text-left">Date</th>
                              <th className="p-3 text-right">Requests</th>
                              <th className="p-3 text-right">Successful</th>
                              <th className="p-3 text-right">Failed</th>
                              <th className="p-3 text-right">Tokens</th>
                              <th className="p-3 text-right">Success Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dailyStats.map((day) => (
                              <tr
                                key={day.date}
                                className="border-b border-gray-800 hover:bg-white/5"
                              >
                                <td className="p-3 font-mono text-gray-300">
                                  {day.date}
                                </td>
                                <td className="p-3 text-right text-gray-300">
                                  {day.totalRequests}
                                </td>
                                <td className="p-3 text-right text-lime-400">
                                  {day.successfulRequests}
                                </td>
                                <td className="p-3 text-right text-red-400">
                                  {day.totalRequests - day.successfulRequests}
                                </td>
                                <td className="p-3 text-right text-gray-300">
                                  {day.totalTokens.toLocaleString()}
                                </td>
                                <td className="p-3 text-right text-gray-300">
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
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ─── Errors Tab ────────────────────────────── */}
              {activeTab === 'errors' && (
                <div className="space-y-4">
                  {recentErrors.length === 0 ? (
                    <div className="text-center text-gray-400 p-8 glass-deep rounded-xl">
                      <div className="text-4xl mb-2">✨</div>
                      <p>No errors recorded. Everything is running smoothly!</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto glass-deep rounded-xl">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-800 text-gray-400">
                            <th className="p-3 text-left">Time</th>
                            <th className="p-3 text-left">Model</th>
                            <th className="p-3 text-left">Provider</th>
                            <th className="p-3 text-left">Type</th>
                            <th className="p-3 text-left">Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentErrors.map((err) => (
                            <tr
                              key={err.id}
                              className="border-b border-gray-800 hover:bg-white/5"
                            >
                              <td className="p-3 text-xs font-mono text-gray-500">
                                {new Date(err.createdAt).toLocaleString()}
                              </td>
                              <td className="p-3 text-red-400">
                                {err.modelIdentifier}
                              </td>
                              <td className="p-3 text-gray-300">
                                {err.providerName}
                              </td>
                              <td className="p-3">
                                <span className="text-xs bg-red-900/50 text-red-300 px-2 py-0.5 rounded">
                                  {err.requestType}
                                </span>
                              </td>
                              <td
                                className="p-3 text-xs text-red-400 max-w-xs truncate"
                                title={err.errorMessage}
                              >
                                {err.errorMessage}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
