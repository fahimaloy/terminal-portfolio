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
import {
  GlitchText,
  HudPanel,
  NeonButton,
  NeonChip,
} from '../../../components/ui';
import { getErrorMessage } from '../../../utils/errorMessage';

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
  const [providerType, setProviderType] = useState<
    'gemini' | 'openai_compatible'
  >('gemini');
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
  const [editingLimits, setEditingLimits] = useState<
    Record<number, { rpm: number | ''; rpd: number | '' }>
  >({});

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
    } catch (err: unknown) {
      setTestError(getErrorMessage(err, 'Connection failed'));
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

      updateStatus(
        `Created provider "${providerName}" with ${created.length} model(s)`,
      );

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
    } catch (err: unknown) {
      updateStatus(getErrorMessage(err, 'Failed to create'));
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
    if (!provider)
      return <span className="text-[10px] text-neon-red">No provider</span>;
    return (
      <NeonChip
        accent={provider.provider_type === 'gemini' ? 'cyan' : 'magenta'}
      >
        {provider.name} (
        {provider.provider_type === 'gemini' ? 'GEMINI' : 'OPENAI'})
      </NeonChip>
    );
  };

  // ─── Cooldown Badge ──────────────────────────────────────
  const cooldownBadge = (model: AiModel) => {
    if (!model.cooldown_until) return null;
    const until = new Date(model.cooldown_until);
    if (until <= new Date()) return null;
    return (
      <NeonChip accent="yellow" className="mt-1">
        COOLDOWN UNTIL {until.toLocaleTimeString()}
      </NeonChip>
    );
  };

  return (
    <>
      <Head>
        <title>AI Models - Admin Panel</title>
      </Head>

      <AdminLayout user={user} isLoading={loading}>
        <div>
          <GlitchText
            accent="cyan"
            className="text-2xl font-display tracking-[2px] mb-6"
          >
            AI MODELS MANAGEMENT
          </GlitchText>

          {statusMessage && (
            <HudPanel accent="green" notch="sm" className="mb-4 p-3">
              <span className="font-body text-sm text-neon-green">
                {statusMessage}
              </span>
            </HudPanel>
          )}

          {/* ─── Create New Model Form ─────────────────────── */}
          <HudPanel accent="cyan" notch="md" className="p-6 mb-8">
            <div className="text-[10px] font-display tracking-[3px] text-neon-cyan mb-4">
              ADD NEW AI MODEL
            </div>

            {step === 'form' || step === 'testing' ? (
              <div className="space-y-4">
                {/* Provider Type */}
                <div>
                  <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                    PROVIDER TYPE:
                  </label>
                  <select
                    className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] clip-notch-sm transition-all duration-200 [color-scheme:dark]"
                    value={providerType}
                    onChange={(e) =>
                      setProviderType(
                        e.target.value as 'gemini' | 'openai_compatible',
                      )
                    }
                    disabled={isSaving}
                  >
                    <option value="gemini">GOOGLE GEMINI</option>
                    <option value="openai_compatible">OPENAI COMPATIBLE</option>
                  </select>
                </div>

                {/* Provider Name */}
                <div>
                  <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                    PROVIDER NAME:
                  </label>
                  <input
                    type="text"
                    className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                    placeholder="e.g., My Gemini Provider"
                    value={providerName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    disabled={isSaving}
                  />
                </div>

                {/* Identifier Slug */}
                <div>
                  <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                    IDENTIFIER SLUG:
                    <span className="text-text-muted ml-2 text-[9px]">
                      (unique, used for model identifiers)
                    </span>
                  </label>
                  <input
                    type="text"
                    className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted font-mono clip-notch-sm transition-all duration-200"
                    placeholder="e.g., my-gemini-provider"
                    value={identifierSlug}
                    onChange={(e) =>
                      setIdentifierSlug(generateSlug(e.target.value))
                    }
                    disabled={isSaving}
                  />
                </div>

                {/* Base URL (OpenAI Compatible only) */}
                {providerType === 'openai_compatible' && (
                  <div>
                    <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                      BASE URL:
                    </label>
                    <input
                      type="url"
                      className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted font-mono clip-notch-sm transition-all duration-200"
                      placeholder="e.g., https://api.openai.com/v1"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      disabled={isSaving}
                    />
                  </div>
                )}

                {/* API Key */}
                <div>
                  <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                    API KEY:
                  </label>
                  <input
                    type="password"
                    className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                    placeholder="Enter your API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    disabled={isSaving}
                  />
                </div>

                {/* RPM / RPD Limits */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                      REQUESTS PER MINUTE (OPTIONAL):
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                      placeholder="e.g., 60"
                      value={rpmLimit}
                      onChange={(e) =>
                        setRpmLimit(
                          e.target.value ? Number(e.target.value) : '',
                        )
                      }
                      disabled={isSaving}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                      REQUESTS PER DAY (OPTIONAL):
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                      placeholder="e.g., 10000"
                      value={rpdLimit}
                      onChange={(e) =>
                        setRpdLimit(
                          e.target.value ? Number(e.target.value) : '',
                        )
                      }
                      disabled={isSaving}
                    />
                  </div>
                </div>

                {/* Test Connection Button */}
                <NeonButton
                  accent="cyan"
                  onClick={handleTestConnection}
                  disabled={isSaving || step === 'testing'}
                  loading={step === 'testing'}
                >
                  {step === 'testing' ? 'TESTING…' : 'TEST & FETCH MODELS'}
                </NeonButton>

                {testError && (
                  <HudPanel accent="red" notch="sm" className="p-3">
                    <span className="font-body text-sm text-neon-red">
                      {testError}
                    </span>
                  </HudPanel>
                )}
              </div>
            ) : null}

            {/* ─── Model Selection (after test) ────────────── */}
            {step === 'select' && (
              <div className="space-y-4">
                <HudPanel accent="green" notch="sm" className="p-3">
                  <span className="font-body text-sm text-neon-green">
                    Found {fetchedModels.length} models. Select the ones you
                    want to add:
                  </span>
                </HudPanel>

                <div className="max-h-64 overflow-y-auto border border-white/5 rounded-xl p-3 bg-black/30">
                  {fetchedModels.length === 0 ? (
                    <p className="text-text-muted text-sm font-body">
                      No models found from this provider.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {fetchedModels.map((modelName) => (
                        <label
                          key={modelName}
                          className="flex items-center gap-3 text-sm cursor-pointer hover:bg-white/5 p-2 rounded clip-notch-sm transition-all duration-200"
                        >
                          <input
                            type="checkbox"
                            checked={selectedModels.has(modelName)}
                            onChange={() => toggleModelSelection(modelName)}
                            className="cursor-pointer accent-neon-cyan"
                          />
                          <span className="font-mono text-text-primary">
                            {modelName}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <NeonButton
                    accent="yellow"
                    onClick={handleCreate}
                    disabled={isSaving || selectedModels.size === 0}
                  >
                    {isSaving
                      ? 'CREATING…'
                      : `CREATE ${selectedModels.size} MODEL(S)`}
                  </NeonButton>
                  <NeonButton
                    variant="ghost"
                    accent="magenta"
                    onClick={handleCancelCreate}
                    disabled={isSaving}
                  >
                    CANCEL
                  </NeonButton>
                </div>
              </div>
            )}
          </HudPanel>

          {/* ─── Models Table ──────────────────────────────── */}
          <HudPanel accent="cyan" notch="md" className="overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <div className="text-lg font-display tracking-[2px] text-neon-cyan">
                CONFIGURED MODELS ({models.length})
              </div>
              {models.length > 0 && (
                <p className="text-[10px] font-body text-text-muted mt-1">
                  Drag rows to reorder. Models are used in top-to-bottom order.
                </p>
              )}
            </div>

            {models.length === 0 ? (
              <div className="p-8 text-center text-text-muted font-body">
                No models configured yet. Add one above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-text-muted">
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
                        className={`border-b border-white/5 hover:bg-white/5 cursor-move ${
                          !model.is_active ? 'opacity-50' : ''
                        }`}
                      >
                        <td className="p-3 text-text-muted font-mono">
                          {model.sort_order}
                        </td>
                        <td className="p-3">
                          <div>
                            <span className="font-display text-text-primary">
                              {model.display_name || model.model_name}
                            </span>
                            {model.model_name !== model.display_name && (
                              <div className="text-[10px] text-text-muted font-mono">
                                {model.model_name}
                              </div>
                            )}
                          </div>
                          {cooldownBadge(model)}
                        </td>
                        <td className="p-3">{providerBadge(model)}</td>
                        <td className="p-3">
                          <code className="text-[10px] text-text-muted">
                            {model.identifier}
                          </code>
                        </td>
                        <td className="p-3 text-center">
                          {editingLimits[model.id] ? (
                            <input
                              type="number"
                              min="0"
                              className="w-16 px-1 py-0.5 bg-black/30 border border-white/10 text-text-primary text-[10px] text-center rounded clip-notch-sm focus:outline-none focus:border-neon-cyan"
                              value={editingLimits[model.id].rpm}
                              onChange={(e) =>
                                setEditingLimits((prev) => ({
                                  ...prev,
                                  [model.id]: {
                                    ...prev[model.id],
                                    rpm:
                                      e.target.value !== ''
                                        ? Number(e.target.value)
                                        : '',
                                  },
                                }))
                              }
                              autoFocus
                            />
                          ) : (
                            <span className="text-text-secondary">
                              {model.rpm_limit ?? '—'}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {editingLimits[model.id] ? (
                            <input
                              type="number"
                              min="0"
                              className="w-16 px-1 py-0.5 bg-black/30 border border-white/10 text-text-primary text-[10px] text-center rounded clip-notch-sm focus:outline-none focus:border-neon-cyan"
                              value={editingLimits[model.id].rpd}
                              onChange={(e) =>
                                setEditingLimits((prev) => ({
                                  ...prev,
                                  [model.id]: {
                                    ...prev[model.id],
                                    rpd:
                                      e.target.value !== ''
                                        ? Number(e.target.value)
                                        : '',
                                  },
                                }))
                              }
                            />
                          ) : (
                            <span className="text-text-secondary">
                              {model.rpd_limit ?? '—'}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleActive(model)}
                            disabled={togglingIds.has(model.id)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              model.is_active
                                ? 'bg-neon-green/30'
                                : 'bg-neon-red/30'
                            }`}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                model.is_active
                                  ? 'translate-x-4.5'
                                  : 'translate-x-0.5'
                              }`}
                              style={{
                                transform: model.is_active
                                  ? 'translateX(18px)'
                                  : 'translateX(2px)',
                              }}
                            />
                          </button>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1 justify-center">
                            {editingLimits[model.id] ? (
                              <>
                                <NeonButton
                                  accent="green"
                                  onClick={() => handleSaveLimits(model.id)}
                                  disabled={isSaving}
                                  className="text-[10px] px-2 py-1"
                                >
                                  SAVE
                                </NeonButton>
                                <NeonButton
                                  variant="ghost"
                                  accent="magenta"
                                  onClick={() =>
                                    handleCancelEditLimits(model.id)
                                  }
                                  disabled={isSaving}
                                  className="text-[10px] px-2 py-1"
                                >
                                  ✕
                                </NeonButton>
                              </>
                            ) : (
                              <NeonButton
                                variant="ghost"
                                accent="cyan"
                                onClick={() => handleEditLimits(model)}
                                className="text-[10px] px-2 py-1"
                              >
                                LIMITS
                              </NeonButton>
                            )}
                            <NeonButton
                              variant="ghost"
                              accent="red"
                              onClick={() => handleDeleteModel(model.id)}
                              disabled={isSaving}
                              className="text-[10px] px-2 py-1"
                            >
                              🗑
                            </NeonButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </HudPanel>
        </div>
      </AdminLayout>
    </>
  );
};

export default AiModelsPage;
