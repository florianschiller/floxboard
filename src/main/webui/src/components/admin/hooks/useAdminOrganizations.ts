import { useState, useEffect } from 'react';
import * as api from '@/lib/api';

export interface UseAdminOrganizationsProps {
  token: string | null;
  users: api.AdminUser[];
  onGlobalMessage: (msg: { type: 'success' | 'error'; text: string } | null) => void;
}

export function useAdminOrganizations({
  token,
  users,
  onGlobalMessage,
}: UseAdminOrganizationsProps) {
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

  // Set default initial org admin when users are available
  useEffect(() => {
    if (users.length > 0 && !newOrgInitialAdminId) {
      setNewOrgInitialAdminId(users[0].id);
    }
  }, [users, newOrgInitialAdminId]);

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
      onGlobalMessage({
        type: 'success',
        text: `Organization "${newOrgName}" created successfully!`,
      });
      setTimeout(() => onGlobalMessage(null), 5000);

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
      onGlobalMessage({
        type: 'success',
        text: `Organization "${org.name}" was deleted successfully.`,
      });
      setTimeout(() => onGlobalMessage(null), 5000);
      loadOrganizations();
      if (selectedOrg?.id === org.id) {
        handleCloseOrgDetails();
      }
    } catch (err: any) {
      onGlobalMessage({
        type: 'error',
        text: err.message || 'Failed to delete organization',
      });
      setTimeout(() => onGlobalMessage(null), 5000);
    }
  };

  const handlePromoteOrgAdmin = async (userId: string) => {
    if (!selectedOrg) return;
    try {
      await api.adminAddOrgAdmin(selectedOrg.id, userId, token || undefined);
      onGlobalMessage({ type: 'success', text: 'User promoted to organization admin' });
      setTimeout(() => onGlobalMessage(null), 4000);
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
      onGlobalMessage({ type: 'success', text: 'User demoted from organization admin' });
      setTimeout(() => onGlobalMessage(null), 4000);
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
      onGlobalMessage({ type: 'success', text: 'Member removed from organization' });
      setTimeout(() => onGlobalMessage(null), 4000);
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
      onGlobalMessage({ type: 'success', text: 'Join request approved' });
      setTimeout(() => onGlobalMessage(null), 4000);
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
      onGlobalMessage({ type: 'success', text: 'Join request rejected' });
      setTimeout(() => onGlobalMessage(null), 4000);
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
      onGlobalMessage({
        type: 'success',
        text: `Successfully purchased ${bulkSeats} ${bulkPlan} corporate seats!`,
      });
      setTimeout(() => onGlobalMessage(null), 5000);
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
      onGlobalMessage({ type: 'success', text: 'Corporate license seat assigned successfully' });
      setTimeout(() => onGlobalMessage(null), 4000);
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
      onGlobalMessage({ type: 'success', text: 'Corporate license seat unassigned' });
      setTimeout(() => onGlobalMessage(null), 4000);
      loadOrgDetails(selectedOrg.id);
      loadOrganizations();
    } catch (err: any) {
      setOrgActionError(err.message || 'Failed to unassign corporate seat');
    }
  };

  return {
    organizations,
    setOrganizations,
    orgSearchQuery,
    setOrgSearchQuery,
    isLoadingOrgs,
    orgsError,
    loadOrganizations,
    isCreateOrgModalOpen,
    setIsCreateOrgModalOpen,
    newOrgName,
    setNewOrgName,
    newOrgDomains,
    setNewOrgDomains,
    newOrgInitialAdminId,
    setNewOrgInitialAdminId,
    isCreatingOrg,
    createOrgError,
    handleCreateOrgSubmit,
    selectedOrg,
    orgDetailTab,
    setOrgDetailTab,
    orgMembers,
    orgPendingRequests,
    orgLicensePools,
    isLoadingOrgDetails,
    orgActionError,
    handleOpenOrgDetails,
    handleCloseOrgDetails,
    handleDeleteOrg,
    handlePromoteOrgAdmin,
    handleDemoteOrgAdmin,
    handleRemoveMember,
    handleApproveJoin,
    handleRejectJoin,
    bulkPlan,
    setBulkPlan,
    bulkSeats,
    setBulkSeats,
    bulkInterval,
    setBulkInterval,
    isPurchasingSeats,
    handleBuySeats,
    assignTargetUserId,
    setAssignTargetUserId,
    isAssigningSeat,
    handleAssignSeat,
    handleUnassignSeat,
  };
}
