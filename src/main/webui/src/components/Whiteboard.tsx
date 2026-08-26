'use client';

import { Editor, Page, Doc } from "@dgmjs/core";
import { DGMEditor } from "@dgmjs/react";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
} from "@/lib/shapeUtils";
import { CollabOverlay } from "./CollabOverlay";
import { ShapeContextMenu } from "./ShapeContextMenu";
import { ShareBoardModal } from "./ShareBoardModal";
import { RequestAccessView } from "./RequestAccessView";
import { SaveBoardModal } from "./SaveBoardModal";
import { OpenBoardModal } from "./OpenBoardModal";
import { WhiteboardHeader } from "./WhiteboardHeader";
import { WhiteboardToolbar } from "./WhiteboardToolbar";
import { Crosshair } from "lucide-react";

interface WhiteboardProps {
  onBoardChange?: (name: string | null) => void;
}

export default function Whiteboard({ onBoardChange }: WhiteboardProps = {}) {
  const { user } = useAuth();
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const bindingRef = useRef<YjsDgmBinding | null>(null);

  const [isEditorReady, setIsEditorReady] = useState(false);
  const [activeColor, setActiveColor] = useState({ stroke: '#000000', fill: '#ffffff' });
  
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

  // Focus and Toast cues
  const [focusedShapeIds, setFocusedShapeIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentBoardIdRef = useRef<string | null>(null);
  const currentBoardNameRef = useRef<string>("Untitled");
  const currentRoleRef = useRef<api.BoardRole>('OWNER');
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true);
  const lastAttemptedIdRef = useRef<string | null>(null);
  const lastPointerSentRef = useRef(0);

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
    onFocusReceived: handleFocusReceived,
    onRemoteUpdate: handleRemoteUpdate,
  });

  // Handle access revocation from WebSocket
  useEffect(() => {
    if (collabStatus === 'revoked' || collabStatus === 'unauthorized') {
      setIsAccessRequired(true);
    }
  }, [collabStatus]);

  // Bind Yjs to DGM Editor whenever editor and yDoc are active
  useEffect(() => {
    if (!editorRef.current || !isEditorReady || !currentBoardId) {
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
  }, [isEditorReady, currentBoardId, yDoc]);

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
    } else {
      editor.setActiveHandlerLock(false);
      editor.activateHandler('select');
      editor.options.allowCreateTextOnCanvas = true;
      editor.options.showCreateConnectorController = true;
    }
  }, [isViewer, isEditorReady]);

  // Auto-Save logic (disabled for viewers)
  const triggerAutoSave = useCallback(() => {
    if (!currentBoardIdRef.current || !editorRef.current || !user || currentRoleRef.current === 'VIEWER') {
      return;
    }
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (!currentBoardIdRef.current || !editorRef.current || currentRoleRef.current === 'VIEWER') return;
      try {
        const content = editorRef.current.saveToJSON();
        await api.saveWhiteboard({
          id: currentBoardIdRef.current,
          name: currentBoardNameRef.current,
          content
        });
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }, 1000);
  }, [user]);

  const handleMount = useCallback(async (editor: Editor) => {
    editorRef.current = editor;
    editor.options.canvasColor = '#f8fafc';
    editor.options.blankColor = '#f8fafc';
    editor.options.gridColor = '#e2e8f0';
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
    });

    const d1 = editor.transform.onTransaction.addListener(() => {
      const selected = editor.selection.getShapes();
      for (const s of selected) {
        updateShapeTextProportions(s, editor);
      }
      editor.repaint();
      triggerAutoSave();
    });
    const dAction = editor.transform.onAction.addListener(() => {
      const selected = editor.selection.getShapes();
      for (const s of selected) {
        updateShapeTextProportions(s, editor);
      }
      editor.repaint();
      triggerAutoSave();
    });
    const d2 = editor.transform.onUndo.addListener(() => {
      triggerAutoSave();
    });
    const d3 = editor.transform.onRedo.addListener(() => {
      triggerAutoSave();
    });

    const d4 = editor.selection.onChange.addListener((shapes) => {
      setSelectedShapeCount(shapes.length);
      updatePresence({ selection: shapes.map((s) => s.id) });
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      dInit.dispose();
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

  // Shape creation handlers
  const handleAddShape = (type: 'Box' | 'Oval' | 'Triangle' | 'Rhombus') => {
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
    } else if (type === 'Triangle') {
      shape = editor.factory.createLine([[x + 50, y], [x + 100, y + 100], [x, y + 100], [x + 50, y]], true);
    } else if (type === 'Rhombus') {
      shape = editor.factory.createLine([[x + 50, y], [x + 100, y + 50], [x + 50, y + 100], [x, y + 50], [x + 50, y]], true);
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
      id: currentBoardId || undefined,
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
        onExportJSON={handleExportJSON}
        onImportJSON={handleImportJSON}
        onDeleteBoard={handleDeleteCurrentBoard}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onFocusAll={handleFocusAllOnSelection}
      />

      {/* DGM Editor Canvas */}
      <div 
        ref={containerRef}
        onContextMenu={handleContextMenu}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="w-full h-full relative flex-1 bg-slate-50"
      >
        <DGMEditor className="w-full h-full" onMount={handleMount} />
        <CollabOverlay 
          editor={editorRef.current} 
          peers={peers} 
          focusedShapeIds={focusedShapeIds} 
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
        activeColor={activeColor}
        onColorChange={handleColorChange}
        onAddShape={handleAddShape}
        onAddLine={handleAddLine}
        onAddText={handleAddText}
        onZoom={handleZoom}
      />

      {/* Share Board Modal */}
      {currentBoardId && (
        <ShareBoardModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          boardId={currentBoardId}
          boardName={currentBoardName}
          currentUserRole={currentRole}
          currentUserId={user?.profile.sub || ''}
          onLeaveBoard={() => {
            navigate('/board');
          }}
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
