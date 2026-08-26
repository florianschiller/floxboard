import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { getEntitlementStatus, EntitlementStatus, QuotaStatus, activateLicenseKey, deactivateLicenseKey } from './api';
import { useAuth } from './auth';

export const FLOX_LICENSE_UPDATED_EVENT = 'flox:license:updated';

export function notifyLicenseUpdated(userId?: string) {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent(FLOX_LICENSE_UPDATED_EVENT, { detail: { userId, timestamp: Date.now() } }));
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('flox_license_updated', JSON.stringify({ userId, timestamp: Date.now() }));
      }
    } catch {
      // ignore
    }
  }
}

export interface QuotaInfo {
  current: number;
  limit: number | null;
  remaining: number | null;
  isUnlimited: boolean;
  allowed: boolean;
}

interface EntitlementContextType {
  plan: string;
  status: string;
  isExpired: boolean;
  validUntil: string | null;
  entitlements: EntitlementStatus | null;
  loading: boolean;
  hasFeature: (key: string) => boolean;
  getQuota: (metricKey: string) => QuotaInfo;
  refreshEntitlements: (isBackground?: boolean) => Promise<void>;
  activateKey: (key: string) => Promise<void>;
  deactivateKey: () => Promise<void>;
}

const EntitlementContext = createContext<EntitlementContextType | null>(null);

export const EntitlementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [entitlements, setEntitlements] = useState<EntitlementStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const isMountedRef = useRef(true);

  const refreshEntitlements = useCallback(async (isBackground = false) => {
    if (!user) {
      setEntitlements(null);
      setLoading(false);
      return;
    }
    try {
      if (!isBackground) {
        setLoading(true);
      }
      const data = await getEntitlementStatus();
      if (isMountedRef.current) {
        setEntitlements(data);
      }
    } catch (err) {
      console.error('Failed to load entitlements:', err);
    } finally {
      if (!isBackground && isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Initial load when user changes
  useEffect(() => {
    if (user) {
      refreshEntitlements(false);
    } else {
      setEntitlements(null);
      setLoading(false);
    }
  }, [user, refreshEntitlements]);

  // Periodic polling and focus/visibility listeners
  useEffect(() => {
    if (!user) return;

    // Periodic poll every 10 seconds
    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refreshEntitlements(true);
      }
    }, 10000);

    // On focus or tab visible
    const handleFocusOrVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refreshEntitlements(true);
      }
    };

    // On cross-component / cross-tab license update event
    const handleLicenseUpdateEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const targetUserId = customEvent?.detail?.userId;
      const currentUserId = user?.profile?.sub;
      if (!targetUserId || !currentUserId || targetUserId === currentUserId) {
        refreshEntitlements(true);
      }
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'flox_license_updated') {
        refreshEntitlements(true);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocusOrVisible);
      window.addEventListener(FLOX_LICENSE_UPDATED_EVENT, handleLicenseUpdateEvent);
      window.addEventListener('storage', handleStorageEvent);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleFocusOrVisible);
    }

    return () => {
      clearInterval(intervalId);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocusOrVisible);
        window.removeEventListener(FLOX_LICENSE_UPDATED_EVENT, handleLicenseUpdateEvent);
        window.removeEventListener('storage', handleStorageEvent);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleFocusOrVisible);
      }
    };
  }, [user, refreshEntitlements]);

  const hasFeature = useCallback((key: string): boolean => {
    if (!entitlements) return false;
    if (entitlements.features?.[key] === true) return true;
    if (entitlements.features?.['*'] === true) return true;
    const prefix = key.split(':')[0] + ':*';
    return entitlements.features?.[prefix] === true;
  }, [entitlements]);

  const getQuota = useCallback((metricKey: string): QuotaInfo => {
    const q: QuotaStatus | undefined = entitlements?.quotas?.[metricKey];
    return {
      current: q?.current ?? 0,
      limit: q?.limit ?? null,
      remaining: q?.remaining ?? null,
      isUnlimited: q?.limit === null || q?.limit === undefined || q?.limit < 0,
      allowed: q?.allowed ?? true,
    };
  }, [entitlements]);

  const activateKey = useCallback(async (key: string) => {
    await activateLicenseKey(key);
    await refreshEntitlements(false);
    notifyLicenseUpdated(user?.profile?.sub);
  }, [refreshEntitlements, user]);

  const deactivateKey = useCallback(async () => {
    await deactivateLicenseKey();
    await refreshEntitlements(false);
    notifyLicenseUpdated(user?.profile?.sub);
  }, [refreshEntitlements, user]);

  return (
    <EntitlementContext.Provider
      value={{
        plan: entitlements?.plan ?? 'FREE',
        status: entitlements?.status ?? 'ACTIVE',
        isExpired: entitlements?.isExpired ?? false,
        validUntil: entitlements?.validUntil ?? null,
        entitlements,
        loading,
        hasFeature,
        getQuota,
        refreshEntitlements,
        activateKey,
        deactivateKey,
      }}
    >
      {children}
    </EntitlementContext.Provider>
  );
};

export const useEntitlements = (): EntitlementContextType => {
  const context = useContext(EntitlementContext);
  if (!context) {
    throw new Error('useEntitlements must be used within an EntitlementProvider');
  }
  return context;
};
