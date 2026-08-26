import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useEntitlements } from '@/lib/entitlementContext';
import * as api from '@/lib/api';
import {
  User,
  Shield,
  Award,
  X,
  Mail,
  CheckCircle,
  AlertCircle,
  Key,
  Lock,
  Sparkles,
  Save,
  Loader2,
  ExternalLink,
} from 'lucide-react';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'profile' | 'license';
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'profile',
}) => {
  const { user, token, triggerPasswordReset, triggerEmailChange } = useAuth();
  const {
    plan,
    isExpired,
    validUntil,
    getQuota,
    activateKey,
    deactivateKey,
  } = useEntitlements();

  const [activeTab, setActiveTab] = useState<'profile' | 'license'>(initialTab);

  // Profile state
  const [profile, setProfile] = useState<api.UserProfile | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMessage, setProfileSuccessMessage] = useState<string | null>(null);
  const [profileErrorMessage, setProfileErrorMessage] = useState<string | null>(null);

  // License state
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [isSubmittingLicense, setIsSubmittingLicense] = useState(false);
  const [licenseErrorMessage, setLicenseErrorMessage] = useState<string | null>(null);
  const [licenseSuccessMessage, setLicenseSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      loadUserProfile();
    }
  }, [isOpen, initialTab]);

  const loadUserProfile = async () => {
    setIsLoadingProfile(true);
    setProfileErrorMessage(null);
    try {
      const data = await api.getUserProfile(token || undefined);
      setProfile(data);
      setFirstName(data.firstName || '');
      setLastName(data.lastName || '');
    } catch (err: any) {
      setProfileErrorMessage(err.message || 'Failed to load user profile');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccessMessage(null);
    setProfileErrorMessage(null);

    try {
      const updated = await api.updateUserProfile(
        { firstName: firstName.trim(), lastName: lastName.trim() },
        token || undefined
      );
      setProfile(updated);
      setFirstName(updated.firstName || '');
      setLastName(updated.lastName || '');
      setProfileSuccessMessage('Profile updated successfully!');
      setTimeout(() => setProfileSuccessMessage(null), 4000);
    } catch (err: any) {
      setProfileErrorMessage(err.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleActivateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKeyInput.trim()) return;

    setIsSubmittingLicense(true);
    setLicenseErrorMessage(null);
    setLicenseSuccessMessage(null);

    try {
      await activateKey(licenseKeyInput.trim());
      setLicenseSuccessMessage('License successfully activated!');
      setLicenseKeyInput('');
    } catch (err: any) {
      setLicenseErrorMessage(err.message || 'Failed to activate license key.');
    } finally {
      setIsSubmittingLicense(false);
    }
  };

  const handleDeactivateLicense = async () => {
    setIsSubmittingLicense(true);
    setLicenseErrorMessage(null);
    setLicenseSuccessMessage(null);
    try {
      await deactivateKey();
      setLicenseSuccessMessage('License deactivated. Reset to default Free plan.');
    } catch (err: any) {
      setLicenseErrorMessage(err.message || 'Failed to deactivate license.');
    } finally {
      setIsSubmittingLicense(false);
    }
  };

  if (!isOpen) return null;

  const whiteboardsQuota = getQuota('whiteboards');
  const collaboratorsQuota = getQuota('collaborators_per_board');
  const aiCreditsQuota = getQuota('ai:monthly_credits');

  const displayName = profile?.firstName || profile?.lastName
    ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
    : user?.profile.name || user?.profile.preferred_username || user?.profile.email || 'User';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl text-slate-900 flex flex-col max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold uppercase text-sm">
            {displayName.slice(0, 2)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{displayName}</h2>
            <p className="text-xs text-slate-500">{profile?.email || user?.profile.email || ''}</p>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex border-b border-slate-200 mb-5 gap-4">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 transition-colors border-b-2 -mb-px cursor-pointer ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <User className="h-4 w-4" />
            Profile & Security
          </button>
          <button
            onClick={() => setActiveTab('license')}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 transition-colors border-b-2 -mb-px cursor-pointer ${
              activeTab === 'license'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Award className="h-4 w-4" />
            License & Subscription
          </button>
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto pr-1 flex-1 space-y-4">
          {activeTab === 'profile' && (
            <div className="space-y-5">
              {isLoadingProfile && !profile ? (
                <div className="flex items-center justify-center py-8 text-slate-400 text-xs">
                  <Loader2 className="h-5 w-5 animate-spin mr-2 text-blue-600" />
                  Loading account details...
                </div>
              ) : (
                <>
                  {/* Account Metadata Overview */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Email</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-800 font-medium">{profile?.email || user?.profile.email}</span>
                        {profile?.emailVerified ? (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded-full font-medium">
                            <CheckCircle className="h-3 w-3" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded-full font-medium">
                            <AlertCircle className="h-3 w-3" /> Unverified
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <button
                          type="button"
                          onClick={() => triggerEmailChange()}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-xs cursor-pointer"
                        >
                          <Mail className="h-3.5 w-3.5 text-blue-600" />
                          Change Email
                          <ExternalLink className="h-3 w-3 text-slate-400 ml-0.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Password</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-slate-800">
                        <button
                          type="button"
                          onClick={() => triggerPasswordReset()}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-xs cursor-pointer"
                        >
                          <Lock className="h-3.5 w-3.5 text-blue-600" />
                          Change Password
                          <ExternalLink className="h-3 w-3 text-slate-400 ml-0.5" />
                        </button>
                      </span>
                    </div>
                  </div>

                  {/* Profile Edit Form */}
                  <form onSubmit={handleSaveProfile} className="space-y-3">
                    <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Edit Profile
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="firstName" className="block text-xs font-medium text-slate-600 mb-1">
                          First Name
                        </label>
                        <input
                          id="firstName"
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="First Name"
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden transition-colors"
                        />
                      </div>
                      <div>
                        <label htmlFor="lastName" className="block text-xs font-medium text-slate-600 mb-1">
                          Last Name
                        </label>
                        <input
                          id="lastName"
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Last Name"
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden transition-colors"
                        />
                      </div>
                    </div>

                    {profileErrorMessage && (
                      <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-700">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{profileErrorMessage}</span>
                      </div>
                    )}

                    {profileSuccessMessage && (
                      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-700">
                        <CheckCircle className="h-4 w-4 shrink-0" />
                        <span>{profileSuccessMessage}</span>
                      </div>
                    )}

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={isSavingProfile}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                      >
                        {isSavingProfile ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-3.5 w-3.5" />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          )}

          {activeTab === 'license' && (
            <div className="space-y-5">
              {/* Current Plan Overview */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-slate-500">Current Tier</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                    <Sparkles className="h-3 w-3" />
                    {plan} {isExpired ? '(Expired)' : ''}
                  </span>
                </div>
                {validUntil && (
                  <p className="text-xs text-slate-500 mb-2">
                    Valid until: {new Date(validUntil).toLocaleDateString()}
                  </p>
                )}

                {/* Quota Progress Bars */}
                <div className="space-y-3 pt-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-700">Whiteboards</span>
                      <span className="text-slate-500">
                        {whiteboardsQuota.isUnlimited ? 'Unlimited' : `${whiteboardsQuota.current} / ${whiteboardsQuota.limit}`}
                      </span>
                    </div>
                    {!whiteboardsQuota.isUnlimited && (
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${Math.min(100, (whiteboardsQuota.current / (whiteboardsQuota.limit || 1)) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-700">Collaborators per Board</span>
                      <span className="text-slate-500">
                        {collaboratorsQuota.isUnlimited ? 'Unlimited' : `Up to ${collaboratorsQuota.limit}`}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-700">Monthly AI Credits</span>
                      <span className="text-slate-500">
                        {aiCreditsQuota.isUnlimited ? 'Unlimited' : `${aiCreditsQuota.current} / ${aiCreditsQuota.limit} used`}
                      </span>
                    </div>
                    {!aiCreditsQuota.isUnlimited && (
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
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
              <form onSubmit={handleActivateLicense} className="space-y-4">
                <div>
                  <label htmlFor="license-key" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Activate License Key
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      id="license-key"
                      type="text"
                      placeholder="Paste signed license token..."
                      value={licenseKeyInput}
                      onChange={(e) => setLicenseKeyInput(e.target.value)}
                      disabled={isSubmittingLicense}
                      className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden transition-colors"
                    />
                  </div>
                </div>

                {licenseErrorMessage && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{licenseErrorMessage}</span>
                  </div>
                )}

                {licenseSuccessMessage && (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-700">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <span>{licenseSuccessMessage}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  {plan !== 'FREE' ? (
                    <button
                      type="button"
                      onClick={handleDeactivateLicense}
                      disabled={isSubmittingLicense}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Reset to Free
                    </button>
                  ) : <div />}

                  <button
                    type="submit"
                    disabled={isSubmittingLicense || !licenseKeyInput.trim()}
                    className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                  >
                    {isSubmittingLicense ? 'Activating...' : 'Activate Key'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-4 mt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
