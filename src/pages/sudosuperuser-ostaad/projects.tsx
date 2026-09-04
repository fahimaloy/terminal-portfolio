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
import { useToast } from '../../components/ui/Toast';
import { useFormAnimation } from '../../hooks/useFormAnimation';
import { useStagger } from '../../hooks/useStagger';
import {
  NeonButton,
  GlitchText,
  HudPanel,
  NeonChip,
} from '../../components/ui';
import ConfirmDeleteModal from '../../components/admin/ConfirmDeleteModal';
import RichTextEditor from '../../components/ui/RichTextEditor';
import SearchableMultiSelect from '../../components/ui/SearchableMultiSelect';

const defaultProject: Partial<PortfolioProject> = {
  title: '',
  short_title: '',
  description: '',
  description_html: '',
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
  client_name: '',
  client_location: '',
  client_logo: '',
};

const ProjectsPage = () => {
  const { authorized, loading, user } = useAdminGuard();
  const { success, error: toastError } = useToast();
  const { shake } = useFormAnimation();
  const [projects, setProjects] = React.useState<PortfolioProject[]>([]);
  const [skills, setSkills] = React.useState<PortfolioSkill[]>([]);
  const [projectDraft, setProjectDraft] =
    React.useState<Partial<PortfolioProject>>(defaultProject);
  const [editingProjectId, setEditingProjectId] = React.useState<number | null>(
    null,
  );
  const [selectedSkillIds, setSelectedSkillIds] = React.useState<number[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState<number | null>(null);
  const formRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Stagger list items
  useStagger({
    rootRef: listRef,
    selector: '.project-item',
    mode: 'list',
    delay: 60,
    respectReduced: true,
  });

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

  const handleProjectSubmit = async () => {
    if (!projectDraft.title?.trim()) {
      shake(formRef.current);
      toastError('Project title is required.');
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
      client_name: projectDraft.client_name?.trim() || null,
      client_location: projectDraft.client_location?.trim() || null,
      client_logo: projectDraft.client_logo?.trim() || null,
    };

    const ok = editingProjectId
      ? await updateProject(editingProjectId, payload)
      : await createProject(payload);

    if (ok) {
      success(editingProjectId ? 'Project updated.' : 'Project created.');
      setProjectDraft(defaultProject);
      setEditingProjectId(null);
      setSelectedSkillIds([]);
      await loadData();
    } else {
      toastError('Failed to save project.');
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
    setIsSaving(true);
    const ok = await deleteProject(id);
    if (ok) {
      success('Project deleted.');
      await loadData();
    } else {
      toastError('Failed to delete project.');
    }
    setConfirmDelete(null);
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
          <GlitchText
            accent="magenta"
            className="text-2xl font-display tracking-[2px] mb-6"
          >
            MANAGE PROJECTS
          </GlitchText>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div ref={listRef} className="lg:col-span-2">
              {projects.length > 0 ? (
                <HudPanel accent="magenta" notch="md" className="p-6">
                  <div className="text-[10px] font-display tracking-[3px] text-neon-magenta mb-4">
                    PROJECTS ({projects.length})
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {projects.map((project) => (
                      <div
                        key={project.id}
                        className="project-item p-3 bg-white/[0.03] border border-white/10 clip-notch-sm flex flex-col gap-2 transition-all duration-200 hover:border-neon-cyan/30 hover:bg-neon-cyan/5"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-display tracking-[2px] text-text-primary text-sm">
                              {project.title}
                            </div>
                            {project.short_title && (
                              <div className="text-xs text-text-muted font-body">
                                {project.short_title}
                              </div>
                            )}
                            {project.client_name && (
                              <div className="text-xs text-neon-magenta font-body">
                                Client: {project.client_name}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {project.featured && (
                              <NeonChip accent="magenta">FEATURED</NeonChip>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <NeonButton
                            variant="outline"
                            accent="cyan"
                            onClick={() => handleEditProject(project)}
                            disabled={isSaving}
                          >
                            EDIT
                          </NeonButton>
                          <NeonButton
                            variant="ghost"
                            accent="red"
                            onClick={() => setConfirmDelete(project.id)}
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
                <HudPanel
                  accent="magenta"
                  notch="md"
                  className="p-6 text-center"
                >
                  <span className="font-body text-sm text-text-muted">
                    No projects yet.
                  </span>
                </HudPanel>
              )}
            </div>

            <HudPanel accent="magenta" notch="md" className="p-6">
              <div ref={formRef}>
                <div className="text-[10px] font-display tracking-[3px] text-neon-magenta mb-4">
                  {editingProjectId ? 'EDIT PROJECT' : 'ADD PROJECT'}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
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
                    <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                      Short Title
                    </label>
                    <input
                      type="text"
                      className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
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
                    <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                      Description (Rich Text)
                    </label>
                    <RichTextEditor
                      content={projectDraft.description_html || ''}
                      onChange={(html) =>
                        setProjectDraft((prev) => ({
                          ...prev,
                          description_html: html,
                        }))
                      }
                    />
                  </div>

                  <div className="border-t border-white/10 pt-3">
                    <h4 className="font-display tracking-[2px] text-sm text-text-muted mb-2">
                      Client Information
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                          Client Name
                        </label>
                        <input
                          type="text"
                          className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                          placeholder="Client name"
                          value={projectDraft.client_name || ''}
                          onChange={(e) =>
                            setProjectDraft((prev) => ({
                              ...prev,
                              client_name: e.target.value,
                            }))
                          }
                          disabled={isSaving}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                          Client Location
                        </label>
                        <input
                          type="text"
                          className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                          placeholder="e.g., New York, USA"
                          value={projectDraft.client_location || ''}
                          onChange={(e) =>
                            setProjectDraft((prev) => ({
                              ...prev,
                              client_location: e.target.value,
                            }))
                          }
                          disabled={isSaving}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                          Client Logo URL
                        </label>
                        <input
                          type="url"
                          className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                          placeholder="https://..."
                          value={projectDraft.client_logo || ''}
                          onChange={(e) =>
                            setProjectDraft((prev) => ({
                              ...prev,
                              client_logo: e.target.value,
                            }))
                          }
                          disabled={isSaving}
                        />
                        {projectDraft.client_logo && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-white/10 overflow-hidden flex items-center justify-center">
                              <img
                                src={projectDraft.client_logo}
                                alt="Client logo"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display =
                                    'none';
                                }}
                              />
                            </div>
                            <span className="font-body text-xs text-text-muted">
                              Logo preview
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                      Thumbnail URL
                    </label>
                    <input
                      type="url"
                      className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
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
                    <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                      Main Image URL
                    </label>
                    <input
                      type="url"
                      className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
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
                    <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                      Live URL
                    </label>
                    <input
                      type="url"
                      className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
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
                    <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                      Repo URL
                    </label>
                    <input
                      type="url"
                      className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
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
                    <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                      Languages (comma separated)
                    </label>
                    <input
                      type="text"
                      className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                      placeholder="e.g., JavaScript, Python, Go"
                      value={(projectDraft.languages || []).join(', ')}
                      onChange={(e) => setProjectLanguages(e.target.value)}
                      disabled={isSaving}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                      Tags (comma separated)
                    </label>
                    <input
                      type="text"
                      className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                      placeholder="e.g., web, mobile, api (skills are auto-added)"
                      value={(projectDraft.tags || []).join(', ')}
                      onChange={(e) => setProjectTags(e.target.value)}
                      disabled={isSaving}
                    />
                  </div>

                  <div className="border-t border-white/10 pt-3">
                    <label className="block text-[10px] font-display tracking-[2px] mb-2 text-text-muted">
                      Skills Used
                    </label>
                    <SearchableMultiSelect
                      options={skills.map((s) => ({ id: s.id, label: s.name }))}
                      selectedIds={selectedSkillIds}
                      onChange={setSelectedSkillIds}
                      placeholder="Search skills..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                        Featured Order
                      </label>
                      <input
                        type="number"
                        className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
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
                      <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                        Sort Order
                      </label>
                      <input
                        type="number"
                        className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
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

                  <label className="flex items-center gap-2 font-body text-sm cursor-pointer text-text-secondary">
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
                      className="cursor-pointer accent-neon-cyan"
                    />
                    Featured Project
                  </label>

                  <div className="flex gap-2 pt-2">
                    <NeonButton
                      accent="cyan"
                      onClick={handleProjectSubmit}
                      disabled={isSaving}
                      loading={isSaving}
                    >
                      {editingProjectId ? 'UPDATE' : 'ADD'}
                    </NeonButton>
                    {editingProjectId && (
                      <NeonButton
                        variant="ghost"
                        accent="cyan"
                        onClick={handleCancel}
                        disabled={isSaving}
                      >
                        CANCEL
                      </NeonButton>
                    )}
                  </div>
                </div>
              </div>
            </HudPanel>
          </div>
        </div>

        <ConfirmDeleteModal
          open={confirmDelete !== null}
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => {
            if (confirmDelete !== null) handleDeleteProject(confirmDelete);
          }}
          message="Delete this project? This cannot be undone."
          isSaving={isSaving}
        />
      </AdminLayout>
    </>
  );
};

export default ProjectsPage;
