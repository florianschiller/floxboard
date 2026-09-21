import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useEntitlements } from '@/lib/entitlementContext';
import { useTheme } from '@/lib/themeContext';
import * as api from '@/lib/api';
import { AccountModal } from './AccountModal';
import { MockCheckoutModal } from './MockCheckoutModal';
import {
  User,
  Award,
  LogOut,
  ChevronDown,
  Sparkles,
  Shield,
  CreditCard,
  Building,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';

interface UserContextMenuProps {
  className?: string;
}

export const UserContextMenu: React.FC<UserContextMenuProps> = ({ className = '' }) => {
  const { user, logout } = useAuth();
  const { plan, refreshEntitlements } = useEntitlements();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'profile' | 'license'>('profile');

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      refreshEntitlements(true);
    }
  }, [isOpen, refreshEntitlements]);

  // Check admin and org-admin roles
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setIsOrgAdmin(false);
      return;
    }
    const profileRoles = (user.profile as any)?.realm_access?.roles || (user.profile as any)?.roles;
    if (Array.isArray(profileRoles)) {
      if (profileRoles.includes('admin')) {
        setIsAdmin(true);
        setIsOrgAdmin(true);
      }
      if (profileRoles.includes('org-admin')) {
        setIsOrgAdmin(true);
      }
    }

    api.getUserProfile(user.access_token).then((p) => {
      if (p.roles?.includes('admin')) {
        setIsAdmin(true);
        setIsOrgAdmin(true);
      }
      if (p.roles?.includes('org-admin')) {
        setIsOrgAdmin(true);
      }
    }).catch(() => {});

    api.getMyOrganizations(user.access_token).then((orgs) => {
      if (orgs && orgs.some((org) => org.role === 'ORG_ADMIN')) {
        setIsOrgAdmin(true);
      }
    }).catch(() => {
      api.getMyOrganization(undefined, user.access_token).then((org) => {
        if (org && org.role === 'ORG_ADMIN') {
          setIsOrgAdmin(true);
        }
      }).catch(() => {});
    });
  }, [user]);

  // Check URL query parameters for modal deep linking
  useEffect(() => {
    const modal = searchParams.get('modal');
    if (modal === 'account') {
      const tab = searchParams.get('tab');
      setModalInitialTab(tab === 'license' ? 'license' : 'profile');
      setIsAccountModalOpen(true);

      const newParams = new URLSearchParams(searchParams);
      newParams.delete('modal');
      newParams.delete('tab');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!user) return null;

  const displayName = user.profile.name || user.profile.preferred_username || user.profile.email || 'User';
  const email = user.profile.email || '';
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleOpenProfile = () => {
    setModalInitialTab('profile');
    setIsAccountModalOpen(true);
    setIsOpen(false);
  };

  const handleOpenLicense = () => {
    setModalInitialTab('license');
    setIsAccountModalOpen(true);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={menuRef}>
      {/* User Context Menu Trigger Pill */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2.5 rounded-full border border-slate-200 bg-white py-1 pl-1.5 pr-3 text-xs font-medium text-slate-800 hover:bg-slate-50 transition-all shadow-xs focus:outline-hidden cursor-pointer dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-[11px] text-white uppercase shadow-xs">
          {initials}
        </div>
        <span className="max-w-[120px] truncate font-medium">{displayName}</span>
        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-900/50">
          <Sparkles className="h-2.5 w-2.5" />
          {plan}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5 focus:outline-hidden z-50 animate-in fade-in zoom-in-95 dark:bg-slate-900 dark:border-slate-800 dark:ring-white/10">
          {/* User Identity Summary */}
          <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 mb-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-xs text-white uppercase">
                {initials}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{displayName}</p>
                {email && <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{email}</p>}
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">Subscription</span>
              <span className="font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                <Award className="h-3 w-3" />
                {plan} Plan
              </span>
            </div>
          </div>

          {/* Menu Actions */}
          <div className="space-y-0.5">
            {plan === 'FREE' && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsCheckoutModalOpen(true);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer font-semibold dark:text-blue-400 dark:hover:bg-blue-950/50"
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                Upgrade to Pro
              </button>
            )}

            <button
              onClick={handleOpenProfile}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <User className="h-3.5 w-3.5 text-slate-400" />
              Account & Profile
            </button>

            <button
              onClick={handleOpenLicense}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <Award className="h-3.5 w-3.5 text-slate-400" />
              License & Subscription
            </button>

            {isOrgAdmin && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/organization');
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer font-medium dark:text-indigo-400 dark:hover:bg-indigo-950/50"
              >
                <Building className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                Organization Management
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/admin');
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer font-medium dark:text-purple-400 dark:hover:bg-purple-950/50"
              >
                <Shield className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                Admin Console
              </button>
            )}

            {/* Theme Preference Switcher */}
            <div className="px-2.5 py-2 border-t border-slate-100 dark:border-slate-800 my-1">
              <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Theme
              </div>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-lg">
                <button
                  type="button"
                  data-testid="theme-option-light"
                  onClick={() => setTheme('light')}
                  className={`flex items-center justify-center gap-1.5 py-1 px-1.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    theme === 'light'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <Sun className="h-3 w-3 text-amber-500" />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  data-testid="theme-option-dark"
                  onClick={() => setTheme('dark')}
                  className={`flex items-center justify-center gap-1.5 py-1 px-1.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <Moon className="h-3 w-3 text-indigo-400" />
                  <span>Dark</span>
                </button>
                <button
                  type="button"
                  data-testid="theme-option-system"
                  onClick={() => setTheme('system')}
                  className={`flex items-center justify-center gap-1.5 py-1 px-1.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    theme === 'system'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <Monitor className="h-3 w-3 text-slate-400" />
                  <span>System</span>
                </button>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer dark:text-red-400 dark:hover:bg-red-950/50"
            >
              <LogOut className="h-3.5 w-3.5" />
              Log Out
            </button>
          </div>
        </div>
      )}

      {/* Embedded Account & License Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        initialTab={modalInitialTab}
      />

      <MockCheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        initialPlan="PRO"
      />
    </div>
  );
};
