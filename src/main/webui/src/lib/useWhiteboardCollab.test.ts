// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as Y from 'yjs';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import { getUserColor, useWhiteboardCollab, PEER_PRESENCE_TIMEOUT } from './useWhiteboardCollab';

describe('useWhiteboardCollab & awareness utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });
  it('generates consistent colors for users', () => {
    const color1 = getUserColor('alice');
    const color2 = getUserColor('alice');
    const color3 = getUserColor('bob');

    expect(color1).toBe(color2);
    expect(typeof color1).toBe('string');
    expect(color1.startsWith('#')).toBe(true);
  });

  it('generates valid hex colors for arbitrary identifiers', () => {
    const testIds = ['user_123', 'admin@example.com', 'UUID-4567'];
    for (const id of testIds) {
      const color = getUserColor(id);
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('does not cause infinite update loop when user object reference changes on each render', () => {
    let renderCount = 0;
    const { result, rerender } = renderHook(
      ({ user }) => {
        renderCount++;
        return useWhiteboardCollab({
          boardId: null,
          token: null,
          user,
        });
      },
      {
        initialProps: {
          user: { id: 'user-1', name: 'Alice', email: 'alice@example.com' },
        },
      }
    );

    expect(result.current.status).toBe('disconnected');
    expect(result.current.peers).toEqual([]);
    expect(result.current.awareness.getLocalState()?.user).toMatchObject({
      id: 'user-1',
      name: 'Alice',
      email: 'alice@example.com',
    });

    // Re-render with brand new object reference containing same user data
    act(() => {
      rerender({
        user: { id: 'user-1', name: 'Alice', email: 'alice@example.com' },
      });
    });

    expect(renderCount).toBeLessThan(10);
    expect(result.current.awareness.getLocalState()?.user.id).toBe('user-1');
  });

  it('updates awareness presence fields without infinite re-renders', () => {
    const { result } = renderHook(() =>
      useWhiteboardCollab({
        boardId: null,
        token: null,
        user: { id: 'user-2', name: 'Bob' },
      })
    );

    act(() => {
      result.current.updatePresence({
        cursor: [100, 200],
        selection: ['shape-1'],
      });
    });

    const localState = result.current.awareness.getLocalState();
    expect(localState?.cursor).toEqual([100, 200]);
    expect(localState?.selection).toEqual(['shape-1']);
  });

  it('automatically prunes stale peer presences after timeout', () => {
    let mockWsInstance: any = null;
    class MockWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      readyState = 1;
      binaryType = 'arraybuffer';
      send = vi.fn();
      close = vi.fn();
      onopen: any = null;
      onmessage: any = null;
      onclose: any = null;
      onerror: any = null;
      constructor() {
        mockWsInstance = this;
      }
    }
    (globalThis as any).WebSocket = MockWebSocket;

    const { result, unmount } = renderHook(() =>
      useWhiteboardCollab({
        boardId: 'test-board-id',
        token: 'test-jwt-token',
        user: { id: 'user-alice', name: 'Alice' },
      })
    );

    // Trigger onopen
    act(() => {
      if (mockWsInstance && mockWsInstance.onopen) {
        mockWsInstance.onopen();
      }
    });

    const awareness = result.current.awareness;
    const remoteClientId = 999999;

    // Simulate receiving remote peer presence
    act(() => {
      awareness.states.set(remoteClientId, {
        user: { id: 'user-bob', name: 'Bob', color: '#3b82f6' },
        cursor: [50, 50],
        selection: [],
      });
      awareness.meta.set(remoteClientId, {
        clock: 1,
        lastUpdated: Date.now(),
      });
      awareness.emit('update', [{ added: [remoteClientId], updated: [], removed: [] }, 'remote']);
    });

    expect(result.current.peers.length).toBe(1);
    expect(result.current.peers[0].user.name).toBe('Bob');

    // Advance time past the peer timeout
    act(() => {
      vi.advanceTimersByTime(PEER_PRESENCE_TIMEOUT + 1000);
    });

    // The stale peer should be removed from awareness and peers list
    expect(result.current.peers.length).toBe(0);
    unmount();
  });

  it('maintains a stable yDoc instance and updates when boardId changes', () => {
    const { result, rerender, unmount } = renderHook(
      ({ boardId }) =>
        useWhiteboardCollab({
          boardId,
          token: null,
          user: { id: 'user-1', name: 'Alice' },
        }),
      {
        initialProps: { boardId: 'board-1' },
      }
    );

    const initialDoc = result.current.yDoc;
    const initialAwareness = result.current.awareness;

    // Rerender with same boardId
    rerender({ boardId: 'board-1' });
    expect(result.current.yDoc).toBe(initialDoc);
    expect(result.current.awareness).toBe(initialAwareness);

    // Rerender with new boardId
    rerender({ boardId: 'board-2' });
    expect(result.current.yDoc).not.toBe(initialDoc);
    expect(result.current.awareness).not.toBe(initialAwareness);
    unmount();
  });

  it('automatically reconnects on visibilitychange when disconnected', () => {
    let wsInstances: any[] = [];
    class MockWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      readyState = 1;
      binaryType = 'arraybuffer';
      send = vi.fn();
      close = vi.fn();
      onopen: any = null;
      onmessage: any = null;
      onclose: any = null;
      onerror: any = null;
      constructor() {
        wsInstances.push(this);
      }
    }
    (globalThis as any).WebSocket = MockWebSocket;

    const { result, unmount } = renderHook(() =>
      useWhiteboardCollab({
        boardId: 'test-board-reconnect',
        token: 'test-token',
        user: { id: 'user-1', name: 'Alice' },
      })
    );

    expect(wsInstances.length).toBe(1);
    const initialWs = wsInstances[0];

    // Simulate WebSocket connection closed while tab was inactive
    act(() => {
      initialWs.readyState = 3; // CLOSED
      if (initialWs.onclose) {
        initialWs.onclose({ code: 1006 });
      }
    });

    expect(result.current.status).toBe('disconnected');

    // Tab becomes visible again
    act(() => {
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // A new WebSocket connection should be created immediately
    expect(wsInstances.length).toBe(2);
    expect(result.current.status).toBe('connecting');
    unmount();
  });

  it('re-sends sync step 1 and awareness update when tab regains focus while open', () => {
    let wsInstances: any[] = [];
    class MockWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      readyState = 1; // OPEN
      binaryType = 'arraybuffer';
      send = vi.fn();
      close = vi.fn();
      onopen: any = null;
      onmessage: any = null;
      onclose: any = null;
      onerror: any = null;
      constructor() {
        wsInstances.push(this);
      }
    }
    (globalThis as any).WebSocket = MockWebSocket;

    const { unmount } = renderHook(() =>
      useWhiteboardCollab({
        boardId: 'test-board-focus',
        token: 'test-token',
        user: { id: 'user-1', name: 'Alice' },
      })
    );

    const ws = wsInstances[0];
    act(() => {
      if (ws.onopen) ws.onopen();
    });

    const sendCallsCount = ws.send.mock.calls.length;

    // Trigger focus event
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });

    // Should have sent sync step 1 and awareness update
    expect(ws.send.mock.calls.length).toBeGreaterThan(sendCallsCount);
    unmount();
  });

  it('force-reconnects when tab returns from being hidden for longer than PEER_PRESENCE_TIMEOUT', () => {
    let wsInstances: any[] = [];
    class MockWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      readyState = 1; // OPEN
      binaryType = 'arraybuffer';
      send = vi.fn();
      close = vi.fn().mockImplementation(function (this: any) {
        this.readyState = 3;
      });
      onopen: any = null;
      onmessage: any = null;
      onclose: any = null;
      onerror: any = null;
      constructor() {
        wsInstances.push(this);
      }
    }
    (globalThis as any).WebSocket = MockWebSocket;

    const { unmount } = renderHook(() =>
      useWhiteboardCollab({
        boardId: 'test-board-idle',
        token: 'test-token',
        user: { id: 'user-1', name: 'Alice' },
      })
    );

    expect(wsInstances.length).toBe(1);
    const initialWs = wsInstances[0];

    // Tab becomes hidden (backgrounded)
    act(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Advance time past PEER_PRESENCE_TIMEOUT (e.g. 10s in background)
    act(() => {
      vi.advanceTimersByTime(PEER_PRESENCE_TIMEOUT + 2000);
    });

    // Tab becomes visible again
    act(() => {
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Old socket should be closed and a new socket should be created to avoid zombie connection
    expect(initialWs.close).toHaveBeenCalled();
    expect(wsInstances.length).toBe(2);
    unmount();
  });

  it('exchanges full awareness table on incoming sync message', () => {
    let wsInstances: any[] = [];
    class MockWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      readyState = 1; // OPEN
      binaryType = 'arraybuffer';
      send = vi.fn();
      close = vi.fn();
      onopen: any = null;
      onmessage: any = null;
      onclose: any = null;
      onerror: any = null;
      constructor() {
        wsInstances.push(this);
      }
    }
    (globalThis as any).WebSocket = MockWebSocket;

    const { result, unmount } = renderHook(() =>
      useWhiteboardCollab({
        boardId: 'test-board-sync-awareness',
        token: 'test-token',
        user: { id: 'user-1', name: 'Alice' },
      })
    );

    const ws = wsInstances[0];
    act(() => {
      if (ws.onopen) ws.onopen();
    });

    // Add a remote peer to awareness
    const remoteClientId = 999;
    act(() => {
      result.current.awareness.setLocalStateField('cursor', [100, 100]);
      (result.current.awareness.states as any).set(remoteClientId, {
        user: { id: 'user-2', name: 'Bob', color: '#ff0000' },
        cursor: [200, 200],
      });
      (result.current.awareness.meta as any).set(remoteClientId, {
        clock: 1,
        lastUpdated: Date.now(),
      });
    });

    ws.send.mockClear();

    // Simulate incoming SyncStep1 binary message
    const remoteDoc = new Y.Doc();
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, 0); // messageSync
    syncProtocol.writeSyncStep1(encoder, remoteDoc);
    const syncMsg = encoding.toUint8Array(encoder);

    act(() => {
      if (ws.onmessage) {
        ws.onmessage({ data: syncMsg.buffer });
      }
    });

    // ws.send should have been called for SyncStep2 and Awareness update containing all clients
    expect(ws.send).toHaveBeenCalled();
    const sentCalls = ws.send.mock.calls;
    // Check awareness binary message was sent
    const hasAwarenessMsg = sentCalls.some(([buffer]: any[]) => {
      const arr = new Uint8Array(buffer);
      const dec = decoding.createDecoder(arr);
      return decoding.readVarUint(dec) === 1; // messageAwareness
    });
    expect(hasAwarenessMsg).toBe(true);
    unmount();
  });

  it('transmits keepalive ping frame on heartbeat interval', () => {
    let wsInstances: any[] = [];
    class MockWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      readyState = 1; // OPEN
      binaryType = 'arraybuffer';
      send = vi.fn();
      close = vi.fn();
      onopen: any = null;
      onmessage: any = null;
      onclose: any = null;
      onerror: any = null;
      constructor() {
        wsInstances.push(this);
      }
    }
    (globalThis as any).WebSocket = MockWebSocket;

    const { unmount } = renderHook(() =>
      useWhiteboardCollab({
        boardId: 'test-board-ping',
        token: 'test-token',
        user: { id: 'user-1', name: 'Alice' },
      })
    );

    const ws = wsInstances[0];
    act(() => {
      if (ws.onopen) ws.onopen();
    });

    ws.send.mockClear();

    // Advance time for one heartbeat interval
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    const hasPingMsg = ws.send.mock.calls.some(([arg]: any[]) => arg === JSON.stringify({ type: 'ping' }));
    expect(hasPingMsg).toBe(true);
    unmount();
  });

  it('attempts silent token refresh when receiving 4401 close code', async () => {
    let wsInstances: any[] = [];
    class MockWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      readyState = 1;
      binaryType = 'arraybuffer';
      url: string;
      send = vi.fn();
      close = vi.fn();
      onopen: any = null;
      onmessage: any = null;
      onclose: any = null;
      onerror: any = null;
      constructor(url: string) {
        this.url = url;
        wsInstances.push(this);
      }
    }
    (globalThis as any).WebSocket = MockWebSocket;

    const refreshTokenMock = vi.fn().mockResolvedValue('new-refreshed-token');

    const { result, unmount } = renderHook(() =>
      useWhiteboardCollab({
        boardId: 'test-board-auth-renew',
        token: 'initial-expired-token',
        user: { id: 'user-1', name: 'Alice' },
        refreshToken: refreshTokenMock,
      })
    );

    const ws1 = wsInstances[0];

    // Trigger 4401 unauthorized close on first socket
    await act(async () => {
      if (ws1.onclose) {
        await ws1.onclose({ code: 4401 });
      }
    });

    expect(refreshTokenMock).toHaveBeenCalled();
    // After silent renew, a new WebSocket connection attempt should be made with the new token
    expect(wsInstances.length).toBe(2);
    expect(wsInstances[1].url).toContain('token=new-refreshed-token');
    unmount();
  });

  it('restores local awareness state if it was cleared and updates awareness clock on visibility change', () => {
    let wsInstances: any[] = [];
    class MockWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      readyState = 1;
      binaryType = 'arraybuffer';
      url: string;
      send = vi.fn();
      close = vi.fn();
      onopen: any = null;
      onmessage: any = null;
      onclose: any = null;
      onerror: any = null;
      constructor(url: string) {
        this.url = url;
        wsInstances.push(this);
      }
    }
    (globalThis as any).WebSocket = MockWebSocket;

    const { result, unmount } = renderHook(() =>
      useWhiteboardCollab({
        boardId: 'test-board-awareness-recovery',
        token: 'token-123',
        user: { id: 'user-1', name: 'Alice', email: 'alice@example.com' },
      })
    );

    const awareness = result.current.awareness;
    const initialClock = awareness.meta.get(awareness.doc.clientID)?.clock || 0;

    // Simulate awareness state being stripped (e.g. from previous unload or disconnect)
    awarenessProtocol.removeAwarenessStates(awareness, [awareness.doc.clientID], 'unload');
    expect(awareness.getLocalState()).toBeNull();

    // Trigger visibility change to visible
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });

    // Local awareness should be restored and clock incremented
    const restoredState = awareness.getLocalState();
    expect(restoredState).not.toBeNull();
    expect(restoredState?.user).toMatchObject({
      id: 'user-1',
      name: 'Alice',
      email: 'alice@example.com',
    });
    const newClock = awareness.meta.get(awareness.doc.clientID)?.clock || 0;
    expect(newClock).toBeGreaterThan(initialClock);

    unmount();
  });
});
