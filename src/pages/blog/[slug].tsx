import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { ArrowLeft, Clock, Eye, Calendar } from 'lucide-react';
import {
  createScope,
  animate,
  stagger,
  createTimeline,
  createDrawable,
  spring,
} from 'animejs';
import { splitText } from 'animejs';
import SEOMeta from '../../components/SEOMeta';
import RichTextRenderer from '../../components/RichTextRenderer';
import ReadingProgress from '../../components/blog/ReadingProgress';
import LightningTransition from '../../components/blog/LightningTransition';
import BlogCard from '../../components/blog/BlogCard';
import type { BlogPost, BlogListItem } from '../../types/blog';
import {
  isReducedMotion,
  canAnimate,
  durations,
  easings,
  springs,
} from '../../config/animations';
import { HairlineDivider } from '../../components/ui/graphics';
import { formatDate } from '../../utils/dateFormat';

interface Props {
  post: BlogPost;
  prev: BlogListItem | null;
  next: BlogListItem | null;
  related: BlogListItem[];
}

export default function BlogReaderPage({ post, prev, next, related }: Props) {
  const router = useRouter();
  const articleRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);

  const [boltTrigger, setBoltTrigger] = useState(0);
  const pendingHref = useRef<string | null>(null);

  // Hero entrance — premium: splitText title cascade + meta drawable rule + aurora wash
  useEffect(() => {
    const root = heroRef.current;
    if (!root) return;
    const reduced = isReducedMotion() || !canAnimate();

    const scope = createScope({
      root,
      mediaQueries: { reduceMotion: '(prefers-reduced-motion: reduce)' },
      defaults: {
        duration: (durations.enter ?? 0.48) * 1000,
        ease: (easings.smooth ?? easings.outExpo ?? 'outExpo') as string,
        composition: 'blend',
      },
    } as Parameters<typeof createScope>[0]);

    let titleSplitter: ReturnType<typeof splitText> | null = null;

    scope.add(() => {
      const backLink = root.querySelectorAll<HTMLElement>('.reader-back');
      const meta = root.querySelectorAll<HTMLElement>('.reader-meta');
      const titleEl = root.querySelector<HTMLElement>('.reader-title');
      const excerptEl = root.querySelectorAll<HTMLElement>('.reader-excerpt');
      const tagsWrap = root.querySelectorAll<HTMLElement>('.reader-tags');
      const tagChips = root.querySelectorAll<HTMLElement>('.reader-tag');
      const hairlineLines = root.querySelectorAll<SVGGeometryElement>(
        '.reader-hairline line',
      );
      const hairlineWraps =
        root.querySelectorAll<HTMLElement>('.reader-hairline');
      const auroraWash = root.querySelectorAll<HTMLElement>('.reader-aurora');

      if (reduced) {
        const tl = createTimeline({
          defaults: { ease: (easings.outExpo ?? 'outExpo') as string },
        } as any);
        if (backLink.length)
          tl.add(
            backLink as unknown as HTMLElement[],
            {
              y: [12, 0],
              opacity: [0, 1],
              duration: durations.enter * 1000 * 0.65,
            } as any,
            0,
          );
        if (meta.length)
          tl.add(
            meta as unknown as HTMLElement[],
            {
              y: [12, 0],
              opacity: [0, 1],
              duration: durations.enter * 1000 * 0.72,
            } as any,
            stagger(durations.stagger * 1000 * 1.17),
          );
        if (hairlineWraps.length)
          tl.add(
            hairlineWraps as unknown as HTMLElement[],
            {
              opacity: [0, 1],
              duration: durations.enter * 1000 * 0.4,
            } as any,
            stagger(durations.stagger * 1000 * 0.67),
          );
        if (titleEl)
          tl.add(
            titleEl as unknown as HTMLElement,
            {
              y: [14, 0],
              opacity: [0, 1],
              duration: durations.enter * 1000 * 0.81,
            } as any,
            stagger(durations.stagger * 1000 * 1.17),
          );
        if (excerptEl.length)
          tl.add(
            excerptEl as unknown as HTMLElement[],
            {
              y: [12, 0],
              opacity: [0, 1],
              duration: durations.enter * 1000 * 0.69,
            } as any,
            stagger(durations.stagger * 1000 * 1.17),
          );
        if (tagsWrap.length)
          tl.add(
            tagsWrap as unknown as HTMLElement[],
            {
              opacity: [0, 1],
              duration: durations.enter * 1000 * 0.5,
            } as any,
            stagger(durations.stagger * 1000 * 0.67),
          );
        if (tagChips.length)
          tl.add(
            tagChips as unknown as HTMLElement[],
            {
              y: [8, 0],
              opacity: [0, 1],
              duration: durations.enter * 1000 * 0.63,
            } as any,
            stagger(durations.stagger * 1000 * 0.5, { from: 'first' }),
          );
        if (auroraWash.length)
          tl.add(
            auroraWash as unknown as HTMLElement[],
            {
              opacity: [0, 1],
              duration: durations.enter * 1000 * 0.53,
            } as any,
            0,
          );
        return;
      }

      const tl = createTimeline({
        defaults: { ease: (easings.smooth ?? 'outExpo') as string },
      } as any);

      const softSpring = spring(
        springs.soft as unknown as Record<string, number>,
      ) as unknown as string;

      if (backLink.length) {
        tl.add(
          backLink as unknown as HTMLElement[],
          {
            y: [14, 0],
            opacity: [0, 1],
            duration: (durations.enter ?? 0.48) * 1000 * 0.55,
            ease: (easings.smooth ?? 'outExpo') as string,
          } as any,
          0,
        );
      }
      if (meta.length) {
        tl.add(
          meta as unknown as HTMLElement[],
          {
            y: [12, 0],
            opacity: [0, 1],
            duration: (durations.enter ?? 0.48) * 1000 * 0.5,
            ease: (easings.smooth ?? 'outExpo') as string,
          } as any,
          stagger(durations.stagger * 1000 * 1.17),
        );
      }

      if (auroraWash.length) {
        tl.add(
          auroraWash as unknown as HTMLElement[],
          {
            opacity: [0, 1],
            duration: (durations.enter ?? 0.48) * 1000 * 0.6,
            ease: (easings.smooth ?? 'outExpo') as string,
          } as any,
          0,
        );
      }

      const hairlineDrawable = hairlineLines.length
        ? (createDrawable('.reader-hairline line') as unknown as HTMLElement[])
        : ([] as unknown as HTMLElement[]);
      if ((hairlineDrawable as unknown as unknown[]).length) {
        tl.add(
          hairlineDrawable as unknown as HTMLElement[],
          {
            draw: ['0 0', '0 1'],
            duration: (durations.draw ?? 1.2) * 1000,
            ease: (easings.smooth ?? 'linear') as string,
          } as any,
          stagger(durations.stagger * 1000 * 0.67, { from: 'first' }),
        );
        if (hairlineWraps.length) {
          tl.add(
            hairlineWraps as unknown as HTMLElement[],
            {
              opacity: [0, 1],
              duration: (durations.enter ?? 0.48) * 1000 * 0.32,
              ease: (easings.smooth ?? 'outExpo') as string,
            } as any,
            '-220',
          );
        }
      } else if (hairlineWraps.length) {
        tl.add(
          hairlineWraps as unknown as HTMLElement[],
          {
            opacity: [0, 1],
            scaleX: [0, 1],
            duration: (durations.hover ?? 0.24) * 1000,
            ease: (easings.smooth ?? 'outExpo') as string,
          } as any,
          stagger(durations.stagger * 1000 * 0.67),
        );
      }

      try {
        if (titleEl) {
          titleSplitter = splitText(titleEl, {
            chars: true,
            words: { wrap: 'clip' },
          });
        }
      } catch {
        titleSplitter = null;
      }
      const titleChars =
        (titleSplitter?.chars as unknown as HTMLElement[]) ?? [];
      if (titleChars.length) {
        tl.add(
          titleChars as unknown as HTMLElement[],
          {
            y: ['112%', '0%'],
            opacity: [0, 1],
            duration: (durations.enter ?? 0.48) * 1000 * 0.56,
            ease: (easings.expoOut ?? easings.outExpo ?? 'outExpo') as string,
            delay: stagger(durations.stagger * 1000 * 0.33, { from: 'first' }),
          } as any,
          stagger(durations.stagger * 1000 * 1.17),
        );
      } else if (titleEl) {
        tl.add(
          titleEl as unknown as HTMLElement,
          {
            y: [16, 0],
            opacity: [0, 1],
            duration: (durations.enter ?? 0.48) * 1000 * 0.55,
            ease: softSpring ?? (easings.smooth as string),
          } as any,
          stagger(durations.stagger * 1000 * 1.17),
        );
      }

      if (excerptEl.length) {
        tl.add(
          excerptEl as unknown as HTMLElement[],
          {
            y: [12, 0],
            opacity: [0, 1],
            duration: (durations.enter ?? 0.48) * 1000 * 0.81,
            ease: softSpring ?? (easings.smooth as string),
          } as any,
          stagger(durations.stagger * 1000 * 1.17),
        );
      }

      if (tagChips.length) {
        tl.add(
          tagChips as unknown as HTMLElement[],
          {
            y: [10, 0],
            opacity: [0, 1],
            scale: [0.98, 1],
            duration: (durations.enter ?? 0.48) * 1000 * 0.69,
            ease: softSpring ?? (easings.smooth as string),
            delay: stagger(durations.stagger * 1000 * 0.37, { from: 'first' }),
          } as any,
          stagger(durations.stagger * 1000, { from: 'first' }),
        );
      } else if (tagsWrap.length) {
        tl.add(
          tagsWrap as unknown as HTMLElement[],
          {
            y: [10, 0],
            opacity: [0, 1],
            duration: (durations.enter ?? 0.48) * 1000 * 0.72,
            ease: softSpring ?? (easings.smooth as string),
          } as any,
          stagger(durations.stagger * 1000 * 1.17),
        );
      }

      void canAnimate;
    });

    return () => {
      try {
        titleSplitter?.revert();
      } catch {}
      scope.revert();
    };
  }, [post.id]);

  // Parallax cover — subtle, muted
  useEffect(() => {
    if (!coverRef.current || isReducedMotion()) return;
    let raf = 0;

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const el = coverRef.current;
        if (el) {
          el.style.transform = `translate3d(0, ${
            window.scrollY * 0.18
          }px, 0) scale(1.04)`;
        }
        raf = 0;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [post.id]);

  // Lightning-wrapped navigation between posts (muted wipe)
  const swapTo = useCallback((slug: string) => {
    pendingHref.current = `/blog/${slug}`;
    setBoltTrigger((t) => t + 1);
  }, []);

  const handleMidpoint = useCallback(() => {
    if (pendingHref.current) {
      router.push(pendingHref.current);
      pendingHref.current = null;
    }
  }, [router]);

  return (
    <>
      <SEOMeta
        title={post.seo_title || post.title}
        description={post.seo_description || post.excerpt || post.title}
        image={post.cover_image_url || undefined}
        path={`/blog/${post.slug}`}
        blogPost={post}
      />

      <ReadingProgress targetRef={articleRef} />
      <LightningTransition trigger={boltTrigger} onMidpoint={handleMidpoint} />

      {/* `relative`, no z-index — the page-root half of the contract stated in
          `_app.tsx` and of the identical note on `blog/index.tsx`. A page root
          must not open a stacking context, or the overlays it renders get
          trapped in a band the shell's fixed accent strip, mounted OUTSIDE at
          `z-[var(--z-hud)]`, can never out-rank. Nothing in the reading flow
          depends on the z-index it used to carry: `--z-hud` already paints the
          strip above ordinary page content, and the stage it lives in already
          sits above the scene.

          The lightning flash above is deliberately OUTSIDE this article, which
          is what lets its `z-80` full-screen page turn cover the strip (and the
          shell's `z-[85]` curtain above it) with no ancestor z-index in the
          way. Its `trigger`/`onMidpoint` timing is load-bearing — the
          midpoint is where `router.push` fires for post-to-post navigation —
          and is untouched. */}
      <article
        ref={articleRef}
        className="relative min-h-screen"
        data-theme="editorial"
      >
        {/* Full-screen hero — premium: aurora wash + parallax cover + splitText title + drawable rule */}
        <div
          ref={heroRef}
          className="relative min-h-screen flex flex-col justify-end overflow-hidden px-4 pb-16 pt-28"
        >
          {/* Soft aurora wash behind cover — token-only var(--aurora-*) */}
          <div
            aria-hidden="true"
            className="reader-aurora pointer-events-none absolute inset-0 reveal overflow-hidden"
          >
            <div
              style={{
                position: 'absolute',
                top: '-8%',
                left: '-6%',
                width: '58%',
                height: '56%',
                borderRadius: '9999px',
                background:
                  'radial-gradient(ellipse at center, var(--aurora-1) 0%, transparent 72%)',
                filter: 'blur(64px)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '-6%',
                right: '-8%',
                width: '48%',
                height: '52%',
                borderRadius: '9999px',
                background:
                  'radial-gradient(ellipse at center, var(--aurora-2) 0%, transparent 72%)',
                filter: 'blur(56px)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '-10%',
                left: '10%',
                width: '52%',
                height: '48%',
                borderRadius: '9999px',
                background:
                  'radial-gradient(ellipse at center, var(--aurora-3) 0%, transparent 72%)',
                filter: 'blur(48px)',
              }}
            />
          </div>
          {/* Parallax cover */}
          {post.cover_image_url && (
            <div
              ref={coverRef}
              className="absolute inset-0 will-change-transform"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.cover_image_url}
                alt={post.cover_image_alt || post.title}
                className="w-full h-full object-cover opacity-[0.28]"
              />
            </div>
          )}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, var(--overlay-void-75) 0%, var(--overlay-void-50) 45%, var(--overlay-void-97) 100%)',
            }}
          />

          <div className="relative max-w-3xl mx-auto w-full">
            <Link href="/blog" legacyBehavior>
              <a
                className="reader-back inline-flex items-center gap-2 min-h-[44px] min-w-[44px] font-mono text-[11px] tracking-[0.1em] mb-6 reveal transition-colors hover:opacity-80"
                style={{ color: 'var(--fg-3)' }}
              >
                <ArrowLeft size={13} /> Back to the archive
              </a>
            </Link>

            <div
              className="reader-meta flex flex-wrap items-center gap-3 text-[11px] font-mono mb-4 reveal"
              style={{ color: 'var(--fg-3)' }}
            >
              <span className="inline-flex items-center gap-1">
                <Calendar size={11} />{' '}
                {/* Article page deliberately departs from formatDate's DRAFT/
                    short-month defaults: a missing date renders nothing, and
                    the wider measure takes the long month name. */}
                {formatDate(post.published_at, { empty: '', month: 'long' })}
              </span>
              {post.reading_minutes ? (
                <span className="inline-flex items-center gap-1">
                  <Clock size={11} /> {post.reading_minutes} min read
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1">
                <Eye size={11} /> {post.view_count ?? 0} views
              </span>
            </div>

            {/* Drawable hairline rule under meta — animated via createDrawable draw ['0 0','0 1'] */}
            <HairlineDivider className="reader-hairline w-full max-w-xl mb-5 reveal" />

            {/* The blog's one display voice — the hero wordmark's recipe
                (NAME_TYPE in HeroSection): mono at display size, medium weight,
                +0.01em tracking, 1.14 leading. Sentence case, never upper-cased;
                mono never takes negative tracking. */}
            <h1
              className="reader-title font-mono font-medium tracking-[0.01em] leading-[1.14] text-[clamp(1.875rem,6vw,3.25rem)] reveal"
              style={{ color: 'var(--fg-1)' }}
            >
              {post.title}
            </h1>

            {post.excerpt && (
              <p
                className="reader-excerpt font-body text-sm md:text-base mt-5 max-w-2xl leading-relaxed reveal"
                style={{ color: 'var(--fg-2)' }}
              >
                {post.excerpt}
              </p>
            )}

            {post.tags?.length > 0 && (
              <div className="reader-tags flex flex-wrap gap-1.5 mt-5 reveal">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="reader-tag inline-flex px-2.5 py-1 rounded-full font-mono text-[11px] tracking-[0.1em] border reveal"
                    style={{
                      background: 'var(--bg-2)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--fg-3)',
                    }}
                  >
                    {tag.toUpperCase()}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="max-w-3xl mx-auto px-4 pb-20">
          <RichTextRenderer
            html={post.content_html}
            className="rich-prose font-body text-sm md:text-base leading-relaxed mx-auto max-w-[68ch]"
          />

          {/* Prev / Next — editorial cards, no HudPanel/Neon */}
          <nav className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-16">
            {prev ? (
              <button
                onClick={() => swapTo(prev.slug)}
                className="text-left group"
              >
                <div
                  className="p-4 h-full rounded-[var(--radius-lg)] border transition-colors duration-200 hover:border-[var(--border-strong)]"
                  style={{
                    background: 'var(--bg-2)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div
                    className="text-[11px] font-mono tracking-[0.1em] mb-1"
                    style={{ color: 'var(--fg-3)' }}
                  >
                    {'\u25C0 Previous'}
                  </div>
                  <div
                    className="font-body font-semibold text-sm line-clamp-2"
                    style={{ color: 'var(--fg-1)' }}
                  >
                    {prev.title}
                  </div>
                </div>
              </button>
            ) : (
              <div />
            )}
            {next ? (
              <button
                onClick={() => swapTo(next.slug)}
                className="text-right group"
              >
                <div
                  className="p-4 h-full rounded-[var(--radius-lg)] border transition-colors duration-200 hover:border-[var(--border-strong)]"
                  style={{
                    background: 'var(--bg-2)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div
                    className="text-[11px] font-mono tracking-[0.1em] mb-1"
                    style={{ color: 'var(--fg-3)' }}
                  >
                    {'Next \u25B6'}
                  </div>
                  <div
                    className="font-body font-semibold text-sm line-clamp-2"
                    style={{ color: 'var(--fg-1)' }}
                  >
                    {next.title}
                  </div>
                </div>
              </button>
            ) : (
              <div />
            )}
          </nav>

          {/* Related */}
          {related.length > 0 && (
            <section className="mt-16">
              <div
                className="text-[12px] font-mono tracking-[0.1em] mb-4"
                style={{ color: 'var(--fg-3)' }}
              >
                {'// Related reading'}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {related.map((r, i) => (
                  <BlogCard key={r.id} post={r} index={i} />
                ))}
              </div>
            </section>
          )}

          <div className="flex justify-center mt-14">
            <button
              onClick={() => router.push('/blog')}
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-5 py-2.5 font-body text-sm border rounded-[var(--radius-md)] transition-colors duration-200 hover:border-[var(--glow-amber-sm)] hover:text-[var(--neon-amber)]"
              style={{
                background: 'transparent',
                borderColor: 'var(--border-subtle)',
                color: 'var(--fg-2)',
              }}
            >
              All posts
            </button>
          </div>
        </div>
      </article>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const slug = String(ctx.params?.slug ?? '');

  // Required here, inside the function, not at module top level: a top-level
  // import of the server-only Supabase client lands in the client bundle.

  const { supabaseAdmin } = await import('../../utils/supabaseAdmin');

  if (!supabaseAdmin || !slug) {
    return { notFound: true };
  }

  const { data: post } = await supabaseAdmin
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (!post) {
    return { notFound: true };
  }

  const typed = post as unknown as BlogPost;
  const anchor = typed.published_at ?? typed.created_at;

  const cols =
    'id, slug, title, excerpt, cover_image_url, cover_image_alt, status, featured, tags, reading_minutes, view_count, seo_title, seo_description, seo_keywords, canonical_url, published_at, created_at, updated_at';

  const [prevRes, nextRes, relatedRes] = await Promise.all([
    supabaseAdmin
      .from('blog_posts')
      .select(cols)
      .eq('status', 'published')
      .lt('published_at', anchor)
      .order('published_at', { ascending: false })
      .limit(1),
    supabaseAdmin
      .from('blog_posts')
      .select(cols)
      .eq('status', 'published')
      .gt('published_at', anchor)
      .order('published_at', { ascending: true })
      .limit(1),
    typed.tags?.length
      ? supabaseAdmin
          .from('blog_posts')
          .select(cols)
          .eq('status', 'published')
          .neq('id', typed.id)
          .overlaps('tags', typed.tags)
          .order('published_at', { ascending: false })
          .limit(3)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  // Best-effort view increment.
  void supabaseAdmin
    .from('blog_posts')
    .update({ view_count: (typed.view_count ?? 0) + 1 })
    .eq('id', typed.id);

  return {
    props: {
      post: typed,
      prev: ((prevRes.data ?? [])[0] ?? null) as BlogListItem | null,
      next: ((nextRes.data ?? [])[0] ?? null) as BlogListItem | null,
      related: (relatedRes.data ?? []) as unknown as BlogListItem[],
    },
  };
};
