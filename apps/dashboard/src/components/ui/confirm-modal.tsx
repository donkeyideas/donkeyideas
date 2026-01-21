'use client';

import { Button } from '@donkey-ideas/ui';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Continue',
  cancelText = 'Cancel',
  variant = 'info',
  loading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const colors = {
    danger: 'bg-red-500/20 border-red-500/30 text-red-400',
    warning: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
    info: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1A1A1A] border border-white/10 rounded-lg w-full max-w-md m-4 shadow-2xl">
        <div className={`p-4 border-b ${colors[variant]}`}>
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        <div className="p-6">
          <p className="text-white/80 whitespace-pre-line">{message}</p>
        </div>
        <div className="p-4 border-t border-white/10 flex justify-end gap-3">
          <Button 
            variant="secondary" 
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button 
            variant={variant === 'danger' ? 'destructive' : 'primary'}
            onClick={handleConfirm}
            disabled={loading}
            className={variant === 'info' ? 'bg-blue-500 hover:bg-blue-600 text-white' : ''}
          >
            {loading ? 'Processing...' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
