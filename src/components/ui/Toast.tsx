// src/components/ui/Toast.tsx — flat editorial toast with accent left border
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
import { canAnimate, durations, easings } from '../../config/animations';

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
  { accent: string; borderLeft: string; icon: React.ReactNode }
> = {
  success: {
    accent: 'var(--status-success)',
    borderLeft: 'var(--status-success)',
    icon: <CheckCircle size={14} />,
  },
  error: {
    accent: 'var(--status-error)',
    borderLeft: 'var(--status-error)',
    icon: <AlertCircle size={14} />,
  },
  info: {
    accent: 'var(--fg-3)',
    borderLeft: 'var(--border-strong)',
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
        duration: durations.hover * 1000 + 80,
        ease: easings.expoOut,
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
      className="px-3 py-2.5 flex items-center gap-2 pointer-events-auto max-w-xs"
      style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--border-subtle)',
        borderLeft: `3px solid ${style.borderLeft}`,
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <span style={{ color: style.accent }}>{style.icon}</span>
      <span
        className="font-body text-xs flex-1"
        style={{ color: 'var(--fg-1)' }}
      >
        {toast.message}
      </span>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="transition-colors hover:opacity-70"
        style={{ color: 'var(--text-muted)' }}
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
