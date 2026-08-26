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
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-extrabold text-gray-900 mb-6">
          Welcome to floXboard
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          The simple, collaborative whiteboard for your team.
        </p>
        
        {isLoading ? (
          <div className="text-lg font-medium text-gray-500">Loading...</div>
        ) : (
          <button
            onClick={() => login()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition duration-200"
          >
            Sign In to Start
          </button>
        )}
      </div>
    </div>
  );
}
