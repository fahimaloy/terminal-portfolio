// src/components/blog/BlogCard.tsx
/* Blog listing card — warm editorial. */

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, Eye, Star } from 'lucide-react';
import type { BlogListItem } from '../../types/blog';
import Tilt3D from '../ui/Tilt3D';
import HairlineDivider from '../ui/graphics/primitives/HairlineDivider';
import MorphOrb from '../ui/graphics/primitives/MorphOrb';

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

const ACCENT_CYCLE = [
  'yellow',
  'magenta',
  'cyan',
  'green',
  'purple',
  'blue',
] as const;
type CardAccent = (typeof ACCENT_CYCLE)[number];

export default function BlogCard({ post, index = 0 }: Props) {
  const accent: CardAccent = ACCENT_CYCLE[index % ACCENT_CYCLE.length];

  return (
    <Tilt3D intensity={4}>
      <Link href={`/blog/${post.slug}`} legacyBehavior>
        <a
          className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-[var(--radius-lg)]"
          style={
            {
              ['--tw-ring-color' as string]: 'var(--border-strong)',
            } as React.CSSProperties
          }
          aria-label={`Read ${post.title}`}
        >
          <div
            className="relative overflow-hidden h-full rounded-[var(--radius-lg)] border transition-transform duration-200 hover:scale-[1.01]"
            style={{
              background: 'var(--bg-2)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {/* Inset MorphOrb chrome — token-only, muted */}
            <div
              className="pointer-events-none absolute top-2 right-2 opacity-[0.12]"
              aria-hidden="true"
            >
              <MorphOrb accent={accent} size={48} />
            </div>

            {/* Cover */}
            <div
              className="relative aspect-video overflow-hidden"
              style={{ background: 'var(--bg-3)' }}
            >
              {post.cover_image_url ? (
                <Image
                  src={post.cover_image_url}
                  alt={post.cover_image_alt || post.title}
                  width={400}
                  height={225}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span
                    className="font-display text-3xl"
                    style={{ color: 'var(--fg-4)' }}
                  >
                    {post.title.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {post.featured && (
                <div className="absolute top-2 left-2">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-[var(--radius-sm)] font-mono text-[9px] tracking-[0.14em] border"
                    style={{
                      background: 'var(--bg-2)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--fg-2)',
                    }}
                  >
                    <Star size={9} /> FEATURED
                  </span>
                </div>
              )}
            </div>

            <HairlineDivider className="opacity-60" accent={accent} />

            {/* Body */}
            <div className="p-4 space-y-2">
              <div
                className="flex items-center gap-3 text-[9px] font-mono"
                style={{ color: 'var(--fg-4)' }}
              >
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

              <h3
                className="font-display text-sm tracking-wide leading-snug line-clamp-2"
                style={{ color: 'var(--fg-1)' }}
              >
                {post.title}
              </h3>

              {(post.teaser ?? post.excerpt) && (
                <p
                  className="text-[11px] font-body line-clamp-3"
                  style={{ color: 'var(--fg-3)' }}
                >
                  {post.teaser ?? post.excerpt}
                </p>
              )}

              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex px-2 py-0.5 rounded-full font-mono text-[9px] tracking-[0.14em] border"
                      style={{
                        background: 'var(--bg-3)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--fg-3)',
                      }}
                    >
                      {tag.toUpperCase()}
                    </span>
                  ))}
                  {post.tags.length > 3 && (
                    <span
                      className="inline-flex px-2 py-0.5 rounded-full font-mono text-[9px] tracking-[0.14em] border"
                      style={{
                        background: 'var(--bg-3)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--fg-3)',
                      }}
                    >
                      +{post.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </a>
      </Link>
    </Tilt3D>
  );
}
