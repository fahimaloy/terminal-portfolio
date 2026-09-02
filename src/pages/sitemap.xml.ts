import type { GetServerSideProps } from 'next';
import { supabaseAdmin } from '../utils/supabaseAdmin';

const SITE_URL = 'https://fahimaloy.dev';

interface UrlEntry {
  loc: string;
  lastmod?: string;
  changefreq: string;
  priority: string;
}

function buildXml(entries: UrlEntry[]): string {
  const urls = entries
    .map(
      (e) => `  <url>
    <loc>${e.loc}</loc>${
        e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ''
      }
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

/** Renders nothing — the XML is streamed in getServerSideProps. */
export default function Sitemap() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const entries: UrlEntry[] = [
    { loc: SITE_URL, changefreq: 'weekly', priority: '1.0' },
    { loc: `${SITE_URL}/blog`, changefreq: 'daily', priority: '0.9' },
  ];

  // Published blog posts only — never expose drafts to crawlers.
  if (supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from('blog_posts')
      .select('slug, updated_at, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    (data ?? []).forEach((row) => {
      const post = row as { slug: string; updated_at: string | null };
      entries.push({
        loc: `${SITE_URL}/blog/${post.slug}`,
        lastmod: post.updated_at ?? undefined,
        changefreq: 'monthly',
        priority: '0.8',
      });
    });
  }

  res.setHeader('Content-Type', 'text/xml; charset=utf-8');
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=3600, stale-while-revalidate=86400',
  );
  res.write(buildXml(entries));
  res.end();

  return { props: {} };
};
