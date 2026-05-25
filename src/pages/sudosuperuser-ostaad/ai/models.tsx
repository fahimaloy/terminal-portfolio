import Head from 'next/head';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { useAdminGuard } from '../../../utils/adminPageGuard';
import {
  AiProvider,
  AiModel,
  fetchProviders,
  fetchModels,
  createProvider,
  createModels,
  testConnection,
  updateModel,
  deleteModel,
  reorderModels,
} from '../../../utils/aiApi';

// ─── Types ────────────────────────────────────────────────────

type Step = 'form' | 'testing' | 'select' | 'creating';

// ─── Helpers ──────────────────────────────────────────────────

const generateSlug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// ─── Component ────────────────────────────────────────────────

const AiModelsPage = () => {
  const { authorized, loading, user } = useAdminGuard();

  // Data
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [models, setModels] = useState<AiModel[]>([]);
  const [statusMessage, setStatusMessage] = useState('');

  // Create form
  const [providerType, setProviderType] = useState<'gemini' | 'openai_compatible'>('gemini');
  const [providerName, setProviderName] = useState('');
  const [identifierSlug, setIdentifierSlug] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [rpmLimit, setRpmLimit] = useState<number | ''>('');
  const [rpdLimit, setRpdLimit] = useState<number | ''>('');

  // Test connection
  const [step, setStep] = useState<Step>('form');
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [testError, setTestError] = useState('');

  // Inline editing
  const [editingLimits, setEditingLimits] = useState<Record<number, { rpm: number | ''; rpd: number | '' }>>({});

  // Drag & drop
  const [dragModelId, setDragModelId] = useState<number | null>(null);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());

  // Load data
  const loadData = useCallback(async () => {
    const [provs, mods] = await Promise.all([fetchProviders(), fetchModels()]);
    setProviders(provs);
    setModels(mods);
  }, []);

  useEffect(() => {
    if (authorized) {
      loadData();
    }
  }, [authorized, loadData]);

  const updateStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  // ─── Auto-generate slug from name ────────────────────────
  const handleNameChange = (name: string) => {
    setProviderName(name);
    if (!identifierSlug || identifierSlug === generateSlug(providerName)) {
      setIdentifierSlug(generateSlug(name));
    }
  };

  // ─── Test Connection ──────────────────────────────────────
  const handleTestConnection = async () => {
    if (!apiKey) {
      setTestError('API Key is required');
      return;
    }
    if (providerType === 'openai_compatible' && !baseUrl) {
      setTestError('Base URL is required for OpenAI Compatible providers');
      return;
    }

    setStep('testing');
    setTestError('');
    setFetchedModels([]);
    setSelectedModels(new Set());

    try {
      const result = await testConnection({
        provider_type: providerType,
        api_key: apiKey,
        base_url: providerType === 'openai_compatible' ? baseUrl : undefined,
      });
      setFetchedModels(result.models);
      setStep('select');
    } catch (err: any) {
      setTestError(err.message || 'Connection failed');
      setStep('form');
    }
  };

  // ─── Toggle model selection ──────────────────────────────
  const toggleModelSelection = (modelName: string) => {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      if (next.has(modelName)) {
        next.delete(modelName);
      } else {
        next.add(modelName);
      }
      return next;
    });
  };

  // ─── Create Provider + Models ────────────────────────────
  const handleCreate = async () => {
    if (!providerName || !identifierSlug || !apiKey) {
      updateStatus('Please fill all required fields');
      return;
    }
    if (selectedModels.size === 0) {
      updateStatus('Please select at least one model');
      return;
    }
    if (providerType === 'openai_compatible' && !baseUrl) {
      updateStatus('Base URL is required');
      return;
    }

    setIsSaving(true);
    setStep('creating');

    try {
      // 1. Create provider
      const provider = await createProvider({
        name: providerName,
        provider_type: providerType,
        identifier_slug: identifierSlug,
        api_key: apiKey,
        base_url: providerType === 'openai_compatible' ? baseUrl : undefined,
      });

      if (!provider) {
        throw new Error('Failed to create provider');
      }

      // 2. Create models
      const modelNames = Array.from(selectedModels);
      const created = await createModels({
        provider_id: provider.id,
        model_names: modelNames,
        identifier_slug: identifierSlug,
        rpm_limit: rpmLimit !== '' ? Number(rpmLimit) : null,
        rpd_limit: rpdLimit !== '' ? Number(rpdLimit) : null,
      });

      if (!created) {
        throw new Error('Failed to create models');
      }

      updateStatus(`Created provider "${providerName}" with ${created.length} model(s)`);

      // Reset form
      setProviderType('gemini');
      setProviderName('');
      setIdentifierSlug('');
      setBaseUrl('');
      setApiKey('');
      setRpmLimit('');
      setRpdLimit('');
      setFetchedModels([]);
      setSelectedModels(new Set());
      setStep('form');

      // Reload data
      await loadData();
    } catch (err: any) {
      updateStatus(err.message || 'Failed to create');
    }

    setIsSaving(false);
  };

  // ─── Cancel creation flow ────────────────────────────────
  const handleCancelCreate = () => {
    setStep('form');
    setFetchedModels([]);
    setSelectedModels(new Set());
    setTestError('');
  };

  // ─── Toggle Model Active ─────────────────────────────────
  const handleToggleActive = async (model: AiModel) => {
    setTogglingIds((prev) => new Set(prev).add(model.id));
    const ok = await updateModel(model.id, { is_active: !model.is_active });
    if (ok) {
      await loadData();
    } else {
      updateStatus('Failed to toggle model');
    }
    setTogglingIds((prev) => {
      const next = new Set(prev);
      next.delete(model.id);
      return next;
    });
  };

  // ─── Inline Edit Limits ──────────────────────────────────
  const handleEditLimits = (model: AiModel) => {
    setEditingLimits((prev) => ({
      ...prev,
      [model.id]: {
        rpm: model.rpm_limit ?? '',
        rpd: model.rpd_limit ?? '',
      },
    }));
  };

  const handleSaveLimits = async (modelId: number) => {
    const limits = editingLimits[modelId];
    if (!limits) return;

    setIsSaving(true);
    const ok = await updateModel(modelId, {
      rpm_limit: limits.rpm !== '' ? Number(limits.rpm) : null,
      rpd_limit: limits.rpd !== '' ? Number(limits.rpd) : null,
    });

    if (ok) {
      setEditingLimits((prev) => {
        const next = { ...prev };
        delete next[modelId];
        return next;
      });
      await loadData();
      updateStatus('Limits updated');
    } else {
      updateStatus('Failed to update limits');
    }
    setIsSaving(false);
  };

  const handleCancelEditLimits = (modelId: number) => {
    setEditingLimits((prev) => {
      const next = { ...prev };
      delete next[modelId];
      return next;
    });
  };

  // ─── Delete Model ────────────────────────────────────────
  const handleDeleteModel = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this model?')) return;
    setIsSaving(true);
    const ok = await deleteModel(id);
    if (ok) {
      await loadData();
      updateStatus('Model deleted');
    } else {
      updateStatus('Failed to delete model');
    }
    setIsSaving(false);
  };

  // ─── Drag & Drop Reorder ─────────────────────────────────
  const handleDragStart = (modelId: number) => {
    setDragModelId(modelId);
  };

  const handleDrop = async (targetModelId: number) => {
    if (!dragModelId || dragModelId === targetModelId) return;

    const sourceIdx = models.findIndex((m) => m.id === dragModelId);
    const targetIdx = models.findIndex((m) => m.id === targetModelId);
    if (sourceIdx < 0 || targetIdx < 0) return;

    const reordered = [...models];
    const [moved] = reordered.splice(sourceIdx, 1);
    reordered.splice(targetIdx, 0, moved);

    setModels(reordered);
    setDragModelId(null);

    setIsSaving(true);
    const ok = await reorderModels(reordered.map((m) => m.id));
    if (ok) {
      await loadData();
    } else {
      updateStatus('Failed to reorder');
    }
    setIsSaving(false);
  };

  if (!authorized) return null;

  // ─── Provider Badge ──────────────────────────────────────
  const providerBadge = (model: AiModel) => {
    const provider = providers.find((p) => p.id === model.provider_id);
    if (!provider) return <span className="text-xs text-red-400">No provider</span>;
    return (
      <span
        className={`text-xs px-2 py-0.5 rounded ${
          provider.provider_type === 'gemini'
            ? 'bg-blue-900 text-blue-300'
            : 'bg-purple-900 text-purple-300'
        }`}
      >
        {provider.name} ({provider.provider_type === 'gemini' ? 'Gemini' : 'OpenAI'})
      </span>
    );
  };

  // ─── Cooldown Badge ──────────────────────────────────────
  const cooldownBadge = (model: AiModel) => {
    if (!model.cooldown_until) return null;
    const until = new Date(model.cooldown_until);
    if (until <= new Date()) return null;
    return (
      <span className="text-xs bg-yellow-900 text-yellow-300 px-2 py-0.5 rounded">
        Cooldown until {until.toLocaleTimeString()}
      </span>
    );
  };

  return (
    <>
      <Head>
        <title>AI Models - Admin Panel</title>
      </Head>

      <AdminLayout user={user} isLoading={loading}>
        <div>
          <h2 className="text-2xl font-bold mb-6">AI Models Management</h2>

          {statusMessage && (
            <div className="mb-4 p-3 bg-lime-500/10 border border-lime-500/30 text-lime-400 text-sm rounded-xl">
              {statusMessage}
            </div>
          )}

          {/* ─── Create New Model Form ─────────────────────── */}
          <div className="glass-deep rounded-xl p-6 mb-8">
            <h3 className="text-lg font-bold text-white mb-4">Add New AI Model</h3>

            {step === 'form' || step === 'testing' ? (
              <div className="space-y-4">
                {/* Provider Type */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Provider Type:</label>
                  <select
                    className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none"
                    value={providerType}
                    onChange={(e) => setProviderType(e.target.value as 'gemini' | 'openai_compatible')}
                    disabled={isSaving}
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="openai_compatible">OpenAI Compatible</option>
                  </select>
                </div>

                {/* Provider Name */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Provider Name:</label>
                  <input
                    type="text"
                    className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500"
                    placeholder="e.g., My Gemini Provider"
                    value={providerName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    disabled={isSaving}
                  />
                </div>

                {/* Identifier Slug */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Identifier Slug:
                    <span className="text-gray-500 ml-2 text-xs">(unique, used for model identifiers)</span>
                  </label>
                  <input
                    type="text"
                    className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500 font-mono"
                    placeholder="e.g., my-gemini-provider"
                    value={identifierSlug}
                    onChange={(e) => setIdentifierSlug(generateSlug(e.target.value))}
                    disabled={isSaving}
                  />
                </div>

                {/* Base URL (OpenAI Compatible only) */}
                {providerType === 'openai_compatible' && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Base URL:</label>
                    <input
                      type="url"
                      className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500 font-mono"
                      placeholder="e.g., https://api.openai.com/v1"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      disabled={isSaving}
                    />
                  </div>
                )}

                {/* API Key */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">API Key:</label>
                  <input
                    type="password"
                    className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500"
                    placeholder="Enter your API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    disabled={isSaving}
                  />
                </div>

                {/* RPM / RPD Limits */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Requests Per Minute (optional):</label>
                    <input
                      type="number"
                      min="0"
                      className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500"
                      placeholder="e.g., 60"
                      value={rpmLimit}
                      onChange={(e) => setRpmLimit(e.target.value ? Number(e.target.value) : '')}
                      disabled={isSaving}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Requests Per Day (optional):</label>
                    <input
                      type="number"
                      min="0"
                      className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500"
                      placeholder="e.g., 10000"
                      value={rpdLimit}
                      onChange={(e) => setRpdLimit(e.target.value ? Number(e.target.value) : '')}
                      disabled={isSaving}
                    />
                  </div>
                </div>

                {/* Test Connection Button */}
                <button
                  onClick={handleTestConnection}
                  disabled={isSaving || step === 'testing'}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white rounded-xl font-medium transition-all shadow-lg disabled:opacity-50 text-sm"
                >
                  {step === 'testing' ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⟳</span>
                      Testing Connection...
                    </span>
                  ) : (
                    'Test & Fetch Models'
                  )}
                </button>

                {testError && (
                  <div className="p-3 bg-red-900/30 border border-red-500/30 text-red-300 text-sm rounded-xl">
                    {testError}
                  </div>
                )}
              </div>
            ) : null}

            {/* ─── Model Selection (after test) ────────────── */}
            {step === 'select' && (
              <div className="space-y-4">
                <div className="p-3 bg-lime-500/10 border border-lime-500/30 text-lime-400 text-sm rounded-xl">
                  Found {fetchedModels.length} models. Select the ones you want to add:
                </div>

                <div className="max-h-64 overflow-y-auto border border-gray-800 rounded-xl p-3 bg-white/5">
                  {fetchedModels.length === 0 ? (
                    <p className="text-gray-400 text-sm">No models found from this provider.</p>
                  ) : (
                    <div className="space-y-1">
                      {fetchedModels.map((modelName) => (
                        <label
                          key={modelName}
                          className="flex items-center gap-3 text-sm cursor-pointer hover:bg-white/5 p-2 rounded-lg"
                        >
                          <input
                            type="checkbox"
                            checked={selectedModels.has(modelName)}
                            onChange={() => toggleModelSelection(modelName)}
                            className="cursor-pointer"
                          />
                          <span className="font-mono text-white">{modelName}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleCreate}
                    disabled={isSaving || selectedModels.size === 0}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white rounded-xl font-medium transition-all shadow-lg disabled:opacity-50"
                  >
                    {isSaving ? 'Creating...' : `Create ${selectedModels.size} Model(s)`}
                  </button>
                  <button
                    onClick={handleCancelCreate}
                    disabled={isSaving}
                    className="px-4 py-2.5 bg-white/5 border border-gray-700/50 text-gray-400 rounded-xl hover:text-white hover:bg-white/10 backdrop-blur-sm text-sm transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ─── Models Table ──────────────────────────────── */}
          <div className="glass-deep rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-lg font-bold text-white">
                Configured Models ({models.length})
              </h3>
              {models.length > 0 && (
                <p className="text-xs text-gray-400 mt-1">Drag rows to reorder. Models are used in top-to-bottom order.</p>
              )}
            </div>

            {models.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No models configured yet. Add one above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400">
                      <th className="p-3 text-left w-8">#</th>
                      <th className="p-3 text-left">Model</th>
                      <th className="p-3 text-left">Provider</th>
                      <th className="p-3 text-left">Identifier</th>
                      <th className="p-3 text-center">RPM</th>
                      <th className="p-3 text-center">RPD</th>
                      <th className="p-3 text-center">Active</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {models.map((model) => (
                      <tr
                        key={model.id}
                        draggable
                        onDragStart={() => handleDragStart(model.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDrop(model.id)}
                        className={`border-b border-gray-800 hover:bg-white/5 cursor-move ${
                          !model.is_active ? 'opacity-50' : ''
                        }`}
                      >
                        <td className="p-3 text-gray-500">{model.sort_order}</td>
                        <td className="p-3">
                          <div>
                            <span className="font-bold text-white">{model.display_name || model.model_name}</span>
                            {model.model_name !== model.display_name && (
                              <div className="text-xs text-gray-500 font-mono">{model.model_name}</div>
                            )}
                          </div>
                          {cooldownBadge(model)}
                        </td>
                        <td className="p-3">{providerBadge(model)}</td>
                        <td className="p-3">
                          <code className="text-xs text-gray-500">{model.identifier}</code>
                        </td>
                        <td className="p-3 text-center">
                          {editingLimits[model.id] ? (
                            <input
                              type="number"
                              min="0"
                              className="w-16 px-1 py-0.5 bg-white/5 border border-gray-700 text-white text-xs text-center rounded"
                              value={editingLimits[model.id].rpm}
                              onChange={(e) =>
                                setEditingLimits((prev) => ({
                                  ...prev,
                                  [model.id]: {
                                    ...prev[model.id],
                                    rpm: e.target.value !== '' ? Number(e.target.value) : '',
                                  },
                                }))
                              }
                              autoFocus
                            />
                          ) : (
                            <span className="text-gray-300">{model.rpm_limit ?? '—'}</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {editingLimits[model.id] ? (
                            <input
                              type="number"
                              min="0"
                              className="w-16 px-1 py-0.5 bg-white/5 border border-gray-700 text-white text-xs text-center rounded"
                              value={editingLimits[model.id].rpd}
                              onChange={(e) =>
                                setEditingLimits((prev) => ({
                                  ...prev,
                                  [model.id]: {
                                    ...prev[model.id],
                                    rpd: e.target.value !== '' ? Number(e.target.value) : '',
                                  },
                                }))
                              }
                            />
                          ) : (
                            <span className="text-gray-300">{model.rpd_limit ?? '—'}</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleActive(model)}
                            disabled={togglingIds.has(model.id)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              model.is_active ? 'bg-purple-500' : 'bg-gray-600'
                            }`}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                model.is_active ? 'translate-x-4.5' : 'translate-x-0.5'
                              }`}
                              style={{ transform: model.is_active ? 'translateX(18px)' : 'translateX(2px)' }}
                            />
                          </button>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1 justify-center">
                            {editingLimits[model.id] ? (
                              <>
                                <button
                                  onClick={() => handleSaveLimits(model.id)}
                                  disabled={isSaving}
                                  className="px-2 py-1 bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs rounded-lg hover:from-purple-500 hover:to-cyan-400 disabled:opacity-50 transition-all"
                                  title="Save limits"
                                >
                                  💾
                                </button>
                                <button
                                  onClick={() => handleCancelEditLimits(model.id)}
                                  disabled={isSaving}
                                  className="px-2 py-1 bg-white/5 border border-gray-700/50 text-gray-400 text-xs rounded-lg hover:text-white hover:bg-white/10 disabled:opacity-50 transition-all"
                                  title="Cancel"
                                >
                                  ✕
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleEditLimits(model)}
                                className="px-2 py-1 bg-white/5 border border-gray-700/50 text-gray-400 text-xs rounded-lg hover:text-white hover:bg-white/10 transition-all"
                                title="Edit limits"
                              >
                                Limits
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteModel(model.id)}
                              disabled={isSaving}
                              className="px-2 py-1 bg-white/5 border border-gray-700/50 text-gray-400 text-xs rounded-lg hover:text-white hover:bg-white/10 disabled:opacity-50 transition-all"
                              title="Delete model"
                            >
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    </>
  );
};

export default AiModelsPage;
