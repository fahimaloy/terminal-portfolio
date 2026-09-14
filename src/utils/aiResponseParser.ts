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
export function parseIdList(value: string | undefined): number[] {
  if (!value) return [];
  const ids: number[] = [];
  const seen: Record<number, true> = {};
  for (const part of value.split(',')) {
    const n = Number(part.trim());
    if (Number.isInteger(n) && Number.isFinite(n) && !seen[n]) {
      seen[n] = true;
      ids.push(n);
    }
  }
  return ids;
}

export function parseAiResponse(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  if (typeof text !== 'string' || !text) return segments;
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
        segments.push({ type: 'project_list', ids: parseIdList(value) });
        break;
      case 'PROJECT_SINGLE': {
        const id = Number((value ?? '').trim());
        if (Number.isInteger(id) && Number.isFinite(id)) {
          segments.push({ type: 'project_single', id });
        } else {
          segments.push({ type: 'text', content: match[0] });
        }
        break;
      }
      case 'PROJECT_REF': {
        const id = Number((value ?? '').trim());
        if (Number.isInteger(id) && Number.isFinite(id)) {
          segments.push({ type: 'project_ref', id });
        } else {
          segments.push({ type: 'text', content: match[0] });
        }
        break;
      }
      case 'SKILL': {
        const id = Number((value ?? '').trim());
        if (Number.isInteger(id) && Number.isFinite(id)) {
          segments.push({ type: 'skill_ref', id });
        } else {
          segments.push({ type: 'text', content: match[0] });
        }
        break;
      }
      case 'SKILL_LIST':
        segments.push({ type: 'skill_list', ids: parseIdList(value) });
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
  return /\[\[(PROJECT_(LIST|SINGLE|REF)|SKILL|SKILL_LIST|EXPERIENCE_TIMELINE|PROJECT_TABLE)[^\]]*\]\]/.test(
    text,
  );
}

export function containsProjectMarker(text: string): boolean {
  return /\[\[PROJECT_(LIST|SINGLE|REF):\d+(?:,\d+)*\]\]/.test(text);
}

export function stripAllMarkers(text: string): string {
  return text
    .replace(
      /\[\[(PROJECT_(LIST|SINGLE|REF)|SKILL|SKILL_LIST|EXPERIENCE_TIMELINE|PROJECT_TABLE)[^\]]*\]\]/g,
      '',
    )
    .trim();
}
