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

const ICON_OPTIONS = [
  'html5',
  'css3',
  'javascript',
  'vuedotjs',
  'react',
  'nextdotjs',
  'nuxtdotjs',
  'linux',
  'go',
  'rust',
  'axum',
  'cargo',
  'django',
  'fastapi',
  'tauri',
  'nodedotjs',
  'express',
  'redis',
  'pinecone',
  'mongodb',
  'postgresql',
  'flutter',
  'electron',
  'python',
  'c',
  'gtk',
  'typescript',
  'docker',
  'kubernetes',
  'firebase',
  'supabase',
  'tailwindcss',
  'git',
  'github',
];

const SkillsPage = () => {
  const { authorized, loading, user } = useAdminGuard();
  const [skills, setSkills] = React.useState<PortfolioSkill[]>([]);
  const [newSkill, setNewSkill] = React.useState('');
  const [newSkillIconKey, setNewSkillIconKey] = React.useState('');
  const [statusMessage, setStatusMessage] = React.useState('');
  const [dragSkillId, setDragSkillId] = React.useState<number | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const loadData = React.useCallback(async () => {
    const skillsData = await getPortfolioSkills();
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

  const handleAddSkill = async () => {
    if (!newSkill.trim()) {
      updateStatus('Skill name is required.');
      return;
    }

    setIsSaving(true);
    const ok = await createSkill({
      name: newSkill.trim(),
      icon_key: newSkillIconKey.trim() || null,
      sort_order: skills.length + 1,
      is_visible: true,
    });

    updateStatus(ok ? 'Skill added.' : 'Failed to add skill.');
    if (ok) {
      setNewSkill('');
      setNewSkillIconKey('');
      await loadData();
    }
    setIsSaving(false);
  };

  const handleDeleteSkill = async (id: number) => {
    setIsSaving(true);
    const ok = await deleteSkill(id);
    updateStatus(ok ? 'Skill deleted.' : 'Failed to delete skill.');
    if (ok) {
      await loadData();
    }
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
    updateStatus('Skill order updated.');
    await loadData();
    setIsSaving(false);
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!authorized) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Skills - Admin Panel</title>
      </Head>

      <AdminLayout user={user}>
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold mb-6">Manage Skills</h2>

          {statusMessage && (
            <div className="mb-4 p-3 bg-green-900 text-green-300 border border-green-400 text-sm">
              {statusMessage}
            </div>
          )}

          <div className="border border-green-400 p-6 mb-8">
            <h3 className="text-lg font-bold mb-4">Add New Skill</h3>

            <div className="grid gap-3 mb-4 md:grid-cols-2">
              <div>
                <label className="block text-sm mb-1">Skill Name:</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-black border border-green-400 text-green-400 focus:outline-none focus:bg-green-400 focus:text-black"
                  placeholder="e.g., React, Python, TypeScript"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Icon Key:</label>
                <select
                  className="w-full px-3 py-2 bg-black border border-green-400 text-green-400 focus:outline-none focus:bg-green-400 focus:text-black"
                  value={newSkillIconKey}
                  onChange={(e) => setNewSkillIconKey(e.target.value)}
                  disabled={isSaving}
                >
                  <option value="">Select icon (optional)</option>
                  {ICON_OPTIONS.map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleAddSkill}
              disabled={isSaving}
              className="px-4 py-2 bg-green-400 text-black font-bold hover:bg-green-300 disabled:opacity-50"
            >
              {isSaving ? 'Adding...' : 'Add Skill'}
            </button>
          </div>

          {skills.length > 0 ? (
            <div className="border border-green-400 p-6">
              <h3 className="text-lg font-bold mb-4">
                Skills ({skills.length})
              </h3>

              <p className="text-sm text-green-300 mb-4">
                Drag to reorder skills
              </p>

              <div className="space-y-2">
                {skills.map((skill) => (
                  <div
                    key={skill.id}
                    draggable
                    onDragStart={() => setDragSkillId(skill.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleSkillDrop(skill.id)}
                    className="p-3 bg-black border border-green-400 flex justify-between items-center cursor-move hover:bg-green-900 hover:bg-opacity-20"
                  >
                    <div className="flex-1">
                      <div className="font-bold">{skill.name}</div>
                      {skill.icon_key && (
                        <div className="text-xs text-green-300">
                          Icon: {skill.icon_key}
                        </div>
                      )}
                      <div className="text-xs text-green-300">
                        Order: {skill.sort_order}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteSkill(skill.id)}
                      disabled={isSaving}
                      className="ml-3 px-3 py-1 bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-green-300 p-6 border border-green-400">
              No skills yet. Add one to get started.
            </div>
          )}
        </div>
      </AdminLayout>
    </>
  );
};

export default SkillsPage;
