import { Conf } from './Conf.interface';
import * as bin from './index';
import {
  getFeaturedPortfolioProjects,
  getPortfolioProfile,
  getPortfolioProjects,
  getPortfolioSkills,
  getProjects,
  getReadme,
} from '../api';
import Photo from '../../assets/ascii_photo.png';

const config: Conf = require('../../../config.json');

const defaultSkills = [
  'React/Next JS',
  'Vue/Nuxt JS',
  'Python',
  'Django',
  'Express',
  'Typescript',
  'MongoDB',
  'MySQL/PostgreSQL',
  'C++',
  'Golang',
  'GIN',
  'Nginx',
  'VPS Management',
  'CI/CD Pipeline',
  'Redis',
];

const iconKeyAlias: Record<string, string> = {
  'next js': 'nextdotjs',
  next: 'nextdotjs',
  'node js': 'nodedotjs',
  node: 'nodedotjs',
  'express js': 'express',
  golang: 'go',
  postgres: 'postgresql',
  postgresql: 'postgresql',
  mongo: 'mongodb',
  mongodb: 'mongodb',
  js: 'javascript',
  ts: 'typescript',
  cplusplus: 'cplusplus',
  csharp: 'csharp',
  docker: 'docker',
  vue: 'vuedotjs',
  nuxt: 'nuxtdotjs',
  nuxtjs: 'nuxtdotjs',
  github: 'github',
  linkedin: 'linkedin',
  redis: 'redis',
  python: 'python',
  rust: 'rust',
  linux: 'linux',
  django: 'django',
  fastapi: 'fastapi',
  gin: 'go',
  fiber: 'go',
  flutter: 'flutter',
  electron: 'electron',
  nextreact: 'nextdotjs',
  reactnext: 'react',
  nuxtvue: 'nuxtdotjs',
  vuenuxt: 'vuedotjs',
  'next react': 'nextdotjs',
  'react next': 'react',
  'nuxt vue': 'nuxtdotjs',
  'vue nuxt': 'vuedotjs',
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;'); // token-lint-ignore — HTML entity, not a color

const normalizeSkillKey = (value: string): string => {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9+/ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const mapped =
    iconKeyAlias[cleaned] ||
    iconKeyAlias[cleaned.replace(/[\s/]+/g, '')] ||
    iconKeyAlias[cleaned.replace(/[\/]+/g, ' ')];

  if (mapped) {
    return mapped;
  }

  const token = cleaned
    .split(/[\s/+]+/)
    .find((part) => Boolean(iconKeyAlias[part]));

  if (token) {
    return iconKeyAlias[token];
  }

  return cleaned.replace(/[\s/]+/g, '');
};

const buildIcon = (name: string, iconKey?: string | null): string => {
  const resolvedKey = iconKey || normalizeSkillKey(name);
  const iconUrl = `https://cdn.simpleicons.org/${resolvedKey}`;
  return `<img class="terminal-chip-icon" src="${iconUrl}" alt="${escapeHtml(
    name,
  )}" loading="lazy" onerror="this.style.display='none'"/>`;
};

export const help = async (args: string[]): Promise<string> => {
  let commandText = '';
  const sorted = Object.keys(bin).sort();

  for (let i = 1; i <= sorted.length; i += 1) {
    commandText += i % 7 === 0 ? `${sorted[i - 1]}\n` : `${sorted[i - 1]} `;
  }

  return `Welcome! Here are The Important Commands you can Try out.
Type:
  'fahim' to display summary.
  'projects' for Projects I've Already Done.
  'repo' for my Github Repository.
  'linkedin' for my LinkedIn Account.
  'email' for Contact me on my email.
  'date' for Displaying the Current Date and Time.
  'weather city_name' like: 'weather newyork' to get the current weather updates of the typed city.
  'about' for information about me.
  'skills' for my skills.
  'sudosuperuser-ostaad' for admin access.

Here are all the other available commands:
  \n${commandText}\n
[tab]: trigger completion.
[ctrl+l]/clear: clear terminal.\n
`;
};

export const repo = async (args: string[]): Promise<string> => {
  window.open(`${config.repo}`);
  return 'Opening Github repository...';
};

export const about = async (args: string[]): Promise<string> => {
  const profile = await getPortfolioProfile();

  if (profile) {
    const links = [
      profile.website
        ? `<a href="${profile.website}" target="_blank" class="underline">website</a>`
        : '',
      profile.github
        ? `<a href="${profile.github}" target="_blank" class="underline">github</a>`
        : '',
      profile.linkedin
        ? `<a href="${profile.linkedin}" target="_blank" class="underline">linkedin</a>`
        : '',
    ].filter(Boolean);

    return `${escapeHtml(profile.full_name)}${
      profile.title ? ` - ${escapeHtml(profile.title)}` : ''
    }
${profile.bio ? `\n${escapeHtml(profile.bio)}` : ''}
${profile.location ? `\nLocation: ${escapeHtml(profile.location)}` : ''}
${profile.email ? `\nEmail: ${escapeHtml(profile.email)}` : ''}
${links.length ? `\nLinks: ${links.join(' | ')}` : ''}
\nMore about me:
'fahim' - short summary.
'resume' - my latest resume.
'readme' - my github readme.`;
  }

  return `${await getReadme()} 
Welcome to my website!
More about me:
'fahim' - short summary.
'resume' - my latest resume.
'readme' - my github readme.`;
};

export const resume = async (args: string[]): Promise<string> => {
  window.open(`${config.resume_url}`);
  return 'Opening resume...';
};

export const donate = async (args: string[]): Promise<string> => {
  return `thank you for your interest.
You can contact me on my Email (Type: 'email') or my LinkedIn (Type: 'linkedin') profile`;
};

export const email = async (args: string[]): Promise<string> => {
  window.open(`mailto:${config.email}`);
  return `Opening mailto:${config.email}...`;
};

export const github = async (args: string[]): Promise<string> => {
  window.open(`https://github.com/${config.social.github}/`);
  return 'Opening github...';
};

export const linkedin = async (args: string[]): Promise<string> => {
  return 'Sorry, Soon will update LinkedIn! Try typing github';
};

export const google = async (args: string[]): Promise<string> => {
  window.open(`https://google.com/search?q=${args.join(' ')}`);
  return `Searching google for ${args.join(' ')}...`;
};

export const duckduckgo = async (args: string[]): Promise<string> => {
  window.open(`https://duckduckgo.com/?q=${args.join(' ')}`);
  return `Searching duckduckgo for ${args.join(' ')}...`;
};

export const bing = async (args: string[]): Promise<string> => {
  window.open(`https://bing.com/search?q=${args.join(' ')}`);
  return `Wow, really? You are using bing for ${args.join(' ')}?`;
};

export const reddit = async (args: string[]): Promise<string> => {
  window.open(`https://www.reddit.com/search/?q=${args.join(' ')}`);
  return `Searching reddit for ${args.join(' ')}...`;
};

export const echo = async (args: string[]): Promise<string> => args.join(' ');

export const whoami = async (args: string[]): Promise<string> =>
  `${config.ps1_username}`;

export const ls = async (args: string[]): Promise<string> => `a
bunch
of
fake
directories`;

export const cd = async (
  args: string[],
): Promise<string> => `unfortunately, i cannot afford more directories.
if you want to help, you can type 'donate'.`;

export const date = async (args: string[]): Promise<string> =>
  new Date().toString();

export const vi = async (args: string[]): Promise<string> =>
  `woah, you still use 'vi'? just try 'vim'.`;

export const vim = async (args: string[]): Promise<string> =>
  `'vim' is so outdated. how about 'nvim'?`;

export const nvim = async (args: string[]): Promise<string> =>
  `'nvim'? too fancy. why not 'emacs'?`;

export const emacs = async (args?: string[]): Promise<string> =>
  `you know what? just use vscode.`;

export const exit = async (args?: string[]): Promise<string> => {
  window.close();
  return `Exiting!!! Good bye!`;
};

export const shutdown = async (args?: string[]): Promise<string> => {
  window.close();
  return `Shutting Down!!! Good bye!`;
};

export const sudo = async (args?: string[]): Promise<string> => {
  window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank');
  return `Permission denied: with little power comes... no responsibility? `;
};

export const banner = async (args?: string[]): Promise<string> => {
  const profile = await getPortfolioProfile();
  const allSkills = await getPortfolioSkills();
  const featured = await getFeaturedPortfolioProjects();

  const name = profile?.full_name || 'FAHIM AHMED';
  const title = profile?.title || 'Full-Stack Developer';
  const summary =
    profile?.summary ||
    profile?.bio ||
    'I design and build reliable web experiences with a terminal-inspired interface.';

  const visibleSkills =
    allSkills.length > 0
      ? allSkills
      : defaultSkills.map((skill, index) => ({
          id: index + 1,
          name: skill,
          category: null,
          level: null,
          icon_key: null,
          icon_type: null,
          icon_color: null,
          sort_order: index + 1,
          is_visible: true,
        }));

  const primarySkills = visibleSkills.slice(0, 7);
  const moreCount = Math.max(0, visibleSkills.length - primarySkills.length);

  const skillsHtml = primarySkills
    .map(
      (skill) =>
        `<span class="terminal-skill-chip">${buildIcon(
          skill.name,
          skill.icon_key,
        )}<span>${escapeHtml(skill.name)}</span></span>`,
    )
    .join('');

  const moreChip =
    moreCount > 0
      ? `<span class="terminal-skill-chip terminal-skill-chip-more">+${moreCount} more</span>`
      : '';

  const featuredHtml = featured.length
    ? `<section class="terminal-featured-panel terminal-featured-panel-banner">
      <h3 class="terminal-panel-title">Featured Projects</h3>
      <div class="terminal-slider" role="region" aria-label="Featured Projects Slider">
      ${featured
        .map((project) => {
          const projectSkills = (project.languages || project.tags || []).slice(
            0,
            4,
          );
          const tags = projectSkills
            .map(
              (item) =>
                `<span class="terminal-mini-chip">${buildIcon(
                  item,
                )}<span>${escapeHtml(item)}</span></span>`,
            )
            .join('');

          const thumb = project.thumbnail_url || project.image_url || '';
          const titleText = project.short_title || project.title;

          return `<article class="terminal-slide-item">
            ${
              thumb
                ? `<img class="terminal-slide-thumb" src="${thumb}" alt="${escapeHtml(
                    project.title,
                  )}" loading="lazy"/>`
                : ''
            }
            <h4 class="terminal-slide-title">${escapeHtml(
              titleText || 'Untitled',
            )}</h4>
            <div class="terminal-mini-chip-row">${
              tags || '<span class="terminal-mini-chip">No stack listed</span>'
            }</div>
          </article>`;
        })
        .join('')}
      </div>
    </section>`
    : '';

  return `<section class="terminal-banner-grid ${
    featured.length ? '' : 'terminal-banner-grid-single'
  }">
    <div class="terminal-banner-left">
      <figure class="terminal-ascii-frame" style="display: grid">
        <img src="${Photo.src}" alt="${escapeHtml(
    name,
  )}" class="terminal-ascii-image" />
      </figure>
      <h1 class="terminal-block-name">${escapeHtml(name.toUpperCase())}</h1>
      <p class="terminal-title">${escapeHtml(title)}</p>
      <p class="terminal-summary">${escapeHtml(summary)}</p>
      <div class="terminal-skill-row">${skillsHtml}${moreChip}</div>
    </div>
    ${featuredHtml}
  </section>

Type 'help' to see the list of available commands.
Type 'fahim' to display summary about me.
Type 'resume' to download my resume.
Type 'projects' to view all projects.
`;
};

export const projects = async (args: string[]): Promise<string> => {
  const supabaseProjects = await getPortfolioProjects();

  if (supabaseProjects.length > 0) {
    const rows = supabaseProjects
      .map((project, index) => {
        const skills = (project.languages || project.tags || []).slice(0, 6);
        const skillBadges = skills
          .map(
            (item) =>
              `<span class="terminal-mini-chip">${buildIcon(
                item,
              )}<span>${escapeHtml(item)}</span></span>`,
          )
          .join('');

        const links = [
          project.project_url
            ? `<a class="terminal-link-btn" href="${project.project_url}" target="_blank">Live</a>`
            : '',
          project.repo_url
            ? `<a class="terminal-link-btn" href="${project.repo_url}" target="_blank">Code</a>`
            : '',
        ]
          .filter(Boolean)
          .join(' ');

        const image = project.thumbnail_url || project.image_url;

        return `<tr>
          <td>${index + 1}</td>
          <td>
            <div class="terminal-project-cell">
              ${
                image
                  ? `<img src="${image}" alt="${escapeHtml(
                      project.title,
                    )}" class="terminal-project-thumb" loading="lazy"/>`
                  : ''
              }
              <div>
                <strong>${escapeHtml(project.title)}</strong>
                ${
                  project.description
                    ? `<p class="terminal-project-desc">${escapeHtml(
                        project.description,
                      )}</p>`
                    : ''
                }
                ${
                  project.featured
                    ? '<span class="terminal-featured-badge">Featured</span>'
                    : ''
                }
              </div>
            </div>
          </td>
          <td><div class="terminal-mini-chip-row">${
            skillBadges || '<span class="terminal-mini-chip">Not set</span>'
          }</div></td>
          <td>${links || '<span class="terminal-muted">No links</span>'}</td>
        </tr>`;
      })
      .join('');

    return `<section class="terminal-table-wrap">
      <h3 class="terminal-panel-title">Projects</h3>
      <table class="terminal-project-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Project</th>
            <th>Stack</th>
            <th>Links</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
  }

  let legacyProjects: any[] = [];
  try {
    legacyProjects = await getProjects();
  } catch (error) {
    return '<div class="terminal-empty">No projects found yet. Add projects from the admin panel.</div>';
  }

  if (!legacyProjects.length) {
    return '<div class="terminal-empty">No projects found yet. Add projects from the admin panel.</div>';
  }

  return `<div class="terminal-empty">Found legacy projects source, but no styled records were available. Please migrate projects into Supabase.</div>`;
};

export const skills = async (args: string[]): Promise<string> => {
  const supabaseSkills = await getPortfolioSkills();
  const list =
    supabaseSkills.length > 0
      ? supabaseSkills
      : defaultSkills.map((name, index) => ({
          id: index + 1,
          name,
          category: null,
          level: null,
          icon_key: null,
          icon_type: null,
          icon_color: null,
          sort_order: index + 1,
          is_visible: true,
        }));

  const cards = list
    .map(
      (skill) =>
        `<article class="terminal-skill-card">${buildIcon(
          skill.name,
          skill.icon_key,
        )}<span>${escapeHtml(skill.name)}</span></article>`,
    )
    .join('');

  return `<section>
    <h3 class="terminal-panel-title">Skills</h3>
    <div class="terminal-skill-grid">${cards}</div>
  </section>`;
};
