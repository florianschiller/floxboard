import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { AuthProvider as OidcProvider, useAuth as useOidcAuth } from 'react-oidc-context';
import { User, UserManager, WebStorageStateStore } from 'oidc-client-ts';

export const userManager = new UserManager({
  authority: import.meta.env.VITE_KEYCLOAK_ISSUER || "http://localhost:8090/realms/quarkus",
  client_id: import.meta.env.VITE_KEYCLOAK_ID || "flox-frontend",
  scope: "openid email profile",
  redirect_uri: window.location.origin + "/board",
  post_logout_redirect_uri: window.location.origin + "/",
  automaticSilentRenew: true,
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
});

const onSigninCallback = () => {
  window.history.replaceState({}, document.title, window.location.pathname);
};

interface AuthContextType {
  user: User | null | undefined;
  token: string | null;
  login: () => void;
  logout: () => void;
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

const InternalAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const auth = useOidcAuth();
  
  const value: AuthContextType = useMemo(() => ({
    user: auth.user,
    token: auth.user?.access_token || null,
    login: () => auth.signinRedirect(),
    logout: () => auth.signoutRedirect(),
    isLoading: auth.isLoading,
  }), [auth.user, auth.isLoading, auth.signinRedirect, auth.signoutRedirect]);

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
