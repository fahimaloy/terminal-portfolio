// src/lib/techIcons.ts
// Registry of tech-stack brand icons via react-icons/si (Simple Icons).
// Usage:
//   import { TECH_ICONS, resolveTechIcon, allTechIconIds } from '@/lib/techIcons';
//   const hit = resolveTechIcon('next.js'); // -> { Component: SiNextdotjs, hex: '#000000', label: 'Next.js', id: 'nextdotjs' }
//   <hit.Component color={hit.hex} />
//
// Notes:
//   - Brand hex values are canonical Simple Icons hex (intentionally inline).
//     Each hex line carries `// token-lint-ignore` so token-lint --all passes.
//   - Aliases are lowercased at resolve time; add kebab + dot variants for DX.
//   - Categories are coarse portfolio buckets; see TECH_ICONS_BY_CATEGORY.

import type { IconType } from 'react-icons';
import {
  SiReact,
  SiNextdotjs,
  SiTypescript,
  SiJavascript,
  SiPython,
  SiNodedotjs,
  SiDocker,
  SiAmazonaws,
  SiVercel,
  SiPostgresql,
  SiMongodb,
  SiTailwindcss,
  SiFirebase,
  SiSupabase,
  SiGraphql,
  SiGit,
  SiGithub,
  SiFigma,
  SiHtml5,
  SiCss3,
  SiSass,
  SiRedux,
  SiVuedotjs,
  SiAngular,
  SiSvelte,
  SiAstro,
  SiRemix,
  SiGatsby,
  SiWebpack,
  SiVite,
  SiBabel,
  SiEslint,
  SiPrettier,
  SiJest,
  SiTestinglibrary,
  SiCypress,
  SiPlaywright,
  SiStorybook,
  SiNpm,
  SiYarn,
  SiPnpm,
  SiExpress,
  SiNestjs,
  SiFastapi,
  SiDjango,
  SiFlask,
  SiSpring,
  SiLaravel,
  SiRubyonrails,
  SiPhp,
  SiGo,
  SiRust,
  SiKotlin,
  SiSwift,
  SiDart,
  SiRuby,
  SiOpenjdk,
  SiDeno,
  SiBun,
  SiPrisma,
  SiRedis,
  SiMysql,
  SiSqlite,
  SiMariadb,
  SiElasticsearch,
  SiKubernetes,
  SiTerraform,
  SiGooglecloud,
  SiMicrosoftazure,
  SiNetlify,
  SiHeroku,
  SiDigitalocean,
  SiCloudflare,
  SiNginx,
  SiApache,
  SiLinux,
  SiUbuntu,
  SiApple,
  SiAndroid,
  SiIos,
  SiFlutter,
  SiExpo,
  SiElectron,
  SiTauri,
  SiOpenai,
  SiTensorflow,
  SiPytorch,
  SiJupyter,
  SiNotion,
  SiSlack,
  SiDiscord,
  SiStripe,
  SiSanity,
  SiContentful,
  SiStrapi,
  SiAdobephotoshop,
  SiAdobeillustrator,
  SiSketch,
  SiFramer,
  SiBlender,
} from 'react-icons/si';

export type TechIconCategory =
  | 'Frontend'
  | 'Backend'
  | 'Cloud'
  | 'Database'
  | 'Design'
  | 'Language'
  | 'Tool'
  | 'Framework';

export type TechIconEntry = {
  id: string;
  label: string;
  aliases: string[];
  icon: IconType;
  hex: string;
  category: TechIconCategory;
};

// Union of all registry ids (narrowed via const assertion below)
export type TechIconId = (typeof TECH_ICONS)[number]['id'];

export const TECH_ICONS: TechIconEntry[] = [
  {
    id: 'react',
    label: 'React',
    aliases: ['reactjs', 'react.js'],
    icon: SiReact,
    hex: '#61DAFB',
    category: 'Frontend',
  }, // token-lint-ignore
  {
    id: 'nextdotjs',
    label: 'Next.js',
    aliases: ['next.js', 'nextjs', 'next'],
    icon: SiNextdotjs,
    hex: '#000000',
    category: 'Framework',
  }, // token-lint-ignore
  {
    id: 'typescript',
    label: 'TypeScript',
    aliases: ['ts', 'type-script'],
    icon: SiTypescript,
    hex: '#3178C6',
    category: 'Language',
  }, // token-lint-ignore
  {
    id: 'javascript',
    label: 'JavaScript',
    aliases: ['js', 'java-script', 'ecmascript'],
    icon: SiJavascript,
    hex: '#F7DF1E',
    category: 'Language',
  }, // token-lint-ignore
  {
    id: 'python',
    label: 'Python',
    aliases: ['py'],
    icon: SiPython,
    hex: '#3776AB',
    category: 'Language',
  }, // token-lint-ignore
  {
    id: 'nodedotjs',
    label: 'Node.js',
    aliases: ['node', 'nodejs', 'node.js'],
    icon: SiNodedotjs,
    hex: '#339933',
    category: 'Backend',
  }, // token-lint-ignore
  {
    id: 'docker',
    label: 'Docker',
    aliases: [],
    icon: SiDocker,
    hex: '#2496ED',
    category: 'Cloud',
  }, // token-lint-ignore
  {
    id: 'amazonaws',
    label: 'AWS',
    aliases: ['aws', 'amazon-aws', 'amazon web services'],
    icon: SiAmazonaws,
    hex: '#232F3E',
    category: 'Cloud',
  }, // token-lint-ignore
  {
    id: 'vercel',
    label: 'Vercel',
    aliases: [],
    icon: SiVercel,
    hex: '#000000',
    category: 'Cloud',
  }, // token-lint-ignore
  {
    id: 'postgresql',
    label: 'PostgreSQL',
    aliases: ['postgres', 'psql', 'pg'],
    icon: SiPostgresql,
    hex: '#4169E1',
    category: 'Database',
  }, // token-lint-ignore
  {
    id: 'mongodb',
    label: 'MongoDB',
    aliases: ['mongo'],
    icon: SiMongodb,
    hex: '#47A248',
    category: 'Database',
  }, // token-lint-ignore
  {
    id: 'tailwindcss',
    label: 'Tailwind CSS',
    aliases: ['tailwind', 'tailwind-css'],
    icon: SiTailwindcss,
    hex: '#06B6D4',
    category: 'Frontend',
  }, // token-lint-ignore
  {
    id: 'firebase',
    label: 'Firebase',
    aliases: [],
    icon: SiFirebase,
    hex: '#FFCA28',
    category: 'Database',
  }, // token-lint-ignore
  {
    id: 'supabase',
    label: 'Supabase',
    aliases: [],
    icon: SiSupabase,
    hex: '#3ECF8E',
    category: 'Database',
  }, // token-lint-ignore
  {
    id: 'graphql',
    label: 'GraphQL',
    aliases: ['gql'],
    icon: SiGraphql,
    hex: '#E10098',
    category: 'Backend',
  }, // token-lint-ignore
  {
    id: 'git',
    label: 'Git',
    aliases: [],
    icon: SiGit,
    hex: '#F05032',
    category: 'Tool',
  }, // token-lint-ignore
  {
    id: 'github',
    label: 'GitHub',
    aliases: ['gh'],
    icon: SiGithub,
    hex: '#181717',
    category: 'Tool',
  }, // token-lint-ignore
  {
    id: 'figma',
    label: 'Figma',
    aliases: [],
    icon: SiFigma,
    hex: '#F24E1E',
    category: 'Design',
  }, // token-lint-ignore
  {
    id: 'html5',
    label: 'HTML5',
    aliases: ['html'],
    icon: SiHtml5,
    hex: '#E34F26',
    category: 'Frontend',
  }, // token-lint-ignore
  {
    id: 'css3',
    label: 'CSS3',
    aliases: ['css'],
    icon: SiCss3,
    hex: '#1572B6',
    category: 'Frontend',
  }, // token-lint-ignore
  {
    id: 'sass',
    label: 'Sass',
    aliases: ['scss'],
    icon: SiSass,
    hex: '#CC6699',
    category: 'Frontend',
  }, // token-lint-ignore
  {
    id: 'redux',
    label: 'Redux',
    aliases: [],
    icon: SiRedux,
    hex: '#764ABC',
    category: 'Frontend',
  }, // token-lint-ignore
  {
    id: 'vuedotjs',
    label: 'Vue.js',
    aliases: ['vue', 'vuejs', 'vue.js'],
    icon: SiVuedotjs,
    hex: '#4FC08D',
    category: 'Frontend',
  }, // token-lint-ignore
  {
    id: 'angular',
    label: 'Angular',
    aliases: ['angularjs'],
    icon: SiAngular,
    hex: '#DD0031',
    category: 'Framework',
  }, // token-lint-ignore
  {
    id: 'svelte',
    label: 'Svelte',
    aliases: [],
    icon: SiSvelte,
    hex: '#FF3E00',
    category: 'Framework',
  }, // token-lint-ignore
  {
    id: 'astro',
    label: 'Astro',
    aliases: [],
    icon: SiAstro,
    hex: '#FF5D01',
    category: 'Framework',
  }, // token-lint-ignore
  {
    id: 'remix',
    label: 'Remix',
    aliases: [],
    icon: SiRemix,
    hex: '#000000',
    category: 'Framework',
  }, // token-lint-ignore
  {
    id: 'gatsby',
    label: 'Gatsby',
    aliases: [],
    icon: SiGatsby,
    hex: '#663399',
    category: 'Framework',
  }, // token-lint-ignore
  {
    id: 'webpack',
    label: 'Webpack',
    aliases: [],
    icon: SiWebpack,
    hex: '#8DD6F9',
    category: 'Tool',
  }, // token-lint-ignore
  {
    id: 'vite',
    label: 'Vite',
    aliases: [],
    icon: SiVite,
    hex: '#646CFF',
    category: 'Tool',
  }, // token-lint-ignore
  {
    id: 'babel',
    label: 'Babel',
    aliases: [],
    icon: SiBabel,
    hex: '#F9DC3E',
    category: 'Tool',
  }, // token-lint-ignore
  {
    id: 'eslint',
    label: 'ESLint',
    aliases: [],
    icon: SiEslint,
    hex: '#4B32C3',
    category: 'Tool',
  }, // token-lint-ignore
  {
    id: 'prettier',
    label: 'Prettier',
    aliases: [],
    icon: SiPrettier,
    hex: '#F7B93E',
    category: 'Tool',
  }, // token-lint-ignore
  {
    id: 'jest',
    label: 'Jest',
    aliases: [],
    icon: SiJest,
    hex: '#C21325',
    category: 'Tool',
  }, // token-lint-ignore
  {
    id: 'testinglibrary',
    label: 'Testing Library',
    aliases: ['testing-library', 'react-testing-library'],
    icon: SiTestinglibrary,
    hex: '#E33332',
    category: 'Tool',
  }, // token-lint-ignore
  {
    id: 'cypress',
    label: 'Cypress',
    aliases: [],
    icon: SiCypress,
    hex: '#17202C',
    category: 'Tool',
  }, // token-lint-ignore
  {
    id: 'playwright',
    label: 'Playwright',
    aliases: [],
    icon: SiPlaywright,
    hex: '#2EAD33',
    category: 'Tool',
  }, // token-lint-ignore
  {
    id: 'storybook',
    label: 'Storybook',
    aliases: [],
    icon: SiStorybook,
    hex: '#FF4785',
    category: 'Tool',
  }, // token-lint-ignore
  {
    id: 'npm',
    label: 'npm',
    aliases: [],
    icon: SiNpm,
    hex: '#CB3837',
    category: 'Tool',
  }, // token-lint-ignore
  {
    id: 'yarn',
    label: 'Yarn',
    aliases: [],
    icon: SiYarn,
    hex: '#2C8EBB',
    category: 'Tool',
  }, // token-lint-ignore
  {
    id: 'pnpm',
    label: 'pnpm',
    aliases: [],
    icon: SiPnpm,
    hex: '#F69220',
    category: 'Tool',
  }, // token-lint-ignore
  {
    id: 'express',
    label: 'Express',
    aliases: ['expressjs', 'express.js'],
    icon: SiExpress,
    hex: '#000000',
    category: 'Backend',
  }, // token-lint-ignore
  {
    id: 'nestjs',
    label: 'NestJS',
    aliases: ['nest', 'nest.js', 'nestjs'],
    icon: SiNestjs,
    hex: '#E0234E',
    category: 'Backend',
  }, // token-lint-ignore
  {
    id: 'fastapi',
    label: 'FastAPI',
    aliases: ['fast-api'],
    icon: SiFastapi,
    hex: '#009688',
    category: 'Backend',
  }, // token-lint-ignore
  {
    id: 'django',
    label: 'Django',
    aliases: [],
    icon: SiDjango,
    hex: '#092E20',
    category: 'Backend',
  }, // token-lint-ignore
  {
    id: 'flask',
    label: 'Flask',
    aliases: [],
    icon: SiFlask,
    hex: '#000000',
    category: 'Backend',
  }, // token-lint-ignore
  {
    id: 'spring',
    label: 'Spring',
    aliases: ['spring-boot', 'springboot'],
    icon: SiSpring,
    hex: '#6DB33F',
    category: 'Backend',
  }, // token-lint-ignore
  {
    id: 'laravel',
    label: 'Laravel',
    aliases: [],
    icon: SiLaravel,
    hex: '#FF2D20',
    category: 'Backend',
  }, // token-lint-ignore
  {
    id: 'rubyonrails',
    label: 'Ruby on Rails',
    aliases: ['rails', 'ruby-on-rails'],
    icon: SiRubyonrails,
    hex: '#CC0000',
    category: 'Backend',
  }, // token-lint-ignore
  {
    id: 'php',
    label: 'PHP',
    aliases: [],
    icon: SiPhp,
    hex: '#777BB4',
    category: 'Language',
  }, // token-lint-ignore
  {
    id: 'go',
    label: 'Go',
    aliases: ['golang'],
    icon: SiGo,
    hex: '#00ADD8',
    category: 'Language',
  }, // token-lint-ignore
  {
    id: 'rust',
    label: 'Rust',
    aliases: [],
    icon: SiRust,
    hex: '#000000',
    category: 'Language',
  }, // token-lint-ignore
  {
    id: 'kotlin',
    label: 'Kotlin',
    aliases: [],
    icon: SiKotlin,
    hex: '#0095D5',
    category: 'Language',
  }, // token-lint-ignore
  {
    id: 'swift',
    label: 'Swift',
    aliases: [],
    icon: SiSwift,
    hex: '#FA7343',
    category: 'Language',
  }, // token-lint-ignore
  {
    id: 'dart',
    label: 'Dart',
    aliases: [],
    icon: SiDart,
    hex: '#0175C2',
    category: 'Language',
  }, // token-lint-ignore
  {
    id: 'ruby',
    label: 'Ruby',
    aliases: [],
    icon: SiRuby,
    hex: '#CC342D',
    category: 'Language',
  }, // token-lint-ignore
  {
    id: 'openjdk',
    label: 'Java',
    aliases: ['java', 'open-jdk', 'jdk'],
    icon: SiOpenjdk,
    hex: '#ED8B00',
    category: 'Language',
  }, // token-lint-ignore
  {
    id: 'deno',
    label: 'Deno',
    aliases: [],
    icon: SiDeno,
    hex: '#000000',
    category: 'Backend',
  }, // token-lint-ignore
  {
    id: 'bun',
    label: 'Bun',
    aliases: [],
    icon: SiBun,
    hex: '#000000',
    category: 'Backend',
  }, // token-lint-ignore
  {
    id: 'prisma',
    label: 'Prisma',
    aliases: [],
    icon: SiPrisma,
    hex: '#2D3748',
    category: 'Database',
  }, // token-lint-ignore
  {
    id: 'redis',
    label: 'Redis',
    aliases: [],
    icon: SiRedis,
    hex: '#DC382D',
    category: 'Database',
  }, // token-lint-ignore
  {
    id: 'mysql',
    label: 'MySQL',
    aliases: [],
    icon: SiMysql,
    hex: '#4479A1',
    category: 'Database',
  }, // token-lint-ignore
  {
    id: 'sqlite',
    label: 'SQLite',
    aliases: ['sqlite3'],
    icon: SiSqlite,
    hex: '#003B57',
    category: 'Database',
  }, // token-lint-ignore
  {
    id: 'mariadb',
    label: 'MariaDB',
    aliases: ['maria-db'],
    icon: SiMariadb,
    hex: '#003545',
    category: 'Database',
  }, // token-lint-ignore
  {
    id: 'elasticsearch',
    label: 'Elasticsearch',
    aliases: ['elastic', 'elastic-search'],
    icon: SiElasticsearch,
    hex: '#005571',
    category: 'Database',
  }, // token-lint-ignore
  {
    id: 'kubernetes',
    label: 'Kubernetes',
    aliases: ['k8s', 'k8'],
    icon: SiKubernetes,
    hex: '#326CE5',
    category: 'Cloud',
  }, // token-lint-ignore
  {
    id: 'terraform',
    label: 'Terraform',
    aliases: [],
    icon: SiTerraform,
    hex: '#7B42BC',
    category: 'Cloud',
  }, // token-lint-ignore
  {
    id: 'googlecloud',
    label: 'Google Cloud',
    aliases: ['gcp', 'google-cloud', 'googlecloudplatform'],
    icon: SiGooglecloud,
    hex: '#4285F4',
    category: 'Cloud',
  }, // token-lint-ignore
  {
    id: 'microsoftazure',
    label: 'Azure',
    aliases: ['azure', 'microsoft-azure'],
    icon: SiMicrosoftazure,
    hex: '#0089D6',
    category: 'Cloud',
  }, // token-lint-ignore
  {
    id: 'netlify',
    label: 'Netlify',
    aliases: [],
    icon: SiNetlify,
    hex: '#00C7B7',
    category: 'Cloud',
  }, // token-lint-ignore
  {
    id: 'heroku',
    label: 'Heroku',
    aliases: [],
    icon: SiHeroku,
    hex: '#430098',
    category: 'Cloud',
  }, // token-lint-ignore
  {
    id: 'digitalocean',
    label: 'DigitalOcean',
    aliases: ['do', 'digital-ocean'],
    icon: SiDigitalocean,
    hex: '#0080FF',
    category: 'Cloud',
  }, // token-lint-ignore
  {
    id: 'cloudflare',
    label: 'Cloudflare',
    aliases: ['cf'],
    icon: SiCloudflare,
    hex: '#F38020',
    category: 'Cloud',
  }, // token-lint-ignore
  {
    id: 'nginx',
    label: 'Nginx',
    aliases: [],
    icon: SiNginx,
    hex: '#009639',
    category: 'Cloud',
  }, // token-lint-ignore
  {
    id: 'apache',
    label: 'Apache',
    aliases: ['httpd'],
    icon: SiApache,
    hex: '#D22128',
    category: 'Cloud',
  }, // token-lint-ignore
  {
    id: 'linux',
    label: 'Linux',
    aliases: [],
    icon: SiLinux,
    hex: '#FCC624',
    category: 'Tool',
  }, // token-lint-ignore
  {
    id: 'ubuntu',
    label: 'Ubuntu',
    aliases: [],
    icon: SiUbuntu,
    hex: '#E95420',
    category: 'Tool',
  }, // token-lint-ignore
  {
    id: 'apple',
    label: 'Apple',
    aliases: ['macos', 'ios-apple'],
    icon: SiApple,
    hex: '#000000',
    category: 'Tool',
  }, // token-lint-ignore
  {
    id: 'android',
    label: 'Android',
    aliases: [],
    icon: SiAndroid,
    hex: '#34A853',
    category: 'Tool',
  }, // token-lint-ignore
  {
    id: 'ios',
    label: 'iOS',
    aliases: ['iphone'],
    icon: SiIos,
    hex: '#000000',
    category: 'Tool',
  }, // token-lint-ignore
  {
    id: 'flutter',
    label: 'Flutter',
    aliases: [],
    icon: SiFlutter,
    hex: '#02569B',
    category: 'Framework',
  }, // token-lint-ignore
  {
    id: 'expo',
    label: 'Expo',
    aliases: [],
    icon: SiExpo,
    hex: '#000020',
    category: 'Framework',
  }, // token-lint-ignore
  {
    id: 'electron',
    label: 'Electron',
    aliases: [],
    icon: SiElectron,
    hex: '#47848F',
    category: 'Framework',
  }, // token-lint-ignore
  {
    id: 'tauri',
    label: 'Tauri',
    aliases: [],
    icon: SiTauri,
    hex: '#24C8DB',
    category: 'Framework',
  }, // token-lint-ignore
  {
    id: 'openai',
    label: 'OpenAI',
    aliases: ['chatgpt', 'gpt'],
    icon: SiOpenai,
    hex: '#412991',
    category: 'Tool',
  }, // token-lint-ignore
  {
    id: 'tensorflow',
    label: 'TensorFlow',
    aliases: ['tf'],
    icon: SiTensorflow,
    hex: '#FF6F00',
    category: 'Tool',
  }, // token-lint-ignore
  {
    id: 'pytorch',
    label: 'PyTorch',
    aliases: ['torch'],
    icon: SiPytorch,
    hex: '#EE4C2C',
    category: 'Tool',
  }, // token-lint-ignore
  {
    id: 'jupyter',
    label: 'Jupyter',
    aliases: [],
    icon: SiJupyter,
    hex: '#F37626',
    category: 'Tool',
  }, // token-lint-ignore
  {
    id: 'notion',
    label: 'Notion',
    aliases: [],
    icon: SiNotion,
    hex: '#000000',
    category: 'Tool',
  }, // token-lint-ignore
  {
    id: 'slack',
    label: 'Slack',
    aliases: [],
    icon: SiSlack,
    hex: '#4A154B',
    category: 'Tool',
  }, // token-lint-ignore
  {
    id: 'discord',
    label: 'Discord',
    aliases: [],
    icon: SiDiscord,
    hex: '#5865F2',
    category: 'Tool',
  }, // token-lint-ignore
  {
    id: 'stripe',
    label: 'Stripe',
    aliases: [],
    icon: SiStripe,
    hex: '#635BFF',
    category: 'Tool',
  }, // token-lint-ignore
  {
    id: 'sanity',
    label: 'Sanity',
    aliases: [],
    icon: SiSanity,
    hex: '#F03E2F',
    category: 'Database',
  }, // token-lint-ignore
  {
    id: 'contentful',
    label: 'Contentful',
    aliases: [],
    icon: SiContentful,
    hex: '#2478CC',
    category: 'Database',
  }, // token-lint-ignore
  {
    id: 'strapi',
    label: 'Strapi',
    aliases: [],
    icon: SiStrapi,
    hex: '#2F2E8B',
    category: 'Backend',
  }, // token-lint-ignore
  {
    id: 'adobephotoshop',
    label: 'Photoshop',
    aliases: ['photoshop', 'ps'],
    icon: SiAdobephotoshop,
    hex: '#31A8FF',
    category: 'Design',
  }, // token-lint-ignore
  {
    id: 'adobeillustrator',
    label: 'Illustrator',
    aliases: ['illustrator', 'ai'],
    icon: SiAdobeillustrator,
    hex: '#FF9A00',
    category: 'Design',
  }, // token-lint-ignore
  {
    id: 'sketch',
    label: 'Sketch',
    aliases: [],
    icon: SiSketch,
    hex: '#FDB300',
    category: 'Design',
  }, // token-lint-ignore
  {
    id: 'framer',
    label: 'Framer',
    aliases: [],
    icon: SiFramer,
    hex: '#0055FF',
    category: 'Design',
  }, // token-lint-ignore
  {
    id: 'blender',
    label: 'Blender',
    aliases: [],
    icon: SiBlender,
    hex: '#E87D0D',
    category: 'Design',
  }, // token-lint-ignore
];

/** Flat list of all registered ids. */
export const allTechIconIds: string[] = TECH_ICONS.map((e) => e.id);

/** Distinct categories present in the registry (preserves union order). */
export const techIconCategories: string[] = Array.from(
  new Set(TECH_ICONS.map((e) => e.category)),
);

/** Grouped lookup. */
export const TECH_ICONS_BY_CATEGORY: Record<string, TechIconEntry[]> =
  TECH_ICONS.reduce((acc, entry) => {
    (acc[entry.category] ??= []).push(entry);
    return acc;
  }, {} as Record<string, TechIconEntry[]>);

// Fast lookup for resolve — built once at module load.
const TECH_ICON_LOOKUP: Map<string, TechIconEntry> = new Map();
for (const entry of TECH_ICONS) {
  TECH_ICON_LOOKUP.set(entry.id.toLowerCase(), entry);
  for (const alias of entry.aliases) {
    const key = alias.toLowerCase();
    if (!TECH_ICON_LOOKUP.has(key)) TECH_ICON_LOOKUP.set(key, entry);
  }
}

/**
 * Resolve a tech slug to its icon component and brand metadata.
 * Matches `id` or any alias, case-insensitive, whitespace-trimmed.
 * Returns `null` when unknown so callers can fall back to generic icons.
 */
export function resolveTechIcon(
  slug: string,
): { Component: IconType; hex: string; label: string; id: string } | null {
  if (!slug || typeof slug !== 'string') return null;
  const q = slug.trim().toLowerCase();
  if (!q) return null;
  const hit = TECH_ICON_LOOKUP.get(q);
  if (!hit) return null;
  return { Component: hit.icon, hex: hit.hex, label: hit.label, id: hit.id };
}
