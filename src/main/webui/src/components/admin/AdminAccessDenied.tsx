import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';

export const AdminAccessDenied: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 dark:bg-slate-950">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center dark:bg-slate-900 dark:border-slate-800">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:bg-red-950/50 dark:text-red-400">
          <Shield className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Access Denied</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          You need the <span className="font-semibold text-red-600 dark:text-red-400">admin</span> role to access the Admin Console. Please contact your administrator if you believe this is an error.
        </p>
        <button
          onClick={() => navigate('/board')}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-5 rounded-lg text-sm transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to Whiteboard
        </button>
      </div>
    </div>
  );
};
