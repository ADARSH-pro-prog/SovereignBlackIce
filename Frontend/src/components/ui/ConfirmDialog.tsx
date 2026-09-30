import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle, Info, CheckCircle, ShieldAlert } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'warning' | 'primary' | 'success';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  type = 'warning',
  isLoading = false,
}) => {
  const iconConfig = {
    danger: {
      icon: <ShieldAlert className="w-5 h-5 text-red" />,
      bg: 'bg-red/10 border-red/30',
      btn: 'bg-red hover:bg-red text-void',
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5 text-amber" />,
      bg: 'bg-amber/10 border-amber/30',
      btn: 'bg-amber hover:bg-amber text-void font-semibold',
    },
    primary: {
      icon: <Info className="w-5 h-5 text-ice" />,
      bg: 'bg-ice/10 border-ice/30',
      btn: 'bg-ice hover:bg-ice text-void',
    },
    success: {
      icon: <CheckCircle className="w-5 h-5 text-ice" />,
      bg: 'bg-ice/10 border-ice/30',
      btn: 'bg-ice hover:bg-ice text-void font-semibold',
    },
  };

  const current = iconConfig[type];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="md">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${current.bg}`}
          >
            {current.icon}
          </div>
          <p className="text-sm text-muted leading-relaxed pt-1">
            {description}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-line-strong">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg bg-raised-2 border border-line-strong text-sm font-medium text-muted hover:text-ink hover:bg-raised-2 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
            }}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm ${current.btn}`}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};
