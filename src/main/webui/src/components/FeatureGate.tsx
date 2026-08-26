import React from 'react';
import { useEntitlements } from '@/lib/entitlementContext';

interface FeatureGateProps {
  feature: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({ feature, fallback = null, children }) => {
  const { hasFeature, loading } = useEntitlements();

  if (loading) {
    return null;
  }

  return hasFeature(feature) ? <>{children}</> : <>{fallback}</>;
};
