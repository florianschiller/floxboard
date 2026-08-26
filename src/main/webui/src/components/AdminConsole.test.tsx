// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AdminConsole } from './AdminConsole';
import * as authLib from '@/lib/auth';
import * as api from '@/lib/api';
import * as entitlementContext from '@/lib/entitlementContext';

describe('AdminConsole', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.spyOn(entitlementContext, 'useEntitlements').mockReturnValue({
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
      isExpired: false,
      validUntil: null,
      entitlements: null,
      loading: false,
      hasFeature: () => true,
      getQuota: () => ({ current: 0, limit: null, remaining: null, isUnlimited: true, allowed: true }),
      refreshEntitlements: async () => {},
      activateKey: async () => {},
      deactivateKey: async () => {},
    });
  });

  const mockAdminUser: any = {
    profile: {
      sub: 'admin-123',
      preferred_username: 'admin',
      email: 'admin@floxboard.io',
      name: 'Admin User',
    },
    access_token: 'fake-admin-token',
  };

  const mockRegularUser: any = {
    profile: {
      sub: 'alice-123',
      preferred_username: 'alice',
      email: 'alice@floxboard.io',
      name: 'Alice User',
    },
    access_token: 'fake-alice-token',
  };

  it('displays Access Denied when user does not have admin role', async () => {
    vi.spyOn(authLib, 'useAuth').mockReturnValue({
      user: mockRegularUser,
      token: 'fake-alice-token',
      login: vi.fn(),
      logout: vi.fn(),
      triggerPasswordReset: vi.fn(),
      triggerEmailChange: vi.fn(),
      isLoading: false,
    });

    vi.spyOn(api, 'getUserProfile').mockResolvedValue({
      id: 'alice-123',
      username: 'alice',
      email: 'alice@floxboard.io',
      firstName: 'Alice',
      lastName: 'User',
      emailVerified: true,
      roles: ['user'],
    });

    render(
      <MemoryRouter>
        <AdminConsole />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeDefined();
      expect(screen.getByText(/You need the/i)).toBeDefined();
      expect(screen.getByText('Return to Whiteboard')).toBeDefined();
    });
  });

  it('renders Admin Console for admin user and lists users', async () => {
    vi.spyOn(authLib, 'useAuth').mockReturnValue({
      user: mockAdminUser,
      token: 'fake-admin-token',
      login: vi.fn(),
      logout: vi.fn(),
      triggerPasswordReset: vi.fn(),
      triggerEmailChange: vi.fn(),
      isLoading: false,
    });

    vi.spyOn(entitlementContext, 'useEntitlements').mockReturnValue({
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
      isExpired: false,
      validUntil: null,
      entitlements: null,
      loading: false,
      hasFeature: () => true,
      getQuota: () => ({ current: 0, limit: -1, remaining: null, isUnlimited: true, allowed: true }),
      refreshEntitlements: async () => {},
      activateKey: async () => {},
      deactivateKey: async () => {},
    });

    vi.spyOn(api, 'getUserProfile').mockResolvedValue({
      id: 'admin-123',
      username: 'admin',
      email: 'admin@floxboard.io',
      firstName: 'Admin',
      lastName: 'User',
      emailVerified: true,
      roles: ['user', 'admin'],
    });

    const mockAdminUsers: api.AdminUser[] = [
      {
        id: 'alice-123',
        username: 'alice',
        email: 'alice@floxboard.io',
        firstName: 'Alice',
        lastName: 'User',
        emailVerified: true,
        roles: ['user'],
        license: {
          plan: 'FREE',
          status: 'ACTIVE',
          features: {},
          quotas: {} as any,
          validUntil: null,
          isExpired: false,
        },
      },
      {
        id: 'bob-123',
        username: 'bob',
        email: 'bob@floxboard.io',
        firstName: 'Bob',
        lastName: 'User',
        emailVerified: true,
        roles: ['user'],
        license: {
          plan: 'PRO',
          status: 'ACTIVE',
          features: {},
          quotas: {} as any,
          validUntil: '2026-12-31T23:59:59Z',
          isExpired: false,
        },
      },
    ];

    vi.spyOn(api, 'adminSearchUsers').mockResolvedValue(mockAdminUsers);

    render(
      <MemoryRouter>
        <AdminConsole />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Admin Console')).toBeDefined();
      expect(screen.getByText('alice@floxboard.io')).toBeDefined();
      expect(screen.getByText('bob@floxboard.io')).toBeDefined();
      expect(screen.getByText('Total Users')).toBeDefined();
    });
  });

  it('opens assign license modal and triggers license assignment', async () => {
    vi.spyOn(authLib, 'useAuth').mockReturnValue({
      user: mockAdminUser,
      token: 'fake-admin-token',
      login: vi.fn(),
      logout: vi.fn(),
      triggerPasswordReset: vi.fn(),
      triggerEmailChange: vi.fn(),
      isLoading: false,
    });

    vi.spyOn(entitlementContext, 'useEntitlements').mockReturnValue({
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
      isExpired: false,
      validUntil: null,
      entitlements: null,
      loading: false,
      hasFeature: () => true,
      getQuota: () => ({ current: 0, limit: -1, remaining: null, isUnlimited: true, allowed: true }),
      refreshEntitlements: async () => {},
      activateKey: async () => {},
      deactivateKey: async () => {},
    });

    vi.spyOn(api, 'getUserProfile').mockResolvedValue({
      id: 'admin-123',
      username: 'admin',
      email: 'admin@floxboard.io',
      firstName: 'Admin',
      lastName: 'User',
      emailVerified: true,
      roles: ['user', 'admin'],
    });

    const mockAdminUsers: api.AdminUser[] = [
      {
        id: 'alice-123',
        username: 'alice',
        email: 'alice@floxboard.io',
        firstName: 'Alice',
        lastName: 'User',
        emailVerified: true,
        roles: ['user'],
        license: {
          plan: 'FREE',
          status: 'ACTIVE',
          features: {},
          quotas: {} as any,
          validUntil: null,
          isExpired: false,
        },
      },
    ];

    vi.spyOn(api, 'adminSearchUsers').mockResolvedValue(mockAdminUsers);
    const assignMock = vi.spyOn(api, 'adminAssignLicense').mockResolvedValue({ message: 'Success' });

    render(
      <MemoryRouter>
        <AdminConsole />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('alice@floxboard.io')).toBeDefined();
    });

    // Click "Manage" button on Alice
    const manageBtn = screen.getByText('Manage');
    fireEvent.click(manageBtn);

    // Modal opens
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Assign License/i })).toBeDefined();
      expect(screen.getByText('Select Subscription Plan')).toBeDefined();
    });

    // Click "PRO" radio and submit form
    const assignSubmitBtn = screen.getByRole('button', { name: /Assign License/i });
    fireEvent.click(assignSubmitBtn);

    await waitFor(() => {
      expect(assignMock).toHaveBeenCalledWith(
        'alice-123',
        expect.objectContaining({ plan: 'PRO' }),
        'fake-admin-token'
      );
    });
  });
});
