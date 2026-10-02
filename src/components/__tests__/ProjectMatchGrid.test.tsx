// src/components/__tests__/ProjectMatchGrid.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { animate, createScope } from 'animejs';

/**
 * jsdom ships no `window.matchMedia`, so `canAnimate()` is false unless this is
 * stubbed. The detail panel's motion is routed through `useMotionScope.run`,
 * which short-circuits to `fn(null)` when `isReducedMotion() || !canAnimate()`
 * — so the stub, not the animation library, is what decides each branch here.
 */
function mockMatchMedia(reduceMatches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches:
        query === '(prefers-reduced-motion: reduce)' ? reduceMatches : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

vi.mock('animejs', () => ({
  animate: vi.fn(),
  spring: vi.fn(() => 'spring-ease'),
  createScope: vi.fn(() => ({
    revert: vi.fn(),
    add: (cb: () => void) => {
      cb();
    },
  })),
  stagger: vi.fn(() => 0),
}));

vi.mock('../InlineProjectCard', () => ({
  __esModule: true,
  default: ({ project }: { project: { title: string } }) => {
    const React = require('react');
    return React.createElement('div', null, `card:${project.title}`);
  },
}));

import ProjectMatchGrid from '../ProjectMatchGrid';
import type { PortfolioProject, PortfolioSkill } from '../../utils/api';

function project(id: number, tags: string[] = []): PortfolioProject {
  return {
    id,
    title: `Project ${id}`,
    description: `Description ${id}`,
    description_html: null,
    image_url: null,
    thumbnail_url: null,
    short_title: null,
    icon_key: null,
    project_url: null,
    repo_url: null,
    languages: ['TypeScript'],
    tags,
    client_name: null,
    client_location: null,
    client_logo: null,
    featured: false,
    featured_order: 0,
    sort_order: id,
    is_visible: true,
  };
}

const skillReact: PortfolioSkill = {
  id: 7,
  name: 'React',
  category: 'Frontend',
  level: '80',
  icon_key: 'react',
  icon_type: null,
  icon_color: null,
  duration: null,
  sort_order: 1,
  is_visible: true,
};

describe('ProjectMatchGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia(false);
  });

  it('shows an empty state when the skill filter matches nothing', () => {
    render(
      <ProjectMatchGrid
        projects={[project(1, ['React'])]}
        skills={[skillReact]}
        skillFilter={[999]}
      />,
    );
    expect(screen.getByText(/No projects found/i)).toBeInTheDocument();
  });

  // The empty state used to be a bare `<div className="text-center
  // text-text-muted py-8">` — the only unstyled container on a site where
  // roughly a dozen sibling empty states are HudPanels, which is why it read
  // as a rendering bug rather than as "no matches".
  //
  // Asserted structurally: the house panel primitive's own root class, and the
  // role the state announces itself with. No pixel or colour assertions — a
  // test that pinned `border-top-color` would fail on a legitimate re-accent
  // while proving nothing about whether the panel is there.
  it('wraps the empty state in the house panel pattern and announces it politely', () => {
    const { container } = render(
      <ProjectMatchGrid
        projects={[project(1, ['React'])]}
        skills={[skillReact]}
        skillFilter={[999]}
      />,
    );

    // `role="status"` lives on the HudPanel root. Reverting to the bare div
    // removes it, so this is the assertion that actually guards the fix.
    const panel = screen.getByRole('status');
    expect(panel.className).toMatch(/rounded-card/);
    expect(panel).toHaveAttribute('aria-live', 'polite');
    expect(panel).toContainElement(screen.getByText(/No projects found/i));

    // Exactly one panel, and the copy lives inside it rather than beside it.
    expect(container.querySelectorAll('.rounded-card')).toHaveLength(1);
  });

  // A filtered-to-nothing result is an answer, not a fault: the panel must not
  // steal the disclosure affordance, and the card list must still be able to
  // come back once the filter is relaxed.
  it('keeps the panel swap reversible — relaxing the filter renders cards again', () => {
    const projects = [project(1, ['React']), project(2, ['React'])];
    const { rerender } = render(
      <ProjectMatchGrid
        projects={projects}
        skills={[skillReact]}
        skillFilter={[999]}
      />,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();

    rerender(<ProjectMatchGrid projects={projects} skills={[skillReact]} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('card:Project 1')).toBeInTheDocument();
    expect(screen.getByText('card:Project 2')).toBeInTheDocument();
  });

  it('expands a project to reveal the spring detail panel', () => {
    render(
      <ProjectMatchGrid
        projects={[project(1, ['React']), project(2, ['React'])]}
        skills={[skillReact]}
      />,
    );
    expect(screen.getByText('card:Project 1')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Expand Project 1'));
    expect(screen.getByText('Project 1')).toBeInTheDocument();
    expect(screen.getByText('Description 1')).toBeInTheDocument();
    expect(animate).toHaveBeenCalled();
    expect(createScope).toHaveBeenCalled();
  });

  // The detail panel is mounted only when `expanded`, and its entrance is owned
  // by `useMotionScope`. Reduced motion must skip that entrance entirely — not
  // merely shorten it — and the panel must land at its resting opacity so the
  // visitor still gets the expanded content.
  it('reduced-motion: expanding builds no scope and no tween, panel rests visible', () => {
    mockMatchMedia(true);

    const { container } = render(
      <ProjectMatchGrid
        projects={[project(1, ['React']), project(2, ['React'])]}
        skills={[skillReact]}
      />,
    );
    fireEvent.click(screen.getByLabelText('Expand Project 1'));

    // `useMotionScope.run` calls back with `null` instead of creating a scope,
    // so neither the scope nor the tween it would own can exist.
    expect(createScope).not.toHaveBeenCalled();
    expect(animate).not.toHaveBeenCalled();

    // Resting state is reached without an animation frame: the panel is in the
    // DOM and carries no inline opacity, so it renders at its natural 1.
    expect(screen.getByText('Project 1')).toBeInTheDocument();
    expect(screen.getByText('Description 1')).toBeInTheDocument();
    const panel = container.querySelector<HTMLElement>('.mt-3');
    expect(panel).not.toBeNull();
    expect(panel!.style.opacity).toBe('');
  });
});
