import Head from 'next/head';
import React from 'react';
import {
  getPortfolioProjects,
  getPortfolioSkills,
  createProject,
  updateProject,
  deleteProject,
  PortfolioProject,
  PortfolioSkill,
} from '../../utils/api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useAdminGuard } from '../../utils/adminPageGuard';

const defaultProject: Partial<PortfolioProject> = {
  title: '',
  short_title: '',
  description: '',
  thumbnail_url: '',
  image_url: '',
  project_url: '',
  repo_url: '',
  languages: [],
  tags: [],
  featured: false,
  featured_order: 0,
  sort_order: 0,
  is_visible: true,
  icon_key: '',
};

const ProjectsPage = () => {
  const { authorized, loading, user } = useAdminGuard();
  const [projects, setProjects] = React.useState<PortfolioProject[]>([]);
  const [skills, setSkills] = React.useState<PortfolioSkill[]>([]);
  const [projectDraft, setProjectDraft] =
    React.useState<Partial<PortfolioProject>>(defaultProject);
  const [editingProjectId, setEditingProjectId] = React.useState<number | null>(
    null,
  );
  const [selectedSkillIds, setSelectedSkillIds] = React.useState<number[]>([]);
  const [statusMessage, setStatusMessage] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  const loadData = React.useCallback(async () => {
    const [projectsData, skillsData] = await Promise.all([
      getPortfolioProjects(),
      getPortfolioSkills(),
    ]);
    setProjects(projectsData);
    setSkills(skillsData);
  }, []);

  React.useEffect(() => {
    if (authorized) {
      loadData();
    }
  }, [authorized, loadData]);

  const updateStatus = (message: string) => {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(''), 2500);
  };

  const handleProjectSubmit = async () => {
    if (!projectDraft.title?.trim()) {
      updateStatus('Project title is required.');
      return;
    }

    const selectedSkillNames = skills
      .filter((skill) => selectedSkillIds.includes(skill.id))
      .map((skill) => skill.name);
    const manualTags = (projectDraft.tags || []).filter(
      (tag) => !skills.some((skill) => skill.name === tag),
    );

    setIsSaving(true);
    const payload: Partial<PortfolioProject> = {
      ...projectDraft,
      title: projectDraft.title.trim(),
      tags: Array.from(new Set([...manualTags, ...selectedSkillNames])),
      sort_order: Number(projectDraft.sort_order || 0),
      featured_order: Number(projectDraft.featured_order || 0),
      is_visible: projectDraft.is_visible ?? true,
    };

    const ok = editingProjectId
      ? await updateProject(editingProjectId, payload)
      : await createProject(payload);

    updateStatus(ok ? 'Project saved.' : 'Failed to save project.');

    if (ok) {
      setProjectDraft(defaultProject);
      setEditingProjectId(null);
      setSelectedSkillIds([]);
      await loadData();
    }
    setIsSaving(false);
  };

  const handleEditProject = (project: PortfolioProject) => {
    setEditingProjectId(project.id);
    setProjectDraft(project);
    const projectTags = project.tags || [];
    const selected = skills
      .filter((skill) => projectTags.includes(skill.name))
      .map((skill) => skill.id);
    setSelectedSkillIds(selected);
  };

  const handleDeleteProject = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this project?')) {
      return;
    }

    setIsSaving(true);
    const ok = await deleteProject(id);
    updateStatus(ok ? 'Project deleted.' : 'Failed to delete project.');
    if (ok) {
      await loadData();
    }
    setIsSaving(false);
  };

  const handleCancel = () => {
    setProjectDraft(defaultProject);
    setEditingProjectId(null);
    setSelectedSkillIds([]);
  };

  const setProjectLanguages = (value: string) => {
    const languages = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    setProjectDraft((prev) => ({
      ...prev,
      languages,
    }));
  };

  const setProjectTags = (value: string) => {
    const tags = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    setProjectDraft((prev) => ({
      ...prev,
      tags,
    }));
  };

  const toggleSkillSelection = (skillId: number) => {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId)
        ? prev.filter((id) => id !== skillId)
        : [...prev, skillId],
    );
  };

  if (!authorized) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Projects - Admin Panel</title>
      </Head>

      <AdminLayout user={user} isLoading={loading}>
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Manage Projects</h2>

          {statusMessage && (
            <div className="mb-4 p-3 bg-lime-500/10 border border-lime-500/30 text-lime-400 text-sm rounded-xl">
              {statusMessage}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              {projects.length > 0 ? (
                <div className="glass-deep rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">
                    Projects ({projects.length})
                  </h3>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {projects.map((project) => (
                      <div
                        key={project.id}
                        className="p-3 bg-white/5 border border-gray-800 rounded-xl flex flex-col gap-2 transition-all hover:bg-gray-800/50"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-bold text-white">{project.title}</div>
                            {project.short_title && (
                              <div className="text-xs text-gray-400">
                                {project.short_title}
                              </div>
                            )}
                          </div>
                          {project.featured && (
                            <span className="text-xs bg-purple-500/15 text-purple-300 border border-purple-500/30 px-2 py-1 rounded-lg">
                              Featured
                            </span>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditProject(project)}
                            disabled={isSaving}
                            className="flex-1 px-2 py-1.5 bg-white/5 border border-gray-700/50 text-gray-400 rounded-xl hover:text-white hover:bg-white/10 backdrop-blur-sm text-sm transition-all disabled:opacity-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteProject(project.id)}
                            disabled={isSaving}
                            className="flex-1 px-2 py-1.5 bg-white/5 border border-gray-700/50 text-gray-400 rounded-xl hover:text-white hover:bg-white/10 backdrop-blur-sm text-sm transition-all disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400 p-6 glass-deep rounded-xl">
                  No projects yet.
                </div>
              )}
            </div>

            <div className="glass-deep rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">
                {editingProjectId ? 'Edit' : 'Add'} Project
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Title:</label>
                  <input
                    type="text"
                    className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500"
                    placeholder="Project title"
                    value={projectDraft.title || ''}
                    onChange={(e) =>
                      setProjectDraft((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Short Title:</label>
                  <input
                    type="text"
                    className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500"
                    placeholder="Short title"
                    value={projectDraft.short_title || ''}
                    onChange={(e) =>
                      setProjectDraft((prev) => ({
                        ...prev,
                        short_title: e.target.value,
                      }))
                    }
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description:</label>
                  <textarea
                    className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500 resize-none"
                    rows={2}
                    placeholder="Project description"
                    value={projectDraft.description || ''}
                    onChange={(e) =>
                      setProjectDraft((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Thumbnail URL:</label>
                  <input
                    type="url"
                    className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500"
                    placeholder="Thumbnail URL"
                    value={projectDraft.thumbnail_url || ''}
                    onChange={(e) =>
                      setProjectDraft((prev) => ({
                        ...prev,
                        thumbnail_url: e.target.value,
                      }))
                    }
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Main Image URL:</label>
                  <input
                    type="url"
                    className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500"
                    placeholder="Main image URL"
                    value={projectDraft.image_url || ''}
                    onChange={(e) =>
                      setProjectDraft((prev) => ({
                        ...prev,
                        image_url: e.target.value,
                      }))
                    }
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Live URL:</label>
                  <input
                    type="url"
                    className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500"
                    placeholder="Live project URL"
                    value={projectDraft.project_url || ''}
                    onChange={(e) =>
                      setProjectDraft((prev) => ({
                        ...prev,
                        project_url: e.target.value,
                      }))
                    }
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Repo URL:</label>
                  <input
                    type="url"
                    className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500"
                    placeholder="Repository URL"
                    value={projectDraft.repo_url || ''}
                    onChange={(e) =>
                      setProjectDraft((prev) => ({
                        ...prev,
                        repo_url: e.target.value,
                      }))
                    }
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Languages (comma separated):
                  </label>
                  <input
                    type="text"
                    className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500"
                    placeholder="e.g., JavaScript, Python, Go"
                    value={(projectDraft.languages || []).join(', ')}
                    onChange={(e) => setProjectLanguages(e.target.value)}
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Tags (comma separated):
                  </label>
                  <input
                    type="text"
                    className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500"
                    placeholder="e.g., web, mobile, api (skills are auto-added)"
                    value={(projectDraft.tags || []).join(', ')}
                    onChange={(e) => setProjectTags(e.target.value)}
                    disabled={isSaving}
                  />
                </div>

                <div className="border-t border-gray-800 pt-3">
                  <label className="block text-sm mb-2 font-bold text-gray-400">
                    Skills Used:
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {skills.length > 0 ? (
                      skills.map((skill) => (
                        <label
                          key={skill.id}
                          className="flex items-center gap-2 text-sm cursor-pointer text-gray-300"
                        >
                          <input
                            type="checkbox"
                            checked={selectedSkillIds.includes(skill.id)}
                            onChange={() => toggleSkillSelection(skill.id)}
                            disabled={isSaving}
                            className="cursor-pointer"
                          />
                          {skill.name}
                        </label>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400">
                        No skills available
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Featured Order:
                    </label>
                    <input
                      type="number"
                      className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500"
                      value={projectDraft.featured_order || 0}
                      onChange={(e) =>
                        setProjectDraft((prev) => ({
                          ...prev,
                          featured_order: Number(e.target.value),
                        }))
                      }
                      disabled={isSaving}
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Sort Order:</label>
                    <input
                      type="number"
                      className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500"
                      value={projectDraft.sort_order || 0}
                      onChange={(e) =>
                        setProjectDraft((prev) => ({
                          ...prev,
                          sort_order: Number(e.target.value),
                        }))
                      }
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-300">
                  <input
                    type="checkbox"
                    checked={Boolean(projectDraft.featured)}
                    onChange={(e) =>
                      setProjectDraft((prev) => ({
                        ...prev,
                        featured: e.target.checked,
                      }))
                    }
                    disabled={isSaving}
                    className="cursor-pointer"
                  />
                  Featured Project
                </label>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleProjectSubmit}
                    disabled={isSaving}
                    className="flex-1 px-3 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white rounded-xl font-medium transition-all shadow-lg disabled:opacity-50 text-sm"
                  >
                    {isSaving
                      ? 'Saving...'
                      : editingProjectId
                      ? 'Update'
                      : 'Add'}
                  </button>
                  {editingProjectId && (
                    <button
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="flex-1 px-3 py-2.5 bg-white/5 border border-gray-700/50 text-gray-400 rounded-xl hover:text-white hover:bg-white/10 backdrop-blur-sm text-sm transition-all disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
};

export default ProjectsPage;
