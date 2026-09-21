import React, { useState, useEffect, useRef } from 'react';
import * as api from '@/lib/api';
import {
  X,
  Settings,
  Sliders,
  Users,
  AlertTriangle,
  Check,
  AlertCircle,
  Copy,
  Trash2,
  Eraser,
  Grid as GridIcon,
  Palette,
  Shield,
  MousePointer,
  Tag,
  Magnet,
  Calendar,
  Layers,
  ThumbsUp,
  Plus,
  Edit2,
  Lock,
  Unlock,
  RotateCcw,
  Sparkles,
  Library,
} from 'lucide-react';
import { PREBUILT_STENCIL_COLLECTIONS } from '@/lib/prebuiltStencils';
import {
  WhiteboardVotingConfig,
  VotingCategory,
  DEFAULT_VOTING_CONFIG,
} from '@/types/voting';

export type GridStyle = 'none' | 'grid';
export type CanvasTheme = 'slate' | 'white' | 'lightSlate' | 'warm';

export interface CanvasConfig {
  gridStyle: GridStyle;
  theme: CanvasTheme;
  snapToGrid: boolean;
  showCollaboratorCursors: boolean;
  showPeerLabels: boolean;
  allowedStencilCollections?: string[];
}

export interface WhiteboardConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  boardName: string;
  currentUserRole: api.BoardRole;
  createdAt?: string;
  updatedAt?: string;
  canvasConfig: CanvasConfig;
  onUpdateCanvasConfig: (config: CanvasConfig) => void;
  onRenameBoard: (newName: string) => Promise<void>;
  onClearCanvas: () => void;
  onDeleteBoard: () => void;
  votingConfig?: WhiteboardVotingConfig;
  onUpdateVotingConfig?: (config: WhiteboardVotingConfig) => void;
  onResetAllVotes?: () => void;
  initialTab?: 'general' | 'canvas' | 'collaboration' | 'voting' | 'danger';
}

const CATEGORY_PRESET_COLORS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
];

export function WhiteboardConfigModal({
  isOpen,
  onClose,
  boardId,
  boardName,
  currentUserRole,
  createdAt,
  updatedAt,
  canvasConfig,
  onUpdateCanvasConfig,
  onRenameBoard,
  onClearCanvas,
  onDeleteBoard,
  votingConfig = DEFAULT_VOTING_CONFIG,
  onUpdateVotingConfig,
  onResetAllVotes,
  initialTab = 'general',
}: WhiteboardConfigModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'canvas' | 'collaboration' | 'voting' | 'danger'>(initialTab);
  const [editedName, setEditedName] = useState(boardName);
  const [isSavingName, setIsSavingName] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Voting state
  const [localVotingConfig, setLocalVotingConfig] = useState<WhiteboardVotingConfig>(votingConfig);
  const [confirmResetVotes, setConfirmResetVotes] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryComment, setNewCategoryComment] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_PRESET_COLORS[0]);

  // Edit category state
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryComment, setEditCategoryComment] = useState('');
  const [editCategoryColor, setEditCategoryColor] = useState(CATEGORY_PRESET_COLORS[0]);

  // Confirmation states for danger zone
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canManage = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setActiveTab(initialTab);
      setError(null);
      setSuccessMessage(null);
      setConfirmClear(false);
      setConfirmDelete(false);
      setConfirmResetVotes(false);
      setIsAddingCategory(false);
      setEditingCategoryId(null);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (isOpen) {
      setEditedName(boardName);
    }
  }, [isOpen, boardName]);

  useEffect(() => {
    if (isOpen) {
      setLocalVotingConfig(votingConfig);
    }
  }, [isOpen, votingConfig]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyBoardId = async () => {
    try {
      await navigator.clipboard.writeText(boardId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = editedName.trim();
    if (!trimmed || trimmed === boardName || !canManage) return;

    setIsSavingName(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await onRenameBoard(trimmed);
      setSuccessMessage('Board name updated successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to rename board.');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleThemeChange = (theme: CanvasTheme) => {
    onUpdateCanvasConfig({
      ...canvasConfig,
      theme,
    });
  };

  const handleGridChange = (gridStyle: GridStyle) => {
    onUpdateCanvasConfig({
      ...canvasConfig,
      gridStyle,
    });
  };

  const handleToggleSnap = () => {
    onUpdateCanvasConfig({
      ...canvasConfig,
      snapToGrid: !canvasConfig.snapToGrid,
    });
  };

  const handleToggleCursors = () => {
    onUpdateCanvasConfig({
      ...canvasConfig,
      showCollaboratorCursors: !canvasConfig.showCollaboratorCursors,
    });
  };

  const handleTogglePeerLabels = () => {
    onUpdateCanvasConfig({
      ...canvasConfig,
      showPeerLabels: !canvasConfig.showPeerLabels,
    });
  };

  const handleToggleCollection = (collectionId: string) => {
    const allCollectionIds = PREBUILT_STENCIL_COLLECTIONS.map((c) => c.id);
    let currentAllowed = canvasConfig.allowedStencilCollections;
    if (!currentAllowed || currentAllowed.length === 0) {
      currentAllowed = [...allCollectionIds];
    }

    let nextAllowed: string[];
    if (currentAllowed.includes(collectionId)) {
      nextAllowed = currentAllowed.filter((id) => id !== collectionId);
    } else {
      nextAllowed = [...currentAllowed, collectionId];
    }

    onUpdateCanvasConfig({
      ...canvasConfig,
      allowedStencilCollections: nextAllowed,
    });
  };

  const handleConfirmClearCanvas = () => {
    onClearCanvas();
    setConfirmClear(false);
    setSuccessMessage('Canvas shapes have been cleared.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleConfirmDeleteBoard = () => {
    onDeleteBoard();
    setConfirmDelete(false);
  };

  // Voting Handlers
  const handleUpdateVoting = (newConfig: WhiteboardVotingConfig) => {
    setLocalVotingConfig(newConfig);
    onUpdateVotingConfig?.(newConfig);
  };

  const handleToggleVotingLock = () => {
    if (!canManage) return;
    const isLocked = !localVotingConfig.isLocked;
    const updated: WhiteboardVotingConfig = {
      ...localVotingConfig,
      isLocked,
    };
    handleUpdateVoting(updated);
    setSuccessMessage(isLocked ? 'Voting session is now locked.' : 'Voting session is now open.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleMaxVotesChange = (val: number) => {
    if (!canManage) return;
    const clamped = Math.max(1, Math.min(20, isNaN(val) ? 5 : val));
    const updated: WhiteboardVotingConfig = {
      ...localVotingConfig,
      maxVotesPerUser: clamped,
    };
    handleUpdateVoting(updated);
  };

  const handleToggleAllowDuplicateVotes = () => {
    if (!canManage) return;
    const allowDuplicateVotes = !(localVotingConfig.allowDuplicateVotes ?? true);
    const updated: WhiteboardVotingConfig = {
      ...localVotingConfig,
      allowDuplicateVotes,
    };
    handleUpdateVoting(updated);
    setSuccessMessage(
      allowDuplicateVotes
        ? 'Duplicate votes on the same shape are now permitted.'
        : 'Duplicate votes on the same shape are now restricted.'
    );
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleStartAddCategory = () => {
    setIsAddingCategory(true);
    setNewCategoryName('');
    setNewCategoryComment('');
    setNewCategoryColor(CATEGORY_PRESET_COLORS[localVotingConfig.categories.length % CATEGORY_PRESET_COLORS.length]);
  };

  const handleSaveNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name || !canManage) return;

    const comment = newCategoryComment.trim();
    const newCategory: VotingCategory = {
      id: `cat-${Date.now()}`,
      name,
      color: newCategoryColor,
      comment: comment || name,
      description: comment || name,
    };

    const updated: WhiteboardVotingConfig = {
      ...localVotingConfig,
      categories: [...localVotingConfig.categories, newCategory],
    };

    handleUpdateVoting(updated);
    setIsAddingCategory(false);
    setNewCategoryName('');
    setNewCategoryComment('');
    setSuccessMessage(`Added category "${name}".`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleStartEditCategory = (cat: VotingCategory) => {
    setEditingCategoryId(cat.id);
    setEditCategoryName(cat.name);
    setEditCategoryComment(cat.comment || cat.description || '');
    setEditCategoryColor(cat.color);
  };

  const handleSaveEditCategory = (catId: string) => {
    const name = editCategoryName.trim();
    if (!name || !canManage) return;

    const comment = editCategoryComment.trim();
    const updatedCategories = localVotingConfig.categories.map((c) =>
      c.id === catId
        ? {
            ...c,
            name,
            color: editCategoryColor,
            comment: comment || name,
            description: comment || name,
          }
        : c
    );

    const updated: WhiteboardVotingConfig = {
      ...localVotingConfig,
      categories: updatedCategories,
    };

    handleUpdateVoting(updated);
    setEditingCategoryId(null);
    setSuccessMessage(`Updated category "${name}".`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDeleteCategory = (catId: string) => {
    if (!canManage) return;
    if (localVotingConfig.categories.length <= 1) {
      setError('At least one voting category must be maintained.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const updated: WhiteboardVotingConfig = {
      ...localVotingConfig,
      categories: localVotingConfig.categories.filter((c) => c.id !== catId),
    };

    handleUpdateVoting(updated);
    setSuccessMessage('Category deleted.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleConfirmResetVotes = () => {
    onResetAllVotes?.();
    setConfirmResetVotes(false);
    setSuccessMessage('All shape votes have been reset.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="config-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 id="config-modal-title" className="font-bold text-slate-900 dark:text-slate-100 text-base">
                Whiteboard Settings
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[280px]">
                {boardName} • Your role: <span className="text-blue-600 dark:text-blue-400 font-semibold">{currentUserRole}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 pt-2 gap-1 overflow-x-auto bg-slate-50/50 dark:bg-slate-950/50">
          <button
            onClick={() => setActiveTab('general')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'general'
                ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>General</span>
          </button>
          <button
            onClick={() => setActiveTab('canvas')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'canvas'
                ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <GridIcon className="w-3.5 h-3.5" />
            <span>Canvas & View</span>
          </button>
          <button
            onClick={() => setActiveTab('collaboration')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'collaboration'
                ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Collaboration</span>
          </button>
          <button
            onClick={() => setActiveTab('voting')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'voting'
                ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>Voting & Facilitation</span>
          </button>
          <button
            onClick={() => setActiveTab('danger')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'danger'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-400 hover:text-red-500'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Danger Zone</span>
          </button>
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

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* GENERAL TAB */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <form onSubmit={handleSaveName} className="space-y-3 bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Board Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    disabled={!canManage || isSavingName}
                    placeholder="Enter board name..."
                    className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-500 transition-colors"
                  />
                  {canManage && (
                    <button
                      type="submit"
                      disabled={isSavingName || !editedName.trim() || editedName.trim() === boardName}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors shadow-xs cursor-pointer shrink-0"
                    >
                      {isSavingName ? 'Saving...' : 'Rename'}
                    </button>
                  )}
                </div>
                {!canManage && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Only board owners and admins can rename this board.
                  </p>
                )}
              </form>

              {/* Board Metadata */}
              <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  Board Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Board ID</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded text-[11px] truncate max-w-[170px]">
                        {boardId}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyBoardId}
                        title="Copy ID"
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Your Permission</span>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 flex items-center gap-1">
                        <Shield className="w-3 h-3" /> {currentUserRole}
                      </span>
                    </div>
                  </div>

                  {createdAt && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Created</span>
                      <span className="text-slate-700 dark:text-slate-300 text-[11px] flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(createdAt).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {updatedAt && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Last Modified</span>
                      <span className="text-slate-700 dark:text-slate-300 text-[11px] flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(updatedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CANVAS & VIEW TAB */}
          {activeTab === 'canvas' && (
            <div className="space-y-4">
              {/* Grid Mode */}
              <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <GridIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Grid Style
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Choose canvas grid pattern</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  {(
                    [
                      { id: 'none', label: 'None', desc: 'Blank background' },
                      { id: 'grid', label: 'Grid', desc: 'Lined grid squares' },
                    ] as const
                  ).map((option) => {
                    const isSelected = canvasConfig.gridStyle === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleGridChange(option.id)}
                        className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 shadow-xs ring-1 ring-blue-500'
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">{option.label}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{option.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Canvas Theme */}
              <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Canvas Background Theme
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Color mood & contrast</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {(
                    [
                      { id: 'slate', label: 'Default Slate', colorBg: 'bg-slate-50 dark:bg-slate-900', border: 'border-slate-200 dark:border-slate-700' },
                      { id: 'white', label: 'Clean White', colorBg: 'bg-white dark:bg-slate-950', border: 'border-slate-200 dark:border-slate-700' },
                      { id: 'lightSlate', label: 'Light Slate', colorBg: 'bg-slate-100 dark:bg-slate-800', border: 'border-slate-300 dark:border-slate-700' },
                      { id: 'warm', label: 'Warm Paper', colorBg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-900/50' },
                    ] as const
                  ).map((theme) => {
                    const isSelected = canvasConfig.theme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => handleThemeChange(theme.id)}
                        className={`p-2.5 rounded-lg border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-blue-600 border-blue-600 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-950'
                        }`}
                      >
                        <div
                          className={`w-full h-8 rounded-md ${theme.colorBg} ${theme.border} border shadow-inner flex items-center justify-center`}
                        >
                          {isSelected && (
                            <Check
                              className="w-4 h-4 text-blue-600 dark:text-blue-400"
                            />
                          )}
                        </div>
                        <span className="text-[11px] font-medium text-slate-800 dark:text-slate-200 text-center">
                          {theme.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Snapping */}
              <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Magnet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">Snap to Grid</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Snap shapes and lines to grid points when dragging
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={canvasConfig.snapToGrid}
                  onClick={handleToggleSnap}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    canvasConfig.snapToGrid ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      canvasConfig.snapToGrid ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Shape Library Collections Configuration */}
              <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Library className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Allowed Stencil Collections
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Select which shape libraries are permitted on this whiteboard
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 space-y-2">
                  {PREBUILT_STENCIL_COLLECTIONS.map((col) => {
                    const isAllowed =
                      !canvasConfig.allowedStencilCollections ||
                      canvasConfig.allowedStencilCollections.length === 0 ||
                      canvasConfig.allowedStencilCollections.includes(col.id);

                    return (
                      <label
                        key={col.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                            {col.name}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            {col.stencils.length} stencils &bull; {col.categories.join(', ')}
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isAllowed}
                          onChange={() => handleToggleCollection(col.id)}
                          className="w-4 h-4 rounded text-blue-600 border-slate-300 dark:border-slate-700 focus:ring-blue-500 cursor-pointer"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* COLLABORATION TAB */}
          {activeTab === 'collaboration' && (
            <div className="space-y-4">
              {/* Show Remote Cursors */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <MousePointer className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Live Collaborator Cursors</div>
                    <div className="text-[11px] text-slate-500">
                      Display real-time cursor positions of other users
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={canvasConfig.showCollaboratorCursors}
                  onClick={handleToggleCursors}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    canvasConfig.showCollaboratorCursors ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      canvasConfig.showCollaboratorCursors ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Show Peer Name Labels */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Collaborator Name Badges</div>
                    <div className="text-[11px] text-slate-500">
                      Show participant names next to their active pointers
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={canvasConfig.showPeerLabels}
                  onClick={handleTogglePeerLabels}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    canvasConfig.showPeerLabels ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      canvasConfig.showPeerLabels ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* VOTING & FACILITATION TAB */}
          {activeTab === 'voting' && (
            <div className="space-y-4">
              {/* Session Status & Lock */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    localVotingConfig.isLocked ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {localVotingConfig.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                      <span>Voting Session Status</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        localVotingConfig.isLocked
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}>
                        {localVotingConfig.isLocked ? 'Locked (Read-Only)' : 'Active (Voting Open)'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {localVotingConfig.isLocked
                        ? 'Voting is locked. Participants cannot cast or remove votes.'
                        : 'Participants can cast dot-votes on shapes and sticky notes.'}
                    </div>
                  </div>
                </div>
                {canManage && (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!localVotingConfig.isLocked}
                    aria-label="Toggle Voting Session Lock"
                    onClick={handleToggleVotingLock}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      !localVotingConfig.isLocked ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        !localVotingConfig.isLocked ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                )}
              </div>

              {/* Per-User Vote Allocation Limit */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-blue-600" />
                      Per-User Vote Limit
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Maximum number of dot-votes each participant can cast (1–20)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={20}
                      disabled={!canManage}
                      value={localVotingConfig.maxVotesPerUser}
                      onChange={(e) => handleMaxVotesChange(parseInt(e.target.value, 10))}
                      aria-label="Max Votes Per User"
                      className="w-16 text-center font-bold text-xs bg-white border border-slate-300 rounded-lg py-1.5 text-slate-900 focus:outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                    />
                    <span className="text-xs text-slate-500 font-medium">votes / user</span>
                  </div>
                </div>
              </div>

              {/* Allow Duplicate Votes Toggle */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Copy className="w-3.5 h-3.5 text-blue-600" />
                    Allow Duplicate Votes
                  </span>
                  <p className="text-[11px] text-slate-500">
                    {(localVotingConfig.allowDuplicateVotes ?? true)
                      ? 'Participants can cast multiple votes on the same shape.'
                      : 'Participants can cast at most one vote per shape.'}
                  </p>
                </div>
                {canManage && (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={localVotingConfig.allowDuplicateVotes ?? true}
                    aria-label="Toggle Allow Duplicate Votes"
                    onClick={handleToggleAllowDuplicateVotes}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      (localVotingConfig.allowDuplicateVotes ?? true) ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        (localVotingConfig.allowDuplicateVotes ?? true) ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                )}
              </div>

              {/* Category Definitions CRUD */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      Voting Categories ({localVotingConfig.categories.length})
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Define category criteria with color tags and explanatory criteria comments
                    </p>
                  </div>
                  {canManage && !isAddingCategory && (
                    <button
                      type="button"
                      onClick={handleStartAddCategory}
                      className="px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Category
                    </button>
                  )}
                </div>

                {/* Add Category Form */}
                {isAddingCategory && (
                  <form onSubmit={handleSaveNewCategory} className="bg-white p-3.5 rounded-lg border border-blue-200 space-y-3">
                    <div className="text-xs font-semibold text-slate-800">New Voting Category</div>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Category Name *</label>
                        <input
                          type="text"
                          placeholder="e.g. High Priority, Feasibility, Quick Win..."
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Explanatory Comment / Criteria *</label>
                        <input
                          type="text"
                          placeholder="e.g. Highest business value / urgent focus..."
                          value={newCategoryComment}
                          onChange={(e) => setNewCategoryComment(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Badge Color</label>
                        <div className="flex items-center gap-2 flex-wrap">
                          {CATEGORY_PRESET_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setNewCategoryColor(c)}
                              style={{ backgroundColor: c }}
                              className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                                newCategoryColor === c ? 'border-slate-900 scale-110 shadow-xs' : 'border-white'
                              }`}
                            />
                          ))}
                          <input
                            type="color"
                            value={newCategoryColor}
                            onChange={(e) => setNewCategoryColor(e.target.value)}
                            className="w-7 h-7 p-0 border border-slate-300 rounded cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setIsAddingCategory(false)}
                        className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!newCategoryName.trim()}
                        className="px-3 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md transition-colors shadow-xs cursor-pointer"
                      >
                        Add Category
                      </button>
                    </div>
                  </form>
                )}

                {/* Category List */}
                <div className="space-y-2">
                  {localVotingConfig.categories.map((cat) => {
                    const isEditing = editingCategoryId === cat.id;

                    if (isEditing) {
                      return (
                        <div key={cat.id} className="bg-white p-3 rounded-lg border border-blue-300 space-y-2">
                          <div className="space-y-2">
                            <div>
                              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Category Name</label>
                              <input
                                type="text"
                                value={editCategoryName}
                                onChange={(e) => setEditCategoryName(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-900"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Explanatory Comment</label>
                              <input
                                type="text"
                                value={editCategoryComment}
                                onChange={(e) => setEditCategoryComment(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-900"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-600 font-medium">Color:</span>
                              {CATEGORY_PRESET_COLORS.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => setEditCategoryColor(c)}
                                  style={{ backgroundColor: c }}
                                  className={`w-5 h-5 rounded-full border-2 cursor-pointer ${
                                    editCategoryColor === c ? 'border-slate-900 scale-110' : 'border-white'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingCategoryId(null)}
                              className="px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditCategory(cat.id)}
                              className="px-2.5 py-0.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={cat.id}
                        className="bg-white p-3 rounded-lg border border-slate-200 flex items-start justify-between gap-3 shadow-2xs hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 mt-0.5 shadow-2xs"
                            style={{ backgroundColor: cat.color }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-xs text-slate-900 flex items-center gap-2">
                              <span>{cat.name}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 break-words">
                              {cat.comment || cat.description || 'No description provided'}
                            </div>
                          </div>
                        </div>

                        {canManage && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditCategory(cat)}
                              aria-label={`Edit ${cat.name}`}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat.id)}
                              disabled={localVotingConfig.categories.length <= 1}
                              aria-label={`Delete ${cat.name}`}
                              className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-slate-400 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Facilitator Reset Votes */}
              {canManage && (
                <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                        Reset All Votes
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Clears all shape votes and dot tallies across the entire canvas for all participants.
                      </p>
                    </div>
                  </div>

                  {confirmResetVotes ? (
                    <div className="pt-2 border-t border-amber-200 flex items-center justify-between gap-2">
                      <span className="text-xs text-amber-800 font-medium">Are you sure? This cannot be undone.</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmResetVotes(false)}
                          className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmResetVotes}
                          className="px-3 py-1 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-colors shadow-xs cursor-pointer"
                        >
                          Yes, Reset All Votes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmResetVotes(true)}
                      className="px-3 py-1.5 text-xs font-semibold text-amber-700 border border-amber-300 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                    >
                      Reset All Votes
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* DANGER ZONE TAB */}
          {activeTab === 'danger' && (
            <div className="space-y-4">
              {!canManage ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
                  <span>
                    You must be a board <strong>Owner</strong> or <strong>Admin</strong> to perform destructive actions.
                  </span>
                </div>
              ) : (
                <>
                  {/* Clear Canvas */}
                  <div className="bg-red-50/50 p-4 rounded-xl border border-red-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Eraser className="w-3.5 h-3.5 text-red-600" />
                          Clear All Canvas Shapes
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Removes all shapes, lines, frames, and drawings from this board canvas.
                        </p>
                      </div>
                    </div>

                    {confirmClear ? (
                      <div className="pt-2 border-t border-red-200 flex items-center justify-between gap-2">
                        <span className="text-xs text-red-700 font-medium">Are you sure? This cannot be undone.</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setConfirmClear(false)}
                            className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleConfirmClearCanvas}
                            className="px-3 py-1 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors shadow-xs cursor-pointer"
                          >
                            Yes, Clear Canvas
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmClear(true)}
                        className="px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-300 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        Clear Canvas Shapes
                      </button>
                    )}
                  </div>

                  {/* Delete Board */}
                  <div className="bg-red-50/50 p-4 rounded-xl border border-red-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          Delete Whiteboard
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Permanently delete this whiteboard, including all collaboration data and shape history.
                        </p>
                      </div>
                    </div>

                    {confirmDelete ? (
                      <div className="pt-2 border-t border-red-200 flex items-center justify-between gap-2">
                        <span className="text-xs text-red-700 font-medium">
                          Are you completely sure? This is irreversible.
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(false)}
                            className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleConfirmDeleteBoard}
                            className="px-3 py-1 text-xs font-semibold bg-red-700 hover:bg-red-800 text-white rounded-md transition-colors shadow-xs cursor-pointer"
                          >
                            Yes, Delete Board
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(true)}
                        className="px-3 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-xs cursor-pointer"
                      >
                        Delete Whiteboard
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end items-center bg-slate-50 dark:bg-slate-950">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
