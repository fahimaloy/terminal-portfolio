// src/components/blog/BlogCard.tsx
/* Blog listing card — HUD panel styling, 3D tilt, neon tag chips. */

import React from 'react';
import Link from 'next/link';
import { Clock, Eye, Star } from 'lucide-react';
import type { BlogListItem } from '../../types/blog';
import { HudPanel, NeonChip, Tilt3D } from '../ui';

const ACCENTS = ['cyan', 'magenta', 'yellow', 'green'] as const;

interface Props {
  post: BlogListItem;
  index?: number;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'DRAFT';
  return new Date(iso)
    .toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    .toUpperCase();
}

export default function BlogCard({ post, index = 0 }: Props) {
  const accent = ACCENTS[index % ACCENTS.length];

  return (
    <Tilt3D intensity={4}>
      <Link href={`/blog/${post.slug}`} legacyBehavior>
        <a
          className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-bg-void"
          aria-label={`Read ${post.title}`}
        >
          <HudPanel
            accent={accent}
            notch="md"
            title={`// LOG_${String(post.id).padStart(3, '0')}`}
            className="overflow-hidden h-full transition-transform duration-200 hover:scale-[1.015]"
          >
            {/* Cover */}
            <div className="relative aspect-video overflow-hidden bg-black/40">
              {post.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.cover_image_url}
                  alt={post.cover_image_alt || post.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="font-display text-3xl text-text-muted">
                    {post.title.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {post.featured && (
                <div className="absolute top-2 left-2">
                  <NeonChip accent="yellow" icon={<Star size={9} />}>
                    FEATURED
                  </NeonChip>
                </div>
              )}
            </div>

            {/* Body */}
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-3 text-[9px] font-mono text-text-muted">
                <span>{formatDate(post.published_at)}</span>
                {post.reading_minutes ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock size={9} /> {post.reading_minutes} MIN
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1">
                  <Eye size={9} /> {post.view_count ?? 0}
                </span>
              </div>

              <h3 className="font-display text-sm text-text-primary tracking-wider leading-snug line-clamp-2">
                {post.title}
              </h3>

              {post.excerpt && (
                <p className="text-[11px] font-body text-text-secondary line-clamp-3">
                  {post.excerpt}
                </p>
              )}

              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {post.tags.slice(0, 3).map((tag) => (
                    <NeonChip key={tag} accent="cyan">
                      {tag.toUpperCase()}
                    </NeonChip>
                  ))}
                  {post.tags.length > 3 && (
                    <NeonChip accent="magenta">
                      +{post.tags.length - 3}
                    </NeonChip>
                  )}
                </div>
              )}
            </div>
          </HudPanel>
        </a>
      </Link>
    </Tilt3D>
  );
}
