import { useAuth } from '@/lib/auth';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  const { user, login, isLoading } = useAuth();

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
        ) : user ? (
          <Link
            to="/board"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition duration-200"
          >
            Go to Whiteboard
          </Link>
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
