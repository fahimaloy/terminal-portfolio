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
import { NeonButton, GlitchText, HudPanel } from '../../components/ui';
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
          <GlitchText
            accent="green"
            className="text-2xl font-display tracking-[2px] mb-6"
          >
            MANAGE KNOWLEDGE BASE
          </GlitchText>

          <HudPanel accent="green" notch="md" className="p-6 mb-8">
            <div ref={formRef}>
              <div className="text-[10px] font-display tracking-[3px] text-neon-green mb-4">
                ADD NEW CONTEXT
              </div>

              <div className="grid gap-3 mb-4">
                <div>
                  <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                    Category / Topic:
                  </label>
                  <input
                    type="text"
                    className="w-full bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200"
                    placeholder="e.g., Professional Background, Work Setup, Salary Expectations"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1">
                    Content / Details:
                  </label>
                  <textarea
                    className="w-full h-32 bg-bg-smoke border border-white/10 text-text-primary px-3 py-2 font-body text-sm focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_var(--glow-cyan)] placeholder-text-muted clip-notch-sm transition-all duration-200 resize-none"
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
          </HudPanel>

          {knowledges.length > 0 ? (
            <HudPanel accent="green" notch="md" className="p-6">
              <div className="text-[10px] font-display tracking-[3px] text-neon-green mb-4">
                SAVED CONTEXTS ({knowledges.length})
              </div>
              <div ref={listRef} className="space-y-4">
                {knowledges.map((kb) => (
                  <div
                    key={kb.id}
                    className="kb-item p-3 bg-white/[0.03] border border-white/10 clip-notch-sm flex flex-col justify-between hover:border-neon-cyan/30 transition-all duration-200"
                  >
                    <div className="flex-1 mb-2">
                      <div className="font-display tracking-[2px] text-text-primary text-sm mb-1">
                        Category: {kb.category}
                      </div>
                      <div className="font-body text-sm text-text-muted whitespace-pre-wrap">
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
            </HudPanel>
          ) : (
            <HudPanel accent="green" notch="md" className="p-6 text-center">
              <span className="font-body text-sm text-text-muted">
                No knowledge base entries yet.
              </span>
            </HudPanel>
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
