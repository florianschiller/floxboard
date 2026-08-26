// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import MockCheckoutModal from './MockCheckoutModal';
import * as authLib from '@/lib/auth';
import * as entitlementContext from '@/lib/entitlementContext';
import * as api from '@/lib/api';

describe('MockCheckoutModal', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const mockUser: any = {
    profile: {
      sub: 'user-456',
      name: 'Alice Springs',
      preferred_username: 'alice',
      email: 'alice@floxboard.io',
    },
    access_token: 'mock-token',
  };

  beforeEach(() => {
    vi.spyOn(authLib, 'useAuth').mockReturnValue({
      user: mockUser,
      token: 'mock-token',
      login: vi.fn(),
      logout: vi.fn(),
      triggerPasswordReset: vi.fn(),
      triggerEmailChange: vi.fn(),
      isLoading: false,
    });

    vi.spyOn(entitlementContext, 'useEntitlements').mockReturnValue({
      plan: 'FREE',
      status: 'ACTIVE',
      isExpired: false,
      validUntil: null,
      entitlements: null,
      loading: false,
      hasFeature: () => false,
      getQuota: () => ({ current: 0, limit: 3, remaining: 3, isUnlimited: false, allowed: true }),
      refreshEntitlements: vi.fn(),
      activateKey: vi.fn(),
      deactivateKey: vi.fn(),
    });
  });

  it('renders modal with initial PRO monthly plan and allows toggling to annual billing', () => {
    render(<MockCheckoutModal isOpen={true} onClose={vi.fn()} initialPlan="PRO" />);

    expect(screen.getByText('Upgrade Subscription')).toBeDefined();
    expect(screen.getByText('$12.00 USD')).toBeDefined();

    // Click Annual
    const annualButton = screen.getByRole('button', { name: /Annual/i });
    fireEvent.click(annualButton);

    expect(screen.getByText('$120.00 USD')).toBeDefined();
  });

  it('allows selecting Enterprise tier and submits mock payment successfully', async () => {
    const notifySpy = vi.spyOn(entitlementContext, 'notifyLicenseUpdated');
    const processCheckoutMock = vi.spyOn(api, 'processMockCheckout').mockResolvedValue({
      transactionId: 'tx-12345',
      receiptNumber: 'REC-2026-TEST',
      plan: 'ENTERPRISE',
      billingInterval: 'MONTHLY',
      amountCents: 4900,
      currency: 'USD',
      status: 'SUCCEEDED',
      validUntil: '2026-09-25T00:00:00Z',
      createdAt: '2026-08-26T00:00:00Z',
      message: 'Payment simulated successfully.',
    });

    const onSuccessMock = vi.fn();

    render(
      <MockCheckoutModal
        isOpen={true}
        onClose={vi.fn()}
        initialPlan="PRO"
        onSuccess={onSuccessMock}
      />
    );

    // Select Enterprise plan
    const enterpriseButton = screen.getByRole('button', { name: /Enterprise/i });
    fireEvent.click(enterpriseButton);

    expect(screen.getByText('$49.00 USD')).toBeDefined();

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Pay \$49\.00 & Upgrade/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(processCheckoutMock).toHaveBeenCalledWith(
        {
          plan: 'ENTERPRISE',
          billingInterval: 'MONTHLY',
          paymentMethod: 'Mock Visa (•••• 4242)',
          cardholderName: 'Alice Springs',
        },
        'mock-token'
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Subscription Activated!')).toBeDefined();
      expect(screen.getByText('REC-2026-TEST')).toBeDefined();
      expect(screen.getByText('$49.00 USD')).toBeDefined();
    });

    expect(notifySpy).toHaveBeenCalledWith('user-456');
    expect(onSuccessMock).toHaveBeenCalledTimes(1);
  });
});
