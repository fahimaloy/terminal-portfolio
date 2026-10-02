import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { useAdminGuard } from '../../../utils/adminPageGuard';
import BlogForm from '../../../components/admin/BlogForm';
import { HudPanel, useToast } from '../../../components/ui';
import { adminCreateBlog } from '../../../utils/blogApi';
import type { BlogUpsertInput } from '../../../types/blog';

const NewBlogPage = () => {
  const { authorized, user } = useAdminGuard();
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const { success, error: toastError } = useToast();

  const handleSubmit = async (input: BlogUpsertInput) => {
    setSubmitting(true);
    setError('');
    const res = await adminCreateBlog(input);
    if (res.ok) {
      success('Post created.');
      router.push('/sudosuperuser-ostaad/blogs');
      return;
    }
    const msg = res.message || 'Failed to create post.';
    setError(msg);
    toastError(msg);
    setSubmitting(false);
  };

  if (!authorized) return null;

  return (
    <>
      <Head>
        <title>New Post | Admin</title>
        <meta name="robots" content="noindex" />
      </Head>
      <AdminLayout user={user}>
        <div className="space-y-5">
          <div>
            <h1
              className="font-display text-lg text-neon-cyan tracking-wider"
              // Replaces the retired `text-shadow-neon-cyan`, which was
              // `0 0 8px var(--neon-cyan), 0 0 16px var(--glow-cyan)` — an
              // opaque core plus a wide halo. The admin panel is matte and
              // mono-chrome since the editorial restyle, so this page title
              // takes only the faintest token-backed lift: 0.1 alpha, no core.
              // It reads as a lit edge rather than a lamp, and it stops the
              // cyan title looking unfinished against the `--glow-cyan-faint`
              // hairline the admin chrome already draws beneath it.
              style={{ textShadow: '0 0 14px var(--glow-cyan-faint)' }}
            >
              NEW POST
            </h1>
            <p className="text-[10px] font-mono text-text-muted mt-1">
              {'>'} Compose a new transmission
            </p>
          </div>

          {error && (
            <HudPanel accent="coral" className="p-3">
              <span className="font-body text-sm text-neon-coral">{error}</span>
            </HudPanel>
          )}

          <BlogForm
            submitting={submitting}
            onSubmit={handleSubmit}
            onCancel={() => router.push('/sudosuperuser-ostaad/blogs')}
          />
        </div>
      </AdminLayout>
    </>
  );
};

export default NewBlogPage;
