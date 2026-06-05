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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Audiowide&family=Space+Grotesk:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </Head>
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
