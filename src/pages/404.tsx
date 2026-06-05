// src/pages/404.tsx
import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { GlitchText, HudPanel, NeonButton, StatBar } from '../components/ui';

const NotFoundPage = () => {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>404 // SIGNAL_LOST | Fahimaloy Portfolio</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center">
            <div className="text-[10px] font-display tracking-[6px] text-neon-red text-shadow-neon-magenta mb-3">
              {'// ERROR // 404'}
            </div>
            <GlitchText
              as="h1"
              accent="magenta"
              shift
              className="text-7xl md:text-9xl"
            >
              404
            </GlitchText>
            <div className="font-display tracking-[4px] text-neon-yellow text-shadow-neon-yellow mt-4">
              SIGNAL_LOST
            </div>
            <div className="font-body text-sm text-text-secondary mt-3 max-w-md mx-auto">
              The page you&apos;re looking for isn&apos;t in the local network.
              The route may have been decommissioned or never existed.
            </div>
          </div>

          <HudPanel accent="red" notch="md" title="// DIAGNOSTIC_LOG" className="p-4 space-y-3">
            <StatBar label="UPLINK" value={0} accent="red" />
            <StatBar label="ROUTE_INTEGRITY" value={12} accent="magenta" />
            <StatBar label="SIGNAL_STRENGTH" value={5} accent="yellow" />
            <div className="text-[10px] font-mono text-text-muted space-y-1">
              <div>{'>'} STATUS: NOT_FOUND</div>
              <div>{'>'} PATH: {router.asPath || '/'}</div>
              <div>{'>'} SUGGESTION: RETURN TO ROOT</div>
            </div>
          </HudPanel>

          <div className="flex justify-center gap-3">
            <NeonButton
              accent="yellow"
              onClick={() => router.push('/')}
            >
              RETURN TO ROOT
            </NeonButton>
            <NeonButton
              variant="outline"
              accent="cyan"
              onClick={() => router.back()}
            >
              GO BACK
            </NeonButton>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFoundPage;
