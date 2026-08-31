# Whiteboard & Real-Time Collaboration

## Overview
The Whiteboard module provides an infinite interactive canvas supporting real-time multi-user diagramming, shape manipulation, state synchronization via CRDTs (Conflict-free Replicated Data Types), awareness/presence indicators, and granular access control.

---

## Key Capabilities

### 1. Interactive Infinite Canvas
- **Coordinate Transformations:** Pan, zoom, viewport translation, and canvas boundary calculations.
- **Tools & Shapes:** Rectangles, ellipses/circles, sticky notes, directional arrows/connectors, freehand drawing paths, and text annotations.
- **Shape Management & Context Menu:**
  - Duplicate, delete, resize, reposition.
  - Layer ordering: *Bring to Front*, *Send to Back*, *Bring Forward*, *Send Backward*.
  - Color palette selection, border style configuration, fill transparency.

### 2. Real-Time Collaborative Synchronization
- **Yjs CRDT Engine:** Peer and server state synchronization ensuring conflict-free convergence.
- **WebSocket Gateway (`/ws/whiteboard/{boardId}`):** Bidirectional binary & JSON state broadcast between active room participants.
- **Live Multiplayer Awareness:**
  - Remote cursor tracking with user name tags and color-coded pointers.
  - Active participant avatar presence bar.
  - Shape selection highlighting showing which user is actively editing an element.

### 3. Board Management & Access Control
- **Persistence & Serialization:** Diagrams saved and loaded using the DGM document format with metadata (title, description, tags, creation/modification timestamps).
- **Access Modes:**
  - `PRIVATE`: Accessible only by the owner and explicitly added collaborators.
  - `SHARED`: Accessible to specified collaborators with assigned permissions (`VIEW`, `EDIT`, `ADMIN`).
  - `PUBLIC`: Read/write access according to board configuration.
- **Access Requests & Sharing:**
  - Direct collaborator invitation by email/user identifier.
  - In-app access request modal for unauthorized users attempting to view private boards.
  - Notification triggers sent to board owners upon access requests.

---

## Technical Architecture

### Backend Components
- **`WhiteboardResource.kt`**: REST API endpoints for board CRUD, collaborator queries, and access request workflows (`/api/v1/whiteboard/*`).
- **`WhiteboardCollabSocket.kt`**: Quarkus WebSocket endpoint managing active rooms, connections, and message dispatching.
- **`WhiteboardService.kt`**: Core domain logic managing board persistence, ownership checks, and collaborator permissions.
- **`Whiteboard.kt` / `WhiteboardCollaborator.kt` / `WhiteboardAccessRequest.kt`**: JPA Panache entity models.
- **`DgmModel.kt`**: Diagram document schema and parser for canvas state.

### Frontend Components
- **`Whiteboard.tsx`**: Main canvas renderer and interaction controller.
- **`WhiteboardHeader.tsx` & `WhiteboardToolbar.tsx`**: Tool selection, undo/redo, export triggers, and active participant list.
- **`CollabOverlay.tsx`**: Rendering multiplayer cursors and real-time remote user highlights.
- **`SaveBoardModal.tsx` & `OpenBoardModal.tsx`**: Dialogs for managing board storage.
- **`ShareBoardModal.tsx` & `RequestAccessView.tsx`**: Collaboration and permission management dialogs.
- **`ShapeContextMenu.tsx` & `UserContextMenu.tsx`**: Contextual actions on canvas elements and users.
