import React, { useState } from 'react';
import * as api from '@/lib/api';
import { UserPlus, X, Loader2, Mail, Shield, User } from 'lucide-react';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string, role: api.OrgMemberRole) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  onInvite,
  isSubmitting,
  error,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<api.OrgMemberRole>('MEMBER');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    await onInvite(email.trim(), role);
    setEmail('');
    setRole('MEMBER');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Invite Organization Member</h3>
              <p className="text-xs text-slate-500">Send an invitation to join your organization</p>
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs font-medium border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Initial Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('MEMBER')}
                className={`p-3 border rounded-xl flex items-center gap-2.5 text-left cursor-pointer transition-all ${
                  role === 'MEMBER'
                    ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500 text-blue-900'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <User className={`h-4 w-4 ${role === 'MEMBER' ? 'text-blue-600' : 'text-slate-400'}`} />
                <div>
                  <p className="text-xs font-semibold">Member</p>
                  <p className="text-[10px] text-slate-500">Standard user access</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRole('ORG_ADMIN')}
                className={`p-3 border rounded-xl flex items-center gap-2.5 text-left cursor-pointer transition-all ${
                  role === 'ORG_ADMIN'
                    ? 'border-purple-500 bg-purple-50/50 ring-1 ring-purple-500 text-purple-900'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Shield className={`h-4 w-4 ${role === 'ORG_ADMIN' ? 'text-purple-600' : 'text-slate-400'}`} />
                <div>
                  <p className="text-xs font-semibold">Org Admin</p>
                  <p className="text-[10px] text-slate-500">Can manage org</p>
                </div>
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !email.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Send Invitation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
