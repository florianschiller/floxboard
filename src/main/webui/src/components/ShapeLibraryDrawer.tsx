import React, { useState, useEffect, useMemo, useTransition } from 'react';
import {
  X,
  Search,
  Library,
  Sparkles,
  Layers,
  Plus,
  Trash2,
  Lock,
  Users,
  User,
  ExternalLink,
  ChevronRight,
  BookmarkPlus,
  Tag,
} from 'lucide-react';
import {
  StencilCategory,
  StencilCollection,
  StencilItem,
  ShapeLibraryDetailDto,
  StencilPermission,
} from '../types/shapeLibrary';
import { PREBUILT_STENCIL_COLLECTIONS } from '../lib/prebuiltStencils';
import * as shapeLibraryApi from '../lib/api/shapeLibrary';

export interface ShapeLibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertStencil: (stencil: StencilItem, targetCoordinates?: { x: number; y: number }) => void;
  allowedCollectionIds?: string[];
  currentUser?: { id?: string; name?: string; email?: string } | null;
  token?: string;
}

export function StencilThumbnail({
  shapes,
  width = 200,
  height = 120,
  thumbnailSvg,
}: {
  shapes?: any[];
  width?: number;
  height?: number;
  thumbnailSvg?: string;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (thumbnailSvg || !canvasRef.current || !shapes || shapes.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const displayWidth = 140;
    const displayHeight = 70;
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    if (typeof ctx.resetTransform === 'function') {
      ctx.resetTransform();
    } else {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    const boundsW = width > 0 ? width : 200;
    const boundsH = height > 0 ? height : 120;
    const scale = Math.min((displayWidth - 12) / boundsW, (displayHeight - 12) / boundsH, 1);
    const offsetX = (displayWidth - boundsW * scale) / 2;
    const offsetY = (displayHeight - boundsH * scale) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    shapes.forEach((s) => {
      ctx.save();
      const left = s.left ?? (s.rect ? Math.min(s.rect[0][0], s.rect[1][0]) : 0);
      const top = s.top ?? (s.rect ? Math.min(s.rect[0][1], s.rect[1][1]) : 0);
      ctx.translate(left, top);

      if (s.script) {
        try {
          if (typeof s.script === 'function') {
            s.script(ctx, s);
          } else if (typeof s.script === 'string') {
            const fn = new Function('ctx', 'shape', `"use strict"; return (${s.script})(ctx, shape);`);
            fn(ctx, s);
          }
        } catch {
          ctx.fillStyle = s.fillColor || '#eff6ff';
          ctx.strokeStyle = s.strokeColor || '#3b82f6';
          ctx.lineWidth = s.strokeWidth || 1.5;
          ctx.fillRect(0, 0, s.width || 100, s.height || 60);
          ctx.strokeRect(0, 0, s.width || 100, s.height || 60);
        }
      } else {
        const shapeType = (s.type || s._type || 'Rectangle').toLowerCase();
        const sw = s.width ?? (s.rect ? Math.abs(s.rect[1][0] - s.rect[0][0]) : 100);
        const sh = s.height ?? (s.rect ? Math.abs(s.rect[1][1] - s.rect[0][1]) : 60);

        ctx.fillStyle = s.fillColor || '#f8fafc';
        ctx.strokeStyle = s.strokeColor || '#64748b';
        ctx.lineWidth = s.strokeWidth || 1.5;

        if (shapeType.includes('ellipse') || shapeType.includes('oval') || shapeType.includes('circle')) {
          ctx.beginPath();
          ctx.ellipse(sw / 2, sh / 2, sw / 2, sh / 2, 0, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        } else if (shapeType.includes('diamond')) {
          ctx.beginPath();
          ctx.moveTo(sw / 2, 0);
          ctx.lineTo(sw, sh / 2);
          ctx.lineTo(sw / 2, sh);
          ctx.lineTo(0, sh / 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function' && s.corners) {
            ctx.roundRect(0, 0, sw, sh, s.corners);
          } else {
            ctx.rect(0, 0, sw, sh);
          }
          ctx.fill();
          ctx.stroke();
        }

        if (s.text) {
          const textStr = typeof s.text === 'string' ? s.text : (s.text?.content?.[0]?.content?.[0]?.text || '');
          if (textStr) {
            ctx.fillStyle = s.fontColor || '#1e293b';
            ctx.font = '10px Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const firstLine = textStr.split('\n')[0].slice(0, 15);
            ctx.fillText(firstLine, sw / 2, sh / 2);
          }
        }
      }
      ctx.restore();
    });

    ctx.restore();
  }, [shapes, width, height, thumbnailSvg]);

  if (thumbnailSvg) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        dangerouslySetInnerHTML={{ __html: thumbnailSvg }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '140px', height: '70px' }}
      className="max-w-full max-h-full object-contain pointer-events-none"
    />
  );
}

const CATEGORY_TABS: { label: string; value: StencilCategory | 'ALL' }[] = [
  { label: 'All Categories', value: 'ALL' },
  { label: 'Agile & Sprint', value: StencilCategory.AGILE_SPRINT },
  { label: 'Cloud Architecture', value: StencilCategory.CLOUD_ARCHITECTURE },
  { label: 'Software & UML', value: StencilCategory.SOFTWARE_DESIGN_UML },
  { label: 'UI Wireframing', value: StencilCategory.UI_WIREFRAMING },
  { label: 'Flowchart & BPMN', value: StencilCategory.FLOWCHART_BPMN },
  { label: 'General', value: StencilCategory.GENERAL },
];

export function ShapeLibraryDrawer({
  isOpen,
  onClose,
  onInsertStencil,
  allowedCollectionIds,
  currentUser,
  token,
}: ShapeLibraryDrawerProps) {
  const [selectedCategory, setSelectedCategory] = useState<StencilCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSource, setActiveSource] = useState<'ALL' | 'PREBUILT' | 'CUSTOM'>('ALL');
  const [customLibraries, setCustomLibraries] = useState<ShapeLibraryDetailDto[]>([]);
  const [isLoadingCustom, setIsLoadingCustom] = useState(false);
  const [isPending, startTransition] = useTransition();

  // New Library Modal state
  const [isCreateLibOpen, setIsCreateLibOpen] = useState(false);
  const [newLibName, setNewLibName] = useState('');
  const [newLibDesc, setNewLibDesc] = useState('');
  const [newLibCategory, setNewLibCategory] = useState<StencilCategory>(StencilCategory.GENERAL);
  const [isCreatingLib, setIsCreatingLib] = useState(false);
  const [createLibError, setCreateLibError] = useState<string | null>(null);

  // Fetch custom libraries from backend
  const fetchCustomLibraries = async () => {
    if (!token && !currentUser) return;
    try {
      setIsLoadingCustom(true);
      const libs = await shapeLibraryApi.listShapeLibraries(token);
      setCustomLibraries(libs);
    } catch {
      // Ignored if unauthenticated or offline
    } finally {
      setIsLoadingCustom(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCustomLibraries();
    }
  }, [isOpen, token]);

  // Handle creating a new library
  const handleCreateLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLibName.trim()) return;
    try {
      setIsCreatingLib(true);
      setCreateLibError(null);
      await shapeLibraryApi.createShapeLibrary(
        {
          name: newLibName.trim(),
          description: newLibDesc.trim() || undefined,
          categories: [newLibCategory],
        },
        token
      );
      setNewLibName('');
      setNewLibDesc('');
      setIsCreateLibOpen(false);
      await fetchCustomLibraries();
    } catch (err: any) {
      setCreateLibError(err.message || 'Failed to create shape library');
    } finally {
      setIsCreatingLib(false);
    }
  };

  // Convert custom backend libraries to StencilCollection structure
  const formattedCustomCollections = useMemo<StencilCollection[]>(() => {
    return customLibraries.map((lib) => ({
      id: lib.id,
      name: lib.name,
      description: lib.description,
      categories: lib.categories,
      isPrebuilt: false,
      permission: lib.permission,
      organizationId: lib.organizationId,
      userId: lib.userId,
      stencils: lib.stencils.map((s) => {
        let parsedShapes: any[] = [];
        try {
          parsedShapes = typeof s.shapesJson === 'string' ? JSON.parse(s.shapesJson) : s.shapesJson;
        } catch {
          parsedShapes = [];
        }
        return {
          id: s.id,
          name: s.name,
          category: s.category,
          description: s.description || undefined,
          shapes: parsedShapes,
          thumbnailSvg: s.thumbnailSvg || undefined,
          createdBy: s.createdBy,
          createdAt: s.createdAt,
        };
      }),
    }));
  }, [customLibraries]);

  // Filter collections based on board allowedCollectionIds and activeSource
  const availableCollections = useMemo<StencilCollection[]>(() => {
    let collections = [
      ...PREBUILT_STENCIL_COLLECTIONS,
      ...formattedCustomCollections,
    ];

    if (allowedCollectionIds && allowedCollectionIds.length > 0) {
      collections = collections.filter((c) => allowedCollectionIds.includes(c.id));
    }

    if (activeSource === 'PREBUILT') {
      collections = collections.filter((c) => c.isPrebuilt);
    } else if (activeSource === 'CUSTOM') {
      collections = collections.filter((c) => !c.isPrebuilt);
    }

    return collections;
  }, [allowedCollectionIds, formattedCustomCollections, activeSource]);

  // Filter stencils based on search query and selectedCategory
  const filteredStencils = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const result: { collection: StencilCollection; stencil: StencilItem }[] = [];

    availableCollections.forEach((collection) => {
      collection.stencils.forEach((stencil) => {
        const matchesCategory =
          selectedCategory === 'ALL' ||
          stencil.category === selectedCategory ||
          collection.categories.includes(selectedCategory);

        const matchesQuery =
          !q ||
          stencil.name.toLowerCase().includes(q) ||
          (stencil.description && stencil.description.toLowerCase().includes(q)) ||
          collection.name.toLowerCase().includes(q) ||
          stencil.category.toLowerCase().includes(q);

        if (matchesCategory && matchesQuery) {
          result.push({ collection, stencil });
        }
      });
    });

    return result;
  }, [availableCollections, selectedCategory, searchQuery]);

  const handleDeleteStencil = async (
    e: React.MouseEvent,
    collectionId: string,
    stencilId: string
  ) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this stencil?')) return;
    try {
      await shapeLibraryApi.deleteShapeStencil(collectionId, stencilId, token);
      await fetchCustomLibraries();
    } catch (err: any) {
      alert(err.message || 'Failed to delete stencil');
    }
  };

  const handleDragStart = (e: React.DragEvent, stencil: StencilItem) => {
    e.dataTransfer.setData('application/x-floxboard-stencil', JSON.stringify(stencil));
    e.dataTransfer.effectAllowed = 'copy';
  };

  if (!isOpen) return null;

  return (
    <div
      data-testid="shape-library-drawer"
      className="fixed inset-y-0 left-0 z-40 w-80 sm:w-96 bg-white border-r border-slate-200 shadow-2xl flex flex-col transition-transform duration-200 ease-in-out"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
            <Library className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-sm">Shape Libraries</h2>
            <p className="text-[11px] text-slate-500">
              Drag & drop stencils onto your canvas
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close shape library drawer"
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Source Selector (All / Pre-built / Custom) */}
      <div className="px-4 pt-3 pb-2 flex gap-1.5 border-b border-slate-100 bg-white">
        <button
          onClick={() => setActiveSource('ALL')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeSource === 'ALL'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Collections
        </button>
        <button
          onClick={() => setActiveSource('PREBUILT')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeSource === 'PREBUILT'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Technical & Agile
        </button>
        <button
          onClick={() => setActiveSource('CUSTOM')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
            activeSource === 'CUSTOM'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Custom
          {formattedCustomCollections.length > 0 && (
            <span className="text-[10px] px-1 py-0.2 rounded-full bg-blue-100 text-blue-800 font-bold">
              {formattedCustomCollections.length}
            </span>
          )}
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-slate-100">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stencils by name, keyword..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Category Pills Navigation */}
      <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
        {CATEGORY_TABS.map((tab) => {
          const isSelected = selectedCategory === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setSelectedCategory(tab.value)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Stencils Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Empty Search / Filter State */}
        {filteredStencils.length === 0 && (
          <div className="text-center py-12 px-4">
            <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h4 className="text-xs font-semibold text-slate-700">No stencils found</h4>
            <p className="text-[11px] text-slate-400 mt-1">
              {searchQuery
                ? `No stencils match "${searchQuery}"`
                : 'No stencils available in this category or collection.'}
            </p>
          </div>
        )}

        {/* Stencils Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {filteredStencils.map(({ collection, stencil }) => {
            const canDelete =
              !collection.isPrebuilt &&
              (collection.permission === StencilPermission.ADMIN ||
                (collection.permission === StencilPermission.CONTRIBUTE &&
                  stencil.createdBy === currentUser?.id));

            return (
              <div
                key={`${collection.id}-${stencil.id}`}
                draggable
                onDragStart={(e) => handleDragStart(e, stencil)}
                onClick={() => onInsertStencil(stencil)}
                title={`${stencil.name} (Click or drag to canvas)`}
                data-testid={`stencil-item-${stencil.id}`}
                className="group relative bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md rounded-xl p-2.5 cursor-grab active:cursor-grabbing transition-all flex flex-col justify-between select-none"
              >
                {/* Stencil Preview Box */}
                <div className="w-full h-20 bg-slate-50/70 group-hover:bg-blue-50/30 rounded-lg flex items-center justify-center p-2 mb-2 border border-slate-100 overflow-hidden relative">
                  <StencilThumbnail
                    shapes={stencil.shapes}
                    width={stencil.width}
                    height={stencil.height}
                    thumbnailSvg={stencil.thumbnailSvg}
                  />

                  {/* Delete Button for Custom Stencils */}
                  {canDelete && (
                    <button
                      onClick={(e) => handleDeleteStencil(e, collection.id, stencil.id)}
                      title="Delete Stencil"
                      className="absolute top-1 right-1 p-1 bg-white/90 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-md shadow-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Stencil Info */}
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-semibold text-slate-800 truncate" title={stencil.name}>
                      {stencil.name}
                    </span>
                  </div>
                  {stencil.description && (
                    <p className="text-[10px] text-slate-500 line-clamp-2 leading-tight">
                      {stencil.description}
                    </p>
                  )}
                </div>

                {/* Badges footer */}
                <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
                  <span className="truncate max-w-[100px] text-slate-500 font-medium">
                    {collection.name}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider">
                    {stencil.category.replace('_', ' ').slice(0, 8)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer / Create Custom Library button */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
        <button
          onClick={() => setIsCreateLibOpen(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Custom Library
        </button>
      </div>

      {/* Create Library Modal Dialog */}
      {isCreateLibOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <BookmarkPlus className="w-4 h-4 text-blue-600" />
                New Shape Library
              </h3>
              <button
                onClick={() => setIsCreateLibOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLibrary} className="space-y-3">
              {createLibError && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">
                  {createLibError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Library Name *
                </label>
                <input
                  type="text"
                  required
                  value={newLibName}
                  onChange={(e) => setNewLibName(e.target.value)}
                  placeholder="e.g. Core Design System"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Category
                </label>
                <select
                  value={newLibCategory}
                  onChange={(e) => setNewLibCategory(e.target.value as StencilCategory)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value={StencilCategory.GENERAL}>General</option>
                  <option value={StencilCategory.AGILE_SPRINT}>Agile & Sprint</option>
                  <option value={StencilCategory.CLOUD_ARCHITECTURE}>Cloud Architecture</option>
                  <option value={StencilCategory.SOFTWARE_DESIGN_UML}>Software Design & UML</option>
                  <option value={StencilCategory.UI_WIREFRAMING}>UI Wireframing</option>
                  <option value={StencilCategory.FLOWCHART_BPMN}>Flowchart & BPMN</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={newLibDesc}
                  onChange={(e) => setNewLibDesc(e.target.value)}
                  rows={2}
                  placeholder="Notes about components and guidelines..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateLibOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingLib || !newLibName.trim()}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-xs"
                >
                  {isCreatingLib ? 'Creating...' : 'Create Library'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
