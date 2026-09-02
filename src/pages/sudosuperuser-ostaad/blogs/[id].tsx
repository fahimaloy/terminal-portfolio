import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { useAdminGuard } from '../../../utils/adminPageGuard';
import BlogForm from '../../../components/admin/BlogForm';
import { HudPanel, NeonButton, useToast } from '../../../components/ui';
import { adminGetBlog, adminUpdateBlog } from '../../../utils/blogApi';
import type { BlogPost, BlogUpsertInput } from '../../../types/blog';

const EditBlogPage = () => {
  const { authorized, user } = useAdminGuard();
  const router = useRouter();

  const idParam = router.query.id;
  const id = Number(Array.isArray(idParam) ? idParam[0] : idParam);

  const [post, setPost] = React.useState<BlogPost | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const { success, error: toastError } = useToast();

  React.useEffect(() => {
    if (!authorized || !Number.isFinite(id)) return;
    let cancelled = false;

    setLoading(true);
    adminGetBlog(id).then((data) => {
      if (cancelled) return;
      setPost(data);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [authorized, id]);

  const handleSubmit = async (input: BlogUpsertInput) => {
    setSubmitting(true);
    setError('');
    const res = await adminUpdateBlog(id, input);
    if (res.ok) {
      success('Post updated.');
      router.push('/sudosuperuser-ostaad/blogs');
      return;
    }
    const msg = res.message || 'Failed to update post.';
    setError(msg);
    toastError(msg);
    setSubmitting(false);
  };

  if (!authorized) return null;

  return (
    <>
      <Head>
        <title>Edit Post | Admin</title>
        <meta name="robots" content="noindex" />
      </Head>
      <AdminLayout user={user}>
        <div className="space-y-5">
          <div>
            <h1 className="font-display text-lg text-neon-cyan text-shadow-neon-cyan tracking-wider">
              EDIT POST
            </h1>
            <p className="text-[10px] font-mono text-text-muted mt-1">
              {'>'} {post ? `/${post.slug}` : 'loading…'}
            </p>
          </div>

          {error && (
            <HudPanel accent="red" notch="sm" className="p-3">
              <span className="font-body text-sm text-neon-red">{error}</span>
            </HudPanel>
          )}

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-32 bg-white/[0.03] border border-white/5 clip-notch-sm animate-pulse-glow"
                />
              ))}
            </div>
          ) : !post ? (
            <HudPanel
              accent="red"
              notch="md"
              className="p-8 text-center space-y-4"
            >
              <div className="font-display text-sm text-neon-red tracking-[3px]">
                POST NOT FOUND
              </div>
              <NeonButton
                accent="cyan"
                variant="outline"
                onClick={() => router.push('/sudosuperuser-ostaad/blogs')}
              >
                BACK TO LIST
              </NeonButton>
            </HudPanel>
          ) : (
            <BlogForm
              initial={post}
              submitting={submitting}
              onSubmit={handleSubmit}
              onCancel={() => router.push('/sudosuperuser-ostaad/blogs')}
            />
          )}
        </div>
      </AdminLayout>
    </>
  );
};

export default EditBlogPage;
