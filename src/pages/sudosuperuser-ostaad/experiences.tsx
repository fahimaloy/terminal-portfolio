import Head from 'next/head';
import React from 'react';
import {
  getAllExperiences,
  getPortfolioProjects,
  getPortfolioSkills,
  createExperience,
  updateExperience,
  deleteExperience,
  PortfolioExperience,
  PortfolioProject,
  PortfolioSkill,
} from '../../utils/api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useAdminGuard } from '../../utils/adminPageGuard';
import { useToast } from '../../components/ui/Toast';
import { useFormAnimation } from '../../hooks/useFormAnimation';
import { useStagger } from '../../hooks/useStagger';
import {
  NeonButton,
  NeonChip,
  GlitchText,
  HudPanel,
} from '../../components/ui';
import ConfirmDeleteModal from '../../components/admin/ConfirmDeleteModal';

const ExperiencesPage = () => {
  const { authorized, loading, user } = useAdminGuard();
  const { success, error: toastError } = useToast();
  const { shake } = useFormAnimation();
  const [experiences, setExperiences] = React.useState<PortfolioExperience[]>(
    [],
  );
  const [projects, setProjects] = React.useState<PortfolioProject[]>([]);
  const [skills, setSkills] = React.useState<PortfolioSkill[]>([]);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [dragId, setDragId] = React.useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<number | null>(null);
  const formRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const [form, setForm] = React.useState({
    title: '',
    company_name: '',
    company_logo: '',
    location: '',
    from_date: '',
    to_date: '',
    is_current: false,
    description: '',
    sort_order: 0,
    is_visible: true,
    projectIds: [] as number[],
    skillIds: [] as number[],
  });

  // Stagger list items
  useStagger({
    rootRef: listRef,
    selector: '.exp-item',
    mode: 'list',
    delay: 60,
    respectReduced: true,
  });

  const loadData = React.useCallback(async () => {
    const [expData, projData, skillData] = await Promise.all([
      getAllExperiences(),
      getPortfolioProjects(),
      getPortfolioSkills(),
    ]);
    setExperiences(expData);
    setProjects(projData);
    setSkills(skillData);
  }, []);

  React.useEffect(() => {
    if (authorized) loadData();
  }, [authorized, loadData]);

  const resetForm = () => {
    setForm({
      title: '',
      company_name: '',
      company_logo: '',
      location: '',
      from_date: '',
      to_date: '',
      is_current: false,
      description: '',
      sort_order: 0,
      is_visible: true,
      projectIds: [],
      skillIds: [],
    });
    setEditingId(null);
  };

  const handleEdit = async (exp: PortfolioExperience) => {
    setEditingId(exp.id);
    const { supabase } = await import('../../utils/supabase');
    if (!supabase) return;
    const { data: links } = await supabase
      .from('experience_projects')
      .select('project_id')
      .eq('experience_id', exp.id);
    const projectIds =
      links?.map((l: { project_id: number }) => l.project_id) || [];

    setForm({
      title: exp.title,
      company_name: exp.company_name,
      company_logo: exp.company_logo || '',
      location: exp.location || '',
      from_date: exp.from_date,
      to_date: exp.to_date || '',
      is_current: exp.is_current,
      description: exp.description || '',
      sort_order: exp.sort_order,
      is_visible: exp.is_visible,
      projectIds,
      skillIds: [],
    });
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.company_name.trim() || !form.from_date) {
      shake(formRef.current);
      toastError('Title, company name, and start date are required.');
      return;
    }

    setIsSaving(true);
    const payload: Partial<PortfolioExperience> = {
      title: form.title.trim(),
      company_name: form.company_name.trim(),
      company_logo: form.company_logo.trim() || null,
      location: form.location.trim() || null,
      from_date: form.from_date,
      to_date: form.is_current ? null : form.to_date || null,
      is_current: form.is_current,
      description: form.description.trim() || null,
      sort_order: form.sort_order,
      is_visible: form.is_visible,
    };

    const ok = editingId
      ? await updateExperience(editingId, payload, form.projectIds)
      : await createExperience(payload, form.projectIds);

    if (ok) {
      success(editingId ? 'Experience updated.' : 'Experience created.');
      resetForm();
      await loadData();
    } else {
      toastError('Failed to save experience.');
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: number) => {
    setIsSaving(true);
    const ok = await deleteExperience(id);
    if (ok) {
      success('Experience deleted.');
      await loadData();
    } else {
      toastError('Failed to delete experience.');
    }
    setConfirmDelete(null);
    setIsSaving(false);
  };

  const handleDrop = async (targetId: number) => {
    if (!dragId || dragId === targetId) return;
    const srcIdx = experiences.findIndex((e) => e.id === dragId);
    const tgtIdx = experiences.findIndex((e) => e.id === targetId);
    if (srcIdx < 0 || tgtIdx < 0) return;

    const reordered = [...experiences];
    const [moved] = reordered.splice(srcIdx, 1);
    reordered.splice(tgtIdx, 0, moved);

    setExperiences(reordered);
    setIsSaving(true);
    await Promise.all(
      reordered.map((exp, idx) =>
        updateExperience(exp.id, { sort_order: idx + 1 }),
      ),
    );
    setDragId(null);
    success('Order updated.');
    await loadData();
    setIsSaving(false);
  };

  const toggleProject = (id: number) => {
    setForm((prev) => ({
      ...prev,
      projectIds: prev.projectIds.includes(id)
        ? prev.projectIds.filter((i) => i !== id)
        : [...prev.projectIds, id],
    }));
  };

  if (!authorized) return null;

  return (
    <>
      <Head>
        <title>Experiences - Admin Panel</title>
      </Head>
      <AdminLayout user={user} isLoading={loading}>
        <div className="max-w-4xl">
          <GlitchText
            accent="yellow"
            className="text-2xl font-display tracking-[2px] mb-6"
          >
            MANAGE EXPERIENCES
          </GlitchText>

          {/* Form */}
          <HudPanel accent="yellow" notch="md" className="p-6 mb-8">
            <div ref={formRef}>
              <div className="text-[10px] font-display tracking-[3px] text-neon-yellow mb-4">
                {editingId ? 'EDIT EXPERIENCE' : 'ADD EXPERIENCE'}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                    placeholder="e.g., Senior Developer"
                    value={form.title}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, title: e.target.value }))
                    }
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                    Company *
                  </label>
                  <input
                    type="text"
                    className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                    placeholder="Company name"
                    value={form.company_name}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, company_name: e.target.value }))
                    }
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                    Company Logo URL
                  </label>
                  <input
                    type="url"
                    className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                    placeholder="https://..."
                    value={form.company_logo}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, company_logo: e.target.value }))
                    }
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                    placeholder="City, Country"
                    value={form.location}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, location: e.target.value }))
                    }
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                    From Date *
                  </label>
                  <input
                    type="date"
                    className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                    value={form.from_date}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, from_date: e.target.value }))
                    }
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                    value={form.to_date}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, to_date: e.target.value }))
                    }
                    disabled={isSaving || form.is_current}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 font-body text-sm cursor-pointer text-text-secondary">
                    <input
                      type="checkbox"
                      checked={form.is_current}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, is_current: e.target.checked }))
                      }
                      disabled={isSaving}
                    />
                    Currently working here
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                    Description
                  </label>
                  <textarea
                    className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200 resize-none"
                    rows={3}
                    placeholder="Brief description of your role..."
                    value={form.description}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, description: e.target.value }))
                    }
                    disabled={isSaving}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-2">
                    Linked Projects
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {projects.map((proj) => (
                      <button
                        key={proj.id}
                        onClick={() => toggleProject(proj.id)}
                        className={`px-3 py-1 clip-notch-sm font-body text-xs border transition-all duration-200 ${
                          form.projectIds.includes(proj.id)
                            ? 'bg-neon-magenta/20 border-neon-magenta/50 text-neon-magenta'
                            : 'bg-white/[0.03] border-white/10 text-text-muted hover:border-neon-cyan/30 hover:text-text-primary'
                        }`}
                      >
                        {proj.short_title || proj.title}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <NeonButton
                  accent="cyan"
                  onClick={handleSubmit}
                  disabled={isSaving}
                  loading={isSaving}
                >
                  {editingId ? 'UPDATE' : 'ADD'}
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

          {/* List */}
          {experiences.length > 0 ? (
            <HudPanel accent="yellow" notch="md" className="p-6">
              <div className="text-[10px] font-display tracking-[3px] text-neon-yellow mb-4">
                EXPERIENCES ({experiences.length})
              </div>
              <p className="font-body text-sm text-text-muted mb-4">
                Drag to reorder
              </p>
              <div ref={listRef} className="space-y-2">
                {experiences.map((exp) => (
                  <div
                    key={exp.id}
                    draggable
                    onDragStart={() => setDragId(exp.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(exp.id)}
                    className="exp-item p-3 bg-white/[0.03] border border-white/10 clip-notch-sm flex justify-between items-center cursor-move hover:border-neon-cyan/30 hover:bg-neon-cyan/5 transition-all duration-200"
                  >
                    <div className="flex-1">
                      <div className="font-display tracking-[2px] text-text-primary text-sm">
                        {exp.title}
                      </div>
                      <div className="text-xs text-text-muted font-body">
                        {exp.company_name} · {exp.from_date} –{' '}
                        {exp.is_current ? 'Present' : exp.to_date || ''}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <NeonButton
                        variant="outline"
                        accent="cyan"
                        onClick={() => handleEdit(exp)}
                        disabled={isSaving}
                      >
                        EDIT
                      </NeonButton>
                      <NeonButton
                        variant="ghost"
                        accent="red"
                        onClick={() => setConfirmDelete(exp.id)}
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
            <HudPanel accent="yellow" notch="md" className="p-6 text-center">
              <span className="font-body text-sm text-text-muted">
                No experiences yet.
              </span>
            </HudPanel>
          )}
        </div>

        <ConfirmDeleteModal
          open={confirmDelete !== null}
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => {
            if (confirmDelete !== null) handleDelete(confirmDelete);
          }}
          message="Delete this experience? This cannot be undone."
          isSaving={isSaving}
        />
      </AdminLayout>
    </>
  );
};

export default ExperiencesPage;
