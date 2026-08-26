// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { UserContextMenu } from './UserContextMenu';
import * as authLib from '@/lib/auth';
import * as entitlementContext from '@/lib/entitlementContext';
import * as api from '@/lib/api';

describe('UserContextMenu', () => {
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

  it('renders user initials, name, and current plan', () => {
    const logoutMock = vi.fn();
    vi.spyOn(authLib, 'useAuth').mockReturnValue({
      user: mockUser,
      token: 'fake-token',
      login: vi.fn(),
      logout: logoutMock,
      triggerPasswordReset: vi.fn(),
      triggerEmailChange: vi.fn(),
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
      getQuota: () => ({ current: 0, limit: 10, remaining: 10, isUnlimited: false, allowed: true }),
      refreshEntitlements: async () => {},
      activateKey: async () => {},
      deactivateKey: async () => {},
    });

    render(
      <MemoryRouter>
        <UserContextMenu />
      </MemoryRouter>
    );

    expect(screen.getByText('Alice User')).toBeDefined();
    expect(screen.getByText('PRO')).toBeDefined();
    expect(screen.getByText('AL')).toBeDefined();
  });

  it('opens dropdown menu and handles logout and modal triggers', () => {
    const logoutMock = vi.fn();
    vi.spyOn(authLib, 'useAuth').mockReturnValue({
      user: mockUser,
      token: 'fake-token',
      login: vi.fn(),
      logout: logoutMock,
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
      hasFeature: () => true,
      getQuota: () => ({ current: 0, limit: 10, remaining: 10, isUnlimited: false, allowed: true }),
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

    render(
      <MemoryRouter>
        <UserContextMenu />
      </MemoryRouter>
    );

    // Click trigger pill to open menu
    const trigger = screen.getByRole('button', { name: /Alice User/i });
    fireEvent.click(trigger);

    expect(screen.getByText('Account & Profile')).toBeDefined();
    expect(screen.getByText('License & Subscription')).toBeDefined();
    expect(screen.getByText('Log Out')).toBeDefined();

    // Click Log Out
    const logoutBtn = screen.getByText('Log Out');
    fireEvent.click(logoutBtn);
    expect(logoutMock).toHaveBeenCalledTimes(1);
  });

  it('automatically opens account modal on Profile tab when URL has modal query parameter', async () => {
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
      hasFeature: () => true,
      getQuota: () => ({ current: 0, limit: 10, remaining: 10, isUnlimited: false, allowed: true }),
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

    render(
      <MemoryRouter initialEntries={['/board?modal=account&tab=profile']}>
        <UserContextMenu />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Change Password')).toBeDefined();
      expect(screen.getByText('Change Email')).toBeDefined();
    });
  });
});
