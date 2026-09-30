import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, Layers, MoreVertical, Edit2, Copy, Trash2, Check, X } from 'lucide-react';
import { DgmPageMetadata } from '@/types/pages';

export interface PageTabBarProps {
  pages: DgmPageMetadata[];
  activePageId: string;
  isViewer?: boolean;
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
  onDuplicatePage?: (pageId: string) => void;
  onRenamePage: (pageId: string, newName: string) => void;
  onDeletePage?: (pageId: string) => void;
  onOpenDrawer: () => void;
}

export const PageTabBar: React.FC<PageTabBarProps> = ({
  pages,
  activePageId,
  isViewer = false,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onRenamePage,
  onDeletePage,
  onOpenDrawer,
}) => {
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [menuPageId, setMenuPageId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ left: number }>({ left: 0 });

  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const uniquePages = useMemo(() => {
    if (!Array.isArray(pages)) return [];
    const seenIds = new Set<string>();
    return pages.filter((p) => {
      if (!p || !p.id || seenIds.has(p.id)) return false;
      seenIds.add(p.id);
      return true;
    });
  }, [pages]);

  useEffect(() => {
    if (editingPageId) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editingPageId]);

  const openMenuForPage = (pageId: string, tabElement?: HTMLElement | null, forceOpen = false) => {
    if (!forceOpen && menuPageId === pageId) {
      setMenuPageId(null);
      return;
    }
    const el =
      tabElement ||
      tabRefs.current[pageId] ||
      (rootRef.current?.querySelector(`[data-testid="page-tab-${pageId}"]`) as HTMLElement | null);
    if (el && rootRef.current) {
      const rootRect = rootRef.current.getBoundingClientRect();
      const tabRect = el.getBoundingClientRect();
      setMenuPos({ left: Math.max(0, tabRect.left - rootRect.left) });
    }
    setMenuPageId(pageId);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        // Prevent toggle conflict if clicking on any trigger button
        const triggerBtn = (target as HTMLElement).closest?.('[data-testid^="page-menu-trigger-"]');
        if (triggerBtn) {
          return;
        }
        setMenuPageId(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuPageId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleStartRename = (page: DgmPageMetadata, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isViewer) return;
    setEditingPageId(page.id);
    setEditName(page.name);
    setMenuPageId(null);
  };

  const handleSaveRename = (pageId: string) => {
    const trimmed = editName.trim();
    if (trimmed && trimmed.length > 0) {
      onRenamePage(pageId, trimmed);
    }
    setEditingPageId(null);
  };

  const handleCancelRename = () => {
    setEditingPageId(null);
  };

  const menuPage = uniquePages.find((p) => p.id === menuPageId);

  return (
    <div
      ref={rootRef}
      data-testid="page-tab-bar"
      className="absolute bottom-4 left-6 z-20 flex items-center gap-1.5 p-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg transition-all"
    >
      {/* Drawer overview button */}
      <button
        type="button"
        data-testid="open-page-drawer-btn"
        onClick={onOpenDrawer}
        title="All Pages Overview"
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-lg transition-colors"
      >
        <Layers className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
        <span>Pages ({uniquePages.length})</span>
      </button>

      <div className="h-4 w-px bg-slate-200 dark:bg-slate-750 mx-0.5" />

      {/* Page Tabs List */}
      <div className="flex items-center gap-1 max-w-[50vw] overflow-x-auto no-scrollbar py-0.5">
        {uniquePages.map((page, index) => {
          const isActive = page.id === activePageId;
          const isEditing = page.id === editingPageId;
          const isMenuOpen = page.id === menuPageId;

          if (isEditing) {
            return (
              <div
                key={page.id}
                ref={(el) => {
                  tabRefs.current[page.id] = el;
                }}
                data-testid={`page-tab-editing-${page.id}`}
                className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-800 border border-blue-500 rounded-lg shadow-sm"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRename(page.id);
                    if (e.key === 'Escape') handleCancelRename();
                  }}
                  onBlur={() => handleSaveRename(page.id)}
                  className="w-24 px-1 py-0.5 text-xs text-slate-900 dark:text-white bg-transparent outline-none border-none"
                  maxLength={50}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleSaveRename(page.id)}
                  className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 p-0.5"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={handleCancelRename}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          }

          return (
            <div
              key={page.id}
              ref={(el) => {
                tabRefs.current[page.id] = el;
              }}
              data-testid={`page-tab-${page.id}`}
              onClick={() => onSelectPage(page.id)}
              onDoubleClick={(e) => handleStartRename(page, e)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isViewer) return;
                openMenuForPage(page.id, e.currentTarget, true);
              }}
              className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all select-none ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="truncate max-w-[120px]">{page.name || `Page ${index + 1}`}</span>

              {!isViewer && (
                <button
                  type="button"
                  data-testid={`page-menu-trigger-${page.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    openMenuForPage(
                      page.id,
                      e.currentTarget.closest<HTMLElement>(`[data-testid="page-tab-${page.id}"]`)
                    );
                  }}
                  className={`p-0.5 rounded transition-opacity ${
                    isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  } ${
                    isActive ? 'text-white hover:bg-blue-700' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                >
                  <MoreVertical className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Page Button */}
      {!isViewer && (
        <button
          type="button"
          data-testid="add-page-btn"
          onClick={onAddPage}
          title="Add New Page"
          className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}

      {/* Context Dropdown rendered at root container level to prevent overflow clipping */}
      {!isViewer && menuPage && (
        <div
          ref={menuRef}
          data-testid={`page-menu-${menuPage.id}`}
          style={{ left: `${menuPos.left}px` }}
          className="absolute bottom-full mb-2 w-36 py-1 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-100"
        >
          <button
            type="button"
            data-testid="page-menu-rename-btn"
            onClick={(e) => handleStartRename(menuPage, e)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 text-left transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Rename</span>
          </button>
          {onDuplicatePage && (
            <button
              type="button"
              data-testid="page-menu-duplicate-btn"
              onClick={(e) => {
                e.stopPropagation();
                setMenuPageId(null);
                onDuplicatePage(menuPage.id);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 text-left transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>Duplicate</span>
            </button>
          )}
          {onDeletePage && pages.length > 1 && (
            <button
              type="button"
              data-testid="page-menu-delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                setMenuPageId(null);
                onDeletePage(menuPage.id);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-left transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
