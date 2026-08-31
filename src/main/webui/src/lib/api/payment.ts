import { fetchWithAuth } from './client';
import { LicensePlan, BillingInterval } from './license';

export type PaymentStatus = 'SUCCEEDED' | 'FAILED' | 'REFUNDED';

export interface QuotaDefinition {
  limit: number;
  period: string;
  allowOverage?: boolean;
}

export interface PlanPricing {
  plan: LicensePlan;
  name: string;
  description: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  currency: string;
  features: Record<string, boolean>;
  quotas: Record<string, QuotaDefinition>;
  popular?: boolean;
}

export interface MockCheckoutRequest {
  plan: LicensePlan;
  billingInterval?: BillingInterval;
  paymentMethod?: string;
  cardholderName?: string;
}

export interface MockCheckoutResponse {
  transactionId: string;
  receiptNumber: string;
  plan: LicensePlan;
  billingInterval: BillingInterval;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  validUntil: string | null;
  createdAt: string;
  message: string;
}

export interface PaymentTransaction {
  id: string;
  plan: LicensePlan;
  billingInterval: BillingInterval;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: string;
  receiptNumber: string;
  licenseId?: string;
  createdAt: string;
}

export async function getPaymentPlans(token?: string): Promise<PlanPricing[]> {
  const options: RequestInit = {};
  if (token) options.headers = { Authorization: `Bearer ${token}` };
  const response = await fetchWithAuth('/api/v1/payment/plans', options);
  if (!response.ok) {
    throw new Error('Failed to fetch payment plans');
  }
  return response.json();
}

export async function processMockCheckout(
  data: MockCheckoutRequest,
  token?: string
): Promise<MockCheckoutResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetchWithAuth('/api/v1/payment/checkout', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Payment processing failed');
  }
  return response.json();
}

export async function getPaymentHistory(token?: string): Promise<PaymentTransaction[]> {
  const options: RequestInit = {};
  if (token) options.headers = { Authorization: `Bearer ${token}` };
  const response = await fetchWithAuth('/api/v1/payment/history', options);
  if (!response.ok) {
    throw new Error('Failed to fetch payment history');
  }
  return response.json();
}
