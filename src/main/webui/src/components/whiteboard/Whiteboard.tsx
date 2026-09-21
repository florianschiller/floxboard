'use client';

import { Editor, Page, Doc } from "@dgmjs/core";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/themeContext";
import * as api from "@/lib/api";
import { YjsDgmBinding } from "@/lib/yjs-dgm-binding";
import { useWhiteboardCollab, FocusEventPayload, getUserColor } from "@/lib/useWhiteboardCollab";
import { 
  updateShapeTextProportions, 
  ensureCenteredTextDoc, 
  centerOnContent, 
  ensureAllShapesCentered,
  toggleShapeLock,
  rotateShapes,
  applyColorToShapes,
  applyTextStyling,
  setLineArrows,
  isOpenLineShape,
  isGroupShape,
  calculateImageDimensions,
  createImageShape,
  serializeDocWithCustomData,
  restoreDocCustomData,
  setupScriptedShapeRendering,
  exportWhiteboardToSVG,
  exportWhiteboardToPNG,
  exportWhiteboardToPDF,
  serializeShapesToStencil,
  instantiateStencilShapes,
} from "@/lib/shapeUtils";

import { StencilItem } from "@/types/shapeLibrary";
import { WhiteboardVotingConfig, ShapeVote, DEFAULT_VOTING_CONFIG } from "@/types/voting";
import { RequestAccessView } from "../RequestAccessView";
import { WhiteboardHeader } from "../WhiteboardHeader";
import { WhiteboardTool } from "../WhiteboardToolbar";
import { CanvasConfig, CanvasTheme, GridStyle } from "../WhiteboardConfigModal";
import { ShapeCustomizationPayload } from "../ShapeScriptDrawer";
import { THEME_CANVAS_COLORS, DARK_THEME_CANVAS_COLORS } from "./constants";
import { WhiteboardProps } from "./types";

import { useWhiteboardModals } from "./hooks/useWhiteboardModals";
import { useWhiteboardVoting } from "./hooks/useWhiteboardVoting";
import { useWhiteboardPersistence } from "./hooks/useWhiteboardPersistence";
import { useWhiteboardState } from "./hooks/useWhiteboardState";

import { WhiteboardCanvas } from "./components/WhiteboardCanvas";
import { WhiteboardModalsContainer } from "./components/WhiteboardModalsContainer";
import { Crosshair } from "lucide-react";

export { THEME_CANVAS_COLORS, DARK_THEME_CANVAS_COLORS };

export default function Whiteboard({ onBoardChange }: WhiteboardProps = {}) {
  const { user, token, refreshToken } = useAuth();
  const { resolvedTheme } = useTheme();
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const bindingRef = useRef<YjsDgmBinding | null>(null);

  const [isEditorReady, setIsEditorReady] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedShapesForStencil, setSelectedShapesForStencil] = useState<any[]>([]);
  const [editingShape, setEditingShape] = useState<any | null>(null);
  const [scriptDrawerShape, setScriptDrawerShape] = useState<any | null>(null);
  const [shapeResizeTick, setShapeResizeTick] = useState(0);

  // Modals management hook
  const modals = useWhiteboardModals();

  const isScriptDrawerOpenRef = useRef(modals.isScriptDrawerOpen);
  useEffect(() => {
    isScriptDrawerOpenRef.current = modals.isScriptDrawerOpen;
  }, [modals.isScriptDrawerOpen]);

  // Preview snapshot ref
  const previewSnapshotRef = useRef<api.WhiteboardSnapshotDto | null>(null);

  // Voting hook
  const voting = useWhiteboardVoting({
    editorRef,
    bindingRef,
    previewSnapshotRef,
    user,
    triggerAutoSave: (immediate?: boolean) => persistence.triggerAutoSave(immediate),
    setToastMessage,
  });

  // Persistence hook
  const persistence = useWhiteboardPersistence({
    id,
    user,
    isEditorReady,
    editorRef,
    bindingRef,
    votingConfig: voting.votingConfig,
    setVotingConfig: voting.setVotingConfig,
    setVotingTick: voting.setVotingTick,
    onBoardChange,
    setToastMessage,
    navigate,
  });

  // Collaboration hook
  const collabUser = useMemo(() => ({
    id: user?.profile?.sub || 'user-anon',
    name: user?.profile?.name || user?.profile?.preferred_username || user?.profile?.email || 'Anonymous',
    avatar: user?.profile?.avatar as string | undefined,
  }), [user]);

  const {
    peers,
    status: collabStatus,
    updatePresence,
    broadcastFocus,
    yDoc,
  } = useWhiteboardCollab({
    boardId: persistence.currentBoardId,
    token: token || user?.access_token || null,
    user: collabUser,
    refreshToken,
    onFocusReceived: useCallback((focus: FocusEventPayload) => {
      if (!editorRef.current) return;
      editorRef.current.scrollCenterTo(focus.center);
      state.setFocusedShapeIds(focus.shapeIds);
      setTimeout(() => state.setFocusedShapeIds([]), 3500);
    }, []),
  });

  // Whiteboard state & shape actions hook
  const state = useWhiteboardState({
    editorRef,
    bindingRef,
    previewSnapshotRef,
    resolvedTheme: resolvedTheme || 'light',
    isViewer: persistence.isViewer,
    isLoadingBoard: persistence.isLoadingBoard,
    currentBoardId: persistence.currentBoardId,
    currentBoardName: persistence.currentBoardName,
    isEditorReady,
    setIsEditorReady,
    isDeliberateClearRef: persistence.isDeliberateClearRef,
    triggerAutoSave: (immediate?: boolean) => persistence.triggerAutoSave(immediate),
    updatePresence,
    broadcastFocus,
    setVotingTick: voting.setVotingTick,
    setIsSaveStencilModalOpen: modals.setIsSaveStencilModalOpen,
    setSaveStencilInitialShapes: setSelectedShapesForStencil,
    setIsPropertiesModalOpen: modals.setIsPropertiesModalOpen,
    setEditingShape,
    setIsScriptDrawerOpen: modals.setIsScriptDrawerOpen,
    setScriptDrawerShape,
    setToastMessage,
    navigate,
  });

  // Connect Yjs binding
  useEffect(() => {
    if (!yDoc || typeof yDoc.getMap !== 'function' || !editorRef.current || !isEditorReady || !persistence.currentBoardId) {
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
      return;
    }
    const binding = new YjsDgmBinding(editorRef.current, yDoc, () => {
      state.refreshPages();
      persistence.triggerAutoSave();
    });
    bindingRef.current = binding;

    return () => {
      binding.destroy();
      bindingRef.current = null;
    };
  }, [yDoc, isEditorReady, persistence.currentBoardId, persistence.triggerAutoSave, state.refreshPages]);

  // Mount handler for DGM Editor
  const handleMount = useCallback(async (editor: Editor) => {
    editorRef.current = editor;
    const isDark = resolvedTheme === 'dark';
    const colorMap = isDark ? DARK_THEME_CANVAS_COLORS : THEME_CANVAS_COLORS;
    const colors = colorMap[state.canvasConfig.theme] || colorMap.slate;
    editor.options.canvasColor = colors.canvas;
    editor.options.blankColor = colors.blank;
    if (colors.grid) {
      editor.options.gridColor = colors.grid;
    }
    editor.setShowGrid(state.canvasConfig.gridStyle !== 'none');
    editor.setSnapToGrid(state.canvasConfig.snapToGrid);
    editor.setDarkMode(isDark);
    editor.newDoc();
    editor.fitToScreen();
    centerOnContent(editor);
    setIsEditorReady(true);
    
    const handleResize = () => {
      editor.fit();
    };
    window.addEventListener("resize", handleResize);

    const dInit = editor.factory?.onShapeInitialize?.addListener?.((shape: any) => {
      updateShapeTextProportions(shape, editor);
      const type = shape.type || shape._type;
      if (type === 'Freehand') {
        shape.strokeColor = state.activeColorRef.current.stroke;
        shape.strokeWidth = 2;
      } else if (type === 'Highlighter') {
        shape.strokeColor = state.activeColorRef.current.stroke;
        shape.strokeWidth = 14;
        shape.alpha = 0.35;
      }
    });

    const dCreate = editor.factory?.onCreate?.addListener?.((shape: any) => {
      if (persistence.previewSnapshotRef.current) return;
      const type = shape.type || shape._type;
      if (type === 'Freehand') {
        shape.strokeColor = state.activeColorRef.current.stroke;
      } else if (type === 'Highlighter') {
        shape.strokeColor = state.activeColorRef.current.stroke;
        shape.alpha = 0.35;
        if (!shape.strokeWidth || shape.strokeWidth < 12) {
          shape.strokeWidth = 14;
        }
      }
      editor.repaint();
      bindingRef.current?.syncEditorToYjs();
      persistence.triggerAutoSave();
    });

    const dHandler = editor.onActiveHandlerChange?.addListener?.((handlerId: string) => {
      const reverseMap: Record<string, WhiteboardTool> = {
        Select: 'select',
        Freehand: 'freehand',
        Highlighter: 'marker',
        Eraser: 'eraser',
        Line: 'line',
        Connector: 'connector',
        Frame: 'frame',
        Rectangle: 'rectangle',
        Ellipse: 'ellipse',
        Text: 'text',
      };
      if (reverseMap[handlerId]) {
        state.setActiveTool(reverseMap[handlerId]);
      }
    });

    const handleShapeTransformSync = () => {
      if (persistence.previewSnapshotRef.current) return;
      const selected = editor.selection?.getShapes?.() || [];
      for (const s of selected) {
        updateShapeTextProportions(s, editor);
      }
      if (isScriptDrawerOpenRef.current && selected.length > 0) {
        setScriptDrawerShape(selected[0]);
        setShapeResizeTick((t) => (t + 1) % 10000);
      }
      ensureAllShapesCentered(editor);
      editor.repaint();
      bindingRef.current?.syncEditorToYjs();
      persistence.triggerAutoSave();
    };

    const dTransact = (editor.transform as any)?.onTransaction?.addListener?.(handleShapeTransformSync);
    const dTransact2 = (editor.transform as any)?.onTransact?.addListener?.(handleShapeTransformSync);
    const dAction = (editor.transform as any)?.onAction?.addListener?.(handleShapeTransformSync);
    const dAction2 = (editor.actions as any)?.onAction?.addListener?.(handleShapeTransformSync);
    const dCreated = (editor.factory as any)?.onCreated?.addListener?.(handleShapeTransformSync);

    const dUndo = editor.transform?.onUndo?.addListener?.(() => {
      if (persistence.previewSnapshotRef.current) return;
      if (persistence.isDeliberateClearRef.current !== undefined) {
        (persistence.isDeliberateClearRef as any).current = true;
      }
      bindingRef.current?.syncEditorToYjs();
      persistence.triggerAutoSave();
    });

    const dRedo = editor.transform?.onRedo?.addListener?.(() => {
      if (persistence.previewSnapshotRef.current) return;
      if (persistence.isDeliberateClearRef.current !== undefined) {
        (persistence.isDeliberateClearRef as any).current = true;
      }
      bindingRef.current?.syncEditorToYjs();
      persistence.triggerAutoSave();
    });

    const d3 = editor.selection?.onSelect?.addListener?.(() => {
      const selected = editor.selection?.getShapes?.() || [];
      if (selected.length > 0) {
        state.setContextMenu(null);
        if (isScriptDrawerOpenRef.current) {
          const s = selected[0];
          if (s.customData?.fontColor && !s.fontColor) {
            s.fontColor = s.customData.fontColor;
          }
          setScriptDrawerShape(s);
          setShapeResizeTick((t) => (t + 1) % 10000);
        }
      }
      voting.setVotingTick((t) => (t + 1) % 10000);
    });

    const d4 = (editor.selection as any)?.onChange?.addListener?.((shapes: any[]) => {
      if (shapes && shapes.length > 0) {
        state.setContextMenu(null);
      }
      voting.setVotingTick((t) => (t + 1) % 10000);
      if (isScriptDrawerOpenRef.current && shapes && shapes.length > 0) {
        const s = shapes[0];
        if (s.customData?.fontColor && !s.fontColor) {
          s.fontColor = s.customData.fontColor;
        }
        setScriptDrawerShape(s);
        setShapeResizeTick((t) => (t + 1) % 10000);
      }
    });

    const d5 = editor.selection?.onDeselect?.addListener?.(() => {
      state.setContextMenu(null);
      voting.setVotingTick((t) => (t + 1) % 10000);
    });

    const dRepaint = editor.onRepaint?.addListener?.(() => {
      voting.setVotingTick((t) => (t + 1) % 10000);
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      dInit?.dispose?.();
      dCreate?.dispose?.();
      dHandler?.dispose?.();
      dTransact?.dispose?.();
      dTransact2?.dispose?.();
      dAction?.dispose?.();
      dAction2?.dispose?.();
      dCreated?.dispose?.();
      dUndo?.dispose?.();
      dRedo?.dispose?.();
      d3?.dispose?.();
      d4?.dispose?.();
      d5?.dispose?.();
      dRepaint?.dispose?.();
    };
  }, [persistence.triggerAutoSave, updatePresence, resolvedTheme, state.canvasConfig]);

  // Toolbar shape adder helpers
  const handleAddShape = useCallback((type: 'rectangle' | 'ellipse' | 'frame') => {
    if (!editorRef.current || persistence.isViewer) return;
    const editor = editorRef.current;
    const center = editor.getCenter();
    const w = 140;
    const h = 80;
    const left = center[0] - w / 2;
    const top = center[1] - h / 2;

    let shape: any;
    if (type === 'frame') {
      shape = editor.factory?.createFrame?.([
        [left, top],
        [left + 320, top + 220],
      ]) || {
        type: 'Frame',
        left,
        top,
        width: 320,
        height: 220,
        title: 'New Frame',
        name: 'New Frame',
        fillColor: 'transparent',
        strokeColor: state.activeColor.stroke,
      };
    } else if (type === 'ellipse') {
      shape = editor.factory?.createEllipse?.([
        [left, top],
        [left + w, top + h],
      ]) || {
        type: 'Ellipse',
        left,
        top,
        width: w,
        height: h,
        fillColor: state.activeColor.fill,
        strokeColor: state.activeColor.stroke,
      };
    } else {
      shape = editor.factory?.createRectangle?.([
        [left, top],
        [left + w, top + h],
      ]) || {
        type: 'Rectangle',
        left,
        top,
        width: w,
        height: h,
        fillColor: state.activeColor.fill,
        strokeColor: state.activeColor.stroke,
      };
    }

    if (shape) {
      if (editor.actions?.insert) {
        editor.actions.insert(shape);
      } else if (editor.actions?.add) {
        editor.actions.add(shape);
      }
      editor.selection?.select?.([shape]);
      editor.repaint();
      bindingRef.current?.syncEditorToYjs();
      persistence.triggerAutoSave();
    }
  }, [persistence.isViewer, state.activeColor, editorRef, bindingRef, persistence.triggerAutoSave]);

  const handleAddLine = useCallback(() => {
    if (!editorRef.current || persistence.isViewer) return;
    const editor = editorRef.current;
    const center = editor.getCenter();
    const line = editor.factory?.createLine?.([
      [center[0] - 60, center[1]],
      [center[0] + 60, center[1]],
    ]) || {
      type: 'Line',
      points: [
        [center[0] - 60, center[1]],
        [center[0] + 60, center[1]],
      ],
      strokeColor: state.activeColor.stroke,
      strokeWidth: 2,
    };
    if (editor.actions?.insert) {
      editor.actions.insert(line);
    } else if (editor.actions?.add) {
      editor.actions.add(line);
    }
    editor.selection?.select?.([line]);
    editor.repaint();
    bindingRef.current?.syncEditorToYjs();
    persistence.triggerAutoSave();
  }, [persistence.isViewer, state.activeColor, editorRef, bindingRef, persistence.triggerAutoSave]);

  const handleAddConnector = useCallback(() => {
    if (!editorRef.current || persistence.isViewer) return;
    const editor = editorRef.current;
    const center = editor.getCenter();
    const conn = editor.factory?.createConnector?.([
      [center[0] - 60, center[1]],
      [center[0] + 60, center[1]],
    ]) || {
      type: 'Connector',
      points: [
        [center[0] - 60, center[1]],
        [center[0] + 60, center[1]],
      ],
      strokeColor: state.activeColor.stroke,
      strokeWidth: 2,
      headEndType: 'arrow',
    };
    if (editor.actions?.insert) {
      editor.actions.insert(conn);
    } else if (editor.actions?.add) {
      editor.actions.add(conn);
    }
    editor.selection?.select?.([conn]);
    editor.repaint();
    bindingRef.current?.syncEditorToYjs();
    persistence.triggerAutoSave();
  }, [persistence.isViewer, state.activeColor, editorRef, bindingRef, persistence.triggerAutoSave]);

  const handleAddFrame = useCallback(() => {
    handleAddShape('frame');
  }, [handleAddShape]);

  const handleAddText = useCallback(() => {
    if (!editorRef.current || persistence.isViewer) return;
    const editor = editorRef.current;
    const center = editor.getCenter();
    const txt = editor.factory?.createText?.([
      [center[0] - 60, center[1] - 20],
      [center[0] + 60, center[1] + 20],
    ]) || {
      type: 'Text',
      left: center[0] - 60,
      top: center[1] - 20,
      width: 120,
      height: 40,
      text: 'Text',
      fontColor: state.activeColor.stroke,
    };
    if (editor.actions?.insert) {
      editor.actions.insert(txt);
    } else if (editor.actions?.add) {
      editor.actions.add(txt);
    }
    editor.selection?.select?.([txt]);
    editor.repaint();
    bindingRef.current?.syncEditorToYjs();
    persistence.triggerAutoSave();
  }, [persistence.isViewer, state.activeColor, editorRef, bindingRef, persistence.triggerAutoSave]);

  // Pointer move handler to broadcast cursor in GCS
  const lastPointerSentRef = useRef<number>(0);
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!editorRef.current || !editorRef.current.canvas || !containerRef.current) return;
    const now = Date.now();
    if (now - lastPointerSentRef.current < 40) return;
    lastPointerSentRef.current = now;

    const rect = containerRef.current.getBoundingClientRect();
    const dcsX = e.clientX - rect.left;
    const dcsY = e.clientY - rect.top;
    const canvas = editorRef.current.canvas;
    const gcsX = dcsX / canvas.scale - canvas.origin[0];
    const gcsY = dcsY / canvas.scale - canvas.origin[1];
    updatePresence({ cursor: [gcsX, gcsY] });
  };

  const handlePointerLeave = () => {
    updatePresence({ cursor: null });
  };

  const handlePointerUp = useCallback(() => {
    if (!editorRef.current || persistence.isViewer || persistence.isLoadingBoard || persistence.previewSnapshot) return;
    if (state.activeTool === 'eraser') {
      if (persistence.isDeliberateClearRef.current !== undefined) {
        (persistence.isDeliberateClearRef as any).current = true;
      }
    }
    bindingRef.current?.syncEditorToYjs();
    persistence.triggerAutoSave();
  }, [persistence.isViewer, persistence.isLoadingBoard, persistence.previewSnapshot, state.activeTool, persistence.triggerAutoSave, bindingRef, persistence.isDeliberateClearRef]);

  // Context Menu handler
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (persistence.isViewer || !editorRef.current || !containerRef.current) return;

    const editor = editorRef.current;
    const containerRect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - containerRect.left;
    const clickY = e.clientY - containerRect.top;

    const canvas = editor.canvas;
    const clickRatio = canvas?.ratio || 1;
    const modelPoint = typeof canvas?.globalCoordTransformRev === 'function'
      ? canvas.globalCoordTransformRev([clickX * clickRatio, clickY * clickRatio])
      : [clickX / (canvas?.scale || 1) - (canvas?.origin?.[0] || 0), clickY / (canvas?.scale || 1) - (canvas?.origin?.[1] || 0)];

    const page = typeof (editor as any).getCurrentPage === 'function'
      ? (editor as any).getCurrentPage()
      : (editor as any).currentPage;
    const doc = editor.store?.root;
    
    const rawShapeAtPoint = page?.getShapeAt?.(canvas, modelPoint) || null;

    let shapeAtPoint = rawShapeAtPoint;
    while (shapeAtPoint && shapeAtPoint.parent && isGroupShape(shapeAtPoint.parent)) {
      shapeAtPoint = shapeAtPoint.parent;
    }

    const selectedShapes = editor.selection?.getShapes?.() || [];

    if (
      shapeAtPoint &&
      shapeAtPoint !== page &&
      shapeAtPoint !== doc &&
      !(typeof Page !== 'undefined' && shapeAtPoint instanceof Page) &&
      !(typeof Doc !== 'undefined' && shapeAtPoint instanceof Doc) &&
      shapeAtPoint.type !== 'Page' &&
      shapeAtPoint.type !== 'Doc' &&
      typeof shapeAtPoint.getRectInDCS === 'function'
    ) {
      if (selectedShapes.some((s: any) => s.id === shapeAtPoint.id || s === shapeAtPoint) && selectedShapes.length > 1) {
        state.setContextMenu({
          position: { x: clickX, y: clickY },
          shapes: selectedShapes,
        });
      } else {
        editor.selection?.select?.([shapeAtPoint]);
        editor.repaint();
        state.setContextMenu({
          position: { x: clickX, y: clickY },
          shapes: [shapeAtPoint],
        });
      }
    } else {
      state.setContextMenu(null);
    }
  }, [persistence.isViewer, state, editorRef]);

  // Drag and Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (persistence.isViewer) return;
    if (e.dataTransfer.types.includes('Files') || e.dataTransfer.types.includes('application/x-floxboard-stencil')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }, [persistence.isViewer]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    if (persistence.isViewer || !editorRef.current || !containerRef.current) return;

    const stencilData = e.dataTransfer.getData('application/x-floxboard-stencil');
    if (stencilData) {
      e.preventDefault();
      try {
        const stencil = JSON.parse(stencilData) as StencilItem;
        const containerRect = containerRef.current.getBoundingClientRect();
        const canvas = editorRef.current.canvas;
        const gcsX = (e.clientX - containerRect.left) / canvas.scale - canvas.origin[0];
        const gcsY = (e.clientY - containerRect.top) / canvas.scale - canvas.origin[1];
        state.handleInsertStencil(stencil, { x: gcsX, y: gcsY });
      } catch (err) {
        console.error('Failed to parse dropped stencil:', err);
      }
      return;
    }

    const files = Array.from(e.dataTransfer.files).filter((f) => 
      f.type.startsWith('image/') || f.name.match(/\.(png|jpe?g|webp|svg|gif)$/i)
    );
    if (files.length === 0) return;

    e.preventDefault();
    const containerRect = containerRef.current.getBoundingClientRect();
    const canvas = editorRef.current.canvas;
    const gcsX = (e.clientX - containerRect.left) / canvas.scale - canvas.origin[0];
    const gcsY = (e.clientY - containerRect.top) / canvas.scale - canvas.origin[1];

    files.forEach((file, index) => {
      state.handleImageUpload(file, [gcsX + index * 20, gcsY + index * 20]);
    });
  }, [persistence.isViewer, state, editorRef]);

  // Undo / Redo / Focus helpers
  const handleUndo = useCallback(() => {
    if (!editorRef.current || persistence.isViewer) return;
    editorRef.current.undo?.();
    editorRef.current.repaint();
    if (persistence.isDeliberateClearRef.current !== undefined) {
      (persistence.isDeliberateClearRef as any).current = true;
    }
    bindingRef.current?.syncEditorToYjs();
    persistence.triggerAutoSave();
  }, [persistence.isViewer, editorRef, bindingRef, persistence.triggerAutoSave, persistence.isDeliberateClearRef]);

  const handleRedo = useCallback(() => {
    if (!editorRef.current || persistence.isViewer) return;
    editorRef.current.redo?.();
    editorRef.current.repaint();
    if (persistence.isDeliberateClearRef.current !== undefined) {
      (persistence.isDeliberateClearRef as any).current = true;
    }
    bindingRef.current?.syncEditorToYjs();
    persistence.triggerAutoSave();
  }, [persistence.isViewer, editorRef, bindingRef, persistence.triggerAutoSave, persistence.isDeliberateClearRef]);

  const handleFocusAllOnSelection = useCallback(() => {
    if (!editorRef.current) return;
    const selected = editorRef.current.selection?.getShapes?.() || [];
    if (selected.length === 0) return;

    const xs = selected.map((s: any) => s.getCenter ? s.getCenter()[0] : (s.left || 0));
    const ys = selected.map((s: any) => s.getCenter ? s.getCenter()[1] : (s.top || 0));
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;

    editorRef.current.scrollCenterTo([centerX, centerY]);
    state.setFocusedShapeIds(selected.map((s: any) => s.id));
    setTimeout(() => state.setFocusedShapeIds([]), 3500);

    broadcastFocus(selected.map((s: any) => s.id), [centerX, centerY]);
    setToastMessage("Focused everyone on selection");
    setTimeout(() => setToastMessage(null), 3000);
  }, [editorRef, broadcastFocus, state]);

  const handleImportJSON = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (persistence.isViewer) return;
    const file = e.target.files?.[0];
    if (!file || !editorRef.current) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (persistence.isDeliberateClearRef.current !== undefined) {
          (persistence.isDeliberateClearRef as any).current = true;
        }
        editorRef.current?.loadFromJSON(json);
        restoreDocCustomData(editorRef.current, json);

        const anyEditor = editorRef.current as any;
        const pages = typeof anyEditor.getPages === 'function'
          ? anyEditor.getPages()
          : (anyEditor.doc?.children || anyEditor.store?.root?.children || []);
        if (Array.isArray(pages) && pages.length > 0 && typeof anyEditor.setCurrentPage === 'function') {
          const targetPage = (json?.activePageId && pages.find((p: any) => p.id === json.activePageId)) || pages[0];
          if (targetPage && anyEditor.currentPage !== targetPage) {
            anyEditor.setCurrentPage(targetPage);
          }
        }
        state.refreshPages();

        if (json?.customData?.votingConfig) {
          voting.setVotingConfig(json.customData.votingConfig);
        }
        ensureAllShapesCentered(editorRef.current);
        centerOnContent(editorRef.current);
        editorRef.current?.repaint();
        bindingRef.current?.syncEditorToYjs();
        persistence.triggerAutoSave();
      } catch (err) {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [persistence.isViewer, voting.setVotingConfig, persistence.triggerAutoSave, bindingRef, persistence.isDeliberateClearRef]);

  const handleClearCanvas = useCallback(() => {
    if (!editorRef.current) return;
    if (persistence.isDeliberateClearRef.current !== undefined) {
      (persistence.isDeliberateClearRef as any).current = true;
    }
    editorRef.current.newDoc();
    editorRef.current.repaint();
    bindingRef.current?.syncEditorToYjs();
    persistence.triggerAutoSave();
  }, [editorRef, bindingRef, persistence]);

  const handleNewBoard = useCallback(() => {
    if (persistence.autoSaveTimeoutRef.current) {
      clearTimeout(persistence.autoSaveTimeoutRef.current);
      persistence.autoSaveTimeoutRef.current = null;
    }
    persistence.setCurrentBoardId(null);
    persistence.setCurrentBoardName("Untitled");
    persistence.setCurrentRole('OWNER');
    persistence.setIsPublic(false);
    voting.setVotingConfig(DEFAULT_VOTING_CONFIG);
    persistence.lastSavedContentJsonRef.current = null;
    persistence.lastSavedNameRef.current = "Untitled";
    persistence.lastSavedShapeCountRef.current = 0;
    if (persistence.isDeliberateClearRef.current !== undefined) {
      (persistence.isDeliberateClearRef as any).current = false;
    }
    persistence.setPreviewSnapshot(null);
    bindingRef.current?.setPaused(false);
    editorRef.current?.newDoc();
    centerOnContent(editorRef.current);
    editorRef.current?.repaint();
    onBoardChange?.(null);
    navigate('/board');
  }, [persistence, voting.setVotingConfig, bindingRef, navigate, onBoardChange]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        const target = e.target as HTMLElement | null;
        if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable)) {
          e.preventDefault();
          if (!persistence.isViewer) {
            state.setIsAiInlineBarOpen((prev) => !prev);
          }
          return;
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement | null;
        if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable)) {
          if (!persistence.isViewer && !persistence.isLoadingBoard && editorRef.current) {
            const selected = editorRef.current.selection?.getShapes?.() || [];
            if (selected.length > 0) {
              e.preventDefault();
              state.handleDeleteSelectedShapes(selected);
              return;
            }
          }
        }
      }

      if (e.key === 'Escape' && state.activeTool !== 'select') {
        if (editorRef.current) {
          editorRef.current.activateHandler('Select');
        }
        state.setActiveTool('select');
        bindingRef.current?.syncEditorToYjs();
        persistence.triggerAutoSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, persistence, editorRef, bindingRef]);

  if (persistence.accessDenied && id) {
    return (
      <RequestAccessView
        boardId={id}
        onAccessGranted={() => {
          persistence.loadBoard(id);
        }}
      />
    );
  }

  const selectedShapeCount = editorRef.current?.selection?.getShapes?.()?.length || 0;

  return (
    <div className="relative w-full h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs flex flex-col">
      {/* Loading Overlay */}
      {persistence.isLoadingBoard && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-xs text-slate-600 dark:text-slate-400">
          <div className="flex flex-col items-center gap-3 bg-white/95 dark:bg-slate-900/95 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Loading whiteboard...</span>
          </div>
        </div>
      )}

      {/* Toast presenter notification */}
      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-blue-600 text-white font-medium text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
          <Crosshair className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <WhiteboardHeader
        boardName={persistence.currentBoardName}
        boardId={persistence.currentBoardId}
        role={persistence.currentRole as any}
        canEdit={persistence.isEditor}
        collabStatus={collabStatus}
        peers={peers}
        currentUser={collabUser}
        selectedShapeCount={selectedShapeCount}
        votingConfig={voting.votingConfig}
        userVotesUsed={voting.userVotesUsed}
        onNewBoard={handleNewBoard}
        onOpenListModal={() => modals.setIsOpenModalOpen(true)}
        onOpenSaveModal={() => modals.setIsSaveModalOpen(true)}
        onExportSVG={state.handleExportSVG}
        onExportPNG={state.handleExportPNG}
        onExportPDF={state.handleExportPDF}
        onExportJSON={state.handleExportJSON}
        onImportJSON={handleImportJSON}
        onDeleteBoard={persistence.handleDeleteBoard}
        onOpenShareModal={() => {
          modals.setShareModalInitialTab('members');
          modals.setIsShareModalOpen(true);
        }}
        onOpenConfigModal={() => {
          modals.setConfigModalInitialTab('general');
          modals.setIsConfigModalOpen(true);
        }}
        onOpenHistoryModal={() => modals.setIsHistoryOpen(true)}
        onOpenAiModal={() => modals.setIsAiModalOpen(true)}
        onOpenShapeLibrary={() => modals.setIsLibraryDrawerOpen((prev) => !prev)}
        onOpenScriptDrawer={() => state.handleOpenScriptDrawer()}
        onFocusAll={handleFocusAllOnSelection}
      />

      {/* Interactive Canvas Area */}
      <WhiteboardCanvas
        containerRef={containerRef}
        editorRef={editorRef}
        onMount={handleMount}
        canvasConfig={state.canvasConfig}
        resolvedTheme={resolvedTheme || 'light'}
        isViewer={persistence.isViewer}
        canEdit={persistence.isEditor}
        user={user}
        previewSnapshot={persistence.previewSnapshot}
        onExitPreview={() => persistence.handlePreviewSnapshot(null)}
        onOpenRestoreConfirm={() => {
          if (persistence.previewSnapshot) {
            persistence.handleRestoreSnapshot(persistence.previewSnapshot);
          }
        }}
        onOpenHistoryDrawer={() => modals.setIsHistoryOpen(true)}
        peers={peers}
        focusedShapeIds={state.focusedShapeIds}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerUp={handlePointerUp}
        onContextMenu={handleContextMenu}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        votingConfig={voting.votingConfig}
        userVotesUsed={voting.userVotesUsed}
        onVote={voting.handleVote}
        onRemoveVote={voting.handleRemoveVote}
        contextMenu={state.contextMenu}
        onCloseContextMenu={() => state.setContextMenu(null)}
        onBringToFront={state.handleBringToFront}
        onSendToBack={state.handleSendToBack}
        onContextMenuColorChange={state.handleContextMenuColorChange}
        onTextStyling={state.handleTextStyling}
        onRotate={state.handleRotate}
        onToggleLock={state.handleToggleLock}
        onGroup={state.handleGroup}
        onUngroup={state.handleUngroup}
        onSetLineArrow={state.handleSetLineArrow}
        onOpenEditProperties={() => {
          if (state.contextMenu?.shapes && state.contextMenu.shapes.length > 0) {
            setEditingShape(state.contextMenu.shapes[0]);
            modals.setIsPropertiesModalOpen(true);
          }
        }}
        onOpenEditScript={() => {
          if (state.contextMenu?.shapes && state.contextMenu.shapes.length > 0) {
            state.handleOpenScriptDrawer(state.contextMenu.shapes[0]);
          }
        }}
        onSaveAsStencil={() => {
          if (state.contextMenu?.shapes && state.contextMenu.shapes.length > 0) {
            setSelectedShapesForStencil(state.contextMenu.shapes);
            modals.setIsSaveStencilModalOpen(true);
          }
        }}
        onDeleteSelectedShapes={state.handleDeleteSelectedShapes}
        activeTool={state.activeTool}
        activeColor={state.activeColor}
        onColorChange={state.handleColorChange}
        onToolChange={state.handleToolSelect}
        onAddShape={handleAddShape}
        onAddLine={handleAddLine}
        onAddConnector={handleAddConnector}
        onAddFrame={handleAddFrame}
        onAddText={handleAddText}
        onUploadImage={state.handleImageUpload}
        onOpenAiModal={() => modals.setIsAiModalOpen(true)}
        onOpenScriptDrawer={() => state.handleOpenScriptDrawer()}
        onZoom={state.handleZoom}
        isAiInlineBarOpen={state.isAiInlineBarOpen}
        onCloseAiInlineBar={() => state.setIsAiInlineBarOpen(false)}
        onSubmitInlineAiPrompt={state.handleInlineAiPrompt}
        isAiGenerating={state.isAiGenerating}
        pages={state.pages}
        activePageId={state.activePageId}
        onSelectPage={state.handleSelectPage}
        onAddPage={state.handleAddPage}
        onDuplicatePage={state.handleDuplicatePage}
        onRenamePage={state.handleRenamePage}
        onDeletePage={state.handleDeletePage}
        onOpenPageDrawer={() => state.setIsPageDrawerOpen(true)}
      />

      {/* Modals & Drawers Container */}
      <WhiteboardModalsContainer
        isPageDrawerOpen={state.isPageDrawerOpen}
        onClosePageDrawer={() => state.setIsPageDrawerOpen(false)}
        pages={state.pages}
        activePageId={state.activePageId}
        isViewer={persistence.isViewer}
        onSelectPage={state.handleSelectPage}
        onAddPage={state.handleAddPage}
        onDuplicatePage={state.handleDuplicatePage}
        onRenamePage={state.handleRenamePage}
        onReorderPages={state.handleReorderPages}
        onDeletePage={state.handleDeletePage}
        isSaveModalOpen={modals.isSaveModalOpen}
        onCloseSaveModal={() => modals.setIsSaveModalOpen(false)}
        isSaveAsModalOpen={modals.isSaveAsModalOpen}
        onCloseSaveAsModal={() => modals.setIsSaveAsModalOpen(false)}
        currentBoardName={persistence.currentBoardName}
        onSaveBoard={persistence.handleSaveBoard}
        isOpenModalOpen={modals.isOpenModalOpen}
        onCloseOpenModal={() => modals.setIsOpenModalOpen(false)}
        currentBoardId={persistence.currentBoardId}
        routeBoardId={id}
        onOpenBoard={(b) => {
          modals.setIsOpenModalOpen(false);
          navigate(`/board/${b.id}`);
        }}
        onNewBoard={handleNewBoard}
        onDeleteBoard={persistence.handleDeleteBoard}
        isShareModalOpen={modals.isShareModalOpen}
        onCloseShareModal={modals.closeShareModal}
        currentRole={persistence.currentRole}
        currentUserId={user?.profile?.sub || ''}
        shareModalInitialTab={modals.shareModalInitialTab}
        onLeaveBoard={() => navigate('/board')}
        isConfigModalOpen={modals.isConfigModalOpen}
        onCloseConfigModal={modals.closeConfigModal}
        configModalInitialTab={modals.configModalInitialTab}
        boardMetadata={persistence.boardMetadata}
        canvasConfig={state.canvasConfig}
        onUpdateCanvasConfig={state.handleUpdateCanvasConfig}
        onRenameBoard={persistence.handleUpdateBoardName}
        onClearCanvas={handleClearCanvas}
        onDeleteBoardPermanently={persistence.handleDeleteBoard}
        votingConfig={voting.votingConfig}
        onUpdateVotingConfig={voting.handleUpdateVotingConfig}
        onResetAllVotes={voting.handleResetAllVotes}
        isHistoryDrawerOpen={modals.isHistoryOpen}
        onCloseHistoryDrawer={modals.closeHistoryDrawer}
        onRestoreSnapshot={persistence.handleRestoreSnapshot}
        onPreviewSnapshot={persistence.handlePreviewSnapshot}
        previewSnapshotId={persistence.previewSnapshot?.id || null}
        onForkSuccess={(newBoardId) => navigate(`/board/${newBoardId}`)}
        isAiModalOpen={modals.isAiModalOpen}
        onCloseAiModal={modals.closeAiModal}
        onInsertAiDiagram={state.handleInsertAiDiagram}
        onOpenLicenseModal={() => modals.setIsLicenseModalOpen(true)}
        isLicenseModalOpen={modals.isLicenseModalOpen}
        onCloseLicenseModal={modals.closeLicenseModal}
        licenseModalFeature={modals.licenseModalFeature}
        isShapeLibraryOpen={modals.isLibraryDrawerOpen}
        onCloseShapeLibrary={modals.closeLibraryDrawer}
        onInsertStencil={state.handleInsertStencil}
        collabUser={collabUser}
        userToken={user?.access_token}
        isSaveStencilOpen={modals.isSaveStencilModalOpen}
        onCloseSaveStencil={() => {
          modals.setIsSaveStencilModalOpen(false);
          setSelectedShapesForStencil([]);
        }}
        selectedShapesForStencil={selectedShapesForStencil}
        onStencilSaved={(stencil) => {
          setToastMessage(`Saved "${stencil.name}" to shape library`);
          setTimeout(() => setToastMessage(null), 3000);
        }}
        isEditPropertiesModalOpen={modals.isPropertiesModalOpen}
        onCloseEditPropertiesModal={() => modals.setIsPropertiesModalOpen(false)}
        editingShape={editingShape}
        onSaveShapeProperties={(props) => state.handleSaveShapeProperties(props, editingShape)}
        isScriptDrawerOpen={modals.isScriptDrawerOpen}
        onCloseScriptDrawer={() => modals.setIsScriptDrawerOpen(false)}
        scriptDrawerShape={scriptDrawerShape}
        revision={shapeResizeTick}
        onApplyShapeCustomization={state.handleSaveShapeCustomization}
        onApplyShapeScript={state.handleSaveShapeScript}
        onRevertShapeScript={state.handleRevertShapeScript}
        onClearShapeScript={state.handleClearShapeScript}
        pendingRestoreSnapshot={persistence.pendingRestoreSnapshot}
        isRestoreConfirmOpen={persistence.isRestoreConfirmOpen}
        isRestoringSnapshot={persistence.isRestoringSnapshot}
        onConfirmRestore={persistence.handleConfirmRestore}
        onCancelRestore={persistence.handleCancelRestore}
      />
    </div>
  );
}
