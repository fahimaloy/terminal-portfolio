// src/components/ui/__tests__/Background.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';

// fully mock animejs — all exports vi.fn(), scope.add executes callback immediately
vi.mock('animejs', () => {
  const mockRevert = vi.fn();
  const mockAdd: any = vi.fn((cb: () => void) => {
    cb();
    return mockScope;
  });
  const mockScope: any = { add: mockAdd, revert: mockRevert };
  return {
    animate: vi.fn(),
    createScope: vi.fn(() => mockScope),
    createTimeline: vi.fn(() => ({ add: vi.fn() })),
    createDrawable: vi.fn(() => ({})),
    morphTo: vi.fn((s: string) => s),
    onScroll: vi.fn((o: unknown) => o),
    spring: vi.fn(() => 'spring-ease'),
    stagger: vi.fn((v: unknown) => v),
  };
});

// isolate Background from child-particle animations so animate counts reflect aurora drift only
vi.mock('../TronGrid', () => ({
  default: () => <div data-testid="tron-grid" />,
}));
vi.mock('../ScanlineOverlay', () => ({
  default: () => <div data-testid="scanline" />,
}));
vi.mock('../ParticleField', () => ({
  default: () => <div data-testid="particles" />,
}));

import Background from '../Background';
import { animate, createScope, spring } from 'animejs';

function mockMatchMedia(reduceMatches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches:
        query === '(prefers-reduced-motion: reduce)' ? reduceMatches : false,
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

function clearMatchMedia() {
  // jsdom has no matchMedia by default — remove mocked property so isReducedMotion/canAnimate return false
  // eslint-disable-next-line
  delete (window as any).matchMedia;
}

describe('Background', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
    clearMatchMedia();
  });

  it('hero/default have willChange=transform and trigger aurora drift animate', () => {
    const { container, unmount } = render(<Background variant="hero" />);
    const blobs = container.querySelectorAll<HTMLElement>('.bg-aurora-blob');
    expect(blobs.length).toBe(4);
    blobs.forEach((el) => {
      expect(el.style.willChange).toBe('transform');
    });
    // aurora drift gated for !isBlog — should animate each blob (4 times)
    expect(animate).toHaveBeenCalled();
    expect(
      (animate as unknown as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBeGreaterThanOrEqual(4);
    expect(spring).toHaveBeenCalled();
    expect(createScope).toHaveBeenCalledTimes(1);

    // opacity for hero is highest (0.12 etc)
    expect(blobs[0].style.opacity).toBe('0.12');
    expect(blobs[1].style.opacity).toBe('0.1');
    unmount();

    vi.clearAllMocks();
    mockMatchMedia(false);
    const { container: c2 } = render(<Background variant="default" />);
    const blobs2 = c2.querySelectorAll<HTMLElement>('.bg-aurora-blob');
    expect(blobs2.length).toBe(4);
    blobs2.forEach((el) => expect(el.style.willChange).toBe('transform'));
    expect(animate).toHaveBeenCalled();
    expect(blobs2[0].style.opacity).toBe('0.09');
    expect(blobs2[0].style.opacity).not.toBe('0.12');
  });

  it('blog variant has muted auroras: willChange not transform and no animate drift', () => {
    const { container } = render(<Background variant="blog" />);
    const blobs = container.querySelectorAll<HTMLElement>('.bg-aurora-blob');
    expect(blobs.length).toBe(4);
    blobs.forEach((el) => {
      // fix #5: willChange is undefined when !driftActive — jsdom serializes as "" not "transform"
      expect(el.style.willChange).not.toBe('transform');
      expect(
        el.style.willChange === '' ||
          el.style.willChange === 'auto' ||
          el.style.willChange === 'undefined',
      ).toBeTruthy();
    });
    // gated aurora drift — animate should NOT be called for aurora (child mocks prevent particle animate)
    expect(animate).not.toHaveBeenCalled();
    expect(spring).not.toHaveBeenCalled();

    // opacities more muted for blog
    expect(blobs[0].style.opacity).toBe('0.06');
    expect(blobs[1].style.opacity).toBe('0.05');
    expect(blobs[2].style.opacity).toBe('0.05');
    expect(blobs[3].style.opacity).toBe('0.04');
  });

  it('auroraOpacities differ by variant', () => {
    const { container: heroC, unmount: u1 } = render(
      <Background variant="hero" />,
    );
    const heroBlobs = heroC.querySelectorAll<HTMLElement>('.bg-aurora-blob');
    expect(heroBlobs[0].style.opacity).toBe('0.12');
    expect(heroBlobs[1].style.opacity).toBe('0.1');
    u1();
    vi.clearAllMocks();
    mockMatchMedia(false);

    const { container: blogC, unmount: u2 } = render(
      <Background variant="blog" />,
    );
    const blogBlobs = blogC.querySelectorAll<HTMLElement>('.bg-aurora-blob');
    expect(blogBlobs[0].style.opacity).toBe('0.06');
    u2();
    vi.clearAllMocks();
    mockMatchMedia(false);

    const { container: defC } = render(<Background />);
    const defBlobs = defC.querySelectorAll<HTMLElement>('.bg-aurora-blob');
    expect(defBlobs[0].style.opacity).toBe('0.09');
    // hero vs blog vs default all distinct for a1
    expect(heroBlobs[0].style.opacity).not.toBe(blogBlobs[0].style.opacity);
    expect(defBlobs[0].style.opacity).not.toBe(heroBlobs[0].style.opacity);
    expect(defBlobs[0].style.opacity).not.toBe(blogBlobs[0].style.opacity);
  });

  it('rerender with different variant triggers second createScope (deps [variant])', () => {
    const { rerender } = render(<Background variant="hero" />);
    expect(createScope).toHaveBeenCalledTimes(1);
    expect(animate).toHaveBeenCalledTimes(4);

    vi.clearAllMocks();
    // need to keep matchMedia mocked for second effect
    mockMatchMedia(false);
    // mock impl still returns scope with add executing callback — need to re-mock createScope after clear?
    // vi.clearAllMocks clears mock history but keeps impl; re-use same mock
    rerender(<Background variant="blog" />);
    // second effect should have run and created a second scope
    expect(createScope).toHaveBeenCalledTimes(1);
    // blog has no aurora animate
    expect(animate).not.toHaveBeenCalled();

    vi.clearAllMocks();
    mockMatchMedia(false);
    rerender(<Background variant="default" />);
    expect(createScope).toHaveBeenCalledTimes(1);
    expect(animate).toHaveBeenCalledTimes(4);
  });

  it('reduced-motion skips createScope entirely', () => {
    vi.clearAllMocks();
    mockMatchMedia(true);
    const { container } = render(<Background variant="hero" />);
    expect(createScope).not.toHaveBeenCalled();
    expect(animate).not.toHaveBeenCalled();
    // still renders static auroras but gated drift not run
    const blobs = container.querySelectorAll<HTMLElement>('.bg-aurora-blob');
    expect(blobs.length).toBe(4);
    // driftActive is gated by reduced-motion — willChange is not transform when motion is reduced
    blobs.forEach((el) => expect(el.style.willChange).not.toBe('transform'));
  });

  it('default variant rerenders from hero to blog correctly disables willChange', () => {
    const { container, rerender } = render(<Background variant="hero" />);
    let blobs = container.querySelectorAll<HTMLElement>('.bg-aurora-blob');
    expect(blobs[0].style.willChange).toBe('transform');
    rerender(<Background variant="blog" />);
    blobs = container.querySelectorAll<HTMLElement>('.bg-aurora-blob');
    blobs.forEach((el) => expect(el.style.willChange).not.toBe('transform'));
  });
});
