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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl text-slate-900 dark:text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Subscription & Entitlements</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Manage plan quotas, feature capabilities, and offline license keys</p>
          </div>
        </div>

        {/* Current Plan Overview */}
        <div className="mb-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500 dark:text-slate-400">Current Tier</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 px-3 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
              <Sparkles className="h-3 w-3" />
              {plan} {isExpired ? '(Expired)' : ''}
            </span>
          </div>
          {validUntil && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Valid until: {new Date(validUntil).toLocaleDateString()}
            </p>
          )}

          {/* Quota Progress Bars */}
          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-700 dark:text-slate-300">Whiteboards</span>
                <span className="text-slate-500 dark:text-slate-400">
                  {whiteboardsQuota.isUnlimited ? 'Unlimited' : `${whiteboardsQuota.current} / ${whiteboardsQuota.limit}`}
                </span>
              </div>
              {!whiteboardsQuota.isUnlimited && (
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${Math.min(100, (whiteboardsQuota.current / (whiteboardsQuota.limit || 1)) * 100)}%` }}
                  />
                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-700 dark:text-slate-300">Collaborators per Board</span>
                <span className="text-slate-500 dark:text-slate-400">
                  {collaboratorsQuota.isUnlimited ? 'Unlimited' : `Up to ${collaboratorsQuota.limit}`}
                </span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-700 dark:text-slate-300">Monthly AI Credits</span>
                <span className="text-slate-500 dark:text-slate-400">
                  {aiCreditsQuota.isUnlimited ? 'Unlimited' : `${aiCreditsQuota.current} / ${aiCreditsQuota.limit} used`}
                </span>
              </div>
              {!aiCreditsQuota.isUnlimited && aiCreditsQuota.limit !== null && aiCreditsQuota.limit > 0 && (
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
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
            <label htmlFor="license-key" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Activate License Key
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input
                id="license-key"
                type="text"
                placeholder="Paste signed license token..."
                value={licenseKeyInput}
                onChange={(e) => setLicenseKeyInput(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:outline-hidden transition-colors"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-2.5 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-2.5 text-xs text-emerald-700 dark:text-emerald-300">
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
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Reset to Free
              </button>
            ) : <div />}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !licenseKeyInput.trim()}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
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
