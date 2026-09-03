import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

export type GridStyle = 'none' | 'grid';
export type CanvasTheme = 'slate' | 'white' | 'lightSlate' | 'warm';

export interface CanvasConfig {
  gridStyle: GridStyle;
  theme: CanvasTheme;
  snapToGrid: boolean;
  showCollaboratorCursors: boolean;
  showPeerLabels: boolean;
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
  initialTab?: 'general' | 'canvas' | 'collaboration' | 'danger';
}

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
  initialTab = 'general',
}: WhiteboardConfigModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'canvas' | 'collaboration' | 'danger'>(initialTab);
  const [editedName, setEditedName] = useState(boardName);
  const [isSavingName, setIsSavingName] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Confirmation states for danger zone
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canManage = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  useEffect(() => {
    if (isOpen) {
      setEditedName(boardName);
      setActiveTab(initialTab);
      setError(null);
      setSuccessMessage(null);
      setConfirmClear(false);
      setConfirmDelete(false);
    }
  }, [isOpen, boardName, initialTab]);

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="config-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 id="config-modal-title" className="font-bold text-slate-900 text-base">
                Whiteboard Settings
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-[280px]">
                {boardName} • Your role: <span className="text-blue-600 font-semibold">{currentUserRole}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-5 pt-2 gap-1 overflow-x-auto bg-slate-50/50">
          <button
            onClick={() => setActiveTab('general')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'general'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>General</span>
          </button>
          <button
            onClick={() => setActiveTab('canvas')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'canvas'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <GridIcon className="w-3.5 h-3.5" />
            <span>Canvas & View</span>
          </button>
          <button
            onClick={() => setActiveTab('collaboration')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'collaboration'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Collaboration</span>
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
          <div className="mx-5 mt-3 p-2.5 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMessage && (
          <div className="mx-5 mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* GENERAL TAB */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <form onSubmit={handleSaveName} className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-xs font-semibold text-slate-700">
                  Board Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    disabled={!canManage || isSavingName}
                    placeholder="Enter board name..."
                    className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500 transition-colors"
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
                  <p className="text-[11px] text-slate-500">
                    Only board owners and admins can rename this board.
                  </p>
                )}
              </form>

              {/* Board Metadata */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  Board Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Board ID</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-slate-800 bg-white border border-slate-200 px-2 py-1 rounded text-[11px] truncate max-w-[170px]">
                        {boardId}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyBoardId}
                        title="Copy ID"
                        className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-200 transition-colors cursor-pointer"
                      >
                        {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[11px] block">Your Permission</span>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                        <Shield className="w-3 h-3" /> {currentUserRole}
                      </span>
                    </div>
                  </div>

                  {createdAt && (
                    <div>
                      <span className="text-slate-500 text-[11px] block">Created</span>
                      <span className="text-slate-700 text-[11px] flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(createdAt).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {updatedAt && (
                    <div>
                      <span className="text-slate-500 text-[11px] block">Last Modified</span>
                      <span className="text-slate-700 text-[11px] flex items-center gap-1 mt-0.5">
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
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <GridIcon className="w-3.5 h-3.5 text-blue-600" />
                    Grid Style
                  </span>
                  <span className="text-[11px] text-slate-500">Choose canvas grid pattern</span>
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
                            ? 'bg-blue-50 border-blue-500 shadow-xs ring-1 ring-blue-500'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-semibold text-xs text-slate-900">{option.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{option.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Canvas Theme */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-blue-600" />
                    Canvas Background Theme
                  </span>
                  <span className="text-[11px] text-slate-500">Color mood & contrast</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {(
                    [
                      { id: 'slate', label: 'Default Slate', colorBg: 'bg-slate-50', border: 'border-slate-200' },
                      { id: 'white', label: 'Clean White', colorBg: 'bg-white', border: 'border-slate-200' },
                      { id: 'lightSlate', label: 'Light Slate', colorBg: 'bg-slate-100', border: 'border-slate-300' },
                      { id: 'warm', label: 'Warm Paper', colorBg: 'bg-amber-50', border: 'border-amber-200' },
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
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div
                          className={`w-full h-8 rounded-md ${theme.colorBg} ${theme.border} border shadow-inner flex items-center justify-center`}
                        >
                          {isSelected && (
                            <Check
                              className="w-4 h-4 text-blue-600"
                            />
                          )}
                        </div>
                        <span className="text-[11px] font-medium text-slate-800 text-center">
                          {theme.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Snapping */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Magnet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Snap to Grid</div>
                    <div className="text-[11px] text-slate-500">
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
                    canvasConfig.snapToGrid ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      canvasConfig.snapToGrid ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
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
        <div className="p-4 border-t border-slate-200 flex justify-end items-center bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
