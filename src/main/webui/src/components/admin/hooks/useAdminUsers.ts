import { useState } from 'react';
import * as api from '@/lib/api';
import { notifyLicenseUpdated } from '@/lib/entitlementContext';

export interface UseAdminUsersProps {
  token: string | null;
  currentUser: any;
  refreshEntitlements: (force?: boolean) => void;
  onGlobalMessage: (msg: { type: 'success' | 'error'; text: string } | null) => void;
}

export function useAdminUsers({
  token,
  currentUser,
  refreshEntitlements,
  onGlobalMessage,
}: UseAdminUsersProps) {
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
      if (currentUser?.profile?.sub === selectedUser.id) {
        refreshEntitlements(true);
      }

      onGlobalMessage({
        type: 'success',
        text: `Successfully assigned ${selectedPlan} license to ${
          selectedUser.email || selectedUser.username
        }!`,
      });
      setTimeout(() => onGlobalMessage(null), 5000);

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
      if (currentUser?.profile?.sub === selectedUser.id) {
        refreshEntitlements(true);
      }

      onGlobalMessage({
        type: 'success',
        text: `Revoked license for ${selectedUser.email || selectedUser.username}.`,
      });
      setTimeout(() => onGlobalMessage(null), 5000);

      handleCloseModal();
      loadUsers();
    } catch (err: any) {
      setModalError(err.message || 'Failed to revoke license');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    users,
    setUsers,
    searchQuery,
    setSearchQuery,
    isLoadingUsers,
    searchError,
    loadUsers,
    handleSearchSubmit,
    selectedUser,
    isModalOpen,
    selectedPlan,
    setSelectedPlan,
    expiryOption,
    setExpiryOption,
    customDate,
    setCustomDate,
    isSubmitting,
    modalError,
    handleOpenAssignModal,
    handleCloseModal,
    handleAssignLicense,
    handleRevokeLicense,
  };
}
