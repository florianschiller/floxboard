import { useState, useRef, useCallback, useEffect } from 'react';
import { Editor } from '@dgmjs/core';
import * as api from '@/lib/api';
import { serializeDocWithCustomData, restoreDocCustomData, centerOnContent, ensureAllShapesCentered } from '@/lib/shapeUtils';
import { YjsDgmBinding } from '@/lib/yjs-dgm-binding';
import { WhiteboardVotingConfig, DEFAULT_VOTING_CONFIG } from '@/types/voting';

export interface UseWhiteboardPersistenceProps {
  id?: string;
  user: any;
  isEditorReady: boolean;
  editorRef: React.RefObject<Editor | null>;
  bindingRef: React.RefObject<YjsDgmBinding | null>;
  votingConfig: WhiteboardVotingConfig;
  setVotingConfig: (config: WhiteboardVotingConfig) => void;
  setVotingTick: React.Dispatch<React.SetStateAction<number>>;
  onBoardChange?: (name: string | null) => void;
  setToastMessage: (msg: string | null) => void;
  navigate: (path: string, options?: any) => void;
}

export const countShapesInContent = (content: any): number => {
  if (!content || !Array.isArray(content.children)) return 0;
  let count = 0;
  content.children.forEach((c: any) => {
    if (c && Array.isArray(c.children)) count += c.children.length;
    else if (c && c.id) count += 1;
  });
  return count;
};

export function useWhiteboardPersistence({
  id,
  user,
  isEditorReady,
  editorRef,
  bindingRef,
  votingConfig,
  setVotingConfig,
  setVotingTick,
  onBoardChange,
  setToastMessage,
  navigate,
}: UseWhiteboardPersistenceProps) {
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);
  const [currentBoardName, setCurrentBoardName] = useState<string>("Untitled");
  const [currentRole, setCurrentRole] = useState<string | null>("OWNER");
  const [isPublic, setIsPublic] = useState(false);
  const [isLoadingBoard, setIsLoadingBoard] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessErrorStatus, setAccessErrorStatus] = useState<number | undefined>(undefined);
  const [boardMetadata, setBoardMetadata] = useState<{ createdAt?: string; updatedAt?: string }>({});

  const [previewSnapshot, setPreviewSnapshot] = useState<api.WhiteboardSnapshotDto | null>(null);
  const [isRestoringSnapshot, setIsRestoringSnapshot] = useState(false);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
  const [pendingRestoreSnapshot, setPendingRestoreSnapshot] = useState<api.WhiteboardSnapshotDto | null>(null);

  const autoSaveTimeoutRef = useRef<any>(null);
  const lastSavedContentJsonRef = useRef<string | null>(null);
  const lastSavedNameRef = useRef<string>("Untitled");
  const lastSavedShapeCountRef = useRef<number>(0);
  const isDeliberateClearRef = useRef<boolean>(false);
  const isInitialLoadRef = useRef<boolean>(true);
  const lastAttemptedIdRef = useRef<string | null>(null);
  const previewSnapshotRef = useRef<api.WhiteboardSnapshotDto | null>(null);
  const prePreviewDocRef = useRef<any>(null);
  const currentBoardIdRef = useRef<string | null>(null);
  const currentBoardNameRef = useRef<string>("Untitled");
  const currentRoleRef = useRef<string | null>("OWNER");

  useEffect(() => {
    currentBoardIdRef.current = currentBoardId;
  }, [currentBoardId]);

  useEffect(() => {
    currentBoardNameRef.current = currentBoardName;
  }, [currentBoardName]);

  useEffect(() => {
    currentRoleRef.current = currentRole;
  }, [currentRole]);

  useEffect(() => {
    previewSnapshotRef.current = previewSnapshot;
  }, [previewSnapshot]);

  const isOwner = currentRole === 'OWNER';
  const isEditor = currentRole === 'OWNER' || currentRole === 'ADMIN' || currentRole === 'EDITOR';
  const isViewer = currentRole === 'VIEWER';

  // Auto-Save logic (disabled for viewers & guarded against accidental wipes)
  const triggerAutoSave = useCallback(() => {
    if (previewSnapshotRef.current || !editorRef.current || !user || currentRoleRef.current === 'VIEWER' || isLoadingBoard) {
      return;
    }
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (previewSnapshotRef.current || !editorRef.current || currentRoleRef.current === 'VIEWER' || isLoadingBoard) return;
      try {
        const content = serializeDocWithCustomData(editorRef.current, { votingConfig });
        const currentContentJson = JSON.stringify(content ?? null);
        const currentName = currentBoardNameRef.current;
        const currentShapeCount = countShapesInContent(content);

        // Skip saving if both content and board name are unchanged
        if (lastSavedContentJsonRef.current === currentContentJson && lastSavedNameRef.current === currentName) {
          return;
        }

        // Guard against wiping a non-empty board during load/disconnect races
        if (lastSavedShapeCountRef.current > 0 && currentShapeCount === 0 && !isDeliberateClearRef.current) {
          console.warn("Auto-save suppressed: Board shape count dropped to 0 without deliberate user clear action.");
          return;
        }

        await api.saveWhiteboard({
          id: currentBoardIdRef.current || undefined,
          name: currentName,
          content
        });
        lastSavedContentJsonRef.current = currentContentJson;
        lastSavedNameRef.current = currentName;
        lastSavedShapeCountRef.current = currentShapeCount;
        isDeliberateClearRef.current = false;
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }, 1000);
  }, [user, isLoadingBoard, votingConfig, editorRef]);

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
      restoreDocCustomData(editorRef.current, board.content);
      if (board.content?.customData?.votingConfig) {
        setVotingConfig(board.content.customData.votingConfig);
      } else {
        setVotingConfig(DEFAULT_VOTING_CONFIG);
      }
      lastSavedShapeCountRef.current = countShapesInContent(board.content);
      lastSavedContentJsonRef.current = JSON.stringify(board.content ?? null);
      lastSavedNameRef.current = board.name;
      isDeliberateClearRef.current = false;
      ensureAllShapesCentered(editorRef.current);
      centerOnContent(editorRef.current);
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
      setAccessDenied(false);
      onBoardChange?.(board.name);
    } catch (err: any) {
      console.error("Failed to load whiteboard:", err);
      if (err.status === 403 || err.status === 401) {
        setAccessDenied(true);
        setAccessErrorStatus(err.status);
      } else {
        navigate("/board", { replace: true });
      }
    } finally {
      setIsLoadingBoard(false);
    }
  }, [editorRef, navigate, onBoardChange, setVotingConfig]);

  useEffect(() => {
    if (!isEditorReady || !user) return;

    if (id) {
      isInitialLoadRef.current = false;
      if (id === currentBoardIdRef.current) return;
      if (id === lastAttemptedIdRef.current && accessDenied) return;

      lastAttemptedIdRef.current = id;
      loadBoardData(id);
    } else {
      lastAttemptedIdRef.current = null;
      setIsLoadingBoard(false);
      setAccessDenied(false);
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
      }
    }
  }, [id, user, isEditorReady, navigate, loadBoardData, accessDenied]);

  const handleSaveBoard = useCallback(async (name: string, isSaveAs = false) => {
    if (!editorRef.current) return;
    try {
      const content = serializeDocWithCustomData(editorRef.current, { votingConfig });
      const boardToSave = {
        id: isSaveAs ? undefined : (currentBoardId || undefined),
        name,
        content
      };
      const saved = await api.saveWhiteboard(boardToSave);
      setCurrentBoardId(saved.id);
      setCurrentBoardName(saved.name);
      setCurrentRole(saved.effectiveRole || 'OWNER');
      setIsPublic(saved.isPublic || false);
      setBoardMetadata({ createdAt: saved.createdAt, updatedAt: saved.updatedAt });
      onBoardChange?.(saved.name);

      lastSavedContentJsonRef.current = JSON.stringify(content);
      lastSavedNameRef.current = saved.name;
      lastSavedShapeCountRef.current = countShapesInContent(content);

      setToastMessage(`Board "${saved.name}" saved successfully`);
      setTimeout(() => setToastMessage(null), 3000);

      if (!id || isSaveAs || id !== saved.id) {
        navigate(`/board/${saved.id}`);
      }
    } catch (err) {
      console.error("Failed to save whiteboard:", err);
      setToastMessage("Failed to save board");
      setTimeout(() => setToastMessage(null), 3000);
    }
  }, [currentBoardId, votingConfig, editorRef, onBoardChange, setToastMessage, navigate, id]);

  const handleUpdateBoardName = useCallback(async (name: string) => {
    if (!currentBoardIdRef.current || !editorRef.current) {
      setCurrentBoardName(name);
      currentBoardNameRef.current = name;
      onBoardChange?.(name);
      return;
    }
    const content = serializeDocWithCustomData(editorRef.current, { votingConfig });
    const updated = await api.saveWhiteboard({
      id: currentBoardIdRef.current,
      name,
      content,
    });
    lastSavedContentJsonRef.current = JSON.stringify(content ?? null);
    lastSavedNameRef.current = updated.name;
    setCurrentBoardName(updated.name);
    currentBoardNameRef.current = updated.name;
    onBoardChange?.(updated.name);
  }, [votingConfig, editorRef, onBoardChange]);

  const handleDeleteBoard = useCallback(async () => {
    if (!currentBoardId) return;
    if (window.confirm("Are you sure you want to delete this board?")) {
      try {
        await api.deleteWhiteboard(currentBoardId);
        setCurrentBoardId(null);
        setCurrentBoardName("Untitled");
        setCurrentRole(null);
        onBoardChange?.(null);
        editorRef.current?.newDoc();
        navigate("/board");
      } catch (err) {
        console.error("Failed to delete whiteboard:", err);
      }
    }
  }, [currentBoardId, onBoardChange, editorRef, navigate]);

  const handlePreviewSnapshot = useCallback((snapshot: api.WhiteboardSnapshotDto | null) => {
    if (!editorRef.current) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }

    if (snapshot) {
      if (!prePreviewDocRef.current) {
        prePreviewDocRef.current = serializeDocWithCustomData(editorRef.current, { votingConfig });
      }
      previewSnapshotRef.current = snapshot;
      setPreviewSnapshot(snapshot);
      bindingRef.current?.setPaused(true);

      editorRef.current.activateHandler?.('hand');
      editorRef.current.setActiveHandlerLock?.(true);
      editorRef.current.selection?.deselectAll?.();
      if (editorRef.current.keymap) {
        editorRef.current.keymap.keymap = {};
      }
      if (editorRef.current.options) {
        editorRef.current.options.allowCreateTextOnCanvas = false;
        editorRef.current.options.showCreateConnectorController = false;
      }

      if (snapshot.content) {
        try {
          editorRef.current.loadFromJSON(snapshot.content);
          restoreDocCustomData(editorRef.current, snapshot.content);
          centerOnContent(editorRef.current);
        } catch (err) {
          console.error("Failed to preview snapshot content:", err);
        }
      }
    } else {
      // Exit preview
      previewSnapshotRef.current = null;
      setPreviewSnapshot(null);
      bindingRef.current?.setPaused(false);

      editorRef.current.setActiveHandlerLock?.(false);
      editorRef.current.activateHandler?.('Select');
      if (editorRef.current.options) {
        editorRef.current.options.allowCreateTextOnCanvas = true;
        editorRef.current.options.showCreateConnectorController = true;
      }

      if (prePreviewDocRef.current) {
        editorRef.current.loadFromJSON(prePreviewDocRef.current);
        restoreDocCustomData(editorRef.current, prePreviewDocRef.current);
        if (prePreviewDocRef.current?.customData?.votingConfig) {
          setVotingConfig(prePreviewDocRef.current.customData.votingConfig);
        }
        prePreviewDocRef.current = null;
        centerOnContent(editorRef.current);
      }
    }
  }, [votingConfig, editorRef, bindingRef, setVotingConfig]);

  const handleRestoreSnapshot = useCallback((snapshot: api.WhiteboardSnapshotDto) => {
    setPendingRestoreSnapshot(snapshot);
    setIsRestoreConfirmOpen(true);
  }, []);

  const handleConfirmRestore = useCallback(async () => {
    if (!pendingRestoreSnapshot || !currentBoardId || !editorRef.current) return;
    setIsRestoringSnapshot(true);
    try {
      const restoredBoard = await api.restoreSnapshot(currentBoardId, pendingRestoreSnapshot.id);
      setIsRestoreConfirmOpen(false);
      setPendingRestoreSnapshot(null);
      setPreviewSnapshot(null);

      if (restoredBoard.content) {
        isDeliberateClearRef.current = true;
        editorRef.current.loadFromJSON(restoredBoard.content);
        restoreDocCustomData(editorRef.current, restoredBoard.content);
        centerOnContent(editorRef.current);
      }

      bindingRef.current?.syncEditorToYjs();
      lastSavedContentJsonRef.current = JSON.stringify(restoredBoard.content);
      lastSavedShapeCountRef.current = countShapesInContent(restoredBoard.content);

      setToastMessage(`Restored to snapshot "${pendingRestoreSnapshot.name || `v${pendingRestoreSnapshot.version}`}"`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error("Failed to restore snapshot:", err);
      setToastMessage("Failed to restore snapshot");
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsRestoringSnapshot(false);
    }
  }, [pendingRestoreSnapshot, currentBoardId, editorRef, bindingRef, setToastMessage]);

  const handleCancelRestore = useCallback(() => {
    setIsRestoreConfirmOpen(false);
    setPendingRestoreSnapshot(null);
  }, []);

  return {
    currentBoardId,
    setCurrentBoardId,
    currentBoardName,
    setCurrentBoardName,
    currentRole,
    setCurrentRole,
    isOwner,
    isEditor,
    isViewer,
    isPublic,
    setIsPublic,
    isLoadingBoard,
    accessDenied,
    accessErrorStatus,
    boardMetadata,
    previewSnapshot,
    setPreviewSnapshot,
    previewSnapshotRef,
    isRestoringSnapshot,
    isRestoreConfirmOpen,
    pendingRestoreSnapshot,
    autoSaveTimeoutRef,
    lastSavedContentJsonRef,
    lastSavedNameRef,
    lastSavedShapeCountRef,
    isDeliberateClearRef,
    triggerAutoSave,
    loadBoard: loadBoardData,
    handleSaveBoard,
    handleUpdateBoardName,
    handleDeleteBoard,
    handlePreviewSnapshot,
    handleRestoreSnapshot,
    handleConfirmRestore,
    handleCancelRestore,
  };
}
