import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import { UserContextMenu } from '../UserContextMenu';

export const AdminHeader: React.FC = () => {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/board"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-md dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Whiteboard
          </Link>

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700" />

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              <Shield className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">Admin Console</h1>
              <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-700 border border-purple-200 uppercase tracking-wide dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-900/50">
                Admin
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <UserContextMenu />
        </div>
      </div>
    </header>
  );
};
