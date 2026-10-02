// src/components/__tests__/AccentVocabulary.test.tsx
/* `MentionChip` and `InlineProjectCard` each hand-rolled their own accent
   union instead of importing `AccentColor` from `src/config/animations.ts`.
   `MentionChip`'s listed all six accents with `'coral'` twice, `InlineProjectCard`
   re-spelled the same six behind an `as unknown as` cast, and `MentionChip`
   narrowed its own `accent` prop with `accent as 'cyan'` — a cast that only
   existed to bridge an over-wide `accent?: string` and silently pinned every
   chip to cyan. These tests pin the single vocabulary.
*/
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render } from '@testing-library/react';
import MentionChip from '../MentionChip';
import InlineProjectCard from '../InlineProjectCard';
import { accentConfig, type AccentColor } from '../../config/animations';
import type { PortfolioProject, PortfolioSkill } from '../../utils/api';

/**
 * The six names straight out of the generated token module, so this test
 * cannot drift from `tokens.css` and cannot itself become a seventh spelling of
 * the vocabulary.
 */
const ACCENTS = Object.keys(accentConfig) as AccentColor[];

/** Any accent literal sitting next to a `|` is a hand-rolled union member. */
const UNION_MEMBER =
  /'(cyan|violet|coral|amber|lime|ice)'\s*\||\|\s*'(cyan|violet|coral|amber|lime|ice)'/;

function source(relative: string): string {
  return readFileSync(resolve(process.cwd(), relative), 'utf8');
}

const MENTION_CHIP_SRC = source('src/components/MentionChip.tsx');
const INLINE_CARD_SRC = source('src/components/InlineProjectCard.tsx');

/** `MentionChip` applies `washStyle` to the flex row, the first span. */
function washTarget(panel: HTMLElement): HTMLElement {
  const row = panel.querySelector<HTMLElement>('span');
  if (!row) throw new Error('no wash row rendered');
  return row;
}

function project(id: number): PortfolioProject {
  return {
    id,
    title: `Project ${id}`,
    description: null,
    description_html: null,
    image_url: null,
    // No thumbnail: keeps `next/image` out of this test entirely.
    thumbnail_url: null,
    short_title: `P${id}`,
    icon_key: null,
    project_url: null,
    repo_url: null,
    languages: null,
    tags: ['TypeScript'],
    client_name: null,
    client_location: null,
    client_logo: null,
    featured: false,
    featured_order: 0,
    sort_order: 0,
    is_visible: true,
  };
}

const SKILL: PortfolioSkill = {
  id: 1,
  name: 'TypeScript',
  category: null,
  level: null,
  icon_key: null,
  icon_type: null,
  icon_color: null,
  duration: null,
  sort_order: 0,
  is_visible: true,
};

describe('accent vocabulary', () => {
  it('has exactly the six contractual accents', () => {
    expect([...ACCENTS].sort()).toEqual(
      ['amber', 'coral', 'cyan', 'ice', 'lime', 'violet'].sort(),
    );
  });
});

describe('MentionChip', () => {
  it('accepts every accent and renders it on the underlying HudPanel', () => {
    for (const accent of ACCENTS) {
      const { container, unmount } = render(
        <MentionChip tag={accent} accent={accent} wash={accent} />,
      );
      const panel = container.firstElementChild as HTMLElement;
      expect(panel.style.borderTop).toContain(`var(--neon-${accent})`);
      expect(washTarget(panel).style.background).toContain(
        `var(--wash-${accent})`,
      );
      unmount();
    }
  });

  it('renders the accent actually passed at the ChatMessage call sites', () => {
    // `ChatMessage.tsx:418` and `:437` both pass `wash="cyan"` and no `accent`.
    const { container } = render(<MentionChip tag="alpha" wash="cyan" />);
    const panel = container.firstElementChild as HTMLElement;
    expect(panel.style.borderTop).toContain('var(--neon-cyan)');
    expect(washTarget(panel).style.background).toContain('var(--wash-cyan)');
  });

  it('does not force its accent to cyan', () => {
    const { container } = render(<MentionChip tag="beta" accent="coral" />);
    const panel = container.firstElementChild as HTMLElement;
    expect(panel.style.borderTop).toContain('var(--neon-coral)');
    expect(panel.style.borderTop).not.toContain('var(--neon-cyan)');
  });

  it('defaults to cyan when the accent is omitted', () => {
    const { container } = render(<MentionChip tag="gamma" />);
    expect(
      (container.firstElementChild as HTMLElement).style.borderTop,
    ).toContain('var(--neon-cyan)');
  });

  it('declares no hand-rolled accent union', () => {
    expect(MENTION_CHIP_SRC).not.toMatch(UNION_MEMBER);
    // The duplicate member specifically: `'coral'` listed twice in one union.
    expect(MENTION_CHIP_SRC).not.toMatch(/(?:'coral'\s*\|\s*)+'coral'/);
    expect(MENTION_CHIP_SRC).toMatch(
      /import\s*\{[^}]*\btype\s+AccentColor\b[^}]*\}\s*from\s*'\.\.\/config\/animations'/,
    );
  });

  it('does not narrow its accent prop back to cyan', () => {
    // `accent as 'cyan'` — the cast that silently discarded the caller's intent.
    expect(MENTION_CHIP_SRC).not.toMatch(/accent\s+as\s+'cyan'/);
    expect(MENTION_CHIP_SRC).not.toMatch(/accent\s+as\s+"/);
    expect(MENTION_CHIP_SRC).not.toMatch(/accent\?:\s*string\b/);
    expect(MENTION_CHIP_SRC).toMatch(/<HudPanel[^>]*accent=\{accent\}/);
  });
});

describe('InlineProjectCard', () => {
  it('reaches every accent through the per-id rotation', () => {
    // `ACCENT_BY_ID[project.id % ACCENT_BY_ID.length]` — ids 0..5 walk the list.
    const seen = new Set<string>();
    for (let id = 0; id < ACCENTS.length; id += 1) {
      const { container, unmount } = render(
        <InlineProjectCard project={project(id)} skills={[SKILL]} />,
      );
      const panel = container.querySelector<HTMLElement>(
        'div[class*="rounded"]',
      );
      const borderTop = panel?.style.borderTop ?? '';
      const matched = ACCENTS.find((a) => borderTop.includes(`--neon-${a}`));
      expect(matched, `no accent on border for id ${id}`).toBeDefined();
      seen.add(matched as string);
      unmount();
    }
    expect([...seen].sort()).toEqual([...ACCENTS].sort());
  });

  it('washes its skill chips in the same accent as the panel', () => {
    const { container } = render(
      <InlineProjectCard project={project(2)} skills={[SKILL]} />,
    );
    const chip = container.querySelector<HTMLElement>('span[style*="wash"]');
    // id 2 -> 'amber' under ACCENT_BY_ID.
    expect(chip?.style.background).toContain('var(--wash-amber)');
  });

  it('declares no hand-rolled accent union', () => {
    expect(INLINE_CARD_SRC).not.toMatch(UNION_MEMBER);
    // `as unknown as 'cyan' | 'coral' | ...` — the escape hatch the union needed.
    expect(INLINE_CARD_SRC).not.toMatch(/as unknown as/);
    expect(INLINE_CARD_SRC).toMatch(
      /import type\s*\{\s*AccentColor\s*\}\s*from\s*'\.\.\/config\/animations'/,
    );
    expect(INLINE_CARD_SRC).toMatch(/ACCENT_BY_ID:\s*readonly AccentColor\[\]/);
  });
});
