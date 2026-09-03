'use client';

import { Editor, Page, Doc } from "@dgmjs/core";
import { DGMEditor } from "@dgmjs/react";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import * as api from "@/lib/api";
import { YjsDgmBinding } from "@/lib/yjs-dgm-binding";
import { useWhiteboardCollab, FocusEventPayload } from "@/lib/useWhiteboardCollab";
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
  isGroupShape,
  calculateImageDimensions,
  createImageShape,
  exportWhiteboardToSVG,
  exportWhiteboardToPNG,
  exportWhiteboardToPDF,
} from "@/lib/shapeUtils";
import { CollabOverlay } from "./CollabOverlay";
import { ShapeContextMenu } from "./ShapeContextMenu";
import { ShareBoardModal } from "./ShareBoardModal";
import { WhiteboardConfigModal, CanvasConfig, CanvasTheme, GridStyle } from "./WhiteboardConfigModal";
import { RequestAccessView } from "./RequestAccessView";
import { SaveBoardModal } from "./SaveBoardModal";
import { OpenBoardModal } from "./OpenBoardModal";
import { WhiteboardHeader } from "./WhiteboardHeader";
import { WhiteboardToolbar, WhiteboardTool } from "./WhiteboardToolbar";
import { Crosshair } from "lucide-react";

export const THEME_CANVAS_COLORS: Record<CanvasTheme, { canvas: string; blank: string; grid?: string }> = {
  slate: { canvas: '#fafbfd', blank: '#fafbfd', grid: '#f1f5f9' },
  white: { canvas: '#ffffff', blank: '#ffffff', grid: '#f1f5f9' },
  lightSlate: { canvas: '#f1f5f9', blank: '#f1f5f9', grid: '#e2e8f0' },
  warm: { canvas: '#fefce8', blank: '#fefce8', grid: '#fef3c7' },
};

interface WhiteboardProps {
  onBoardChange?: (name: string | null) => void;
}

const countShapesInContent = (content: any): number => {
  if (!content || !Array.isArray(content.children)) return 0;
  let count = 0;
  content.children.forEach((c: any) => {
    if (c && Array.isArray(c.children)) count += c.children.length;
    else if (c && c.id) count += 1;
  });
  return count;
};

export default function Whiteboard({ onBoardChange }: WhiteboardProps = {}) {
  const { user, refreshToken } = useAuth();
  const { id } = useParams<{ id?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const bindingRef = useRef<YjsDgmBinding | null>(null);

  const [isEditorReady, setIsEditorReady] = useState(false);
  const [activeTool, setActiveTool] = useState<WhiteboardTool>('select');
  const [activeColor, setActiveColor] = useState({ stroke: '#000000', fill: '#ffffff' });
  const activeColorRef = useRef(activeColor);

  useEffect(() => {
    activeColorRef.current = activeColor;
  }, [activeColor]);
  
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);
  const [currentBoardName, setCurrentBoardName] = useState<string>("Untitled");
  const [currentRole, setCurrentRole] = useState<api.BoardRole>('OWNER');
  const [isAccessRequired, setIsAccessRequired] = useState(false);
  const [isLoadingBoard, setIsLoadingBoard] = useState(!!id);
  const [selectedShapeCount, setSelectedShapeCount] = useState(0);
  const [contextMenu, setContextMenu] = useState<{
    position: { x: number; y: number };
    shapes: any[];
  } | null>(null);

  // Modals state
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareModalInitialTab, setShareModalInitialTab] = useState<'members' | 'requests'>('members');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configModalInitialTab, setConfigModalInitialTab] = useState<'general' | 'canvas' | 'collaboration' | 'danger'>('general');
  const [boardMetadata, setBoardMetadata] = useState<{ createdAt?: string; updatedAt?: string }>({});

  // Canvas display and collaboration preferences
  const [canvasConfig, setCanvasConfig] = useState<CanvasConfig>({
    gridStyle: 'grid',
    theme: 'slate',
    snapToGrid: true,
    showCollaboratorCursors: true,
    showPeerLabels: true,
  });

  // Focus and Toast cues
  const [focusedShapeIds, setFocusedShapeIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Check URL query parameters for modal deep linking
  useEffect(() => {
    const modal = searchParams.get('modal');
    if (modal === 'share') {
      const tab = searchParams.get('tab');
      setShareModalInitialTab(tab === 'requests' || tab === 'pending' ? 'requests' : 'members');
      setIsShareModalOpen(true);

      const newParams = new URLSearchParams(searchParams);
      newParams.delete('modal');
      newParams.delete('tab');
      setSearchParams(newParams, { replace: true });
    } else if (modal === 'config' || modal === 'settings') {
      const tab = searchParams.get('tab') as any;
      if (tab === 'canvas' || tab === 'collaboration' || tab === 'danger' || tab === 'general') {
        setConfigModalInitialTab(tab);
      } else {
        setConfigModalInitialTab('general');
      }
      setIsConfigModalOpen(true);

      const newParams = new URLSearchParams(searchParams);
      newParams.delete('modal');
      newParams.delete('tab');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const currentBoardIdRef = useRef<string | null>(null);
  const currentBoardNameRef = useRef<string>("Untitled");
  const currentRoleRef = useRef<api.BoardRole>('OWNER');
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true);
  const lastAttemptedIdRef = useRef<string | null>(null);
  const lastPointerSentRef = useRef(0);
  const lastSavedShapeCountRef = useRef<number>(0);
  const isDeliberateClearRef = useRef<boolean>(false);

  const isViewer = currentRole === 'VIEWER';
  const canEdit = currentRole === 'OWNER' || currentRole === 'ADMIN' || currentRole === 'EDITOR';

  // Real-time Collaboration Hook
  const handleFocusReceived = useCallback((event: FocusEventPayload) => {
    if (!editorRef.current) return;
    editorRef.current.scrollCenterTo(event.center);
    setFocusedShapeIds(event.shapeIds || []);
    setToastMessage(`${event.initiatorName} focused everyone on selection`);
    setTimeout(() => setFocusedShapeIds([]), 3500);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  const collabUser = useMemo(() => {
    if (!user) return null;
    return {
      id: user.profile.sub,
      name: user.profile.preferred_username || user.profile.name || user.profile.email || 'User',
      email: user.profile.email,
    };
  }, [user?.profile?.sub, user?.profile?.preferred_username, user?.profile?.name, user?.profile?.email]);

  const handleRemoteUpdate = useCallback(() => {
    triggerAutoSave();
  }, []);

  const {
    status: collabStatus,
    peers,
    yDoc,
    updatePresence,
    broadcastFocus,
  } = useWhiteboardCollab({
    boardId: currentBoardId,
    token: user?.access_token,
    user: collabUser,
    refreshToken,
    onFocusReceived: handleFocusReceived,
    onRemoteUpdate: handleRemoteUpdate,
  });

  // Handle access revocation from WebSocket
  useEffect(() => {
    if (collabStatus === 'revoked' || collabStatus === 'unauthorized') {
      setIsAccessRequired(true);
    }
  }, [collabStatus]);

  // Bind Yjs to DGM Editor whenever editor and yDoc are active and board is loaded
  useEffect(() => {
    if (!editorRef.current || !isEditorReady || !currentBoardId || isLoadingBoard) {
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
      return;
    }

    const binding = new YjsDgmBinding(editorRef.current, yDoc, () => {
      triggerAutoSave();
    });
    bindingRef.current = binding;

    return () => {
      binding.destroy();
      bindingRef.current = null;
    };
  }, [isEditorReady, currentBoardId, isLoadingBoard, yDoc]);

  useEffect(() => {
    currentBoardIdRef.current = currentBoardId;
    onBoardChange?.(currentBoardId ? currentBoardName : null);
  }, [currentBoardId, currentBoardName, onBoardChange]);

  useEffect(() => {
    currentBoardNameRef.current = currentBoardName;
  }, [currentBoardName]);

  useEffect(() => {
    currentRoleRef.current = currentRole;
  }, [currentRole]);

  // Load Board from URL or initialize
  const loadBoardData = useCallback(async (boardIdToLoad: string) => {
    setIsLoadingBoard(true);
    try {
      const [board, roleData] = await Promise.all([
        api.getWhiteboard(boardIdToLoad),
        api.getBoardRole(boardIdToLoad).catch(() => ({ role: 'VIEWER' as api.BoardRole })),
      ]);

      if (!editorRef.current) return;
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      editorRef.current.loadFromJSON(board.content);
      lastSavedShapeCountRef.current = countShapesInContent(board.content);
      isDeliberateClearRef.current = false;
      ensureAllShapesCentered(editorRef.current);
      centerOnContent(editorRef.current);
      requestAnimationFrame(() => {
        if (editorRef.current) {
          ensureAllShapesCentered(editorRef.current);
          centerOnContent(editorRef.current);
        }
      });
      setCurrentBoardId(board.id);
      setCurrentBoardName(board.name);
      setCurrentRole(roleData.role);
      setBoardMetadata({
        createdAt: board.createdAt,
        updatedAt: board.updatedAt,
      });
      currentBoardIdRef.current = board.id;
      currentBoardNameRef.current = board.name;
      currentRoleRef.current = roleData.role;
      setIsAccessRequired(false);
    } catch (err: any) {
      console.error("Failed to load whiteboard:", err);
      if (err.status === 403) {
        setIsAccessRequired(true);
      } else {
        alert("Failed to load whiteboard.");
        navigate("/board", { replace: true });
      }
    } finally {
      setIsLoadingBoard(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (!isEditorReady || !user) return;

    if (id) {
      isInitialLoadRef.current = false;
      if (id === currentBoardIdRef.current) return;
      if (id === lastAttemptedIdRef.current && isAccessRequired) return;

      lastAttemptedIdRef.current = id;
      loadBoardData(id);
    } else {
      lastAttemptedIdRef.current = null;
      setIsLoadingBoard(false);
      setIsAccessRequired(false);
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        let isMounted = true;
        const loadLatest = async () => {
          try {
            const list = await api.listWhiteboards();
            if (!isMounted) return;
            if (list.length > 0) {
              const latest = list[0];
              navigate(`/board/${latest.id}`, { replace: true });
            }
          } catch (err) {
            console.error("Failed to load latest whiteboard:", err);
          }
        };
        loadLatest();
        return () => {
          isMounted = false;
        };
      } else {
        if (currentBoardIdRef.current !== null) {
          if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
          }
          setCurrentBoardId(null);
          setCurrentBoardName("Untitled");
          setCurrentRole('OWNER');
          setBoardMetadata({});
          currentBoardIdRef.current = null;
          currentBoardNameRef.current = "Untitled";
          setIsAccessRequired(false);
          editorRef.current?.newDoc();
          centerOnContent(editorRef.current);
        }
      }
    }
  }, [id, user, isEditorReady, navigate, loadBoardData]);

  // Viewer read-only handler mode & permissions configuration
  useEffect(() => {
    if (!editorRef.current || !isEditorReady) return;
    const editor = editorRef.current;
    if (isViewer) {
      editor.activateHandler('hand');
      editor.setActiveHandlerLock(true);
      editor.selection.deselectAll();
      editor.keymap.keymap = {};
      editor.options.allowCreateTextOnCanvas = false;
      editor.options.showCreateConnectorController = false;
      setActiveTool('select');
    } else {
      editor.setActiveHandlerLock(false);
      editor.activateHandler('select');
      editor.options.allowCreateTextOnCanvas = true;
      editor.options.showCreateConnectorController = true;
    }
  }, [isViewer, isEditorReady]);

  // Auto-Save logic (disabled for viewers & guarded against accidental wipes)
  const triggerAutoSave = useCallback(() => {
    if (!currentBoardIdRef.current || !editorRef.current || !user || currentRoleRef.current === 'VIEWER' || isLoadingBoard) {
      return;
    }
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (!currentBoardIdRef.current || !editorRef.current || currentRoleRef.current === 'VIEWER' || isLoadingBoard) return;
      try {
        const content = editorRef.current.saveToJSON();
        const currentShapeCount = countShapesInContent(content);

        // Guard against wiping a non-empty board during load/disconnect races
        if (lastSavedShapeCountRef.current > 0 && currentShapeCount === 0 && !isDeliberateClearRef.current) {
          console.warn("Auto-save suppressed: Board shape count dropped to 0 without deliberate user clear action.");
          return;
        }

        await api.saveWhiteboard({
          id: currentBoardIdRef.current,
          name: currentBoardNameRef.current,
          content
        });
        lastSavedShapeCountRef.current = currentShapeCount;
        isDeliberateClearRef.current = false;
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }, 1000);
  }, [user, isLoadingBoard]);

  const handleMount = useCallback(async (editor: Editor) => {
    editorRef.current = editor;
    const colors = THEME_CANVAS_COLORS[canvasConfig.theme] || THEME_CANVAS_COLORS.slate;
    editor.options.canvasColor = colors.canvas;
    editor.options.blankColor = colors.blank;
    if (colors.grid) {
      editor.options.gridColor = colors.grid;
    }
    editor.setShowGrid(canvasConfig.gridStyle !== 'none');
    editor.setSnapToGrid(canvasConfig.snapToGrid);
    editor.setDarkMode(false);
    editor.newDoc();
    editor.fitToScreen();
    centerOnContent(editor);
    setIsEditorReady(true);
    
    const handleResize = () => {
      editor.fit();
    };
    window.addEventListener("resize", handleResize);

    const dInit = editor.factory.onShapeInitialize.addListener((shape: any) => {
      updateShapeTextProportions(shape, editor);
      const type = shape.type || shape._type;
      if (type === 'Freehand') {
        shape.strokeColor = activeColorRef.current.stroke;
        shape.strokeWidth = 2;
      } else if (type === 'Highlighter') {
        shape.strokeColor = activeColorRef.current.stroke;
        shape.strokeWidth = 14;
        shape.alpha = 0.35;
      }
    });

    const dCreate = editor.factory.onCreate?.addListener?.((shape: any) => {
      const type = shape.type || shape._type;
      if (type === 'Freehand') {
        shape.strokeColor = activeColorRef.current.stroke;
      } else if (type === 'Highlighter') {
        shape.strokeColor = activeColorRef.current.stroke;
        shape.alpha = 0.35;
        if (!shape.strokeWidth || shape.strokeWidth < 12) {
          shape.strokeWidth = 14;
        }
      }
      editor.repaint();
      bindingRef.current?.syncEditorToYjs();
      triggerAutoSave();
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
        setActiveTool(reverseMap[handlerId]);
      }
    });

    const d1 = editor.transform.onTransaction.addListener(() => {
      const selected = editor.selection.getShapes();
      for (const s of selected) {
        updateShapeTextProportions(s, editor);
      }
      editor.repaint();
      bindingRef.current?.syncEditorToYjs();
      triggerAutoSave();
    });
    const dAction = editor.transform.onAction.addListener(() => {
      const selected = editor.selection.getShapes();
      for (const s of selected) {
        updateShapeTextProportions(s, editor);
      }
      editor.repaint();
      bindingRef.current?.syncEditorToYjs();
      triggerAutoSave();
    });
    const d2 = editor.transform.onUndo.addListener(() => {
      isDeliberateClearRef.current = true;
      bindingRef.current?.syncEditorToYjs();
      triggerAutoSave();
    });
    const d3 = editor.transform.onRedo.addListener(() => {
      isDeliberateClearRef.current = true;
      bindingRef.current?.syncEditorToYjs();
      triggerAutoSave();
    });

    const d4 = editor.selection.onChange.addListener((shapes) => {
      setSelectedShapeCount(shapes.length);
      updatePresence({ selection: shapes.map((s) => s.id) });
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      dInit.dispose();
      dCreate?.dispose?.();
      dHandler?.dispose?.();
      d1.dispose();
      dAction.dispose();
      d2.dispose();
      d3.dispose();
      d4.dispose();
    };
  }, [triggerAutoSave, updatePresence]);

  // Pointer move handler to broadcast cursor in GCS
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!editorRef.current || !editorRef.current.canvas || !containerRef.current) return;
    const now = Date.now();
    if (now - lastPointerSentRef.current < 40) return; // Throttled ~40ms
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
    if (!editorRef.current || isViewer || isLoadingBoard) return;
    if (activeTool === 'eraser') {
      isDeliberateClearRef.current = true;
    }
    bindingRef.current?.syncEditorToYjs();
    triggerAutoSave();
  }, [isViewer, isLoadingBoard, activeTool, triggerAutoSave]);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeTool !== 'select') {
        if (editorRef.current) {
          editorRef.current.activateHandler('Select');
        }
        setActiveTool('select');
        bindingRef.current?.syncEditorToYjs();
        triggerAutoSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, triggerAutoSave]);

  useEffect(() => {
    if (isViewer || isLoadingBoard) return;

    const handleWindowPointerUp = () => {
      if (!editorRef.current || isViewer || isLoadingBoard) return;
      if (activeTool === 'eraser') {
        isDeliberateClearRef.current = true;
      }
      bindingRef.current?.syncEditorToYjs();
      triggerAutoSave();
    };

    const handleWindowKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!editorRef.current || isViewer || isLoadingBoard) return;
        isDeliberateClearRef.current = true;
        bindingRef.current?.syncEditorToYjs();
        triggerAutoSave();
      }
    };

    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('keyup', handleWindowKeyUp);

    return () => {
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('keyup', handleWindowKeyUp);
    };
  }, [isViewer, isLoadingBoard, activeTool, triggerAutoSave]);

  // Shape creation handlers
  const handleAddShape = (type: 'Box' | 'Oval') => {
    if (!editorRef.current || isViewer) return;
    const editor = editorRef.current;
    const center = editor.getCenter();
    const x = center[0] - 50;
    const y = center[1] - 50;
    const rect = [[x, y], [x + 100, y + 100]];

    let shape: any = null;
    if (type === 'Box') {
      shape = editor.factory.createRectangle(rect);
    } else if (type === 'Oval') {
      shape = editor.factory.createEllipse(rect);
    }

    if (shape) {
      updateShapeTextProportions(shape, editor);
      shape.strokeColor = activeColor.stroke;
      shape.fillColor = activeColor.fill;
      editor.actions.insert(shape);
      editor.selection.select([shape]);
      editor.repaint();
      bindingRef.current?.syncEditorToYjs();
      triggerAutoSave();
    }
  };

  const handleAddLine = () => {
    if (!editorRef.current || isViewer) return;
    const editor = editorRef.current;
    const center = editor.getCenter();
    const shape = editor.factory.createLine([[center[0] - 50, center[1]], [center[0] + 50, center[1]]]);
    if (shape) {
      updateShapeTextProportions(shape, editor);
      shape.strokeColor = activeColor.stroke;
      editor.actions.insert(shape);
      editor.selection.select([shape]);
      editor.repaint();
      bindingRef.current?.syncEditorToYjs();
      triggerAutoSave();
    }
  };

  const handleAddConnector = () => {
    if (!editorRef.current || isViewer) return;
    const editor = editorRef.current;
    const center = editor.getCenter();
    const x = center[0];
    const y = center[1];
    const shape = editor.factory.createConnector(null, [0.5, 0.5], null, [0.5, 0.5], [[x - 50, y], [x + 50, y]]);
    if (shape) {
      updateShapeTextProportions(shape, editor);
      shape.strokeColor = activeColor.stroke;
      (shape as any).headEndType = 'arrow';
      editor.actions.insert(shape);
      editor.selection.select([shape]);
      editor.repaint();
      bindingRef.current?.syncEditorToYjs();
      triggerAutoSave();
    }
  };

  const handleAddFrame = () => {
    if (!editorRef.current || isViewer) return;
    const editor = editorRef.current;
    const center = editor.getCenter();
    const x = center[0] - 160;
    const y = center[1] - 120;
    const shape = editor.factory.createFrame([[x, y], [x + 320, y + 240]]);
    if (shape) {
      updateShapeTextProportions(shape, editor);
      shape.strokeColor = activeColor.stroke;
      shape.name = 'Frame';
      editor.actions.insert(shape);
      editor.selection.select([shape]);
      editor.repaint();
      bindingRef.current?.syncEditorToYjs();
      triggerAutoSave();
    }
  };

  const handleAddText = () => {
    if (!editorRef.current || isViewer) return;
    const editor = editorRef.current;
    const center = editor.getCenter();
    const shape = editor.factory.createText([[center[0] - 50, center[1] - 20], [center[0] + 50, center[1] + 20]], 'Text');
    if (shape) {
      updateShapeTextProportions(shape, editor);
      shape.fontColor = activeColor.stroke;
      shape.strokeColor = activeColor.stroke;
      editor.actions.insert(shape);
      editor.selection.select([shape]);
      editor.repaint();
      bindingRef.current?.syncEditorToYjs();
      triggerAutoSave();
    }
  };

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
    const img = new window.Image();

    img.onload = async () => {
      try {
        const { width, height } = calculateImageDimensions(img.naturalWidth, img.naturalHeight, 400, 400);
        const shape = createImageShape(editor, objectUrl, width, height, position);
        editor.actions.insert(shape);
        editor.selection.select([shape]);
        editor.repaint();
        bindingRef.current?.syncEditorToYjs();

        const boardId = currentBoardIdRef.current;
        if (boardId) {
          try {
            const res = await api.uploadWhiteboardAsset(boardId, file);
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
      URL.revokeObjectURL(objectUrl);
    };

    img.src = objectUrl;
  }, [isViewer, triggerAutoSave]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (isViewer) return;
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }, [isViewer]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    if (isViewer || !editorRef.current || !containerRef.current) return;
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
      handleImageUpload(file, [gcsX + index * 20, gcsY + index * 20]);
    });
  }, [isViewer, handleImageUpload]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isViewer || !editorRef.current) return;
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleImageUpload(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [isViewer, handleImageUpload]);

  const handleFocusAllOnSelection = () => {
    if (!editorRef.current) return;
    const selected = editorRef.current.selection.getShapes();
    if (selected.length === 0) return;

    const xs = selected.map((s) => s.getCenter()[0]);
    const ys = selected.map((s) => s.getCenter()[1]);
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;

    editorRef.current.scrollCenterTo([centerX, centerY]);
    setFocusedShapeIds(selected.map((s) => s.id));
    setTimeout(() => setFocusedShapeIds([]), 3500);

    broadcastFocus(selected.map((s) => s.id), [centerX, centerY]);
    setToastMessage("Focused everyone on selection");
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleZoom = (delta: number) => {
    setContextMenu(null);
    if (!editorRef.current) return;
    const currentScale = editorRef.current.getScale();
    editorRef.current.setScale(Math.max(0.1, Math.min(5, currentScale + delta)));
    editorRef.current.repaint();
  };

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (isViewer || !editorRef.current || !containerRef.current) return;

    const editor = editorRef.current;
    const containerRect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - containerRect.left;
    const clickY = e.clientY - containerRect.top;

    const canvas = editor.canvas;
    const gcsX = clickX / canvas.scale - canvas.origin[0];
    const gcsY = clickY / canvas.scale - canvas.origin[1];
    const modelPoint = [gcsX, gcsY];

    const page = typeof (editor as any).getCurrentPage === 'function'
      ? (editor as any).getCurrentPage()
      : (editor as any).currentPage;
    const doc = editor.store?.root;
    
    const rawShapeAtPoint = page?.getShapeAt?.(canvas, modelPoint) || null;

    let shapeAtPoint = rawShapeAtPoint;
    while (shapeAtPoint && shapeAtPoint.parent && isGroupShape(shapeAtPoint.parent)) {
      shapeAtPoint = shapeAtPoint.parent;
    }

    const selectedShapes = editor.selection.getShapes();

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
      if (selectedShapes.some((s) => s.id === shapeAtPoint.id || s === shapeAtPoint) && selectedShapes.length > 1) {
        setContextMenu({
          position: { x: clickX, y: clickY },
          shapes: selectedShapes,
        });
      } else {
        editor.selection.select([shapeAtPoint]);
        editor.repaint();
        setContextMenu({
          position: { x: clickX, y: clickY },
          shapes: [shapeAtPoint],
        });
      }
    } else {
      setContextMenu(null);
    }
  }, [isViewer]);

  const handleBringToFront = useCallback(() => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    editor.actions.bringToFront();
    editor.repaint();
    bindingRef.current?.syncEditorToYjs();
    triggerAutoSave();
  }, [triggerAutoSave]);

  const handleSendToBack = useCallback(() => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    editor.actions.sendToBack();
    editor.repaint();
    bindingRef.current?.syncEditorToYjs();
    triggerAutoSave();
  }, [triggerAutoSave]);

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
  }, [contextMenu, triggerAutoSave]);

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
  }, [contextMenu, triggerAutoSave]);

  const handleRotate = useCallback((delta: number, absolute = false) => {
    if (!editorRef.current || !contextMenu?.shapes) return;
    const editor = editorRef.current;
    rotateShapes(contextMenu.shapes, delta, absolute, editor);
    editor.repaint();
    bindingRef.current?.syncEditorToYjs();
    triggerAutoSave();
  }, [contextMenu, triggerAutoSave]);

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
  }, [contextMenu, triggerAutoSave]);

  const handleGroup = useCallback(() => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    editor.actions.group();
    editor.repaint();
    bindingRef.current?.syncEditorToYjs();
    triggerAutoSave();
  }, [triggerAutoSave]);

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
  }, [contextMenu, triggerAutoSave]);

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
  }, [contextMenu, triggerAutoSave]);

  const handleExportSVG = useCallback(async () => {
    if (!editorRef.current) return;
    await exportWhiteboardToSVG(editorRef.current, currentBoardName);
  }, [currentBoardName]);

  const handleExportPNG = useCallback(async () => {
    if (!editorRef.current) return;
    await exportWhiteboardToPNG(editorRef.current, currentBoardName);
  }, [currentBoardName]);

  const handleExportPDF = useCallback(async () => {
    if (!editorRef.current) return;
    await exportWhiteboardToPDF(editorRef.current, currentBoardName);
  }, [currentBoardName]);

  const handleExportJSON = () => {
    if (!editorRef.current) return;
    const data = editorRef.current.saveToJSON();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentBoardName || 'whiteboard'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isViewer) return;
    const file = e.target.files?.[0];
    if (!file || !editorRef.current) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        isDeliberateClearRef.current = true;
        editorRef.current?.loadFromJSON(json);
        ensureAllShapesCentered(editorRef.current);
        centerOnContent(editorRef.current);
        editorRef.current?.repaint();
        bindingRef.current?.syncEditorToYjs();
        triggerAutoSave();
      } catch (err) {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSaveBoard = async (name: string) => {
    if (!editorRef.current) return;
    const content = editorRef.current.saveToJSON();
    const saved = await api.saveWhiteboard({
      name,
      content
    });

    setCurrentBoardId(saved.id);
    setCurrentBoardName(saved.name);
    currentBoardIdRef.current = saved.id;
    currentBoardNameRef.current = saved.name;
    setIsSaveModalOpen(false);
    navigate(`/board/${saved.id}`, { replace: true });
  };

  const handleDeleteCurrentBoard = async () => {
    if (!currentBoardId || currentRole !== 'OWNER') return;
    if (!window.confirm(`Are you sure you want to delete "${currentBoardName}"?`)) return;

    try {
      await api.deleteWhiteboard(currentBoardId);
      navigate('/board', { replace: true });
      setCurrentBoardId(null);
      setCurrentBoardName("Untitled");
      currentBoardIdRef.current = null;
      currentBoardNameRef.current = "Untitled";
      editorRef.current?.newDoc();
      centerOnContent(editorRef.current);
    } catch (err) {
      alert("Failed to delete whiteboard");
    }
  };

  const handleSelectWhiteboard = (board: api.WhiteboardSummary) => {
    setIsListModalOpen(false);
    navigate(`/board/${board.id}`);
  };

  const handleRenameBoard = async (newName: string) => {
    if (!currentBoardId || !editorRef.current) return;
    const content = editorRef.current.saveToJSON();
    const updated = await api.saveWhiteboard({
      id: currentBoardId,
      name: newName,
      content,
    });
    setCurrentBoardName(updated.name);
    currentBoardNameRef.current = updated.name;
    onBoardChange?.(updated.name);
  };

  const handleClearCanvas = () => {
    if (!editorRef.current) return;
    isDeliberateClearRef.current = true;
    editorRef.current.newDoc();
    editorRef.current.repaint();
    bindingRef.current?.syncEditorToYjs();
    triggerAutoSave();
  };

  const handleDeleteBoardFromModal = async () => {
    if (!currentBoardId || (currentRole !== 'OWNER' && currentRole !== 'ADMIN')) return;
    try {
      await api.deleteWhiteboard(currentBoardId);
      setIsConfigModalOpen(false);
      navigate('/board', { replace: true });
      setCurrentBoardId(null);
      setCurrentBoardName("Untitled");
      currentBoardIdRef.current = null;
      currentBoardNameRef.current = "Untitled";
      setBoardMetadata({});
      editorRef.current?.newDoc();
      centerOnContent(editorRef.current);
    } catch (err) {
      alert("Failed to delete whiteboard");
    }
  };

  const handleUpdateCanvasConfig = (newConfig: CanvasConfig) => {
    setCanvasConfig(newConfig);
    if (editorRef.current) {
      editorRef.current.setDarkMode(false);
      editorRef.current.setShowGrid(newConfig.gridStyle !== 'none');
      editorRef.current.setSnapToGrid(newConfig.snapToGrid);

      const colors = THEME_CANVAS_COLORS[newConfig.theme] || THEME_CANVAS_COLORS.slate;
      editorRef.current.options.canvasColor = colors.canvas;
      editorRef.current.options.blankColor = colors.blank;
      if (colors.grid) {
        editorRef.current.options.gridColor = colors.grid;
      }
      editorRef.current.repaint();
    }
  };

  const canvasThemeClass = useMemo(() => {
    switch (canvasConfig.theme) {
      case 'white':
        return 'bg-white';
      case 'lightSlate':
        return 'bg-slate-100';
      case 'warm':
        return 'bg-amber-50/70';
      case 'slate':
      default:
        return 'bg-slate-50';
    }
  }, [canvasConfig.theme]);

  const canvasGridClass = useMemo(() => {
    if (canvasConfig.gridStyle === 'none') return '';
    if (canvasConfig.gridStyle === 'grid') {
      const gridColor = canvasConfig.theme === 'lightSlate' ? '#e2e8f0' : '#f1f5f9';
      return `bg-[linear-gradient(to_right,${gridColor}_1px,transparent_1px),linear-gradient(to_bottom,${gridColor}_1px,transparent_1px)] [background-size:20px_20px]`;
    }
    return '';
  }, [canvasConfig.gridStyle, canvasConfig.theme]);

  if (isAccessRequired && id) {
    return (
      <RequestAccessView 
        boardId={id} 
        onAccessGranted={() => {
          setIsAccessRequired(false);
          loadBoardData(id);
        }} 
      />
    );
  }

  return (
    <div 
      className="relative w-full h-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col"
    >
      {/* Loading Overlay */}
      {isLoadingBoard && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-xs text-slate-600">
          <div className="flex flex-col items-center gap-3 bg-white/95 p-6 rounded-2xl border border-slate-200 shadow-xl">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-slate-700">Loading whiteboard...</span>
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
        boardName={currentBoardName}
        boardId={currentBoardId}
        role={currentRole}
        canEdit={canEdit}
        collabStatus={collabStatus}
        peers={peers}
        currentUser={collabUser}
        selectedShapeCount={selectedShapeCount}
        onOpenListModal={() => setIsListModalOpen(true)}
        onOpenSaveModal={() => setIsSaveModalOpen(true)}
        onExportSVG={handleExportSVG}
        onExportPNG={handleExportPNG}
        onExportPDF={handleExportPDF}
        onExportJSON={handleExportJSON}
        onImportJSON={handleImportJSON}
        onDeleteBoard={handleDeleteCurrentBoard}
        onOpenShareModal={() => {
          setShareModalInitialTab('members');
          setIsShareModalOpen(true);
        }}
        onOpenConfigModal={() => {
          setConfigModalInitialTab('general');
          setIsConfigModalOpen(true);
        }}
        onFocusAll={handleFocusAllOnSelection}
      />

      {/* DGM Editor Canvas */}
      <div 
        ref={containerRef}
        onContextMenu={handleContextMenu}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerUp={handlePointerUp}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`w-full h-full relative flex-1 ${canvasThemeClass} ${canvasGridClass}`}
      >
        <DGMEditor 
          className="w-full h-full" 
          onMount={handleMount}
          showGrid={canvasConfig.gridStyle !== 'none'}
          snapToGrid={canvasConfig.snapToGrid}
          darkMode={false}
        />
        <CollabOverlay 
          editor={editorRef.current} 
          peers={peers} 
          focusedShapeIds={focusedShapeIds} 
          showCursors={canvasConfig.showCollaboratorCursors}
          showLabels={canvasConfig.showPeerLabels}
        />
        {contextMenu && !isViewer && (
          <ShapeContextMenu
            position={contextMenu.position}
            shapes={contextMenu.shapes}
            onBringToFront={handleBringToFront}
            onSendToBack={handleSendToBack}
            onColorChange={handleContextMenuColorChange}
            onTextStyling={handleTextStyling}
            onRotate={handleRotate}
            onToggleLock={handleToggleLock}
            onGroup={handleGroup}
            onUngroup={handleUngroup}
            onSetLineArrow={handleSetLineArrow}
            onClose={() => setContextMenu(null)}
          />
        )}
      </div>

      {/* Floating Canvas Action Toolbar */}
      <WhiteboardToolbar
        isViewer={isViewer}
        activeTool={activeTool}
        activeColor={activeColor}
        onColorChange={handleColorChange}
        onToolChange={handleToolSelect}
        onAddShape={handleAddShape}
        onAddLine={handleAddLine}
        onAddConnector={handleAddConnector}
        onAddFrame={handleAddFrame}
        onAddText={handleAddText}
        onUploadImage={handleImageUpload}
        onZoom={handleZoom}
      />

      {/* Share Board Modal */}
      {(currentBoardId || id) && (
        <ShareBoardModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          boardId={currentBoardId || id || ''}
          boardName={currentBoardName}
          currentUserRole={currentRole}
          currentUserId={user?.profile.sub || ''}
          initialTab={shareModalInitialTab}
          onLeaveBoard={() => {
            navigate('/board');
          }}
        />
      )}

      {/* Whiteboard Configuration Modal */}
      {(currentBoardId || id) && (
        <WhiteboardConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          boardId={currentBoardId || id || ''}
          boardName={currentBoardName}
          currentUserRole={currentRole}
          createdAt={boardMetadata.createdAt}
          updatedAt={boardMetadata.updatedAt}
          canvasConfig={canvasConfig}
          onUpdateCanvasConfig={handleUpdateCanvasConfig}
          onRenameBoard={handleRenameBoard}
          onClearCanvas={handleClearCanvas}
          onDeleteBoard={handleDeleteBoardFromModal}
          initialTab={configModalInitialTab}
        />
      )}

      {/* Save Board Modal */}
      <SaveBoardModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleSaveBoard}
        initialName={currentBoardId ? currentBoardName : "My Whiteboard"}
      />

      {/* Open from Cloud Modal */}
      <OpenBoardModal
        isOpen={isListModalOpen}
        onClose={() => setIsListModalOpen(false)}
        onSelectBoard={handleSelectWhiteboard}
      />
    </div>
  );
}
