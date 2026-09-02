import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect, useCallback } from 'react';
import { AuthProvider as OidcProvider, useAuth as useOidcAuth } from 'react-oidc-context';
import { User, UserManager, WebStorageStateStore } from 'oidc-client-ts';

const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
const sessionStorageStore = typeof window !== 'undefined' ? window.sessionStorage : undefined;

export const userManager = new UserManager({
  authority: import.meta.env.VITE_KEYCLOAK_ISSUER || "http://localhost:8090/realms/quarkus",
  client_id: import.meta.env.VITE_KEYCLOAK_ID || "flox-frontend",
  scope: "openid email profile",
  redirect_uri: origin + "/",
  post_logout_redirect_uri: origin + "/",
  automaticSilentRenew: true,
  userStore: sessionStorageStore ? new WebStorageStateStore({ store: sessionStorageStore }) : undefined,
});

userManager.events.addSilentRenewError(() => {
  userManager.removeUser();
});

const onSigninCallback = () => {
  window.history.replaceState({}, document.title, window.location.pathname);
};

interface AuthContextType {
  user: User | null | undefined;
  token: string | null;
  login: (redirectUri?: string) => void;
  logout: () => void;
  triggerPasswordReset: () => Promise<void>;
  triggerEmailChange: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <OidcProvider userManager={userManager} onSigninCallback={onSigninCallback}>
      <InternalAuthProvider>
        {children}
      </InternalAuthProvider>
    </OidcProvider>
  );
};

const getInitialStoredUser = (): User | null => {
  if (typeof window === 'undefined' || !sessionStorageStore) return null;
  try {
    for (let i = 0; i < sessionStorageStore.length; i++) {
      const key = sessionStorageStore.key(i);
      if (key && key.startsWith('oidc.user:')) {
        const raw = sessionStorageStore.getItem(key);
        if (raw) {
          const parsed = User.fromStorageString(raw);
          if (parsed && !parsed.expired) {
            return parsed;
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
};

const InternalAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const auth = useOidcAuth();
  const [recoveredUser, setRecoveredUser] = useState<User | null>(getInitialStoredUser);
  const [isRecovering, setIsRecovering] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      if (params.has('error')) return true;
    }
    return false;
  });

  useEffect(() => {
    if (auth.error || (typeof window !== 'undefined' && window.location.search.includes('error='))) {
      if (typeof window !== 'undefined' && window.location.search) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      setIsRecovering(true);
      userManager.getUser(true).then((storedUser) => {
        if (storedUser && !storedUser.expired) {
          setRecoveredUser(storedUser);
        } else {
          setRecoveredUser(null);
          userManager.removeUser();
        }
      }).catch(() => {
        setRecoveredUser(null);
        userManager.removeUser();
      }).finally(() => {
        setIsRecovering(false);
      });
    } else if (auth.user) {
      setRecoveredUser(null);
    }
  }, [auth.error, auth.user]);

  const currentUser = auth.user || recoveredUser;

  const savePostAuthIntent = (tab: 'profile' | 'license' = 'profile') => {
    if (typeof window === 'undefined') return;
    const currentPath = window.location.pathname + window.location.search;
    sessionStorage.setItem('flox_post_auth_action', JSON.stringify({
      returnTo: currentPath === '/' ? '/board' : currentPath,
      openModal: 'account',
      tab
    }));
  };

  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      const refreshedUser = await userManager.signinSilent();
      if (refreshedUser && !refreshedUser.expired) {
        setRecoveredUser(refreshedUser);
        return refreshedUser.access_token;
      }
    } catch (err) {
      console.warn('Failed to renew token silently:', err);
    }
    return null;
  }, []);

  const value: AuthContextType = useMemo(() => ({
    user: currentUser,
    token: currentUser?.access_token || null,
    login: (redirectUri?: string) => {
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname + window.location.search;
        if (currentPath && currentPath !== '/') {
          sessionStorage.setItem('flox_post_auth_action', JSON.stringify({
            returnTo: currentPath,
          }));
        }
      }
      return auth.signinRedirect({
        redirect_uri: redirectUri || origin + '/'
      });
    },
    logout: () => auth.signoutRedirect(),
    triggerPasswordReset: () => {
      savePostAuthIntent('profile');
      return auth.signinRedirect({
        redirect_uri: origin + '/',
        extraQueryParams: { kc_action: 'UPDATE_PASSWORD' }
      });
    },
    triggerEmailChange: () => {
      savePostAuthIntent('profile');
      return auth.signinRedirect({
        redirect_uri: origin + '/',
        extraQueryParams: { kc_action: 'UPDATE_EMAIL' }
      });
    },
    refreshToken,
    isLoading: auth.isLoading || isRecovering,
  }), [currentUser, auth.isLoading, isRecovering, auth.signinRedirect, auth.signoutRedirect, refreshToken]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
