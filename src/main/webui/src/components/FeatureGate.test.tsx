// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { FeatureGate } from './FeatureGate';
import * as entitlementContext from '@/lib/entitlementContext';

describe('FeatureGate', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders children when user has the feature', () => {
    vi.spyOn(entitlementContext, 'useEntitlements').mockReturnValue({
      plan: 'PRO',
      status: 'ACTIVE',
      isExpired: false,
      validUntil: null,
      entitlements: null,
      loading: false,
      hasFeature: (feature: string) => feature === 'whiteboard:export:pdf',
      getQuota: () => ({ current: 0, limit: 10, remaining: 10, isUnlimited: false, allowed: true }),
      refreshEntitlements: async () => {},
      activateKey: async () => {},
      deactivateKey: async () => {},
    });

    render(
      <FeatureGate
        feature="whiteboard:export:pdf"
        fallback={<div>Upgrade required</div>}
      >
        <div>PDF Export Enabled</div>
      </FeatureGate>
    );

    expect(screen.getByText('PDF Export Enabled')).toBeDefined();
    expect(screen.queryByText('Upgrade required')).toBeNull();
  });

  it('renders fallback when user does not have the feature', () => {
    vi.spyOn(entitlementContext, 'useEntitlements').mockReturnValue({
      plan: 'FREE',
      status: 'ACTIVE',
      isExpired: false,
      validUntil: null,
      entitlements: null,
      loading: false,
      hasFeature: () => false,
      getQuota: () => ({ current: 0, limit: 10, remaining: 10, isUnlimited: false, allowed: true }),
      refreshEntitlements: async () => {},
      activateKey: async () => {},
      deactivateKey: async () => {},
    });

    render(
      <FeatureGate
        feature="whiteboard:export:pdf"
        fallback={<div>Upgrade required</div>}
      >
        <div>PDF Export Enabled</div>
      </FeatureGate>
    );

    expect(screen.getByText('Upgrade required')).toBeDefined();
    expect(screen.queryByText('PDF Export Enabled')).toBeNull();
  });
});
