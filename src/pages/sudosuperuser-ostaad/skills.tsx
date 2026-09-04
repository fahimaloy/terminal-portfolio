import Head from 'next/head';
import React, { useEffect, useRef } from 'react';
import { animate, createScope } from 'animejs';
import {
  getPortfolioSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  PortfolioSkill,
} from '../../utils/api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useAdminGuard } from '../../utils/adminPageGuard';
import { useToast } from '../../components/ui/Toast';
import { useFormAnimation } from '../../hooks/useFormAnimation';
import { useStagger } from '../../hooks/useStagger';
import { NeonButton, HudPanel } from '../../components/ui';
import IconPicker from '../../components/ui/IconPicker';

const SkillsPage = () => {
  const { authorized, loading, user } = useAdminGuard();
  const { success, error: toastError } = useToast();
  const { shake } = useFormAnimation();
  const [skills, setSkills] = React.useState<PortfolioSkill[]>([]);
  const [newSkill, setNewSkill] = React.useState('');
  const [newSkillIcon, setNewSkillIcon] = React.useState('');
  const [newSkillDuration, setNewSkillDuration] = React.useState('');
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [dragSkillId, setDragSkillId] = React.useState<number | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState<number | null>(null);
  const formRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const confirmDeleteBackdropRef = React.useRef<HTMLDivElement>(null);
  const confirmDeletePanelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (confirmDelete === null) return;
    if (!confirmDeleteBackdropRef.current || !confirmDeletePanelRef.current) return;
    const scope = createScope({ root: confirmDeletePanelRef.current.parentElement! });
    scope.add(() => {
      animate(confirmDeleteBackdropRef.current!, { opacity: [0, 1], duration: 200, ease: 'outExpo' });
      animate(confirmDeletePanelRef.current!, { opacity: [0, 1], scale: [0.9, 1], duration: 300, ease: 'outExpo' });
    });
    return () => scope.revert();
  }, [confirmDelete]);

  // Stagger list items
  useStagger({
    rootRef: listRef,
    selector: '.skill-item',
    mode: 'list',
    delay: 60,
    respectReduced: true,
  });

  const loadData = React.useCallback(async () => {
    const skillsData = await getPortfolioSkills();
    setSkills(skillsData);
  }, []);

  React.useEffect(() => {
    if (authorized) {
      loadData();
    }
  }, [authorized, loadData]);

  const resetForm = () => {
    setNewSkill('');
    setNewSkillIcon('');
    setNewSkillDuration('');
    setEditingId(null);
  };

  const handleEdit = (skill: PortfolioSkill) => {
    setEditingId(skill.id);
    setNewSkill(skill.name);
    setNewSkillIcon(skill.icon_key || '');
    setNewSkillDuration(skill.duration || '');
  };

  const handleSubmit = async () => {
    if (!newSkill.trim()) {
      shake(formRef.current);
      toastError('Skill name is required.');
      return;
    }

    setIsSaving(true);
    const payload = {
      name: newSkill.trim(),
      icon_key: newSkillIcon.trim() || null,
      duration: newSkillDuration.trim() || null,
      sort_order: editingId
        ? skills.find((s) => s.id === editingId)?.sort_order || 0
        : skills.length + 1,
      is_visible: true,
    };

    const ok = editingId
      ? await updateSkill(editingId, payload)
      : await createSkill(payload);

    if (ok) {
      success(editingId ? 'Skill updated.' : 'Skill created.');
      resetForm();
      await loadData();
    } else {
      toastError('Failed to save skill.');
    }
    setIsSaving(false);
  };

  const handleDeleteSkill = async (id: number) => {
    setIsSaving(true);
    const ok = await deleteSkill(id);
    if (ok) {
      success('Skill deleted.');
      await loadData();
    } else {
      toastError('Failed to delete skill.');
    }
    setConfirmDelete(null);
    setIsSaving(false);
  };

  const handleSkillDrop = async (targetSkillId: number) => {
    if (!dragSkillId || dragSkillId === targetSkillId) {
      return;
    }

    const sourceIndex = skills.findIndex((item) => item.id === dragSkillId);
    const targetIndex = skills.findIndex((item) => item.id === targetSkillId);

    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const reordered = [...skills];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    setSkills(reordered);
    setIsSaving(true);

    await Promise.all(
      reordered.map((item, index) =>
        updateSkill(item.id, {
          sort_order: index + 1,
        }),
      ),
    );

    setDragSkillId(null);
    success('Skill order updated.');
    await loadData();
    setIsSaving(false);
  };

  if (!authorized) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Skills - Admin Panel</title>
      </Head>

      <AdminLayout user={user} isLoading={loading}>
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-white mb-6">Manage Skills</h2>

          <div ref={formRef} className="glass-deep rounded-xl p-6 mb-8">
            <h3 className="text-lg font-bold text-white mb-4">
              {editingId ? 'Edit' : 'Add New'} Skill
            </h3>

            <div className="grid gap-4 mb-4 md:grid-cols-2">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Skill Name *
                </label>
                <input
                  type="text"
                  className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500"
                  placeholder="e.g., React, Python, TypeScript"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Duration
                </label>
                <input
                  type="text"
                  className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500"
                  placeholder="e.g., 5 years, 2+ years"
                  value={newSkillDuration}
                  onChange={(e) => setNewSkillDuration(e.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Icon</label>
              <IconPicker
                value={newSkillIcon}
                onChange={(iconName) => setNewSkillIcon(iconName ?? '')}
                disabled={isSaving}
              />
            </div>

            <div className="flex gap-2">
              <NeonButton
                accent="cyan"
                onClick={handleSubmit}
                disabled={isSaving}
                loading={isSaving}
              >
                {editingId ? 'UPDATE' : 'ADD SKILL'}
              </NeonButton>
              {editingId && (
                <NeonButton
                  variant="ghost"
                  accent="cyan"
                  onClick={resetForm}
                  disabled={isSaving}
                >
                  CANCEL
                </NeonButton>
              )}
            </div>
          </div>

          {skills.length > 0 ? (
            <div className="glass-deep rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">
                Skills ({skills.length})
              </h3>

              <p className="text-sm text-gray-400 mb-4">
                Drag to reorder skills
              </p>

              <div ref={listRef} className="space-y-2">
                {skills.map((skill) => (
                  <div
                    key={skill.id}
                    draggable
                    onDragStart={() => setDragSkillId(skill.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleSkillDrop(skill.id)}
                    className="skill-item p-3 bg-white/5 border border-gray-800 rounded-xl flex justify-between items-center cursor-move hover:bg-gray-800 transition-all"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {skill.icon_key && (
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-purple-400 text-sm">
                          {skill.icon_key.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-white">{skill.name}</div>
                        <div className="text-xs text-gray-400">
                          {skill.duration && `${skill.duration} · `}
                          Order: {skill.sort_order}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <NeonButton
                        variant="outline"
                        accent="cyan"
                        onClick={() => handleEdit(skill)}
                        disabled={isSaving}
                      >
                        EDIT
                      </NeonButton>
                      <NeonButton
                        variant="ghost"
                        accent="red"
                        onClick={() => setConfirmDelete(skill.id)}
                        disabled={isSaving}
                      >
                        DELETE
                      </NeonButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 p-6 glass-deep rounded-xl">
              No skills yet. Add one to get started.
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {confirmDelete !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div
              ref={confirmDeleteBackdropRef}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm opacity-0"
              onClick={() => setConfirmDelete(null)}
            />
            <div ref={confirmDeletePanelRef} className="relative max-w-sm w-full opacity-0">
              <HudPanel accent="red" notch="md" title="// CONFIRM_DELETE" className="p-6">
                <div className="text-center space-y-4">
                  <div className="text-4xl">⚠️</div>
                  <p className="text-text-muted text-sm font-body">
                    Delete this skill? This cannot be undone.
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
                      onClick={() => handleDeleteSkill(confirmDelete)}
                      loading={isSaving}
                    >
                      DELETE
                    </NeonButton>
                  </div>
                </div>
              </HudPanel>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
};

export default SkillsPage;
