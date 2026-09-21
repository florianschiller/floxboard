import React, { useState, useEffect } from 'react';
import {
  X,
  BookmarkPlus,
  Library,
  Tag,
  FolderPlus,
  Sparkles,
  Layers,
  AlertCircle,
  Check,
} from 'lucide-react';
import {
  StencilCategory,
  ShapeLibraryDetailDto,
  StencilPermission,
  StencilItem,
} from '../types/shapeLibrary';
import * as shapeLibraryApi from '../lib/api/shapeLibrary';
import { serializeShapesToStencil } from '../lib/shapeUtils';

export interface SaveStencilModalProps {
  isOpen: boolean;
  onClose: () => void;
  shapes: any[];
  onSaved?: (stencil: StencilItem) => void;
  currentUser?: { id?: string; name?: string; email?: string } | null;
  token?: string;
}

export function SaveStencilModal({
  isOpen,
  onClose,
  shapes,
  onSaved,
  currentUser,
  token,
}: SaveStencilModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<StencilCategory>(StencilCategory.GENERAL);
  const [libraries, setLibraries] = useState<ShapeLibraryDetailDto[]>([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>('__new__');
  const [newLibraryName, setNewLibraryName] = useState('My Custom Stencils');
  const [isLoadingLibs, setIsLoadingLibs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setName('');
      setDescription('');
      fetchLibraries();
    }
  }, [isOpen, token]);

  const fetchLibraries = async () => {
    if (!token && !currentUser) return;
    try {
      setIsLoadingLibs(true);
      const libs = await shapeLibraryApi.listShapeLibraries(token);
      const writableLibs = libs.filter(
        (lib) =>
          lib.permission === StencilPermission.ADMIN ||
          lib.permission === StencilPermission.CONTRIBUTE
      );
      setLibraries(writableLibs);
      if (writableLibs.length > 0) {
        setSelectedLibraryId(writableLibs[0].id);
      } else {
        setSelectedLibraryId('__new__');
      }
    } catch {
      // Ignored
    } finally {
      setIsLoadingLibs(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a stencil name');
      return;
    }
    if (shapes.length === 0) {
      setError('No shapes selected to save as stencil');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      let targetLibId = selectedLibraryId;

      // Create new library if '__new__' selected
      if (targetLibId === '__new__') {
        if (!newLibraryName.trim()) {
          setError('Please provide a library name');
          setIsSubmitting(false);
          return;
        }
        const createdLib = await shapeLibraryApi.createShapeLibrary(
          {
            name: newLibraryName.trim(),
            categories: [category],
          },
          token
        );
        targetLibId = createdLib.id;
      }

      // Serialize shapes relative to bounding box
      const { shapesJson, width, height } = serializeShapesToStencil(shapes);

      const createdStencilDto = await shapeLibraryApi.createShapeStencil(
        targetLibId,
        {
          name: name.trim(),
          category,
          description: description.trim() || undefined,
          shapesJson,
        },
        token
      );

      const createdStencilItem: StencilItem = {
        id: createdStencilDto.id,
        name: createdStencilDto.name,
        category: createdStencilDto.category,
        description: createdStencilDto.description || undefined,
        shapes: JSON.parse(shapesJson),
        width,
        height,
        createdBy: createdStencilDto.createdBy,
        createdAt: createdStencilDto.createdAt,
      };

      if (onSaved) {
        onSaved(createdStencilItem);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save stencil');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      data-testid="save-stencil-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 relative animate-in zoom-in-95 text-slate-900 dark:text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400">
            <BookmarkPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Save as Stencil
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Save {shapes.length} selected element{shapes.length > 1 ? 's' : ''} to reusable shape library
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Stencil Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Header Navigation Bar"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as StencilCategory)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Target Library
              </label>
              <select
                value={selectedLibraryId}
                onChange={(e) => setSelectedLibraryId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
              >
                {libraries.map((lib) => (
                  <option key={lib.id} value={lib.id}>
                    {lib.name} {lib.organizationId ? '(Org)' : '(Personal)'}
                  </option>
                ))}
                <option value="__new__">+ Create New Library...</option>
              </select>
            </div>
          </div>

          {selectedLibraryId === '__new__' && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                New Library Name *
              </label>
              <input
                type="text"
                value={newLibraryName}
                onChange={(e) => setNewLibraryName(e.target.value)}
                placeholder="e.g. My Custom Stencils"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Add optional notes or usage guidelines..."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <BookmarkPlus className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : 'Save Stencil'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
