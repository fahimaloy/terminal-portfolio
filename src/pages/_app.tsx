import React from 'react';
import '../styles/global.css';
import Head from 'next/head';
import ErrorBoundary from '../components/ErrorBoundary';

const App = ({ Component, pageProps }) => {
  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="initial-scale=1.0, width=device-width"
          key="viewport"
          maximum-scale="1"
        />
      </Head>
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
    </>
  );
};

export default App;
