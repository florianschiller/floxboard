import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Search,
  Copy,
  Trash2,
  Edit2,
  ChevronUp,
  ChevronDown,
  FileText,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { DgmPageMetadata } from '@/types/pages';

export interface PageSwitcherDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pages: DgmPageMetadata[];
  activePageId: string;
  isViewer?: boolean;
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
  onDuplicatePage: (pageId: string) => void;
  onRenamePage: (pageId: string, newName: string) => void;
  onReorderPages: (startIndex: number, endIndex: number) => void;
  onDeletePage: (pageId: string) => void;
}

export const PageSwitcherDrawer: React.FC<PageSwitcherDrawerProps> = ({
  isOpen,
  onClose,
  pages,
  activePageId,
  isViewer = false,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onRenamePage,
  onReorderPages,
  onDeletePage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirmPageId, setDeleteConfirmPageId] = useState<string | null>(null);

  const uniquePages = useMemo(() => {
    if (!Array.isArray(pages)) return [];
    const seenIds = new Set<string>();
    return pages.filter((p) => {
      if (!p || !p.id || seenIds.has(p.id)) return false;
      seenIds.add(p.id);
      return true;
    });
  }, [pages]);

  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return uniquePages;
    const q = searchQuery.toLowerCase();
    return uniquePages.filter((p) => (p.name || '').toLowerCase().includes(q));
  }, [uniquePages, searchQuery]);

  if (!isOpen) return null;

  const handleStartRename = (page: DgmPageMetadata, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isViewer) return;
    setEditingPageId(page.id);
    setEditName(page.name);
  };

  const handleSaveRename = (pageId: string) => {
    const trimmed = editName.trim();
    if (trimmed) {
      onRenamePage(pageId, trimmed);
    }
    setEditingPageId(null);
  };

  const handleMoveUp = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isViewer || index <= 0) return;
    onReorderPages(index, index - 1);
  };

  const handleMoveDown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isViewer || index >= uniquePages.length - 1) return;
    onReorderPages(index, index + 1);
  };

  const handleDeleteClick = (page: DgmPageMetadata, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isViewer || uniquePages.length <= 1) return;
    if ((page.shapeCount ?? 0) > 0) {
      setDeleteConfirmPageId(page.id);
    } else {
      onDeletePage(page.id);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmPageId) {
      onDeletePage(deleteConfirmPageId);
      setDeleteConfirmPageId(null);
    }
  };

  return (
    <div
      data-testid="page-switcher-drawer"
      className="fixed inset-y-0 right-0 z-50 w-80 md:w-96 bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col transition-all animate-in slide-in-from-right duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Pages ({uniquePages.length})
          </h2>
        </div>
        <div className="flex items-center gap-1">
          {!isViewer && (
            <button
              type="button"
              data-testid="drawer-add-page-btn"
              onClick={onAddPage}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          )}
          <button
            type="button"
            data-testid="close-page-drawer-btn"
            onClick={onClose}
            className="p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800/60">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            data-testid="page-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pages..."
            className="w-full pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Page List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredPages.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No pages found
          </div>
        ) : (
          filteredPages.map((page, idx) => {
            const originalIndex = uniquePages.findIndex((p) => p.id === page.id);
            const isActive = page.id === activePageId;
            const isEditing = page.id === editingPageId;

            return (
              <div
                key={page.id}
                data-testid={`drawer-page-card-${page.id}`}
                onClick={() => {
                  onSelectPage(page.id);
                }}
                className={`group relative flex flex-col p-3 rounded-xl border transition-all cursor-pointer ${
                  isActive
                    ? 'border-blue-500 dark:border-blue-500 bg-blue-50/80 dark:bg-blue-950/60 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="flex items-center justify-center w-5 h-5 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-md">
                      {originalIndex + 1}
                    </span>

                    {isEditing ? (
                      <div
                        className="flex items-center gap-1 flex-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(page.id);
                            if (e.key === 'Escape') setEditingPageId(null);
                          }}
                          className="flex-1 px-2 py-0.5 text-xs font-medium text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-blue-500 rounded outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRename(page.id)}
                          className="text-emerald-600 hover:text-emerald-700 p-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPageId(null)}
                          className="text-slate-400 hover:text-slate-600 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {page.name || `Page ${originalIndex + 1}`}
                      </span>
                    )}
                  </div>

                  {isActive && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 rounded-md border border-blue-200 dark:border-blue-800">
                      Active
                    </span>
                  )}
                </div>

                {/* Metrics and Actions */}
                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>{page.shapeCount ?? 0} shapes</span>

                  {!isViewer && (
                    <div
                      className="flex items-center gap-1 opacity-80 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        data-testid={`drawer-move-up-${page.id}`}
                        disabled={originalIndex <= 0}
                        onClick={(e) => handleMoveUp(originalIndex, e)}
                        title="Move Up"
                        className="p-1 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        data-testid={`drawer-move-down-${page.id}`}
                        disabled={originalIndex >= uniquePages.length - 1}
                        onClick={(e) => handleMoveDown(originalIndex, e)}
                        title="Move Down"
                        className="p-1 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        data-testid={`drawer-rename-${page.id}`}
                        onClick={(e) => handleStartRename(page, e)}
                        title="Rename"
                        className="p-1 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        data-testid={`drawer-duplicate-${page.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicatePage(page.id);
                        }}
                        title="Duplicate"
                        className="p-1 hover:text-emerald-600 dark:hover:text-emerald-400"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        data-testid={`drawer-delete-${page.id}`}
                        disabled={uniquePages.length <= 1}
                        onClick={(e) => handleDeleteClick(page, e)}
                        title={uniquePages.length <= 1 ? "Cannot delete the only page" : "Delete"}
                        className="p-1 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmPageId && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-xs p-4 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Delete Page?</span>
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              This page contains shapes. Are you sure you want to delete it permanently?
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setDeleteConfirmPageId(null)}
                className="px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-delete-page-btn"
                onClick={handleConfirmDelete}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
