/**
 * SceneLayer — the single owner of the site background.
 *
 * Exactly one instance is mounted by the app shell. It picks the art direction
 * from the route, decides whether WebGL is usable, and falls back to a static
 * SVG composition when it is not. Nothing else in the app may mount a
 * background — the previous duplicate doubled the particle field, grid,
 * scanlines and aurora for no visual gain.
 */

import React from 'react';
import SceneCanvas, { type SceneVariant } from './SceneCanvas';
import { useSceneQuality, type SceneTier } from '../../hooks/useSceneQuality';
import { makeRng } from '../ui/graphics/seededRandom';

type Props = {
  /** Defaults to the landing hero. */
  variant?: SceneVariant;
  /** Bump to pulse the field (chat sends). */
  impulse?: number;
};

export default function SceneLayer({ variant = 'hero', impulse = 0 }: Props) {
  const { tier, detectedTier, ready, reduced, unsupported } = useSceneQuality();

  const [sceneFailed, setSceneFailed] = React.useState(false);
  const useWebGL =
    ready && !reduced && !unsupported && tier !== 'none' && !sceneFailed;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Base: the void gradient plus the two light sources. These carry most
          of the depth even when the scene is unavailable. */}
      <div
        className="absolute inset-0"
        style={{ background: 'var(--gradient-bg-void)' }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'var(--key-light)' }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'var(--rim-light)' }}
      />

      {/* Probing for WebGL is not the same as acquiring a context: the r3f
          canvas can still fail to create one. Without a boundary local to the
          scene, that error escapes to the app-wide ErrorBoundary and replaces
          the whole page with its fallback — a background failure must degrade
          the background, not the content. */}
      {useWebGL ? (
        <SceneErrorBoundary onFail={() => setSceneFailed(true)}>
          <SceneCanvas
            variant={variant}
            tier={tier}
            densityTier={detectedTier}
            impulse={impulse}
          />
        </SceneErrorBoundary>
      ) : (
        <StaticField variant={variant} />
      )}

      {/* Vignette last so it darkens the scene rather than sitting under it. */}
      <div
        className="absolute inset-0"
        style={{ background: 'var(--scene-vignette)' }}
      />
    </div>
  );
}

/**
 * SceneErrorBoundary — contains a WebGL/context failure to the scene branch.
 * Deliberately class-based: a component that can catch its own children's
 * render errors must be one.
 */
class SceneErrorBoundary extends React.Component<
  { children: React.ReactNode; onFail: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFail();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * StaticField — the no-WebGL path. Deterministic positions (seeded, not
 * Math.random) so SSR and client agree, and no infinite animation, so it is
 * safe under prefers-reduced-motion and costs nothing on a static render.
 *
 * The hash is INTEGER-only (mulberry32). The previous version derived its
 * positions from `Math.sin(...) * 43758.5453` and called that deterministic.
 * It is not: `Math.sin` is a transcendental, and V8's TurboFan-inlined fast
 * path and its runtime fdlibm path disagree in the low mantissa bits. Node
 * (SSR) and Chrome (hydration) take different paths, so every circle came
 * back with a slightly different `cy`/`r` and React threw "Hydration failed"
 * on the landing page. Integer ops are bit-exact per spec on every engine.
 */
function StaticField({ variant }: { variant: SceneVariant }) {
  const density = variant === 'blog' ? 26 : variant === 'chat' ? 34 : 48;
  const opacity = variant === 'blog' ? 0.35 : variant === 'chat' ? 0.4 : 0.6;

  return (
    <>
      <svg
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
        role="presentation"
      >
        {Array.from({ length: density }, (_, i) => {
          // Mulberry32, seeded per circle: pure integer arithmetic, so the
          // server and the client derive byte-identical attributes.
          const rng = makeRng(i * 5 + 1);
          const cx = rng() * 100;
          const cy = rng() * 100;
          const r = 0.06 + rng() * 0.1;
          const tint = rng();
          const alpha = opacity * (0.25 + rng() * 0.4);
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill={
                tint < 0.5
                  ? 'var(--neon-cyan)'
                  : tint < 0.8
                    ? 'var(--neon-violet)'
                    : 'var(--neon-coral)'
              }
              opacity={alpha}
            />
          );
        })}
      </svg>

      {/* Static horizon lines stand in for the perspective floor. */}
      <svg
        className="absolute inset-x-0 bottom-0 h-1/2 w-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 50"
        role="presentation"
      >
        {Array.from({ length: 9 }, (_, i) => {
          const y = 50 - i * 6 - 2;
          return (
            <line
              key={i}
              x1={-10 + i * 4}
              y1={y + 12}
              x2={110 - i * 4}
              y2={y + 12}
              stroke="var(--neon-cyan)"
              strokeWidth={0.12}
              opacity={0.05 + i * 0.012}
            />
          );
        })}
      </svg>
    </>
  );
}
