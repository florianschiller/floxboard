import React from 'react';
import * as api from '@/lib/api';
import {
  Building,
  Users,
  CreditCard,
  Search,
  RefreshCw,
  Plus,
  Loader2,
  AlertCircle,
  Crown,
  Trash2,
} from 'lucide-react';

export interface OrganizationsTabProps {
  organizations: api.OrganizationDto[];
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  error: string | null;
  onOpenCreateModal: () => void;
  onOpenOrgDetails: (org: api.OrganizationDto) => void;
  onDeleteOrg: (org: api.OrganizationDto) => void;
}

export const OrganizationsTab: React.FC<OrganizationsTabProps> = ({
  organizations,
  searchQuery,
  onSearchQueryChange,
  onRefresh,
  isLoading,
  error,
  onOpenCreateModal,
  onOpenOrgDetails,
  onDeleteOrg,
}) => {
  const filteredOrgs = organizations.filter((org) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      org.name.toLowerCase().includes(q) ||
      org.domains.some((d) => d.toLowerCase().includes(q)) ||
      org.id.toLowerCase().includes(q)
    );
  });

  const totalOrgs = organizations.length;
  const totalOrgMembers = organizations.reduce((acc, o) => acc + o.memberCount, 0);
  const totalOrgSeats = organizations.reduce(
    (acc, o) => acc + o.activePools.reduce((pAcc, p) => pAcc + p.totalSeats, 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Org Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Organizations</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Building className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{totalOrgs}</p>
          <span className="text-xs text-slate-400 dark:text-slate-500">Registered Keycloak tenants</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Org Members</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-2">{totalOrgMembers}</p>
          <span className="text-xs text-slate-400 dark:text-slate-500">Across all organizations</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Corporate Seats</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-400 mt-2">{totalOrgSeats}</p>
          <span className="text-xs text-slate-400 dark:text-slate-500">Total bulk pool seats</span>
        </div>
      </div>

      {/* Organizations Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Organizations Management</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage tenant organizations, domain matching, org-admins, and bulk corporate license pools
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Filter organizations..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pl-9 pr-8 py-2 text-xs focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-hidden transition-colors placeholder-slate-400 dark:placeholder-slate-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchQueryChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ×
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh list"
              className="p-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3.5 py-2 rounded-lg text-xs transition-colors shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="h-4 w-4" />
              Create Organization
            </button>
          </div>
        </div>

        {/* Organizations Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Organization</th>
                <th className="py-3 px-4">Email Domains</th>
                <th className="py-3 px-4">Members</th>
                <th className="py-3 px-4">Active License Pools</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                      <span>Loading organizations...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-red-600 dark:text-red-400">
                    <div className="flex items-center justify-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>{error}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    No organizations found. Click "Create Organization" to get started.
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-100 dark:border-indigo-900/50">
                          <Building className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-slate-100 block text-sm">{org.name}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{org.id}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {org.domains.length > 0 ? (
                          org.domains.map((d) => (
                            <span
                              key={d}
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            >
                              @{d}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">No domains</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                        {org.memberCount} members
                      </div>
                      <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1 mt-0.5">
                        <Crown className="h-3 w-3" />
                        {org.adminCount} admin{org.adminCount !== 1 ? 's' : ''}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {org.activePools.length > 0 ? (
                          org.activePools.map((pool) => (
                            <span
                              key={pool.id}
                              className="inline-flex items-center gap-1 font-semibold text-[10px] px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/50"
                            >
                              {pool.planType}: {pool.allocatedSeats} / {pool.totalSeats} seats
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-[11px]">No active pool</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenOrgDetails(org)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:text-indigo-300 dark:hover:bg-indigo-950/50 px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-900/50 transition-colors cursor-pointer"
                        >
                          Manage
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteOrg(org)}
                          title="Delete organization"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-950/50 rounded-lg border border-transparent hover:border-red-200 dark:hover:border-red-900/50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
