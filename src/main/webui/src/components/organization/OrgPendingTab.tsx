import React from 'react';
import * as api from '@/lib/api';
import { Clock, CheckCircle, XCircle, Mail, UserCheck } from 'lucide-react';

interface OrgPendingTabProps {
  pendingRequests: api.OrganizationJoinRequestDto[];
  isLoading: boolean;
  onApproveJoin: (requestId: string) => Promise<void>;
  onRejectJoin: (requestId: string) => Promise<void>;
}

export const OrgPendingTab: React.FC<OrgPendingTabProps> = ({
  pendingRequests,
  isLoading,
  onApproveJoin,
  onRejectJoin,
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 p-4 rounded-xl text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3">
        <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Domain-Based Join Approval Queue</p>
          <p className="text-blue-700 dark:text-blue-300 mt-0.5">
            Users who sign up or log in with verified email domains matching your organization will
            appear here. Approving a request grants them immediate organization membership.
          </p>
        </div>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold">
              <th className="p-3 pl-4">User Email</th>
              <th className="p-3">Requested At</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right pr-4">Review Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-400 dark:text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Loading pending requests...</span>
                  </div>
                </td>
              </tr>
            ) : pendingRequests.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500 dark:text-slate-400">
                  <UserCheck className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700 dark:text-slate-200">No pending join requests</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    All domain-matched registrations have been reviewed.
                  </p>
                </td>
              </tr>
            ) : (
              pendingRequests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-3 pl-4 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    {req.email}
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">
                    {req.createdAt ? new Date(req.createdAt).toLocaleString() : 'Recently'}
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-[11px] font-semibold dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900/50">
                      <Clock className="h-3 w-3" />
                      Pending Approval
                    </span>
                  </td>
                  <td className="p-3 text-right pr-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onApproveJoin(req.id)}
                        className="px-3 py-1.5 text-[11px] font-semibold text-white bg-green-600 hover:bg-green-700 rounded-md shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => onRejectJoin(req.id)}
                        className="px-3 py-1.5 text-[11px] font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50 rounded-md transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
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
  );
};
