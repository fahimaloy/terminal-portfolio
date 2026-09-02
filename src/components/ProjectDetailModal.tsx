// src/components/ProjectDetailModal.tsx
/* ═══════════════════════════════════════════════════════════════════════════════
   PROJECT DETAIL MODAL — Enhanced with anime.js spring animations
   - Spring entrance (scale + opacity)
   - Backdrop fade
   - Close with reverse animation
═══════════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PortfolioProject, PortfolioSkill } from '../utils/api';
import ProjectTableView from './ProjectTableView';
import { X } from 'lucide-react';
import { animate, createScope, spring } from 'animejs';
import { isReducedMotion } from '../config/animations';

type ProjectDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  projects: PortfolioProject[];
  skills: PortfolioSkill[];
};

export default function ProjectDetailModal({
  isOpen,
  onClose,
  projects,
  skills,
}: ProjectDetailModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);

  useEffect(() => {
    if (!isOpen || !modalRef.current || !backdropRef.current) return;

    const scope = createScope({ root: modalRef.current });
    scopeRef.current = scope;

    scope.add(() => {
      // Backdrop fade
      animate(backdropRef.current!, {
        opacity: [0, 1],
        duration: 300,
        ease: 'outExpo',
      });

      // Modal spring entrance
      animate(modalRef.current!, {
        opacity: [0, 1],
        scale: [0.9, 1],
        y: [30, 0],
        ...spring({ stiffness: 150, damping: 16 }),
      });

      setIsVisible(true);
    });

    return () => scope.revert();
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (!modalRef.current || !backdropRef.current || isReducedMotion()) {
      onClose();
      return;
    }

    // Reverse animation
    animate(backdropRef.current, {
      opacity: [1, 0],
      duration: 200,
      ease: 'inExpo',
    });
    animate(modalRef.current, {
      opacity: [1, 0],
      scale: [1, 0.9],
      y: [0, 30],
      duration: 250,
      ease: 'inExpo',
      onComplete: onClose,
    });
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
        style={{ opacity: 0 }}
      />
      <div
        ref={modalRef}
        className="relative w-full max-w-4xl max-h-[85vh] overflow-y-auto bg-bg-ash border border-white/10 rounded-2xl p-6"
        style={{ opacity: 0 }}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>
        <ProjectTableView projects={projects} skills={skills} />
      </div>
    </div>
  );
}
