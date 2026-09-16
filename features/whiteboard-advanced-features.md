# Advanced Whiteboard Capabilities [PLANNED]

## Overview
> ⚠️ **Status: Planned / Roadmap**  
> The features detailed in this specification are currently **not implemented** in the application UI/backend runtime. These capabilities represent upcoming architectural enhancements modeled after DGM.js (`@dgmjs/core`) patterns and enterprise whiteboard workflows.

The Advanced Whiteboard module extends floxBoard with enterprise-grade diagramming workflows, visual component reuse, multi-page canvas structuring, and point-in-time snapshot recovery. Built on top of DGM.js (`@dgmjs/core`), these capabilities empower engineering teams, product managers, and design facilitators to organize complex systems, standardize architectural stencils, and safeguard project evolution over time.

---

## Key Capabilities

### 1. Shape Libraries & Custom Stencils [IMPLEMENTED]
- **Pre-Built Stencil Collections:** Searchable built-in libraries categorized for technical domains:
  - *Agile & Sprint Teams:* User story cards, story points/planning poker badges, retrospectives (What Went Well, Mad/Sad/Glad, Sailboat), Kanban columns, sprint goals, and blocker flags.
  - *Cloud Architecture:* AWS, Azure, GCP, and Kubernetes service icons and boundary blocks.
  - *Software Design & UML:* Class diagrams, sequence flows, ER database schemas, and state machines.
  - *UI Wireframing:* Mobile/desktop wireframe components, buttons, dialogs, form inputs, and navigation patterns.
  - *Flowcharts & BPMN:* Standard decision gates, terminal points, process nodes, and data repositories.
- **Custom User & Organization Libraries:**
  - Save any selection of canvas shapes or grouped frames directly into a custom shape stencil kit.
  - Organization-wide stencil sharing with permission controls (`READ`, `CONTRIBUTE`, `ADMIN`).
- **Drag-and-Drop Stencil Palette (`ShapeLibraryDrawer`):**
  - Search filter by stencil keyword, category tag, or recently used components.
  - Seamless drag-and-drop placement from the library panel onto active canvas coordinates.

### 2. Diagram Templates & Board Blueprints [PLANNED]
- **Curated Starter Gallery (`TemplateGalleryModal`):**
  - Pre-designed board blueprints for common agile and engineering ceremonies: Sprint Retrospectives, C4 System Architecture, Customer Journey Maps, Mind Maps, User Story Mapping, and Incident Postmortems.
- **Custom Board Templating:**
  - Convert any existing whiteboard into an organization-scoped or personal template.
  - Template metadata support: Title, category, description, preview thumbnail generation, and suggested collaborator roles.
- **Instant Board Scaffolding:**
  - One-click board creation is populated with all predefined template shapes, frames, connectors, and presentation steps.

### 3. Multi-Page Canvas Architecture (Pages) [PLANNED]
- **Document-Level Multi-Page Hierarchy:**
  - A single floxBoard document supports multiple distinct infinite canvas pages within the DGM document tree (`Doc.pages: Page[]`).
  - Each page maintains an independent coordinate space, shape tree, presentation step sequence, and viewport camera state.
- **Page Switcher & Management UI (`PageTabBar` / `PageSwitcherDrawer`):**
  - Tabbed page bar at the bottom/sidebar of the canvas displaying active page name and thumbnail previews.
  - Fast page operations: Add new page, duplicate current page, rename page, reorder pages via drag-and-drop, and delete page.
- **Cross-Page Linking & Navigation:**
  - Connector shapes and action buttons can reference shapes on other pages (`shape.customData.linkToPageId`), enabling multi-page interactive mockups and hierarchical system navigation.

### 4. Revision History & Point-in-Time Snapshots [IMPLEMENTED]
- **Granular Change Tracking:**
  - Automated periodic checkpoint creation during active editing sessions.
  - Named milestone snapshots allowing authors to manually create labeled checkpoints (e.g., "Architecture Review v1.0", "Pre-Refactoring").
- **Visual Version Timeline (`HistoryDrawer`):**
  - Chronological timeline sidebar showing snapshot timestamps, authors, change descriptions, and visual mini-previews.
  - Read-only diff inspection mode allowing users to preview any historic state without modifying the live active document.
- **One-Click Restore & Forking:**
  - *Restore Snapshot:* Roll back the current whiteboard to any historic checkpoint with full collaborative synchronization.
  - *Create Board from Version:* Fork a past snapshot into a brand new standalone whiteboard document.

---

## Technical Architecture

### Backend Components
- **`ShapeLibraryResource.kt` [IMPLEMENTED]:** REST API endpoints for personal and organization custom shape libraries and stencil manipulation (`/api/v1/shape-libraries/*`).
- **`ShapeLibraryService.kt` [IMPLEMENTED]:** Access control and persistence management for custom stencil kits.
- **`WhiteboardTemplateResource.kt` [PLANNED]:** REST API endpoints for template catalog retrieval, custom template creation, and organization sharing (`/api/v1/whiteboard/templates/*`).
- **`WhiteboardHistoryResource.kt` [IMPLEMENTED]:** Endpoints for querying board snapshot history, creating named checkpoints, and triggering version rollbacks (`/api/v1/whiteboards/{id}/history/*`).
- **`WhiteboardHistoryService.kt` [IMPLEMENTED]:** Manages snapshot persistence, delta compression, and restore transactions.
- **`WhiteboardTemplate.kt` [PLANNED], `ShapeLibrary.kt` [IMPLEMENTED], `ShapeStencil.kt` [IMPLEMENTED] & `WhiteboardSnapshot.kt` [IMPLEMENTED]:** JPA Panache entity models storing template definitions, shape stencil libraries, and immutable snapshot payloads.
- **`DgmModel.kt` [PLANNED Ext.]:** Serialization schema supporting multi-page DGM document representations (`Doc.pages`).

### Frontend Components
- **`ShapeLibraryDrawer.tsx` [IMPLEMENTED]:** Collapsible stencil palette with category tabs, search input, board-level collection filtering, and drag-and-drop canvas insertion.
- **`SaveStencilModal.tsx` [IMPLEMENTED]:** Dialog for saving canvas shape selections as reusable custom stencils with category tags.
- **`TemplateGalleryModal.tsx` [PLANNED]:** Modal for selecting starter blueprints when creating a new board or importing templates.
- **`SaveTemplateModal.tsx` [PLANNED]:** Dialog for publishing the current board state as a reusable template.
- **`PageTabBar.tsx` & `PageSwitcherDrawer.tsx` [PLANNED]:** Bottom canvas tab bar and drawer for managing and switching between canvas pages.
- **`HistoryDrawer.tsx` [IMPLEMENTED]:** Interactive version history inspector with snapshot previews, restore triggers, and named checkpoint creation.

### Data & Document Schema
```typescript
interface DgmDocument {
  id: string;
  version: number;
  activePageId: string;
  pages: DgmPage[];
  customData?: {
    templateId?: string;
    organizationId?: string;
  };
}

interface DgmPage {
  id: string;
  name: string;
  order: number;
  shapes: DgmShape[];
  viewport: { x: number; y: number; zoom: number };
  customData?: {
    presentationSteps?: PresentationStep[];
  };
}

interface PresentationStep {
  id: string;
  name: string;
  order: number;
  shapeIds: string[];
  durationMs?: number;
}

interface WhiteboardSnapshotPayload {
  snapshotId: string;
  boardId: string;
  version: number;
  name?: string;
  createdAt: string;
  createdBy: string;
  doc: DgmDocument;
}
```
