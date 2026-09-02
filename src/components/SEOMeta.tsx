import Head from 'next/head';
import { PortfolioProfile, PortfolioProject } from '../utils/api';
import type { BlogPost } from '../types/blog';

interface SEOMetaProps {
  title: string;
  description: string;
  image?: string;
  path?: string;
  profile?: PortfolioProfile | null;
  project?: PortfolioProject | null;
  blogPost?: BlogPost | null;
  /** Emit <meta name="robots" content="noindex"> (admin pages). */
  noindex?: boolean;
}

export default function SEOMeta({
  title,
  description,
  image,
  path = '/',
  profile,
  project,
  blogPost,
  noindex = false,
}: SEOMetaProps) {
  const siteUrl = 'https://fahimaloy.dev';
  const fullUrl = `${siteUrl}${path}`;
  const imageUrl = image || `${siteUrl}/og-image.png`;

  // Person structured data for homepage
  const personSchema = profile
    ? {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: profile.full_name,
        description: profile.bio || description,
        url: fullUrl,
        image: profile.avatar_url || imageUrl,
        sameAs: [
          profile.github ? `https://github.com/${profile.github}` : null,
          profile.linkedin
            ? `https://linkedin.com/in/${profile.linkedin}`
            : null,
        ].filter(Boolean),
        jobTitle: profile.title || undefined,
        email: profile.email || undefined,
      }
    : null;

  // Project structured data
  const projectSchema = project
    ? {
        '@context': 'https://schema.org',
        '@type': 'SoftwareSourceCode',
        name: project.title,
        description: project.description || undefined,
        image: project.image_url || undefined,
        url: project.project_url || undefined,
        codeRepository: project.repo_url || undefined,
        programmingLanguage: project.languages || undefined,
        keywords: project.tags?.join(', ') || undefined,
      }
    : null;

  // BlogPosting structured data
  const blogSchema = blogPost
    ? {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: blogPost.title,
        description: blogPost.seo_description || blogPost.excerpt || description,
        image: blogPost.cover_image_url || imageUrl,
        url: fullUrl,
        mainEntityOfPage: { '@type': 'WebPage', '@id': fullUrl },
        datePublished: blogPost.published_at || blogPost.created_at,
        dateModified: blogPost.updated_at,
        keywords:
          (blogPost.seo_keywords && blogPost.seo_keywords.join(', ')) ||
          blogPost.tags?.join(', ') ||
          undefined,
        wordCount: blogPost.reading_minutes
          ? blogPost.reading_minutes * 200
          : undefined,
        author: {
          '@type': 'Person',
          name: 'Fahim Ahmed',
          url: siteUrl,
        },
        publisher: {
          '@type': 'Person',
          name: 'Fahim Ahmed',
          url: siteUrl,
        },
      }
    : null;

  // Breadcrumbs for blog posts
  const breadcrumbSchema = blogPost
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Blog',
            item: `${siteUrl}/blog`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: blogPost.title,
            item: fullUrl,
          },
        ],
      }
    : null;

  // WebSite structured data
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: title,
    description,
    url: fullUrl,
    image: imageUrl,
  };

  return (
    <Head>
      <title>{title} | Fahimaloy Portfolio</title>
      <meta name="description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:type" content={blogPost ? 'article' : 'website'} />
      {blogPost && (
        <>
          <meta
            property="article:published_time"
            content={blogPost.published_at || blogPost.created_at}
          />
          <meta
            property="article:modified_time"
            content={blogPost.updated_at}
          />
          {blogPost.tags?.map((tag) => (
            <meta key={tag} property="article:tag" content={tag} />
          ))}
        </>
      )}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <link rel="canonical" href={fullUrl} />

      {personSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
        />
      )}
      {projectSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(projectSchema) }}
        />
      )}
      {blogSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
        />
      )}
      {breadcrumbSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </Head>
  );
}
