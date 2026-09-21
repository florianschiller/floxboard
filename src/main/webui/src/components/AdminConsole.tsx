import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useEntitlements, notifyLicenseUpdated } from '@/lib/entitlementContext';
import * as api from '@/lib/api';
import { UserContextMenu } from './UserContextMenu';
import {
  Shield,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
  Users,
  Building,
} from 'lucide-react';

import { UsersTab } from './admin/UsersTab';
import { AssignLicenseModal } from './admin/AssignLicenseModal';
import { OrganizationsTab } from './admin/OrganizationsTab';
import { CreateOrganizationModal } from './admin/CreateOrganizationModal';
import { OrganizationDetailDrawer } from './admin/OrganizationDetailDrawer';

export const AdminConsole: React.FC = () => {
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const { refreshEntitlements } = useEntitlements();
  const navigate = useNavigate();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'users' | 'organizations'>('users');

  // Access control
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Users data
  const [users, setUsers] = useState<api.AdminUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // License assignment modal state
  const [selectedUser, setSelectedUser] = useState<api.AdminUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<api.LicensePlan>('PRO');
  const [expiryOption, setExpiryOption] = useState<'30d' | '90d' | '1y' | 'lifetime' | 'custom'>('30d');
  const [customDate, setCustomDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [globalMessage, setGlobalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Organizations data
  const [organizations, setOrganizations] = useState<api.OrganizationDto[]>([]);
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);
  const [orgsError, setOrgsError] = useState<string | null>(null);

  // Create Organization modal state
  const [isCreateOrgModalOpen, setIsCreateOrgModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDomains, setNewOrgDomains] = useState('');
  const [newOrgInitialAdminId, setNewOrgInitialAdminId] = useState('');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [createOrgError, setCreateOrgError] = useState<string | null>(null);

  // Selected Organization management drawer/modal
  const [selectedOrg, setSelectedOrg] = useState<api.OrganizationDto | null>(null);
  const [orgDetailTab, setOrgDetailTab] = useState<'members' | 'pending' | 'pools'>('members');
  const [orgMembers, setOrgMembers] = useState<api.OrganizationMemberDto[]>([]);
  const [orgPendingRequests, setOrgPendingRequests] = useState<api.OrganizationJoinRequestDto[]>([]);
  const [orgLicensePools, setOrgLicensePools] = useState<api.OrgLicensePoolDto[]>([]);
  const [isLoadingOrgDetails, setIsLoadingOrgDetails] = useState(false);
  const [orgActionError, setOrgActionError] = useState<string | null>(null);

  // Org bulk checkout form state
  const [bulkPlan, setBulkPlan] = useState<api.LicensePlan>('PRO');
  const [bulkSeats, setBulkSeats] = useState(5);
  const [bulkInterval, setBulkInterval] = useState<api.BillingInterval>('MONTHLY');
  const [isPurchasingSeats, setIsPurchasingSeats] = useState(false);

  // Org seat assignment state
  const [assignTargetUserId, setAssignTargetUserId] = useState('');
  const [isAssigningSeat, setIsAssigningSeat] = useState(false);

  // Check admin role
  useEffect(() => {
    let isMounted = true;

    async function checkRole() {
      if (isAuthLoading) return;
      if (!user) {
        setIsCheckingRole(false);
        setIsAdmin(false);
        return;
      }

      try {
        const profile = await api.getUserProfile(token || undefined);
        if (isMounted) {
          const hasAdminRole = profile.roles?.includes('admin') || false;
          setIsAdmin(hasAdminRole);
        }
      } catch (err) {
        if (isMounted) {
          setIsAdmin(false);
        }
      } finally {
        if (isMounted) {
          setIsCheckingRole(false);
        }
      }
    }

    checkRole();

    return () => {
      isMounted = false;
    };
  }, [user, token, isAuthLoading]);

  // Set default initial org admin when users are available
  useEffect(() => {
    if (users.length > 0 && !newOrgInitialAdminId) {
      setNewOrgInitialAdminId(users[0].id);
    }
  }, [users, newOrgInitialAdminId]);

  // Load data when admin confirmed
  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadOrganizations();
    }
  }, [isAdmin]);

  const loadUsers = async (query = searchQuery) => {
    setIsLoadingUsers(true);
    setSearchError(null);
    try {
      const data = await api.adminSearchUsers(query, token || undefined);
      setUsers(data);
    } catch (err: any) {
      setSearchError(err.message || 'Failed to search users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadOrganizations = async () => {
    setIsLoadingOrgs(true);
    setOrgsError(null);
    try {
      const data = await api.adminListOrganizations(token || undefined);
      setOrganizations(data);
    } catch (err: any) {
      setOrgsError(err.message || 'Failed to load organizations');
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  const loadOrgDetails = async (orgId: string) => {
    setIsLoadingOrgDetails(true);
    setOrgActionError(null);
    try {
      const [members, pending, pools] = await Promise.all([
        api.adminGetOrgMembers(orgId, token || undefined),
        api.adminGetPendingMembers(orgId, token || undefined),
        api.adminGetOrgLicensePools(orgId, token || undefined),
      ]);
      setOrgMembers(members);
      setOrgPendingRequests(pending);
      setOrgLicensePools(pools);
    } catch (err: any) {
      setOrgActionError(err.message || 'Failed to load organization details');
    } finally {
      setIsLoadingOrgDetails(false);
    }
  };

  const handleOpenOrgDetails = (org: api.OrganizationDto) => {
    setSelectedOrg(org);
    setOrgDetailTab('members');
    loadOrgDetails(org.id);
  };

  const handleCloseOrgDetails = () => {
    setSelectedOrg(null);
    setOrgMembers([]);
    setOrgPendingRequests([]);
    setOrgLicensePools([]);
    setOrgActionError(null);
  };

  const handleCreateOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    setIsCreatingOrg(true);
    setCreateOrgError(null);

    const domainsList = newOrgDomains
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);

    try {
      const payload: api.CreateOrganizationRequest = {
        name: newOrgName.trim(),
        domains: domainsList,
        initialOrgAdminUserId: newOrgInitialAdminId.trim() || undefined,
      };

      await api.adminCreateOrganization(payload, token || undefined);
      setGlobalMessage({
        type: 'success',
        text: `Organization "${newOrgName}" created successfully!`,
      });
      setTimeout(() => setGlobalMessage(null), 5000);

      setIsCreateOrgModalOpen(false);
      setNewOrgName('');
      setNewOrgDomains('');
      setNewOrgInitialAdminId('');
      loadOrganizations();
    } catch (err: any) {
      setCreateOrgError(err.message || 'Failed to create organization');
    } finally {
      setIsCreatingOrg(false);
    }
  };

  const handleDeleteOrg = async (org: api.OrganizationDto) => {
    if (!window.confirm(`Are you sure you want to delete organization "${org.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.adminDeleteOrganization(org.id, token || undefined);
      setGlobalMessage({
        type: 'success',
        text: `Organization "${org.name}" was deleted successfully.`,
      });
      setTimeout(() => setGlobalMessage(null), 5000);
      loadOrganizations();
      if (selectedOrg?.id === org.id) {
        handleCloseOrgDetails();
      }
    } catch (err: any) {
      setGlobalMessage({
        type: 'error',
        text: err.message || 'Failed to delete organization',
      });
      setTimeout(() => setGlobalMessage(null), 5000);
    }
  };

  const handlePromoteOrgAdmin = async (userId: string) => {
    if (!selectedOrg) return;
    try {
      await api.adminAddOrgAdmin(selectedOrg.id, userId, token || undefined);
      setGlobalMessage({ type: 'success', text: 'User promoted to organization admin' });
      setTimeout(() => setGlobalMessage(null), 4000);
      loadOrgDetails(selectedOrg.id);
      loadOrganizations();
    } catch (err: any) {
      setOrgActionError(err.message || 'Failed to promote user');
    }
  };

  const handleDemoteOrgAdmin = async (userId: string) => {
    if (!selectedOrg) return;
    try {
      await api.adminRemoveOrgAdmin(selectedOrg.id, userId, token || undefined);
      setGlobalMessage({ type: 'success', text: 'User demoted from organization admin' });
      setTimeout(() => setGlobalMessage(null), 4000);
      loadOrgDetails(selectedOrg.id);
      loadOrganizations();
    } catch (err: any) {
      setOrgActionError(err.message || 'Failed to demote user');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedOrg) return;
    if (!window.confirm('Are you sure you want to remove this member from the organization?')) return;
    try {
      await api.adminRemoveOrgMember(selectedOrg.id, userId, token || undefined);
      setGlobalMessage({ type: 'success', text: 'Member removed from organization' });
      setTimeout(() => setGlobalMessage(null), 4000);
      loadOrgDetails(selectedOrg.id);
      loadOrganizations();
    } catch (err: any) {
      setOrgActionError(err.message || 'Failed to remove member');
    }
  };

  const handleApproveJoin = async (requestId: string) => {
    if (!selectedOrg) return;
    try {
      await api.adminApprovePendingMember(selectedOrg.id, requestId, token || undefined);
      setGlobalMessage({ type: 'success', text: 'Join request approved' });
      setTimeout(() => setGlobalMessage(null), 4000);
      loadOrgDetails(selectedOrg.id);
      loadOrganizations();
    } catch (err: any) {
      setOrgActionError(err.message || 'Failed to approve join request');
    }
  };

  const handleRejectJoin = async (requestId: string) => {
    if (!selectedOrg) return;
    try {
      await api.adminRejectPendingMember(selectedOrg.id, requestId, token || undefined);
      setGlobalMessage({ type: 'success', text: 'Join request rejected' });
      setTimeout(() => setGlobalMessage(null), 4000);
      loadOrgDetails(selectedOrg.id);
    } catch (err: any) {
      setOrgActionError(err.message || 'Failed to reject join request');
    }
  };

  const handleBuySeats = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;
    setIsPurchasingSeats(true);
    setOrgActionError(null);
    try {
      await api.adminOrgBulkCheckout(
        selectedOrg.id,
        {
          plan: bulkPlan,
          seatCount: bulkSeats,
          billingInterval: bulkInterval,
        },
        token || undefined
      );
      setGlobalMessage({
        type: 'success',
        text: `Successfully purchased ${bulkSeats} ${bulkPlan} corporate seats!`,
      });
      setTimeout(() => setGlobalMessage(null), 5000);
      loadOrgDetails(selectedOrg.id);
      loadOrganizations();
    } catch (err: any) {
      setOrgActionError(err.message || 'Failed to purchase corporate seats');
    } finally {
      setIsPurchasingSeats(false);
    }
  };

  const handleAssignSeat = async (poolId: string) => {
    if (!selectedOrg || !assignTargetUserId) return;
    setIsAssigningSeat(true);
    setOrgActionError(null);
    try {
      await api.adminAssignOrgSeat(selectedOrg.id, poolId, assignTargetUserId, token || undefined);
      setGlobalMessage({ type: 'success', text: 'Corporate license seat assigned successfully' });
      setTimeout(() => setGlobalMessage(null), 4000);
      setAssignTargetUserId('');
      loadOrgDetails(selectedOrg.id);
      loadOrganizations();
    } catch (err: any) {
      setOrgActionError(err.message || 'Failed to assign corporate seat');
    } finally {
      setIsAssigningSeat(false);
    }
  };

  const handleUnassignSeat = async (poolId: string, userId: string) => {
    if (!selectedOrg) return;
    try {
      await api.adminUnassignOrgSeat(selectedOrg.id, poolId, userId, token || undefined);
      setGlobalMessage({ type: 'success', text: 'Corporate license seat unassigned' });
      setTimeout(() => setGlobalMessage(null), 4000);
      loadOrgDetails(selectedOrg.id);
      loadOrganizations();
    } catch (err: any) {
      setOrgActionError(err.message || 'Failed to unassign corporate seat');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers(searchQuery);
  };

  const handleOpenAssignModal = (targetUser: api.AdminUser) => {
    setSelectedUser(targetUser);
    setSelectedPlan(targetUser.license?.plan === 'FREE' ? 'PRO' : (targetUser.license?.plan as any) || 'PRO');

    if (targetUser.license?.validUntil) {
      const expiry = new Date(targetUser.license.validUntil);
      const now = new Date();
      const diffDays = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 31 && diffDays >= 28) {
        setExpiryOption('30d');
      } else if (diffDays <= 92 && diffDays >= 88) {
        setExpiryOption('90d');
      } else if (diffDays <= 367 && diffDays >= 360) {
        setExpiryOption('1y');
      } else {
        setExpiryOption('custom');
        setCustomDate(expiry.toISOString().split('T')[0]);
      }
    } else {
      setExpiryOption('30d');
      setCustomDate('');
    }

    setModalError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setModalError(null);
  };

  const handleAssignLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsSubmitting(true);
    setModalError(null);

    let calculatedValidUntil: string | null = null;
    if (selectedPlan === 'FREE') {
      calculatedValidUntil = null;
    } else if (expiryOption === '30d') {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      calculatedValidUntil = d.toISOString();
    } else if (expiryOption === '90d') {
      const d = new Date();
      d.setDate(d.getDate() + 90);
      calculatedValidUntil = d.toISOString();
    } else if (expiryOption === '1y') {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      calculatedValidUntil = d.toISOString();
    } else if (expiryOption === 'lifetime') {
      calculatedValidUntil = null;
    } else if (expiryOption === 'custom') {
      if (!customDate) {
        setModalError('Please select a valid custom expiration date');
        setIsSubmitting(false);
        return;
      }
      const customExpiry = new Date(customDate);
      customExpiry.setHours(23, 59, 59, 999);
      calculatedValidUntil = customExpiry.toISOString();
    }

    try {
      await api.adminAssignLicense(
        selectedUser.id,
        {
          plan: selectedPlan,
          validUntil: calculatedValidUntil,
        },
        token || undefined
      );

      notifyLicenseUpdated();
      if (user?.profile?.sub === selectedUser.id) {
        refreshEntitlements(true);
      }

      setGlobalMessage({
        type: 'success',
        text: `Successfully assigned ${selectedPlan} license to ${
          selectedUser.email || selectedUser.username
        }!`,
      });
      setTimeout(() => setGlobalMessage(null), 5000);

      handleCloseModal();
      loadUsers();
    } catch (err: any) {
      setModalError(err.message || 'Failed to assign license');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeLicense = async () => {
    if (!selectedUser) return;
    if (!window.confirm(`Are you sure you want to revoke the license for ${selectedUser.email}? They will be reverted to the FREE plan.`)) {
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    try {
      await api.adminRevokeLicense(selectedUser.id, token || undefined);

      notifyLicenseUpdated();
      if (user?.profile?.sub === selectedUser.id) {
        refreshEntitlements(true);
      }

      setGlobalMessage({
        type: 'success',
        text: `License revoked for ${selectedUser.email}. Reverted to FREE plan.`,
      });
      setTimeout(() => setGlobalMessage(null), 5000);

      handleCloseModal();
      loadUsers();
    } catch (err: any) {
      setModalError(err.message || 'Failed to revoke license');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || isCheckingRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-sm font-medium">Verifying admin privileges...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-2xl shadow-xl p-8 text-center dark:bg-slate-900 dark:border-red-900/50">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Access Denied</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            You need the <span className="font-semibold text-red-600 dark:text-red-400">admin</span> role to access the Admin Console. Please contact your administrator if you believe this is an error.
          </p>
          <button
            onClick={() => navigate('/board')}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-5 rounded-lg text-sm transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Whiteboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col dark:bg-slate-950 dark:text-slate-100">
      {/* Admin Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/board"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-md dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Whiteboard
            </Link>

            <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700" />

            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                <Shield className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">Admin Console</h1>
                <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-700 border border-purple-200 uppercase tracking-wide dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-900/50">
                  Admin
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <UserContextMenu />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Global Notification Banner */}
        {globalMessage && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between gap-3 border shadow-xs animate-in fade-in ${
              globalMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {globalMessage.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
              )}
              <span className="text-sm font-medium">{globalMessage.text}</span>
            </div>
            <button
              onClick={() => setGlobalMessage(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="h-4 w-4" />
            Users & Licenses
            <span
              className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === 'users' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {users.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('organizations')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'organizations'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
            }`}
          >
            <Building className="h-4 w-4" />
            Organizations
            <span
              className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === 'organizations' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {organizations.length}
            </span>
          </button>
        </div>

        {/* TAB 1: USERS & LICENSES */}
        {activeTab === 'users' && (
          <UsersTab
            users={users}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onSearchSubmit={handleSearchSubmit}
            onRefresh={loadUsers}
            isLoading={isLoadingUsers}
            error={searchError}
            onOpenAssignModal={handleOpenAssignModal}
          />
        )}

        {/* TAB 2: ORGANIZATIONS */}
        {activeTab === 'organizations' && (
          <OrganizationsTab
            organizations={organizations}
            searchQuery={orgSearchQuery}
            onSearchQueryChange={setOrgSearchQuery}
            onRefresh={loadOrganizations}
            isLoading={isLoadingOrgs}
            error={orgsError}
            onOpenCreateModal={() => setIsCreateOrgModalOpen(true)}
            onOpenOrgDetails={handleOpenOrgDetails}
            onDeleteOrg={handleDeleteOrg}
          />
        )}
      </main>

      {/* CREATE ORGANIZATION MODAL */}
      <CreateOrganizationModal
        isOpen={isCreateOrgModalOpen}
        name={newOrgName}
        onNameChange={setNewOrgName}
        domains={newOrgDomains}
        onDomainsChange={setNewOrgDomains}
        initialAdminId={newOrgInitialAdminId}
        onInitialAdminIdChange={setNewOrgInitialAdminId}
        users={users}
        isCreating={isCreatingOrg}
        error={createOrgError}
        onClose={() => setIsCreateOrgModalOpen(false)}
        onSubmit={handleCreateOrgSubmit}
      />

      {/* ORGANIZATION DETAIL DRAWER */}
      <OrganizationDetailDrawer
        selectedOrg={selectedOrg}
        activeTab={orgDetailTab}
        onTabChange={setOrgDetailTab}
        members={orgMembers}
        pendingRequests={orgPendingRequests}
        licensePools={orgLicensePools}
        isLoading={isLoadingOrgDetails}
        error={orgActionError}
        bulkPlan={bulkPlan}
        onBulkPlanChange={setBulkPlan}
        bulkSeats={bulkSeats}
        onBulkSeatsChange={setBulkSeats}
        bulkInterval={bulkInterval}
        onBulkIntervalChange={setBulkInterval}
        isPurchasingSeats={isPurchasingSeats}
        onBuySeats={handleBuySeats}
        assignTargetUserId={assignTargetUserId}
        onAssignTargetUserIdChange={setAssignTargetUserId}
        isAssigningSeat={isAssigningSeat}
        onAssignSeat={handleAssignSeat}
        onUnassignSeat={handleUnassignSeat}
        onPromoteAdmin={handlePromoteOrgAdmin}
        onDemoteAdmin={handleDemoteOrgAdmin}
        onRemoveMember={handleRemoveMember}
        onApproveJoin={handleApproveJoin}
        onRejectJoin={handleRejectJoin}
        onClose={handleCloseOrgDetails}
      />

      {/* ASSIGN LICENSE MODAL */}
      <AssignLicenseModal
        isOpen={isModalOpen}
        selectedUser={selectedUser}
        selectedPlan={selectedPlan}
        onSelectPlan={setSelectedPlan}
        expiryOption={expiryOption}
        onSelectExpiryOption={setExpiryOption}
        customDate={customDate}
        onCustomDateChange={setCustomDate}
        isSubmitting={isSubmitting}
        error={modalError}
        onClose={handleCloseModal}
        onSubmit={handleAssignLicense}
        onRevoke={handleRevokeLicense}
      />
    </div>
  );
};

export default AdminConsole;
