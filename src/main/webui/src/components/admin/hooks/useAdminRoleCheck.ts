import { useState, useEffect } from 'react';
import * as api from '@/lib/api';

export interface UseAdminRoleCheckProps {
  user: any;
  token: string | null;
  isAuthLoading: boolean;
}

export interface UseAdminRoleCheckResult {
  isAdmin: boolean;
  isCheckingRole: boolean;
}

export function useAdminRoleCheck({
  user,
  token,
  isAuthLoading,
}: UseAdminRoleCheckProps): UseAdminRoleCheckResult {
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkRole() {
      if (isAuthLoading) return;
      if (!user) {
        setIsCheckingRole(false);
        setIsAdmin(false);
        return;
      }

      try {
        const profile = await api.getUserProfile(token || undefined);
        if (isMounted) {
          const hasAdminRole = profile.roles?.includes('admin') || false;
          setIsAdmin(hasAdminRole);
        }
      } catch (err) {
        if (isMounted) {
          setIsAdmin(false);
        }
      } finally {
        if (isMounted) {
          setIsCheckingRole(false);
        }
      }
    }

    checkRole();

    return () => {
      isMounted = false;
    };
  }, [user, token, isAuthLoading]);

  return {
    isAdmin,
    isCheckingRole,
  };
}
