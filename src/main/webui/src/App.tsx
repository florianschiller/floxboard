import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Whiteboard from '@/components/Whiteboard';
import LandingPage from '@/components/LandingPage';
import { AdminConsole } from '@/components/AdminConsole';
import { OrganizationConsole } from '@/components/OrganizationConsole';
import { AuthProvider, useAuth } from '@/lib/auth';
import { EntitlementProvider } from '@/lib/entitlementContext';
import { ThemeProvider } from '@/lib/themeContext';
import { UserContextMenu } from '@/components/UserContextMenu';

function WhiteboardPage() {
  const { user, login, isLoading } = useAuth();
  const [activeBoardName, setActiveBoardName] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      login();
    }
  }, [user, isLoading, login]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading floxBoard...</span>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="z-10 w-full h-[92vh] items-center justify-between text-sm flex flex-col">
        <div className="flex w-full justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-base">
                f
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">floxBoard</h1>
            </div>
            <span className="text-slate-300 dark:text-slate-700 font-light text-lg">/</span>
            <span className="text-slate-500 dark:text-slate-400 font-medium text-sm max-w-[240px] truncate">
              {activeBoardName || 'Unsaved Whiteboard'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <UserContextMenu />
          </div>
        </div>
        <Whiteboard onBoardChange={setActiveBoardName} />
      </div>
    </main>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <EntitlementProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/board" element={<WhiteboardPage />} />
              <Route path="/board/:id" element={<WhiteboardPage />} />
              <Route path="/admin" element={<AdminConsole />} />
              <Route path="/organization" element={<OrganizationConsole />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </EntitlementProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
