// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AccountModal } from './AccountModal';
import * as authLib from '@/lib/auth';
import * as entitlementContext from '@/lib/entitlementContext';
import * as api from '@/lib/api';

describe('AccountModal', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const mockUser: any = {
    profile: {
      sub: '123e4567-e89b-12d3-a456-426614174000',
      preferred_username: 'alice',
      email: 'alice@floxboard.io',
      name: 'Alice User',
    },
    access_token: 'fake-token',
  };

  beforeEach(() => {
    vi.spyOn(api, 'getPaymentHistory').mockResolvedValue([]);
  });

  it('renders profile details and triggers Keycloak action redirects', async () => {
    const triggerPasswordResetMock = vi.fn().mockResolvedValue(undefined);
    const triggerEmailChangeMock = vi.fn().mockResolvedValue(undefined);

    vi.spyOn(authLib, 'useAuth').mockReturnValue({
      user: mockUser,
      token: 'fake-token',
      login: vi.fn(),
      logout: vi.fn(),
      triggerPasswordReset: triggerPasswordResetMock,
      triggerEmailChange: triggerEmailChangeMock,
      isLoading: false,
    });

    vi.spyOn(entitlementContext, 'useEntitlements').mockReturnValue({
      plan: 'PRO',
      status: 'ACTIVE',
      isExpired: false,
      validUntil: null,
      entitlements: null,
      loading: false,
      hasFeature: () => true,
      getQuota: () => ({ current: 2, limit: 10, remaining: 8, isUnlimited: false, allowed: true }),
      refreshEntitlements: async () => {},
      activateKey: async () => {},
      deactivateKey: async () => {},
    });

    vi.spyOn(api, 'getUserProfile').mockResolvedValue({
      id: '123e4567-e89b-12d3-a456-426614174000',
      username: 'alice',
      email: 'alice@floxboard.io',
      firstName: 'Alice',
      lastName: 'User',
      emailVerified: true,
      roles: ['user'],
    });

    const updateProfileMock = vi.spyOn(api, 'updateUserProfile').mockResolvedValue({
      id: '123e4567-e89b-12d3-a456-426614174000',
      username: 'alice',
      email: 'alice@floxboard.io',
      firstName: 'Alicia',
      lastName: 'Wonderland',
      emailVerified: true,
      roles: ['user'],
    });

    render(<AccountModal isOpen={true} onClose={() => {}} initialTab="profile" />);

    // Check account metadata loaded
    await waitFor(() => {
      expect(screen.getAllByText('alice@floxboard.io').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Verified')).toBeDefined();
    });

    // Test form editing
    const firstNameInput = screen.getByLabelText('First Name') as HTMLInputElement;
    const lastNameInput = screen.getByLabelText('Last Name') as HTMLInputElement;

    fireEvent.change(firstNameInput, { target: { value: 'Alicia' } });
    fireEvent.change(lastNameInput, { target: { value: 'Wonderland' } });

    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(updateProfileMock).toHaveBeenCalledWith(
        { firstName: 'Alicia', lastName: 'Wonderland' },
        'fake-token'
      );
      expect(screen.getByText('Profile updated successfully!')).toBeDefined();
    });

    // Test Keycloak redirect triggers
    const passwordBtn = screen.getByRole('button', { name: /Change Password/i });
    fireEvent.click(passwordBtn);
    expect(triggerPasswordResetMock).toHaveBeenCalledTimes(1);

    const emailBtn = screen.getByRole('button', { name: /Change Email/i });
    fireEvent.click(emailBtn);
    expect(triggerEmailChangeMock).toHaveBeenCalledTimes(1);
  });

  it('switches to License & Subscription tab and allows activating license key', async () => {
    const activateKeyMock = vi.fn().mockResolvedValue(undefined);
    const deactivateKeyMock = vi.fn().mockResolvedValue(undefined);

    vi.spyOn(authLib, 'useAuth').mockReturnValue({
      user: mockUser,
      token: 'fake-token',
      login: vi.fn(),
      logout: vi.fn(),
      triggerPasswordReset: vi.fn(),
      triggerEmailChange: vi.fn(),
      isLoading: false,
    });

    vi.spyOn(entitlementContext, 'useEntitlements').mockReturnValue({
      plan: 'PRO',
      status: 'ACTIVE',
      isExpired: false,
      validUntil: '2026-12-31T23:59:59Z',
      entitlements: null,
      loading: false,
      hasFeature: () => true,
      getQuota: (key: string) => ({
        current: key === 'whiteboards' ? 3 : 1,
        limit: key === 'whiteboards' ? 10 : 5,
        remaining: key === 'whiteboards' ? 7 : 4,
        isUnlimited: false,
        allowed: true,
      }),
      refreshEntitlements: async () => {},
      activateKey: activateKeyMock,
      deactivateKey: deactivateKeyMock,
    });

    vi.spyOn(api, 'getUserProfile').mockResolvedValue({
      id: '123e4567-e89b-12d3-a456-426614174000',
      username: 'alice',
      email: 'alice@floxboard.io',
      firstName: 'Alice',
      lastName: 'User',
      emailVerified: true,
      roles: ['user'],
    });

    render(<AccountModal isOpen={true} onClose={() => {}} initialTab="license" />);

    // Check License tab contents
    expect(screen.getByText(/Subscription & Entitlements|Current Tier/i)).toBeDefined();
    expect(screen.getByText('3 / 10')).toBeDefined();

    // Fill license key input and submit
    const keyInput = screen.getByPlaceholderText('Paste signed license token...') as HTMLInputElement;
    fireEvent.change(keyInput, { target: { value: 'sample-jwt-license-key' } });

    const activateBtn = screen.getByRole('button', { name: /Activate Key/i });
    fireEvent.click(activateBtn);

    await waitFor(() => {
      expect(activateKeyMock).toHaveBeenCalledWith('sample-jwt-license-key');
      expect(screen.getByText('License successfully activated!')).toBeDefined();
    });

    // Test Deactivate / Reset to Free
    const resetBtn = screen.getByRole('button', { name: /Reset to Free/i });
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(deactivateKeyMock).toHaveBeenCalledTimes(1);
    });
  });

  it('loads and displays billing history and opens checkout modal when clicking upgrade', async () => {
    vi.spyOn(authLib, 'useAuth').mockReturnValue({
      user: mockUser,
      token: 'fake-token',
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
      getQuota: () => ({ current: 1, limit: 3, remaining: 2, isUnlimited: false, allowed: true }),
      refreshEntitlements: async () => {},
      activateKey: vi.fn(),
      deactivateKey: vi.fn(),
    });

    vi.spyOn(api, 'getUserProfile').mockResolvedValue({
      id: '123e4567-e89b-12d3-a456-426614174000',
      username: 'alice',
      email: 'alice@floxboard.io',
      firstName: 'Alice',
      lastName: 'User',
      emailVerified: true,
      roles: ['user'],
    });

    const getHistoryMock = vi.spyOn(api, 'getPaymentHistory').mockResolvedValue([
      {
        id: 'tx-999',
        plan: 'PRO',
        billingInterval: 'MONTHLY',
        amountCents: 1200,
        currency: 'USD',
        status: 'SUCCEEDED',
        paymentMethod: 'Mock Card (•••• 4242)',
        receiptNumber: 'REC-2026-999',
        createdAt: '2026-08-26T12:00:00Z',
      },
    ]);

    render(<AccountModal isOpen={true} onClose={() => {}} initialTab="license" />);

    await waitFor(() => {
      expect(getHistoryMock).toHaveBeenCalled();
      expect(screen.getByText('REC-2026-999')).toBeDefined();
      expect(screen.getByText('$12.00 USD')).toBeDefined();
    });

    // Click Upgrade Plan
    const upgradeBtn = screen.getByRole('button', { name: /Upgrade Plan/i });
    fireEvent.click(upgradeBtn);

    expect(screen.getByText('Upgrade Subscription')).toBeDefined();
  });
});
