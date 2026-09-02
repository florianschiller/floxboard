import { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

export type CollabStatus = 'connecting' | 'connected' | 'disconnected' | 'revoked' | 'unauthorized';

export interface CollabUser {
  id: string;
  name: string;
  email?: string;
  color: string;
}

export interface PeerPresence {
  clientId: number;
  user: CollabUser;
  cursor: [number, number] | null; // GCS coordinates
  selection: string[]; // Selected shape IDs
  lastUpdated: number;
}

export interface FocusEventPayload {
  type: 'FOCUS_SELECTION';
  shapeIds: string[];
  center: [number, number];
  initiatorName: string;
}

interface UseWhiteboardCollabOptions {
  boardId: string | null;
  token?: string | null;
  user?: {
    id: string;
    name: string;
    email?: string;
  } | null;
  refreshToken?: () => Promise<string | null>;
  onFocusReceived?: (event: FocusEventPayload) => void;
  onRemoteUpdate?: () => void;
}

const USER_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
];

export const AWARENESS_HEARTBEAT_INTERVAL = 3000; // 3 seconds
export const PEER_PRESENCE_TIMEOUT = 8000; // 8 seconds

export function getUserColor(identifier: string): string {
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % USER_COLORS.length;
  return USER_COLORS[index];
}

export function useWhiteboardCollab({
  boardId,
  token,
  user,
  refreshToken,
  onFocusReceived,
  onRemoteUpdate,
}: UseWhiteboardCollabOptions) {
  const [status, setStatus] = useState<CollabStatus>('disconnected');
  const [peers, setPeers] = useState<PeerPresence[]>([]);
  const [collabDoc, setCollabDoc] = useState<{
    boardId: string | null;
    yDoc: Y.Doc;
    awareness: awarenessProtocol.Awareness;
  }>(() => {
    const doc = new Y.Doc();
    return {
      boardId,
      yDoc: doc,
      awareness: new awarenessProtocol.Awareness(doc),
    };
  });

  if (collabDoc.boardId !== boardId) {
    const doc = new Y.Doc();
    setCollabDoc({
      boardId,
      yDoc: doc,
      awareness: new awarenessProtocol.Awareness(doc),
    });
  }

  useEffect(() => {
    return () => {
      collabDoc.awareness.destroy();
      collabDoc.yDoc.destroy();
    };
  }, [collabDoc.yDoc, collabDoc.awareness]);

  const { yDoc, awareness } = collabDoc;
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isRefreshingTokenRef = useRef(false);
  const isManuallyClosedRef = useRef(false);

  const onFocusReceivedRef = useRef(onFocusReceived);
  const onRemoteUpdateRef = useRef(onRemoteUpdate);
  const refreshTokenRef = useRef(refreshToken);
  const currentTokenRef = useRef<string | null>(token || null);

  useEffect(() => {
    currentTokenRef.current = token || null;
  }, [token]);

  useEffect(() => {
    onFocusReceivedRef.current = onFocusReceived;
  }, [onFocusReceived]);

  useEffect(() => {
    onRemoteUpdateRef.current = onRemoteUpdate;
  }, [onRemoteUpdate]);

  useEffect(() => {
    refreshTokenRef.current = refreshToken;
  }, [refreshToken]);

  const userId = user?.id;
  const userName = user?.name;
  const userEmail = user?.email;

  const ensureAndBroadcastLocalAwareness = useCallback(() => {
    if (!userId) return;
    const color = getUserColor(userId || userName || 'user');
    const localState = awareness.getLocalState();
    if (!localState || !localState.user) {
      awareness.setLocalState({
        user: {
          id: userId,
          name: userName || 'User',
          email: userEmail,
          color,
        },
        cursor: localState?.cursor || null,
        selection: Array.isArray(localState?.selection) ? localState.selection : [],
        lastActive: Date.now(),
      });
    } else {
      awareness.setLocalState({
        ...localState,
        lastActive: Date.now(),
      });
    }
  }, [userId, userName, userEmail, awareness]);

  // Initialize and maintain local user in awareness
  useEffect(() => {
    if (!userId) return;
    ensureAndBroadcastLocalAwareness();
  }, [userId, userName, userEmail, ensureAndBroadcastLocalAwareness]);

  // Connect to WebSocket room
  useEffect(() => {
    if (!boardId || !token || !userId) {
      setStatus('disconnected');
      return;
    }

    isManuallyClosedRef.current = false;
    let lastHiddenTime = 0;

    const sendSyncAndAwareness = (targetWs: WebSocket) => {
      if (targetWs.readyState !== WebSocket.OPEN) return;
      // 1. Send Sync Step 1
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 0); // messageSync
      syncProtocol.writeSyncStep1(encoder, yDoc);
      targetWs.send(encoding.toUint8Array(encoder));

      // 2. Refresh local awareness state to ensure fresh clock and broadcast active clients
      ensureAndBroadcastLocalAwareness();

      const allClients = Array.from(awareness.getStates().keys()).filter((id) => awareness.meta.has(id));
      if (!allClients.includes(yDoc.clientID) && awareness.getLocalState() !== null && awareness.meta.has(yDoc.clientID)) {
        allClients.push(yDoc.clientID);
      }
      if (allClients.length > 0) {
        const awarenessEncoder = encoding.createEncoder();
        encoding.writeVarUint(awarenessEncoder, 1); // messageAwareness
        encoding.writeVarUint8Array(
          awarenessEncoder,
          awarenessProtocol.encodeAwarenessUpdate(awareness, allClients)
        );
        targetWs.send(encoding.toUint8Array(awarenessEncoder));
      }
    };

    const connect = () => {
      if (isManuallyClosedRef.current) return;
      if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
        return;
      }

      const activeToken = currentTokenRef.current || token;
      if (!activeToken) {
        setStatus('disconnected');
        return;
      }

      setStatus('connecting');

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws/whiteboards/${boardId}?token=${encodeURIComponent(activeToken)}`;

      const socket = new WebSocket(wsUrl);
      socket.binaryType = 'arraybuffer';
      wsRef.current = socket;

      socket.onopen = () => {
        if (socket !== wsRef.current) return;
        reconnectAttemptsRef.current = 0;
        setStatus('connected');
        sendSyncAndAwareness(socket);
      };

      socket.onmessage = (event) => {
        if (socket !== wsRef.current) return;

        if (typeof event.data === 'string') {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'pong') {
              return;
            }
            if (data.type === 'FOCUS_SELECTION') {
              onFocusReceivedRef.current?.(data as FocusEventPayload);
            }
          } catch (e) {
            console.error('Error handling text message from WebSocket:', e);
          }
          return;
        }

        try {
          const buffer = new Uint8Array(event.data);
          const decoder = decoding.createDecoder(buffer);
          const messageType = decoding.readVarUint(decoder);

          if (messageType === 0) {
            // sync protocol message
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, 0);
            syncProtocol.readSyncMessage(decoder, encoder, yDoc, 'remote');
            if (encoding.length(encoder) > 1 && socket.readyState === WebSocket.OPEN) {
              socket.send(encoding.toUint8Array(encoder));
            }

            // Share full active awareness state table with peer on sync
            const allClients = Array.from(awareness.getStates().keys()).filter((id) => awareness.meta.has(id));
            if (!allClients.includes(yDoc.clientID) && awareness.getLocalState() !== null && awareness.meta.has(yDoc.clientID)) {
              allClients.push(yDoc.clientID);
            }
            if (allClients.length > 0 && socket.readyState === WebSocket.OPEN) {
              const awarenessEncoder = encoding.createEncoder();
              encoding.writeVarUint(awarenessEncoder, 1);
              encoding.writeVarUint8Array(
                awarenessEncoder,
                awarenessProtocol.encodeAwarenessUpdate(awareness, allClients)
              );
              socket.send(encoding.toUint8Array(awarenessEncoder));
            }

            onRemoteUpdateRef.current?.();
          } else if (messageType === 1) {
            // awareness message
            awarenessProtocol.applyAwarenessUpdate(
              awareness,
              decoding.readVarUint8Array(decoder),
              'remote'
            );
          }
        } catch (err) {
          console.error('Error decoding binary message from WebSocket:', err);
        }
      };

      socket.onclose = async (event) => {
        if (socket !== wsRef.current) return;

        if (event.code === 4403) {
          setStatus('revoked');
          isManuallyClosedRef.current = true;
          return;
        }
        if (event.code === 4401) {
          if (refreshTokenRef.current && !isRefreshingTokenRef.current) {
            isRefreshingTokenRef.current = true;
            try {
              const newToken = await refreshTokenRef.current();
              isRefreshingTokenRef.current = false;
              if (newToken && !isManuallyClosedRef.current) {
                currentTokenRef.current = newToken;
                if (wsRef.current) {
                  const oldWs = wsRef.current;
                  wsRef.current = null;
                  oldWs.onopen = null;
                  oldWs.onmessage = null;
                  oldWs.onclose = null;
                  oldWs.onerror = null;
                  try { oldWs.close(); } catch {}
                }
                connect();
                return;
              }
            } catch {
              isRefreshingTokenRef.current = false;
            }
          }
          setStatus('unauthorized');
          isManuallyClosedRef.current = true;
          return;
        }

        setStatus('disconnected');
        if (!isManuallyClosedRef.current) {
          const delay = Math.min(1000 * Math.pow(1.5, reconnectAttemptsRef.current), 10000) + Math.random() * 500;
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      socket.onerror = (err) => {
        if (socket !== wsRef.current) return;
        console.warn('WebSocket collaboration connection error:', err);
      };
    };

    connect();

    // Listen to local Yjs Doc updates to transmit deltas
    const handleDocUpdate = (update: Uint8Array, origin: any) => {
      if (origin === 'remote') return;
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, 0); // messageSync
        syncProtocol.writeUpdate(encoder, update);
        wsRef.current.send(encoding.toUint8Array(encoder));
      }
    };
    yDoc.on('update', handleDocUpdate);

    // Listen to Awareness updates to transmit presence
    const handleAwarenessUpdate = ({ added, updated, removed }: any, origin: any) => {
      if (origin === 'remote') {
        updatePeersList();
        return;
      }
      const changedClients = added.concat(updated).concat(removed);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, 1); // messageAwareness
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
        );
        wsRef.current.send(encoding.toUint8Array(encoder));
      }
      updatePeersList();
    };
    awareness.on('update', handleAwarenessUpdate);

    const updatePeersList = () => {
      const states = awareness.getStates();
      const localClientId = yDoc.clientID;
      const peerList: PeerPresence[] = [];

      states.forEach((state: any, clientId: number) => {
        if (clientId === localClientId || !state || !state.user) return;
        peerList.push({
          clientId,
          user: state.user,
          cursor: state.cursor || null,
          selection: Array.isArray(state.selection) ? state.selection : [],
          lastUpdated: Date.now(),
        });
      });

      setPeers((prevPeers) => {
        if (prevPeers.length === peerList.length) {
          const isIdentical = prevPeers.every((prev, i) => {
            const next = peerList[i];
            return (
              prev.clientId === next.clientId &&
              prev.user?.id === next.user?.id &&
              prev.user?.name === next.user?.name &&
              prev.user?.email === next.user?.email &&
              prev.user?.color === next.user?.color &&
              ((prev.cursor === null && next.cursor === null) ||
                (prev.cursor?.[0] === next.cursor?.[0] && prev.cursor?.[1] === next.cursor?.[1])) &&
              prev.selection.length === next.selection.length &&
              prev.selection.every((id, idx) => id === next.selection[idx])
            );
          });
          if (isIdentical) {
            return prevPeers;
          }
        }
        return peerList;
      });
    };

    // Periodic heartbeat to refresh our clock, send keepalive ping, and prune inactive peers
    const heartbeatInterval = setInterval(() => {
      // 1. Refresh local awareness state to keep our presence active
      ensureAndBroadcastLocalAwareness();

      // Send keepalive ping to maintain transport socket connection
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({ type: 'ping' }));
        } catch {}
      }

      // 2. Prune stale peer states that exceeded timeout
      const now = Date.now();
      const staleClients: number[] = [];
      const metaMap = awareness.meta;
      const statesMap = awareness.states;
      statesMap.forEach((_, clientId) => {
        if (clientId === yDoc.clientID) return;
        const meta = metaMap.get(clientId);
        if (!meta || now - meta.lastUpdated > PEER_PRESENCE_TIMEOUT) {
          staleClients.push(clientId);
        }
      });

      if (staleClients.length > 0) {
        awarenessProtocol.removeAwarenessStates(awareness, staleClients, 'timeout');
      }
    }, AWARENESS_HEARTBEAT_INTERVAL);

    const sendRemoveAwareness = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        awarenessProtocol.removeAwarenessStates(awareness, [yDoc.clientID], 'unload');
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, 1);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(awareness, [yDoc.clientID])
        );
        try {
          wsRef.current.send(encoding.toUint8Array(encoder));
        } catch {}
      }
    };

    const onVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        lastHiddenTime = Date.now();
        return;
      }
      handleVisibilityOrFocus();
    };

    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (isManuallyClosedRef.current) return;

      const wasHiddenLong = lastHiddenTime > 0 && Date.now() - lastHiddenTime > PEER_PRESENCE_TIMEOUT;
      lastHiddenTime = 0;

      // Force bump local awareness clock so remote peers accept fresh presence
      ensureAndBroadcastLocalAwareness();

      if (
        !wsRef.current ||
        wsRef.current.readyState === WebSocket.CLOSED ||
        wsRef.current.readyState === WebSocket.CLOSING ||
        (wasHiddenLong && wsRef.current.readyState === WebSocket.OPEN)
      ) {
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
          const oldWs = wsRef.current;
          wsRef.current = null;
          oldWs.onopen = null;
          oldWs.onmessage = null;
          oldWs.onclose = null;
          oldWs.onerror = null;
          try {
            oldWs.close();
          } catch {}
        }
        connect();
      } else if (wsRef.current.readyState === WebSocket.OPEN) {
        sendSyncAndAwareness(wsRef.current);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('beforeunload', sendRemoveAwareness);
    window.addEventListener('pagehide', sendRemoveAwareness);

    return () => {
      isManuallyClosedRef.current = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('beforeunload', sendRemoveAwareness);
      window.removeEventListener('pagehide', sendRemoveAwareness);
      clearInterval(heartbeatInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      sendRemoveAwareness();
      yDoc.off('update', handleDocUpdate);
      awareness.off('update', handleAwarenessUpdate);
      if (wsRef.current) {
        const oldWs = wsRef.current;
        wsRef.current = null;
        oldWs.onopen = null;
        oldWs.onmessage = null;
        oldWs.onclose = null;
        oldWs.onerror = null;
        try {
          oldWs.close();
        } catch {}
      }
      setPeers([]);
    };
  }, [boardId, token, userId, yDoc, awareness]);

  const updatePresence = useCallback((presence: { cursor?: [number, number] | null; selection?: string[] }) => {
    if (presence.cursor !== undefined) {
      awareness.setLocalStateField('cursor', presence.cursor);
    }
    if (presence.selection !== undefined) {
      awareness.setLocalStateField('selection', presence.selection);
    }
  }, [awareness]);

  const broadcastFocus = useCallback((shapeIds: string[], center: [number, number]) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const payload: FocusEventPayload = {
        type: 'FOCUS_SELECTION',
        shapeIds,
        center,
        initiatorName: userName || userEmail || 'Collaborator',
      };
      wsRef.current.send(JSON.stringify(payload));
    }
  }, [userName, userEmail]);

  return {
    status,
    peers,
    yDoc,
    awareness,
    updatePresence,
    broadcastFocus,
  };
}
