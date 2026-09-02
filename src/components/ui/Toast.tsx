// src/components/ui/Toast.tsx
/* Toast notifications with anime.js slide-in. Provider + useToast hook.
   Mount <ToastProvider> once (in _app) and call useToast() anywhere below it. */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { animate } from 'animejs';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { canAnimate } from '../../config/animations';

export type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const KIND_STYLES: Record<
  ToastKind,
  { accent: string; border: string; icon: React.ReactNode }
> = {
  success: {
    accent: 'text-neon-green',
    border: 'border-neon-green/40',
    icon: <CheckCircle size={14} />,
  },
  error: {
    accent: 'text-neon-red',
    border: 'border-neon-red/40',
    icon: <AlertCircle size={14} />,
  },
  info: {
    accent: 'text-neon-cyan',
    border: 'border-neon-cyan/40',
    icon: <Info size={14} />,
  },
};

const AUTO_DISMISS_MS = 3200;

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const style = KIND_STYLES[toast.kind];

  useEffect(() => {
    if (ref.current && canAnimate()) {
      animate(ref.current, {
        opacity: [0, 1],
        x: [40, 0],
        duration: 320,
        ease: 'outExpo',
      });
    }
    const timer = setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      className={`clip-notch-sm bg-bg-smoke border ${style.border} px-3 py-2.5 flex items-center gap-2 shadow-lg pointer-events-auto max-w-xs`}
    >
      <span className={style.accent}>{style.icon}</span>
      <span className="font-body text-xs text-text-primary flex-1">
        {toast.message}
      </span>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="text-text-muted hover:text-text-primary transition-colors"
      >
        <X size={12} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, kind, message }]);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (m: string) => toast(m, 'success'),
      error: (m: string) => toast(m, 'error'),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[var(--z-toast,300)] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Returns a no-op-safe toast API; never throws if the provider is absent. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  const fallback = useMemo<ToastContextValue>(
    () => ({ toast: () => {}, success: () => {}, error: () => {} }),
    [],
  );
  return ctx ?? fallback;
}
