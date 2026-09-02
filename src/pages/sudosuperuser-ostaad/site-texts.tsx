import Head from 'next/head';
import React from 'react';
import { getSiteTexts, SiteText } from '../../utils/api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useAdminGuard } from '../../utils/adminPageGuard';
import { useToast } from '../../components/ui/Toast';
import { useFormAnimation } from '../../hooks/useFormAnimation';
import { useStagger } from '../../hooks/useStagger';
import { NeonButton, HudPanel } from '../../components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { motionTokens } from '../../components/ui/motionConfig';

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
          <h2 className="text-2xl font-bold mb-6">Site Texts Management</h2>

          <div ref={formRef} className="glass-deep rounded-xl p-6 mb-8">
            <h3 className="text-lg font-bold text-white mb-4">
              Add New Site Text
            </h3>

            <div className="grid gap-4 mb-4 md:grid-cols-2">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Key *:
                </label>
                <input
                  type="text"
                  className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500"
                  placeholder="e.g., developer_profile_label"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Category:
                </label>
                <select
                  className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none"
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
                <label className="block text-sm text-gray-400 mb-1">
                  Value *:
                </label>
                <input
                  type="text"
                  className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500"
                  placeholder="e.g., DEVELOPER PROFILE"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Description:
                </label>
                <input
                  type="text"
                  className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500"
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

          <div className="glass-deep rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">
              Existing Site Texts
            </h3>

            {siteTexts.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                No site texts found. Add your first site text above.
              </p>
            ) : (
              <div ref={listRef} className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 text-sm font-semibold text-gray-300">
                        Key
                      </th>
                      <th className="text-left py-3 text-sm font-semibold text-gray-300">
                        Category
                      </th>
                      <th className="text-left py-3 text-sm font-semibold text-gray-300">
                        Value
                      </th>
                      <th className="text-left py-3 text-sm font-semibold text-gray-300">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {siteTexts.map((text) => (
                      <tr
                        key={text.id}
                        className="stext-item border-b border-white/5 hover:bg-white/5"
                      >
                        <td className="py-3 text-sm text-white">{text.key}</td>
                        <td className="py-3 text-sm text-gray-400">
                          {text.category}
                        </td>
                        <td className="py-3 text-sm text-white">
                          {editingId === text.id ? (
                            <input
                              type="text"
                              className="form-premium-input w-full rounded p-2 text-white text-sm"
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
          </div>

          <div className="mt-8 glass-deep rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">
              Default Site Texts
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              These are the default development/programming themed texts that
              will be used if no custom texts are set:
            </p>
            <div className="grid gap-4 text-sm">
              <div>
                <span className="text-gray-500">developer_profile_label:</span>{' '}
                <span className="text-white">DEVELOPER PROFILE</span>
              </div>
              <div>
                <span className="text-gray-500">quick_commands_label:</span>{' '}
                <span className="text-white">QUICK COMMANDS</span>
              </div>
              <div>
                <span className="text-gray-500">terminal_version:</span>{' '}
                <span className="text-white">TERMINAL v3.4.2</span>
              </div>
              <div>
                <span className="text-gray-500">status_ready:</span>{' '}
                <span className="text-white">STATUS: READY</span>
              </div>
              <div>
                <span className="text-gray-500">compiling_label:</span>{' '}
                <span className="text-white">COMPILING</span>
              </div>
              <div>
                <span className="text-gray-500">linking_label:</span>{' '}
                <span className="text-white">LINKING</span>
              </div>
              <div>
                <span className="text-gray-500">executing_label:</span>{' '}
                <span className="text-white">EXECUTING</span>
              </div>
              <div>
                <span className="text-gray-500">last_command_label:</span>{' '}
                <span className="text-white">LAST COMMAND</span>
              </div>
              <div>
                <span className="text-gray-500">developer_label:</span>{' '}
                <span className="text-white">DEVELOPER</span>
              </div>
              <div>
                <span className="text-gray-500">active_label:</span>{' '}
                <span className="text-white">ACTIVE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Spring Delete Confirmation Modal */}
        <AnimatePresence>
          {confirmDelete !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: motionTokens.dur.tap, ease: motionTokens.ease }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
            >
              <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={() => setConfirmDelete(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 25,
                }}
                className="relative max-w-sm w-full"
              >
                <HudPanel accent="red" notch="md" title="// CONFIRM_DELETE" className="p-6">
                  <div className="text-center space-y-4">
                    <div className="text-4xl">⚠️</div>
                    <p className="text-text-muted text-sm font-body">
                      Delete this site text? This cannot be undone.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <NeonButton
                        variant="ghost"
                        accent="cyan"
                        onClick={() => setConfirmDelete(null)}
                        disabled={isSaving}
                      >
                        CANCEL
                      </NeonButton>
                      <NeonButton
                        accent="red"
                        onClick={() => handleDeleteSiteText(confirmDelete)}
                        loading={isSaving}
                      >
                        DELETE
                      </NeonButton>
                    </div>
                  </div>
                </HudPanel>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </AdminLayout>
    </>
  );
};

export default SiteTextsPage;
