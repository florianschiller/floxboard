import { useState, useRef, useCallback, useEffect } from 'react';
import { Editor, Page, Doc } from '@dgmjs/core';
import { WhiteboardTool } from '../WhiteboardToolbar';
import { CanvasConfig, CanvasTheme } from '../WhiteboardConfigModal';
import { ShapeCustomizationPayload } from '../ShapeScriptDrawer';
import { StencilItem } from '@/types/shapeLibrary';
import { DgmPageMetadata } from '@/types/pages';
import * as api from '@/lib/api';
import {
  updateShapeTextProportions,
  ensureCenteredTextDoc,
  centerOnContent,
  toggleShapeLock,
  rotateShapes,
  applyColorToShapes,
  applyTextStyling,
  setLineArrows,
  isOpenLineShape,
  isGroupShape,
  calculateImageDimensions,
  createImageShape,
  serializeShapesToStencil,
  instantiateStencilShapes,
  exportWhiteboardToSVG,
  exportWhiteboardToPNG,
  exportWhiteboardToPDF,
  serializeDocWithCustomData,
  restoreDocCustomData,
  ensureAllShapesCentered,
  normalizeDocTypes,
} from '@/lib/shapeUtils';
import { YjsDgmBinding } from '@/lib/yjs-dgm-binding';
import { THEME_CANVAS_COLORS, DARK_THEME_CANVAS_COLORS } from '../constants';

export interface UseWhiteboardStateProps {
  editorRef: React.RefObject<Editor | null>;
  bindingRef: React.RefObject<YjsDgmBinding | null>;
  previewSnapshotRef: React.RefObject<any>;
  resolvedTheme: string;
  isViewer: boolean;
  isLoadingBoard: boolean;
  currentBoardId: string | null;
  currentBoardName: string;
  isEditorReady: boolean;
  setIsEditorReady: (ready: boolean) => void;
  isDeliberateClearRef: React.RefObject<boolean>;
  triggerAutoSave: (immediate?: boolean) => void;
  updatePresence: (presence: any) => void;
  broadcastFocus: (shapeIds: string[], center: [number, number]) => void;
  setVotingTick: React.Dispatch<React.SetStateAction<number>>;
  setIsSaveStencilModalOpen: (open: boolean) => void;
  setSaveStencilInitialShapes: (shapes: any[]) => void;
  setIsPropertiesModalOpen: (open: boolean) => void;
  setEditingShape: (shape: any) => void;
  setIsScriptDrawerOpen: (open: boolean) => void;
  setScriptDrawerShape: (shape: any) => void;
  setToastMessage: (msg: string | null) => void;
  navigate: (path: string, options?: any) => void;
}

export function useWhiteboardState({
  editorRef,
  bindingRef,
  previewSnapshotRef,
  resolvedTheme,
  isViewer,
  isLoadingBoard,
  currentBoardId,
  currentBoardName,
  isEditorReady,
  setIsEditorReady,
  isDeliberateClearRef,
  triggerAutoSave,
  updatePresence,
  broadcastFocus,
  setVotingTick,
  setIsSaveStencilModalOpen,
  setSaveStencilInitialShapes,
  setIsPropertiesModalOpen,
  setEditingShape,
  setIsScriptDrawerOpen,
  setScriptDrawerShape,
  setToastMessage,
  navigate,
}: UseWhiteboardStateProps) {
  const [activeTool, setActiveTool] = useState<WhiteboardTool>('select');
  const [activeColor, setActiveColor] = useState({ stroke: '#000000', fill: '#ffffff' });
  const activeColorRef = useRef(activeColor);

  useEffect(() => {
    activeColorRef.current = activeColor;
  }, [activeColor]);

  const [canvasConfig, setCanvasConfig] = useState<CanvasConfig>({
    gridStyle: 'grid',
    theme: 'slate',
    snapToGrid: true,
    showCollaboratorCursors: true,
    showPeerLabels: true,
  });

  const [contextMenu, setContextMenu] = useState<{
    position: { x: number; y: number };
    shapes: any[];
  } | null>(null);

  const [focusedShapeIds, setFocusedShapeIds] = useState<string[]>([]);
  const [isAiInlineBarOpen, setIsAiInlineBarOpen] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Multi-Page Canvas State
  const [pages, setPages] = useState<DgmPageMetadata[]>([
    { id: 'page_1', name: 'Page 1', order: 0, shapeCount: 0 },
  ]);
  const [activePageId, setActivePageId] = useState<string>('page_1');
  const [isPageDrawerOpen, setIsPageDrawerOpen] = useState(false);

  const refreshPages = useCallback(() => {
    if (!editorRef.current) return;
    const anyEditor = editorRef.current as any;
    const rawPages = typeof anyEditor.getPages === 'function'
      ? anyEditor.getPages()
      : (anyEditor.doc?.children || anyEditor.store?.root?.children || []);

    if (!Array.isArray(rawPages) || rawPages.length === 0) {
      setPages([{ id: 'page_1', name: 'Page 1', order: 0, shapeCount: 0 }]);
      setActivePageId('page_1');
      return;
    }

    const seenPageIds = new Set<string>();
    const pageList: DgmPageMetadata[] = [];

    rawPages
      .filter((p: any) => p && (p._type === 'Page' || p.type === 'Page' || p.constructor?.name?.includes('Page') || Array.isArray(p.children)))
      .forEach((p: any, idx: number) => {
        const pageId = p.id || `page_${idx + 1}`;
        if (seenPageIds.has(pageId)) {
          return;
        }
        seenPageIds.add(pageId);

        pageList.push({
          id: pageId,
          name: p.name || `Page ${pageList.length + 1}`,
          order: pageList.length,
          shapeCount: Array.isArray(p.children) ? p.children.length : 0,
          viewport: {
            origin: p.pageOrigin || (p.origin ? [...p.origin] : [0, 0]),
            scale: p.pageScale ?? p.scale ?? 1,
          },
          customData: p.customData,
        });
      });

    if (pageList.length === 0) {
      pageList.push({ id: 'page_1', name: 'Page 1', order: 0, shapeCount: 0 });
    }

    setPages(pageList);
    const curId = anyEditor.currentPage?.id || (pageList.some(p => p.id === activePageId) ? activePageId : pageList[0]?.id) || 'page_1';
    setActivePageId(curId);
  }, [editorRef, activePageId]);

  // Synchronize pages and active page on editor changes
  useEffect(() => {
    if (!editorRef.current) return;
    refreshPages();
    const anyEditor = editorRef.current as any;
    const d1 = anyEditor.onCurrentPageChange?.addListener?.(() => {
      refreshPages();
    });
    const d2 = anyEditor.transform?.onTransaction?.addListener?.(() => {
      refreshPages();
    });
    const d3 = anyEditor.transform?.onAction?.addListener?.(() => {
      refreshPages();
    });
    return () => {
      d1?.dispose?.();
      d2?.dispose?.();
      d3?.dispose?.();
    };
  }, [editorRef, isEditorReady, refreshPages]);

  // Synchronize canvas theme and dark mode on theme or canvas configuration changes
  useEffect(() => {
    if (!editorRef.current) return;
    const isDark = resolvedTheme === 'dark';
    editorRef.current.setDarkMode(isDark);
    const colorMap = isDark ? DARK_THEME_CANVAS_COLORS : THEME_CANVAS_COLORS;
    const colors = colorMap[canvasConfig.theme] || colorMap.slate;
    editorRef.current.options.canvasColor = colors.canvas;
    editorRef.current.options.blankColor = colors.blank;
    if (colors.grid) {
      editorRef.current.options.gridColor = colors.grid;
    }
    editorRef.current.repaint();
  }, [resolvedTheme, canvasConfig.theme, editorRef]);

  const handleUpdateCanvasConfig = useCallback((newConfig: CanvasConfig) => {
    setCanvasConfig(newConfig);
    if (editorRef.current) {
      const isDark = resolvedTheme === 'dark';
      editorRef.current.setDarkMode(isDark);
      editorRef.current.setShowGrid(newConfig.gridStyle !== 'none');
      editorRef.current.setSnapToGrid(newConfig.snapToGrid);

      const colorMap = isDark ? DARK_THEME_CANVAS_COLORS : THEME_CANVAS_COLORS;
      const colors = colorMap[newConfig.theme] || colorMap.slate;
      editorRef.current.options.canvasColor = colors.canvas;
      editorRef.current.options.blankColor = colors.blank;
      if (colors.grid) {
        editorRef.current.options.gridColor = colors.grid;
      }
      editorRef.current.repaint();
    }
  }, [resolvedTheme, editorRef]);

  // Color change handler (updates active palette and any selected shapes)
  const handleColorChange = (color: { stroke: string; fill: string }) => {
    setActiveColor(color);
    if (!editorRef.current || isViewer) return;
    const editor = editorRef.current;
    const selected = editor.selection.getShapes();
    if (selected.length > 0) {
      try {
        editor.actions.update({
          strokeColor: color.stroke,
          fillColor: color.fill,
          fontColor: color.stroke,
        }, selected);
      } catch {
        editor.transform.transact((tx) => {
          for (const shape of selected) {
            if ('strokeColor' in shape || (shape as any).strokeColor !== undefined) {
              tx.assign(shape, 'strokeColor', color.stroke);
            }
            if ('fillColor' in shape || (shape as any).fillColor !== undefined) {
              tx.assign(shape, 'fillColor', color.fill);
            }
            if ('fontColor' in shape || (shape as any).fontColor !== undefined) {
              tx.assign(shape, 'fontColor', color.stroke);
            }
          }
        });
      }
      for (const shape of selected) {
        shape.strokeColor = color.stroke;
        if ('fillColor' in shape || (shape as any).fillColor !== undefined) {
          (shape as any).fillColor = color.fill;
        }
        if ('fontColor' in shape || (shape as any).fontColor !== undefined) {
          (shape as any).fontColor = color.stroke;
        }
        shape.update(editor.canvas);
      }
      editor.repaint();
      bindingRef.current?.syncEditorToYjs();
      triggerAutoSave();
    }
  };

  // Tool switching handler
  const handleToolSelect = (tool: WhiteboardTool) => {
    if (!editorRef.current || isViewer) return;
    const editor = editorRef.current;
    if (activeTool === tool && tool !== 'select') {
      setActiveTool('select');
      editor.activateHandler('Select');
      bindingRef.current?.syncEditorToYjs();
      triggerAutoSave();
      return;
    }
    setActiveTool(tool);
    const handlerMap: Record<WhiteboardTool, string> = {
      select: 'Select',
      freehand: 'Freehand',
      marker: 'Highlighter',
      eraser: 'Eraser',
      line: 'Line',
      connector: 'Connector',
      frame: 'Frame',
      rectangle: 'Rectangle',
      ellipse: 'Ellipse',
      text: 'Text',
    };
    const targetHandler = handlerMap[tool] || 'Select';
    editor.activateHandler(targetHandler);
    bindingRef.current?.syncEditorToYjs();
    triggerAutoSave();
  };

  const handleDeleteSelectedShapes = useCallback((shapesToDelete?: any[]) => {
    if (!editorRef.current || isViewer || isLoadingBoard) return;
    const editor = editorRef.current;
    const targetShapes = (shapesToDelete && shapesToDelete.length > 0)
      ? shapesToDelete
      : (editor.selection?.getShapes?.() || []);

    if (!targetShapes || targetShapes.length === 0) return;

    let deleted = false;
    if (editor.actions?.delete) {
      try {
        editor.actions.delete(targetShapes);
        deleted = true;
      } catch (err) {
        console.warn('[floxBoard] editor.actions.delete failed, falling back:', err);
      }
    }

    if (!deleted) {
      const page = editor.currentPage || (editor.doc?.pages && editor.doc.pages[0]);
      if (page?.children) {
        const targetIds = new Set(targetShapes.map((s: any) => s.id));
        page.children = page.children.filter((s: any) => !targetIds.has(s.id));
        deleted = true;
      }
    }

    if (editor.selection?.clear) {
      editor.selection.clear();
    } else if (editor.selection?.select) {
      editor.selection.select([]);
    }

    editor.repaint?.();
    if (isDeliberateClearRef.current !== undefined) {
      (isDeliberateClearRef as any).current = true;
    }
    bindingRef.current?.syncEditorToYjs();
    triggerAutoSave();
  }, [isViewer, isLoadingBoard, editorRef, bindingRef, triggerAutoSave, isDeliberateClearRef]);

  const handleZoom = (delta: number) => {
    setContextMenu(null);
    if (!editorRef.current) return;
    const currentScale = editorRef.current.getScale();
    editorRef.current.setScale(Math.max(0.1, Math.min(5, currentScale + delta)));
    editorRef.current.repaint();
  };

  const handleBringToFront = useCallback(() => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    editor.actions.bringToFront();
    editor.repaint();
    bindingRef.current?.syncEditorToYjs();
    triggerAutoSave();
  }, [editorRef, bindingRef, triggerAutoSave]);

  const handleSendToBack = useCallback(() => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    editor.actions.sendToBack();
    editor.repaint();
    bindingRef.current?.syncEditorToYjs();
    triggerAutoSave();
  }, [editorRef, bindingRef, triggerAutoSave]);

  const handleContextMenuColorChange = useCallback((color: { stroke: string; fill: string }) => {
    if (!editorRef.current || !contextMenu?.shapes) return;
    const editor = editorRef.current;
    applyColorToShapes(contextMenu.shapes, color.stroke, color.fill);
    contextMenu.shapes.forEach((s) => {
      if (typeof s.update === 'function') {
        try {
          s.update(editor.canvas);
        } catch {}
      }
    });
    editor.repaint();
    bindingRef.current?.syncEditorToYjs();
    triggerAutoSave();
  }, [contextMenu, editorRef, bindingRef, triggerAutoSave]);

  const handleTextStyling = useCallback((style: 'bold' | 'italic' | 'clear') => {
    if (!editorRef.current || !contextMenu?.shapes) return;
    const editor = editorRef.current;
    applyTextStyling(contextMenu.shapes, style);
    contextMenu.shapes.forEach((s) => {
      if (typeof s.update === 'function') {
        try {
          s.update(editor.canvas);
        } catch {}
      }
    });
    editor.repaint();
    bindingRef.current?.syncEditorToYjs();
    triggerAutoSave();
  }, [contextMenu, editorRef, bindingRef, triggerAutoSave]);

  const handleRotate = useCallback((delta: number, absolute = false) => {
    if (!editorRef.current || !contextMenu?.shapes) return;
    const editor = editorRef.current;
    rotateShapes(contextMenu.shapes, delta, absolute, editor);
    editor.repaint();
    bindingRef.current?.syncEditorToYjs();
    triggerAutoSave();
  }, [contextMenu, editorRef, bindingRef, triggerAutoSave]);

  const handleToggleLock = useCallback(() => {
    if (!editorRef.current || !contextMenu?.shapes) return;
    const editor = editorRef.current;
    toggleShapeLock(contextMenu.shapes);
    contextMenu.shapes.forEach((s) => {
      if (typeof s.update === 'function') {
        try {
          s.update(editor.canvas);
        } catch {}
      }
    });
    editor.repaint();
    bindingRef.current?.syncEditorToYjs();
    triggerAutoSave();
  }, [contextMenu, editorRef, bindingRef, triggerAutoSave]);

  const handleGroup = useCallback(() => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    editor.actions.group();
    editor.repaint();
    bindingRef.current?.syncEditorToYjs();
    triggerAutoSave();
  }, [editorRef, bindingRef, triggerAutoSave]);

  const handleUngroup = useCallback(() => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    if (contextMenu?.shapes && contextMenu.shapes.length > 0) {
      editor.actions.ungroup(contextMenu.shapes);
    } else {
      editor.actions.ungroup();
    }
    editor.repaint();
    bindingRef.current?.syncEditorToYjs();
    triggerAutoSave();
  }, [contextMenu, editorRef, bindingRef, triggerAutoSave]);

  const handleSetLineArrow = useCallback((end: 'head' | 'tail', type: 'flat' | 'arrow' | 'solid-arrow') => {
    if (!editorRef.current || !contextMenu?.shapes) return;
    const editor = editorRef.current;
    setLineArrows(contextMenu.shapes, end, type);
    contextMenu.shapes.forEach((s) => {
      if (typeof s.update === 'function') {
        try {
          s.update(editor.canvas);
        } catch {}
      }
    });
    editor.repaint();
    bindingRef.current?.syncEditorToYjs();
    triggerAutoSave();
  }, [contextMenu, editorRef, bindingRef, triggerAutoSave]);

  const handleSaveShapeProperties = useCallback((updatedProperties: Record<string, any>, editingShape: any) => {
    if (!editorRef.current || !editingShape) return;
    const editor = editorRef.current;
    editingShape.properties = updatedProperties;
    editingShape.customData = {
      ...(editingShape.customData || {}),
      properties: updatedProperties,
    };
    if (editingShape.script) {
      editingShape.customData.script = editingShape.script;
    }
    if (typeof editingShape.update === 'function') {
      try {
        editingShape.update(editor.canvas);
      } catch {}
    }
    editor.repaint();
    bindingRef.current?.syncEditorToYjs();
    triggerAutoSave();
    setToastMessage("Updated shape properties");
    setTimeout(() => setToastMessage(null), 3000);
  }, [editorRef, bindingRef, triggerAutoSave, setToastMessage]);

  const handleOpenScriptDrawer = useCallback((targetShape?: any) => {
    let target = targetShape;
    if (!target && editorRef.current) {
      const selected = editorRef.current.selection.getShapes();
      if (selected.length > 0) {
        target = selected[0];
      }
    }
    if (target) {
      if (!target.script && target.customData?.script) {
        target.script = target.customData.script;
      }
      if (!target.properties && target.customData?.properties) {
        target.properties = target.customData.properties;
      }
      if (target.customData?.fontFamily && !target.fontFamily) {
        target.fontFamily = target.customData.fontFamily;
      }
      if (target.customData?.fontSize && !target.fontSize) {
        target.fontSize = target.customData.fontSize;
      }
      if (target.customData?.fontColor && !target.fontColor) {
        target.fontColor = target.customData.fontColor;
      }
      setScriptDrawerShape(target);
    }
    setIsScriptDrawerOpen(true);
  }, [editorRef, setScriptDrawerShape, setIsScriptDrawerOpen]);

  const handleSaveShapeCustomization = useCallback((shape: any, payload: ShapeCustomizationPayload) => {
    if (!editorRef.current || !shape) return;
    const editor = editorRef.current;

    // Apply Script
    if (payload.script === null || payload.script === '') {
      delete shape.script;
      if (shape.customData) {
        delete shape.customData.script;
      }
    } else if (typeof payload.script === 'string' && payload.script.trim()) {
      shape.script = payload.script;
      shape.customData = {
        ...(shape.customData || {}),
        script: payload.script,
      };
    }

    // Apply Properties
    if (payload.properties !== undefined) {
      shape.properties = payload.properties;
      shape.customData = {
        ...(shape.customData || {}),
        properties: payload.properties,
      };
    }

    // Apply Visual Attributes
    if (payload.attributes) {
      const attrs = payload.attributes;
      const customDataUpdates: Record<string, any> = {};

      const isConn = isOpenLineShape(shape) || shape.type === 'Line' || shape.type === 'Connector' || shape._type === 'Connector';
      const isFrm = shape.type === 'Frame' || shape._type === 'Frame' || Boolean(shape.isFrame);
      const isImg = shape.type === 'Image' || shape._type === 'Image' || Boolean(shape.imageData);

      if (attrs.fillColor !== undefined) {
        shape.fillColor = attrs.fillColor;
        customDataUpdates.fillColor = attrs.fillColor;
        if (isFrm) {
          shape.fillStyle = attrs.fillColor && attrs.fillColor !== 'transparent' && attrs.fillColor !== 'none' ? 'solid' : 'none';
        }
      }
      if (attrs.strokeColor !== undefined) {
        shape.strokeColor = attrs.strokeColor;
        customDataUpdates.strokeColor = attrs.strokeColor;
      }
      if (attrs.strokeWidth !== undefined) {
        shape.strokeWidth = attrs.strokeWidth;
        customDataUpdates.strokeWidth = attrs.strokeWidth;
      }
      if (attrs.fontFamily !== undefined) {
        shape.fontFamily = attrs.fontFamily;
        customDataUpdates.fontFamily = attrs.fontFamily;
      }
      if (attrs.fontSize !== undefined) {
        shape.fontSize = attrs.fontSize;
        customDataUpdates.fontSize = attrs.fontSize;
      }
      if (attrs.fontColor !== undefined) {
        shape.fontColor = attrs.fontColor;
        customDataUpdates.fontColor = attrs.fontColor;
      }
      if (attrs.opacity !== undefined) {
        shape.opacity = attrs.opacity;
        customDataUpdates.opacity = attrs.opacity;
      }
      if (attrs.headEndType !== undefined) {
        shape.headEndType = attrs.headEndType;
        customDataUpdates.headEndType = attrs.headEndType;
      }
      if (attrs.tailEndType !== undefined) {
        shape.tailEndType = attrs.tailEndType;
        customDataUpdates.tailEndType = attrs.tailEndType;
      }
      if (isConn && attrs.lineStyle !== undefined) {
        shape.lineStyle = attrs.lineStyle;
        customDataUpdates.lineStyle = attrs.lineStyle;
        if (attrs.lineStyle === 'dashed') {
          shape.strokePattern = [8, 6];
        } else if (attrs.lineStyle === 'dotted') {
          shape.strokePattern = [2, 4];
        } else {
          shape.strokePattern = [];
        }
        customDataUpdates.strokePattern = shape.strokePattern;
      }
      if (attrs.title !== undefined) {
        shape.title = attrs.title;
        shape.name = attrs.title;
        customDataUpdates.title = attrs.title;
        if (isFrm) {
          shape.text = attrs.title;
        }
      }
      if (attrs.text !== undefined && !isFrm) {
        shape.text = attrs.text;
        customDataUpdates.text = attrs.text;
      }
      if (attrs.cornerRadius !== undefined) {
        shape.cornerRadius = attrs.cornerRadius;
        const r = attrs.cornerRadius;
        shape.corners = [r, r, r, r];
        customDataUpdates.cornerRadius = attrs.cornerRadius;
        customDataUpdates.corners = shape.corners;
      }
      if ((isFrm || isImg) && attrs.borderStyle !== undefined) {
        shape.borderStyle = attrs.borderStyle;
        customDataUpdates.borderStyle = attrs.borderStyle;
        if (attrs.borderStyle === 'dashed') {
          shape.strokePattern = [8, 6];
        } else {
          shape.strokePattern = [];
        }
        customDataUpdates.strokePattern = shape.strokePattern;
      }
      if (attrs.aspectRatioLocked !== undefined) {
        customDataUpdates.aspectRatioLocked = attrs.aspectRatioLocked;
      }
      if (attrs.fitMode !== undefined) {
        shape.fitMode = attrs.fitMode;
        customDataUpdates.fitMode = attrs.fitMode;
      }
      if (attrs.altText !== undefined) {
        shape.altText = attrs.altText;
        customDataUpdates.altText = attrs.altText;
      }
      if (attrs.caption !== undefined) {
        shape.caption = attrs.caption;
        customDataUpdates.caption = attrs.caption;
      }
      if (attrs.width !== undefined && attrs.height !== undefined) {
        shape.width = Math.max(10, attrs.width);
        shape.height = Math.max(10, attrs.height);
        if (Array.isArray(shape.rect) && shape.rect.length === 2) {
          const left = shape.rect[0][0];
          const top = shape.rect[0][1];
          shape.rect = [
            [left, top],
            [left + shape.width, top + shape.height],
          ];
        }
      }

      shape.customData = {
        ...(shape.customData || {}),
        ...customDataUpdates,
      };
    }

    if (typeof shape.update === 'function') {
      try {
        shape.update(editor.canvas);
      } catch {}
    }
    editor.repaint();
    bindingRef.current?.syncEditorToYjs();
    triggerAutoSave();
    setToastMessage("Applied shape customization");
    setTimeout(() => setToastMessage(null), 3000);
  }, [editorRef, bindingRef, triggerAutoSave, setToastMessage]);

  const handleSaveShapeScript = useCallback((shape: any, scriptCode: string) => {
    if (!editorRef.current || !shape) return;
    const editor = editorRef.current;
    shape.script = scriptCode;
    shape.customData = {
      ...(shape.customData || {}),
      script: scriptCode,
    };
    if (typeof shape.update === 'function') {
      try {
        shape.update(editor.canvas);
      } catch {}
    }
    editor.repaint();
    bindingRef.current?.syncEditorToYjs();
    triggerAutoSave();
    setToastMessage("Applied shape draw script");
    setTimeout(() => setToastMessage(null), 3000);
  }, [editorRef, bindingRef, triggerAutoSave, setToastMessage]);

  const handleRevertShapeScript = useCallback((shape: any) => {
    if (!editorRef.current || !shape) return;
    const editor = editorRef.current;
    const defaultScript = shape.defaultScript || shape.customData?.defaultScript || '';
    shape.script = defaultScript;
    if (shape.customData) {
      shape.customData.script = defaultScript;
    }
    if (typeof shape.update === 'function') {
      try {
        shape.update(editor.canvas);
      } catch {}
    }
    editor.repaint();
    bindingRef.current?.syncEditorToYjs();
    triggerAutoSave();
    setToastMessage("Reverted shape script");
    setTimeout(() => setToastMessage(null), 3000);
  }, [editorRef, bindingRef, triggerAutoSave, setToastMessage]);

  const handleClearShapeScript = useCallback((shape: any) => {
    if (!editorRef.current || !shape) return;
    const editor = editorRef.current;
    delete shape.script;
    if (shape.customData) {
      delete shape.customData.script;
    }
    if (typeof shape.update === 'function') {
      try {
        shape.update(editor.canvas);
      } catch {}
    }
    editor.repaint();
    bindingRef.current?.syncEditorToYjs();
    triggerAutoSave();
    setToastMessage("Cleared shape script");
    setTimeout(() => setToastMessage(null), 3000);
  }, [editorRef, bindingRef, triggerAutoSave, setToastMessage]);

  const handleExportSVG = useCallback(async () => {
    if (!editorRef.current) return;
    await exportWhiteboardToSVG(editorRef.current, currentBoardName);
  }, [currentBoardName, editorRef]);

  const handleExportPNG = useCallback(async () => {
    if (!editorRef.current) return;
    await exportWhiteboardToPNG(editorRef.current, currentBoardName);
  }, [currentBoardName, editorRef]);

  const handleExportPDF = useCallback(async () => {
    if (!editorRef.current) return;
    await exportWhiteboardToPDF(editorRef.current, currentBoardName);
  }, [currentBoardName, editorRef]);

  const handleExportJSON = useCallback(() => {
    if (!editorRef.current) return;
    const content = editorRef.current.saveToJSON();
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentBoardName.toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentBoardName, editorRef]);

  const handleImageUpload = useCallback(async (file: File, position?: [number, number]) => {
    if (!editorRef.current || isViewer) return;
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/gif'];
    if (!allowedTypes.includes(file.type.toLowerCase()) && !file.name.match(/\.(png|jpe?g|webp|svg|gif)$/i)) {
      setToastMessage("Unsupported image format. Please select a PNG, JPEG, WebP, SVG, or GIF image.");
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    const editor = editorRef.current;
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = async () => {
      try {
        const { width, height } = calculateImageDimensions(img.naturalWidth, img.naturalHeight, 400, 400);
        const shape = createImageShape(editor, objectUrl, width, height, position);
        if (editor.actions?.insert) {
          editor.actions.insert(shape);
        } else if (editor.actions?.add) {
          editor.actions.add(shape);
        }
        editor.selection?.select?.([shape]);
        editor.repaint();
        bindingRef.current?.syncEditorToYjs();

        if (currentBoardId) {
          try {
            const res = await api.uploadWhiteboardAsset(currentBoardId, file);
            shape.imageData = res.url;
            shape._imageDOM = null;
            if (typeof shape.update === 'function') {
              shape.update(editor.canvas);
            }
            editor.repaint();
            bindingRef.current?.syncEditorToYjs();
            triggerAutoSave();
          } catch (err: any) {
            setToastMessage(err.message || 'Failed to upload image asset');
            setTimeout(() => setToastMessage(null), 4000);
          }
        } else {
          triggerAutoSave();
        }
      } catch {
        setToastMessage('Failed to create image shape');
        setTimeout(() => setToastMessage(null), 3000);
      }
    };

    img.onerror = () => {
      setToastMessage('Failed to parse image file');
      setTimeout(() => setToastMessage(null), 3000);
    };
    img.src = objectUrl;
  }, [isViewer, editorRef, bindingRef, triggerAutoSave, currentBoardId, setToastMessage]);

  const handleInsertAiDiagram = useCallback(async (incomingDoc: any, mode: 'center' | 'replace' | 'new_board') => {
    if (!editorRef.current) return;
    const editor = editorRef.current;

    if (mode === 'new_board') {
      try {
        const newBoard = await api.saveWhiteboard({
          name: `AI Diagram - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          content: incomingDoc,
        });
        navigate(`/board/${newBoard.id}`);
      } catch (err: any) {
        setToastMessage(err.message || 'Failed to create new board');
        setTimeout(() => setToastMessage(null), 3000);
      }
      return;
    }

    const clonedDoc = incomingDoc ? JSON.parse(JSON.stringify(incomingDoc)) : null;
    const rawElements: any[] = clonedDoc?.children?.[0]?.children || [];
    if (rawElements.length === 0) return;

    if (mode === 'replace') {
      editor.loadFromJSON(clonedDoc);
      restoreDocCustomData(editor, clonedDoc);
      ensureAllShapesCentered(editor);
      centerOnContent(editor);
    } else if (mode === 'center') {
      const currentDoc = editor.saveToJSON() || { type: 'Doc', children: [{ type: 'Page', children: [] }] };
      if (!currentDoc.children || !Array.isArray(currentDoc.children) || currentDoc.children.length === 0) {
        currentDoc.children = [{ type: 'Page', children: [] }];
      }
      if (!currentDoc.children[0].children || !Array.isArray(currentDoc.children[0].children)) {
        currentDoc.children[0].children = [];
      }

      // Compute center offset if mode === 'center'
      const center = editor.getCenter();
      const shapesWithBounds = rawElements.filter((s) => typeof s.left === 'number' && typeof s.top === 'number');
      let dx = 0;
      let dy = 0;
      if (shapesWithBounds.length > 0) {
        const minX = Math.min(...shapesWithBounds.map((s) => s.left));
        const minY = Math.min(...shapesWithBounds.map((s) => s.top));
        const maxX = Math.max(...shapesWithBounds.map((s) => s.left + (s.width || 0)));
        const maxY = Math.max(...shapesWithBounds.map((s) => s.top + (s.height || 0)));
        const graphCenterX = minX + (maxX - minX) / 2;
        const graphCenterY = minY + (maxY - minY) / 2;
        dx = center[0] - graphCenterX;
        dy = center[1] - graphCenterY;
      }

      for (const elem of rawElements) {
        if (typeof elem.left === 'number' && typeof elem.top === 'number') {
          elem.left += dx;
          elem.top += dy;
        }
        if (Array.isArray(elem.path)) {
          elem.path = elem.path.map((pt: any) => {
            if (Array.isArray(pt) && pt.length >= 2) {
              return [pt[0] + dx, pt[1] + dy];
            }
            return pt;
          });
        }
      }

      const existingChildren = currentDoc.children[0].children;
      currentDoc.children[0].children = [...existingChildren, ...rawElements];
      editor.loadFromJSON(currentDoc);
      restoreDocCustomData(editor, currentDoc);
      ensureAllShapesCentered(editor);
    }

    const store = editor.store as any;
    const newShapes = rawElements.map((e) => store?.idIndex?.[e.id]).filter(Boolean);
    if (newShapes.length > 0) {
      editor.selection?.select?.(newShapes);
    }
    editor.repaint();
    bindingRef.current?.syncEditorToYjs();
    triggerAutoSave();

    const bId = currentBoardId;
    if (bId && !isViewer) {
      try {
        await api.createSnapshot(bId, {
          name: `AI: Generated Diagram`,
          description: `Synthesized and inserted ${rawElements.length} diagram elements`,
          isGeneratedByAI: true,
        });
      } catch (err) {
        // non-blocking
      }
    }

    setToastMessage(`Generated ${rawElements.length} diagram shapes`);
    setTimeout(() => setToastMessage(null), 3000);
  }, [editorRef, bindingRef, triggerAutoSave, navigate, setToastMessage, currentBoardId, isViewer]);

  const handleInlineAiPrompt = useCallback(async (prompt: string) => {
    if (!prompt.trim() || isAiGenerating || isViewer) return;
    setIsAiGenerating(true);
    try {
      const response = await api.generateDiagramFromPrompt({
        prompt: prompt.trim(),
        whiteboardId: currentBoardId || undefined,
      });
      await handleInsertAiDiagram(response.doc, 'center');
      setIsAiInlineBarOpen(false);
    } catch (err: any) {
      setToastMessage(err.message || 'AI Generation failed');
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsAiGenerating(false);
    }
  }, [isAiGenerating, isViewer, currentBoardId, handleInsertAiDiagram, setToastMessage]);

  const handleInsertStencil = useCallback((stencil: StencilItem, targetCoordinates?: { x: number; y: number }) => {
    if (!editorRef.current || isViewer) return;
    const editor = editorRef.current;

    let posX = targetCoordinates?.x;
    let posY = targetCoordinates?.y;

    if (posX === undefined || posY === undefined) {
      const center = editor.getCenter();
      const w = stencil.width || 200;
      const h = stencil.height || 120;
      posX = center[0] - w / 2;
      posY = center[1] - h / 2;
    }

    const instantiated = instantiateStencilShapes(stencil.shapes || [], posX, posY);
    if (instantiated.length === 0) return;

    const createdShapes: any[] = [];

    instantiated.forEach((shapeDef) => {
      let shape: any = null;
      const left = shapeDef.left ?? 0;
      const top = shapeDef.top ?? 0;
      const w = shapeDef.width ?? 120;
      const h = shapeDef.height ?? 60;
      const rect: [[number, number], [number, number]] = [[left, top], [left + w, top + h]];

      const shapeType = (shapeDef.type || shapeDef._type || 'Rectangle').toLowerCase();
      if (shapeType.includes('custom') || shapeDef.script) {
        shape = typeof editor.factory?.createCustom === 'function'
          ? editor.factory.createCustom(rect, shapeDef.script)
          : (editor.factory?.createRectangle?.(rect) || {
              type: 'Custom',
              left,
              top,
              width: w,
              height: h,
              rect,
              script: shapeDef.script,
            });
        if (shape) {
          shape.type = shapeDef.type || 'Custom';
          shape.textEditable = false;
        }
        if (shapeDef.script !== undefined) shape.script = shapeDef.script;
        if (shapeDef.properties !== undefined) shape.properties = { ...shapeDef.properties };
      } else if (shapeType.includes('ellipse') || shapeType.includes('oval') || shapeType.includes('circle')) {
        shape = editor.factory?.createEllipse?.(rect) || { type: 'Ellipse', left, top, width: w, height: h, rect };
      } else if (shapeType.includes('frame')) {
        shape = editor.factory?.createFrame?.(rect) || { type: 'Frame', left, top, width: w, height: h, rect };
        if (shapeDef.name) shape.name = shapeDef.name;
        if (shapeDef.title) shape.title = shapeDef.title;
        if (!shape.name && shapeDef.title) shape.name = shapeDef.title;
        if (!shape.title && shapeDef.name) shape.title = shapeDef.name;
        if (shapeDef.corners) shape.corners = shapeDef.corners;
        if (!shapeDef.text) {
          shape.text = undefined;
        }
      } else if (shapeType.includes('connector')) {
        shape = editor.factory?.createConnector?.(
          shapeDef.tail || null,
          shapeDef.tailAnchor || [0.5, 0.5],
          shapeDef.head || null,
          shapeDef.headAnchor || [0.5, 0.5],
          shapeDef.path || rect
        ) || { type: 'Connector', left, top, width: w, height: h, rect };
      } else if (shapeType.includes('line')) {
        shape = editor.factory?.createLine?.(shapeDef.path || rect) || { type: 'Line', left, top, width: w, height: h, rect };
      } else if (shapeType.includes('text')) {
        shape = editor.factory?.createText?.(rect, shapeDef.text || 'Text') || { type: 'Text', left, top, width: w, height: h, rect, text: shapeDef.text || 'Text' };
      } else {
        shape = editor.factory?.createRectangle?.(rect) || { type: 'Rectangle', left, top, width: w, height: h, rect };
        if (shapeDef.corners) {
          shape.corners = shapeDef.corners;
        }
      }

      if (shape) {
        if (shapeDef.id) shape.id = shapeDef.id;
        if (shapeDef.strokeColor) shape.strokeColor = shapeDef.strokeColor;
        if (shapeDef.fillColor) shape.fillColor = shapeDef.fillColor;
        if (shapeDef.strokeWidth !== undefined) shape.strokeWidth = shapeDef.strokeWidth;
        if (shapeDef.text !== undefined) shape.text = shapeDef.text;
        if (shapeDef.fontColor) shape.fontColor = shapeDef.fontColor;
        if (shapeDef.fontSize) shape.fontSize = shapeDef.fontSize;
        if (shapeDef.fontFamily) shape.fontFamily = shapeDef.fontFamily;
        if (shapeDef.fontWeight) shape.fontWeight = shapeDef.fontWeight;
        if (shapeDef.horzAlign) shape.horzAlign = shapeDef.horzAlign;
        if (shapeDef.vertAlign) shape.vertAlign = shapeDef.vertAlign;
        if (shapeDef.headEndType) (shape as any).headEndType = shapeDef.headEndType;
        if (shapeDef.tailEndType) (shape as any).tailEndType = shapeDef.tailEndType;
        if (shapeDef.script !== undefined) shape.script = shapeDef.script;
        if (shapeDef.properties !== undefined) shape.properties = { ...shapeDef.properties };
        if (shapeDef.customData !== undefined) shape.customData = { ...shapeDef.customData };

        if (shape.script || shapeType.includes('custom') || shapeDef.properties) {
          shape.textEditable = false;
          const shapeW = shape.width ?? (shapeDef.width || (rect ? Math.abs(rect[1][0] - rect[0][0]) : 120));
          const shapeH = shape.height ?? (shapeDef.height || (rect ? Math.abs(rect[1][1] - rect[0][1]) : 60));
          shape.customData = {
            ...shape.customData,
            initialWidth: shape.customData?.initialWidth ?? shapeW,
            initialHeight: shape.customData?.initialHeight ?? shapeH,
            ...(shape.properties ? { properties: shape.properties } : {}),
            ...(shape.script !== undefined ? { script: shape.script } : {}),
          };
        }

        updateShapeTextProportions(shape, editor);
        if (editor.actions?.insert) {
          editor.actions.insert(shape);
        } else if (editor.actions?.add) {
          editor.actions.add(shape);
        }
        if (typeof shape.update === 'function') {
          try {
            shape.update(editor.canvas);
          } catch {}
        }
        createdShapes.push(shape);
      }
    });

    if (createdShapes.length > 0) {
      editor.selection?.select?.(createdShapes);
      editor.repaint();
      bindingRef.current?.syncEditorToYjs();
      triggerAutoSave();

      setToastMessage(`Added "${stencil.name}" to canvas`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  }, [isViewer, editorRef, bindingRef, triggerAutoSave, setToastMessage]);

  // Window pointerup and keyup event listeners for autosave triggers
  useEffect(() => {
    const handleWindowPointerUp = () => {
      if (!editorRef.current || isViewer || isLoadingBoard || previewSnapshotRef.current) return;
      if (activeTool === 'eraser') {
        if (isDeliberateClearRef.current !== undefined) {
          (isDeliberateClearRef as any).current = true;
        }
      }
      bindingRef.current?.syncEditorToYjs();
      triggerAutoSave();
    };

    window.addEventListener('pointerup', handleWindowPointerUp);
    return () => window.removeEventListener('pointerup', handleWindowPointerUp);
  }, [isViewer, isLoadingBoard, activeTool, triggerAutoSave, bindingRef, editorRef, isDeliberateClearRef, previewSnapshotRef]);

  useEffect(() => {
    const handleWindowKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!editorRef.current || isViewer || isLoadingBoard || previewSnapshotRef.current) return;
        if (isDeliberateClearRef.current !== undefined) {
          (isDeliberateClearRef as any).current = true;
        }
        bindingRef.current?.syncEditorToYjs();
        triggerAutoSave();
      }
    };

    window.addEventListener('keyup', handleWindowKeyUp);
    return () => window.removeEventListener('keyup', handleWindowKeyUp);
  }, [isViewer, isLoadingBoard, triggerAutoSave, bindingRef, editorRef, isDeliberateClearRef, previewSnapshotRef]);

  // Multi-page canvas action handlers
  const handleSelectPage = useCallback((pageId: string) => {
    if (!editorRef.current) return;
    const anyEditor = editorRef.current as any;

    // Cache current page viewport
    if (anyEditor.currentPage) {
      if (typeof anyEditor.getOrigin === 'function') {
        anyEditor.currentPage.pageOrigin = anyEditor.getOrigin();
      } else if (anyEditor.canvas?.origin) {
        anyEditor.currentPage.pageOrigin = [...anyEditor.canvas.origin];
      }
      if (typeof anyEditor.getScale === 'function') {
        anyEditor.currentPage.pageScale = anyEditor.getScale();
      } else if (anyEditor.canvas?.scale !== undefined) {
        anyEditor.currentPage.pageScale = anyEditor.canvas.scale;
      }
    }

    const pages = typeof anyEditor.getPages === 'function'
      ? anyEditor.getPages()
      : (anyEditor.doc?.children || anyEditor.store?.root?.children || []);
    const targetPage = Array.isArray(pages) ? pages.find((p: any) => p.id === pageId) : null;
    if (targetPage && typeof anyEditor.setCurrentPage === 'function') {
      anyEditor.setCurrentPage(targetPage);
      setActivePageId(pageId);
      refreshPages();
      if (isDeliberateClearRef?.current !== undefined) {
        (isDeliberateClearRef as any).current = true;
      }
      bindingRef.current?.syncEditorToYjs();
      triggerAutoSave();
    }
  }, [editorRef, bindingRef, triggerAutoSave, refreshPages, isDeliberateClearRef]);

  const handleAddPage = useCallback((name?: any) => {
    if (!editorRef.current || isViewer) return;
    const anyEditor = editorRef.current as any;

    // Save current viewport
    if (anyEditor.currentPage) {
      if (typeof anyEditor.getOrigin === 'function') {
        anyEditor.currentPage.pageOrigin = anyEditor.getOrigin();
      } else if (anyEditor.canvas?.origin) {
        anyEditor.currentPage.pageOrigin = [...anyEditor.canvas.origin];
      }
      if (typeof anyEditor.getScale === 'function') {
        anyEditor.currentPage.pageScale = anyEditor.getScale();
      } else if (anyEditor.canvas?.scale !== undefined) {
        anyEditor.currentPage.pageScale = anyEditor.canvas.scale;
      }
    }

    const fullDoc = serializeDocWithCustomData(editorRef.current);
    if (!fullDoc) return;
    if (!Array.isArray(fullDoc.children)) {
      fullDoc.children = [];
    }
    normalizeDocTypes(fullDoc);

    const pageNum = fullDoc.children.length + 1;
    const newPageName = (typeof name === 'string' && name.trim().length > 0) ? name.trim() : `Page ${pageNum}`;
    const newPageId = `page_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newPageDoc = {
      type: 'Page',
      _type: 'Page',
      id: newPageId,
      name: newPageName,
      pageOrigin: [0, 0],
      pageScale: 1,
      children: [],
    };

    fullDoc.children.push(newPageDoc);
    fullDoc.activePageId = newPageId;
    normalizeDocTypes(fullDoc);

    if (isDeliberateClearRef?.current !== undefined) {
      (isDeliberateClearRef as any).current = true;
    }

    editorRef.current.loadFromJSON(fullDoc);
    restoreDocCustomData(editorRef.current, fullDoc);

    const pages = typeof anyEditor.getPages === 'function'
      ? anyEditor.getPages()
      : (anyEditor.doc?.children || anyEditor.store?.root?.children || []);
    const createdPage = pages.find((p: any) => p.id === newPageId) || pages[pages.length - 1];
    if (createdPage && typeof anyEditor.setCurrentPage === 'function') {
      anyEditor.setCurrentPage(createdPage);
    }

    setActivePageId(newPageId);
    refreshPages();
    bindingRef.current?.syncEditorToYjs();
    triggerAutoSave(true);

    setToastMessage(`Created ${newPageName}`);
    setTimeout(() => setToastMessage(null), 2500);
  }, [editorRef, isViewer, bindingRef, triggerAutoSave, refreshPages, setToastMessage, isDeliberateClearRef]);

  const handleDuplicatePage = useCallback((pageId: string) => {
    if (!editorRef.current || isViewer) return;
    const anyEditor = editorRef.current as any;

    const fullDoc = serializeDocWithCustomData(editorRef.current);
    if (!fullDoc || !Array.isArray(fullDoc.children)) return;
    normalizeDocTypes(fullDoc);

    const sourceIndex = fullDoc.children.findIndex((p: any) => p.id === pageId);
    if (sourceIndex === -1) return;
    const sourcePage = fullDoc.children[sourceIndex];

    const newPageId = `page_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newPageName = `${sourcePage.name || 'Page'} (Copy)`;

    const cloneChildWithFreshIds = (child: any) => {
      const cloned = JSON.parse(JSON.stringify(child));
      cloned.id = `shape_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      if (Array.isArray(cloned.children)) {
        cloned.children = cloned.children.map(cloneChildWithFreshIds);
      }
      return cloned;
    };

    const clonedChildren = Array.isArray(sourcePage.children)
      ? sourcePage.children.map(cloneChildWithFreshIds)
      : [];

    const newPageDoc = {
      ...JSON.parse(JSON.stringify(sourcePage)),
      type: 'Page',
      _type: 'Page',
      id: newPageId,
      name: newPageName,
      pageOrigin: sourcePage.pageOrigin ? [...sourcePage.pageOrigin] : [0, 0],
      pageScale: sourcePage.pageScale ?? 1,
      children: clonedChildren,
    };

    fullDoc.children.splice(sourceIndex + 1, 0, newPageDoc);
    fullDoc.activePageId = newPageId;
    normalizeDocTypes(fullDoc);

    if (isDeliberateClearRef?.current !== undefined) {
      (isDeliberateClearRef as any).current = true;
    }

    editorRef.current.loadFromJSON(fullDoc);
    restoreDocCustomData(editorRef.current, fullDoc);

    const pages = typeof anyEditor.getPages === 'function'
      ? anyEditor.getPages()
      : (anyEditor.doc?.children || anyEditor.store?.root?.children || []);
    const createdPage = pages.find((p: any) => p.id === newPageId) || pages[sourceIndex + 1];
    if (createdPage && typeof anyEditor.setCurrentPage === 'function') {
      anyEditor.setCurrentPage(createdPage);
    }

    setActivePageId(newPageId);
    refreshPages();
    bindingRef.current?.syncEditorToYjs();
    triggerAutoSave(true);

    setToastMessage(`Duplicated as ${newPageName}`);
    setTimeout(() => setToastMessage(null), 2500);
  }, [editorRef, isViewer, bindingRef, triggerAutoSave, refreshPages, setToastMessage, isDeliberateClearRef]);

  const handleRenamePage = useCallback((pageId: string, newName: string) => {
    if (!editorRef.current || isViewer) return;
    const cleanName = newName.trim();
    if (!cleanName) return;
    const anyEditor = editorRef.current as any;

    const fullDoc = serializeDocWithCustomData(editorRef.current);
    if (!fullDoc || !Array.isArray(fullDoc.children)) return;
    normalizeDocTypes(fullDoc);

    const targetPage = fullDoc.children.find((p: any) => p.id === pageId);
    if (!targetPage) return;
    targetPage.name = cleanName;
    normalizeDocTypes(fullDoc);

    editorRef.current.loadFromJSON(fullDoc);
    restoreDocCustomData(editorRef.current, fullDoc);

    const pages = typeof anyEditor.getPages === 'function'
      ? anyEditor.getPages()
      : (anyEditor.doc?.children || anyEditor.store?.root?.children || []);
    const activePage = pages.find((p: any) => p.id === activePageId) || pages[0];
    if (activePage && typeof anyEditor.setCurrentPage === 'function') {
      anyEditor.setCurrentPage(activePage);
    }

    refreshPages();
    bindingRef.current?.syncEditorToYjs();
    triggerAutoSave(true);
  }, [editorRef, isViewer, activePageId, bindingRef, triggerAutoSave, refreshPages]);

  const handleReorderPages = useCallback((startIndex: number, endIndex: number) => {
    if (!editorRef.current || isViewer) return;
    const anyEditor = editorRef.current as any;

    const fullDoc = serializeDocWithCustomData(editorRef.current);
    if (!fullDoc || !Array.isArray(fullDoc.children)) return;
    normalizeDocTypes(fullDoc);

    if (startIndex < 0 || endIndex < 0 || startIndex >= fullDoc.children.length || endIndex >= fullDoc.children.length) {
      return;
    }

    const [moved] = fullDoc.children.splice(startIndex, 1);
    fullDoc.children.splice(endIndex, 0, moved);
    normalizeDocTypes(fullDoc);

    editorRef.current.loadFromJSON(fullDoc);
    restoreDocCustomData(editorRef.current, fullDoc);

    const pages = typeof anyEditor.getPages === 'function'
      ? anyEditor.getPages()
      : (anyEditor.doc?.children || anyEditor.store?.root?.children || []);
    const activePage = pages.find((p: any) => p.id === activePageId) || pages[0];
    if (activePage && typeof anyEditor.setCurrentPage === 'function') {
      anyEditor.setCurrentPage(activePage);
    }

    refreshPages();
    bindingRef.current?.syncEditorToYjs();
    triggerAutoSave(true);
  }, [editorRef, isViewer, activePageId, bindingRef, triggerAutoSave, refreshPages]);

  const handleDeletePage = useCallback((pageId: string) => {
    if (!editorRef.current || isViewer) return;
    const anyEditor = editorRef.current as any;

    const fullDoc = serializeDocWithCustomData(editorRef.current);
    if (!fullDoc || !Array.isArray(fullDoc.children)) {
      return;
    }
    normalizeDocTypes(fullDoc);
    if (fullDoc.children.length <= 1) {
      setToastMessage('Cannot delete the only remaining page.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const targetIndex = fullDoc.children.findIndex((p: any) => p.id === pageId);
    if (targetIndex === -1) return;
    const targetPage = fullDoc.children[targetIndex];

    let nextActivePageId = activePageId;
    if (activePageId === pageId || anyEditor.currentPage?.id === pageId) {
      const nextIndex = targetIndex > 0 ? targetIndex - 1 : 1;
      nextActivePageId = fullDoc.children[nextIndex]?.id || fullDoc.children[0]?.id;
    }

    fullDoc.children.splice(targetIndex, 1);
    fullDoc.activePageId = nextActivePageId;
    normalizeDocTypes(fullDoc);

    if (isDeliberateClearRef?.current !== undefined) {
      (isDeliberateClearRef as any).current = true;
    }

    editorRef.current.loadFromJSON(fullDoc);
    restoreDocCustomData(editorRef.current, fullDoc);

    const pages = typeof anyEditor.getPages === 'function'
      ? anyEditor.getPages()
      : (anyEditor.doc?.children || anyEditor.store?.root?.children || []);
    const nextActivePage = pages.find((p: any) => p.id === nextActivePageId) || pages[0];
    if (nextActivePage && typeof anyEditor.setCurrentPage === 'function') {
      anyEditor.setCurrentPage(nextActivePage);
    }

    setActivePageId(nextActivePageId);
    refreshPages();
    bindingRef.current?.syncEditorToYjs();
    triggerAutoSave(true);

    setToastMessage(`Deleted page ${targetPage.name || ''}`);
    setTimeout(() => setToastMessage(null), 2500);
  }, [editorRef, isViewer, activePageId, isDeliberateClearRef, bindingRef, triggerAutoSave, refreshPages, setToastMessage]);

  return {
    isEditorReady,
    setIsEditorReady,
    pages,
    activePageId,
    isPageDrawerOpen,
    setIsPageDrawerOpen,
    handleSelectPage,
    handleAddPage,
    handleDuplicatePage,
    handleRenamePage,
    handleReorderPages,
    handleDeletePage,
    refreshPages,
    activeTool,
    setActiveTool,
    activeColor,
    setActiveColor,
    activeColorRef,
    canvasConfig,
    setCanvasConfig,
    handleUpdateCanvasConfig,
    contextMenu,
    setContextMenu,
    focusedShapeIds,
    setFocusedShapeIds,
    isAiInlineBarOpen,
    setIsAiInlineBarOpen,
    isAiGenerating,
    handleColorChange,
    handleToolSelect,
    handleDeleteSelectedShapes,
    handleZoom,
    handleBringToFront,
    handleSendToBack,
    handleContextMenuColorChange,
    handleTextStyling,
    handleRotate,
    handleToggleLock,
    handleGroup,
    handleUngroup,
    handleSetLineArrow,
    handleSaveShapeProperties,
    handleOpenScriptDrawer,
    handleSaveShapeCustomization,
    handleSaveShapeScript,
    handleRevertShapeScript,
    handleClearShapeScript,
    handleExportSVG,
    handleExportPNG,
    handleExportPDF,
    handleExportJSON,
    handleImageUpload,
    handleInsertStencil,
    handleInsertAiDiagram,
    handleInlineAiPrompt,
  };
}
