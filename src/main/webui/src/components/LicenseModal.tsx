import React, { useState } from 'react';
import { useEntitlements } from '@/lib/entitlementContext';
import { Award, CheckCircle, AlertCircle, X, Sparkles, Key } from 'lucide-react';

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LicenseModal: React.FC<LicenseModalProps> = ({ isOpen, onClose }) => {
  const { plan, isExpired, validUntil, getQuota, hasFeature, activateKey, deactivateKey, loading } = useEntitlements();
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const whiteboardsQuota = getQuota('whiteboards');
  const collaboratorsQuota = getQuota('collaborators_per_board');
  const aiCreditsQuota = getQuota('ai:monthly_credits');

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKeyInput.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await activateKey(licenseKeyInput.trim());
      setSuccessMessage('License successfully activated!');
      setLicenseKeyInput('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to activate license key.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await deactivateKey();
      setSuccessMessage('License deactivated. Reset to default Free plan.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to deactivate license.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Subscription & Entitlements</h2>
            <p className="text-xs text-slate-400">Manage plan quotas, feature capabilities, and offline license keys</p>
          </div>
        </div>

        {/* Current Plan Overview */}
        <div className="mb-6 rounded-lg border border-slate-700/80 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Current Tier</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-0.5 text-xs font-semibold text-indigo-300">
              <Sparkles className="h-3 w-3" />
              {plan} {isExpired ? '(Expired)' : ''}
            </span>
          </div>
          {validUntil && (
            <p className="text-xs text-slate-400 mb-2">
              Valid until: {new Date(validUntil).toLocaleDateString()}
            </p>
          )}

          {/* Quota Progress Bars */}
          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Whiteboards</span>
                <span className="text-slate-400">
                  {whiteboardsQuota.isUnlimited ? 'Unlimited' : `${whiteboardsQuota.current} / ${whiteboardsQuota.limit}`}
                </span>
              </div>
              {!whiteboardsQuota.isUnlimited && (
                <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${Math.min(100, (whiteboardsQuota.current / (whiteboardsQuota.limit || 1)) * 100)}%` }}
                  />
                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Collaborators per Board</span>
                <span className="text-slate-400">
                  {collaboratorsQuota.isUnlimited ? 'Unlimited' : `Up to ${collaboratorsQuota.limit}`}
                </span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Monthly AI Credits</span>
                <span className="text-slate-400">
                  {aiCreditsQuota.isUnlimited ? 'Unlimited' : `${aiCreditsQuota.current} / ${aiCreditsQuota.limit} used`}
                </span>
              </div>
              {!aiCreditsQuota.isUnlimited && aiCreditsQuota.limit !== null && aiCreditsQuota.limit > 0 && (
                <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 rounded-full"
                    style={{ width: `${Math.min(100, (aiCreditsQuota.current / (aiCreditsQuota.limit || 1)) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Activate Key Form */}
        <form onSubmit={handleActivate} className="space-y-4">
          <div>
            <label htmlFor="license-key" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Activate License Key
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                id="license-key"
                type="text"
                placeholder="Paste signed license token..."
                value={licenseKeyInput}
                onChange={(e) => setLicenseKeyInput(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-red-900/30 border border-red-700/50 p-2.5 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-900/30 border border-emerald-700/50 p-2.5 text-xs text-emerald-300">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            {plan !== 'FREE' ? (
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={isSubmitting}
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700/50 transition-colors"
              >
                Reset to Free
              </button>
            ) : <div />}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !licenseKeyInput.trim()}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Activating...' : 'Activate Key'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
