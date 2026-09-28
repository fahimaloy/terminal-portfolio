import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Icons. These files have always been committed under public/ but were
            never referenced, so browsers were left to guess a /favicon.ico (and
            probe for it). Sizes are the files' real pixel dimensions, verified
            against their PNG headers rather than their names. The manifest's
            6 android-icon entries were each confirmed to exist before wiring. */}
        <link rel="icon" href="/favicon.ico" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        {/* apple-icon-180x180.png is genuinely 180x180 — the usual 152x152
            iOS fallback was not needed. */}
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-icon-180x180.png"
        />
        <link rel="manifest" href="/manifest.json" />
        {/* Every family named in src/styles/tokens.css must be requested here.
            --font-display is Orbitron; it was never loaded, so every
            `font-display` element silently fell back to Space Grotesk. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;800&family=Space+Grotesk:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
          media="print"
          // @ts-expect-error onLoad exists on link
          onLoad="this.media='all'"
        />
        <noscript>
          <link
            rel="stylesheet"
            href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
          />
        </noscript>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
