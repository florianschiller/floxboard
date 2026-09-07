# Whiteboard & Real-Time Collaboration

## Overview
The Whiteboard module provides an infinite interactive canvas supporting real-time multi-user diagramming, shape manipulation, state synchronization via CRDTs (Conflict-free Replicated Data Types), awareness/presence indicators, shape voting, step-by-step presentation mode, and granular access control. floxBoard leverages native DGM.js (`@dgmjs/core` and `@dgmjs/react`) engine capabilities to provide high-performance rendering, rich drawing tools, and smooth camera animations.

> ℹ️ **Implementation Notice:** Core canvas manipulation, geometric shapes (Rectangles, Ellipses, Sticky Notes, Text), extended drawing tools (Freehand, Marker, Eraser, Connectors, Lines, Frames), shape palette pruning, real-time CRDT/multiplayer synchronization, and Shape Voting (Dot-Voting) are **Implemented**. Step-by-Step Presentation Mode and Live Collaborative Reactions are **[PLANNED]** roadmap capabilities.

---

## Key Capabilities

### 1. Interactive Infinite Canvas & Drawing Tools
- **Coordinate Transformations (Implemented):** Pan, zoom, viewport translation, and canvas boundary calculations via DGM.js camera APIs (`editor.setViewport`, `editor.zoomToShapes`, `editor.zoomToFit`).
- **Core Shape & Drawing Toolset:**
  - **Rectangles & Rounded Boxes (Implemented):** Standard bounding containers with customizable fill, stroke, and corner radiuses.
  - **Ellipses & Circles (Implemented):** Oval and circular geometric elements for flowcharts and mind maps.
  - **Sticky Notes (Implemented):** Quick note cards with rich text formatting, color options, and automatic text wrapping.
  - **Text Annotations (Implemented):** Freeform text labels with typographic styling and markdown support.
  - **Freehand (`FreehandShape`) (Implemented):** Smooth pressure-sensitive bezier pencil/pen drawing for sketching and organic annotations.
  - **Marker (`MarkerShape`) (Implemented):** Semi-transparent highlighter brush with blend-mode support for emphasizing diagram regions without obscuring underlying shapes.
  - **Eraser (`EraserTool`) (Implemented):** Dynamic point-and-stroke eraser supporting intersection-based shape and freehand stroke deletion.
  - **Smart Connectors (`ConnectorShape`) (Implemented):** Auto-routing shape-to-shape link lines with magnetic anchor points, orthogonal/curved path styles, and directional arrowheads.
  - **Lines (`LineShape`) (Implemented):** Straight vector line segments with configurable terminators (arrows, dots, bars) and dash patterns.
  - **Frames (`FrameShape`) (Implemented):** Bounded artboard containers grouping child elements, providing viewport clipping, title headers, and serving as natural targets for presentations and exports.
- **Shape Palette Pruning & Simplification (Implemented):**
  - The legacy Triangle and Diamond (Rhombus) shapes have been removed from default toolbars in favor of flexible polygon/freehand tools and specialized shape library stencils, decluttering the primary toolbar.
- **Shape Management & Context Menu (Implemented):**
  - Duplicate, delete, resize, rotate, and reposition.
  - Layer ordering: *Bring to Front*, *Send to Back*, *Bring Forward*, *Send Backward*.
  - Grouping and ungrouping of complex shape assemblies.
  - Color palette selection, border style configuration, stroke thickness, fill transparency, and shape locking.

### 2. Votes on Shapes (Shape Voting) (Implemented)
- **Interactive Collaborative Voting:** Participants can cast dot-votes directly on sticky notes, idea cards, frames, and diagram shapes during retrospectives, planning sessions, and prioritization workshops.
- **Voting Triggers & Quick Actions:**
  - Shape context menu actions: *Vote on Shape* (with category selection) and *Remove My Vote*.
  - On-hover quick "+1" vote button appearing on selectable canvas elements.
- **In-Canvas Vote Badge (`ShapeVoteBadge`):**
  - Dynamic overlay badge anchored snugly inside the shape's lower-right corner (using `translate(-100%, -100%) scale(...)` with `transformOrigin: 'bottom right'` and proportional scaling based on shape dimensions and canvas zoom) showing total vote count and category-colored dot tags.
  - Hovering over the badge displays an interactive breakdown popover with collaborator avatars, names, category tags, timestamps, and direct vote removal controls.
- **CRDT-Backed Persistence & Real-Time Sync:**
  - Vote state is stored directly within DGM shape metadata (`shape.customData.votes: ShapeVote[]`).
  - Board-level voting configuration stored in document metadata (`doc.customData.votingConfig`).
  - Updates propagate instantly to all room participants through Yjs document synchronization without extra database polling and persist to PostgreSQL JSONB.
- **Facilitator & Settings Menu Controls:**
  - Dedicated "Voting & Facilitation" configuration tab in `WhiteboardConfigModal.tsx`.
  - Configurable per-user vote quotas (range 1–20, default 5).
  - Voting session status toggle (Active / Locked) with visual lock indicators.
  - Custom category definitions CRUD (name, color, explanatory comment/criteria description).
  - One-click facilitator "Reset All Votes" action with confirmation.
  - Header vote quota indicator tracking used and remaining allocations in real time (e.g. `Votes: 2/5 used`).

### 3. Presentation Mode & Step-by-Step Storytelling [PLANNED]
- **Single-Board Step Definition:**
  - Presenters can select one or multiple shapes/frames on a single board and register them as an ordered presentation step (Step 1, Step 2, ...).
  - Presentation steps are saved in the DGM page/document metadata (`page.customData.presentationSteps: PresentationStep[]`).
- **Presentation Step Drawer / Manager:**
  - Slide sequencing panel allowing presenters to view step list thumbnails, drag-and-drop reorder steps, rename steps (e.g., "Architecture Overview", "Database Cluster"), and add/remove shapes from steps.
- **Distraction-Free Presenter Experience:**
  - One-click transition into full-screen presentation mode (`isViewer = true`).
  - Editing tools, canvas sidebars, and non-navigation menus are automatically hidden to maximize visible canvas area.
  - Full interaction lock preventing accidental edits during live demonstrations.
- **Floating Presenter HUD & Navigation:**
  - Compact floating control HUD with *Previous* (`←`), *Next* (`→`), *Step Counter* (`Step X of Y`), *Step Overview Menu*, and *Exit Presentation* (`Esc` / exit button).
- **Smooth Animated Transitions via Native DGM.js APIs:**
  - Navigating to a step automatically computes the bounding box of target shapes (`calculateShapesBoundingBox(step.shapeIds)`) and triggers smooth animated camera transitions using `editor.zoomToShapes(step.shapeIds)` / `editor.setViewport(...)`.

### 4. Live Collaborative Reactions [PLANNED]
- **Real-Time Emoji Bursts:** Collaborators can send live reactions (`🔥`, `👍`, `❤️`, `🎉`, `🚀`, `💡`) during workshops and presentations.
- **Presence & Awareness Integration:** Reactions are broadcast via WebSocket and Yjs awareness states, animating floating emoji particles that drift upward from the user's cursor location or viewport center.
- **Non-Disruptive Engagement:** Provides instant audience feedback without creating persistent canvas clutter.

### 5. Real-Time Collaborative Synchronization (Implemented)
- **Yjs CRDT Engine:** Peer and server state synchronization ensuring conflict-free convergence across concurrent edits.
- **WebSocket Gateway (`/ws/whiteboard/{boardId}`):** Bidirectional binary & JSON state broadcast between active room participants.
- **Live Multiplayer Awareness:**
  - Remote cursor tracking with user name tags and color-coded pointers.
  - Active participant avatar presence bar in the navigation header.
  - Shape selection highlighting showing which user is actively manipulating an element.

### 6. Board Management & Access Control (Implemented)
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
- **`WhiteboardResource.kt` (Implemented):** REST API endpoints for board CRUD, collaborator queries, and access request workflows (`/api/v1/whiteboard/*`).
- **`WhiteboardCollabSocket.kt` (Implemented):** Quarkus WebSocket endpoint managing active rooms, connections, and message dispatching.
- **`WhiteboardService.kt` (Implemented):** Core domain logic managing board persistence, ownership checks, and collaborator permissions.
- **`Whiteboard.kt` / `WhiteboardCollaborator.kt` / `WhiteboardAccessRequest.kt` (Implemented):** JPA Panache entity models.
- **`DgmModel.kt` (Implemented):** Diagram document schema and parser for canvas state, pages, and shape metadata.

### Frontend Components
- **`Whiteboard.tsx` (Implemented):** Main canvas renderer, interaction controller, and DGM.js engine bridge.
- **`WhiteboardHeader.tsx` (Implemented):** Board title, presence avatars, presentation trigger, sharing modal triggers, and export actions.
- **`WhiteboardToolbar.tsx` (Implemented):** Primary tool selection bar with interactive drawing tools (Select, Freehand, Marker, Eraser, Line, Connector, Frame, Rectangles, Ellipses, Text) and active tool state highlighting.
- **`exportUtils.ts` (Implemented):** Multi-format canvas export engine serializing geometric shapes, freehand bezier paths, semi-transparent highlighter strokes, smart connectors with arrowheads, and bounded frames to SVG, PNG, and PDF.
- **`shapeUtils.ts` (Implemented):** Utility functions for shape classification, open line discrimination, text proportion management, and palette color styling.
- **`CollabOverlay.tsx` (Implemented):** Multiplayer cursor rendering and remote user selection highlights.
- **`ShapeVoteBadge.tsx` (Implemented):** In-canvas overlay rendering live category dot-vote tallies, voter popovers with timestamps and criteria breakdown, and quick vote casting buttons.
- **`WhiteboardConfigModal.tsx` (Implemented):** Whiteboard configuration dialog with tabs for General settings, Canvas preferences, Collaboration options, Voting & Facilitation management (session lock, quotas, category definitions CRUD, reset votes), and Danger zone.
- **`PresentationStepDrawer.tsx` [PLANNED]:** Step management drawer for adding shapes to presentation sequences, reordering, and configuring steps.
- **`PresentationHUD.tsx` [PLANNED]:** Full-screen floating presenter toolbar with step controls, slide counter, and smooth camera triggers.
- **`ReactionPicker.tsx` & `ReactionOverlay.tsx` [PLANNED]:** Floating emoji picker bar and animated particle layer.
- **`SaveBoardModal.tsx` & `OpenBoardModal.tsx` (Implemented):** Dialogs for managing board storage.
- **`ShareBoardModal.tsx` & `RequestAccessView.tsx` (Implemented):** Collaboration and permission management dialogs.
- **`ShapeContextMenu.tsx` & `UserContextMenu.tsx` (Implemented):** Contextual actions on canvas elements (layering, styling, line arrowheads, dot-voting categories) and user presence.
