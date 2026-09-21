import React from 'react';
import { RotateCcw, X } from 'lucide-react';
import * as api from '@/lib/api';

export interface WhiteboardRestoreConfirmDialogProps {
  snapshot: api.WhiteboardSnapshotDto | null;
  isOpen: boolean;
  isRestoring: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const WhiteboardRestoreConfirmDialog: React.FC<WhiteboardRestoreConfirmDialogProps> = ({
  snapshot,
  isOpen,
  isRestoring,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !snapshot) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden animate-in zoom-in-95 text-slate-900 dark:text-slate-100">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/50">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Restore Whiteboard Snapshot</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Revert canvas to version {snapshot.version}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isRestoring}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md cursor-pointer disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs text-slate-600 dark:text-slate-300">
          <p>
            Restoring this snapshot will replace the current board contents with{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {snapshot.name || `Version ${snapshot.version}`}
            </span>{' '}
            created on {new Date(snapshot.createdAt).toLocaleString()}.
          </p>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300">
            <strong>Warning:</strong> Any unsaved changes made since this snapshot was created will be overwritten.
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isRestoring}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isRestoring}
            className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
            {isRestoring ? 'Restoring...' : 'Restore Snapshot'}
          </button>
        </div>
      </div>
    </div>
  );
};
