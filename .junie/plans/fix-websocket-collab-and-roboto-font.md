---
sessionId: session-260820-111638-7sg5
---

# Requirements

### Overview & Goals
The objective is to fix real-time collaboration stability issues on the whiteboard, specifically ensuring that when a browser tab is left inactive or in the background for an extended period, reconnecting reliably restores full bidirectional presence (cursors, selections) and document state synchronization across all collaborator sessions.

### Scope
- **In Scope**:
  - Global frontend typography update to the Roboto font family.
  - Robust session recovery and bidirectional awareness restoration when tabs are left idle, backgrounded, or temporarily disconnected.
  - Detection and recovery from zombie/half-open WebSocket connections upon tab focus.
  - Complete peer awareness state propagation across all room participants upon reconnection.
  - Accurate cursor coordinate transformations considering canvas zoom factor (`scale`), pan origin, and device pixel ratio (`ratio`).
  - Unit and integration tests verifying session restoration after backgrounding and idle timeouts.
- **Out of Scope**:
  - Backend schema changes or database migration.
  - Introducing external turn/relay servers.

### User Stories
- **As a collaborator returning to an idle tab**, I want my session and all other active collaborators' cursors, selections, and edits to immediately restore without needing to refresh the page.
- **As a collaborator active on a board**, I want peer collaborators who return from background tabs to immediately show up and synchronize their presence and edits on my screen.
- **As a collaborator**, I want peer cursors to point to the exact canvas locations even when zooming or panning.
- **As a user**, I want a clean modern appearance with the Roboto font applied consistently across the application.

### Functional Requirements
- **FR-1: Global Roboto Font**: All text across the UI must use the Roboto font family.
- **FR-2: Bidirectional Awareness & Session Restoration**: When a user returns to an inactive or background tab, the WebSocket connection must verify connection liveness (reconnecting if stale/half-open), re-announce local presence, and exchange full awareness state tables so all remote peers and cursors are restored.
- **FR-3: Reliable Real-Time Synchronization**: Shape additions, edits, and deletions must reliably sync across clients even after one client resumes from an idle state.
- **FR-4: Accurate Remote Cursors & Zoom Handling**: GCS-to-DCS coordinate conversions must account for canvas scale, pan origin, and DPI so remote cursors render in the exact corresponding canvas position on all screens.

### Non-Functional Requirements
- **Resilience**: Rapid detection of dead/zombie WebSocket connections within <1000ms upon tab focus.
- **Stability**: Clean awareness state cleanup and heartbeat maintenance without creating ping-pong message storms or memory leaks.

# Technical Design

### Current Implementation & Root Cause Analysis
1. **Half-Open / Zombie Connection after Idle**:
   - When a browser tab is backgrounded for an extended period, the operating system or network layer can drop the TCP socket without the browser receiving a FIN/RST packet.
   - `wsRef.current.readyState` remains `WebSocket.OPEN` (1), so `handleVisibilityOrFocus` skips calling `connect()`, leaving the socket unable to transmit or receive data until a manual page refresh.
2. **Partial Awareness State Encoding on Sync**:
   - On receiving `SyncStep1`, `useWhiteboardCollab.ts` previously only encoded `[yDoc.clientID]` in the awareness reply (`encodeAwarenessUpdate(awareness, [yDoc.clientID])`).
   - If peers timed out during backgrounding (`PEER_PRESENCE_TIMEOUT`), the returning client only received awareness for the responder, losing other peers in multi-user rooms.
   - Furthermore, when sending local awareness on reconnect, peers that received the update did not unconditionally return their current awareness table to the reconnecting client.
3. **Timer Throttling During Backgrounding**:
   - Browsers aggressively throttle `setInterval` (to >= 60s) for background tabs. During this time, local awareness heartbeats stop, leading active peers to prune the idle user from their awareness state.
   - When the idle user refocuses the tab, active peers must immediately be prompted to re-emit their full awareness states.

### Key Decisions
1. **Active Connection Verification & Force-Reconnect on Stale Tab Focus**:
   - Track `lastHeartbeatTimestamp` or `lastMessageTimestamp`.
   - When `visibilitychange` or `focus` triggers after the tab was in the background for longer than `PEER_PRESENCE_TIMEOUT` (8s), proactively verify connection readiness or recycle the WebSocket connection if unconfirmed.
2. **Full Awareness Table Exchange**:
   - On sync and reconnection handshake, encode all active awareness states (`Array.from(awareness.getStates().keys())`) rather than just `[yDoc.clientID]`.
   - Send both `SyncStep1` and local awareness upon reconnection, and ensure receiving peers reply with their full awareness table.
3. **Canvas-Relative Pointer Event Capture**:
   - Ensure pointer events are captured relative to the canvas viewport to prevent header offset issues during remote cursor rendering.

### Architecture Diagram
```mermaid
graph LR
    subgraph Tab A (Resuming after Idle)
        Focus[Visibility / Focus Event] --> Check[Liveness Check & Reconnect]
        Check --> WS[WebSocket Client]
        WS -->|1. SyncStep1 & Full Awareness| Relay[Backend CollabSocket]
        Relay -->|Broadcast| TabB[Tab B (Active Peer)]
        TabB -->|2. SyncStep2 & All Active Awareness| Relay
        Relay -->|Relay Back| WS
        WS --> Doc[Y.Doc Update]
        WS --> Aw[Awareness Table Restore]
        Doc --> Canvas[DGM Editor Canvas]
        Aw --> Overlay[CollabOverlay Peer Cursors]
    end
```

### Proposed Changes
- **`src/main/webui/src/lib/useWhiteboardCollab.ts`**:
  - In `handleVisibilityOrFocus`: detect if background duration exceeded peer presence timeout; if connection is unverified or closing, initiate a fresh `connect()`.
  - In sync response handler: encode all known awareness client states (`Array.from(awareness.getStates().keys())`) instead of single `yDoc.clientID`.
  - On incoming `SyncStep1`, ensure receiving peers respond with their complete awareness state to immediately restore mutual visibility.
  - Re-emit local awareness immediately on foregrounding so active peers un-prune the user.
- **`src/main/webui/src/lib/yjs-dgm-binding.ts`**:
  - Guarantee `isApplyingRemote` and `isApplyingLocal` are always reset in `try...finally` blocks.
  - Re-apply remote updates smoothly after idle reconnection.
- **`src/main/webui/src/components/Whiteboard.tsx` & `src/main/webui/src/components/CollabOverlay.tsx`**:
  - Ensure cursor coordinates and canvas bounding rects are consistently measured and transformed.
- **`src/main/webui/src/index.css` & `src/main/webui/index.html`**:
  - Maintain Roboto typography setup.

# Testing

### Validation Approach
Automated tests will be added and updated in `useWhiteboardCollab.test.ts` and `yjs-dgm-binding.test.ts` to simulate background tab timeouts, zombie connections, and multi-session awareness restoration.

### Key Scenarios
1. **Idle Tab Recovery & Peer Awareness Restoration**:
   - Connect Tab A and Tab B. Simulate Tab A going idle/hidden for > 8s (triggering peer timeout in Tab B).
   - Trigger `visibilitychange` to visible on Tab A. Verify Tab A and Tab B mutually restore cursor presence without page reload.
2. **Zombie / Dropped WebSocket Recovery**:
   - Simulate WebSocket silently dropping in background. Trigger tab focus. Verify new WebSocket instance is spawned, SyncStep1 is emitted, and document/peer states synchronize.
3. **Multi-Peer Room Awareness Exchange**:
   - In a room with 3+ users, verify a reconnecting client receives presence information for all active users simultaneously.
4. **Document Sync Continuity**:
   - Modify canvas shapes in Tab B while Tab A is in the background. Verify Tab A catches up on all shape deltas upon returning.

# Delivery Steps

### ✓ Step 1: Implement robust WebSocket connection liveness and full awareness state exchange
Reconnecting sessions immediately restore full bidirectional peer awareness (remote cursors and selections) across all connected clients.

- Update `src/main/webui/src/lib/useWhiteboardCollab.ts` to exchange the complete awareness state table (`Array.from(awareness.getStates().keys())`) on sync responses rather than only the local client ID.
- Enhance `handleVisibilityOrFocus` to detect prolonged backgrounding, force-reconnect dead or half-open WebSocket connections, and re-emit local presence.
- Ensure peers receiving a sync step or awareness announcement immediately reply with their full awareness table to restore mutual peer presence.

### ✓ Step 2: Harden document synchronization and error recovery across idle sessions
Mutations made while a collaborator is backgrounded or reconnecting are seamlessly applied without dropped shapes or locked state flags.

- Enforce `try...finally` guarantees on `isApplyingRemote` and `isApplyingLocal` in `src/main/webui/src/lib/yjs-dgm-binding.ts` to prevent flag lockup after transient deserialization or canvas errors.
- Ensure pointer move event listeners and canvas coordinate transformations in `src/main/webui/src/components/Whiteboard.tsx` and `CollabOverlay.tsx` accurately track remote cursors under all zoom levels.

### ✓ Step 3: Add comprehensive automated test coverage for idle tab recovery and multi-peer reconnection
Test suite validates session restoration, awareness table sync, and reconnection handling.

- Add unit tests in `src/main/webui/src/lib/useWhiteboardCollab.test.ts` for long background timeouts, peer pruning, and full awareness state re-announcement on tab focus.
- Add multi-client sync tests in `src/main/webui/src/lib/yjs-dgm-binding.test.ts` verifying document integrity when recovering after idle intervals.
- Execute frontend and backend test suites to ensure zero regressions.