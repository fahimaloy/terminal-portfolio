// src/components/__tests__/ProjectDetailDrawer.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: true,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

vi.mock('animejs', () => ({
  animate: vi.fn(),
  spring: vi.fn(() => 'spring-ease'),
  stagger: vi.fn(() => 0),
}));

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const React = require('react');
    return React.createElement('img', props);
  },
}));

import ProjectDetailDrawer from '../ProjectDetailDrawer';
import type { PortfolioProject, PortfolioSkill } from '../../utils/api';

const demoProject: PortfolioProject = {
  id: 3,
  title: 'Drawer Demo',
  description: 'Drawer body copy',
  description_html: null,
  image_url: null,
  thumbnail_url: 'https://example.com/cover.png',
  short_title: null,
  icon_key: null,
  project_url: 'https://example.com/live',
  repo_url: 'https://example.com/repo',
  languages: ['TypeScript', 'React'],
  tags: ['React'],
  client_name: null,
  client_location: null,
  client_logo: null,
  featured: false,
  featured_order: 0,
  sort_order: 1,
  is_visible: true,
};

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

describe('ProjectDetailDrawer', () => {
  it('renders cover, tags, languages, and links as a labelled dialog', () => {
    render(
      <ProjectDetailDrawer
        isOpen
        onClose={() => {}}
        projects={[demoProject]}
        skills={[skillReact]}
      />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Drawer Demo' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Drawer Demo')).toBeInTheDocument();
    expect(screen.getByText('Drawer body copy')).toBeInTheDocument();
    expect(screen.getAllByText('React').length).toBeGreaterThan(0);
    expect(screen.getByText('Live Demo')).toBeInTheDocument();
    expect(screen.getByText('Repository')).toBeInTheDocument();
  });

  it('closes via the close button and the Escape key', async () => {
    const onClose = vi.fn();
    render(
      <ProjectDetailDrawer
        isOpen
        onClose={onClose}
        projects={[demoProject]}
        skills={[skillReact]}
      />,
    );
    fireEvent.click(await screen.findByLabelText('Close project details'));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
