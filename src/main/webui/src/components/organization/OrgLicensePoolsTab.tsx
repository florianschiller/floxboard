import React, { useState } from 'react';
import * as api from '@/lib/api';
import {
  CreditCard,
  Sparkles,
  Award,
  CheckCircle,
  AlertCircle,
  Loader2,
  Users,
  Calendar,
  UserPlus,
  UserMinus,
} from 'lucide-react';

interface OrgLicensePoolsTabProps {
  licensePools: api.OrgLicensePoolDto[];
  members: api.OrganizationMemberDto[];
  isLoading: boolean;
  onBuySeats: (plan: api.LicensePlan, seatCount: number, billingInterval: api.BillingInterval) => Promise<void>;
  isPurchasingSeats: boolean;
  onAssignSeat: (poolId: string, userId: string) => Promise<void>;
  onUnassignSeat: (poolId: string, userId: string) => Promise<void>;
  isAssigningSeat: boolean;
}

export const OrgLicensePoolsTab: React.FC<OrgLicensePoolsTabProps> = ({
  licensePools,
  members,
  isLoading,
  onBuySeats,
  isPurchasingSeats,
  onAssignSeat,
  onUnassignSeat,
  isAssigningSeat,
}) => {
  // Bulk checkout form state
  const [selectedPlan, setSelectedPlan] = useState<api.LicensePlan>('PRO');
  const [seatCount, setSeatCount] = useState<number>(5);
  const [billingInterval, setBillingInterval] = useState<api.BillingInterval>('MONTHLY');
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);

  // Seat assignment selection
  const [assignPoolId, setAssignPoolId] = useState<string>('');
  const [assignUserId, setAssignUserId] = useState<string>('');

  const activePools = licensePools.filter((p) => p.status === 'ACTIVE');
  const totalPurchasedSeats = activePools.reduce((acc, p) => acc + p.totalSeats, 0);
  const totalAllocatedSeats = activePools.reduce((acc, p) => acc + p.allocatedSeats, 0);
  const totalRemainingSeats = activePools.reduce((acc, p) => acc + p.remainingSeats, 0);

  const unassignedMembers = members.filter((m) => !m.hasLicense && !m.assignedPlan);
  const assignedMembers = members.filter((m) => m.assignedPlan);

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onBuySeats(selectedPlan, seatCount, billingInterval);
    setIsPurchaseOpen(false);
  };

  const handleAssign = async () => {
    if (!assignPoolId || !assignUserId) return;
    await onAssignSeat(assignPoolId, assignUserId);
    setAssignUserId('');
  };

  // Pricing calculation
  const unitPriceMonthly = selectedPlan === 'ENTERPRISE' ? 49 : 19;
  const unitPriceYearly = selectedPlan === 'ENTERPRISE' ? 490 : 190;
  const unitPrice = billingInterval === 'YEARLY' ? unitPriceYearly : unitPriceMonthly;
  const totalPrice = unitPrice * seatCount;

  return (
    <div className="space-y-6">
      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-medium">Total Purchased Seats</span>
            <Award className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{totalPurchasedSeats}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Across all active pools</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-medium">Allocated Seats</span>
            <Users className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{totalAllocatedSeats}</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-purple-600 h-full rounded-full transition-all"
              style={{
                width: totalPurchasedSeats > 0 ? `${Math.min(100, (totalAllocatedSeats / totalPurchasedSeats) * 100)}%` : '0%',
              }}
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-medium">Available Seats</span>
            <Sparkles className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{totalRemainingSeats}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Ready to assign to members</p>
        </div>
      </div>

      {/* Buy Seats & Pool List Section */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-slate-500" />
          Active Corporate License Pools
        </h4>
        <button
          type="button"
          onClick={() => setIsPurchaseOpen(!isPurchaseOpen)}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {isPurchaseOpen ? 'Cancel Purchase' : 'Purchase Seats'}
        </button>
      </div>

      {/* Purchase Modal / Inline Form */}
      {isPurchaseOpen && (
        <form onSubmit={handlePurchaseSubmit} className="bg-slate-50 border border-blue-200 rounded-xl p-5 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Purchase License Seat Package</h5>
            <span className="text-xs font-semibold text-blue-600">${totalPrice} total</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Plan Tier</label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value as api.LicensePlan)}
                className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
              >
                <option value="PRO">PRO ($19/seat/mo)</option>
                <option value="ENTERPRISE">ENTERPRISE ($49/seat/mo)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Seat Quantity</label>
              <input
                type="number"
                min="1"
                max="500"
                value={seatCount}
                onChange={(e) => setSeatCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Billing Interval</label>
              <div className="grid grid-cols-2 gap-1 bg-slate-200 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setBillingInterval('MONTHLY')}
                  className={`py-1.5 rounded-md text-center cursor-pointer transition-colors ${
                    billingInterval === 'MONTHLY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingInterval('YEARLY')}
                  className={`py-1.5 rounded-md text-center cursor-pointer transition-colors ${
                    billingInterval === 'YEARLY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Yearly (Save 17%)
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isPurchasingSeats}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isPurchasingSeats && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Complete Order & Activate Seats (${totalPrice})
            </button>
          </div>
        </form>
      )}

      {/* Pools Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-500 font-semibold">
              <th className="p-3 pl-4">Plan Tier</th>
              <th className="p-3">Seat Usage</th>
              <th className="p-3">Available</th>
              <th className="p-3">Interval</th>
              <th className="p-3">Valid Until</th>
              <th className="p-3 text-right pr-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Loading license pools...</span>
                  </div>
                </td>
              </tr>
            ) : activePools.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">
                  <p className="font-semibold text-slate-700">No active license pools</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Purchase seats in bulk above to distribute licenses to your members.
                  </p>
                </td>
              </tr>
            ) : (
              activePools.map((pool) => (
                <tr key={pool.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-3 pl-4 font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                    {pool.planType}
                  </td>
                  <td className="p-3">
                    <span className="font-semibold text-slate-900">{pool.allocatedSeats}</span> / {pool.totalSeats} seats
                  </td>
                  <td className="p-3">
                    <span className="font-bold text-emerald-600">{pool.remainingSeats} seats</span>
                  </td>
                  <td className="p-3 text-slate-600">{pool.billingInterval}</td>
                  <td className="p-3 text-slate-600">
                    {pool.validUntil ? new Date(pool.validUntil).toLocaleDateString() : 'Active'}
                  </td>
                  <td className="p-3 text-right pr-4">
                    <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                      <CheckCircle className="h-3 w-3" />
                      Active
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Seat Allocation Management */}
      <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4 shadow-xs">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <UserPlus className="h-4 w-4 text-blue-600" />
          Allocate Seat to Organization Member
        </h4>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full sm:w-1/2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Target License Pool</label>
            <select
              value={assignPoolId}
              onChange={(e) => setAssignPoolId(e.target.value)}
              className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
            >
              <option value="">Select an active pool...</option>
              {activePools.map((p) => (
                <option key={p.id} value={p.id} disabled={p.remainingSeats <= 0}>
                  {p.planType} ({p.remainingSeats} seats available)
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-1/2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Select Member</label>
            <select
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
              className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
            >
              <option value="">Select an unassigned member...</option>
              {unassignedMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName ? `${m.firstName} ${m.lastName || ''} (${m.email})` : m.email}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-auto self-end">
            <button
              type="button"
              onClick={handleAssign}
              disabled={isAssigningSeat || !assignPoolId || !assignUserId}
              className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isAssigningSeat && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Assign Seat
            </button>
          </div>
        </div>

        {/* Currently Assigned Members Table */}
        <div className="pt-3 border-t border-slate-100">
          <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
            Currently Assigned Members ({assignedMembers.length})
          </h5>
          <div className="border border-slate-100 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <th className="p-2.5 pl-3">Member</th>
                  <th className="p-2.5">Plan</th>
                  <th className="p-2.5 text-right pr-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignedMembers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-slate-400 italic">
                      No seats currently allocated.
                    </td>
                  </tr>
                ) : (
                  assignedMembers.map((m) => {
                    const pool = activePools.find((p) => p.planType === m.assignedPlan);
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/50">
                        <td className="p-2.5 pl-3 font-medium text-slate-900">
                          {m.email} {m.firstName && <span className="text-slate-400">({m.firstName} {m.lastName})</span>}
                        </td>
                        <td className="p-2.5">
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md text-[10px] font-semibold">
                            <Sparkles className="h-2.5 w-2.5" />
                            {m.assignedPlan}
                          </span>
                        </td>
                        <td className="p-2.5 text-right pr-3">
                          <button
                            type="button"
                            onClick={() => {
                              if (pool) {
                                onUnassignSeat(pool.id, m.id);
                              }
                            }}
                            className="px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-md border border-slate-200 transition-colors cursor-pointer"
                          >
                            Unassign
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
    </div>
  );
};
