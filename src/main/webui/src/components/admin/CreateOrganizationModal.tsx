import React from 'react';
import * as api from '@/lib/api';
import {
  Building,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export interface CreateOrganizationModalProps {
  isOpen: boolean;
  name: string;
  onNameChange: (name: string) => void;
  domains: string;
  onDomainsChange: (domains: string) => void;
  initialAdminId: string;
  onInitialAdminIdChange: (id: string) => void;
  users: api.AdminUser[];
  isCreating: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const CreateOrganizationModal: React.FC<CreateOrganizationModalProps> = ({
  isOpen,
  name,
  onNameChange,
  domains,
  onDomainsChange,
  initialAdminId,
  onInitialAdminIdChange,
  users,
  isCreating,
  error,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Create New Organization</h3>
              <p className="text-xs text-slate-500">Add a new organization and assign its initial administrator</p>
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

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Organization Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Acme Corporation"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email Domains (comma-separated)
            </label>
            <input
              type="text"
              placeholder="e.g. acme.com, acme-corp.com"
              value={domains}
              onChange={(e) => onDomainsChange(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-indigo-500 focus:outline-hidden"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Users registering with these domains will create join requests requiring org-admin approval.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Initial Organization Administrator *
            </label>
            <select
              value={initialAdminId}
              onChange={(e) => onInitialAdminIdChange(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-indigo-500 focus:outline-hidden"
              required
            >
              <option value="">-- Select initial Org-Admin --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName || u.lastName ? `${u.firstName} ${u.lastName} (${u.email})` : `${u.username} (${u.email})`}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              The initial administrator is automatically granted org-admin permissions.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Create Organization
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
