import React from 'react';
import '../styles/global.css';
import Head from 'next/head';
import { useRouter } from 'next/router';
import type { AppProps } from 'next/app';
import ErrorBoundary from '../components/ErrorBoundary';
import SceneLayer from '../components/scene/SceneLayer';
import BootSequence from '../components/ui/BootSequence';
import { ToastProvider } from '../components/ui/Toast';
import CursorGlow from '../components/ui/CursorGlow';

/** Route prefixes that must never be indexed by crawlers. */
const NOINDEX_PREFIXES = ['/sudosuperuser-ostaad'];

const App = ({ Component, pageProps }: AppProps) => {
  const router = useRouter();
  // Emitted regardless of auth state: admin pages render null until the
  // session resolves, so a layout-level tag would never reach the HTML.
  const noindex = NOINDEX_PREFIXES.some((p) => router.pathname.startsWith(p));

  // One scene per route, chosen by path. The admin panel gets the quietest
  // treatment — it is a data tool, not a showcase. On the landing page the
  // scene also dims once the chat takes over, which the page signals with a
  // `portfolio:chat-mode` event.
  const isAdmin = NOINDEX_PREFIXES.some((p) => router.pathname.startsWith(p));
  const isBlog = router.pathname.startsWith('/blog');
  const [chatOpen, setChatOpen] = React.useState(false);
  const [impulse, setImpulse] = React.useState(0);

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
          <BootSequence />
        </ToastProvider>
      </ErrorBoundary>
    </>
  );
};

export default App;
