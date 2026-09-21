import React, { useState } from 'react';
import * as api from '@/lib/api';
import {
  Users,
  Search,
  UserPlus,
  Shield,
  User,
  Crown,
  UserMinus,
  Sparkles,
  Award,
} from 'lucide-react';

interface OrgMembersTabProps {
  members: api.OrganizationMemberDto[];
  isLoading: boolean;
  onOpenInviteModal: () => void;
  onPromoteAdmin: (userId: string) => Promise<void>;
  onDemoteAdmin: (userId: string) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
}

export const OrgMembersTab: React.FC<OrgMembersTabProps> = ({
  members,
  isLoading,
  onOpenInviteModal,
  onPromoteAdmin,
  onDemoteAdmin,
  onRemoveMember,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMembers = members.filter((m) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      m.username.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      (m.firstName && m.firstName.toLowerCase().includes(q)) ||
      (m.lastName && m.lastName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search members..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>
        <button
          type="button"
          onClick={onOpenInviteModal}
          className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <UserPlus className="h-4 w-4" />
          Invite Member
        </button>
      </div>

      {/* Members Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold">
              <th className="p-3 pl-4">Member</th>
              <th className="p-3">Organization Role</th>
              <th className="p-3">License Plan</th>
              <th className="p-3 text-right pr-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-400 dark:text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Loading organization members...</span>
                  </div>
                </td>
              </tr>
            ) : filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500 dark:text-slate-400">
                  <Users className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700 dark:text-slate-200">No members found</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {searchQuery ? 'Try matching another search query' : 'Invite your first team member'}
                  </p>
                </td>
              </tr>
            ) : (
              filteredMembers.map((m) => {
                const displayName =
                  [m.firstName, m.lastName].filter(Boolean).join(' ') || m.username || m.email;
                const initials = displayName.slice(0, 2).toUpperCase();
                const isOrgAdmin = m.role === 'ORG_ADMIN';

                return (
                  <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3 pl-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-[11px] uppercase shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{displayName}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      {isOrgAdmin ? (
                        <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full text-[11px] font-semibold dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-900/50">
                          <Crown className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                          Org Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full text-[11px] font-medium dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                          <User className="h-3 w-3 text-slate-400" />
                          Member
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {m.assignedPlan ? (
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md text-[11px] font-semibold dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900/50">
                          <Sparkles className="h-3 w-3" />
                          {m.assignedPlan}
                        </span>
                      ) : m.hasLicense ? (
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md text-[11px] font-medium dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                          <Sparkles className="h-3 w-3 text-slate-400" />
                          {m.effectivePlan
                            ? `${m.effectivePlan} (${m.licenseSource === 'PRIVATE' ? 'Private' : 'Other Org'})`
                            : (m.licenseSource === 'PRIVATE' ? 'Private License' : 'Other Org License')}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-[11px] italic">No seat assigned</span>
                      )}
                    </td>
                    <td className="p-3 text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {isOrgAdmin ? (
                          <button
                            type="button"
                            onClick={() => onDemoteAdmin(m.id)}
                            className="px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                          >
                            Demote
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onPromoteAdmin(m.id)}
                            className="px-2.5 py-1 text-[11px] font-medium text-purple-700 hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-purple-950/50 rounded-md border border-purple-200 dark:border-purple-900/50 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Crown className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                            Make Admin
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onRemoveMember(m.id)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-950/50 rounded-md transition-colors cursor-pointer"
                          title="Remove member from organization"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
