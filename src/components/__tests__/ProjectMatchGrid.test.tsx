// src/components/__tests__/ProjectMatchGrid.test.tsx
import { describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { animate } from 'animejs';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
});

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
  });
});
