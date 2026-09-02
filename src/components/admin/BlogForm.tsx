// src/components/admin/BlogForm.tsx
/* Shared create/edit form for blog posts. Handles validation, slug preview,
   SEO fields, tag editing, and draft/publish toggling. */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiSave, FiAlertCircle, FiX } from 'react-icons/fi';
import RichTextEditor from '../ui/RichTextEditor';
import { HudPanel, NeonButton } from '../ui';
import { TextInput, TextArea, Toggle, TagInput, Select } from '../ui/forms';
import { useFormAnimation } from '../../hooks/useFormAnimation';
import {
  slugify,
  estimateReadingMinutes,
  type BlogPost,
  type BlogStatus,
  type BlogUpsertInput,
} from '../../types/blog';

const labelClass =
  'block text-[9px] font-display tracking-[3px] text-text-muted mb-1.5 uppercase';

interface Props {
  initial?: BlogPost | null;
  submitting?: boolean;
  onSubmit: (input: BlogUpsertInput) => void;
  onCancel: () => void;
}

export default function BlogForm({
  initial,
  submitting = false,
  onSubmit,
  onCancel,
}: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugLocked, setSlugLocked] = useState(Boolean(initial?.slug));
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? '');
  const [contentHtml, setContentHtml] = useState(initial?.content_html ?? '');
  const [coverUrl, setCoverUrl] = useState(initial?.cover_image_url ?? '');
  const [coverAlt, setCoverAlt] = useState(initial?.cover_image_alt ?? '');
  const [status, setStatus] = useState<BlogStatus>(initial?.status ?? 'draft');
  const [featured, setFeatured] = useState(Boolean(initial?.featured));
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [seoTitle, setSeoTitle] = useState(initial?.seo_title ?? '');
  const [seoDescription, setSeoDescription] = useState(
    initial?.seo_description ?? '',
  );
  const [seoKeywords, setSeoKeywords] = useState(
    (initial?.seo_keywords ?? []).join(', '),
  );
  const [error, setError] = useState('');

  const errorRef = useRef<HTMLDivElement>(null);
  const { shake } = useFormAnimation();

  useEffect(() => {
    if (error) shake(errorRef.current);
  }, [error, shake]);

  // Auto-derive the slug from the title until the user edits it directly.
  useEffect(() => {
    if (!slugLocked) setSlug(slugify(title));
  }, [title, slugLocked]);

  const readingMinutes = useMemo(
    () => (contentHtml ? estimateReadingMinutes(contentHtml) : 0),
    [contentHtml],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) return setError('Title is required.');
    if (title.trim().length > 200) return setError('Title too long (max 200).');
    if (!contentHtml.trim() || contentHtml === '<p></p>')
      return setError('Content is required.');
    if (!slug.trim()) return setError('Slug could not be generated.');
    if (seoDescription.length > 320)
      return setError('SEO description too long (max 320).');

    onSubmit({
      title: title.trim(),
      slug: slug.trim(),
      excerpt: excerpt.trim() || null,
      content_html: contentHtml,
      cover_image_url: coverUrl.trim() || null,
      cover_image_alt: coverAlt.trim() || null,
      status,
      featured,
      tags,
      seo_title: seoTitle.trim() || null,
      seo_description: seoDescription.trim() || null,
      seo_keywords: seoKeywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div ref={errorRef}>
          <HudPanel
            accent="red"
            notch="sm"
            className="p-3 flex items-center gap-2"
          >
            <FiAlertCircle className="w-4 h-4 text-neon-red flex-shrink-0" />
            <span className="font-body text-sm text-neon-red">{error}</span>
          </HudPanel>
        </div>
      )}

      {/* Core fields */}
      <HudPanel
        accent="cyan"
        notch="md"
        title="// POST_CONTENT"
        className="p-4 space-y-4"
      >
        <TextInput
          id="blog-title"
          label="Title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="How I built the neural HUD"
          maxLength={200}
          disabled={submitting}
        />

        <TextInput
          id="blog-slug"
          label="Slug"
          required
          className="font-mono text-xs"
          value={slug}
          onChange={(e) => {
            setSlugLocked(true);
            setSlug(slugify(e.target.value));
          }}
          placeholder="how-i-built-the-neural-hud"
          hint={`/blog/${slug || '…'}`}
          disabled={submitting}
        />

        <TextArea
          id="blog-excerpt"
          label="Excerpt (auto-generated when blank)"
          rows={2}
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          maxLength={400}
          showCount
          disabled={submitting}
        />

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className={labelClass}>
              Content <span className="text-neon-red">*</span>
            </span>
            <span className="text-[9px] font-mono text-text-muted">
              ~{readingMinutes} MIN READ
            </span>
          </div>
          <RichTextEditor
            content={contentHtml}
            onChange={setContentHtml}
            placeholder="Write your post…"
          />
        </div>
      </HudPanel>

      {/* Media + taxonomy */}
      <HudPanel
        accent="magenta"
        notch="md"
        title="// MEDIA_AND_TAGS"
        className="p-4 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput
            id="blog-cover"
            label="Cover image URL"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="https://…"
            disabled={submitting}
          />
          <TextInput
            id="blog-cover-alt"
            label="Cover alt text"
            value={coverAlt}
            onChange={(e) => setCoverAlt(e.target.value)}
            placeholder="Describe the image"
            hint="Required for accessibility when a cover is set"
            disabled={submitting}
          />
        </div>

        {coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={coverAlt || 'Cover preview'}
            className="w-full max-h-48 object-cover clip-notch-sm border border-white/10"
          />
        )}

        <TagInput
          id="blog-tags"
          label="Tags"
          value={tags}
          onChange={setTags}
          hint="Enter or comma to add · Backspace to remove the last"
          disabled={submitting}
        />
      </HudPanel>

      {/* SEO */}
      <HudPanel
        accent="yellow"
        notch="md"
        title="// SEO_METADATA"
        className="p-4 space-y-4"
      >
        <TextInput
          id="blog-seo-title"
          label="SEO title"
          value={seoTitle}
          onChange={(e) => setSeoTitle(e.target.value)}
          placeholder="Defaults to the post title"
          maxLength={200}
          disabled={submitting}
        />
        <TextArea
          id="blog-seo-desc"
          label="SEO description"
          rows={2}
          value={seoDescription}
          onChange={(e) => setSeoDescription(e.target.value)}
          maxLength={320}
          showCount
          disabled={submitting}
        />
        <TextInput
          id="blog-seo-kw"
          label="SEO keywords"
          value={seoKeywords}
          onChange={(e) => setSeoKeywords(e.target.value)}
          placeholder="nextjs, animation, typescript"
          hint="Comma separated"
          disabled={submitting}
        />
      </HudPanel>

      {/* Publish controls */}
      <HudPanel
        accent="green"
        notch="md"
        title="// PUBLISH"
        className="p-4 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <Select
            id="blog-status"
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as BlogStatus)}
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'published', label: 'Published' },
            ]}
            hint={
              status === 'published'
                ? 'Visible publicly and in the sitemap'
                : 'Hidden from the public site'
            }
            disabled={submitting}
          />

          <div className="pt-6">
            <Toggle
              id="blog-featured"
              label="Featured"
              checked={featured}
              onChange={setFeatured}
              hint="Highlight this post on the blog index"
              disabled={submitting}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-white/5">
          <NeonButton
            type="submit"
            accent="yellow"
            iconLeft={submitting ? undefined : <FiSave />}
            loading={submitting}
          >
            {submitting ? 'SAVING…' : initial ? 'UPDATE POST' : 'CREATE POST'}
          </NeonButton>
          <NeonButton
            type="button"
            variant="ghost"
            accent="cyan"
            iconLeft={<FiX />}
            onClick={onCancel}
            disabled={submitting}
          >
            CANCEL
          </NeonButton>
        </div>
      </HudPanel>
    </form>
  );
}
