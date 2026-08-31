import { fetchWithAuth } from './client';
import { EntitlementStatus } from './license';

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

export interface UserSearchResult {
  id: string;
  email: string;
  username: string;
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
