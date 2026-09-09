import React, { useState, useEffect, useCallback } from 'react';
import * as api from '@/lib/api';
import { useEntitlements } from '@/lib/entitlementContext';
import {
  History,
  X,
  Plus,
  RotateCcw,
  Eye,
  EyeOff,
  GitFork,
  Check,
  AlertTriangle,
  Clock,
  Lock,
  Loader2,
  Sparkles,
  GitCommit,
  Layers,
  ArrowRight
} from 'lucide-react';

export interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  boardName: string;
  currentUserRole: api.BoardRole;
  currentUserId: string;
  onRestoreSnapshot?: (snapshot: api.WhiteboardSnapshot) => Promise<void> | void;
  onPreviewSnapshot?: (snapshot: api.WhiteboardSnapshot | null) => void;
  previewSnapshotId?: string | null;
  onForkSuccess?: (newBoardId: string) => void;
  onOpenUpgradeModal?: () => void;
}

export function HistoryDrawer({
  isOpen,
  onClose,
  boardId,
  boardName,
  currentUserRole,
  currentUserId,
  onRestoreSnapshot,
  onPreviewSnapshot,
  previewSnapshotId,
  onForkSuccess,
  onOpenUpgradeModal,
}: HistoryDrawerProps) {
  const { hasFeature, loading: entitlementsLoading } = useEntitlements();
  const isEntitled = hasFeature('whiteboard:version_history');

  const [snapshots, setSnapshots] = useState<api.WhiteboardSnapshotSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Snapshot creation form state
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');
  const [snapshotDescription, setSnapshotDescription] = useState('');
  const [isSubmittingSnapshot, setIsSubmittingSnapshot] = useState(false);

  // Restore confirmation state
  const [restoreConfirmSnapshot, setRestoreConfirmSnapshot] = useState<api.WhiteboardSnapshotSummary | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Fork modal state
  const [forkSnapshotItem, setForkSnapshotItem] = useState<api.WhiteboardSnapshotSummary | null>(null);
  const [forkBoardName, setForkBoardName] = useState('');
  const [isForking, setIsForking] = useState(false);

  // Preview loading
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);

  const canEdit = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN' || currentUserRole === 'EDITOR';

  const fetchSnapshots = useCallback(async (clearError = true) => {
    if (!isOpen || !boardId || !isEntitled) return;
    setIsLoading(true);
    if (clearError) {
      setError(null);
    }
    try {
      const data = await api.listSnapshots(boardId, 0, 50);
      setSnapshots(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load version history');
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, boardId, isEntitled]);

  useEffect(() => {
    if (isOpen) {
      if (isEntitled) {
        fetchSnapshots();
      }
      setSuccessMessage(null);
      setError(null);
      setIsCreatingSnapshot(false);
      setRestoreConfirmSnapshot(null);
      setForkSnapshotItem(null);
    }
  }, [isOpen, isEntitled, fetchSnapshots]);

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || isSubmittingSnapshot) return;

    setIsSubmittingSnapshot(true);
    setError(null);
    try {
      await api.createSnapshot(boardId, {
        name: snapshotName.trim() || undefined,
        description: snapshotDescription.trim() || undefined,
      });
      setSnapshotName('');
      setSnapshotDescription('');
      setIsCreatingSnapshot(false);
      setSuccessMessage('Checkpoint snapshot created successfully!');
      setTimeout(() => setSuccessMessage(null), 3500);
      await fetchSnapshots();
    } catch (err: any) {
      setError(err.message || 'Failed to create snapshot');
    } finally {
      setIsSubmittingSnapshot(false);
    }
  };

  const handleTogglePreview = async (summary: api.WhiteboardSnapshotSummary) => {
    if (!onPreviewSnapshot) return;

    if (previewSnapshotId === summary.id) {
      onPreviewSnapshot(null);
      return;
    }

    setLoadingPreviewId(summary.id);
    setError(null);
    try {
      const fullSnapshot = await api.getSnapshot(boardId, summary.id);
      onPreviewSnapshot(fullSnapshot);
    } catch (err: any) {
      const is404 = err?.status === 404 || err?.message?.includes('404') || err?.message?.toLowerCase().includes('not found');
      if (is404) {
        if (onPreviewSnapshot && previewSnapshotId === summary.id) {
          onPreviewSnapshot(null);
        }
        await fetchSnapshots(false);
        setError(`Snapshot is no longer available (it may have been deleted or pruned). Refreshing history...`);
      } else {
        setError(err.message || 'Failed to load preview');
      }
    } finally {
      setLoadingPreviewId(null);
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreConfirmSnapshot || !canEdit || isRestoring) return;

    setIsRestoring(true);
    setError(null);
    try {
      const fullSnapshot = await api.getSnapshot(boardId, restoreConfirmSnapshot.id);
      await api.restoreSnapshot(boardId, restoreConfirmSnapshot.id);
      if (onRestoreSnapshot) {
        await onRestoreSnapshot(fullSnapshot);
      }
      setRestoreConfirmSnapshot(null);
      if (onPreviewSnapshot) {
        onPreviewSnapshot(null);
      }
      setSuccessMessage('Whiteboard successfully restored to snapshot!');
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchSnapshots();
    } catch (err: any) {
      const is404 = err?.status === 404 || err?.message?.includes('404') || err?.message?.toLowerCase().includes('not found');
      if (is404) {
        setRestoreConfirmSnapshot(null);
        await fetchSnapshots(false);
        setError('Snapshot no longer exists. Refreshing history...');
      } else {
        setError(err.message || 'Failed to restore whiteboard snapshot');
      }
    } finally {
      setIsRestoring(false);
    }
  };

  const handleOpenFork = (summary: api.WhiteboardSnapshotSummary) => {
    setForkSnapshotItem(summary);
    setForkBoardName(`${boardName} (Fork)`);
    setError(null);
  };

  const handleConfirmFork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forkSnapshotItem || isForking) return;
    const nameToFork = forkBoardName.trim();
    if (!nameToFork) return;

    setIsForking(true);
    setError(null);
    try {
      const forkedBoard = await api.forkSnapshot(boardId, forkSnapshotItem.id, {
        name: nameToFork,
      });
      setForkSnapshotItem(null);
      onClose();
      if (onForkSuccess && forkedBoard.id) {
        onForkSuccess(forkedBoard.id);
      }
    } catch (err: any) {
      const is404 = err?.status === 404 || err?.message?.includes('404') || err?.message?.toLowerCase().includes('not found');
      if (is404) {
        setForkSnapshotItem(null);
        await fetchSnapshots(false);
        setError('Snapshot no longer exists. Refreshing history...');
      } else {
        setError(err.message || 'Failed to fork whiteboard');
      }
    } finally {
      setIsForking(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/30 dark:bg-slate-950/60 backdrop-blur-xs flex justify-end">
      {/* Drawer Container */}
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 transition-all transform animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-label="Version History"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                Version History
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
                {boardName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close history drawer"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner messages */}
        {error && (
          <div className="mx-4 mt-3 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mx-4 mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 text-xs rounded-lg flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <div className="flex-1 font-medium">{successMessage}</div>
          </div>
        )}

        {/* Feature Gate Fallback if plan doesn't include Version History */}
        {!entitlementsLoading && !isEntitled ? (
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
              <Lock className="w-7 h-7" />
            </div>
            <div className="space-y-1.5 max-w-xs">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Unlock Version History
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Point-in-time snapshots, visual timeline inspection, one-click rollbacks, and branch forking are available on <span className="font-semibold text-indigo-600 dark:text-indigo-400">PRO</span>, <span className="font-semibold text-indigo-600 dark:text-indigo-400">TEAM</span>, and <span className="font-semibold text-indigo-600 dark:text-indigo-400">ENTERPRISE</span> plans.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                if (onOpenUpgradeModal) {
                  onOpenUpgradeModal();
                }
              }}
              className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Upgrade Plan
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto flex flex-col p-4 space-y-4">
            {/* Create Snapshot Action */}
            {canEdit && (
              <div>
                {!isCreatingSnapshot ? (
                  <button
                    onClick={() => setIsCreatingSnapshot(true)}
                    className="w-full py-2.5 px-3 border border-dashed border-indigo-300 dark:border-indigo-800/80 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-4 h-4" />
                    Create Named Checkpoint
                  </button>
                ) : (
                  <form
                    onSubmit={handleCreateSnapshot}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <GitCommit className="w-3.5 h-3.5 text-indigo-500" />
                        New Checkpoint Snapshot
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsCreatingSnapshot(false)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={snapshotName}
                        onChange={(e) => setSnapshotName(e.target.value)}
                        placeholder="Milestone name (e.g., Sprint 1 Final Architecture)"
                        className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        autoFocus
                      />
                    </div>
                    <div>
                      <textarea
                        value={snapshotDescription}
                        onChange={(e) => setSnapshotDescription(e.target.value)}
                        placeholder="Optional milestone notes..."
                        rows={2}
                        className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsCreatingSnapshot(false)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingSnapshot}
                        className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        {isSubmittingSnapshot ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Save Checkpoint'
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Preview Banner if Active */}
            {previewSnapshotId && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="font-medium">Previewing historic revision</span>
                </div>
                <button
                  onClick={() => onPreviewSnapshot && onPreviewSnapshot(null)}
                  className="px-2 py-1 text-2xs font-semibold bg-amber-200/60 dark:bg-amber-900/60 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-100 rounded-md transition-colors cursor-pointer"
                >
                  Exit Preview
                </button>
              </div>
            )}

            {/* Timeline List */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between text-2xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
                <span>Revision History ({snapshots.length})</span>
                {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
              </div>

              {isLoading && snapshots.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  <span className="text-xs">Loading revisions...</span>
                </div>
              ) : snapshots.length === 0 ? (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                  No snapshots recorded yet.
                </div>
              ) : (
                <div className="relative pl-4 border-l-2 border-slate-200 dark:border-slate-800 space-y-4 ml-2">
                  {snapshots.map((item, idx) => {
                    const isPreviewing = previewSnapshotId === item.id;
                    const isLatest = idx === 0;

                    return (
                      <div key={item.id} className="relative group">
                        {/* Timeline node icon */}
                        <div
                          className={`absolute -left-[23px] top-1.5 w-3.5 h-3.5 rounded-full border-2 bg-white dark:bg-slate-900 transition-colors ${
                            isPreviewing
                              ? 'border-amber-500 bg-amber-500'
                              : isLatest
                              ? 'border-indigo-500 bg-indigo-500'
                              : 'border-slate-300 dark:border-slate-700'
                          }`}
                        />

                        {/* Snapshot card */}
                        <div
                          className={`p-3.5 rounded-xl border transition-all text-xs ${
                            isPreviewing
                              ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80 shadow-xs'
                              : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {item.isAutomatic ? (
                                  <span className="text-2xs px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                    Auto
                                  </span>
                                ) : (
                                  <span className="text-2xs px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-medium">
                                    Milestone
                                  </span>
                                )}
                                {item.isGeneratedByAI && (
                                  <span className="text-2xs px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    AI
                                  </span>
                                )}
                                {isLatest && (
                                  <span className="text-2xs px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-medium">
                                    Current
                                  </span>
                                )}
                              </div>
                              <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs truncate">
                                {item.name || 'Snapshot'}
                              </h4>
                              {item.description && (
                                <p className="text-slate-500 dark:text-slate-400 text-2xs line-clamp-2 leading-relaxed">
                                  {item.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 text-2xs text-slate-400 dark:text-slate-500 pt-0.5">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDate(item.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action Toolbar */}
                          <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            {/* Preview Button */}
                            {onPreviewSnapshot && (
                              <button
                                onClick={() => handleTogglePreview(item)}
                                disabled={loadingPreviewId === item.id}
                                className={`px-2.5 py-1 rounded-lg text-2xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                                  isPreviewing
                                    ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                                title={isPreviewing ? 'Exit Preview' : 'Preview this revision'}
                              >
                                {loadingPreviewId === item.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : isPreviewing ? (
                                  <>
                                    <EyeOff className="w-3 h-3" />
                                    Stop
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-3 h-3" />
                                    Preview
                                  </>
                                )}
                              </button>
                            )}

                            {/* Fork Button */}
                            <button
                              onClick={() => handleOpenFork(item)}
                              className="px-2.5 py-1 rounded-lg text-2xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Fork this snapshot into a new standalone whiteboard"
                            >
                              <GitFork className="w-3 h-3" />
                              Fork
                            </button>

                            {/* Restore Button */}
                            {canEdit && (
                              <button
                                onClick={() => setRestoreConfirmSnapshot(item)}
                                className="px-2.5 py-1 rounded-lg text-2xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer"
                                title="Rollback whiteboard to this revision state"
                              >
                                <RotateCcw className="w-3 h-3" />
                                Restore
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Restore Confirmation Modal */}
      {restoreConfirmSnapshot && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4 text-slate-900 dark:text-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">
                  Restore to snapshot?
                </h3>
                <p className="text-2xs text-slate-500 dark:text-slate-400">
                  {restoreConfirmSnapshot.name || 'Checkpoint'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Restoring will overwrite current whiteboard contents with this snapshot state across all active collaborator sessions. A new checkpoint will be created to preserve the current state.
            </p>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRestoreConfirmSnapshot(null)}
                disabled={isRestoring}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                {isRestoring ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  'Confirm Restore'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fork Snapshot Modal */}
      {forkSnapshotItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4 text-slate-900 dark:text-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <GitFork className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Fork Snapshot</h3>
                <p className="text-2xs text-slate-500 dark:text-slate-400">
                  Branch from {forkSnapshotItem.name || 'Snapshot'}
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmFork} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Whiteboard Name
                </label>
                <input
                  type="text"
                  value={forkBoardName}
                  onChange={(e) => setForkBoardName(e.target.value)}
                  placeholder="Enter new whiteboard name..."
                  className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setForkSnapshotItem(null)}
                  disabled={isForking}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isForking || !forkBoardName.trim()}
                  className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {isForking ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Forking...
                    </>
                  ) : (
                    'Create Fork'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
