import Head from 'next/head';
import React from 'react';
import {
  getKnowledgeBases,
  createKnowledgeBase,
  deleteKnowledgeBase,
  PortfolioKnowledgeBase,
} from '../../utils/api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useAdminGuard } from '../../utils/adminPageGuard';

const KnowledgePage = () => {
  const { authorized, loading, user } = useAdminGuard();
  const [knowledges, setKnowledges] = React.useState<PortfolioKnowledgeBase[]>([]);
  const [newCategory, setNewCategory] = React.useState('');
  const [newContent, setNewContent] = React.useState('');
  const [statusMessage, setStatusMessage] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  const loadData = React.useCallback(async () => {
    const data = await getKnowledgeBases();
    setKnowledges(data);
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

  const handleAddKnowledge = async () => {
    if (!newCategory.trim() || !newContent.trim()) {
      updateStatus('Category and content are required.');
      return;
    }

    setIsSaving(true);
    const ok = await createKnowledgeBase({
      category: newCategory.trim(),
      content: newContent.trim(),
      is_visible: true,
    });

    updateStatus(ok ? 'Knowledge Base added.' : 'Failed to add knowledge base.');
    if (ok) {
      setNewCategory('');
      setNewContent('');
      await loadData();
    }
    setIsSaving(false);
  };

  const handleDeleteKnowledge = async (id: number) => {
    setIsSaving(true);
    const ok = await deleteKnowledgeBase(id);
    updateStatus(ok ? 'Knowledge base deleted.' : 'Failed to delete knowledge base.');
    if (ok) {
      await loadData();
    }
    setIsSaving(false);
  };

  if (!authorized) return null;

  return (
    <>
      <Head>
        <title>Knowledge Bases - Admin Panel</title>
      </Head>

      <AdminLayout user={user} isLoading={loading}>
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold mb-6">Manage Knowledge Base</h2>

          {statusMessage && (
            <div className="mb-4 p-3 bg-lime-500/10 border border-lime-500/30 text-lime-400 text-sm rounded-xl">
              {statusMessage}
            </div>
          )}

          <div className="glass-deep rounded-xl p-6 mb-8">
            <h3 className="text-lg font-bold text-white mb-4">Add New Context</h3>

            <div className="grid gap-3 mb-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Category / Topic:</label>
                <input
                  type="text"
                  className="form-premium-input w-full rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500"
                  placeholder="e.g., Professional Background, Work Setup, Salary Expectations"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Content / Details:</label>
                <textarea
                  className="form-premium-input w-full h-32 rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500 resize-none"
                  placeholder="The text that AI will use to answer user questions..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>

            <button
              onClick={handleAddKnowledge}
              disabled={isSaving}
              className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white rounded-xl px-5 py-2.5 font-medium transition-all shadow-lg disabled:opacity-50"
            >
              {isSaving ? 'Adding...' : 'Add Knowledge'}
            </button>
          </div>

          {knowledges.length > 0 ? (
            <div className="glass-deep rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">
                Saved Contexts ({knowledges.length})
              </h3>
              <div className="space-y-4">
                {knowledges.map((kb) => (
                  <div key={kb.id} className="p-3 bg-white/5 border border-gray-800 rounded-xl flex flex-col justify-between">
                    <div className="flex-1 mb-2">
                      <div className="font-bold text-white mb-1">Category: {kb.category}</div>
                      <div className="text-sm text-gray-400 whitespace-pre-wrap">{kb.content}</div>
                    </div>
                    <button
                      onClick={() => handleDeleteKnowledge(kb.id)}
                      disabled={isSaving}
                      className="w-fit self-end bg-white/5 border border-gray-700/50 text-gray-400 rounded-xl hover:text-white hover:bg-white/10 backdrop-blur-sm px-4 py-2.5 text-sm transition-all disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 p-6 glass-deep rounded-xl">
              No knowledge base entries yet.
            </div>
          )}
        </div>
      </AdminLayout>
    </>
  );
};

export default KnowledgePage;
