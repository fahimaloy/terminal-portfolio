import Head from 'next/head';
import React from 'react';
import { getSiteTexts, SiteText } from '../../utils/api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useAdminGuard } from '../../utils/adminPageGuard';
import { useToast } from '../../components/ui/Toast';
import { useFormAnimation } from '../../hooks/useFormAnimation';
import { useStagger } from '../../hooks/useStagger';
import { NeonButton, GlitchText, HudPanel } from '../../components/ui';
import ConfirmDeleteModal from '../../components/admin/ConfirmDeleteModal';

const SiteTextsPage = () => {
  const { authorized, loading, user } = useAdminGuard();
  const { success, error: toastError } = useToast();
  const { shake } = useFormAnimation();
  const [siteTexts, setSiteTexts] = React.useState<SiteText[]>([]);
  const [newKey, setNewKey] = React.useState('');
  const [newValue, setNewValue] = React.useState('');
  const [newCategory, setNewCategory] = React.useState('ui');
  const [newDescription, setNewDescription] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [editValue, setEditValue] = React.useState('');
  const [confirmDelete, setConfirmDelete] = React.useState<number | null>(null);
  const formRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Stagger list items
  useStagger({
    rootRef: listRef,
    selector: '.stext-item',
    mode: 'list',
    delay: 60,
    respectReduced: true,
  });

  const loadData = React.useCallback(async () => {
    const texts = await getSiteTexts();
    const textsArray: SiteText[] = Object.entries(texts).map(
      ([key, value], index) => ({
        id: index + 1,
        key,
        value,
        category: 'ui',
        description: `Text for ${key}`,
        is_active: true,
        sort_order: index + 1,
      }),
    );
    setSiteTexts(textsArray);
  }, []);

  React.useEffect(() => {
    if (authorized) {
      loadData();
    }
  }, [authorized, loadData]);

  const handleAddSiteText = async () => {
    if (!newKey.trim() || !newValue.trim()) {
      shake(formRef.current);
      toastError('Key and Value are required.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/site-texts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: newKey.trim(),
          value: newValue.trim(),
          category: newCategory || 'ui',
          description: newDescription,
          is_active: true,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result?.ok) {
        toastError(result?.message || 'Failed to add site text.');
        setIsSaving(false);
        return;
      }

      success('Site text added successfully.');
      setNewKey('');
      setNewValue('');
      setNewCategory('ui');
      setNewDescription('');
      await loadData();
    } catch (error) {
      toastError('Failed to add site text.');
    }
    setIsSaving(false);
  };

  const handleUpdateSiteText = async (id: number) => {
    if (!editValue.trim()) {
      toastError('Value is required.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/site-texts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          value: editValue.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result?.ok) {
        toastError(result?.message || 'Failed to update site text.');
        setIsSaving(false);
        return;
      }

      success('Site text updated successfully.');
      setEditingId(null);
      setEditValue('');
      await loadData();
    } catch (error) {
      toastError('Failed to update site text.');
    }
    setIsSaving(false);
  };

  const handleDeleteSiteText = async (id: number) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/site-texts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      const result = await response.json();

      if (!response.ok || !result?.ok) {
        toastError(result?.message || 'Failed to delete site text.');
        setIsSaving(false);
        return;
      }

      success('Site text deleted successfully.');
      await loadData();
    } catch (error) {
      toastError('Failed to delete site text.');
    }
    setConfirmDelete(null);
    setIsSaving(false);
  };

  const startEditing = (text: SiteText) => {
    setEditingId(text.id);
    setEditValue(text.value);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue('');
  };

  const categories = ['ui', 'loading', 'homepage', 'footer', 'headers'];

  if (!authorized) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Site Texts - Admin Panel</title>
      </Head>

      <AdminLayout user={user} isLoading={loading}>
        <div className="max-w-4xl">
          <GlitchText
            accent="magenta"
            className="text-2xl font-display tracking-[2px] mb-6"
          >
            SITE TEXTS MANAGEMENT
          </GlitchText>

          <HudPanel accent="magenta" notch="md" className="p-6 mb-8">
            <div ref={formRef}>
              <div className="text-[10px] font-display tracking-[3px] text-neon-magenta mb-4">
                ADD NEW SITE TEXT
              </div>

              <div className="grid gap-4 mb-4 md:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                    Key *:
                  </label>
                  <input
                    type="text"
                    className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                    placeholder="e.g., developer_profile_label"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                    Category:
                  </label>
                  <select
                    className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] clip-notch-sm transition-all duration-200 [color-scheme:dark]"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    disabled={isSaving}
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                    Value *:
                  </label>
                  <input
                    type="text"
                    className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                    placeholder="e.g., DEVELOPER PROFILE"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                    Description:
                  </label>
                  <input
                    type="text"
                    className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                    placeholder="Description of this text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              </div>

              <NeonButton
                accent="cyan"
                onClick={handleAddSiteText}
                disabled={isSaving || !newKey.trim() || !newValue.trim()}
                loading={isSaving}
              >
                ADD SITE TEXT
              </NeonButton>
            </div>
          </HudPanel>

          <HudPanel accent="magenta" notch="md" className="p-6">
            <div className="text-[10px] font-display tracking-[3px] text-neon-magenta mb-4">
              EXISTING SITE TEXTS
            </div>

            {siteTexts.length === 0 ? (
              <p className="font-body text-sm text-text-muted text-center py-8">
                No site texts found. Add your first site text above.
              </p>
            ) : (
              <div ref={listRef} className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 font-display text-[10px] tracking-[2px] text-text-muted">
                        Key
                      </th>
                      <th className="text-left py-3 font-display text-[10px] tracking-[2px] text-text-muted">
                        Category
                      </th>
                      <th className="text-left py-3 font-display text-[10px] tracking-[2px] text-text-muted">
                        Value
                      </th>
                      <th className="text-left py-3 font-display text-[10px] tracking-[2px] text-text-muted">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {siteTexts.map((text) => (
                      <tr
                        key={text.id}
                        className="stext-item border-b border-white/5 hover:bg-white/[0.03]"
                      >
                        <td className="py-3 font-mono text-xs text-neon-cyan">
                          {text.key}
                        </td>
                        <td className="py-3 font-body text-sm text-text-muted">
                          {text.category}
                        </td>
                        <td className="py-3 font-body text-sm text-text-primary">
                          {editingId === text.id ? (
                            <input
                              type="text"
                              className="w-full bg-bg-smoke border border-white/10 text-text-primary px-2 py-1.5 font-body text-sm focus:outline-none focus:border-neon-cyan clip-notch-sm"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter')
                                  handleUpdateSiteText(text.id);
                              }}
                            />
                          ) : (
                            text.value
                          )}
                        </td>
                        <td className="py-3 text-sm">
                          {editingId === text.id ? (
                            <div className="flex gap-2">
                              <NeonButton
                                variant="outline"
                                accent="cyan"
                                onClick={() => handleUpdateSiteText(text.id)}
                                disabled={isSaving}
                              >
                                SAVE
                              </NeonButton>
                              <NeonButton
                                variant="ghost"
                                accent="cyan"
                                onClick={cancelEditing}
                                disabled={isSaving}
                              >
                                CANCEL
                              </NeonButton>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <NeonButton
                                variant="outline"
                                accent="yellow"
                                onClick={() => startEditing(text)}
                                disabled={isSaving}
                              >
                                EDIT
                              </NeonButton>
                              <NeonButton
                                variant="ghost"
                                accent="red"
                                onClick={() => setConfirmDelete(text.id)}
                                disabled={isSaving}
                              >
                                DELETE
                              </NeonButton>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </HudPanel>

          <HudPanel accent="magenta" notch="md" className="mt-8 p-6">
            <div className="text-[10px] font-display tracking-[3px] text-neon-magenta mb-4">
              DEFAULT SITE TEXTS
            </div>
            <p className="font-body text-text-muted text-sm mb-4">
              These are the default development/programming themed texts that
              will be used if no custom texts are set:
            </p>
            <div className="grid gap-4 font-body text-sm">
              <div>
                <span className="font-mono text-xs text-text-muted">
                  developer_profile_label:
                </span>{' '}
                <span className="font-display tracking-[2px] text-text-primary">
                  DEVELOPER PROFILE
                </span>
              </div>
              <div>
                <span className="font-mono text-xs text-text-muted">
                  quick_commands_label:
                </span>{' '}
                <span className="font-display tracking-[2px] text-text-primary">
                  QUICK COMMANDS
                </span>
              </div>
              <div>
                <span className="font-mono text-xs text-text-muted">
                  terminal_version:
                </span>{' '}
                <span className="font-display tracking-[2px] text-text-primary">
                  TERMINAL v3.4.2
                </span>
              </div>
              <div>
                <span className="font-mono text-xs text-text-muted">
                  status_ready:
                </span>{' '}
                <span className="font-display tracking-[2px] text-text-primary">
                  STATUS: READY
                </span>
              </div>
              <div>
                <span className="font-mono text-xs text-text-muted">
                  compiling_label:
                </span>{' '}
                <span className="font-display tracking-[2px] text-text-primary">
                  COMPILING
                </span>
              </div>
              <div>
                <span className="font-mono text-xs text-text-muted">
                  linking_label:
                </span>{' '}
                <span className="font-display tracking-[2px] text-text-primary">
                  LINKING
                </span>
              </div>
              <div>
                <span className="font-mono text-xs text-text-muted">
                  executing_label:
                </span>{' '}
                <span className="font-display tracking-[2px] text-text-primary">
                  EXECUTING
                </span>
              </div>
              <div>
                <span className="font-mono text-xs text-text-muted">
                  last_command_label:
                </span>{' '}
                <span className="font-display tracking-[2px] text-text-primary">
                  LAST COMMAND
                </span>
              </div>
              <div>
                <span className="font-mono text-xs text-text-muted">
                  developer_label:
                </span>{' '}
                <span className="font-display tracking-[2px] text-text-primary">
                  DEVELOPER
                </span>
              </div>
              <div>
                <span className="font-mono text-xs text-text-muted">
                  active_label:
                </span>{' '}
                <span className="font-display tracking-[2px] text-text-primary">
                  ACTIVE
                </span>
              </div>
            </div>
          </HudPanel>
        </div>

        <ConfirmDeleteModal
          open={confirmDelete !== null}
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => {
            if (confirmDelete !== null) handleDeleteSiteText(confirmDelete);
          }}
          message="Delete this site text? This cannot be undone."
          isSaving={isSaving}
        />
      </AdminLayout>
    </>
  );
};

export default SiteTextsPage;
