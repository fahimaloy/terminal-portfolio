import Head from 'next/head';
import { PortfolioProfile, PortfolioProject } from '../utils/api';

interface SEOMetaProps {
  title: string;
  description: string;
  image?: string;
  path?: string;
  profile?: PortfolioProfile | null;
  project?: PortfolioProject | null;
}

export default function SEOMeta({ title, description, image, path = '/', profile, project }: SEOMetaProps) {
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
          profile.linkedin ? `https://linkedin.com/in/${profile.linkedin}` : null,
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
      <meta property="og:type" content="website" />
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </Head>
  );
}