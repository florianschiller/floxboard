import { fetchWithAuth } from './client';

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
    body: JSON.stringify({ emailOrUsername, role }),
  });
  if (!response.ok) {
    let message = 'Failed to add collaborator';
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
  collaboratorId: string,
  role: BoardRole,
  token?: string
): Promise<CollaboratorInfo> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetchWithAuth(`/api/v1/whiteboards/${id}/collaborators/${collaboratorId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ role }),
  });
  if (!response.ok) {
    let message = 'Failed to update collaborator role';
    try {
      const errorData = await response.json();
      if (errorData?.error) message = errorData.error;
    } catch {}
    throw new Error(message);
  }
  return response.json();
}

export async function removeCollaborator(
  id: string,
  collaboratorId: string,
  token?: string
): Promise<void> {
  const options: RequestInit = { method: 'DELETE' };
  if (token) options.headers = { Authorization: `Bearer ${token}` };
  const response = await fetchWithAuth(`/api/v1/whiteboards/${id}/collaborators/${collaboratorId}`, options);
  if (!response.ok) {
    let message = 'Failed to remove collaborator';
    try {
      const errorData = await response.json();
      if (errorData?.error) message = errorData.error;
    } catch {}
    throw new Error(message);
  }
}

// Access Requests API
export async function requestAccess(
  id: string,
  role: BoardRole = 'VIEWER',
  message?: string,
  token?: string
): Promise<AccessRequest> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetchWithAuth(`/api/v1/whiteboards/${id}/access-requests`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ requestedRole: role, message }),
  });
  if (!response.ok) {
    let errorMsg = 'Failed to request access';
    try {
      const errorData = await response.json();
      if (errorData?.error) errorMsg = errorData.error;
    } catch {}
    throw new Error(errorMsg);
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
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    return null;
  }
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
    body: JSON.stringify(role ? { role } : {}),
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

// Assets API
export interface AssetUploadResponse {
  assetId: string;
  url: string;
  contentType: string;
  size: number;
}

export async function uploadWhiteboardAsset(
  boardId: string,
  file: File,
  token?: string
): Promise<AssetUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const options: RequestInit = {
    method: 'POST',
    body: formData,
  };
  if (token) {
    options.headers = { Authorization: `Bearer ${token}` };
  }

  const response = await fetchWithAuth(`/api/v1/whiteboards/${boardId}/assets`, options);
  if (response.status === 401) {
    throw new Error('Unauthorized');
  }
  if (!response.ok) {
    let errorMsg = 'Failed to upload asset';
    try {
      const body = await response.json();
      if (body.error) errorMsg = body.error;
    } catch {}
    const error: any = new Error(errorMsg);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export async function deleteWhiteboardAsset(
  boardId: string,
  assetId: string,
  token?: string
): Promise<void> {
  const options: RequestInit = {
    method: 'DELETE',
  };
  if (token) {
    options.headers = { Authorization: `Bearer ${token}` };
  }

  const response = await fetchWithAuth(`/api/v1/whiteboards/${boardId}/assets/${assetId}`, options);
  if (response.status === 401) {
    throw new Error('Unauthorized');
  }
  if (!response.ok) {
    throw new Error('Failed to delete asset');
  }
}

// Version History & Revisions API
export interface WhiteboardSnapshot {
  id: string;
  whiteboardId: string;
  name?: string | null;
  description?: string | null;
  isAutomatic: boolean;
  isGeneratedByAI?: boolean;
  content?: any;
  createdBy: string;
  createdAt?: string;
}

export interface WhiteboardSnapshotSummary {
  id: string;
  whiteboardId: string;
  name?: string | null;
  description?: string | null;
  isAutomatic: boolean;
  isGeneratedByAI?: boolean;
  createdBy: string;
  createdAt?: string;
}

export interface CreateSnapshotRequest {
  name?: string;
  description?: string;
  isGeneratedByAI?: boolean;
}

export interface ForkSnapshotRequest {
  name: string;
}

export async function listSnapshots(
  boardId: string,
  start?: number,
  max?: number,
  token?: string
): Promise<WhiteboardSnapshotSummary[]> {
  const options: RequestInit = {};
  if (token) {
    options.headers = { Authorization: `Bearer ${token}` };
  }
  const params = new URLSearchParams();
  if (start !== undefined && start !== null) params.set('start', start.toString());
  if (max !== undefined && max !== null) params.set('max', max.toString());
  const queryString = params.toString() ? `?${params.toString()}` : '';

  const response = await fetchWithAuth(`/api/v1/whiteboards/${boardId}/history${queryString}`, options);
  if (response.status === 401) throw new Error('Unauthorized');
  if (response.status === 403) {
    const error: any = new Error('Feature not entitled or forbidden');
    error.status = 403;
    throw error;
  }
  if (!response.ok) {
    let errorMsg = 'Failed to load snapshots';
    try {
      const body = await response.json();
      if (body.error) errorMsg = body.error;
    } catch {}
    const error: any = new Error(errorMsg);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export async function createSnapshot(
  boardId: string,
  request: CreateSnapshotRequest,
  token?: string
): Promise<WhiteboardSnapshot> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetchWithAuth(`/api/v1/whiteboards/${boardId}/history`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });
  if (response.status === 401) throw new Error('Unauthorized');
  if (response.status === 403) {
    const error: any = new Error('Forbidden');
    error.status = 403;
    throw error;
  }
  if (!response.ok) {
    let errorMsg = 'Failed to create snapshot';
    try {
      const body = await response.json();
      if (body.error) errorMsg = body.error;
    } catch {}
    const error: any = new Error(errorMsg);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export async function getSnapshot(
  boardId: string,
  snapshotId: string,
  token?: string
): Promise<WhiteboardSnapshot> {
  const options: RequestInit = {};
  if (token) {
    options.headers = { Authorization: `Bearer ${token}` };
  }

  const response = await fetchWithAuth(`/api/v1/whiteboards/${boardId}/history/${snapshotId}`, options);
  if (response.status === 401) throw new Error('Unauthorized');
  if (!response.ok) {
    let errorMsg = 'Failed to get snapshot';
    try {
      const body = await response.json();
      if (body.error) errorMsg = body.error;
    } catch {}
    const error: any = new Error(errorMsg);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export async function restoreSnapshot(
  boardId: string,
  snapshotId: string,
  token?: string
): Promise<Whiteboard> {
  const options: RequestInit = {
    method: 'POST',
  };
  if (token) {
    options.headers = { Authorization: `Bearer ${token}` };
  }

  const response = await fetchWithAuth(`/api/v1/whiteboards/${boardId}/history/${snapshotId}/restore`, options);
  if (response.status === 401) throw new Error('Unauthorized');
  if (response.status === 403) {
    const error: any = new Error('Forbidden');
    error.status = 403;
    throw error;
  }
  if (!response.ok) {
    let errorMsg = 'Failed to restore snapshot';
    try {
      const body = await response.json();
      if (body.error) errorMsg = body.error;
    } catch {}
    const error: any = new Error(errorMsg);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export async function forkSnapshot(
  boardId: string,
  snapshotId: string,
  request: ForkSnapshotRequest,
  token?: string
): Promise<Whiteboard> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetchWithAuth(`/api/v1/whiteboards/${boardId}/history/${snapshotId}/fork`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });
  if (response.status === 401) throw new Error('Unauthorized');
  if (response.status === 403) {
    const error: any = new Error('Forbidden');
    error.status = 403;
    throw error;
  }
  if (!response.ok) {
    let errorMsg = 'Failed to fork snapshot';
    try {
      const body = await response.json();
      if (body.error) errorMsg = body.error;
    } catch {}
    const error: any = new Error(errorMsg);
    error.status = response.status;
    throw error;
  }
  return response.json();
}
