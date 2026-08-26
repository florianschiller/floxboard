import { userManager } from './auth';

export type BoardRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface WhiteboardSummary {
  id: string;
  name: string;
  role?: BoardRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface Whiteboard {
  id: string;
  name: string;
  content: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveWhiteboardRequest {
  id?: string;
  name: string;
  content: any;
}

export interface CollaboratorInfo {
  id?: string;
  userId: string;
  userEmail: string;
  username?: string;
  role: BoardRole;
  createdAt?: string;
}

export interface AccessRequest {
  id: string;
  whiteboardId: string;
  userId: string;
  userEmail: string;
  username: string;
  requestedRole: BoardRole;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  message?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuotaStatus {
  metricKey: string;
  allowed: boolean;
  current: number;
  limit: number | null;
  remaining: number | null;
}

export interface EntitlementStatus {
  plan: 'FREE' | 'PRO' | 'TEAM' | 'ENTERPRISE';
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'INVALID';
  features: Record<string, boolean>;
  quotas: Record<string, QuotaStatus>;
  validUntil: string | null;
  isExpired: boolean;
}

export async function getEntitlementStatus(): Promise<EntitlementStatus> {
  const response = await fetchWithAuth('/api/v1/license/status');
  if (!response.ok) {
    throw new Error('Failed to fetch entitlement status');
  }
  return response.json();
}

export async function activateLicenseKey(licenseKey: string): Promise<any> {
  const response = await fetchWithAuth('/api/v1/license/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ licenseKey }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to activate license');
  }
  return response.json();
}

export async function deactivateLicenseKey(): Promise<any> {
  const response = await fetchWithAuth('/api/v1/license', {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to deactivate license');
  }
  return response.json();
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  let user = await userManager.getUser();

  if (user?.expired) {
    try {
      user = await userManager.signinSilent();
    } catch {
      await userManager.removeUser();
      user = null;
    }
  }

  const headers = new Headers(options.headers || {});
  if (user?.access_token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${user.access_token}`);
  }

  let response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    try {
      user = await userManager.signinSilent();
      if (user?.access_token) {
        headers.set('Authorization', `Bearer ${user.access_token}`);
        response = await fetch(url, { ...options, headers });
      }
    } catch {
      await userManager.removeUser();
    }
  }

  return response;
}

export async function listWhiteboards(start?: number, max?: number, token?: string): Promise<WhiteboardSummary[]> {
  const options: RequestInit = {};
  if (token) {
    options.headers = { Authorization: `Bearer ${token}` };
  }
  const params = new URLSearchParams();
  if (start !== undefined && start !== null) params.set('start', start.toString());
  if (max !== undefined && max !== null) params.set('max', max.toString());
  const queryString = params.toString() ? `?${params.toString()}` : '';
  const response = await fetchWithAuth(`/api/v1/whiteboards${queryString}`, options);
  if (response.status === 401) {
    throw new Error('Unauthorized');
  }
  if (!response.ok) {
    throw new Error('Failed to list whiteboards');
  }
  return response.json();
}

export async function listSharedWhiteboards(start?: number, max?: number, token?: string): Promise<WhiteboardSummary[]> {
  const options: RequestInit = {};
  if (token) {
    options.headers = { Authorization: `Bearer ${token}` };
  }
  const params = new URLSearchParams();
  if (start !== undefined && start !== null) params.set('start', start.toString());
  if (max !== undefined && max !== null) params.set('max', max.toString());
  const queryString = params.toString() ? `?${params.toString()}` : '';
  const response = await fetchWithAuth(`/api/v1/whiteboards/shared${queryString}`, options);
  if (response.status === 401) {
    throw new Error('Unauthorized');
  }
  if (!response.ok) {
    throw new Error('Failed to list shared whiteboards');
  }
  return response.json();
}

export async function getWhiteboard(id: string, token?: string): Promise<Whiteboard> {
  const options: RequestInit = {};
  if (token) {
    options.headers = { Authorization: `Bearer ${token}` };
  }
  const response = await fetchWithAuth(`/api/v1/whiteboards/${id}`, options);
  if (response.status === 401) {
    throw new Error('Unauthorized');
  }
  if (!response.ok) {
    const error: any = new Error('Failed to get whiteboard');
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export async function getBoardRole(id: string, token?: string): Promise<{ role: BoardRole }> {
  const options: RequestInit = {};
  if (token) {
    options.headers = { Authorization: `Bearer ${token}` };
  }
  const response = await fetchWithAuth(`/api/v1/whiteboards/${id}/role`, options);
  if (response.status === 401) {
    throw new Error('Unauthorized');
  }
  if (!response.ok) {
    const error: any = new Error('No access to whiteboard');
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export async function saveWhiteboard(request: SaveWhiteboardRequest, token?: string): Promise<Whiteboard> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetchWithAuth('/api/v1/whiteboards', {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });
  if (response.status === 401) {
    throw new Error('Unauthorized');
  }
  if (!response.ok) {
    let message = 'Failed to save whiteboard';
    try {
      const errorData = await response.json();
      if (errorData && errorData.error) {
        message = errorData.error;
      }
    } catch {
      // ignore
    }
    const err: any = new Error(message);
    err.status = response.status;
    throw err;
  }
  return response.json();
}

export async function deleteWhiteboard(id: string, token?: string): Promise<void> {
  const options: RequestInit = {
    method: 'DELETE',
  };
  if (token) {
    options.headers = { Authorization: `Bearer ${token}` };
  }
  const response = await fetchWithAuth(`/api/v1/whiteboards/${id}`, options);
  if (response.status === 401) {
    throw new Error('Unauthorized');
  }
  if (!response.ok) {
    throw new Error('Failed to delete whiteboard');
  }
}

// Collaborators API
export async function getCollaborators(id: string, token?: string): Promise<CollaboratorInfo[]> {
  const options: RequestInit = {};
  if (token) {
    options.headers = { Authorization: `Bearer ${token}` };
  }
  const response = await fetchWithAuth(`/api/v1/whiteboards/${id}/collaborators`, options);
  if (!response.ok) {
    throw new Error('Failed to load collaborators');
  }
  return response.json();
}

export async function addCollaborator(
  id: string,
  emailOrUsername: string,
  role: BoardRole,
  token?: string
): Promise<CollaboratorInfo> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetchWithAuth(`/api/v1/whiteboards/${id}/collaborators`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: emailOrUsername, role }),
  });
  if (!response.ok) {
    let message = 'Failed to invite collaborator';
    try {
      const errorData = await response.json();
      if (errorData?.error) message = errorData.error;
    } catch {}
    throw new Error(message);
  }
  return response.json();
}

export async function updateCollaboratorRole(
  id: string,
  userId: string,
  role: BoardRole,
  token?: string
): Promise<CollaboratorInfo> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetchWithAuth(`/api/v1/whiteboards/${id}/collaborators/${userId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ role }),
  });
  if (!response.ok) {
    let message = 'Failed to update role';
    try {
      const errorData = await response.json();
      if (errorData?.error) message = errorData.error;
    } catch {}
    throw new Error(message);
  }
  return response.json();
}

export async function removeCollaborator(id: string, userId: string, token?: string): Promise<void> {
  const options: RequestInit = { method: 'DELETE' };
  if (token) options.headers = { Authorization: `Bearer ${token}` };
  const response = await fetchWithAuth(`/api/v1/whiteboards/${id}/collaborators/${userId}`, options);
  if (!response.ok) {
    let message = 'Failed to remove collaborator';
    try {
      const errorData = await response.json();
      if (errorData?.error) message = errorData.error;
    } catch {}
    throw new Error(message);
  }
}

export interface UserSearchResult {
  id: string;
  email: string;
  username: string;
}

export async function searchUsers(query: string, token?: string): Promise<UserSearchResult[]> {
  if (!query.trim()) return [];
  const options: RequestInit = {};
  if (token) options.headers = { Authorization: `Bearer ${token}` };
  const params = new URLSearchParams({ q: query.trim() });
  const response = await fetchWithAuth(`/api/v1/whiteboards/users?${params.toString()}`, options);
  if (!response.ok) {
    return [];
  }
  return response.json();
}

// Access Requests API
export async function requestAccess(
  id: string,
  requestedRole: BoardRole,
  message?: string,
  token?: string
): Promise<AccessRequest> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetchWithAuth(`/api/v1/whiteboards/${id}/access-requests`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ requestedRole, message }),
  });
  if (!response.ok) {
    let msg = 'Failed to submit access request';
    try {
      const errorData = await response.json();
      if (errorData?.error) msg = errorData.error;
    } catch {}
    throw new Error(msg);
  }
  return response.json();
}

export async function getAccessRequests(id: string, token?: string): Promise<AccessRequest[]> {
  const options: RequestInit = {};
  if (token) options.headers = { Authorization: `Bearer ${token}` };
  const response = await fetchWithAuth(`/api/v1/whiteboards/${id}/access-requests`, options);
  if (!response.ok) {
    throw new Error('Failed to load access requests');
  }
  return response.json();
}

export async function getMyAccessRequest(id: string, token?: string): Promise<AccessRequest | null> {
  const options: RequestInit = {};
  if (token) options.headers = { Authorization: `Bearer ${token}` };
  const response = await fetchWithAuth(`/api/v1/whiteboards/${id}/access-requests/my`, options);
  if (response.status === 404) return null;
  if (!response.ok) return null;
  return response.json();
}

export async function approveAccessRequest(
  id: string,
  requestId: string,
  role?: BoardRole,
  token?: string
): Promise<AccessRequest> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetchWithAuth(`/api/v1/whiteboards/${id}/access-requests/${requestId}/approve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ role }),
  });
  if (!response.ok) {
    throw new Error('Failed to approve request');
  }
  return response.json();
}

export async function rejectAccessRequest(
  id: string,
  requestId: string,
  token?: string
): Promise<AccessRequest> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetchWithAuth(`/api/v1/whiteboards/${id}/access-requests/${requestId}/reject`, {
    method: 'POST',
    headers,
  });
  if (!response.ok) {
    throw new Error('Failed to reject request');
  }
  return response.json();
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  emailVerified: boolean;
  roles: string[];
}

export interface UpdateProfileRequest {
  firstName?: string | null;
  lastName?: string | null;
}

export async function getUserProfile(token?: string): Promise<UserProfile> {
  const options: RequestInit = {};
  if (token) options.headers = { Authorization: `Bearer ${token}` };
  const response = await fetchWithAuth('/api/v1/user/me', options);
  if (!response.ok) {
    throw new Error('Failed to load user profile');
  }
  return response.json();
}

export async function updateUserProfile(
  profile: UpdateProfileRequest,
  token?: string
): Promise<UserProfile> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetchWithAuth('/api/v1/user/me', {
    method: 'PUT',
    headers,
    body: JSON.stringify(profile),
  });
  if (!response.ok) {
    throw new Error('Failed to update user profile');
  }
  return response.json();
}

// Admin APIs
export interface AdminUser {
  id: string;
  username: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  emailVerified: boolean;
  roles: string[];
  license?: EntitlementStatus | null;
}

export interface AssignLicensePayload {
  plan: 'FREE' | 'PRO' | 'TEAM' | 'ENTERPRISE';
  validUntil?: string | null;
  features?: Record<string, boolean>;
  quotas?: Record<string, any>;
}

export interface PlanDefinitionMap {
  [plan: string]: {
    features: Record<string, boolean>;
    quotas: Record<string, { limit: number; period: string; allowOverage: boolean }>;
  };
}

export async function adminSearchUsers(query?: string, token?: string): Promise<AdminUser[]> {
  const options: RequestInit = {};
  if (token) options.headers = { Authorization: `Bearer ${token}` };
  const params = new URLSearchParams();
  if (query && query.trim()) params.set('query', query.trim());
  const queryString = params.toString() ? `?${params.toString()}` : '';
  const response = await fetchWithAuth(`/api/v1/admin/users${queryString}`, options);
  if (response.status === 401 || response.status === 403) {
    const err: any = new Error(response.status === 403 ? 'Forbidden: Admin role required' : 'Unauthorized');
    err.status = response.status;
    throw err;
  }
  if (!response.ok) {
    throw new Error('Failed to search users');
  }
  return response.json();
}

export async function adminGetUser(userId: string, token?: string): Promise<AdminUser> {
  const options: RequestInit = {};
  if (token) options.headers = { Authorization: `Bearer ${token}` };
  const response = await fetchWithAuth(`/api/v1/admin/users/${userId}`, options);
  if (response.status === 401 || response.status === 403) {
    const err: any = new Error(response.status === 403 ? 'Forbidden: Admin role required' : 'Unauthorized');
    err.status = response.status;
    throw err;
  }
  if (!response.ok) {
    throw new Error('Failed to get user');
  }
  return response.json();
}

export async function adminAssignLicense(
  userId: string,
  payload: AssignLicensePayload,
  token?: string
): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetchWithAuth(`/api/v1/admin/users/${userId}/license`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to assign license');
  }
  return response.json();
}

export async function adminRevokeLicense(userId: string, token?: string): Promise<any> {
  const options: RequestInit = { method: 'DELETE' };
  if (token) options.headers = { Authorization: `Bearer ${token}` };
  const response = await fetchWithAuth(`/api/v1/admin/users/${userId}/license`, options);
  if (!response.ok) {
    throw new Error('Failed to revoke license');
  }
  return response.json();
}

export async function adminGetPlans(token?: string): Promise<PlanDefinitionMap> {
  const options: RequestInit = {};
  if (token) options.headers = { Authorization: `Bearer ${token}` };
  const response = await fetchWithAuth('/api/v1/admin/plans', options);
  if (!response.ok) {
    throw new Error('Failed to fetch plan definitions');
  }
  return response.json();
}
