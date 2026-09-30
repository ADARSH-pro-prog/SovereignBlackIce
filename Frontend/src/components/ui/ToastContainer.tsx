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
          success: <CheckCircle2 className="w-5 h-5 text-ice shrink-0" />,
          warning: <AlertTriangle className="w-5 h-5 text-amber shrink-0" />,
          error: <AlertCircle className="w-5 h-5 text-red shrink-0" />,
          info: <Info className="w-5 h-5 text-ice shrink-0" />,
        };

        const borderStyles = {
          success: 'border-ice/40 bg-raised',
          warning: 'border-amber/40 bg-raised',
          error: 'border-red/40 bg-raised',
          info: 'border-ice/40 bg-raised',
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-2xl transition-all animate-in slide-in-from-bottom-5 duration-200 ${borderStyles[toast.type]}`}
          >
            {icons[toast.type]}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-ink">
                {toast.title}
              </h4>
              {toast.message && (
                <p className="text-xs text-muted mt-0.5 leading-relaxed">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-muted hover:text-ink transition-colors p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
