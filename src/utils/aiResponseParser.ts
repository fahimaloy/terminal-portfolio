import { PortfolioProject } from './api';

export type ParsedSegment =
  | { type: 'text'; content: string }
  | { type: 'project_list'; ids: number[] }
  | { type: 'project_single'; id: number }
  | { type: 'project_ref'; id: number };

/**
 * Parse AI response text for structured project reference markers.
 *
 * Markers supported:
 *   [[PROJECT_LIST:id1,id2,id3]]  — multiple projects (flex-wrap cards + preview)
 *   [[PROJECT_SINGLE:id]]          — single project detail (hero preview)
 *   [[PROJECT_REF:id]]             — inline project mention (clickable chip)
 */
export function parseAiResponse(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  const regex =
    /\[\[(PROJECT_LIST|PROJECT_SINGLE|PROJECT_REF):(\d+(?:,\d+)*)\]\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Push text before this marker
    if (match.index > lastIndex) {
      const before = text.slice(lastIndex, match.index);
      if (before.trim()) {
        segments.push({ type: 'text', content: before });
      }
    }

    const [, type, idsStr] = match;
    switch (type) {
      case 'PROJECT_LIST':
        segments.push({
          type: 'project_list',
          ids: idsStr.split(',').map(Number),
        });
        break;
      case 'PROJECT_SINGLE':
        segments.push({
          type: 'project_single',
          id: Number(idsStr),
        });
        break;
      case 'PROJECT_REF':
        segments.push({
          type: 'project_ref',
          id: Number(idsStr),
        });
        break;
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex);
    if (remaining.trim()) {
      segments.push({ type: 'text', content: remaining });
    }
  }

  return segments;
}

/**
 * Find a project by ID from a projects array.
 */
export function findProjectById(
  projects: PortfolioProject[],
  id: number,
): PortfolioProject | undefined {
  return projects.find((p) => p.id === id);
}

/**
 * Find multiple projects by IDs.
 */
export function findProjectsByIds(
  projects: PortfolioProject[],
  ids: number[],
): PortfolioProject[] {
  return ids
    .map((id) => findProjectById(projects, id))
    .filter((p): p is PortfolioProject => p !== undefined);
}

/**
 * Check if a text contains any project markers (quick check for rendering optimization).
 */
export function containsProjectMarker(text: string): boolean {
  return /\[\[PROJECT_(LIST|SINGLE|REF):\d+(?:,\d+)*\]\]/.test(text);
}

/**
 * Strip all project markers from text (for plain text fallback).
 */
export function stripProjectMarkers(text: string): string {
  return text
    .replace(/\[\[PROJECT_(LIST|SINGLE|REF):\d+(?:,\d+)*\]\]/g, '')
    .trim();
}
