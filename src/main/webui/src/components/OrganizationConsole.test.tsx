// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { OrganizationConsole } from './OrganizationConsole';
import * as authLib from '@/lib/auth';
import * as entitlementContext from '@/lib/entitlementContext';
import * as api from '@/lib/api';

describe('OrganizationConsole', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const mockUser: any = {
    profile: {
      sub: 'dave-id-123',
      preferred_username: 'dave@floxboard.io',
      email: 'dave@floxboard.io',
      name: 'Dave Admin',
    },
    access_token: 'fake-org-admin-token',
  };

  const mockOrgProfile: api.MyOrganizationProfileDto = {
    organizationId: 'acme-org-id',
    organizationName: 'Acme Corp',
    role: 'ORG_ADMIN',
    domains: ['acme.com'],
  };

  const mockMembers: api.OrganizationMemberDto[] = [
    {
      id: 'dave-id-123',
      username: 'dave@floxboard.io',
      email: 'dave@floxboard.io',
      firstName: 'Dave',
      lastName: 'Admin',
      role: 'ORG_ADMIN',
      assignedPlan: null,
    },
    {
      id: 'bob-id-456',
      username: 'bob@floxboard.io',
      email: 'bob@floxboard.io',
      firstName: 'Bob',
      lastName: 'User',
      role: 'MEMBER',
      assignedPlan: null,
    },
  ];

  const mockPendingRequests: api.OrganizationJoinRequestDto[] = [
    {
      id: 'req-id-789',
      organizationId: 'acme-org-id',
      userId: 'pending-user-id',
      email: 'newuser@acme.com',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    },
  ];

  const mockLicensePools: api.OrgLicensePoolDto[] = [
    {
      id: 'pool-id-101',
      organizationId: 'acme-org-id',
      planType: 'PRO',
      totalSeats: 10,
      allocatedSeats: 2,
      remainingSeats: 8,
      billingInterval: 'MONTHLY',
      status: 'ACTIVE',
    },
  ];

  beforeEach(() => {
    vi.spyOn(authLib, 'useAuth').mockReturnValue({
      user: mockUser,
      token: 'fake-org-admin-token',
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

    vi.spyOn(api, 'getMyOrganizations').mockResolvedValue([mockOrgProfile]);
    vi.spyOn(api, 'getMyOrganization').mockResolvedValue(mockOrgProfile);
    vi.spyOn(api, 'getOrgMembers').mockResolvedValue(mockMembers);
    vi.spyOn(api, 'getPendingOrgMembers').mockResolvedValue(mockPendingRequests);
    vi.spyOn(api, 'getOrgLicensePools').mockResolvedValue(mockLicensePools);
  });

  it('renders organization details, member counts, and subtabs', async () => {
    render(
      <MemoryRouter>
        <OrganizationConsole />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('@acme.com')).toBeDefined();
    expect(screen.getByText(/Members \(2\)/i)).toBeDefined();
    expect(screen.getByText(/Pending Approvals/i)).toBeDefined();
    expect(screen.getByText(/Licenses & Billing/i)).toBeDefined();

    // Verify members are listed
    expect(screen.getByText('dave@floxboard.io')).toBeDefined();
    expect(screen.getByText('bob@floxboard.io')).toBeDefined();
  });

  it('invites a new member to the organization', async () => {
    const inviteMock = vi.spyOn(api, 'inviteOrgMember').mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <OrganizationConsole />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0);
    });

    // Click "Invite Member"
    fireEvent.click(screen.getByRole('button', { name: /Invite Member/i }));

    // Modal opens
    expect(screen.getByText('Invite Organization Member')).toBeDefined();

    // Fill form
    const emailInput = screen.getByPlaceholderText('colleague@example.com');
    fireEvent.change(emailInput, { target: { value: 'alice@acme.com' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Send Invitation/i }));

    await waitFor(() => {
      expect(inviteMock).toHaveBeenCalledWith(
        { email: 'alice@acme.com', role: 'MEMBER' },
        'acme-org-id',
        'fake-org-admin-token'
      );
    });
  });

  it('switches to Pending Approvals tab and approves a domain join request', async () => {
    const approveMock = vi.spyOn(api, 'approvePendingOrgMember').mockResolvedValue({
      id: 'req-id-789',
      organizationId: 'acme-org-id',
      userId: 'pending-user-id',
      email: 'newuser@acme.com',
      status: 'APPROVED',
      createdAt: new Date().toISOString(),
    });

    render(
      <MemoryRouter>
        <OrganizationConsole />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0);
    });

    // Switch to Pending Approvals tab
    fireEvent.click(screen.getByRole('button', { name: /Pending Approvals/i }));

    // Verify pending user request email appears
    expect(screen.getByText('newuser@acme.com')).toBeDefined();

    // Click "Approve"
    fireEvent.click(screen.getByRole('button', { name: /Approve/i }));

    await waitFor(() => {
      expect(approveMock).toHaveBeenCalledWith('req-id-789', 'fake-org-admin-token');
    });
  });

  it('switches to Licenses tab and displays seat pools and handles allocation', async () => {
    const assignMock = vi.spyOn(api, 'assignOrgSeat').mockResolvedValue({
      id: 'assign-1',
      poolId: 'pool-id-101',
      userId: 'bob-id-456',
      assignedBy: 'dave-id-123',
      assignedAt: new Date().toISOString(),
    });

    render(
      <MemoryRouter>
        <OrganizationConsole />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0);
    });

    // Switch to Licenses & Billing tab
    fireEvent.click(screen.getByRole('button', { name: /Licenses & Billing/i }));

    // Verify pool statistics
    expect(screen.getByText('Total Purchased Seats')).toBeDefined();
    expect(screen.getByText('10')).toBeDefined();
    expect(screen.getByText('Available Seats')).toBeDefined();
    expect(screen.getByText('8 seats')).toBeDefined();

    // Select pool and member to assign
    const selects = screen.getAllByRole('combobox');
    const poolSelect = selects[0];
    const memberSelect = selects[1];

    fireEvent.change(poolSelect, { target: { value: 'pool-id-101' } });
    fireEvent.change(memberSelect, { target: { value: 'bob-id-456' } });

    // Click Assign Seat
    fireEvent.click(screen.getByRole('button', { name: /Assign Seat/i }));

    await waitFor(() => {
      expect(assignMock).toHaveBeenCalledWith('pool-id-101', 'bob-id-456', 'fake-org-admin-token');
    });
  });

  it('renders organization switcher when user belongs to multiple organizations', async () => {
    const mockOrgProfile2: api.MyOrganizationProfileDto = {
      organizationId: 'stark-org-id',
      organizationName: 'Stark Industries',
      role: 'ORG_ADMIN',
      domains: ['stark.com'],
    };

    vi.spyOn(api, 'getMyOrganizations').mockResolvedValue([mockOrgProfile, mockOrgProfile2]);

    render(
      <MemoryRouter initialEntries={['/organization']}>
        <OrganizationConsole />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /Select Organization/i })).toBeDefined();
    });

    const switcher = screen.getByRole('combobox', { name: /Select Organization/i }) as HTMLSelectElement;
    expect(switcher.children.length).toBe(2);
    expect(switcher.value).toBe('acme-org-id');
  });

  it('filters out members who already have a license from target pool assignment dropdown', async () => {
    const membersWithLicensedMember: api.OrganizationMemberDto[] = [
      {
        id: 'frank-id-789',
        username: 'frank@floxboard.io',
        email: 'frank@floxboard.io',
        firstName: 'Frank',
        role: 'ORG_ADMIN',
        assignedPlan: null,
        effectivePlan: 'ENTERPRISE',
        hasLicense: true,
        licenseSource: 'OTHER_ORGANIZATION',
      },
      {
        id: 'alice-id-101',
        username: 'alice@floxboard.io',
        email: 'alice@floxboard.io',
        firstName: 'Alice',
        role: 'MEMBER',
        assignedPlan: null,
        effectivePlan: 'PRO',
        hasLicense: true,
        licenseSource: 'PRIVATE',
      },
      {
        id: 'bob-id-456',
        username: 'bob@floxboard.io',
        email: 'bob@floxboard.io',
        firstName: 'Bob',
        role: 'MEMBER',
        assignedPlan: null,
        hasLicense: false,
      },
    ];

    vi.spyOn(api, 'getOrgMembers').mockResolvedValue(membersWithLicensedMember);

    render(
      <MemoryRouter initialEntries={['/organization']}>
        <OrganizationConsole />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0);
    });

    // Verify member table displays the actual license with source
    expect(screen.getByText('ENTERPRISE (Other Org)')).toBeDefined();
    expect(screen.getByText('PRO (Private)')).toBeDefined();

    // Switch to Licenses & Billing tab
    fireEvent.click(screen.getByRole('button', { name: /Licenses & Billing/i }));

    const selects = screen.getAllByRole('combobox');
    const memberSelect = selects[1] as HTMLSelectElement;

    // Bob should be in the dropdown options, but Frank (hasLicense=true) should NOT be
    const options = Array.from(memberSelect.options).map((opt) => opt.text);
    expect(options.some((text) => text.includes('bob@floxboard.io'))).toBe(true);
    expect(options.some((text) => text.includes('frank@floxboard.io'))).toBe(false);
  });

  it('denies access when user is only a MEMBER in the requested organization', async () => {
    const memberOrgProfile: api.MyOrganizationProfileDto = {
      organizationId: 'stark-org-id',
      organizationName: 'Stark Industries',
      role: 'MEMBER',
      domains: ['stark.com'],
    };

    vi.spyOn(api, 'getMyOrganizations').mockResolvedValue([memberOrgProfile]);
    vi.spyOn(api, 'getMyOrganization').mockResolvedValue(memberOrgProfile);

    render(
      <MemoryRouter initialEntries={['/organization?orgId=stark-org-id']}>
        <OrganizationConsole />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Access Restricted')).toBeDefined();
    });
    expect(screen.getByText(/You are not an organization admin of any active organization/i)).toBeDefined();
  });

  it('filters out non-admin organizations from the organization switcher dropdown', async () => {
    const adminOrgProfile: api.MyOrganizationProfileDto = {
      organizationId: 'acme-org-id',
      organizationName: 'Acme Corp',
      role: 'ORG_ADMIN',
      domains: ['acme.com'],
    };
    const memberOrgProfile: api.MyOrganizationProfileDto = {
      organizationId: 'stark-org-id',
      organizationName: 'Stark Industries',
      role: 'MEMBER',
      domains: ['stark.com'],
    };

    vi.spyOn(api, 'getMyOrganizations').mockResolvedValue([adminOrgProfile, memberOrgProfile]);
    vi.spyOn(api, 'getMyOrganization').mockResolvedValue(adminOrgProfile);

    render(
      <MemoryRouter initialEntries={['/organization']}>
        <OrganizationConsole />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0);
    });

    // Since only 1 org is admin-managed, the multi-org select dropdown should not appear (only header h1)
    expect(screen.queryByRole('combobox', { name: /Select Organization/i })).toBeNull();
  });
});
