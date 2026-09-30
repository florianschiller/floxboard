---
sessionId: session-260921-140020-1gkb
---

# Requirements

### Overview & Goals
When accessing a whiteboard, the collaborative real-time WebSocket connection (`/ws/whiteboards/{id}`) fails to establish because the authentication token is not passed to the `useWhiteboardCollab` hook in the main `Whiteboard` component. This causes the hook's connection guard (`if (!boardId || !token || !userId)`) to immediately abort the connection attempt and leave the status as `disconnected`.

The goal of this change is to supply the authentication token (`token || user?.access_token`) and the `refreshToken` handler from `useAuth()` into `useWhiteboardCollab` inside `Whiteboard.tsx`, enabling WebSocket connectivity, Yjs document synchronization, and awareness presence indicators for whiteboard sessions.

### Scope
- **In Scope:**
  - Retrieve `token` and `refreshToken` from `useAuth()` inside `src/main/webui/src/components/whiteboard/Whiteboard.tsx`.
  - Pass `token` and `refreshToken` to `useWhiteboardCollab` in `Whiteboard.tsx`.
  - Add test assertions in `Whiteboard.test.tsx` verifying that `useWhiteboardCollab` receives the authentication token and refresh handler.
- **Out of Scope:**
  - Changes to backend WebSocket authentication logic in `WhiteboardCollabSocket.kt` (already functioning properly).
  - Changes to the underlying Yjs synchronization protocols or DGM engine canvas bindings.

### User Stories
- **As a** floxBoard user opening a shared or personal whiteboard,
- **I want** the real-time WebSocket connection to establish automatically upon opening the board,
- **So that** I can collaborate in real time, view peer presence pointers, and synchronize canvas modifications across clients.

### Functional Requirements
- When an authenticated user opens a whiteboard (`/board/:id` or active board ID), `useWhiteboardCollab` must receive a valid JWT token and initiate a WebSocket handshake with `/ws/whiteboards/{id}?token=...`.
- If a token expires during an active session (status code 4401 close reason), the client must trigger `refreshToken` to renew credentials and reconnect.
- Real-time awareness, remote cursor tracking, and collaborative Yjs updates must resume normal operation when visiting whiteboards.

# Technical Design

### Current Implementation
- `useWhiteboardCollab` in `src/main/webui/src/lib/useWhiteboardCollab.ts` requires `{ boardId, token, user, refreshToken, ... }`. Inside its connection `useEffect`:
  ```typescript
  if (!boardId || !token || !userId) {
    setStatus('disconnected');
    return;
  }
  ```
- In `src/main/webui/src/components/whiteboard/Whiteboard.tsx`, `useAuth()` is called as `const { user, refreshToken } = useAuth();`, but `token` is omitted.
- `useWhiteboardCollab` is instantiated without passing `token` or `refreshToken`:
  ```typescript
  const { peers, status: collabStatus, ... } = useWhiteboardCollab({
    boardId: persistence.currentBoardId,
    user: collabUser,
    onFocusReceived: ...,
  });
  ```
- Because `token` is `undefined`, the hook exits early and never attempts to open the WebSocket.

### Root Cause Analysis
The `useWhiteboardCollab` invocation in `Whiteboard.tsx` was missing the `token` and `refreshToken` properties. As a result, the guard condition in `useWhiteboardCollab.ts` evaluated `!token` as `true`, aborting the connection before the WebSocket could be instantiated.

### Key Decisions
- **Source of Token:** Destructure `token` from `useAuth()` and fallback to `user?.access_token` to guarantee a valid token string is passed whenever a session is active.
- **Token Refresh Support:** Pass `refreshToken` from `useAuth()` into `useWhiteboardCollab` so that transient token expiration triggers automatic silent renewal and WebSocket reconnection.

### Proposed Changes
1. **`Whiteboard.tsx` (`src/main/webui/src/components/whiteboard/Whiteboard.tsx`):**
   - Destructure `token` from `useAuth()`:
     ```typescript
     const { user, token, refreshToken } = useAuth();
     ```
   - Provide `token` and `refreshToken` in the options object passed to `useWhiteboardCollab`:
     ```typescript
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
     ```

### Components
- **`Whiteboard.tsx`:** Primary whiteboard view controller connecting canvas state, persistence, UI dialogs, and real-time collaboration.
- **`useWhiteboardCollab.ts`:** Collaboration hook managing WebSocket lifecycle, binary Yjs sync messages, and awareness state table.

### File Structure
- `src/main/webui/src/components/whiteboard/Whiteboard.tsx` — Modified to supply `token` and `refreshToken` to `useWhiteboardCollab`.
- `src/main/webui/src/components/Whiteboard.test.tsx` — Updated with unit tests asserting proper parameters passed to `useWhiteboardCollab`.

### Risks & Mitigations
- **Risk:** Token may temporarily be null on initial mount before auth initialization finishes.
  - **Mitigation:** `useWhiteboardCollab` already contains an effect monitoring `[boardId, token, userId]` that automatically connects as soon as the token becomes available.

# Testing

### Validation Approach
- Verify via frontend unit tests in Vitest that `useWhiteboardCollab` is invoked with valid credentials and tokens when the Whiteboard component is rendered.
- Ensure all existing test suites for `useWhiteboardCollab` and `Whiteboard` pass cleanly without regressions.

### Key Scenarios
- **Initial Connection:** When `Whiteboard` mounts with an authenticated user and valid board ID, `useWhiteboardCollab` receives `token: 'fake-token'` and initiates WebSocket connection.
- **Token Refresh on Expiry:** When WebSocket receives a 4401 close code, `refreshToken` is invoked to obtain a renewed token and reconnect.
- **Unauthenticated / Anonymous Access:** When no token is present, the hook cleanly remains in `disconnected` state without throwing unhandled exceptions.

### Test Changes
- Update `src/main/webui/src/components/Whiteboard.test.tsx` to verify `useWhiteboardCollab` is called with `{ token: expect.any(String), refreshToken: expect.any(Function), ... }`.

# Delivery Steps

### ✓ Step 1: Pass authentication token and refresh handler in Whiteboard component
Ensure the Whiteboard component supplies the active authentication token and token renewal callback to the collaboration hook.

- Retrieve `token` from `useAuth()` alongside `user` and `refreshToken` in `Whiteboard.tsx`.
- Pass `token: token || user?.access_token || null` and `refreshToken` in the options object passed to `useWhiteboardCollab`.
- Verify `collabUser` correctly retains user identity properties (`sub`, `name`, `email`) when passing to `useWhiteboardCollab`.

### ✓ Step 2: Add test verification and regression coverage
Ensure unit and integration tests verify WebSocket parameters and hook options.

- Update `Whiteboard.test.tsx` to assert that `useWhiteboardCollab` is called with the expected `token` and `refreshToken` parameters when a whiteboard is mounted.
- Run frontend unit and integration tests (`npm --prefix src/main/webui test`) to verify all tests pass without regressions.