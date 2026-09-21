import React from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export interface AdminNotificationBannerProps {
  message: { type: 'success' | 'error'; text: string } | null;
  onClose: () => void;
}

export const AdminNotificationBanner: React.FC<AdminNotificationBannerProps> = ({
  message,
  onClose,
}) => {
  if (!message) return null;

  return (
    <div
      className={`p-4 rounded-xl flex items-center justify-between gap-3 border shadow-xs animate-in fade-in ${
        message.type === 'success'
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
          : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300'
      }`}
    >
      <div className="flex items-center gap-2.5">
        {message.type === 'success' ? (
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
        ) : (
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
        )}
        <span className="text-sm font-medium">{message.text}</span>
      </div>
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
