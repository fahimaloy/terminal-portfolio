import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';
import { GlitchText, HudPanel, NeonButton, NeonChip } from './ui';
import { motionTokens } from './ui/motionConfig';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.reducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  reducedMotion: boolean;

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-6">
          <motion.div
            animate={
              this.reducedMotion
                ? {}
                : { x: [0, -1, 1, 0] }
            }
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="w-full max-w-md"
          >
            <HudPanel
              accent="red"
              notch="md"
              title="// SYSTEM_FAULT"
              className="p-6 space-y-4"
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-neon-red/20 border border-neon-red/40 flex items-center justify-center">
                  <FiAlertTriangle className="w-7 h-7 text-neon-red" />
                </div>
                <GlitchText accent="red" as="h3" className="text-base">
                  SOMETHING WENT WRONG
                </GlitchText>
                {this.state.error?.message && (
                  <NeonChip accent="red">
                    {this.state.error.message.length > 80
                      ? `${this.state.error.message.slice(0, 80)}…`
                      : this.state.error.message}
                  </NeonChip>
                )}
                <p className="font-body text-xs text-text-muted max-w-md">
                  An unexpected error occurred. You can try again or reload the
                  page.
                </p>
              </div>
              <div className="flex justify-center">
                <NeonButton
                  accent="yellow"
                  iconLeft={<FiRefreshCw />}
                  onClick={this.handleRetry}
                >
                  RETRY
                </NeonButton>
              </div>
            </HudPanel>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
