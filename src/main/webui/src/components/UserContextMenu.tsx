import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useEntitlements } from '@/lib/entitlementContext';
import * as api from '@/lib/api';
import { AccountModal } from './AccountModal';
import {
  User,
  Award,
  LogOut,
  ChevronDown,
  Sparkles,
  Shield,
} from 'lucide-react';

interface UserContextMenuProps {
  className?: string;
}

export const UserContextMenu: React.FC<UserContextMenuProps> = ({ className = '' }) => {
  const { user, logout } = useAuth();
  const { plan, refreshEntitlements } = useEntitlements();
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'profile' | 'license'>('profile');

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      refreshEntitlements(true);
    }
  }, [isOpen, refreshEntitlements]);

  // Check admin role
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    const profileRoles = (user.profile as any)?.realm_access?.roles || (user.profile as any)?.roles;
    if (Array.isArray(profileRoles) && profileRoles.includes('admin')) {
      setIsAdmin(true);
    } else {
      api.getUserProfile(user.access_token).then((p) => {
        if (p.roles?.includes('admin')) {
          setIsAdmin(true);
        }
      }).catch(() => {});
    }
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
        className="inline-flex items-center gap-2.5 rounded-full border border-slate-200 bg-white py-1 pl-1.5 pr-3 text-xs font-medium text-slate-800 hover:bg-slate-50 transition-all shadow-xs focus:outline-hidden cursor-pointer"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-[11px] text-white uppercase shadow-xs">
          {initials}
        </div>
        <span className="max-w-[120px] truncate font-medium">{displayName}</span>
        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
          <Sparkles className="h-2.5 w-2.5" />
          {plan}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5 focus:outline-hidden z-50 animate-in fade-in zoom-in-95">
          {/* User Identity Summary */}
          <div className="px-3 py-2.5 border-b border-slate-100 mb-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-xs text-white uppercase">
                {initials}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-slate-900 truncate">{displayName}</p>
                {email && <p className="text-[11px] text-slate-500 truncate">{email}</p>}
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-slate-100 text-[11px]">
              <span className="text-slate-500">Subscription</span>
              <span className="font-semibold text-blue-700 flex items-center gap-1">
                <Award className="h-3 w-3" />
                {plan} Plan
              </span>
            </div>
          </div>

          {/* Menu Actions */}
          <div className="space-y-0.5">
            <button
              onClick={handleOpenProfile}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <User className="h-3.5 w-3.5 text-slate-400" />
              Account & Profile
            </button>

            <button
              onClick={handleOpenLicense}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <Award className="h-3.5 w-3.5 text-slate-400" />
              License & Subscription
            </button>

            {isAdmin && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/admin');
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer font-medium"
              >
                <Shield className="h-3.5 w-3.5 text-purple-600" />
                Admin Console
              </button>
            )}

            <div className="border-t border-slate-100 my-1" />

            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
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
    </div>
  );
};
