import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getEntitlementStatus, EntitlementStatus, QuotaStatus, activateLicenseKey, deactivateLicenseKey } from './api';
import { useAuth } from './auth';

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
  refreshEntitlements: () => Promise<void>;
  activateKey: (key: string) => Promise<void>;
  deactivateKey: () => Promise<void>;
}

const EntitlementContext = createContext<EntitlementContextType | null>(null);

export const EntitlementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [entitlements, setEntitlements] = useState<EntitlementStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshEntitlements = useCallback(async () => {
    if (!user) {
      setEntitlements(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await getEntitlementStatus();
      setEntitlements(data);
    } catch (err) {
      console.error('Failed to load entitlements:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshEntitlements();
    } else {
      setEntitlements(null);
      setLoading(false);
    }
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
    await refreshEntitlements();
  }, [refreshEntitlements]);

  const deactivateKey = useCallback(async () => {
    await deactivateLicenseKey();
    await refreshEntitlements();
  }, [refreshEntitlements]);

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
