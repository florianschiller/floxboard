import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useEntitlements } from '@/lib/entitlementContext';
import { Loader2, Users, Building } from 'lucide-react';

import { useAdminRoleCheck } from './hooks/useAdminRoleCheck';
import { useAdminUsers } from './hooks/useAdminUsers';
import { useAdminOrganizations } from './hooks/useAdminOrganizations';

import { AdminHeader } from './AdminHeader';
import { AdminAccessDenied } from './AdminAccessDenied';
import { AdminNotificationBanner } from './AdminNotificationBanner';
import { UsersTab } from './UsersTab';
import { AssignLicenseModal } from './AssignLicenseModal';
import { OrganizationsTab } from './OrganizationsTab';
import { CreateOrganizationModal } from './CreateOrganizationModal';
import { OrganizationDetailDrawer } from './OrganizationDetailDrawer';

export const AdminConsole: React.FC = () => {
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const { refreshEntitlements } = useEntitlements();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'users' | 'organizations'>('users');
  const [globalMessage, setGlobalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Role check
  const { isAdmin, isCheckingRole } = useAdminRoleCheck({
    user,
    token,
    isAuthLoading,
  });

  // Users management
  const usersState = useAdminUsers({
    token,
    currentUser: user,
    refreshEntitlements,
    onGlobalMessage: setGlobalMessage,
  });

  // Organizations management
  const orgsState = useAdminOrganizations({
    token,
    users: usersState.users,
    onGlobalMessage: setGlobalMessage,
  });

  // Initial load when admin confirmed
  useEffect(() => {
    if (isAdmin) {
      usersState.loadUsers();
      orgsState.loadOrganizations();
    }
  }, [isAdmin]);

  if (isCheckingRole) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Verifying administrative privileges...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <AdminAccessDenied />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col dark:bg-slate-950 dark:text-slate-100">
      {/* Admin Header */}
      <AdminHeader />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Global Notification Banner */}
        <AdminNotificationBanner
          message={globalMessage}
          onClose={() => setGlobalMessage(null)}
        />

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
              {usersState.users.length}
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
              {orgsState.organizations.length}
            </span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'users' ? (
          <UsersTab
            users={usersState.users}
            searchQuery={usersState.searchQuery}
            onSearchQueryChange={usersState.setSearchQuery}
            onSearchSubmit={usersState.handleSearchSubmit}
            onRefresh={() => usersState.loadUsers()}
            isLoading={usersState.isLoadingUsers}
            error={usersState.searchError}
            onOpenAssignModal={usersState.handleOpenAssignModal}
          />
        ) : (
          <OrganizationsTab
            searchQuery={orgsState.orgSearchQuery}
            setSearchQuery={orgsState.setOrgSearchQuery}
            isLoading={orgsState.isLoadingOrgs}
            error={orgsState.orgsError}
            organizations={orgsState.organizations}
            onOpenCreateModal={() => orgsState.setIsCreateOrgModalOpen(true)}
            onSelectOrg={orgsState.handleOpenOrgDetails}
            onDeleteOrg={orgsState.handleDeleteOrg}
          />
        )}
      </main>

      {/* Assign License Modal */}
      <AssignLicenseModal
        isOpen={usersState.isModalOpen}
        selectedUser={usersState.selectedUser}
        selectedPlan={usersState.selectedPlan}
        onSelectPlan={usersState.setSelectedPlan}
        expiryOption={usersState.expiryOption}
        onSelectExpiryOption={usersState.setExpiryOption}
        customDate={usersState.customDate}
        onCustomDateChange={usersState.setCustomDate}
        isSubmitting={usersState.isSubmitting}
        error={usersState.modalError}
        onClose={usersState.handleCloseModal}
        onSubmit={usersState.handleAssignLicense}
        onRevoke={usersState.handleRevokeLicense}
      />

      {/* Create Organization Modal */}
      <CreateOrganizationModal
        isOpen={orgsState.isCreateOrgModalOpen}
        name={orgsState.newOrgName}
        onNameChange={orgsState.setNewOrgName}
        domains={orgsState.newOrgDomains}
        onDomainsChange={orgsState.setNewOrgDomains}
        initialAdminId={orgsState.newOrgInitialAdminId}
        onInitialAdminIdChange={orgsState.setNewOrgInitialAdminId}
        users={usersState.users}
        isCreating={orgsState.isCreatingOrg}
        error={orgsState.createOrgError}
        onClose={() => orgsState.setIsCreateOrgModalOpen(false)}
        onSubmit={orgsState.handleCreateOrgSubmit}
      />

      {/* Organization Detail Drawer */}
      <OrganizationDetailDrawer
        organization={orgsState.selectedOrg}
        onClose={orgsState.handleCloseOrgDetails}
        activeTab={orgsState.orgDetailTab}
        setActiveTab={orgsState.setOrgDetailTab}
        members={orgsState.orgMembers}
        pendingRequests={orgsState.orgPendingRequests}
        licensePools={orgsState.orgLicensePools}
        isLoading={orgsState.isLoadingOrgDetails}
        error={orgsState.orgActionError}
        users={usersState.users}
        bulkPlan={orgsState.bulkPlan}
        setBulkPlan={orgsState.setBulkPlan}
        bulkSeats={orgsState.bulkSeats}
        setBulkSeats={orgsState.setBulkSeats}
        bulkInterval={orgsState.bulkInterval}
        setBulkInterval={orgsState.setBulkInterval}
        isPurchasingSeats={orgsState.isPurchasingSeats}
        onBuySeats={orgsState.handleBuySeats}
        assignTargetUserId={orgsState.assignTargetUserId}
        setAssignTargetUserId={orgsState.setAssignTargetUserId}
        isAssigningSeat={orgsState.isAssigningSeat}
        onAssignSeat={orgsState.handleAssignSeat}
        onUnassignSeat={orgsState.handleUnassignSeat}
        onPromoteAdmin={orgsState.handlePromoteOrgAdmin}
        onDemoteAdmin={orgsState.handleDemoteOrgAdmin}
        onRemoveMember={orgsState.handleRemoveMember}
        onApproveJoin={orgsState.handleApproveJoin}
        onRejectJoin={orgsState.handleRejectJoin}
      />
    </div>
  );
};
export default AdminConsole;
