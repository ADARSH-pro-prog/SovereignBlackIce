import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 className="w-5 h-5 text-[#14B8A6] shrink-0" />,
          warning: <AlertTriangle className="w-5 h-5 text-[#F59E0B] shrink-0" />,
          error: <AlertCircle className="w-5 h-5 text-[#EF4444] shrink-0" />,
          info: <Info className="w-5 h-5 text-[#3B82F6] shrink-0" />,
        };

        const borderStyles = {
          success: 'border-[#14B8A6]/40 bg-[#111827]',
          warning: 'border-[#F59E0B]/40 bg-[#111827]',
          error: 'border-[#EF4444]/40 bg-[#111827]',
          info: 'border-[#3B82F6]/40 bg-[#111827]',
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-md transition-all animate-in slide-in-from-bottom-5 duration-200 ${borderStyles[toast.type]}`}
          >
            {icons[toast.type]}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-[#F8FAFC]">
                {toast.title}
              </h4>
              {toast.message && (
                <p className="text-xs text-[#94A3B8] mt-0.5 leading-relaxed">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[#64748B] hover:text-[#F8FAFC] transition-colors p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
