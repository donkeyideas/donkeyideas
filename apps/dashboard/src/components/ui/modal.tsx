'use client';

import { ReactNode } from 'react';
import { Button } from '@donkey-ideas/ui';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-[#1A1A1A] border border-white/10 rounded-lg w-full max-w-md m-4">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{title}</h2>
            <Button variant="secondary" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="p-6 border-t border-white/10">{footer}</div>}
      </div>
    </div>
  );
}


