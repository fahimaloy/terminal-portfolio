import Head from 'next/head';
import React from 'react';
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
import { NeonButton, GlitchText, HudPanel } from '../../components/ui';
import IconPicker from '../../components/ui/IconPicker';
import ConfirmDeleteModal from '../../components/admin/ConfirmDeleteModal';

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
          <GlitchText
            accent="green"
            className="text-2xl font-display tracking-[2px] mb-6"
          >
            MANAGE SKILLS
          </GlitchText>

          <HudPanel accent="green" notch="md" className="p-6 mb-8">
            <div ref={formRef}>
              <div className="text-[10px] font-display tracking-[3px] text-neon-green mb-4">
                {editingId ? 'EDIT SKILL' : 'ADD NEW SKILL'}
              </div>

              <div className="grid gap-4 mb-4 md:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                    Skill Name *
                  </label>
                  <input
                    type="text"
                    className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                    placeholder="e.g., React, Python, TypeScript"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                    Duration
                  </label>
                  <input
                    type="text"
                    className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                    placeholder="e.g., 5 years, 2+ years"
                    value={newSkillDuration}
                    onChange={(e) => setNewSkillDuration(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-2">
                  Icon
                </label>
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
          </HudPanel>

          {skills.length > 0 ? (
            <HudPanel accent="green" notch="md" className="p-6">
              <div className="text-[10px] font-display tracking-[3px] text-neon-green mb-4">
                SKILLS ({skills.length})
              </div>

              <p className="font-body text-sm text-text-muted mb-4">
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
                    className="skill-item p-3 bg-white/[0.03] border border-white/10 clip-notch-sm flex justify-between items-center cursor-move hover:border-neon-cyan/30 hover:bg-neon-cyan/5 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {skill.icon_key && (
                        <div className="w-8 h-8 clip-notch-sm bg-neon-green/10 border border-neon-green/20 flex items-center justify-center text-neon-green font-display text-[10px]">
                          {skill.icon_key.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-display tracking-[2px] text-text-primary text-sm">
                          {skill.name}
                        </div>
                        <div className="text-xs text-text-muted font-body">
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
            </HudPanel>
          ) : (
            <HudPanel accent="green" notch="md" className="p-6 text-center">
              <span className="font-body text-sm text-text-muted">
                No skills yet. Add one to get started.
              </span>
            </HudPanel>
          )}
        </div>

        <ConfirmDeleteModal
          open={confirmDelete !== null}
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => {
            if (confirmDelete !== null) handleDeleteSkill(confirmDelete);
          }}
          message="Delete this skill? This cannot be undone."
          isSaving={isSaving}
        />
      </AdminLayout>
    </>
  );
};

export default SkillsPage;
