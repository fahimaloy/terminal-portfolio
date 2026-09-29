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
import { durations } from '../config/animations';

/** Route prefixes that must never be indexed by crawlers. */
const NOINDEX_PREFIXES = ['/sudosuperuser-ostaad'];

/**
 * Fail-open watchdog, in milliseconds. Not an animation duration — it is the
 * "the splash genuinely never told us" ceiling, so it is deliberately longer
 * than any splash can be on screen: BootSequence's own `HARD_CEILING_MS` is
 * 8s. Sized off the splash token so retiming the sequence in `tokens.css`
 * moves the watchdog with it instead of leaving it behind.
 */
const BOOT_FAIL_OPEN_MS = durations.splashFull * 1000 * 1.75;

const App = ({ Component, pageProps }: AppProps) => {
  const router = useRouter();
  // Emitted regardless of auth state: admin pages render null until the
  // session resolves, so a layout-level tag would never reach the HTML.
  const noindex = NOINDEX_PREFIXES.some((p) => router.pathname.startsWith(p));

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
  // drawn behind it can reach the reader. Do not "tune" the admin variant
  // expecting a visible change: if that root ever goes translucent, the art
  // direction becomes load-bearing again and `blog` is still the right answer.
  const isAdmin = NOINDEX_PREFIXES.some((p) => router.pathname.startsWith(p));
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
        <meta
          name="viewport"
          content="initial-scale=1.0, width=device-width"
          key="viewport"
          maximum-scale="1"
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
          <SceneLayer variant={sceneVariant} impulse={impulse} />
          <CursorGlow />
          <div className="relative z-10">
            <Component {...pageProps} />
          </div>
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
