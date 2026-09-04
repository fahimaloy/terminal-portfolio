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
import { useToast } from '../../components/ui/Toast';
import { useFormAnimation } from '../../hooks/useFormAnimation';
import { useStagger } from '../../hooks/useStagger';
import { NeonButton } from '../../components/ui';
import ConfirmDeleteModal from '../../components/admin/ConfirmDeleteModal';

const KnowledgePage = () => {
  const { authorized, loading, user } = useAdminGuard();
  const { success, error: toastError } = useToast();
  const { shake } = useFormAnimation();
  const [knowledges, setKnowledges] = React.useState<PortfolioKnowledgeBase[]>(
    [],
  );
  const [newCategory, setNewCategory] = React.useState('');
  const [newContent, setNewContent] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState<number | null>(null);
  const formRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Stagger list items
  useStagger({
    rootRef: listRef,
    selector: '.kb-item',
    mode: 'list',
    delay: 60,
    respectReduced: true,
  });

  const loadData = React.useCallback(async () => {
    const data = await getKnowledgeBases();
    setKnowledges(data);
  }, []);

  React.useEffect(() => {
    if (authorized) {
      loadData();
    }
  }, [authorized, loadData]);

  const handleAddKnowledge = async () => {
    if (!newCategory.trim() || !newContent.trim()) {
      shake(formRef.current);
      toastError('Category and content are required.');
      return;
    }

    setIsSaving(true);
    const ok = await createKnowledgeBase({
      category: newCategory.trim(),
      content: newContent.trim(),
      is_visible: true,
    });

    if (ok) {
      success('Knowledge base added.');
      setNewCategory('');
      setNewContent('');
      await loadData();
    } else {
      toastError('Failed to add knowledge base.');
    }
    setIsSaving(false);
  };

  const handleDeleteKnowledge = async (id: number) => {
    setIsSaving(true);
    const ok = await deleteKnowledgeBase(id);
    if (ok) {
      success('Knowledge base deleted.');
      await loadData();
    } else {
      toastError('Failed to delete knowledge base.');
    }
    setConfirmDelete(null);
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

          <div ref={formRef} className="glass-deep rounded-xl p-6 mb-8">
            <h3 className="text-lg font-bold text-white mb-4">
              Add New Context
            </h3>

            <div className="grid gap-3 mb-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Category / Topic:
                </label>
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
                <label className="block text-sm text-gray-400 mb-1">
                  Content / Details:
                </label>
                <textarea
                  className="form-premium-input w-full h-32 rounded-xl p-3 text-white text-sm focus:outline-none placeholder-gray-500 resize-none"
                  placeholder="The text that AI will use to answer user questions..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>

            <NeonButton
              accent="cyan"
              onClick={handleAddKnowledge}
              disabled={isSaving}
              loading={isSaving}
            >
              ADD KNOWLEDGE
            </NeonButton>
          </div>

          {knowledges.length > 0 ? (
            <div className="glass-deep rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">
                Saved Contexts ({knowledges.length})
              </h3>
              <div ref={listRef} className="space-y-4">
                {knowledges.map((kb) => (
                  <div
                    key={kb.id}
                    className="kb-item p-3 bg-white/5 border border-gray-800 rounded-xl flex flex-col justify-between"
                  >
                    <div className="flex-1 mb-2">
                      <div className="font-bold text-white mb-1">
                        Category: {kb.category}
                      </div>
                      <div className="text-sm text-gray-400 whitespace-pre-wrap">
                        {kb.content}
                      </div>
                    </div>
                    <NeonButton
                      variant="ghost"
                      accent="red"
                      onClick={() => setConfirmDelete(kb.id)}
                      disabled={isSaving}
                    >
                      DELETE
                    </NeonButton>
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

        <ConfirmDeleteModal
          open={confirmDelete !== null}
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => {
            if (confirmDelete !== null) handleDeleteKnowledge(confirmDelete);
          }}
          message="Delete this knowledge base entry? This cannot be undone."
          isSaving={isSaving}
        />
      </AdminLayout>
    </>
  );
};

export default KnowledgePage;
