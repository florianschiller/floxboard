import { fetchWithAuth } from './client';
import { LicensePlan, BillingInterval } from './license';
import { MockCheckoutResponse } from './payment';

export type OrgMemberRole = 'ORG_ADMIN' | 'MEMBER';
export type JoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type OrgLicensePoolStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface OrgLicensePoolDto {
  id: string;
  organizationId: string;
  planType: LicensePlan;
  totalSeats: number;
  allocatedSeats: number;
  remainingSeats: number;
  billingInterval: BillingInterval;
  validFrom?: string | null;
  validUntil?: string | null;
  status: OrgLicensePoolStatus;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface OrganizationDto {
  id: string;
  name: string;
  alias?: string | null;
  domains: string[];
  memberCount: number;
  adminCount: number;
  activePools: OrgLicensePoolDto[];
}

export interface CreateOrganizationRequest {
  name: string;
  domains?: string[];
  initialOrgAdminUserId?: string | null;
  initialOrgAdminEmail?: string | null;
}

export interface OrganizationMemberDto {
  id: string;
  username: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: OrgMemberRole;
  assignedPlan?: LicensePlan | null;
  poolAssignmentId?: string | null;
  hasLicense?: boolean;
  licenseSource?: string | null;
}

export interface OrganizationJoinRequestDto {
  id: string;
  organizationId: string;
  userId: string;
  email: string;
  status: JoinRequestStatus;
  resolvedBy?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface OrgBulkCheckoutRequest {
  plan: LicensePlan;
  seatCount: number;
  billingInterval?: BillingInterval;
  paymentMethod?: string;
  cardholderName?: string;
}

export interface SeatAssignmentDto {
  id: string;
  poolId: string;
  userId: string;
  userEmail?: string | null;
  assignedBy: string;
  assignedAt: string;
}

export interface MyOrganizationProfileDto {
  organizationId: string;
  organizationName: string;
  role: OrgMemberRole;
  domains: string[];
}

export interface InviteMemberRequest {
  email: string;
  role?: OrgMemberRole;
}

export interface UpdateMemberRoleRequest {
  role: OrgMemberRole;
}

// ---------------------------------------------------------------------------
// Org-Admin Scoped API Endpoints (/api/v1/organizations/*)
// ---------------------------------------------------------------------------

export async function getMyOrganization(orgId?: string, token?: string): Promise<MyOrganizationProfileDto> {
  const options: RequestInit = {};
  if (token) options.headers = { Authorization: `Bearer ${token}` };
  const query = orgId ? `?orgId=${encodeURIComponent(orgId)}` : '';
  const response = await fetchWithAuth(`/api/v1/organizations/my${query}`, options);
  if (!response.ok) {
    throw new Error('Failed to fetch current organization profile');
  }
  return response.json();
}

export async function getMyOrganizations(token?: string): Promise<MyOrganizationProfileDto[]> {
  const options: RequestInit = {};
  if (token) options.headers = { Authorization: `Bearer ${token}` };
  const response = await fetchWithAuth('/api/v1/organizations/my-organizations', options);
  if (!response.ok) {
    throw new Error('Failed to fetch user organizations');
  }
  return response.json();
}

export async function getOrgMembers(orgId?: string, token?: string): Promise<OrganizationMemberDto[]> {
  const options: RequestInit = {};
  if (token) options.headers = { Authorization: `Bearer ${token}` };
  const query = orgId ? `?orgId=${encodeURIComponent(orgId)}` : '';
  const response = await fetchWithAuth(`/api/v1/organizations/members${query}`, options);
  if (!response.ok) {
    throw new Error('Failed to fetch organization members');
  }
  return response.json();
}

export async function inviteOrgMember(
  data: InviteMemberRequest,
  orgId?: string,
  token?: string
): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const query = orgId ? `?orgId=${encodeURIComponent(orgId)}` : '';
  const response = await fetchWithAuth(`/api/v1/organizations/invitations${query}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Failed to invite member');
  }
}

export async function updateOrgMemberRole(
  userId: string,
  role: OrgMemberRole,
  orgId?: string,
  token?: string
): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const query = orgId ? `?orgId=${encodeURIComponent(orgId)}` : '';
  const response = await fetchWithAuth(`/api/v1/organizations/members/${userId}/role${query}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ role }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Failed to update member role');
  }
}

export async function removeOrgMember(
  userId: string,
  orgId?: string,
  token?: string
): Promise<void> {
  const options: RequestInit = { method: 'DELETE' };
  if (token) options.headers = { Authorization: `Bearer ${token}` };
  const query = orgId ? `?orgId=${encodeURIComponent(orgId)}` : '';
  const response = await fetchWithAuth(`/api/v1/organizations/members/${userId}${query}`, options);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Failed to remove member from organization');
  }
}

export async function getPendingOrgMembers(orgId?: string, token?: string): Promise<OrganizationJoinRequestDto[]> {
  const options: RequestInit = {};
  if (token) options.headers = { Authorization: `Bearer ${token}` };
  const query = orgId ? `?orgId=${encodeURIComponent(orgId)}` : '';
  const response = await fetchWithAuth(`/api/v1/organizations/pending-members${query}`, options);
  if (!response.ok) {
    throw new Error('Failed to fetch pending domain join requests');
  }
  return response.json();
}

export async function approvePendingOrgMember(requestId: string, token?: string): Promise<OrganizationJoinRequestDto> {
  const options: RequestInit = { method: 'POST' };
  if (token) options.headers = { Authorization: `Bearer ${token}` };
  const response = await fetchWithAuth(`/api/v1/organizations/pending-members/${requestId}/approve`, options);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Failed to approve join request');
  }
  return response.json();
}

export async function rejectPendingOrgMember(requestId: string, token?: string): Promise<OrganizationJoinRequestDto> {
  const options: RequestInit = { method: 'POST' };
  if (token) options.headers = { Authorization: `Bearer ${token}` };
  const response = await fetchWithAuth(`/api/v1/organizations/pending-members/${requestId}/reject`, options);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Failed to reject join request');
  }
  return response.json();
}

export async function getOrgLicensePools(orgId?: string, token?: string): Promise<OrgLicensePoolDto[]> {
  const options: RequestInit = {};
  if (token) options.headers = { Authorization: `Bearer ${token}` };
  const query = orgId ? `?orgId=${encodeURIComponent(orgId)}` : '';
  const response = await fetchWithAuth(`/api/v1/organizations/license-pool${query}`, options);
  if (!response.ok) {
    throw new Error('Failed to fetch organization license pools');
  }
  return response.json();
}

export async function orgBulkCheckout(
  data: OrgBulkCheckoutRequest,
  orgId?: string,
  token?: string
): Promise<MockCheckoutResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const query = orgId ? `?orgId=${encodeURIComponent(orgId)}` : '';
  const response = await fetchWithAuth(`/api/v1/organizations/license-pool/checkout${query}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Failed to purchase bulk seats');
  }
  return response.json();
}

export async function assignOrgSeat(
  poolId: string,
  userId: string,
  token?: string
): Promise<SeatAssignmentDto> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetchWithAuth(`/api/v1/organizations/license-pool/${poolId}/assign`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Failed to assign license seat');
  }
  return response.json();
}

export async function unassignOrgSeat(
  poolId: string,
  userId: string,
  token?: string
): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetchWithAuth(`/api/v1/organizations/license-pool/${poolId}/unassign`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Failed to unassign license seat');
  }
}

export async function adminListOrganizations(token?: string): Promise<OrganizationDto[]> {
  const options: RequestInit = {};
  if (token) options.headers = { Authorization: `Bearer ${token}` };
  const response = await fetchWithAuth('/api/v1/admin/organizations', options);
  if (!response.ok) {
    throw new Error('Failed to fetch organizations');
  }
  return response.json();
}

export async function adminCreateOrganization(
  data: CreateOrganizationRequest,
  token?: string
): Promise<OrganizationDto> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetchWithAuth('/api/v1/admin/organizations', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Failed to create organization');
  }
  return response.json();
}

export async function adminDeleteOrganization(orgId: string, token?: string): Promise<void> {
  const options: RequestInit = { method: 'DELETE' };
  if (token) options.headers = { Authorization: `Bearer ${token}` };
  const response = await fetchWithAuth(`/api/v1/admin/organizations/${orgId}`, options);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Failed to delete organization');
  }
}

export async function adminGetOrgMembers(orgId: string, token?: string): Promise<OrganizationMemberDto[]> {
  const options: RequestInit = {};
  if (token) options.headers = { Authorization: `Bearer ${token}` };
  const response = await fetchWithAuth(`/api/v1/admin/organizations/${orgId}/members`, options);
  if (!response.ok) {
    throw new Error('Failed to fetch organization members');
  }
  return response.json();
}

export async function adminAddOrgAdmin(orgId: string, userId: string, token?: string): Promise<void> {
  const options: RequestInit = { method: 'POST' };
  if (token) options.headers = { Authorization: `Bearer ${token}` };
  const response = await fetchWithAuth(`/api/v1/admin/organizations/${orgId}/admins/${userId}`, options);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Failed to promote member to org-admin');
  }
}

export async function adminRemoveOrgAdmin(orgId: string, userId: string, token?: string): Promise<void> {
  const options: RequestInit = { method: 'DELETE' };
  if (token) options.headers = { Authorization: `Bearer ${token}` };
  const response = await fetchWithAuth(`/api/v1/admin/organizations/${orgId}/admins/${userId}`, options);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Failed to demote member from org-admin');
  }
}

export async function adminRemoveOrgMember(orgId: string, userId: string, token?: string): Promise<void> {
  const options: RequestInit = { method: 'DELETE' };
  if (token) options.headers = { Authorization: `Bearer ${token}` };
  const response = await fetchWithAuth(`/api/v1/admin/organizations/${orgId}/members/${userId}`, options);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Failed to remove member from organization');
  }
}

export async function adminGetPendingMembers(orgId: string, token?: string): Promise<OrganizationJoinRequestDto[]> {
  const options: RequestInit = {};
  if (token) options.headers = { Authorization: `Bearer ${token}` };
  const response = await fetchWithAuth(`/api/v1/admin/organizations/${orgId}/pending-members`, options);
  if (!response.ok) {
    throw new Error('Failed to fetch pending domain join requests');
  }
  return response.json();
}

export async function adminApprovePendingMember(orgId: string, requestId: string, token?: string): Promise<OrganizationJoinRequestDto> {
  const options: RequestInit = { method: 'POST' };
  if (token) options.headers = { Authorization: `Bearer ${token}` };
  const response = await fetchWithAuth(`/api/v1/admin/organizations/${orgId}/pending-members/${requestId}/approve`, options);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Failed to approve join request');
  }
  return response.json();
}

export async function adminRejectPendingMember(orgId: string, requestId: string, token?: string): Promise<OrganizationJoinRequestDto> {
  const options: RequestInit = { method: 'POST' };
  if (token) options.headers = { Authorization: `Bearer ${token}` };
  const response = await fetchWithAuth(`/api/v1/admin/organizations/${orgId}/pending-members/${requestId}/reject`, options);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Failed to reject join request');
  }
  return response.json();
}

export async function adminGetOrgLicensePools(orgId: string, token?: string): Promise<OrgLicensePoolDto[]> {
  const options: RequestInit = {};
  if (token) options.headers = { Authorization: `Bearer ${token}` };
  const response = await fetchWithAuth(`/api/v1/admin/organizations/${orgId}/license-pools`, options);
  if (!response.ok) {
    throw new Error('Failed to fetch organization license pools');
  }
  return response.json();
}

export async function adminOrgBulkCheckout(
  orgId: string,
  data: OrgBulkCheckoutRequest,
  token?: string
): Promise<MockCheckoutResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetchWithAuth(`/api/v1/admin/organizations/${orgId}/license-pools/checkout`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Failed to purchase bulk seats');
  }
  return response.json();
}

export async function adminAssignOrgSeat(
  orgId: string,
  poolId: string,
  userId: string,
  token?: string
): Promise<SeatAssignmentDto> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetchWithAuth(`/api/v1/admin/organizations/${orgId}/license-pools/${poolId}/assign`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Failed to assign license seat');
  }
  return response.json();
}

export async function adminUnassignOrgSeat(
  orgId: string,
  poolId: string,
  userId: string,
  token?: string
): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetchWithAuth(`/api/v1/admin/organizations/${orgId}/license-pools/${poolId}/unassign`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Failed to unassign license seat');
  }
}
