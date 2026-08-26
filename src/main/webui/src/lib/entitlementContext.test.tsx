// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, waitFor, act } from '@testing-library/react';
import React from 'react';
import { EntitlementProvider, useEntitlements, notifyLicenseUpdated } from './entitlementContext';
import * as authLib from './auth';
import * as api from './api';

function TestConsumer() {
  const { plan, status, loading, refreshEntitlements } = useEntitlements();
  return (
    <div>
      <span data-testid="plan">{plan}</span>
      <span data-testid="status">{status}</span>
      <span data-testid="loading">{loading ? 'true' : 'false'}</span>
      <button onClick={() => refreshEntitlements(false)}>Manual Refresh</button>
    </div>
  );
}

describe('EntitlementProvider auto-refresh', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const mockUser: any = {
    profile: {
      sub: 'user-123',
      preferred_username: 'alice',
      email: 'alice@floxboard.io',
    },
    access_token: 'fake-token',
  };

  it('automatically updates license entitlements on notifyLicenseUpdated event without logout/login', async () => {
    vi.spyOn(authLib, 'useAuth').mockReturnValue({
      user: mockUser,
      token: 'fake-token',
      login: vi.fn(),
      logout: vi.fn(),
      triggerPasswordReset: vi.fn(),
      triggerEmailChange: vi.fn(),
      isLoading: false,
    });

    let currentPlan: 'FREE' | 'PRO' = 'FREE';

    const getEntitlementSpy = vi.spyOn(api, 'getEntitlementStatus').mockImplementation(async () => ({
      plan: currentPlan,
      status: 'ACTIVE',
      features: {},
      quotas: {},
      validUntil: null,
      isExpired: false,
    }));

    render(
      <EntitlementProvider>
        <TestConsumer />
      </EntitlementProvider>
    );

    // Initial plan should be FREE
    await waitFor(() => {
      expect(screen.getByTestId('plan').textContent).toBe('FREE');
    });

    // Admin updates user license to PRO in backend
    currentPlan = 'PRO';

    // Broadcast license updated event
    act(() => {
      notifyLicenseUpdated('user-123');
    });

    // UI should update to PRO without requiring re-authentication
    await waitFor(() => {
      expect(screen.getByTestId('plan').textContent).toBe('PRO');
    });
    expect(getEntitlementSpy).toHaveBeenCalledTimes(2);
  });

  it('refreshes entitlements on window focus and visibility change', async () => {
    vi.spyOn(authLib, 'useAuth').mockReturnValue({
      user: mockUser,
      token: 'fake-token',
      login: vi.fn(),
      logout: vi.fn(),
      triggerPasswordReset: vi.fn(),
      triggerEmailChange: vi.fn(),
      isLoading: false,
    });

    let currentPlan: 'FREE' | 'ENTERPRISE' = 'FREE';

    vi.spyOn(api, 'getEntitlementStatus').mockImplementation(async () => ({
      plan: currentPlan,
      status: 'ACTIVE',
      features: {},
      quotas: {},
      validUntil: null,
      isExpired: false,
    }));

    render(
      <EntitlementProvider>
        <TestConsumer />
      </EntitlementProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('plan').textContent).toBe('FREE');
    });

    // Admin updates license
    currentPlan = 'ENTERPRISE';

    // User switches back to the tab
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('plan').textContent).toBe('ENTERPRISE');
    });
  });
});
