'use client';

import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** When false, backdrop clicks and Escape do not close the modal (e.g. while drawing a signature). */
  dismissible?: boolean;
}

export const Modal = ({ open, onClose, title, children, dismissible = true }: ModalProps) => {
  useEffect(() => {
    if (!open || !dismissible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose, dismissible]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]"
      onClick={dismissible ? onClose : undefined}
    >
      <div
        className="mx-auto w-full max-w-lg rounded-3xl border border-border bg-surface p-6 shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="mb-4 text-lg font-bold text-text">{title}</h2>}
        {children}
      </div>
    </div>,
    document.body
  );
};
