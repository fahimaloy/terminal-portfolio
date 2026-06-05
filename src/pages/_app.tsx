import React from 'react';
import '../styles/global.css';
import Head from 'next/head';
import type { AppProps } from 'next/app';
import ErrorBoundary from '../components/ErrorBoundary';
import Background from '../components/ui/Background';
import BootSequence from '../components/ui/BootSequence';

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="initial-scale=1.0, width=device-width"
          key="viewport"
          maximum-scale="1"
        />
        <meta
          name="theme-color"
          content="#0a0a0a"
          key="theme-color"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Audiowide&family=Space+Grotesk:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </Head>
      <noscript>
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#0a0a0a',
            color: '#00f0ff',
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
            <div style={{ fontSize: '0.875rem', color: '#ffaa00' }}>
              This portfolio requires JavaScript to render the neural HUD
              interface. The site is a Next.js application — please enable JS
              and reload.
            </div>
          </div>
        </div>
      </noscript>
      <ErrorBoundary>
        <Background />
        <div className="relative z-10">
          <Component {...pageProps} />
        </div>
        <BootSequence />
      </ErrorBoundary>
    </>
  );
};

export default App;
