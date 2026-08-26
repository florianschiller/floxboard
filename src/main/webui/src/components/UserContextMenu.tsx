import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useEntitlements } from '@/lib/entitlementContext';
import { AccountModal } from './AccountModal';
import {
  User,
  Award,
  LogOut,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

interface UserContextMenuProps {
  className?: string;
}

export const UserContextMenu: React.FC<UserContextMenuProps> = ({ className = '' }) => {
  const { user, logout } = useAuth();
  const { plan } = useEntitlements();

  const [searchParams, setSearchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'profile' | 'license'>('profile');

  const menuRef = useRef<HTMLDivElement>(null);

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
        className="inline-flex items-center gap-2.5 rounded-full border border-slate-700 bg-slate-800/90 py-1 pl-1.5 pr-3 text-xs font-medium text-slate-200 hover:bg-slate-700/80 hover:text-white transition-all shadow-md focus:outline-hidden"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-bold text-[11px] text-white uppercase shadow-inner">
          {initials}
        </div>
        <span className="max-w-[120px] truncate font-medium">{displayName}</span>
        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300 border border-indigo-500/20">
          <Sparkles className="h-2.5 w-2.5" />
          {plan}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl border border-slate-700 bg-slate-800 p-1.5 shadow-2xl ring-1 ring-black/50 focus:outline-hidden z-50 animate-in fade-in zoom-in-95">
          {/* User Identity Summary */}
          <div className="px-3 py-2.5 border-b border-slate-700/70 mb-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-bold text-xs text-white uppercase">
                {initials}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-slate-100 truncate">{displayName}</p>
                {email && <p className="text-[11px] text-slate-400 truncate">{email}</p>}
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-slate-700/50 text-[11px]">
              <span className="text-slate-400">Subscription</span>
              <span className="font-semibold text-indigo-300 flex items-center gap-1">
                <Award className="h-3 w-3" />
                {plan} Plan
              </span>
            </div>
          </div>

          {/* Menu Actions */}
          <div className="space-y-0.5">
            <button
              onClick={handleOpenProfile}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-700/70 hover:text-white transition-colors"
            >
              <User className="h-3.5 w-3.5 text-slate-400" />
              Account & Profile
            </button>

            <button
              onClick={handleOpenLicense}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-700/70 hover:text-white transition-colors"
            >
              <Award className="h-3.5 w-3.5 text-slate-400" />
              License & Subscription
            </button>

            <div className="border-t border-slate-700/70 my-1" />

            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors"
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
