import React from 'react';
import '../styles/global.css';
import Head from 'next/head';
import { useRouter } from 'next/router';
import type { AppProps } from 'next/app';
import ErrorBoundary from '../components/ErrorBoundary';
import SceneLayer from '../components/scene/SceneLayer';
import BootSequence, {
  BOOT_COMPLETE_EVENT,
  BOOT_DONE_ATTR,
  type BootCompletionReason,
} from '../components/ui/BootSequence';
import { ToastProvider } from '../components/ui/Toast';
import CursorGlow from '../components/ui/CursorGlow';
import AccentSwitcher from '../components/ui/AccentSwitcher';
import RouteTransition from '../components/ui/RouteTransition';
import { durations } from '../config/animations';

/**
 * Route prefixes belonging to the admin panel. One list serving two jobs that
 * happen to be independent today: the crawler `noindex` tag and the scene gate
 * further down. The name states the intent rather than the mechanism, so the
 * coupling is visible at the point someone edits it — see the comment on
 * `isAdmin` below for what adding an entry here actually costs.
 */
const ADMIN_PREFIXES = ['/sudosuperuser-ostaad'];

/**
 * Fail-open watchdog, in milliseconds. Not an animation duration — it is the
 * "the splash genuinely never told us" ceiling, so it is deliberately longer
 * than any splash can be on screen: BootSequence's own `HARD_CEILING_MS` is
 * 8s. Sized off the splash token so retiming the sequence in `tokens.css`
 * moves the watchdog with it instead of leaving it behind.
 */
const BOOT_FAIL_OPEN_MS = durations.splashFull * 1000 * 1.75;

/**
 * Where the accent strip is anchored, per route.
 *
 * The shell is the only place that can host a site-wide control (see the note
 * on the JSX below), and a shell-level control has to be `fixed`: the pages
 * that own the bottom of the viewport are not ours to reflow, and adding a
 * row to five different page roots is how a "global" preference ends up
 * missing on four of them.
 *
 * Bottom-left is the only corner with no permanent occupant on any route.
 * Top-left is the homepage's identity plate, top-right its instrument cluster,
 * top-centre the scroll rail, bottom-centre the composer, and bottom-right the
 * toast. `Toast` is also the precedent that a fixed corner instrument is
 * allowed to overlay page content on this site.
 *
 * `/` is the exception. Its composer is flush with the viewport bottom and
 * full width up to `max-w-4xl`, so the strip lifts clear of it there — and the
 * lift is a token, not a measurement. `--composer-clearance` is spelled out of
 * the same primitives the composer itself consumes (`ChatInputBar` reads
 * `--composer-bar-min`, `--composer-gap` and `--composer-inset`; the homepage
 * footer reads `--composer-safe`), so changing a composer padding moves this
 * offset with it instead of silently reintroducing a magic number that used to
 * agree by hand. Every other route keeps the strip on `--hud-inset`, the same
 * 16px gutter it uses on its left edge.
 *
 * `HudChrome`'s "LAST COMMAND" caption stacks directly on top of this strip in
 * this same corner, so it offsets by `--hud-stack-clearance` rather than a
 * fixed `bottom-40`. They cannot overlap again unless the strip itself grows,
 * and `--hud-strip-h` is what records that.
 */
const ACCENT_STRIP_ANCHOR = {
  home: 'bottom-[var(--composer-clearance)]',
  rest: 'bottom-[var(--hud-inset)]',
} as const;

const App = ({ Component, pageProps }: AppProps) => {
  const router = useRouter();
  // Emitted regardless of auth state: admin pages render null until the
  // session resolves, so a layout-level tag would never reach the HTML.
  const noindex = ADMIN_PREFIXES.some((p) => router.pathname.startsWith(p));

  // One scene per route, chosen by path. On the landing page the scene also
  // dims once the chat takes over, which the page signals with a
  // `portfolio:chat-mode` event.
  //
  // The admin panel shares the `blog` treatment, and that is deliberate on two
  // independent counts. It is a data tool, not a showcase, so it wants the
  // quietest art direction available: no core object, no cursor-chasing tube
  // layer, the lowest particle opacity. It is also the only surface that opens
  // a real `aria-modal` dialog and stacks dense form and table content, where
  // background contrast behind the type is a reading problem rather than a
  // flourish. Belt and braces, because the scene is not merely quiet there —
  // it is invisible: every admin page renders inside an opaque viewport-filling
  // root (`min-h-screen bg-bg-void` in AdminLayout, `--bg-1` on the login
  // page, both fully opaque hex) above this fixed `z-0` layer, so nothing
  // drawn behind it can reach the reader. Because it cannot be seen, the gate
  // in the returned tree skips mounting it on these routes at all. Do not
  // "tune" the admin variant expecting a visible change: if that root ever goes
  // translucent, the art direction becomes load-bearing again, the gate goes
  // away, and `blog` is still the right answer.
  //
  // `isAdmin` reads the *same* predicate as the crawler tag above, so one edit
  // to `ADMIN_PREFIXES` moves both. That is the point — a second entry is a
  // single deliberate act — but it also means a prefix added for a
  // scene-BEARING route would take the WebGL layer down with it, silently and
  // with nothing anywhere failing. The predicate is therefore spelled as an
  // alias rather than recomputed, so the coupling is greppable in both places
  // instead of hiding inside a second copy of the `.some()`.
  const isAdmin = noindex;
  const isBlog = router.pathname.startsWith('/blog');
  const [chatOpen, setChatOpen] = React.useState(false);
  const [impulse, setImpulse] = React.useState(0);

  // ── Boot gate ────────────────────────────────────────────────────────────
  // The splash is an introduction to *the homepage*, so it runs there and
  // nowhere else: the admin panel, the blog and the 404 page are utility
  // surfaces and must never pay a multi-second cover. `pathname` (not
  // `asPath`) is deliberate — it is `'/'` on the very first render, so the
  // gate never flickers, and it ignores query/hash, so `/?ref=x` is still the
  // homepage. No `router.isReady` wait: pathname does not depend on it.
  const isHome = router.pathname === '/';
  // Sticky for the life of the app mount. The splash is an arrival, not a
  // per-route decoration: arriving back at `/` from the blog must not replay
  // a 5s cover over a page the visitor is already reading.
  const [bootDone, setBootDone] = React.useState(false);
  const bootFired = React.useRef(false);

  // The single source of the boot signal. `onComplete` covers the splash
  // finishing or being skipped; the watchdog and the non-home branch below
  // cover the splash never running at all, so the page is never left waiting
  // on an event that cannot arrive.
  const markBootDone = React.useCallback((reason: BootCompletionReason) => {
    if (bootFired.current) return;
    bootFired.current = true;
    setBootDone(true);
    if (typeof document === 'undefined' || typeof window === 'undefined')
      return;
    // Attribute first: a consumer that mounts between the two reads the latch
    // and never depends on having caught the broadcast.
    document.documentElement.setAttribute(BOOT_DONE_ATTR, reason);
    window.dispatchEvent(
      new CustomEvent<{ reason: BootCompletionReason }>(BOOT_COMPLETE_EVENT, {
        detail: { reason },
      }),
    );
  }, []);

  React.useEffect(() => {
    if (bootDone) return;
    if (!isHome) {
      // No splash on this route — the hero (wherever it is) should not be
      // waiting for one that will never play.
      markBootDone('not-rendered');
      return;
    }
    const t = window.setTimeout(
      () => markBootDone('timeout'),
      BOOT_FAIL_OPEN_MS,
    );
    return () => window.clearTimeout(t);
  }, [bootDone, isHome, markBootDone]);

  React.useEffect(() => {
    const onMode = (e: Event) => {
      setChatOpen((e as CustomEvent<{ open: boolean }>).detail?.open ?? false);
    };
    const onSend = () => setImpulse((n) => n + 1);
    window.addEventListener('portfolio:chat-mode', onMode);
    window.addEventListener('portfolio:chat-send', onSend);
    return () => {
      window.removeEventListener('portfolio:chat-mode', onMode);
      window.removeEventListener('portfolio:chat-send', onSend);
    };
  }, []);

  const sceneVariant = isAdmin || isBlog ? 'blog' : chatOpen ? 'chat' : 'hero';

  return (
    <>
      <Head>
        {/* No `maximum-scale`, and never add one: the viewport parser only
            reads `content`, so the attribute belongs there or nowhere. Pinch
            zoom is an accessibility requirement (WCAG 1.4.4), and this site
            already leans on it — the 44px touch targets and the `--dur-*`
            tokens sized against real device viewports assume a reader can
            zoom in. A `maximum-scale="1"` JSX prop on this element is inert
            (browsers ignore unknown `<meta>` attributes), so it used to sit
            here looking like a decision while doing nothing at all. */}
        <meta
          name="viewport"
          content="initial-scale=1.0, width=device-width"
          key="viewport"
        />
        {/* prettier-ignore */}
        <meta name="theme-color" content="#0a0a0a" key="theme-color" />{' '}
        {/* token-lint-ignore — browser meta, not style */}
        {noindex && (
          <meta name="robots" content="noindex, nofollow" key="robots" />
        )}
      </Head>
      <noscript>
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--bg-void)',
            color: 'var(--fg-1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            fontFamily: 'monospace',
            textAlign: 'center',
            zIndex: 9999,
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.75rem',
                letterSpacing: '4px',
                marginBottom: '1rem',
              }}
            >
              {'// JAVASCRIPT_REQUIRED'}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--fg-3)' }}>
              This portfolio requires JavaScript to render the neural HUD
              interface. The site is a Next.js application — please enable JS
              and reload.
            </div>
          </div>
        </div>
      </noscript>
      <ErrorBoundary>
        <ToastProvider>
          {/* Scene gate. The admin gets a flat opaque background — the one it
              already displays — and nothing is mounted to paint behind it. What
              that saves is a WebGL context, up to 9000 particles, the floor
              grid, a `useScenePointer` `pointermove` listener and a cursor
              glow, on the one surface that is dense stacked forms and tables:
              the surface where responsiveness matters most and a modest
              machine is most likely.

              The scene becomes load-bearing again the moment any admin root
              turns translucent or stops being viewport-filling. The invariant
              that follows: if an admin route ever renders a translucent root,
              this gate must be removed — and nothing else has to move.
              `sceneVariant` above already resolves `isAdmin` to `blog`, which
              is the right art direction for the moment the scene can be seen
              again. Do not leave this gate in place after that change.

              One honest gap in "opaque": most admin pages `return null` until
              `useAdminGuard` resolves its session, so that first paint has no
              admin root at all and falls through to the body background
              (`--bg-1`, in `global.css`). Same flat dark surface either way;
              it is simply no longer the canvas. */}
          {!isAdmin && (
            <>
              <SceneLayer variant={sceneVariant} impulse={impulse} />
              <CursorGlow />
            </>
          )}
          {/* One navigation grammar for the whole site. `enabled={bootDone}`
              keeps it inert until the splash has cleared, so the first paint
              of `/` is BootSequence's alone and the two never overlap. It
              renders the `relative z-10` stage that used to sit here. */}
          <RouteTransition router={router} enabled={bootDone}>
            <Component {...pageProps} />
            {/* The site-wide accent control, mounted once, here — and inside
                the stage rather than beside it, which is a deliberate layering
                decision. Inside the stage it shares one stacking context with
                the page, so `z-[var(--z-hud)]` (the same band the scroll rail
                already uses) lands it above page content — including the
                admin panel's opaque static root, which is the whole point — but
                still below the route-transition curtain, the boot splash, the
                chat sheet and every admin dialog. Mounted beside the stage it
                would need a z-index above 85 and would float over all of those
                instead, which reads as an unowned overlay.

                That contract has a page-side half: a page root must NOT open
                its own stacking context, or its modals become unreachable
                from here — trapped in a band this strip, sitting outside them,
                can never out-rank, and it would float over the dialog instead
                of being covered by it. `Homepage`'s root is `relative` with no
                z-index and `AdminLayout`'s is static; that is load-bearing, so
                do not add a `z-index` to either. `/blog`'s two roots were the
                last holdouts and are now clean too — that change moved the
                blog lightbox and the slug-to-slug page turn over this strip,
                deliberately, and the reasoning is recorded in the comment above
                the archive root in `src/pages/blog/index.tsx`.

                Height: `min-h-[var(--hud-strip-h)]`, `min-h` rather than `h` so
                the swatch row can grow on a viewport narrower than the panel
                instead of clipping. It is the same token `HudChrome`'s
                last-command caption adds to the composer's clearance, so the
                two are stacked by shared arithmetic, not by eye.

                It replaces the `AdvancedFeaturesBar` mount: that bar only ever
                rendered inside the chat sheet on `/`, two interactions deep, so
                `/blog`, the admin panel and the 404 page had no accent control
                at all. `AccentSwitcher` itself is unchanged and self-contained;
                this only re-hosts it and dresses the anchor in house chrome
                (the `HudChrome` idiom: `--surface-overlay` over a hairline
                border, plus a 2px top edge in the live `--accent-color` role
                token so the strip reads as a calibration bay that belongs to
                the current accent rather than as a dropped-in control). */}
            <div
              className={`fixed left-[var(--hud-inset)] flex min-h-[var(--hud-strip-h)] flex-col justify-center rounded-[var(--radius-lg)] border backdrop-blur-sm px-2 py-2 sm:px-3 z-[var(--z-hud)] ${
                ACCENT_STRIP_ANCHOR[isHome ? 'home' : 'rest']
              }`}
              style={{
                background: 'var(--surface-overlay)',
                borderColor: 'var(--border-subtle)',
                borderTopWidth: 2,
                borderTopColor: 'var(--accent-color)',
              }}
            >
              <AccentSwitcher />
            </div>
          </RouteTransition>
          {/* Homepage only, and only until it has cleared. Unmounting it from
              state (rather than letting it hide itself) means the splash and
              the page never share a frame where the page has already been
              told the splash is gone. */}
          {isHome && !bootDone && <BootSequence onComplete={markBootDone} />}
        </ToastProvider>
      </ErrorBoundary>
    </>
  );
};

export default App;
