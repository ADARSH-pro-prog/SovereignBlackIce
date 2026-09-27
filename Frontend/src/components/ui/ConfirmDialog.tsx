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
      icon: <ShieldAlert className="w-5 h-5 text-[#EF4444]" />,
      bg: 'bg-[#EF4444]/10 border-[#EF4444]/30',
      btn: 'bg-[#EF4444] hover:bg-[#DC2626] text-white',
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />,
      bg: 'bg-[#F59E0B]/10 border-[#F59E0B]/30',
      btn: 'bg-[#F59E0B] hover:bg-[#D97706] text-black font-semibold',
    },
    primary: {
      icon: <Info className="w-5 h-5 text-[#3B82F6]" />,
      bg: 'bg-[#3B82F6]/10 border-[#3B82F6]/30',
      btn: 'bg-[#3B82F6] hover:bg-blue-600 text-white',
    },
    success: {
      icon: <CheckCircle className="w-5 h-5 text-[#14B8A6]" />,
      bg: 'bg-[#14B8A6]/10 border-[#14B8A6]/30',
      btn: 'bg-[#14B8A6] hover:bg-teal-600 text-black font-semibold',
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
          <p className="text-sm text-[#94A3B8] leading-relaxed pt-1">
            {description}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-[#263247]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg bg-[#1E293B] border border-[#263247] text-sm font-medium text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#263247] transition-colors"
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
