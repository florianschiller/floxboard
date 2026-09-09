---
sessionId: session-260909-094434-16uc
---

# Requirements

### Overview & Goals
The goal of this feature is to implement **Whiteboard Version History & Revisions** (`whiteboard:version_history`) as specified in `/features/export-and-ai-services.md` and `features/whiteboard-advanced-features.md`.
This capability provides point-in-time diagram snapshot management, visual chronological timeline inspection, manual and automated checkpoint creation, non-destructive snapshot previews, one-click rollback/restore with live collaborative synchronization, and the ability to fork any past snapshot into a standalone whiteboard.

### Scope
- **In Scope:**
  - Backend `WhiteboardSnapshot` JPA entity and repository for storing immutable board states (`Doc` JSON content, version number, creator user ID `createdBy`, milestone names, `isAutomatic` flag, and timestamps) with auto-save pruning/retention limits.
  - `WhiteboardHistoryService` managing snapshot creation, retrieval, restore transactions, and board forking.
  - `WhiteboardHistoryResource` exposing `/api/v1/whiteboards/{id}/history` endpoints guarded by `@Authenticated` and `@RequireFeature("whiteboard:version_history")`.
  - Frontend API client functions in `src/main/webui/src/lib/api/whiteboard.ts`.
  - `HistoryDrawer.tsx` component displaying an interactive chronological timeline with manual snapshot creation, read-only inspection, rollback, and forking.
  - Canvas integration in `WhiteboardHeader.tsx` and `Whiteboard.tsx` with live Yjs/DGM synchronization when restoring snapshots.
  - Marking `Whiteboard Version History & Revisions` as `[IMPLEMENTED]` in `features/export-and-ai-services.md`, `features/whiteboard-advanced-features.md`, and `features.md`.
  - Full backend and frontend unit and integration test coverage.
- **Out of Scope:**
  - Multi-page document structure changes (`Doc.pages`) — handled in a separate multi-page milestone.
  - AI text-to-diagram generation and audit log export features.

### User Stories
- **As a whiteboard editor or owner**, I want to create named checkpoint snapshots (e.g., "Sprint 1 Architecture v1") so that our team can preserve critical design milestones.
- **As a collaborator**, I want to browse the revision timeline and preview historic states in read-only mode so that I can see how the diagram evolved without disrupting the current board.
- **As a whiteboard owner or editor**, I want to restore the whiteboard to a previous snapshot so that we can roll back accidental overwrites or discarded design directions across all live collaborative sessions.
- **As a user**, I want to fork an earlier revision into a new independent whiteboard so that I can branch alternative architectures without affecting the original board.
- **As a free-tier user**, I want to see feature-gated prompts indicating that Version History is available on `PRO`, `TEAM`, and `ENTERPRISE` plans.

### Functional Requirements
1. **Checkpoint Creation & Retention:**
   - Manual snapshot creation with customizable milestone name and optional description (kept permanently).
   - Automatic checkpoint generation triggered **only when actual canvas content has changed** (comparing incoming `content` against existing board state to avoid redundant snapshots during metadata edits or identical saves).
   - Automatic snapshot FIFO retention limit capped at **10 auto-saves per whiteboard** to maintain a lean database footprint.
   - Auto-incrementing version sequence per whiteboard.
2. **Revision Timeline Inspection:**
   - Display chronological list of snapshots with timestamp, creator ID (`createdBy`), milestone tag, and version indicator.
   - Pagination support for whiteboards with extensive history.
   - Read-only preview mode to view snapshot content without altering current canvas state.
3. **Restore & Rollback:**
   - Restoring a snapshot overwrites the whiteboard's content with the snapshot's `Doc` state and bumps the update timestamp.
   - Full collaborative propagation to active WebSocket peers via Yjs binding synchronization.
4. **Forking:**
   - Forking creates a new whiteboard owned by the requesting user populated with the historic snapshot's content.
   - Redirects or navigates the user to the newly created board.
5. **Feature Gating & Entitlements:**
   - Backend endpoint guarded by `@RequireFeature("whiteboard:version_history")` returning `403 Forbidden` for non-entitled users.
   - Frontend UI guarded by `<FeatureGate feature="whiteboard:version_history">` showing upgrade modal when triggered on `FREE` plan.
6. **Documentation Updates:**
   - Update `features/export-and-ai-services.md` and `features/whiteboard-advanced-features.md` to reflect `[IMPLEMENTED]` status for Version History.

### Non-Functional Requirements
- **Performance:** Efficient querying of snapshots with pagination; lightweight DGM snapshot payload storage using JSONB.
- **Security:** Strict permission checks ensuring only users with `VIEWER`+ can inspect history, and `EDITOR`+ can create snapshots, restore, or fork.
- **Reliability & Consistency:** Snapshot deletion cascade when deleting a parent whiteboard; atomic database transactions for restore and fork.

# Technical Design

### Current Implementation
- **Backend Entities & Services:**
  - `Whiteboard.kt` stores whiteboard metadata and `content: Doc?` as JSONB.
  - `WhiteboardService.kt` handles board CRUD, user permissions (`canView`, `canEdit`, `isOwner`), quota checks, and cascades.
  - `PlanConfigurationService.kt` configures `whiteboard:version_history` as `false` for `FREE` and `true` for `PRO`, `TEAM`, and `ENTERPRISE`.
  - `RequireFeatureInterceptor.kt` enforces `@RequireFeature(value)` annotations on JAX-RS resources.
- **Frontend State & Realtime Collab:**
  - `Whiteboard.tsx` manages DGM Editor instance, Yjs binding (`YjsDgmBinding`), and WebSocket synchronization (`useWhiteboardCollab`).
  - `WhiteboardHeader.tsx` provides the top action menu and modal triggers.
  - `FeatureGate.tsx` and `LicenseModal.tsx` handle client-side entitlement enforcement and upgrade flows.

### Key Decisions
1. **Immutable Snapshot Storage & Auto-Save Retention Limit (Cap of 10):**
   - Store full DGM `Doc` snapshots in a dedicated `WhiteboardSnapshot` entity with a JSONB column rather than incremental diffs.
   - Enforce a FIFO cap of **10 auto-saves per whiteboard** on automatic checkpoints (`isAutomatic = true`) during snapshot creation to avoid unbounded growth, while permanently preserving manual milestone checkpoints.
   - Restrict auto-save creation in `WhiteboardService.saveForUser` to occurrences where `content != null` and incoming content structurally differs from the current board's content (`previousContent != content`), ensuring metadata-only saves or no-op saves do not produce unnecessary auto-save revisions.
   - Maintain a linear chronological history (`created_at DESC` / `version DESC`) without `parentSnapshotId` foreign keys, ensuring efficient snapshot cleanup and simple querying without broken predecessor chains.
2. **Normalized Creator Reference:**
   - Store only the creator's user ID (`createdBy: UUID`) directly in the database entity rather than denormalized user attributes (name/email). This ensures data normalization, avoids stale profile data when users update their profile, and aligns with privacy/relational practices.
3. **Feature Gating Approach:**
   - Use `@RequireFeature("whiteboard:version_history")` on `WhiteboardHistoryResource` and wrap frontend history controls with `<FeatureGate feature="whiteboard:version_history">`.
4. **Rollback & Realtime Sync:**
   - When a snapshot is restored, backend updates the `Whiteboard` entity content. The frontend applies the restored `Doc` to the DGM editor and syncs the changes to the Yjs shared doc, ensuring all connected WebSocket peers immediately see the restored canvas.
5. **Standalone History Resource:**
   - Separate history endpoints into `WhiteboardHistoryResource.kt` under `/api/v1/whiteboards/{id}/history` and business logic into `WhiteboardHistoryService.kt` for clean architectural modularity.

### Data Models / Contracts

#### Backend Entity: `WhiteboardSnapshot.kt`
```kotlin
@Entity
@Table(
    name = "whiteboard_snapshot",
    indexes = [
        Index(name = "idx_snapshot_whiteboard_version", columnList = "whiteboard_id, version DESC"),
        Index(name = "idx_snapshot_whiteboard_created", columnList = "whiteboard_id, created_at DESC")
    ]
)
class WhiteboardSnapshot : PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null

    @Column(name = "whiteboard_id", nullable = false)
    lateinit var whiteboardId: UUID

    @Column(nullable = false)
    var version: Int = 1

    @Column
    var name: String? = null

    @Column(length = 1000)
    var description: String? = null

    @Column(name = "is_automatic", nullable = false)
    var isAutomatic: Boolean = false

    @Column(columnDefinition = "jsonb", nullable = false)
    @JdbcTypeCode(SqlTypes.JSON)
    var content: Doc? = null

    @Column(name = "created_by", nullable = false)
    lateinit var createdBy: UUID

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant? = null
}
```

#### REST API Endpoints: `WhiteboardHistoryResource.kt`
- `GET /api/v1/whiteboards/{id}/history?start=0&max=20` -> Returns `List<WhiteboardSnapshotSummary>`
- `POST /api/v1/whiteboards/{id}/history` -> Body: `CreateSnapshotRequest(name, description)` -> Returns `WhiteboardSnapshot`
- `GET /api/v1/whiteboards/{id}/history/{snapshotId}` -> Returns `WhiteboardSnapshot`
- `POST /api/v1/whiteboards/{id}/history/{snapshotId}/restore` -> Returns updated `Whiteboard`
- `POST /api/v1/whiteboards/{id}/history/{snapshotId}/fork` -> Body: `ForkSnapshotRequest(name)` -> Returns newly created `Whiteboard`

#### Frontend Types (`src/main/webui/src/lib/api/whiteboard.ts`)
```typescript
export interface WhiteboardSnapshot {
  id: string;
  whiteboardId: string;
  version: number;
  name?: string;
  description?: string;
  isAutomatic: boolean;
  content?: any;
  createdBy: string;
  createdAt: string;
}

export interface CreateSnapshotRequest {
  name?: string;
  description?: string;
}

export interface ForkSnapshotRequest {
  name: string;
}
```

### Components
1. **`WhiteboardHistoryService.kt`**: Handles snapshot persistence, version numbering, access control verification, restore rollback updates, and forking.
2. **`WhiteboardHistoryResource.kt`**: REST controller annotated with `@Authenticated` and `@RequireFeature("whiteboard:version_history")`.
3. **`HistoryDrawer.tsx`**: Slide-over timeline drawer showing chronological history, version tags, manual snapshot creation trigger, preview mode, restore action with confirmation dialog, and fork modal.
4. **`WhiteboardHeader.tsx`**: Action menu entry "Version History" wrapped in `FeatureGate`.
5. **`Whiteboard.tsx`**: Manages history drawer visibility, preview state, and DGM/Yjs document reloading on restore.

### File Structure
```
src/
├── main/
│   ├── kotlin/de/einfloh/floxboard/whiteboard/
│   │   ├── api/
│   │   │   ├── WhiteboardHistoryResource.kt          [NEW]
│   │   │   └── dto/
│   │   │       ├── CreateSnapshotRequest.kt          [NEW]
│   │   │       └── ForkSnapshotRequest.kt            [NEW]
│   │   └── domain/
│   │       ├── WhiteboardSnapshot.kt                 [NEW]
│   │       └── WhiteboardHistoryService.kt           [NEW]
│   └── webui/src/
│       ├── components/
│       │   ├── HistoryDrawer.tsx                     [NEW]
│       │   ├── HistoryDrawer.test.tsx                [NEW]
│       │   ├── WhiteboardHeader.tsx                  [MODIFIED]
│       │   └── Whiteboard.tsx                        [MODIFIED]
│       └── lib/api/
│           └── whiteboard.ts                         [MODIFIED]
└── test/
    └── kotlin/de/einfloh/floxboard/whiteboard/
        └── WhiteboardHistoryResourceTest.kt          [NEW]
features/
├── export-and-ai-services.md                         [MODIFIED]
├── whiteboard-advanced-features.md                   [MODIFIED]
└── features.md                                       [MODIFIED]
```

### Architecture Diagram
```mermaid
graph TD
    Client["Browser / Whiteboard Canvas"] -->|HTTP REST (JWT)| HistoryRes["WhiteboardHistoryResource (/history)"]
    HistoryRes -->|@RequireFeature| GateInterceptor["RequireFeatureInterceptor"]
    GateInterceptor -->|Entitlement Check| PlanConfig["PlanConfigurationService"]
    HistoryRes --> HistorySvc["WhiteboardHistoryService"]
    HistorySvc --> SnapshotRepo["WhiteboardSnapshotRepository"]
    HistorySvc --> BoardRepo["WhiteboardRepository"]
    SnapshotRepo --> Postgres[(PostgreSQL JSONB Storage)]
    
    Client -->|WebSocket| CollabSocket["WhiteboardCollabSocket"]
    HistorySvc -->|Restore State| BoardRepo
    Client -->|Apply Restored Doc| YjsBinding["YjsDgmBinding"]
    YjsBinding -->|Broadcast Updates| CollabSocket
```

### Risks & Mitigations
- **Large Snapshot Storage Overhead & Redundant Snapshots:** Storing full JSON documents on every save could inflate database size if saves occur without modifications.
  - *Mitigation:* Require actual canvas content differences (`contentChanged`) before generating auto-saves, enforce a strict FIFO cap (max 10 auto-save snapshots per board), and only retain manual milestone checkpoints indefinitely.
- **Collaborative Sync Conflict on Restore:** Restoring a past version while multiple users are actively editing might lead to conflicting Yjs transactions.
  - *Mitigation:* Clear or atomically reset the Yjs shared root types upon restore so all connected peers receive the canonical snapshot state seamlessly.

# Testing

### Validation Approach
Verification will combine Quarkus backend integration tests and React Vitest component/integration tests to ensure complete correctness across database persistence, authorization, feature gating, and frontend user flows.

### Key Scenarios
1. **Manual Snapshot Creation & Version Sequencing:**
   - Create named snapshot on an existing whiteboard with custom name and description.
   - Verify `version` auto-increments (1, 2, 3...) and creator user ID (`createdBy`) is stored.
2. **Auto-Save Content Change Detection & Retention Limit (FIFO Cap of 10):**
   - Save whiteboard updates with identical content and verify no new auto-save snapshot is generated.
   - Generate multiple auto-save snapshots with actual content modifications exceeding 10.
   - Verify auto-saves are capped at the latest 10 automatic snapshots while manual milestone snapshots remain intact.
3. **Timeline Query & Pagination:**
   - Retrieve snapshot history with `start` and `max` parameters.
   - Verify order is descending by version/creation timestamp.
4. **Feature Gate Enforcement:**
   - Request history endpoints as a `FREE` plan user -> Expect `403 Forbidden` / `FeatureNotEntitledException`.
   - Request history endpoints as a `PRO`, `TEAM`, or `ENTERPRISE` user -> Expect `200 OK`.
5. **Point-in-Time Restore:**
   - Create snapshot A, make edits to canvas (state B), trigger restore to snapshot A.
   - Verify whiteboard content matches snapshot A and timestamp is updated.
   - Verify Yjs binding updates and reflects state A.
6. **Snapshot Forking:**
   - Fork snapshot A with a new title "Branched Board".
   - Verify new board is created with identical content, owned by the caller, and has independent history.
7. **Parent Deletion Cascade:**
   - Delete a whiteboard and verify all associated snapshots are purged from `whiteboard_snapshot`.

### Edge Cases
- Restoring or forking when snapshot ID does not exist -> Expect `404 Not Found`.
- Unauthorized user attempting to access history of a board they don't have permissions to -> Expect `403 Forbidden`.
- Restoring a board when user has only `VIEWER` permission -> Expect `403 Forbidden`.
- Creating snapshot with blank/empty content -> Gracefully capture current board state or null doc.

### Test Changes
- **Backend Tests:**
  - `src/test/kotlin/de/einfloh/floxboard/whiteboard/WhiteboardHistoryResourceTest.kt`: Tests snapshot creation, listing, retrieval, restore, fork, cascade deletion, and plan entitlement gating.
- **Frontend Tests:**
  - `src/main/webui/src/components/HistoryDrawer.test.tsx`: Tests timeline rendering, snapshot preview triggering, restore confirmation, fork modal, and feature gate display.
  - Updates in `WhiteboardHeader.test.tsx` and `Whiteboard.test.tsx` for history modal triggers.