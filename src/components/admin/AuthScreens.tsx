import React, { useEffect, useRef } from 'react';
import { animate, createScope } from 'animejs';
import { GlitchText, HudPanel, NeonButton } from '../ui';
import { motionTokens } from '../ui/motionConfig';
import { canAnimate } from '../../config/animations';

export type LoadingScreenVariant = 'spinner' | 'dots' | 'matrix';

interface LoadingScreenProps {
  variant?: LoadingScreenVariant;
}

interface ErrorScreenProps {
  message: string;
  onRetry: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  variant = 'spinner',
}) => {
  const spinnerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canAnimate() || !spinnerRef.current) return;
    const scope = createScope({ root: spinnerRef.current });
    scope.add(() => {
      const corners = spinnerRef.current!.querySelectorAll('.spinner-corner');
      animate(corners, {
        rotate: '1turn',
        duration: (el: Element, i: number) => [2000, 1500, 2500, 3000][i] || 2000,
        loop: true,
        ease: 'linear',
        alternate: (el: Element, i: number) => i % 2 === 1,
      });
    });
    return () => scope.revert();
  }, []);

  return (
    <div className="min-h-screen bg-bg-void flex flex-col items-center justify-center px-4">
      <HudPanel accent="magenta" notch="md" title="// AUTHENTICATING" className="p-8 max-w-md w-full">
        <div className="flex flex-col items-center gap-6">
          {variant === 'spinner' && (
            <div ref={spinnerRef} className="relative w-20 h-20">
              <div
                className="spinner-corner absolute inset-0 border-2 border-neon-magenta"
                style={{ clipPath: 'polygon(0 0, 16px 0, 16px 4px, 4px 4px, 4px 16px, 0 16px)' }}
              />
              <div
                className="spinner-corner absolute inset-0 border-2 border-neon-cyan"
                style={{ clipPath: 'polygon(100% 0, calc(100% - 16px) 0, calc(100% - 16px) 4px, calc(100% - 4px) 4px, calc(100% - 4px) 16px, 100% 16px)' }}
              />
              <div
                className="spinner-corner absolute inset-0 border-2 border-neon-yellow"
                style={{ clipPath: 'polygon(0 100%, 16px 100%, 16px calc(100% - 4px), 4px calc(100% - 4px), 4px calc(100% - 16px), 0 calc(100% - 16px))' }}
              />
              <div
                className="spinner-corner absolute inset-0 border-2 border-neon-green"
                style={{ clipPath: 'polygon(100% 100%, calc(100% - 16px) 100%, calc(100% - 16px) calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) calc(100% - 16px), 100% calc(100% - 16px))' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl">🔐</span>
              </div>
            </div>
          )}

          {variant === 'dots' && (
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full bg-neon-magenta animate-pulse-dot"
                  style={{ boxShadow: '0 0 8px var(--glow-magenta)', animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          )}

          {variant === 'matrix' && (
            <div className="font-mono text-neon-yellow text-3xl animate-pulse">
              █
            </div>
          )}

          <div className="text-center space-y-1">
            <div className="font-display tracking-[3px] text-neon-magenta text-shadow-neon-magenta text-sm">
              AUTHENTICATING
            </div>
            <div className="font-body text-xs text-text-muted">
              Verifying credentials...
            </div>
            <code className="text-[10px] font-mono text-text-muted">
              {'>'} checking session status
            </code>
          </div>
        </div>
      </HudPanel>
    </div>
  );
};

export const ErrorScreen: React.FC<ErrorScreenProps> = ({
  message,
  onRetry,
}) => {
  return (
    <div className="min-h-screen bg-bg-void flex flex-col items-center justify-center p-4">
      <HudPanel accent="red" notch="md" title="// ACCESS_DENIED" className="p-8 max-w-md w-full">
        <div className="text-center space-y-4">
          <div className="text-5xl">⚠️</div>
          <GlitchText accent="red" as="h1" className="text-xl">
            SESSION ERROR
          </GlitchText>
          <div className="font-mono text-sm text-text-secondary">{message}</div>
          <NeonButton accent="yellow" onClick={onRetry}>
            TRY AGAIN
          </NeonButton>
        </div>
      </HudPanel>
    </div>
  );
};

export const AuthLoadingScreen: React.FC = () => {
  return <LoadingScreen variant="spinner" />;
};
