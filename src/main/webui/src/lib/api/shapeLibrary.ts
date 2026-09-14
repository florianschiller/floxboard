import { fetchWithAuth } from './client';
import {
  ShapeLibraryDetailDto,
  CreateShapeLibraryRequest,
  UpdateShapeLibraryRequest,
  CreateShapeStencilRequest,
  ShapeStencilDto
} from '../../types/shapeLibrary';

export async function listShapeLibraries(token?: string): Promise<ShapeLibraryDetailDto[]> {
  const options: RequestInit = {};
  if (token) {
    options.headers = { Authorization: `Bearer ${token}` };
  }
  const response = await fetchWithAuth('/api/v1/shape-libraries', options);
  if (response.status === 401) {
    throw new Error('Unauthorized');
  }
  if (!response.ok) {
    throw new Error('Failed to list shape libraries');
  }
  return response.json();
}

export async function getShapeLibrary(id: string, token?: string): Promise<ShapeLibraryDetailDto> {
  const options: RequestInit = {};
  if (token) {
    options.headers = { Authorization: `Bearer ${token}` };
  }
  const response = await fetchWithAuth(`/api/v1/shape-libraries/${id}`, options);
  if (response.status === 401) {
    throw new Error('Unauthorized');
  }
  if (!response.ok) {
    const error: any = new Error('Failed to get shape library');
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export async function createShapeLibrary(
  data: CreateShapeLibraryRequest,
  token?: string
): Promise<ShapeLibraryDetailDto> {
  const options: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  };
  if (token) {
    options.headers = { ...options.headers, Authorization: `Bearer ${token}` };
  }
  const response = await fetchWithAuth('/api/v1/shape-libraries', options);
  if (response.status === 401) {
    throw new Error('Unauthorized');
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create shape library');
  }
  return response.json();
}

export async function updateShapeLibrary(
  id: string,
  data: UpdateShapeLibraryRequest,
  token?: string
): Promise<ShapeLibraryDetailDto> {
  const options: RequestInit = {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  };
  if (token) {
    options.headers = { ...options.headers, Authorization: `Bearer ${token}` };
  }
  const response = await fetchWithAuth(`/api/v1/shape-libraries/${id}`, options);
  if (response.status === 401) {
    throw new Error('Unauthorized');
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update shape library');
  }
  return response.json();
}

export async function deleteShapeLibrary(id: string, token?: string): Promise<void> {
  const options: RequestInit = {
    method: 'DELETE',
  };
  if (token) {
    options.headers = { Authorization: `Bearer ${token}` };
  }
  const response = await fetchWithAuth(`/api/v1/shape-libraries/${id}`, options);
  if (response.status === 401) {
    throw new Error('Unauthorized');
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete shape library');
  }
}

export async function createShapeStencil(
  libraryId: string,
  data: CreateShapeStencilRequest,
  token?: string
): Promise<ShapeStencilDto> {
  const options: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  };
  if (token) {
    options.headers = { ...options.headers, Authorization: `Bearer ${token}` };
  }
  const response = await fetchWithAuth(`/api/v1/shape-libraries/${libraryId}/stencils`, options);
  if (response.status === 401) {
    throw new Error('Unauthorized');
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create shape stencil');
  }
  return response.json();
}

export async function deleteShapeStencil(
  libraryId: string,
  stencilId: string,
  token?: string
): Promise<void> {
  const options: RequestInit = {
    method: 'DELETE',
  };
  if (token) {
    options.headers = { Authorization: `Bearer ${token}` };
  }
  const response = await fetchWithAuth(`/api/v1/shape-libraries/${libraryId}/stencils/${stencilId}`, options);
  if (response.status === 401) {
    throw new Error('Unauthorized');
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete shape stencil');
  }
}
