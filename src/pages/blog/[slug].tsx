import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { ArrowLeft, ArrowRight, Clock, Eye, Calendar } from 'lucide-react';
import { createScope, animate, stagger } from 'animejs';
import SEOMeta from '../../components/SEOMeta';
import RichTextRenderer from '../../components/RichTextRenderer';
import ReadingProgress from '../../components/blog/ReadingProgress';
import LightningTransition from '../../components/blog/LightningTransition';
import BlogCard from '../../components/blog/BlogCard';
import {
  GlitchText,
  NeonButton,
  NeonChip,
  HudPanel,
} from '../../components/ui';
import { supabaseAdmin } from '../../utils/supabaseAdmin';
import type { BlogPost, BlogListItem } from '../../types/blog';
import { isReducedMotion } from '../../config/animations';

interface Props {
  post: BlogPost;
  prev: BlogListItem | null;
  next: BlogListItem | null;
  related: BlogListItem[];
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso)
    .toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
    .toUpperCase();
}

export default function BlogReaderPage({ post, prev, next, related }: Props) {
  const router = useRouter();
  const articleRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);

  const [boltTrigger, setBoltTrigger] = useState(0);
  const pendingHref = useRef<string | null>(null);

  // Hero entrance
  useEffect(() => {
    if (!heroRef.current || isReducedMotion()) return;

    const scope = createScope({ root: heroRef.current });
    scopeRef.current = scope;

    scope.add(() => {
      const bits = heroRef.current!.querySelectorAll('.reader-reveal');
      animate(bits, {
        opacity: [0, 1],
        y: [18, 0],
        duration: 480,
        ease: 'outExpo',
        delay: stagger(90),
      });
    });

    return () => scope.revert();
  }, [post.id]);

  // Parallax cover
  useEffect(() => {
    if (!coverRef.current || isReducedMotion()) return;
    let raf = 0;

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const el = coverRef.current;
        if (el) {
          el.style.transform = `translate3d(0, ${
            window.scrollY * 0.28
          }px, 0) scale(1.06)`;
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

  // Lightning-wrapped navigation between posts
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

      <article ref={articleRef} className="relative z-10 min-h-screen">
        {/* Full-screen hero */}
        <div
          ref={heroRef}
          className="relative min-h-screen flex flex-col justify-end overflow-hidden px-4 pb-16 pt-28"
        >
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
                className="w-full h-full object-cover opacity-30"
              />
            </div>
          )}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(10,10,10,0.75) 0%, rgba(10,10,10,0.5) 45%, rgba(10,10,10,0.97) 100%)',
            }}
          />

          <div className="relative max-w-3xl mx-auto w-full">
            <Link href="/blog" legacyBehavior>
              <a className="reader-reveal inline-flex items-center gap-2 font-display text-[10px] tracking-[3px] text-neon-cyan hover:text-neon-yellow transition-colors mb-6 opacity-0">
                <ArrowLeft size={12} /> BACK TO LOG
              </a>
            </Link>

            <div className="reader-reveal flex flex-wrap items-center gap-3 text-[10px] font-mono text-text-muted mb-4 opacity-0">
              <span className="inline-flex items-center gap-1">
                <Calendar size={10} /> {formatDate(post.published_at)}
              </span>
              {post.reading_minutes ? (
                <span className="inline-flex items-center gap-1">
                  <Clock size={10} /> {post.reading_minutes} MIN READ
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1">
                <Eye size={10} /> {post.view_count ?? 0} VIEWS
              </span>
            </div>

            <div className="reader-reveal opacity-0">
              <GlitchText
                as="h1"
                accent="cyan"
                className="text-3xl md:text-5xl"
              >
                {post.title}
              </GlitchText>
            </div>

            {post.excerpt && (
              <p className="reader-reveal font-body text-sm md:text-base text-text-secondary mt-5 max-w-2xl opacity-0">
                {post.excerpt}
              </p>
            )}

            {post.tags?.length > 0 && (
              <div className="reader-reveal flex flex-wrap gap-1.5 mt-5 opacity-0">
                {post.tags.map((tag) => (
                  <NeonChip key={tag} accent="magenta">
                    {tag.toUpperCase()}
                  </NeonChip>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="max-w-3xl mx-auto px-4 pb-20">
          <RichTextRenderer
            html={post.content_html}
            className="blog-prose font-body text-sm md:text-base text-text-secondary leading-relaxed"
          />

          {/* Prev / Next */}
          <nav className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-16">
            {prev ? (
              <button onClick={() => swapTo(prev.slug)} className="text-left">
                <HudPanel
                  accent="cyan"
                  notch="md"
                  className="p-4 h-full hover:scale-[1.01] transition-transform"
                >
                  <div className="text-[9px] font-display tracking-[3px] text-neon-cyan mb-1">
                    ◀ PREVIOUS
                  </div>
                  <div className="font-body text-xs text-text-primary line-clamp-2">
                    {prev.title}
                  </div>
                </HudPanel>
              </button>
            ) : (
              <div />
            )}
            {next ? (
              <button onClick={() => swapTo(next.slug)} className="text-right">
                <HudPanel
                  accent="magenta"
                  notch="md"
                  className="p-4 h-full hover:scale-[1.01] transition-transform"
                >
                  <div className="text-[9px] font-display tracking-[3px] text-neon-magenta mb-1">
                    NEXT ▶
                  </div>
                  <div className="font-body text-xs text-text-primary line-clamp-2">
                    {next.title}
                  </div>
                </HudPanel>
              </button>
            ) : (
              <div />
            )}
          </nav>

          {/* Related */}
          {related.length > 0 && (
            <section className="mt-16">
              <div className="text-[10px] font-display tracking-[4px] text-text-muted mb-4">
                {'// RELATED_TRANSMISSIONS'}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {related.map((r, i) => (
                  <BlogCard key={r.id} post={r} index={i} />
                ))}
              </div>
            </section>
          )}

          <div className="flex justify-center mt-14">
            <NeonButton
              accent="cyan"
              variant="outline"
              onClick={() => router.push('/blog')}
            >
              ALL POSTS
            </NeonButton>
          </div>
        </div>
      </article>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const slug = String(ctx.params?.slug ?? '');

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
