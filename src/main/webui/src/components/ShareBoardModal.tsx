import React, { useState, useEffect } from 'react';
import * as api from '@/lib/api';
import { getUserColor } from '@/lib/useWhiteboardCollab';
import { 
  X, 
  Users, 
  UserPlus, 
  Shield, 
  Trash2, 
  Check, 
  Clock, 
  AlertCircle,
  LogOut,
  Mail,
  Copy,
  Link as LinkIcon
} from 'lucide-react';

interface ShareBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  boardName: string;
  currentUserRole: api.BoardRole;
  currentUserId: string;
  onLeaveBoard?: () => void;
  initialTab?: 'members' | 'requests';
}

export function ShareBoardModal({
  isOpen,
  onClose,
  boardId,
  boardName,
  currentUserRole,
  currentUserId,
  onLeaveBoard,
  initialTab = 'members',
}: ShareBoardModalProps) {
  const [activeTab, setActiveTab] = useState<'members' | 'requests'>(initialTab);
  const [collaborators, setCollaborators] = useState<api.CollaboratorInfo[]>([]);
  const [accessRequests, setAccessRequests] = useState<api.AccessRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteRole, setInviteRole] = useState<api.BoardRole>('EDITOR');
  const [searchResults, setSearchResults] = useState<api.UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const boardUrl = `${window.location.origin}/board/${boardId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(boardUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback
    }
  };

  const canManage = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  useEffect(() => {
    const q = inviteQuery.trim();
    if (!q || !canManage) {
      setSearchResults([]);
      setIsSearching(false);
      setShowDropdown(false);
      return;
    }

    let isCancelled = false;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await api.searchUsers(q);
        if (!isCancelled) {
          setSearchResults(results);
          setShowDropdown(results.length > 0);
        }
      } catch {
        if (!isCancelled) {
          setSearchResults([]);
        }
      } finally {
        if (!isCancelled) {
          setIsSearching(false);
        }
      }
    }, 200);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [inviteQuery, canManage]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const collabs = await api.getCollaborators(boardId);
      setCollaborators(collabs);

      if (canManage) {
        try {
          const reqs = await api.getAccessRequests(boardId);
          setAccessRequests(reqs.filter((r) => r.status === 'PENDING'));
        } catch {
          // ignore if non-admin
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load collaborator data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      loadData();
    }
  }, [isOpen, boardId, currentUserRole, initialTab]);

  if (!isOpen) return null;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteQuery.trim()) return;

    setIsInviting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await api.addCollaborator(boardId, inviteQuery.trim(), inviteRole);
      setInviteQuery('');
      setSuccessMessage(`Collaborator '${inviteQuery.trim()}' added successfully!`);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to add collaborator');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: api.BoardRole) => {
    try {
      await api.updateCollaboratorRole(boardId, userId, newRole);
      setSuccessMessage('Collaborator role updated.');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
    }
  };

  const handleRemoveCollaborator = async (userId: string, isSelf: boolean = false) => {
    if (!window.confirm(isSelf ? 'Are you sure you want to leave this whiteboard?' : 'Remove access for this collaborator?')) {
      return;
    }

    try {
      await api.removeCollaborator(boardId, userId);
      if (isSelf) {
        onLeaveBoard?.();
        onClose();
      } else {
        setSuccessMessage('Collaborator access removed.');
        await loadData();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to remove collaborator');
    }
  };

  const handleApproveRequest = async (requestId: string, roleToAssign?: api.BoardRole) => {
    try {
      await api.approveAccessRequest(boardId, requestId, roleToAssign);
      setSuccessMessage('Access request approved.');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to approve request');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await api.rejectAccessRequest(boardId, requestId);
      setSuccessMessage('Access request declined.');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to reject request');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Share Whiteboard</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[280px]">
                {boardName} • Your role: <span className="text-blue-600 dark:text-blue-400 font-semibold">{currentUserRole}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invite Bar (Owners and Admins only) */}
        {canManage && (
          <div className="p-5 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
            <form onSubmit={handleInvite} className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={inviteQuery}
                    onChange={(e) => setInviteQuery(e.target.value)}
                    onFocus={() => {
                      if (searchResults.length > 0) setShowDropdown(true);
                    }}
                    onBlur={() => {
                      // Small timeout to allow clicking dropdown items
                      setTimeout(() => setShowDropdown(false), 200);
                    }}
                    placeholder="Search users by email or username..."
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg pl-3 pr-2 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />

                  {/* Dropdown for user search results */}
                  {showDropdown && searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          onMouseDown={() => {
                            setInviteQuery(user.email || user.username);
                            setShowDropdown(false);
                          }}
                          className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              style={{ backgroundColor: getUserColor(user.id || user.email) }}
                              className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-white text-[10px] uppercase shrink-0"
                            >
                              {(user.username || user.email || 'U').slice(0, 2)}
                            </div>
                            <div className="truncate">
                              <span className="text-slate-900 dark:text-slate-100 font-medium">{user.username}</span>
                              {user.email && (
                                <span className="text-slate-500 dark:text-slate-400 text-[11px] ml-1.5 font-normal">
                                  ({user.email})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as api.BoardRole)}
                  className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition-colors shrink-0"
                >
                  <option value="VIEWER">Viewer</option>
                  <option value="EDITOR">Editor</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <button
                  type="submit"
                  disabled={isInviting || !inviteQuery.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {isInviting ? 'Adding...' : 'Invite'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Share Link Section */}
        <div className="p-4 bg-slate-50/70 dark:bg-slate-950/30 border-b border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Whiteboard Link
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              You can also send this link to another user to invite them
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={boardUrl}
              onFocus={(e) => e.target.select()}
              className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 select-all focus:outline-none focus:border-blue-500 font-mono"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status messages */}
        {error && (
          <div className="mx-5 mt-3 p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMessage && (
          <div className="mx-5 mt-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs rounded-lg flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tab Navigation (for Admins/Owners) */}
        {canManage && (
          <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 pt-2">
            <button
              onClick={() => setActiveTab('members')}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'members'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              Collaborators ({collaborators.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'requests'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <span>Pending Requests</span>
              {accessRequests.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                  {accessRequests.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500">Loading members...</div>
          ) : activeTab === 'members' || !canManage ? (
            collaborators.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500">No collaborators added yet.</div>
            ) : (
              collaborators.map((c) => {
                const isOwner = c.role === 'OWNER';
                const isCurrentUser = c.userId === currentUserId;
                const userColor = getUserColor(c.userId || c.userEmail);

                return (
                  <div
                    key={c.userId}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        style={{ backgroundColor: userColor }}
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-xs uppercase"
                      >
                        {(c.username || c.userEmail || 'U').slice(0, 2)}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span>{c.username || c.userEmail}</span>
                          {isCurrentUser && (
                            <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.2 rounded font-normal">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                          {c.userEmail}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isOwner ? (
                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 flex items-center gap-1">
                          <Shield className="w-3 h-3" /> Owner
                        </span>
                      ) : canManage ? (
                        <>
                          <select
                            value={c.role}
                            onChange={(e) => handleRoleChange(c.userId, e.target.value as api.BoardRole)}
                            className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
                          >
                            <option value="VIEWER">Viewer</option>
                            <option value="EDITOR">Editor</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                          <button
                            onClick={() => handleRemoveCollaborator(c.userId, isCurrentUser)}
                            title="Remove Access"
                            className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {c.role}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )
          ) : (
            accessRequests.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500 flex flex-col items-center gap-2">
                <Clock className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                <span>No pending access requests.</span>
              </div>
            ) : (
              accessRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {req.username} <span className="text-slate-500 dark:text-slate-400 font-normal">({req.userEmail})</span>
                      </div>
                      <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium mt-0.5">
                        Requested: {req.requestedRole}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>

                  {req.message && (
                    <div className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 p-2 rounded-lg italic">
                      "{req.message}"
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => handleRejectRequest(req.id)}
                      className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleApproveRequest(req.id, req.requestedRole)}
                      className="px-3 py-1 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve as {req.requestedRole}
                    </button>
                  </div>
                </div>
              ))
            )
          )}
        </div>

        {/* Footer (Leave board option for non-owners) */}
        {!canManage && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
            <span className="text-xs text-slate-500 dark:text-slate-400">Collaborator View</span>
            <button
              onClick={() => handleRemoveCollaborator(currentUserId, true)}
              className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1.5 transition-colors font-medium px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Leave Board
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
