import React from 'react';
import * as api from '@/lib/api';
import {
  Building,
  Users,
  CreditCard,
  Clock,
  X,
  AlertCircle,
  Loader2,
  Crown,
  UserMinus,
  Trash2,
} from 'lucide-react';

export interface OrganizationDetailDrawerProps {
  selectedOrg: api.OrganizationDto | null;
  activeTab: 'members' | 'pending' | 'pools';
  onTabChange: (tab: 'members' | 'pending' | 'pools') => void;
  members: api.OrganizationMemberDto[];
  pendingRequests: api.OrganizationJoinRequestDto[];
  licensePools: api.OrgLicensePoolDto[];
  isLoading: boolean;
  error: string | null;
  bulkPlan: api.LicensePlan;
  onBulkPlanChange: (plan: api.LicensePlan) => void;
  bulkSeats: number;
  onBulkSeatsChange: (seats: number) => void;
  bulkInterval: api.BillingInterval;
  onBulkIntervalChange: (interval: api.BillingInterval) => void;
  isPurchasingSeats: boolean;
  onBuySeats: (e: React.FormEvent) => void;
  assignTargetUserId: string;
  onAssignTargetUserIdChange: (userId: string) => void;
  isAssigningSeat: boolean;
  onAssignSeat: (poolId: string) => void;
  onUnassignSeat: (poolId: string, userId: string) => void;
  onPromoteAdmin: (userId: string) => void;
  onDemoteAdmin: (userId: string) => void;
  onRemoveMember: (userId: string) => void;
  onApproveJoin: (requestId: string) => void;
  onRejectJoin: (requestId: string) => void;
  onClose: () => void;
}

export const OrganizationDetailDrawer: React.FC<OrganizationDetailDrawerProps> = ({
  selectedOrg,
  activeTab,
  onTabChange,
  members,
  pendingRequests,
  licensePools,
  isLoading,
  error,
  bulkPlan,
  onBulkPlanChange,
  bulkSeats,
  onBulkSeatsChange,
  bulkInterval,
  onBulkIntervalChange,
  isPurchasingSeats,
  onBuySeats,
  assignTargetUserId,
  onAssignTargetUserIdChange,
  isAssigningSeat,
  onAssignSeat,
  onUnassignSeat,
  onPromoteAdmin,
  onDemoteAdmin,
  onRemoveMember,
  onApproveJoin,
  onRejectJoin,
  onClose,
}) => {
  if (!selectedOrg) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">{selectedOrg.name}</h3>
                <span className="text-[11px] font-mono bg-slate-200 px-2 py-0.5 rounded-sm text-slate-700">
                  {selectedOrg.id}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <span>
                  Domains: {selectedOrg.domains.length > 0 ? selectedOrg.domains.join(', ') : 'None registered'}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Subtab Navigation */}
        <div className="px-6 border-b border-slate-200 flex items-center gap-4 bg-white shrink-0">
          <button
            type="button"
            onClick={() => onTabChange('members')}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'members'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Members & Admins ({members.length})
          </button>

          <button
            type="button"
            onClick={() => onTabChange('pending')}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Pending Domain Joins
            {pendingRequests.length > 0 && (
              <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {pendingRequests.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('pools')}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pools'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" />
            License Pools & Bulk Seats ({licensePools.length})
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2 shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              <span className="text-xs font-medium">Loading organization details...</span>
            </div>
          ) : (
            <>
              {/* SUBTAB 1: MEMBERS */}
              {activeTab === 'members' && (
                <div className="space-y-4">
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
                          <th className="py-2.5 px-3">Member</th>
                          <th className="py-2.5 px-3">Email</th>
                          <th className="py-2.5 px-3">Role</th>
                          <th className="py-2.5 px-3">Corporate Seat</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {members.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                              No members in this organization yet.
                            </td>
                          </tr>
                        ) : (
                          members.map((m) => (
                            <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-900">
                                  {[m.firstName, m.lastName].filter(Boolean).join(' ') || m.username}
                                </div>
                                <div className="text-[10px] text-slate-400">@{m.username}</div>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600">{m.email}</td>
                              <td className="py-2.5 px-3">
                                {m.role === 'ORG_ADMIN' ? (
                                  <span className="inline-flex items-center gap-1 font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md text-[10px]">
                                    <Crown className="h-3 w-3" /> Org Admin
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md text-[10px]">
                                    Member
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                {m.assignedPlan ? (
                                  <span className="font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px]">
                                    {m.assignedPlan}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">-</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {m.role === 'ORG_ADMIN' ? (
                                    <button
                                      type="button"
                                      onClick={() => onDemoteAdmin(m.id)}
                                      title="Demote from Org Admin"
                                      className="p-1 text-slate-500 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer text-[10px] font-medium inline-flex items-center gap-1 px-2"
                                    >
                                      <UserMinus className="h-3 w-3" /> Demote
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => onPromoteAdmin(m.id)}
                                      title="Promote to Org Admin"
                                      className="p-1 text-purple-600 hover:bg-purple-50 rounded-md border border-purple-200 transition-colors cursor-pointer text-[10px] font-medium inline-flex items-center gap-1 px-2"
                                    >
                                      <Crown className="h-3 w-3" /> Make Admin
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => onRemoveMember(m.id)}
                                    title="Remove Member from Org"
                                    className="p-1 text-red-500 hover:bg-red-50 rounded-md border border-red-200 transition-colors cursor-pointer text-[10px]"
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
              )}

              {/* SUBTAB 2: PENDING JOIN REQUESTS */}
              {activeTab === 'pending' && (
                <div className="space-y-4">
                  {pendingRequests.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      <Clock className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                      <p className="text-xs">No pending domain join requests.</p>
                      <p className="text-[11px] text-slate-400">
                        When users register with matching domains, their join requests appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                            <th className="py-2.5 px-3">Email</th>
                            <th className="py-2.5 px-3">User ID</th>
                            <th className="py-2.5 px-3">Requested At</th>
                            <th className="py-2.5 px-3 text-right">Approval Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {pendingRequests.map((req) => (
                            <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2.5 px-3 font-semibold text-slate-900">{req.email}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-500 text-[10px]">{req.userId}</td>
                              <td className="py-2.5 px-3 text-slate-500">
                                {new Date(req.createdAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => onApproveJoin(req.id)}
                                    className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer shadow-xs"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onRejectJoin(req.id)}
                                    className="inline-flex items-center gap-1 text-red-600 hover:bg-red-50 border border-red-200 font-medium px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB 3: LICENSE POOLS & BULK SEATS */}
              {activeTab === 'pools' && (
                <div className="space-y-6">
                  {/* Pool Status Cards */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                      Active Corporate License Pools
                    </h4>
                    {licensePools.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                        No corporate license pools purchased yet. Use the form below to order bulk seats.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {licensePools.map((pool) => (
                          <div
                            key={pool.id}
                            className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-indigo-700 text-sm">{pool.planType} Pool</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                                  {pool.status}
                                </span>
                              </div>
                              <div className="text-xs text-slate-600 space-y-1">
                                <div className="flex justify-between">
                                  <span>Total Seats:</span>
                                  <span className="font-semibold">{pool.totalSeats}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Allocated Seats:</span>
                                  <span className="font-semibold">{pool.allocatedSeats}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Remaining Seats:</span>
                                  <span className="font-bold text-emerald-600">{pool.remainingSeats}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Billing Interval:</span>
                                  <span className="font-medium">{pool.billingInterval}</span>
                                </div>
                              </div>
                            </div>

                            {/* Assign seat to member selector */}
                            {pool.remainingSeats > 0 && members.some((m) => !m.hasLicense && !m.assignedPlan) && (
                              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                                <select
                                  value={assignTargetUserId}
                                  onChange={(e) => onAssignTargetUserIdChange(e.target.value)}
                                  className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                                >
                                  <option value="">-- Assign seat to member --</option>
                                  {members
                                    .filter((m) => !m.hasLicense && !m.assignedPlan)
                                    .map((m) => (
                                      <option key={m.id} value={m.id}>
                                        {m.email}
                                      </option>
                                    ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => onAssignSeat(pool.id)}
                                  disabled={isAssigningSeat || !assignTargetUserId}
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md text-xs cursor-pointer disabled:opacity-50"
                                >
                                  Assign
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Allocated Members Table */}
                  {members.some((m) => m.assignedPlan) && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                        Assigned Members
                      </h4>
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                              <th className="py-2 px-3">Member</th>
                              <th className="py-2 px-3">Plan</th>
                              <th className="py-2 px-3 text-right">Revoke</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {members
                              .filter((m) => m.assignedPlan)
                              .map((m) => (
                                <tr key={m.id}>
                                  <td className="py-2 px-3">{m.email}</td>
                                  <td className="py-2 px-3 font-semibold text-emerald-700">{m.assignedPlan}</td>
                                  <td className="py-2 px-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const pool = licensePools.find((p) => p.planType === m.assignedPlan);
                                        if (pool) onUnassignSeat(pool.id, m.id);
                                      }}
                                      className="text-xs text-red-600 hover:text-red-800 font-medium cursor-pointer"
                                    >
                                      Unassign Seat
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Bulk Purchase Form */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                      Purchase Additional Corporate Seats
                    </h4>
                    <form onSubmit={onBuySeats} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Plan</label>
                        <select
                          value={bulkPlan}
                          onChange={(e) => onBulkPlanChange(e.target.value as any)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                        >
                          <option value="PRO">PRO</option>
                          <option value="TEAM">TEAM</option>
                          <option value="ENTERPRISE">ENTERPRISE</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Seat Quantity</label>
                        <input
                          type="number"
                          min={1}
                          max={500}
                          value={bulkSeats}
                          onChange={(e) => onBulkSeatsChange(parseInt(e.target.value) || 1)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Billing Interval</label>
                        <select
                          value={bulkInterval}
                          onChange={(e) => onBulkIntervalChange(e.target.value as any)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                        >
                          <option value="MONTHLY">Monthly</option>
                          <option value="YEARLY">Yearly (Save ~17%)</option>
                        </select>
                      </div>

                      <div>
                        <button
                          type="submit"
                          disabled={isPurchasingSeats}
                          className="w-full inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {isPurchasingSeats ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                          Purchase Seats
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
