'use client';

import { Button } from '@donkey-ideas/ui';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'error' | 'warning';
}

export function NotificationModal({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
}: NotificationModalProps) {
  if (!isOpen) return null;

  const colors = {
    info: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
    success: 'bg-green-500/20 border-green-500/30 text-green-400',
    error: 'bg-red-500/20 border-red-500/30 text-red-400',
    warning: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-[#1A1A1A] border border-white/10 rounded-lg w-full max-w-md m-4">
        <div className={`p-4 border-b ${colors[type]}`}>
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        <div className="p-6">
          <p className="text-white/80">{message}</p>
        </div>
        <div className="p-6 border-t border-white/10 flex justify-end">
          <Button variant="primary" onClick={onClose}>
            OK
          </Button>
        </div>
      </div>
    </div>
  );
}


