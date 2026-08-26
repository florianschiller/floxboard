import { useAuth } from '@/lib/auth';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const { user, login, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      const savedIntent = sessionStorage.getItem('flox_post_auth_action');
      if (savedIntent) {
        sessionStorage.removeItem('flox_post_auth_action');
        try {
          const { returnTo, openModal, tab } = JSON.parse(savedIntent);
          const separator = returnTo.includes('?') ? '&' : '?';
          const destination = `${returnTo}${separator}modal=${openModal}&tab=${tab}`;
          navigate(destination, { replace: true });
          return;
        } catch {
          // Fallback to default
        }
      }
      navigate('/board', { replace: true });
    }
  }, [user, isLoading, navigate]);

  if (user) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-xl p-8 sm:p-10 text-center">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
            f
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            floxBoard
          </span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Welcome to floxBoard
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          The simple, collaborative whiteboard for your team. Real-time infinite canvas, live presence, and cloud sync.
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500 py-3">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading...</span>
          </div>
        ) : (
          <button
            onClick={() => login()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-sm transition-colors cursor-pointer text-sm"
          >
            Sign In to Start
          </button>
        )}
      </div>

      <div className="mt-6 text-xs text-slate-400">
        &copy; floxBoard &bull; Real-time Collaboration
      </div>
    </div>
  );
}
