import React, { useEffect, useRef } from 'react';
import { animate, createScope } from 'animejs';
import { HudPanel, NeonButton } from '../ui';

interface ConfirmDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  isSaving?: boolean;
}

export default function ConfirmDeleteModal({
  open,
  onClose,
  onConfirm,
  title = '// CONFIRM_DELETE',
  message = 'Delete this item? This cannot be undone.',
  isSaving = false,
}: ConfirmDeleteModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    if (!backdropRef.current || !panelRef.current) return;
    const root = panelRef.current.parentElement;
    if (!root) return;
    const scope = createScope({ root });
    scope.add(() => {
      animate(backdropRef.current!, {
        opacity: [0, 1],
        duration: 200,
        ease: 'outExpo',
      });
      animate(panelRef.current!, {
        opacity: [0, 1],
        scale: [0.9, 1],
        duration: 300,
        ease: 'outExpo',
      });
    });
    return () => scope.revert();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm opacity-0"
        onClick={onClose}
      />
      <div ref={panelRef} className="relative max-w-sm w-full opacity-0">
        <HudPanel accent="red" notch="md" title={title} className="p-6">
          <div className="text-center space-y-4">
            <div className="text-4xl">⚠️</div>
            <p className="text-text-muted text-sm font-body">{message}</p>
            <div className="flex gap-3 justify-center">
              <NeonButton
                variant="ghost"
                accent="cyan"
                onClick={onClose}
                disabled={isSaving}
              >
                CANCEL
              </NeonButton>
              <NeonButton accent="red" onClick={onConfirm} loading={isSaving}>
                DELETE
              </NeonButton>
            </div>
          </div>
        </HudPanel>
      </div>
    </div>
  );
}
