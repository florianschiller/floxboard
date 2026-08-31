import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import * as api from '@/lib/api';
import { UserContextMenu } from './UserContextMenu';
import { InviteMemberModal } from './organization/InviteMemberModal';
import { OrgMembersTab } from './organization/OrgMembersTab';
import { OrgPendingTab } from './organization/OrgPendingTab';
import { OrgLicensePoolsTab } from './organization/OrgLicensePoolsTab';
import {
  Building,
  Users,
  Clock,
  CreditCard,
  ArrowLeft,
  Shield,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Crown,
  Globe,
  ChevronDown,
} from 'lucide-react';

export const OrganizationConsole: React.FC = () => {
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const orgIdParam = searchParams.get('orgId') || undefined;

  // Tabs
  const [activeTab, setActiveTab] = useState<'members' | 'pending' | 'pools'>('members');

  // Org profile & access state
  const [organizations, setOrganizations] = useState<api.MyOrganizationProfileDto[]>([]);
  const [profile, setProfile] = useState<api.MyOrganizationProfileDto | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  // Data states
  const [members, setMembers] = useState<api.OrganizationMemberDto[]>([]);
  const [pendingRequests, setPendingRequests] = useState<api.OrganizationJoinRequestDto[]>([]);
  const [licensePools, setLicensePools] = useState<api.OrgLicensePoolDto[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Status feedback
  const [globalMessage, setGlobalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal & operation states
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isPurchasingSeats, setIsPurchasingSeats] = useState(false);
  const [isAssigningSeat, setIsAssigningSeat] = useState(false);

  // Fetch organization and verify access
  const loadOrganization = useCallback(async () => {
    if (!user) return;
    setIsLoadingData(true);
    try {
      // Fetch user's organizations
      const userOrgs = await api.getMyOrganizations(token || undefined).catch(() => []);
      setOrganizations(userOrgs);

      // Determine active organization ID
      const effectiveOrgId = orgIdParam || (userOrgs.length > 0 ? userOrgs[0].organizationId : undefined);

      const orgProfile = await api.getMyOrganization(effectiveOrgId, token || undefined);
      setProfile(orgProfile);
      setHasAccess(true);

      // Load sub-resources in parallel
      const [membersData, pendingData, poolsData] = await Promise.all([
        api.getOrgMembers(effectiveOrgId, token || undefined).catch(() => []),
        api.getPendingOrgMembers(effectiveOrgId, token || undefined).catch(() => []),
        api.getOrgLicensePools(effectiveOrgId, token || undefined).catch(() => []),
      ]);

      setMembers(membersData);
      setPendingRequests(pendingData);
      setLicensePools(poolsData);
    } catch (err: any) {
      setHasAccess(false);
      setGlobalMessage({
        type: 'error',
        text: err.message || 'Failed to load organization profile or you lack org-admin permissions.',
      });
    } finally {
      setIsLoadingData(false);
      setIsCheckingAccess(false);
    }
  }, [user, token, orgIdParam]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      setIsCheckingAccess(false);
      setHasAccess(false);
      return;
    }
    loadOrganization();
  }, [user, isAuthLoading, loadOrganization]);

  const currentOrgId = profile?.organizationId || orgIdParam;

  // Actions
  const handleInviteMember = async (email: string, role: api.OrgMemberRole) => {
    setIsInviting(true);
    setInviteError(null);
    try {
      await api.inviteOrgMember({ email, role }, currentOrgId, token || undefined);
      setGlobalMessage({ type: 'success', text: `Invitation sent successfully to ${email}` });
      setIsInviteModalOpen(false);
      await loadOrganization();
    } catch (err: any) {
      setInviteError(err.message || 'Failed to invite member');
    } finally {
      setIsInviting(false);
    }
  };

  const handlePromoteAdmin = async (userId: string) => {
    try {
      await api.updateOrgMemberRole(userId, 'ORG_ADMIN', currentOrgId, token || undefined);
      setGlobalMessage({ type: 'success', text: 'Member promoted to Organization Admin' });
      await loadOrganization();
    } catch (err: any) {
      setGlobalMessage({ type: 'error', text: err.message || 'Failed to promote member' });
    }
  };

  const handleDemoteAdmin = async (userId: string) => {
    try {
      await api.updateOrgMemberRole(userId, 'MEMBER', currentOrgId, token || undefined);
      setGlobalMessage({ type: 'success', text: 'Admin demoted to Member' });
      await loadOrganization();
    } catch (err: any) {
      setGlobalMessage({ type: 'error', text: err.message || 'Failed to demote admin' });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm('Are you sure you want to remove this member from the organization?')) return;
    try {
      await api.removeOrgMember(userId, currentOrgId, token || undefined);
      setGlobalMessage({ type: 'success', text: 'Member removed from organization' });
      await loadOrganization();
    } catch (err: any) {
      setGlobalMessage({ type: 'error', text: err.message || 'Failed to remove member' });
    }
  };

  const handleApproveJoin = async (requestId: string) => {
    try {
      await api.approvePendingOrgMember(requestId, token || undefined);
      setGlobalMessage({ type: 'success', text: 'Domain join request approved' });
      await loadOrganization();
    } catch (err: any) {
      setGlobalMessage({ type: 'error', text: err.message || 'Failed to approve join request' });
    }
  };

  const handleRejectJoin = async (requestId: string) => {
    try {
      await api.rejectPendingOrgMember(requestId, token || undefined);
      setGlobalMessage({ type: 'success', text: 'Domain join request rejected' });
      await loadOrganization();
    } catch (err: any) {
      setGlobalMessage({ type: 'error', text: err.message || 'Failed to reject join request' });
    }
  };

  const handleBuySeats = async (
    plan: api.LicensePlan,
    seatCount: number,
    billingInterval: api.BillingInterval
  ) => {
    setIsPurchasingSeats(true);
    try {
      await api.orgBulkCheckout({ plan, seatCount, billingInterval }, currentOrgId, token || undefined);
      setGlobalMessage({
        type: 'success',
        text: `Successfully purchased ${seatCount} ${plan} seats for your organization!`,
      });
      await loadOrganization();
    } catch (err: any) {
      setGlobalMessage({ type: 'error', text: err.message || 'Failed to purchase bulk seats' });
    } finally {
      setIsPurchasingSeats(false);
    }
  };

  const handleAssignSeat = async (poolId: string, userId: string) => {
    setIsAssigningSeat(true);
    try {
      await api.assignOrgSeat(poolId, userId, token || undefined);
      setGlobalMessage({ type: 'success', text: 'License seat assigned to member' });
      await loadOrganization();
    } catch (err: any) {
      setGlobalMessage({ type: 'error', text: err.message || 'Failed to assign seat' });
    } finally {
      setIsAssigningSeat(false);
    }
  };

  const handleUnassignSeat = async (poolId: string, userId: string) => {
    try {
      await api.unassignOrgSeat(poolId, userId, token || undefined);
      setGlobalMessage({ type: 'success', text: 'License seat unassigned' });
      await loadOrganization();
    } catch (err: any) {
      setGlobalMessage({ type: 'error', text: err.message || 'Failed to unassign seat' });
    }
  };

  if (isAuthLoading || isCheckingAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-sm font-medium">Verifying organization access...</span>
        </div>
      </div>
    );
  }

  if (!hasAccess || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-center">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Access Restricted</h2>
          <p className="text-xs text-slate-500 mb-4">
            You are not an organization admin of any active organization. If you believe this is an error, please contact your platform administrator.
          </p>
          <button
            type="button"
            onClick={() => navigate('/board')}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Return to Whiteboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            to="/board"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Back to Whiteboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              <Building className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                {organizations.length > 1 ? (
                  <div className="relative inline-flex items-center">
                    <select
                      aria-label="Select Organization"
                      value={profile.organizationId}
                      onChange={(e) => {
                        const newOrgId = e.target.value;
                        setSearchParams({ orgId: newOrgId });
                      }}
                      className="text-sm font-bold text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-lg py-1 pl-2.5 pr-7 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none shadow-2xs"
                    >
                      {organizations.map((org) => (
                        <option key={org.organizationId} value={org.organizationId}>
                          {org.organizationName}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  </div>
                ) : (
                  <h1 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    {profile.organizationName}
                  </h1>
                )}
                <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1">
                  <Crown className="h-2.5 w-2.5 text-purple-600" />
                  {profile.role === 'ORG_ADMIN' ? 'Org Admin' : 'Member'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Organization Management Portal</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <UserContextMenu />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        {/* Global Alert Notification */}
        {globalMessage && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between shadow-xs animate-in fade-in ${
              globalMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {globalMessage.type === 'success' ? (
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              )}
              <span>{globalMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setGlobalMessage(null)}
              className="p-1 hover:opacity-75 rounded-md cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Organization Info Banner */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-slate-900">{profile.organizationName}</h2>
              <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                {profile.organizationId}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-2">
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <Globe className="h-3.5 w-3.5 text-slate-400" />
                Domains:
              </span>
              {profile.domains && profile.domains.length > 0 ? (
                profile.domains.map((d) => (
                  <span
                    key={d}
                    className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md font-mono text-[11px]"
                  >
                    @{d}
                  </span>
                ))
              ) : (
                <span className="italic text-slate-400">No domains configured</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-center">
              <span className="block text-[11px] font-medium text-slate-500">Total Members</span>
              <span className="text-lg font-bold text-slate-900">{members.length}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-center">
              <span className="block text-[11px] font-medium text-slate-500">Pending Joins</span>
              <span className={`text-lg font-bold ${pendingRequests.length > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                {pendingRequests.length}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'members'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="h-4 w-4" />
            Members ({members.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors relative ${
              activeTab === 'pending'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Clock className="h-4 w-4" />
            Pending Approvals
            {pendingRequests.length > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pools')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'pools'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Licenses & Billing
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'members' && (
          <OrgMembersTab
            members={members}
            isLoading={isLoadingData}
            onOpenInviteModal={() => setIsInviteModalOpen(true)}
            onPromoteAdmin={handlePromoteAdmin}
            onDemoteAdmin={handleDemoteAdmin}
            onRemoveMember={handleRemoveMember}
          />
        )}

        {activeTab === 'pending' && (
          <OrgPendingTab
            pendingRequests={pendingRequests}
            isLoading={isLoadingData}
            onApproveJoin={handleApproveJoin}
            onRejectJoin={handleRejectJoin}
          />
        )}

        {activeTab === 'pools' && (
          <OrgLicensePoolsTab
            licensePools={licensePools}
            members={members}
            isLoading={isLoadingData}
            onBuySeats={handleBuySeats}
            isPurchasingSeats={isPurchasingSeats}
            onAssignSeat={handleAssignSeat}
            onUnassignSeat={handleUnassignSeat}
            isAssigningSeat={isAssigningSeat}
          />
        )}
      </main>

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => {
          setIsInviteModalOpen(false);
          setInviteError(null);
        }}
        onInvite={handleInviteMember}
        isSubmitting={isInviting}
        error={inviteError}
      />
    </div>
  );
};
