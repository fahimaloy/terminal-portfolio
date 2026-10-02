// src/components/blog/BlogCard.tsx
/* ════════════════════════════════════════════════════════════════════════════════
   Blog listing card — warm editorial, matte surface.
   Rendered only inside the [data-theme='editorial'] scope that /blog sets, so
   amber is already the page signal and the type comes from the body face.

   - Cover aspect-[4/3] min 240px + tag shelf + reading time + excerpt clamp-3
   - No glass and no neon ring: a matte plate with one warm key wash, so the
     grid reads as a shelf of printed cards rather than a wall of HUD tiles
   - Accent comes from the shared AccentColor union, weighted warm-first
   - No raw hex — all colors read var(--wash-*) / var(--glow-*) / var(--bg-*)
   - Amber flash VFX handled by FlashCurtain in BlogReels on snap change
   - Reading progress indicator on hover
═════════════════════════════════════════════════════════════════════════════════ */

import React, { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, Eye, Star, BookOpen } from 'lucide-react';
import { useMotionPreference } from '../../hooks/useMotionPreference';
import { animate, stagger, createScope } from 'animejs';
import { durations, easings } from '../../config/animations';
import type { AccentColor } from '../../config/animations';
import { BlogListItem } from '../../types/blog';
import { formatDate } from '../../utils/dateFormat';
import HairlineDivider from '../ui/graphics/primitives/HairlineDivider';

interface Props {
  post: BlogListItem;
  index?: number;
}

// Warm-first, so a grid that starts at index 0 leads with amber and lime and
// only meets the cool accents further in. Still exactly the six site accents.
const ACCENT_CYCLE = [
  'amber',
  'lime',
  'ice',
  'coral',
  'violet',
  'cyan',
] as const;

export default function BlogCard({ post, index = 0 }: Props) {
  const accent: AccentColor = ACCENT_CYCLE[index % ACCENT_CYCLE.length];
  // Render-time motion state must be mount-gated: isReducedMotion() is false
  // on the server and the user's real preference in the browser, so reading it
  // during render made this card's cover opacity and its two conditional
  // children differ between SSR and hydration.
  const { reduced, canAnimate: animateEnabled } = useMotionPreference();
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
        duration: durations.enter * 1000 * 0.95,
        ease: easings.expoOut,
        delay: index * (durations.stagger * 1000 * 1.3),
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
        // Matte plate, not glass. A warm key wash in the corner reads as lamp
        // light on paper; the inset hairline is the only "edge light" a card
        // needs now that the frame no longer carries a neon ring.
        background:
          'radial-gradient(120% 90% at 14% 0%, var(--wash-amber), transparent 46%), var(--bg-2)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'inset 0 1px 0 var(--wash-amber-strong)',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link href={`/blog/${post.slug}`} legacyBehavior>
        {/* Ring colour is explicit, not Tailwind's stock default. An unstated
            `focus-visible:ring-2` resolves --tw-ring-color to blue-500 and
            --tw-ring-offset-color to white, which is a blue ring with a white
            halo on a matte amber plate. token-lint cannot see this (it only
            knows about raw hex/rgba and stock colour utilities), and
            tailwind.config.js never sets `ringColor`, so the two colours have
            to be named here. The offset sits on the --bg-2 page shell, which is
            what actually paints behind the card's edge. */}
        <a className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-amber)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-2)]">
          <div
            className="relative overflow-hidden rounded-[var(--radius-lg)]"
            style={{
              background:
                'radial-gradient(120% 100% at 10% 0%, var(--wash-amber), transparent 52%), var(--bg-2)',
            }}
          >
            {/* Cover */}
            <div
              className="relative aspect-[4/3] min-h-[240px] overflow-hidden"
              style={{
                background: `radial-gradient(circle at 30% 20%, var(--wash-amber), transparent 58%), var(--bg-3)`,
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
                  {/* DECORATIVE ONLY. This is a cover-image stand-in initial,
                      not reading copy — the real title renders further down the
                      card. At text-4xl it is large text, where --fg-4
                      (4.65:1 on --bg-2) clears the 3:1 AA threshold with room
                      to spare, so it stays on the weakest ramp step on
                      purpose. Do not promote it. */}
                  <span className="font-display text-4xl text-[var(--fg-4)]">
                    {post.title.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {post.featured && (
                <div className="absolute top-2 left-2">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-[var(--radius-sm)] font-mono text-[11px] tracking-[0.1em] border"
                    style={{
                      background: 'var(--wash-amber)',
                      borderColor: 'var(--glow-amber-sm)',
                      color: 'var(--neon-amber)',
                    }}
                  >
                    <Star size={10} /> Featured
                  </span>
                </div>
              )}

              {/* Reading progress bar */}
              {!reduced && animateEnabled && (
                <div
                  className="absolute bottom-0 left-0 h-[3px] transition-all duration-200"
                  style={{
                    width: `${isHovered ? readingProgress : 0}%`,
                    background:
                      'linear-gradient(90deg, var(--neon-amber), var(--neon-lime))',
                    boxShadow: '0 0 8px var(--glow-amber-sm)',
                    transformOrigin: 'left center',
                  }}
                />
              )}

              {/* Quick action hint */}
              {!reduced && animateEnabled && isHovered && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-[var(--radius-sm)] font-mono text-[11px] tracking-[0.1em] border"
                    style={{
                      background: 'var(--bg-2)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--fg-2)',
                      boxShadow: '0 4px 16px var(--overlay-black-medium)',
                    }}
                  >
                    <BookOpen size={10} /> Read
                  </span>
                </div>
              )}
            </div>

            <HairlineDivider className="opacity-60" accent={accent} />

            {/* Body */}
            <div className="p-4 space-y-2">
              {/* Meta line: 11px, not 9px. At the old size this row sat under
                  4.5:1 against a live animated background no matter which
                  foreground step it used (P2.2). */}
              <div
                className="flex items-center gap-3 text-[11px] font-mono"
                style={{ color: 'var(--fg-3)' }}
              >
                <span>{formatDate(post.published_at)}</span>
                {post.reading_minutes ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock size={10} /> {post.reading_minutes} MIN
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1">
                  <Eye size={10} /> {post.view_count ?? 0}
                </span>
              </div>

              <h3
                className="font-body text-base font-semibold tracking-[-0.01em] leading-snug line-clamp-3 group-hover:text-[var(--neon-amber)] transition-colors duration-200"
                style={{ color: 'var(--fg-1)' }}
              >
                {post.title}
              </h3>

              {(post.teaser ?? post.excerpt) && (
                <p
                  className="text-[13px] font-body leading-relaxed line-clamp-3"
                  style={{ color: 'var(--fg-2)' }}
                >
                  {post.teaser ?? post.excerpt}
                </p>
              )}

              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex px-2 py-0.5 rounded-full font-mono text-[11px] tracking-[0.08em] border group-hover:border-[var(--glow-amber-sm)] group-hover:text-[var(--neon-amber)] transition-all duration-200"
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
                      className="inline-flex px-2 py-0.5 rounded-full font-mono text-[11px] tracking-[0.08em] border"
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
