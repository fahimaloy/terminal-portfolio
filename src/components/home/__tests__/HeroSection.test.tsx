// src/components/home/__tests__/HeroSection.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';

vi.mock('animejs', () => {
  const scope = {
    add: vi.fn((...args: unknown[]) => {
      const callback = args.find(
        (arg): arg is () => void => typeof arg === 'function',
      );
      callback?.();
      return scope;
    }),
    revert: vi.fn(),
  };

  return {
    __esModule: true,
    animate: vi.fn(),
    createScope: vi.fn(() => scope),
    createTimeline: vi.fn(() => ({ add: vi.fn() })),
    createDrawable: vi.fn(() => []),
    splitText: vi.fn(() => ({ chars: [], words: [], revert: vi.fn() })),
    spring: vi.fn(() => 'spring-ease'),
    stagger: vi.fn((value: unknown) => value),
  };
});

import HeroSection from '../HeroSection';
import { createScope, createTimeline } from 'animejs';
import type { PortfolioProfile } from '../../../utils/api';
import {
  BOOT_COMPLETE_EVENT,
  BOOT_DONE_ATTR,
  type BootCompletionReason,
} from '../../ui/BootSequence';

const mockedCreateScope = vi.mocked(createScope);
const mockedCreateTimeline = vi.mocked(createTimeline);

/**
 * Targets and position of every `tl.add(...)` the entrance made, keyed for
 * lookup by the element being animated. anime.js is mocked here, so the
 * timeline is the only record of what the choreography actually touched and
 * when — which is exactly what the assertions below need to inspect.
 *
 * `querySelectorAll` hands the timeline a NodeList, so the target argument is
 * a single element *or* an Array *or* a NodeList depending on the beat.
 */
function timelineAdds(container: HTMLElement) {
  const tl = mockedCreateTimeline.mock.results[0]?.value as
    { add: ReturnType<typeof vi.fn> } | undefined;
  const calls = tl?.add.mock.calls ?? [];
  const flatten = (target: unknown): Element[] =>
    target instanceof Element
      ? [target]
      : Array.from((target ?? []) as ArrayLike<Element>);
  return {
    calls,
    positionOf(selector: string): unknown {
      const el = container.querySelector(selector);
      const call = calls.find((c) => flatten(c[0]).includes(el as Element));
      return call?.[2];
    },
    revealed: new Set<Element>(calls.flatMap((c) => flatten(c[0]))),
  };
}

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
  Reflect.deleteProperty(window, 'matchMedia');
}

/**
 * The two read paths of the boot-gate contract documented in the HeroSection
 * header, reproduced exactly as `_app.tsx` uses them — the live broadcast for a
 * hero that is already mounted, the sticky `<html>` attribute for one that
 * arrives after the splash. The entrance is deliberately parked until one of
 * them fires, so any test that wants the animation must cross the gate first.
 */
function broadcastBootComplete(reason: BootCompletionReason = 'complete') {
  act(() => {
    document.documentElement.setAttribute(BOOT_DONE_ATTR, reason);
    window.dispatchEvent(
      new CustomEvent(BOOT_COMPLETE_EVENT, { detail: { reason } }),
    );
  });
}

function latchBootDone(reason: BootCompletionReason = 'complete') {
  document.documentElement.setAttribute(BOOT_DONE_ATTR, reason);
}

const noop = vi.fn();

/**
 * `profiles.title` is the CMS role field behind the same `profile` prop that
 * already drives the name, so the hero needed no second fetch path to stop
 * hardcoding it. The Supabase row is the only variable under test, so it is
 * built in full and cast nowhere.
 */
function profileWith(
  title: string | null,
  overrides: Partial<PortfolioProfile> = {},
): PortfolioProfile {
  return {
    id: 'profile-1',
    full_name: 'Fahim Ahmed',
    title,
    bio: null,
    welcome_message: null,
    summary: null,
    phone: null,
    email: null,
    location: null,
    website: null,
    github: null,
    linkedin: null,
    resume_url: null,
    avatar_url: null,
    is_active: true,
    ...overrides,
  };
}

const heroProps = {
  profile: null,
  siteTexts: {},
  projectCount: 0,
  skillCount: 0,
  expCount: 0,
  onSend: noop,
} as const;

describe('HeroSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
    clearMatchMedia();
    // The latch is sticky for the life of an app mount; jsdom keeps <html>
    // across tests, so a leaked attribute would silently un-gate the next one.
    document.documentElement.removeAttribute(BOOT_DONE_ATTR);
  });

  // Regression guard: the quick cards were invisible because they carried a
  // Tailwind `opacity-0` class that survived every scope.revert(). If an
  // animated node ever regains a hiding class, this fails.
  it('never hides animated nodes with a utility opacity class', () => {
    const { container } = render(<HeroSection {...heroProps} />);

    const animated = container.querySelectorAll(
      '[data-hero="label"], [data-hero="name"], [data-hero="title"], ' +
        '[data-hero="stats"] > div, [data-hero="card"]',
    );
    expect(animated.length).toBeGreaterThan(0);
    animated.forEach((el) => {
      const hiding = Array.from(el.classList).filter((c) =>
        /^opacity-\d+$/.test(c),
      );
      expect(hiding).toEqual([]);
    });
  });

  it('renders six quick-command cards and three stats', () => {
    const { container } = render(
      <HeroSection
        {...heroProps}
        projectCount={4}
        skillCount={12}
        expCount={3}
      />,
    );
    expect(container.querySelectorAll('[data-hero="card"]')).toHaveLength(6);
    expect(
      container.querySelectorAll('[data-hero="stats"] > div'),
    ).toHaveLength(3);
  });

  // The gate is the contract, not an accident: the entrance must not run
  // against a splash that still covers it.
  it('holds the entrance until the splash reports boot complete', () => {
    render(<HeroSection {...heroProps} />);
    expect(mockedCreateScope).not.toHaveBeenCalled();

    broadcastBootComplete();
    expect(mockedCreateScope).toHaveBeenCalledTimes(1);
  });

  // A listener can miss the broadcast; the latch cannot be missed.
  it('reveals immediately when the hero mounts after the splash already cleared', () => {
    latchBootDone('timeout');
    render(<HeroSection {...heroProps} />);
    expect(mockedCreateScope).toHaveBeenCalledTimes(1);
  });

  // The third read path of the gate contract, and the reason it is its own
  // branch rather than a subset of the two above: reduced motion must not wait
  // for a signal that would teach the visitor nothing. The hero would sit
  // invisible until the splash finished, for a page they asked for without
  // motion at all.
  it('reveals immediately under reduced motion, without a boot signal', () => {
    mockMatchMedia(true);
    render(<HeroSection {...heroProps} />);
    expect(mockedCreateScope).toHaveBeenCalledTimes(1);
  });

  // The entrance hides its nodes in JS rather than with an `opacity-*` class so
  // `scope.revert()` can restore them. That makes "hide without ever revealing"
  // the one failure this design cannot recover from: the node is simply gone for
  // the life of the page. Both branches are checked, because the two hide the
  // same set but are written separately — a node added to the hidden list
  // without being added to the branch below strands it.
  //
  // The sweep is deliberately excluded: opacity 0 IS its resting state, and the
  // reduced branch never plays it. It is a highlight, not content.
  it.each([
    ['animated', false],
    ['reduced', true],
  ])('reveals every node it hides on the %s path', (_path, reduce) => {
    mockMatchMedia(reduce);
    const { container } = render(<HeroSection {...heroProps} />);
    if (!reduce) broadcastBootComplete();

    const stranded = Array.from(
      container.querySelectorAll<HTMLElement>('[data-hero]'),
    )
      .filter((el) => el.getAttribute('data-hero') !== 'sweep')
      .filter((el) => el.style.opacity === '0')
      .filter((el) => !timelineAdds(container).revealed.has(el));

    expect(stranded).toEqual([]);
  });

  // The header labels the cards; it used to paint at full opacity from the very
  // first frame while its contents faded in a second later. Compared to the
  // cards' own position rather than to a millisecond literal, so a future
  // retiming of the whole hero does not break it.
  it('reveals the quick-command header and rail with the cards they label', () => {
    const { container } = render(<HeroSection {...heroProps} />);
    broadcastBootComplete();

    const cardsAt = timelineAdds(container).positionOf('[data-hero="card"]');
    expect(cardsAt).toBeDefined();
    expect(timelineAdds(container).positionOf('[data-hero="railhead"]')).toBe(
      cardsAt,
    );
    expect(timelineAdds(container).positionOf('[data-hero="rail"]')).toBe(
      cardsAt,
    );
  });

  it('reverts its scope on unmount', () => {
    const { unmount } = render(<HeroSection {...heroProps} />);
    broadcastBootComplete();

    const scope = mockedCreateScope.mock.results[0].value as {
      revert: ReturnType<typeof vi.fn>;
    };
    unmount();
    expect(scope.revert).toHaveBeenCalledTimes(1);
  });

  // ── P3.8 — hero content integrity ────────────────────────────────────────
  it('renders the role line from the CMS profile title', () => {
    const { container } = render(
      <HeroSection
        {...heroProps}
        profile={profileWith('Realtime Systems Engineer')}
      />,
    );
    const roleEl = container.querySelector('[data-hero="title"]');
    expect(roleEl?.textContent).toContain('Realtime Systems Engineer');
    // The last word stays set apart so an *edited* title still reads as a
    // lockup rather than a sentence.
    expect(roleEl?.querySelector('span')?.textContent).toBe('Engineer');
  });

  // The CMS can be empty, missing, or whitespace-padded. The one thing it may
  // never do is leave the hero blank.
  it.each([
    ['null', null],
    ['an empty string', ''],
    ['whitespace only', '   '],
  ])('falls back to a static role when the CMS title is %s', (_case, title) => {
    const { container } = render(
      <HeroSection {...heroProps} profile={profileWith(title)} />,
    );
    const roleEl = container.querySelector('[data-hero="title"]');
    expect(roleEl?.textContent?.trim()).toBe('FULL-STACK DEVELOPER');
  });

  it('still renders a role when the profile itself has not loaded', () => {
    const { container } = render(<HeroSection {...heroProps} />);
    const roleEl = container.querySelector('[data-hero="title"]');
    expect(roleEl?.textContent?.trim()).toBe('FULL-STACK DEVELOPER');
  });

  // The hierarchy inversion, pinned. Emphasis moved on three axes at once:
  // the number dropped 3xl→xl and the label 9px→xs so the pair reads as one
  // unit, the number gave up the bright token (fg-1→fg-3), the label took it
  // (fg-3→fg-2), and `flex-col-reverse` lifted the label above the number.
  // DOM order stays value-first so the row still reads "12+ PROJECTS" aloud.
  it('leads each stat with its label and supports it with the number', () => {
    const { container } = render(
      <HeroSection
        {...heroProps}
        projectCount={4}
        skillCount={12}
        expCount={3}
      />,
    );
    const cell = container.querySelector('[data-hero="stats"] > div');
    expect(cell?.classList.contains('flex-col-reverse')).toBe(true);

    const [value, label] = Array.from(cell?.children ?? []);
    expect(label?.textContent).toBe('PROJECTS');
    expect(value?.textContent).toContain('4');

    // The label is the higher-contrast token; the number recedes to the quiet one.
    expect(label?.getAttribute('style')).toContain('var(--fg-2)');
    expect(value?.getAttribute('style')).toContain('var(--fg-3)');
    // Neither the number nor the label is back to its old shouting size.
    expect(value?.className).toContain('text-xl');
    expect(label?.className).toContain('text-xs');
  });

  // ── P3.11 — the type-voice decision, pinned ──────────────────────────────
  // The hero is deliberately a mono lockup (see the NAME_TYPE comment). If a
  // later edit restores `font-display` here, the page silently reverts to the
  // stock cyberpunk voice this decision was made to leave, and the reasoning
  // above quietly stops being true.
  it('sets the hero in the mono face, not the display face', () => {
    const { container } = render(<HeroSection {...heroProps} />);
    const name = container.querySelector('.hero-name-el');
    expect(name?.classList.contains('font-mono')).toBe(true);
    expect(container.querySelectorAll('.font-display')).toHaveLength(0);
  });

  // JetBrains Mono is requested at 400 and 500 only, so a 700 would be a faux
  // bold — smeared strokes on a 7rem monospaced face.
  it('never asks the mono face for a weight it was not loaded at', () => {
    const { container } = render(<HeroSection {...heroProps} />);
    container.querySelectorAll('.font-mono').forEach((el) => {
      expect(el.className).not.toContain('font-bold');
      expect(el.className).not.toContain('font-semibold');
    });
  });
});
