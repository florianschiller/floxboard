import { fetchWithAuth } from './client';

export type AiDiagramCategory = 'FLOWCHART' | 'ARCHITECTURE' | 'MINDMAP' | 'SEQUENCE' | 'GENERAL';
export type AiLayoutDirection = 'HORIZONTAL' | 'VERTICAL';

export interface AiDiagramRequest {
  prompt: string;
  category?: AiDiagramCategory;
  layoutDirection?: AiLayoutDirection;
  whiteboardId?: string;
  theme?: string;
}

export interface AiDiagramResponse {
  success: boolean;
  doc: any;
  shapeCount: number;
  connectorCount: number;
  creditsConsumed: number;
  remainingCredits: number;
  summary?: string;
}

export interface AiCreditEstimateRequest {
  prompt: string;
  category?: string;
}

export interface AiCreditEstimateResponse {
  estimatedCredits: number;
  remainingCredits: number;
  isAllowed: boolean;
}

export interface AiQuotaBalanceResponse {
  currentUsage: number;
  limit: number | null;
  remaining: number | null;
  isUnlimited: boolean;
}

export async function generateDiagramFromPrompt(request: AiDiagramRequest): Promise<AiDiagramResponse> {
  const response = await fetchWithAuth('/api/v1/ai/text-to-diagram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `Failed to generate diagram (${response.status})`);
  }

  return response.json();
}

export async function estimateAiCredits(request: AiCreditEstimateRequest): Promise<AiCreditEstimateResponse> {
  const response = await fetchWithAuth('/api/v1/ai/credits/estimate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `Failed to estimate credits (${response.status})`);
  }

  return response.json();
}

export async function fetchAiQuotaBalance(): Promise<AiQuotaBalanceResponse> {
  const response = await fetchWithAuth('/api/v1/ai/credits/balance');

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `Failed to fetch AI quota balance (${response.status})`);
  }

  return response.json();
}
