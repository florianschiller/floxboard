import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Whiteboard from '@/components/Whiteboard';
import LandingPage from '@/components/LandingPage';
import { AuthProvider, useAuth } from '@/lib/auth';

function WhiteboardPage() {
  const { user, login, logout, isLoading } = useAuth();
  const [activeBoardName, setActiveBoardName] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      login();
    }
  }, [user, isLoading, login]);

  if (isLoading || !user) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-400">Loading...</div>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 bg-slate-900 text-slate-100">
      <div className="z-10 w-full h-[90vh] items-center justify-between font-mono text-sm flex flex-col">
        <div className="flex w-full justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">floXboard</h1>
            <span className="text-gray-500 font-medium">
              {activeBoardName || 'Unsaved Whiteboard'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span>{user.profile.preferred_username || user.profile.email}</span>
            <button
              onClick={() => logout()}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
              Log Out
            </button>
          </div>
        </div>
        <Whiteboard onBoardChange={setActiveBoardName} />
      </div>
    </main>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/board" element={<WhiteboardPage />} />
          <Route path="/board/:id" element={<WhiteboardPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
