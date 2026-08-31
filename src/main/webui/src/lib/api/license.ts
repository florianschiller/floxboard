import { fetchWithAuth } from './client';

export type LicensePlan = 'FREE' | 'PRO' | 'TEAM' | 'ENTERPRISE';
export type BillingInterval = 'MONTHLY' | 'YEARLY';

export interface QuotaStatus {
  metricKey: string;
  allowed: boolean;
  current: number;
  limit: number | null;
  remaining: number | null;
}

export interface EntitlementStatus {
  plan: LicensePlan;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'INVALID';
  features: Record<string, boolean>;
  quotas: Record<string, QuotaStatus>;
  validUntil: string | null;
  isExpired: boolean;
}

export interface AssignLicensePayload {
  plan: LicensePlan;
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
