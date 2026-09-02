import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { FiPlus, FiEdit2, FiTrash2, FiExternalLink } from 'react-icons/fi';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { useAdminGuard } from '../../../utils/adminPageGuard';
import {
  HudPanel,
  NeonButton,
  NeonChip,
  useToast,
} from '../../../components/ui';
import { adminListBlogs, adminDeleteBlog } from '../../../utils/blogApi';
import type { BlogPost } from '../../../types/blog';

const AdminBlogsPage = () => {
  const { authorized, user } = useAdminGuard();
  const router = useRouter();

  const [posts, setPosts] = React.useState<BlogPost[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [confirmId, setConfirmId] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);
  const { success, error: toastError } = useToast();

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setPosts(await adminListBlogs());
    setLoading(false);
  }, []);

  React.useEffect(() => {
    if (authorized) loadData();
  }, [authorized, loadData]);

  const handleDelete = async (id: number) => {
    setBusy(true);
    const res = await adminDeleteBlog(id);
    if (res.ok) success('Post deleted.');
    else toastError(res.message || 'Delete failed.');
    setConfirmId(null);
    // Always refetch so the table can never show a stale row.
    await loadData();
    setBusy(false);
  };

  if (!authorized) return null;

  const published = posts.filter((p) => p.status === 'published').length;

  return (
    <>
      <Head>
        <title>Blogs | Admin</title>
        <meta name="robots" content="noindex" />
      </Head>
      <AdminLayout user={user}>
        <div className="space-y-5">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-lg text-neon-cyan text-shadow-neon-cyan tracking-wider">
                BLOG POSTS
              </h1>
              <p className="text-[10px] font-mono text-text-muted mt-1">
                {posts.length} TOTAL · {published} PUBLISHED ·{' '}
                {posts.length - published} DRAFT
              </p>
            </div>
            <NeonButton
              accent="yellow"
              iconLeft={<FiPlus />}
              onClick={() => router.push('/sudosuperuser-ostaad/blogs/new')}
            >
              NEW POST
            </NeonButton>
          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-white/[0.03] border border-white/5 clip-notch-sm animate-pulse-glow"
                />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <HudPanel accent="magenta" notch="md" className="p-8 text-center">
              <div className="font-display text-sm text-neon-magenta tracking-[3px]">
                NO POSTS YET
              </div>
              <p className="font-mono text-[11px] text-text-muted mt-2">
                {'>'} Create your first transmission.
              </p>
            </HudPanel>
          ) : (
            <div className="space-y-2">
              {posts.map((post) => (
                <HudPanel
                  key={post.id}
                  accent={post.status === 'published' ? 'cyan' : 'yellow'}
                  notch="sm"
                  className="p-3"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Thumb */}
                    <div className="w-16 h-12 bg-black/40 overflow-hidden flex-shrink-0 clip-notch-sm">
                      {post.cover_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.cover_image_url}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-display text-text-muted text-xs">
                          {post.title.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex-1 min-w-[180px]">
                      <div className="font-body text-sm text-text-primary line-clamp-1">
                        {post.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <NeonChip
                          accent={
                            post.status === 'published' ? 'green' : 'yellow'
                          }
                        >
                          {post.status.toUpperCase()}
                        </NeonChip>
                        {post.featured && (
                          <NeonChip accent="magenta">FEATURED</NeonChip>
                        )}
                        <span className="text-[9px] font-mono text-text-muted">
                          /{post.slug}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {post.status === 'published' && (
                        <NeonButton
                          variant="ghost"
                          accent="cyan"
                          iconLeft={<FiExternalLink />}
                          onClick={() =>
                            window.open(`/blog/${post.slug}`, '_blank')
                          }
                        >
                          VIEW
                        </NeonButton>
                      )}
                      <NeonButton
                        variant="outline"
                        accent="cyan"
                        iconLeft={<FiEdit2 />}
                        onClick={() =>
                          router.push(`/sudosuperuser-ostaad/blogs/${post.id}`)
                        }
                      >
                        EDIT
                      </NeonButton>
                      <NeonButton
                        variant="ghost"
                        accent="red"
                        iconLeft={<FiTrash2 />}
                        onClick={() => setConfirmId(post.id)}
                        disabled={busy}
                      >
                        DELETE
                      </NeonButton>
                    </div>
                  </div>

                  {/* Inline delete confirmation */}
                  {confirmId === post.id && (
                    <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center gap-3">
                      <span className="font-body text-xs text-neon-red">
                        Delete “{post.title}”? This cannot be undone.
                      </span>
                      <div className="flex gap-2 ml-auto">
                        <NeonButton
                          accent="red"
                          onClick={() => handleDelete(post.id)}
                          loading={busy}
                        >
                          CONFIRM
                        </NeonButton>
                        <NeonButton
                          variant="ghost"
                          accent="cyan"
                          onClick={() => setConfirmId(null)}
                          disabled={busy}
                        >
                          CANCEL
                        </NeonButton>
                      </div>
                    </div>
                  )}
                </HudPanel>
              ))}
            </div>
          )}
        </div>
      </AdminLayout>
    </>
  );
};

export default AdminBlogsPage;
