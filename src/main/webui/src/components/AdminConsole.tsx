import React, { useState, useEffect, useTransition } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useEntitlements, notifyLicenseUpdated } from '@/lib/entitlementContext';
import * as api from '@/lib/api';
import { UserContextMenu } from './UserContextMenu';
import {
  Shield,
  Search,
  Award,
  Sparkles,
  Calendar,
  User,
  RefreshCw,
  X,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Clock,
  Trash2,
  Check,
  Zap,
  Users,
  Building,
} from 'lucide-react';

export const AdminConsole: React.FC = () => {
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const { refreshEntitlements } = useEntitlements();
  const navigate = useNavigate();

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
  const [selectedPlan, setSelectedPlan] = useState<'FREE' | 'PRO' | 'TEAM' | 'ENTERPRISE'>('PRO');
  const [expiryOption, setExpiryOption] = useState<'30d' | '90d' | '1y' | 'lifetime' | 'custom'>('30d');
  const [customDate, setCustomDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [globalMessage, setGlobalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  // Load users when admin confirmed
  useEffect(() => {
    if (isAdmin) {
      loadUsers();
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers(searchQuery);
  };

  const handleOpenAssignModal = (targetUser: api.AdminUser) => {
    setSelectedUser(targetUser);
    const currentPlan = targetUser.license?.plan || 'FREE';
    setSelectedPlan(currentPlan === 'FREE' ? 'PRO' : currentPlan);

    // Initial expiry option based on current validUntil
    if (targetUser.license?.validUntil) {
      setExpiryOption('custom');
      const dateStr = new Date(targetUser.license.validUntil).toISOString().split('T')[0];
      setCustomDate(dateStr);
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

  const calculateValidUntil = (): string | null => {
    if (selectedPlan === 'FREE') return null;

    const now = new Date();
    if (expiryOption === '30d') {
      now.setDate(now.getDate() + 30);
      return now.toISOString();
    } else if (expiryOption === '90d') {
      now.setDate(now.getDate() + 90);
      return now.toISOString();
    } else if (expiryOption === '1y') {
      now.setFullYear(now.getFullYear() + 1);
      return now.toISOString();
    } else if (expiryOption === 'custom' && customDate) {
      const parsed = new Date(customDate);
      if (isNaN(parsed.getTime())) return null;
      parsed.setHours(23, 59, 59, 999);
      return parsed.toISOString();
    }
    return null; // lifetime
  };

  const handleAssignLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsSubmitting(true);
    setModalError(null);

    try {
      const validUntil = calculateValidUntil();
      await api.adminAssignLicense(
        selectedUser.id,
        {
          plan: selectedPlan,
          validUntil,
        },
        token || undefined
      );

      notifyLicenseUpdated(selectedUser.id);
      if (user?.profile?.sub === selectedUser.id) {
        refreshEntitlements(true);
      }

      setGlobalMessage({
        type: 'success',
        text: `Successfully assigned ${selectedPlan} license to ${selectedUser.email || selectedUser.username}!`,
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
    if (!window.confirm(`Are you sure you want to revoke the active license for ${selectedUser.email || selectedUser.username}?`)) {
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    try {
      await api.adminRevokeLicense(selectedUser.id, token || undefined);

      notifyLicenseUpdated(selectedUser.id);
      if (user?.profile?.sub === selectedUser.id) {
        refreshEntitlements(true);
      }

      setGlobalMessage({
        type: 'success',
        text: `License revoked for ${selectedUser.email || selectedUser.username}. Reverted to FREE plan.`,
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-sm font-medium">Verifying admin privileges...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-sm text-slate-600 mb-6">
            You need the <span className="font-semibold text-red-600">admin</span> role to access the Admin Console. Please contact your administrator if you believe this is an error.
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

  // Calculate statistics
  const totalUsers = users.length;
  const paidUsersCount = users.filter((u) => u.license && u.license.plan !== 'FREE').length;
  const freeUsersCount = totalUsers - paidUsersCount;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Admin Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/board"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-md"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Whiteboard
            </Link>

            <div className="h-4 w-[1px] bg-slate-200" />

            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                <Shield className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900">Admin Console</h1>
                <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-700 border border-purple-200 uppercase tracking-wide">
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
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
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
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

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

            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, or username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-8 py-2 text-xs focus:border-blue-500 focus:bg-white focus:outline-hidden transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      loadUsers('');
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoadingUsers}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium px-3.5 py-2 rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isLoadingUsers ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                Search
              </button>

              <button
                type="button"
                onClick={() => loadUsers(searchQuery)}
                disabled={isLoadingUsers}
                title="Refresh user list"
                className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingUsers ? 'animate-spin' : ''}`} />
              </button>
            </form>
          </div>

          {searchError && (
            <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{searchError}</span>
            </div>
          )}

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Roles</th>
                  <th className="py-3 px-4">Current Plan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Expires</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingUsers && users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        <span className="text-xs font-medium">Loading users...</span>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <User className="h-8 w-8 text-slate-300" />
                        <span className="text-sm font-medium text-slate-600">No users found</span>
                        <span className="text-xs text-slate-400">
                          {searchQuery ? `No matches for "${searchQuery}"` : 'No users available'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const initials = (u.firstName?.[0] || u.username?.[0] || u.email?.[0] || 'U').toUpperCase();
                    const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username;
                    const plan = u.license?.plan || 'FREE';
                    const status = u.license?.status || 'ACTIVE';
                    const isExpired = u.license?.isExpired || false;
                    const validUntilStr = u.license?.validUntil
                      ? new Date(u.license.validUntil).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'Lifetime / None';

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-[11px] text-white uppercase shadow-xs">
                              {initials}
                            </div>
                            <div className="overflow-hidden">
                              <span className="font-semibold text-slate-900 block truncate max-w-[140px]">
                                {fullName}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">@{u.username}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                          {u.email}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {u.roles && u.roles.length > 0 ? (
                              u.roles.map((r) => (
                                <span
                                  key={r}
                                  className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-md uppercase tracking-wider border ${
                                    r === 'admin'
                                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  {r}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-400">user</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                              plan === 'PRO'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : plan === 'TEAM'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : plan === 'ENTERPRISE'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <Sparkles className="h-3 w-3" />
                            {plan}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                              isExpired
                                ? 'text-amber-600'
                                : status === 'ACTIVE'
                                ? 'text-emerald-600'
                                : 'text-red-600'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isExpired
                                  ? 'bg-amber-500'
                                  : status === 'ACTIVE'
                                  ? 'bg-emerald-500'
                                  : 'bg-red-500'
                              }`}
                            />
                            {isExpired ? 'EXPIRED' : status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {validUntilStr}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleOpenAssignModal(u)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-xs cursor-pointer"
                          >
                            <Award className="h-3.5 w-3.5 text-slate-400" />
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
      </main>

      {/* Assign License Modal Dialog */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Award className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Assign License</h3>
                  <p className="text-xs text-slate-500">
                    Update subscription plan for <span className="font-semibold text-slate-800">{selectedUser.email || selectedUser.username}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAssignLicense} className="p-6 space-y-5">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* User Target Info Banner */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block">Target User ID</span>
                  <span className="font-mono text-[11px] text-slate-800 select-all">{selectedUser.id}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">Current Plan</span>
                  <span className="font-semibold text-blue-700">{selectedUser.license?.plan || 'FREE'}</span>
                </div>
              </div>

              {/* Plan Selection Cards */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Select Subscription Plan</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {/* FREE */}
                  <label
                    className={`border rounded-xl p-3 cursor-pointer transition-all flex flex-col justify-between ${
                      selectedPlan === 'FREE'
                        ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-900">FREE</span>
                      <input
                        type="radio"
                        name="plan"
                        value="FREE"
                        checked={selectedPlan === 'FREE'}
                        onChange={() => setSelectedPlan('FREE')}
                        className="text-blue-600"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      3 boards limit, 2 collaborators, basic PNG export.
                    </p>
                  </label>

                  {/* PRO */}
                  <label
                    className={`border rounded-xl p-3 cursor-pointer transition-all flex flex-col justify-between ${
                      selectedPlan === 'PRO'
                        ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1">
                        <Zap className="h-3 w-3 text-blue-600" />
                        <span className="text-xs font-bold text-slate-900">PRO</span>
                      </div>
                      <input
                        type="radio"
                        name="plan"
                        value="PRO"
                        checked={selectedPlan === 'PRO'}
                        onChange={() => setSelectedPlan('PRO')}
                        className="text-blue-600"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Unlimited boards, PDF export, AI diagram generation, 10 collaborators.
                    </p>
                  </label>

                  {/* TEAM */}
                  <label
                    className={`border rounded-xl p-3 cursor-pointer transition-all flex flex-col justify-between ${
                      selectedPlan === 'TEAM'
                        ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-900">TEAM</span>
                      </div>
                      <input
                        type="radio"
                        name="plan"
                        value="TEAM"
                        checked={selectedPlan === 'TEAM'}
                        onChange={() => setSelectedPlan('TEAM')}
                        className="text-indigo-600"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      50 collaborators, 5000 AI credits, version history & PDF export.
                    </p>
                  </label>

                  {/* ENTERPRISE */}
                  <label
                    className={`border rounded-xl p-3 cursor-pointer transition-all flex flex-col justify-between ${
                      selectedPlan === 'ENTERPRISE'
                        ? 'border-amber-600 bg-amber-50/50 ring-1 ring-amber-600'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1">
                        <Building className="h-3 w-3 text-amber-600" />
                        <span className="text-xs font-bold text-slate-900">ENTERPRISE</span>
                      </div>
                      <input
                        type="radio"
                        name="plan"
                        value="ENTERPRISE"
                        checked={selectedPlan === 'ENTERPRISE'}
                        onChange={() => setSelectedPlan('ENTERPRISE')}
                        className="text-amber-600"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Unlimited collaborators, audit logs, 50000 AI credits.
                    </p>
                  </label>
                </div>
              </div>

              {/* Expiration Settings (Only for Paid Plans) */}
              {selectedPlan !== 'FREE' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    License Duration & Expiration
                  </label>
                  <div className="grid grid-cols-4 gap-2 mb-2.5">
                    {[
                      { id: '30d', label: '30 Days' },
                      { id: '90d', label: '90 Days' },
                      { id: '1y', label: '1 Year' },
                      { id: 'lifetime', label: 'Lifetime' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setExpiryOption(opt.id as any)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          expiryOption === opt.id
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setExpiryOption('custom')}
                      className={`py-1 px-2.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        expiryOption === 'custom'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Custom Date
                    </button>
                    {expiryOption === 'custom' && (
                      <input
                        type="date"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 bg-white focus:outline-hidden focus:border-blue-500 flex-1"
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                {selectedUser.license && selectedUser.license.plan !== 'FREE' ? (
                  <button
                    type="button"
                    onClick={handleRevokeLicense}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg border border-red-200 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Revoke License
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={isSubmitting}
                    className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Assign License
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminConsole;
