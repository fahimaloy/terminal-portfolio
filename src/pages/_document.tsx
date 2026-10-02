import { Html, Head, Main, NextScript } from 'next/document';
import {
  ACCENT_ATTRIBUTE,
  ACCENT_STORAGE_KEY,
} from '../components/scene/palette';

/**
 * The six accent names, inlined for the third time.
 *
 * `ACCENT_NAMES` in `components/scene/palette.ts` and `EXPECTED_ACCENTS` in
 * `scripts/generate-tokens.mjs` are the other two. The duplication is
 * unavoidable — an inline `<script>` cannot import — but it is also the one
 * duplication where a silent failure is invisible: a name missing from *this*
 * list leaves that accent dead on the very first paint of a hard reload
 * (the attribute is never written, `tokens.css` falls back to `:root`'s cyan)
 * while every test and type-check still passes, because the copy that the
 * type-checker sees is the one in a module. So the invariant is pinned by
 * `src/__tests__/pages/document-accent-bootstrap.test.tsx`, which reads this
 * literal back out of the file and deep-equals it against `ACCENT_NAMES`.
 * Change one, and that test fails.
 */
const BOOTSTRAP_ACCENT_NAMES = [
  'cyan',
  'violet',
  'coral',
  'amber',
  'lime',
  'ice',
];

/**
 * The pre-paint accent bootstrap.
 *
 * `AccentSwitcher` rehydrates in a *layout* effect, which is the earliest a
 * React component can act — but "earliest a component can act" still loses to
 * "the browser painted the server's cyan already". On a hard reload with a
 * stored preference that is one frame of the wrong colour, and on a page
 * whose hero text sits on an accent-tinted surface it reads as a flash rather
 * than as a correction. Only a blocking script in the document head can win
 * that race, which is why this lives here and not in the component.
 *
 * Emitted as a raw inline `<script>` rather than `next/script`
 * (`strategy="beforeInteractive"`): this is ~130 bytes with no dependency
 * graph, and the strategy only buys an indirection through the framework's
 * own chunk loading. The failure modes are all handled in the snippet itself:
 *
 *   - storage unavailable (private mode, disabled cookies, a browser that
 *     throws on `localStorage` access rather than nulling it) → `try`/`catch`,
 *     and the catch is empty on purpose: there is nothing to recover to, the
 *     default in `tokens.css` is already a valid accent.
 *   - a corrupt or hand-edited stored value → the allowlist check happens
 *     *before* `setAttribute`, so an unknown name never reaches the DOM (an
 *     unrecognised `data-accent` would leave `--accent-color` undefined and
 *     every `var(--accent-color)` consumer would fail to resolve).
 *   - no `documentElement` → guarded rather than assumed.
 *   - a global named `s`/`d` colliding with another script → wrapped in an
 *     IIFE.
 *
 * Built as joined fragments so it stays readable; the shipped text is a
 * single ~130-byte line.
 */
const ACCENT_BOOTSTRAP_SCRIPT = [
  '!function(){try{',
  `var s=localStorage.getItem(${JSON.stringify(ACCENT_STORAGE_KEY)});`,
  `if(s&&${JSON.stringify(BOOTSTRAP_ACCENT_NAMES)}.indexOf(s)>-1){`,
  'var d=document.documentElement;',
  `if(d)d.setAttribute(${JSON.stringify(ACCENT_ATTRIBUTE)},s);`,
  '}}catch(e){}}();',
].join('');

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* First in `<head>`, deliberately. Everything else in here is either
            a hint (`preconnect`) or a resource, and a parser-blocking inline
            script placed after them would be too late to influence the paint
            they enable. Running first means `data-accent` is on `<html>`
            before the first stylesheet is even fetched, so the first frame the
            visitor sees is already in their chosen accent. */}
        <script dangerouslySetInnerHTML={{ __html: ACCENT_BOOTSTRAP_SCRIPT }} />
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
            Weights must cover every weight used in the stylesheets: JetBrains
            Mono ships 400/500 only, so `font-semibold` on it would render
            faux-bold. */}
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
