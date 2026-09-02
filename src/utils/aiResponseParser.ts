// src/utils/aiResponseParser.ts
import { PortfolioProject, PortfolioSkill, PortfolioExperience } from './api';

export type ParsedSegment =
  | { type: 'text'; content: string }
  | { type: 'project_list'; ids: number[] }
  | { type: 'project_single'; id: number }
  | { type: 'project_ref'; id: number }
  | { type: 'skill_ref'; id: number }
  | { type: 'skill_list'; ids: number[] }
  | { type: 'experience_timeline' }
  | { type: 'project_table' };

/**
 * Parse AI response text for structured markers.
 *
 * Markers:
 *   [[PROJECT_LIST:ids]]       — multiple projects
 *   [[PROJECT_SINGLE:id]]      — single project detail
 *   [[PROJECT_REF:id]]         — inline project mention
 *   [[SKILL:id]]               — inline skill mention
 *   [[SKILL_LIST:ids]]         — skill listing grid
 *   [[EXPERIENCE_TIMELINE]]    — full experience timeline
 *   [[PROJECT_TABLE]]          — project table view
 */
export function parseAiResponse(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  const regex =
    /\[\[(PROJECT_LIST|PROJECT_SINGLE|PROJECT_REF|SKILL|SKILL_LIST|EXPERIENCE_TIMELINE|PROJECT_TABLE)(?::([^\]]*))?\]\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const before = text.slice(lastIndex, match.index);
      if (before.trim()) {
        segments.push({ type: 'text', content: before });
      }
    }

    const [, type, value] = match;
    switch (type) {
      case 'PROJECT_LIST':
        segments.push({
          type: 'project_list',
          ids: value ? value.split(',').map(Number) : [],
        });
        break;
      case 'PROJECT_SINGLE':
        segments.push({ type: 'project_single', id: Number(value) });
        break;
      case 'PROJECT_REF':
        segments.push({ type: 'project_ref', id: Number(value) });
        break;
      case 'SKILL':
        segments.push({ type: 'skill_ref', id: Number(value) });
        break;
      case 'SKILL_LIST':
        segments.push({
          type: 'skill_list',
          ids: value ? value.split(',').map(Number) : [],
        });
        break;
      case 'EXPERIENCE_TIMELINE':
        segments.push({ type: 'experience_timeline' });
        break;
      case 'PROJECT_TABLE':
        segments.push({ type: 'project_table' });
        break;
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex);
    if (remaining.trim()) {
      segments.push({ type: 'text', content: remaining });
    }
  }

  return segments;
}

export function findProjectById(
  projects: PortfolioProject[],
  id: number,
): PortfolioProject | undefined {
  return projects.find((p) => p.id === id);
}

export function findProjectsByIds(
  projects: PortfolioProject[],
  ids: number[],
): PortfolioProject[] {
  return ids
    .map((id) => findProjectById(projects, id))
    .filter((p): p is PortfolioProject => p !== undefined);
}

export function findSkillById(
  skills: PortfolioSkill[],
  id: number,
): PortfolioSkill | undefined {
  return skills.find((s) => s.id === id);
}

export function findSkillsByIds(
  skills: PortfolioSkill[],
  ids: number[],
): PortfolioSkill[] {
  return ids
    .map((id) => findSkillById(skills, id))
    .filter((s): s is PortfolioSkill => s !== undefined);
}

export function containsAnyMarker(text: string): boolean {
  return /\[\[(PROJECT_(LIST|SINGLE|REF)|SKILL|SKILL_LIST|EXPERIENCE_TIMELINE|PROJECT_TABLE)[^\]]*\]\]/.test(text);
}

export function containsProjectMarker(text: string): boolean {
  return /\[\[PROJECT_(LIST|SINGLE|REF):\d+(?:,\d+)*\]\]/.test(text);
}

export function stripAllMarkers(text: string): string {
  return text
    .replace(/\[\[(PROJECT_(LIST|SINGLE|REF)|SKILL|SKILL_LIST|EXPERIENCE_TIMELINE|PROJECT_TABLE)[^\]]*\]\]/g, '')
    .trim();
}
