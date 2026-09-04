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
import { NeonButton, NeonChip, HudPanel } from '../../components/ui';

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
    const projectIds = links?.map((l: any) => l.project_id) || [];

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
          <h2 className="text-2xl font-bold text-white mb-6">
            Manage Experiences
          </h2>

          {/* Form */}
          <div ref={formRef} className="glass-deep rounded-xl p-6 mb-8">
            <h3 className="text-lg font-bold text-white mb-4">
              {editingId ? 'Edit' : 'Add'} Experience
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  className="form-premium-input w-full rounded-xl p-3 text-white text-sm"
                  placeholder="e.g., Senior Developer"
                  value={form.title}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, title: e.target.value }))
                  }
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Company *
                </label>
                <input
                  type="text"
                  className="form-premium-input w-full rounded-xl p-3 text-white text-sm"
                  placeholder="Company name"
                  value={form.company_name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, company_name: e.target.value }))
                  }
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Company Logo URL
                </label>
                <input
                  type="url"
                  className="form-premium-input w-full rounded-xl p-3 text-white text-sm"
                  placeholder="https://..."
                  value={form.company_logo}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, company_logo: e.target.value }))
                  }
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  className="form-premium-input w-full rounded-xl p-3 text-white text-sm"
                  placeholder="City, Country"
                  value={form.location}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, location: e.target.value }))
                  }
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  From Date *
                </label>
                <input
                  type="date"
                  className="form-premium-input w-full rounded-xl p-3 text-white text-sm"
                  value={form.from_date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, from_date: e.target.value }))
                  }
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  className="form-premium-input w-full rounded-xl p-3 text-white text-sm"
                  value={form.to_date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, to_date: e.target.value }))
                  }
                  disabled={isSaving || form.is_current}
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-300">
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
                <label className="block text-sm text-gray-400 mb-1">
                  Description
                </label>
                <textarea
                  className="form-premium-input w-full rounded-xl p-3 text-white text-sm resize-none"
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
                <label className="block text-sm text-gray-400 mb-2">
                  Linked Projects
                </label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {projects.map((proj) => (
                    <button
                      key={proj.id}
                      onClick={() => toggleProject(proj.id)}
                      className={`px-3 py-1 rounded-lg text-xs border transition-all ${
                        form.projectIds.includes(proj.id)
                          ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                          : 'bg-white/5 border-gray-700 text-gray-400 hover:bg-white/10'
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

          {/* List */}
          {experiences.length > 0 ? (
            <div className="glass-deep rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">
                Experiences ({experiences.length})
              </h3>
              <p className="text-sm text-gray-400 mb-4">Drag to reorder</p>
              <div ref={listRef} className="space-y-2">
                {experiences.map((exp) => (
                  <div
                    key={exp.id}
                    draggable
                    onDragStart={() => setDragId(exp.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(exp.id)}
                    className="exp-item p-3 bg-white/5 border border-gray-800 rounded-xl flex justify-between items-center cursor-move hover:bg-gray-800 transition-all"
                  >
                    <div className="flex-1">
                      <div className="font-bold text-white">{exp.title}</div>
                      <div className="text-xs text-gray-400">
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
            </div>
          ) : (
            <div className="text-center text-gray-400 p-6 glass-deep rounded-xl">
              No experiences yet.
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {confirmDelete !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
            <div className="relative max-w-sm w-full">
              <HudPanel accent="red" notch="md" title="// CONFIRM_DELETE" className="p-6">
                <div className="text-center space-y-4">
                  <div className="text-4xl">⚠️</div>
                  <p className="text-text-muted text-sm font-body">
                    Delete this experience? This cannot be undone.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <NeonButton variant="ghost" accent="cyan" onClick={() => setConfirmDelete(null)} disabled={isSaving}>CANCEL</NeonButton>
                    <NeonButton accent="red" onClick={() => handleDelete(confirmDelete)} loading={isSaving}>DELETE</NeonButton>
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

export default ExperiencesPage;
