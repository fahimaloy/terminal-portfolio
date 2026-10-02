// src/__tests__/blog-stacking.test.ts
/* The blog's stacking contract, asserted statically.
 *
 * WHY SOURCE AND NOT THE DOM. jsdom has no layout, no paint and no
 * compositing: `getComputedStyle` there resolves authored declarations and
 * nothing else, so a rendered test can only ever see the class strings back
 * out again. Asking it "which of these two is on top" has no answer to give,
 * and a test that asserted one anyway would be theatre. What CAN be checked is
 * the thing that actually broke: the declarations themselves, and the ordering
 * they imply once the numbers in tokens.css are resolved. That is what this
 * file does — it reads the sources involved and proves the arithmetic, so the
 * next edit that re-introduces a z-index on a page root fails here rather than
 * in a browser.
 *
 * The contract, in one line: a page root opens no stacking context, so the
 * shell's fixed accent strip (mounted outside the root at `--z-hud`) can be
 * out-ranked by whatever the page draws over its own content — and the page as
 * a whole can never reach the route curtain, because the curtain is a SIBLING
 * of the stage the page is rendered in, not a descendant of it.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const src = (rel: string): string =>
  readFileSync(resolve(process.cwd(), rel), 'utf8');

const BLOG_INDEX = 'src/pages/blog/index.tsx';
const BLOG_SLUG = 'src/pages/blog/[slug].tsx';
const BLOG_REELS = 'src/components/blog/BlogReels.tsx';
const BLOG_HEADER = 'src/components/blog/BlogHeader.tsx';
const LIGHTNING = 'src/components/blog/LightningTransition.tsx';
const ROUTE_TRANSITION = 'src/components/ui/RouteTransition.tsx';
const TOKENS = 'src/styles/tokens.css';

/** `--name: 12;` as a number, straight out of the single source of truth. */
function token(name: string): number {
  const m = new RegExp(`--${name}:\\s*(-?[\\d.]+)\\s*;`).exec(src(TOKENS));
  if (!m) throw new Error(`--${name} is not declared in ${TOKENS}`);
  return Number(m[1]);
}

/**
 * The effective z-index of a z-index utility, with `z-[var(--x)]` resolved
 * against tokens.css so a token-driven band is compared by value rather than
 * by spelling. Throws on anything it does not understand — a silent `NaN`
 * would make every comparison below quietly false.
 */
function zIndexOf(utility: string): number {
  const m = /^z-(?!auto\b)(.+)$/.exec(utility);
  if (!m) throw new Error(`not a z-index utility: "${utility}"`);
  const varRef = /^\[var\(--([a-z0-9-]+)\)\]$/.exec(m[1]);
  if (varRef) return token(varRef[1]);
  const arbitrary = /^\[([\d.]+)\]$/.exec(m[1]);
  if (arbitrary) return Number(arbitrary[1]);
  if (!/^\d+$/.test(m[1])) {
    throw new Error(`unrecognised z-index utility: ${utility}`);
  }
  return Number(m[1]);
}

/** The z-index utility `pattern` captures out of a file, resolved. */
function capturedZ(file: string, pattern: RegExp): number {
  const m = pattern.exec(src(file));
  if (!m?.[1]) throw new Error(`${pattern} captured no z-index in ${file}`);
  return zIndexOf(m[1]);
}

/** Every z-index utility on a className, verbatim. */
function zUtilities(className: string): string[] {
  return (className.match(/(?:^|\s)z-(?!auto\b)[^\s"']+/g) ?? []).map((u) =>
    u.trim(),
  );
}

/** The className of the first element opened by `tag`. */
function rootClassName(file: string, tag: string): string {
  const m = new RegExp(`<${tag}\\b[^>]*?className="([^"]*)"`, 's').exec(
    src(file),
  );
  if (!m) throw new Error(`no <${tag}> with a className found in ${file}`);
  return m[1];
}

/** The className of the `role="dialog"` overlay in a file. */
function dialogClassName(file: string): string {
  const m = /className="([^"]*)"\s*role="dialog"/.exec(src(file));
  if (!m) throw new Error(`no role="dialog" overlay found in ${file}`);
  return m[1];
}

describe('blog page roots open no stacking context', () => {
  const roots: Array<[string, string, string]> = [
    ['the archive root', BLOG_INDEX, 'main'],
    ['the reader root', BLOG_SLUG, 'article'],
  ];

  for (const [label, file, tag] of roots) {
    it(`${label} carries no z-index`, () => {
      // The exact regression: `relative z-10` on a positioned element. A
      // z-index here makes the root a stacking context, and every z-index
      // under it stops being comparable with anything outside — so the
      // shell's fixed accent strip, mounted by `_app.tsx` outside this root
      // at `--z-hud`, paints over any full-screen overlay the page opens.
      expect(zUtilities(rootClassName(file, tag))).toEqual([]);
    });
  }

  it('keeps `relative` on the archive root, which the room veil needs', () => {
    // The veil is `absolute inset-0` with no other positioned ancestor; drop
    // `relative` by accident and it escapes to the viewport, washing the whole
    // page instead of the room.
    expect(rootClassName(BLOG_INDEX, 'main')).toMatch(
      /(?:^|\s)relative(?:\s|$)/,
    );
  });
});

describe('the blog lightbox out-ranks the shell accent strip', () => {
  it('sits above `--z-hud`', () => {
    // Deliverable one, in the only form arithmetic can check without a
    // compositor. The comparison is only meaningful because the page root no
    // longer traps this: a z-index nested under a stacking context is not
    // comparable with the strip at all.
    const lightbox = zIndexOf(
      zUtilities(dialogClassName(BLOG_REELS))[0] ?? 'z-0',
    );
    expect(lightbox).toBeGreaterThan(token('z-hud'));
  });

  it('names its band rather than tying with the sticky header', () => {
    // `--z-header` is 40 and the lightbox used to be a bare `z-40`: a tie, won
    // only because the dialog happens to come later in the DOM. A tie is not
    // a layer, and it breaks the moment the header is re-ordered.
    const lightbox = dialogClassName(BLOG_REELS);
    expect(lightbox).toMatch(/(?:^|\s)z-\[var\(--[a-z-]+\)\]/);
    expect(zIndexOf(zUtilities(lightbox)[0] ?? 'z-0')).toBeGreaterThan(
      capturedZ(BLOG_HEADER, /className="sticky top-0 (z-[^\s"]+)/),
    );
  });
});

describe('the blog flash covers the strip — the recorded decision', () => {
  it('is above `--z-hud`', () => {
    // A full-viewport page turn is an occluder, not an accent, and it sets
    // `pointer-events: auto` on itself for the length of the cover. A strip
    // left lit and looking clickable through one is the "unowned overlay"
    // reading `_app.tsx` rejects, and the shell's own curtain already treats
    // the strip this way. Deliberate: see the note on the blog roots.
    expect(
      capturedZ(LIGHTNING, /className="fixed inset-0 (z-[^\s"]+)/),
    ).toBeGreaterThan(token('z-hud'));
  });

  it('is mounted outside the reader root, so the root cannot trap it', () => {
    // `[slug].tsx` renders `LightningTransition` as a SIBLING of the article.
    // That is what lets the wipe cover the strip with no ancestor z-index in
    // the way, and it is why dropping the reader root's z-index cannot have
    // released the flash over the strip.
    const article = /<article\b/.exec(src(BLOG_SLUG))?.index ?? -1;
    const flash = /<LightningTransition\b/.exec(src(BLOG_SLUG))?.index ?? -1;
    expect(article).toBeGreaterThan(-1);
    expect(flash).toBeGreaterThan(-1);
    expect(flash).toBeLessThan(article);
  });
});

describe('no blog overlay can reach the route curtain', () => {
  it('renders the page in a stage that sits below the curtain', () => {
    // The guarantee is structural, not numeric: `RouteTransition` puts the
    // page and the accent strip in one stage and hangs the curtain beside it,
    // so the whole stage is under the curtain whatever any page declares — a
    // blog overlay at `--z-modal` included. If the stage ever rises to meet the
    // curtain, this is the assertion that says so.
    expect(
      capturedZ(ROUTE_TRANSITION, /className="rt-stage relative (z-[^\s"]+)/),
    ).toBeLessThan(
      capturedZ(
        ROUTE_TRANSITION,
        /className="rt-root fixed inset-0 (z-[^\s"]+)/,
      ),
    );
  });
});
