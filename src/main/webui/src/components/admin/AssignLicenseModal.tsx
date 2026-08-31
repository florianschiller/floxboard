import React from 'react';
import * as api from '@/lib/api';
import {
  X,
  AlertCircle,
  Award,
  Sparkles,
  Zap,
  Crown,
  Trash2,
  Check,
  Loader2,
} from 'lucide-react';

export interface AssignLicenseModalProps {
  isOpen: boolean;
  selectedUser: api.AdminUser | null;
  selectedPlan: api.LicensePlan;
  onSelectPlan: (plan: api.LicensePlan) => void;
  expiryOption: '30d' | '90d' | '1y' | 'lifetime' | 'custom';
  onSelectExpiryOption: (option: '30d' | '90d' | '1y' | 'lifetime' | 'custom') => void;
  customDate: string;
  onCustomDateChange: (date: string) => void;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onRevoke: () => void;
}

export const AssignLicenseModal: React.FC<AssignLicenseModalProps> = ({
  isOpen,
  selectedUser,
  selectedPlan,
  onSelectPlan,
  expiryOption,
  onSelectExpiryOption,
  customDate,
  onCustomDateChange,
  isSubmitting,
  error,
  onClose,
  onSubmit,
  onRevoke,
}) => {
  if (!isOpen || !selectedUser) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Assign License</h3>
              <p className="text-xs text-slate-500">
                Grant subscription tiers and feature entitlements for{' '}
                <span className="font-semibold text-slate-700">{selectedUser.email}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* User info overview */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                Target User ID
              </span>
              <span className="font-mono text-slate-700">{selectedUser.id}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                Current Plan
              </span>
              <span className="font-bold text-blue-600">
                {selectedUser.license?.plan || 'FREE'}
              </span>
            </div>
          </div>

          {/* Plan selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Select Subscription Plan
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {/* FREE */}
              <label
                className={`border rounded-xl p-3 cursor-pointer transition-all flex flex-col justify-between ${
                  selectedPlan === 'FREE'
                    ? 'border-slate-800 bg-slate-50 ring-1 ring-slate-800'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1">
                    <Award className="h-3 w-3 text-slate-600" />
                    <span className="text-xs font-bold text-slate-900">FREE</span>
                  </div>
                  <input
                    type="radio"
                    name="plan"
                    value="FREE"
                    checked={selectedPlan === 'FREE'}
                    onChange={() => onSelectPlan('FREE')}
                    className="text-slate-900"
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Standard tier, 3 whiteboards, basic AI tools (50 credits/mo).
                </p>
              </label>

              {/* PRO */}
              <label
                className={`border rounded-xl p-3 cursor-pointer transition-all flex flex-col justify-between ${
                  selectedPlan === 'PRO'
                    ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-blue-600" />
                    <span className="text-xs font-bold text-slate-900">PRO</span>
                  </div>
                  <input
                    type="radio"
                    name="plan"
                    value="PRO"
                    checked={selectedPlan === 'PRO'}
                    onChange={() => onSelectPlan('PRO')}
                    className="text-blue-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Unlimited whiteboards, high-resolution export, 200 AI credits.
                </p>
              </label>

              {/* TEAM */}
              <label
                className={`border rounded-xl p-3 cursor-pointer transition-all flex flex-col justify-between ${
                  selectedPlan === 'TEAM'
                    ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-900">TEAM</span>
                  </div>
                  <input
                    type="radio"
                    name="plan"
                    value="TEAM"
                    checked={selectedPlan === 'TEAM'}
                    onChange={() => onSelectPlan('TEAM')}
                    className="text-indigo-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Unlimited collaborators, team workspaces, 500 AI credits.
                </p>
              </label>

              {/* ENTERPRISE */}
              <label
                className={`border rounded-xl p-3 cursor-pointer transition-all flex flex-col justify-between ${
                  selectedPlan === 'ENTERPRISE'
                    ? 'border-amber-600 bg-amber-50/50 ring-1 ring-amber-600'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1">
                    <Crown className="h-3 w-3 text-amber-600" />
                    <span className="text-xs font-bold text-slate-900">ENTERPRISE</span>
                  </div>
                  <input
                    type="radio"
                    name="plan"
                    value="ENTERPRISE"
                    checked={selectedPlan === 'ENTERPRISE'}
                    onChange={() => onSelectPlan('ENTERPRISE')}
                    className="text-amber-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Unlimited AI credits, dedicated support, custom domain security.
                </p>
              </label>
            </div>
          </div>

          {/* Expiry Options (Only when not FREE) */}
          {selectedPlan !== 'FREE' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                License Duration & Expiration
              </label>
              <div className="grid grid-cols-4 gap-2 mb-2.5">
                {[
                  { id: '30d', label: '30 Days' },
                  { id: '90d', label: '90 Days' },
                  { id: '1y', label: '1 Year' },
                  { id: 'lifetime', label: 'Lifetime' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onSelectExpiryOption(opt.id as any)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      expiryOption === opt.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => onSelectExpiryOption('custom')}
                  className={`py-1 px-2.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    expiryOption === 'custom'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Custom Date
                </button>
                {expiryOption === 'custom' && (
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => onCustomDateChange(e.target.value)}
                    className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 bg-white focus:outline-hidden focus:border-blue-500 flex-1"
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            {selectedUser.license && selectedUser.license.plan !== 'FREE' ? (
              <button
                type="button"
                onClick={onRevoke}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg border border-red-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Revoke License
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Assign License
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
