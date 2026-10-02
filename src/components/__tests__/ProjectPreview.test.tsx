// src/components/__tests__/ProjectPreview.test.tsx
//
// The project tabs used to be a `<div onClick>` with no role, no tab stop and no
// state — a keyboard user could not reach them, and nothing announced which
// project was selected. They are now a real `<button role="tab">` inside a
// `role="tablist"`, with a roving tabindex and arrow-key selection.
//
// These tests assert the whole keyboard path, not just that a role attribute
// exists: reachability, the announced selection, the tab↔panel wiring, and the
// arrow keys actually moving focus *and* selection together.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { getProjectMedia } from '../../utils/api';
import type { PortfolioProject } from '../../utils/api';

vi.mock('../../utils/api', () => ({
  getProjectMedia: vi.fn().mockResolvedValue([]),
}));

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

import ProjectPreview from '../ProjectPreview';

/** jsdom has no matchMedia; `isReducedMotion()` / `canAnimate()` in
 * config/animations both read it, and HudPanel's entrance short-circuits on
 * either. Stubbing it keeps the panel out of its entrance so the resting DOM
 * is what these tests read. */
function mockMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function project(id: number, short: string): PortfolioProject {
  return {
    id,
    title: `Project ${id}`,
    description: `Description ${id}`,
    description_html: null,
    image_url: null,
    thumbnail_url: null,
    short_title: short,
    icon_key: null,
    project_url: null,
    repo_url: null,
    languages: [],
    tags: [],
    client_name: null,
    client_location: null,
    client_logo: null,
    featured: false,
    featured_order: 0,
    sort_order: id,
    is_visible: true,
  };
}

const THREE = [project(1, 'ALPHA'), project(2, 'BETA'), project(3, 'GAMMA')];

function renderPreview(onSelectProject = vi.fn()) {
  render(<ProjectPreview projects={THREE} onSelectProject={onSelectProject} />);
  return { onSelectProject };
}

/** Tabs in DOM order, so an index means the same thing in every assertion. */
const tabs = () => screen.getAllByRole('tab') as HTMLButtonElement[];

describe('ProjectPreview project tabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia();
  });

  /**
   * The regression itself: a clickable div is not reachable with Tab and has no
   * role, so nothing about these tabs was exposed to a keyboard or a screen
   * reader. Asserting the tag as well as the role catches a `div` carrying
   * `role="tab"` — which is focusable-ish and activatable-looking but still
   * dead to Enter and Space.
   */
  it('renders each tab as a real button with the tab role', () => {
    renderPreview();

    expect(tabs()).toHaveLength(3);
    for (const tab of tabs()) {
      expect(tab.tagName).toBe('BUTTON');
      // A bare button defaults to type="submit"; there is no form here, but the
      // explicit attribute is what keeps it out of any ancestor form.
      expect(tab.getAttribute('type')).toBe('button');
    }
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('announces the selected tab and links every tab to the one panel', () => {
    renderPreview();

    const all = tabs();
    const panel = screen.getByRole('tabpanel');

    // First project is the selection on mount.
    expect(all[0].getAttribute('aria-selected')).toBe('true');
    expect(all[1].getAttribute('aria-selected')).toBe('false');
    expect(all[2].getAttribute('aria-selected')).toBe('false');

    for (const tab of all) {
      expect(tab.getAttribute('aria-controls')).toBe(panel.id);
    }
    expect(panel.id).not.toBe('');
    // The panel is named by the tab that is actually selected — not by the
    // first tab in the list, which is the bug a stale `activeTabId` would ship.
    expect(panel.getAttribute('aria-labelledby')).toBe(all[0].id);

    fireEvent.click(all[2]);
    expect(tabs()[2].getAttribute('aria-selected')).toBe('true');
    expect(tabs()[0].getAttribute('aria-selected')).toBe('false');
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(
      tabs()[2].id,
    );
  });

  /**
   * Roving tabindex: exactly one tab is in the tab order. If this is wrong in
   * the "everything is a stop" direction the strip costs five Tab presses; if
   * it is wrong in the "nothing is a stop" direction the tabs are unreachable
   * and the arrow-key test below would be the only way in. Both are asserted.
   */
  it('keeps exactly one tab in the tab order and moves it with the selection', () => {
    renderPreview();

    expect(tabs().map((t) => t.tabIndex)).toEqual([0, -1, -1]);

    fireEvent.click(tabs()[1]);
    expect(tabs().map((t) => t.tabIndex)).toEqual([-1, 0, -1]);
  });

  it('arrow keys move focus and selection together, wrapping at both ends', () => {
    const { onSelectProject } = renderPreview();

    tabs()[0].focus();
    expect(document.activeElement).toBe(tabs()[0]);

    fireEvent.keyDown(tabs()[0], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tabs()[1]);
    expect(tabs()[1].getAttribute('aria-selected')).toBe('true');
    expect(onSelectProject).toHaveBeenLastCalledWith(1);

    fireEvent.keyDown(tabs()[1], { key: 'End' });
    expect(document.activeElement).toBe(tabs()[2]);
    expect(tabs()[2].getAttribute('aria-selected')).toBe('true');

    // Wraps past the end back to the first tab.
    fireEvent.keyDown(tabs()[2], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tabs()[0]);
    expect(tabs()[0].getAttribute('aria-selected')).toBe('true');

    // And back past the start to the last.
    fireEvent.keyDown(tabs()[0], { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(tabs()[2]);

    fireEvent.keyDown(tabs()[2], { key: 'Home' });
    expect(document.activeElement).toBe(tabs()[0]);
    expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
  });

  it('still selects on pointer click', () => {
    const { onSelectProject } = renderPreview();
    fireEvent.click(tabs()[2]);
    expect(onSelectProject).toHaveBeenLastCalledWith(2);
    expect(tabs()[2].getAttribute('aria-selected')).toBe('true');
  });

  it('renders no tablist when there is only one project to switch between', () => {
    render(<ProjectPreview projects={[THREE[0]]} onSelectProject={vi.fn()} />);
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });

  it('loads media for every project once, not per tab', () => {
    renderPreview();
    expect(getProjectMedia).toHaveBeenCalledWith([1, 2, 3]);
  });
});
