import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useEntitlements, notifyLicenseUpdated } from '@/lib/entitlementContext';
import * as api from '@/lib/api';
import {
  CreditCard,
  CheckCircle2,
  Sparkles,
  Shield,
  X,
  Loader2,
  Check,
  Receipt,
  Lock,
  ArrowRight,
} from 'lucide-react';

interface MockCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlan?: api.LicensePlan;
  onSuccess?: (receipt: api.MockCheckoutResponse) => void;
}

export const MockCheckoutModal: React.FC<MockCheckoutModalProps> = ({
  isOpen,
  onClose,
  initialPlan = 'PRO',
  onSuccess,
}) => {
  const { user, token } = useAuth();
  const { refreshEntitlements } = useEntitlements();

  const [selectedPlan, setSelectedPlan] = useState<api.LicensePlan>(
    initialPlan === 'FREE' ? 'PRO' : initialPlan
  );
  const [billingInterval, setBillingInterval] = useState<api.BillingInterval>('MONTHLY');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');
  const [cardholderName, setCardholderName] = useState(
    user?.profile.name || user?.profile.preferred_username || 'Test Customer'
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedReceipt, setCompletedReceipt] = useState<api.MockCheckoutResponse | null>(null);

  if (!isOpen) return null;

  const planPrices: Record<api.LicensePlan, { monthly: number; yearly: number }> = {
    FREE: { monthly: 0, yearly: 0 },
    PRO: { monthly: 12, yearly: 120 },
    TEAM: { monthly: 29, yearly: 290 },
    ENTERPRISE: { monthly: 49, yearly: 490 },
  };

  const currentPrice =
    billingInterval === 'YEARLY'
      ? planPrices[selectedPlan].yearly
      : planPrices[selectedPlan].monthly;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const response = await api.processMockCheckout(
        {
          plan: selectedPlan,
          billingInterval,
          paymentMethod: `Mock Visa (•••• ${cardNumber.slice(-4)})`,
          cardholderName: cardholderName.trim(),
        },
        token || undefined
      );

      setCompletedReceipt(response);
      notifyLicenseUpdated(user?.profile?.sub);
      await refreshEntitlements(true);

      if (onSuccess) {
        onSuccess(response);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment simulation failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setCompletedReceipt(null);
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {completedReceipt ? 'Payment Receipt' : 'Upgrade Subscription'}
              </h2>
              <p className="text-xs text-slate-500">
                {completedReceipt ? 'Transaction completed successfully' : 'Instant mock checkout & licensing'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        {completedReceipt ? (
          <div className="p-6 space-y-5">
            <div className="flex flex-col items-center justify-center text-center space-y-2 py-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Subscription Activated!</h3>
              <p className="text-xs text-slate-500 max-w-xs">
                Your account is now upgraded to <strong className="text-slate-800">{completedReceipt.plan}</strong>. All features and quotas are available immediately.
              </p>
            </div>

            {/* Receipt Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Receipt #</span>
                <span className="font-mono font-semibold text-slate-800">{completedReceipt.receiptNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Plan Tier</span>
                <span className="font-semibold text-blue-600">{completedReceipt.plan}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Billing Cycle</span>
                <span className="capitalize text-slate-700">{completedReceipt.billingInterval.toLowerCase()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Amount Paid</span>
                <span className="font-bold text-slate-900">
                  ${(completedReceipt.amountCents / 100).toFixed(2)} {completedReceipt.currency}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                  <Check className="h-3 w-3" /> Paid & Active
                </span>
              </div>
              {completedReceipt.validUntil && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/80">
                  <span className="text-slate-500">Valid Until</span>
                  <span className="text-slate-700">{new Date(completedReceipt.validUntil).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-all cursor-pointer"
              >
                Continue to Whiteboard
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCheckout} className="p-6 space-y-5">
            {/* Plan Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-700">Choose Plan</label>
                {/* Billing Interval Toggle */}
                <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 text-[11px] font-medium text-slate-600">
                  <button
                    type="button"
                    onClick={() => setBillingInterval('MONTHLY')}
                    className={`rounded-md px-2 py-0.5 transition-colors cursor-pointer ${
                      billingInterval === 'MONTHLY' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingInterval('YEARLY')}
                    className={`rounded-md px-2 py-0.5 transition-colors cursor-pointer flex items-center gap-1 ${
                      billingInterval === 'YEARLY' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
                    }`}
                  >
                    Annual
                    <span className="rounded-full bg-emerald-100 px-1 py-0.2 text-[9px] font-bold text-emerald-700">
                      -17%
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedPlan('PRO')}
                  className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                    selectedPlan === 'PRO'
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                      Pro
                    </span>
                    <span className="text-xs font-extrabold text-blue-600">
                      ${billingInterval === 'YEARLY' ? '120/yr' : '12/mo'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Unlimited whiteboards, 1,000 monthly AI credits & export.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPlan('ENTERPRISE')}
                  className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                    selectedPlan === 'ENTERPRISE'
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                      <Shield className="h-3.5 w-3.5 text-purple-600" />
                      Enterprise
                    </span>
                    <span className="text-xs font-extrabold text-purple-600">
                      ${billingInterval === 'YEARLY' ? '490/yr' : '49/mo'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Unlimited collaborators, 50,000 AI credits & audit logs.
                  </p>
                </button>
              </div>
            </div>

            {/* Mock Card Form */}
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                  <Lock className="h-3 w-3 text-slate-400" />
                  Mock Payment Method
                </span>
                <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                  Simulated Gateway
                </span>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Card Number</label>
                <div className="relative">
                  <CreditCard className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4242 •••• •••• 4242"
                    className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Expires</label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    placeholder="MM/YY"
                    className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">CVC</label>
                  <input
                    type="text"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    placeholder="CVC"
                    className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Cardholder Name</label>
                <input
                  type="text"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  placeholder="Cardholder Name"
                  className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-700">
                {errorMessage}
              </div>
            )}

            {/* Total and Submit */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div>
                <span className="text-[11px] text-slate-500">Total Due Today:</span>
                <div className="text-base font-extrabold text-slate-900">${currentPrice}.00 USD</div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isProcessing}
                  className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3" />
                      Pay ${currentPrice}.00 & Upgrade
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default MockCheckoutModal;
