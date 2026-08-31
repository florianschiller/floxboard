import React from 'react';
import * as api from '@/lib/api';
import {
  Search,
  Award,
  Sparkles,
  User,
  RefreshCw,
  Clock,
  Check,
  Zap,
  Users,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export interface UsersTabProps {
  users: api.AdminUser[];
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onRefresh: () => void;
  isLoading: boolean;
  error: string | null;
  onOpenAssignModal: (user: api.AdminUser) => void;
}

export const UsersTab: React.FC<UsersTabProps> = ({
  users,
  searchQuery,
  onSearchQueryChange,
  onSearchSubmit,
  onRefresh,
  isLoading,
  error,
  onOpenAssignModal,
}) => {
  const totalUsers = users.length;
  const paidUsersCount = users.filter((u) => u.license && u.license.plan !== 'FREE').length;
  const freeUsersCount = totalUsers - paidUsersCount;

  return (
    <div className="space-y-6">
      {/* Top Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Users</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{totalUsers}</p>
          <span className="text-xs text-slate-400">Registered in Keycloak</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Paid Licenses</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-purple-700 mt-2">{paidUsersCount}</p>
          <span className="text-xs text-slate-400">PRO, TEAM & ENTERPRISE</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Free Tier Users</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800 mt-2">{freeUsersCount}</p>
          <span className="text-xs text-slate-400">Default quota & limits</span>
        </div>
      </div>

      {/* User Search & Action Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">User & License Management</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Search users and assign subscription plans and quota entitlements
            </p>
          </div>

          <form onSubmit={onSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, or username..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs focus:border-blue-500 focus:bg-white focus:outline-hidden transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
            >
              Search
            </button>
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh list"
              className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </form>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Roles</th>
                <th className="py-3 px-4">Current Plan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Expiration</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      <span>Loading users...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-red-600">
                    <div className="flex items-center justify-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>{error}</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const plan = u.license?.plan || 'FREE';
                  const isExpired = u.license?.isExpired || false;
                  const status = u.license?.status || 'ACTIVE';
                  const validUntil = u.license?.validUntil;
                  const validUntilStr = validUntil
                    ? new Date(validUntil).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Lifetime';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs uppercase">
                            {u.firstName ? u.firstName[0] : u.username ? u.username[0] : <User className="h-3.5 w-3.5" />}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block">
                              {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.username}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">@{u.username}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600">{u.email}</td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {u.roles && u.roles.length > 0 ? (
                            u.roles.map((r) => (
                              <span
                                key={r}
                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-sm ${
                                  r === 'admin'
                                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                {r}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 font-bold text-[11px] px-2 py-0.5 rounded-md ${
                            plan === 'ENTERPRISE'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : plan === 'TEAM'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : plan === 'PRO'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {plan !== 'FREE' && <Zap className="h-3 w-3" />}
                          {plan}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 text-red-600 font-medium text-[11px]">
                            <Clock className="h-3 w-3" /> Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-medium text-[11px]">
                            <Check className="h-3 w-3" /> {status}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">{validUntilStr}</td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onOpenAssignModal(u)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
