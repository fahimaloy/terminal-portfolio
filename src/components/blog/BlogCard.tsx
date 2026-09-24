// src/components/blog/BlogCard.tsx
/* ════════════════════════════════════════════════════════════════════════════════
   Blog listing card — premium editorial with retro surface.
   - Cover h-[44dvh] min 240px + tag shelf + reading time + excerpt clamp-3
   - Tilt3D off on mobile/reduced-motion (conditional render)
   - Token-only accent via ACCENT_CYCLE per index
   - No raw hex — all colors read var(--wash-*) / var(--retro-*)
   - Amber flash VFX handled by FlashCurtain in BlogReels on snap change
   - Premium hover states with glow, scale, and border transitions
   - Reading progress indicator on hover
═════════════════════════════════════════════════════════════════════════════════ */

import React, { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, Eye, Star, BookOpen } from 'lucide-react';
import { isReducedMotion, canAnimate } from '../../config/animations';
import { animate, stagger, createScope } from 'animejs';
import { BlogListItem } from '../../types/blog';
import HairlineDivider from '../ui/graphics/primitives/HairlineDivider';

interface Props {
  post: BlogListItem;
  index?: number;
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

// Inline date formatter — avoids formatDate import
function fmtDate(iso: string | null): string {
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
  const accent: CardAccent = ACCENT_CYCLE[index % ACCENT_CYCLE.length];
  const reduced = isReducedMotion();
  const animateEnabled = canAnimate();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);

  // Animate reading progress on hover
  useEffect(() => {
    if (!isHovered || reduced || !animateEnabled) {
      setReadingProgress(0);
      return;
    }

    let progress = 0;
    const interval = setInterval(() => {
      progress += 1;
      if (progress >= 100) {
        progress = 0;
      }
      setReadingProgress(progress);
    }, 80);

    return () => clearInterval(interval);
  }, [isHovered, reduced, animateEnabled]);

  // Entrance animation
  useEffect(() => {
    if (reduced || !animateEnabled || !cardRef.current) return;

    const scope = createScope({ root: cardRef.current });
    scope.add(() => {
      animate(cardRef.current!, {
        y: [20, 0],
        opacity: [0, 1],
        duration: 600,
        ease: 'outExpo',
        delay: index * 80,
      });
    });
    return () => scope.revert();
  }, [index, reduced, animateEnabled]);

  const handleMouseEnter = () => {
    if (!reduced && animateEnabled) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div
      ref={cardRef}
      className="rounded-[var(--radius-lg)] overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_var(--overlay-black-strong)]"
      style={{
        background: 'var(--overlay-card-bg-hover)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--overlay-card-border)',
        boxShadow:
          'inset 0 1px 0 var(--overlay-card-shadow-inner), 0 8px 32px var(--overlay-card-shadow-outer)',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link href={`/blog/${post.slug}`} legacyBehavior>
        <a className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2">
          <div
            className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)]"
            style={{
              background:
                'radial-gradient(circle at 20% 10%, var(--field-glow-cyan), transparent 35%), radial-gradient(circle at 90% 100%, var(--field-glow-magenta), transparent 45%), var(--bg-2)',
              boxShadow:
                '0 0 0 1px var(--field-glow-cyan), 0 16px 40px var(--overlay-black-soft)',
            }}
          >
            {/* Cover */}
            <div
              className="relative aspect-[4/3] min-h-[240px] overflow-hidden"
              style={{
                background: `radial-gradient(circle at 30% 20%, var(--field-glow-cyan), transparent 55%), var(--bg-3)`,
              }}
            >
              {post.cover_image_url ? (
                <Image
                  src={post.cover_image_url}
                  alt={post.cover_image_alt || post.title}
                  width={800}
                  height={600}
                  className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                  style={{ opacity: reduced ? 0.65 : 1 }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="font-display text-4xl text-[var(--fg-4)]">
                    {post.title.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {post.featured && (
                <div className="absolute top-2 left-2">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-[var(--radius-sm)] font-mono text-[9px] tracking-[0.14em] border"
                    style={{
                      background: 'var(--wash-cyan)',
                      borderColor: 'var(--neon-cyan)',
                      color: 'var(--fg-1)',
                    }}
                  >
                    <Star size={9} /> FEATURED
                  </span>
                </div>
              )}

              {/* Reading progress bar */}
              {!reduced && animateEnabled && (
                <div
                  className="absolute bottom-0 left-0 h-[3px] transition-all duration-200"
                  style={{
                    width: `${isHovered ? readingProgress : 0}%`,
                    background: 'var(--gradient-cyan-magenta)',
                    boxShadow: '0 0 8px var(--glow-cyan-sm)',
                    transformOrigin: 'left center',
                  }}
                />
              )}

              {/* Quick action hint */}
              {!reduced && animateEnabled && isHovered && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-[var(--radius-sm)] font-mono text-[9px] tracking-[0.14em] border"
                    style={{
                      background: 'var(--overlay-card-bg)',
                      borderColor: 'var(--glow-cyan-30)',
                      color: 'var(--fg-1)',
                      boxShadow: '0 4px 16px var(--glow-cyan-sm)',
                    }}
                  >
                    <BookOpen size={9} /> READ
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
                <span>{fmtDate(post.published_at)}</span>
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
                className="font-display text-sm tracking-wide leading-snug line-clamp-3 group-hover:text-[var(--neon-cyan)] transition-colors duration-200"
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
                      className="inline-flex px-2 py-0.5 rounded-full font-mono text-[9px] tracking-[0.14em] border group-hover:border-[var(--glow-cyan-30)] group-hover:text-[var(--neon-cyan)] transition-all duration-200"
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
    </div>
  );
}
