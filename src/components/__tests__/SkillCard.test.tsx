// src/components/__tests__/SkillCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import SkillCard from '../SkillCard';

vi.mock('../ui', () => ({
  __esModule: true,
  Tilt3D: ({ children }: { children: ReactNode }) => {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'tilt' }, children);
  },
  HudPanel: ({ children }: { children: ReactNode }) => {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'hud-panel' }, children);
  },
}));

const skill = {
  id: 1,
  name: 'React',
  category: 'Frontend',
  level: '80',
  icon_key: 'react',
  icon_type: null,
  icon_color: null,
  duration: '2 yrs',
  sort_order: 1,
  is_visible: true,
};

describe('SkillCard', () => {
  it('renders the brand icon, name, and static level width', () => {
    const { container } = render(<SkillCard skill={skill} />);
    expect(screen.getByText('React')).toBeInTheDocument();
    // accent-cycled cyan panel exposes wash via HudPanel
    expect(screen.getByTestId('hud-panel')).toBeInTheDocument();
    const bar = container.querySelector('[style*="width: 80%"]');
    expect(bar).not.toBeNull();
  });

  it('inline mode renders icon plus name without the level bar', () => {
    const { container } = render(<SkillCard skill={skill} inline />);
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.queryByTestId('hud-panel')).toBeNull();
    expect(container.querySelector('[style*="width: 80%"]')).toBeNull();
  });
});
