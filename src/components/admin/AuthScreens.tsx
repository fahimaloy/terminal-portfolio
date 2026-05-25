import React from 'react';

export type LoadingScreenVariant = 'spinner' | 'dots' | 'matrix';

interface LoadingScreenProps {
  variant?: LoadingScreenVariant;
}

interface ErrorScreenProps {
  message: string;
  onRetry: () => void;
}

// Loading screen component
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  variant = 'spinner',
}) => {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center">
      <div className="text-center">
        {variant === 'spinner' && (
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-800 border-t-purple-400 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-purple-400 text-2xl">🔐</span>
            </div>
          </div>
        )}

        {variant === 'dots' && (
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-4 h-4 bg-purple-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}

        {variant === 'matrix' && (
          <div className="font-mono text-purple-400 text-lg">
            <span className="animate-pulse">_</span>
          </div>
        )}

        <p className="mt-6 text-gray-500 font-mono text-sm">
          Verifying credentials...
        </p>
      </div>

      <div className="mt-8 text-xs text-gray-600 font-mono">
        <code>{'>'} checking session status</code>
      </div>
    </div>
  );
};

// Error screen component
export const ErrorScreen: React.FC<ErrorScreenProps> = ({
  message,
  onRetry,
}) => {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-xl text-red-400 font-mono mb-2">Session Error</h1>
        <p className="text-gray-400 text-sm mb-6 font-mono">{message}</p>
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-mono font-bold rounded-xl transition-all"
        >
          Try Again
        </button>
      </div>
    </div>
  );
};

// Default loading screen for auth pages
export const AuthLoadingScreen: React.FC = () => {
  return <LoadingScreen variant="spinner" />;
};
