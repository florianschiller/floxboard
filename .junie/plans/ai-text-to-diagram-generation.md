---
sessionId: session-260909-142906-ulzb
---

# Requirements

### Overview & Goals
The goal of this feature is to implement **AI Text-to-Diagram Generation** (`ai:text_to_diagram`) and **Quota Metering** (`ai:monthly_credits`) as specified in `/features/export-and-ai-services.md` and `features/licensing-and-entitlements.md`.

This capability allows users to describe system architectures, business processes, sequence flows, mind maps, or flowcharts in natural language and automatically generate structured, visually aligned FloxBoard diagram shapes and connectors directly on the whiteboard canvas. Quota usage is dynamically metered against the organization/user monthly credit balance (`ai:monthly_credits`) pre-configured across licensing plans (`PRO`: 1,000/mo, `TEAM`: 5,000/mo, `ENTERPRISE`: 50,000/mo, `FREE`: gated).

### Scope
- **In Scope:**
  - **Backend Generation & Layout Engine:**
    - Quarkus REST endpoints under `/api/v1/ai/text-to-diagram` and `/api/v1/ai/credits/estimate`.
    - Structured semantic diagram extraction (nodes, containers, connectors, relationships, and styling metadata) powered by an LLM prompt pipeline.
    - Server-side deterministic diagram layout engine (`DiagramLayoutEngine`) that computes bounding boxes, grid/hierarchical DAG coordinates, and connector anchors, transforming the semantic graph into DGM `Doc` elements (`Rectangle`, `Ellipse`, `Connector`, `Text`, `Frame`).
    - Dynamic quota metering and ledger event recording (`UsageLedgerService.recordUsage`) deducting credits based on prompt size and generated element complexity.
    - Feature gating with `@RequireFeature("ai:text_to_diagram")` and quota assertion via `EntitlementService`.
  - **Frontend User Experience & Workflow:**
    - `AiDiagramModal.tsx`: Comprehensive dialog with prompt input, diagram type presets (Flowchart, Cloud Architecture, Mind Map, Sequence), credit cost estimator, live preview, and placement options ("Insert at Center", "Replace Canvas", "Create New Board").
    - `AiInlineCommandBar.tsx`: Fast floating command bar on the canvas triggered via `Cmd+K` / `Ctrl+K` or toolbar button for rapid prompt-to-shape placement at current viewport/cursor.
    - `WhiteboardToolbar.tsx` & `WhiteboardHeader.tsx`: AI trigger button (Sparkles icon) with `<FeatureGate feature="ai:text_to_diagram">` integration.
    - Canvas insertion & collaborative synchronization via `YjsDgmBinding` in `Whiteboard.tsx` and snapshot flagging (`isGeneratedByAI = true`).
  - **Documentation & Testing:**
    - Update `features/export-and-ai-services.md` and `features/licensing-and-entitlements.md` to `[IMPLEMENTED]`.
    - Full backend (REST-Assured) and frontend (Vitest / React Testing Library) test suites.
- **Out of Scope:**
  - Image generation / raster AI diffusion models (only structured vector DGM diagram shapes and connectors are produced).
  - Voice-to-text audio streaming.

### User Stories
- **As an Architect or Engineer**, I want to type a prompt like *"Microservices architecture with API Gateway, Auth Service, Order Service, and PostgreSQL with Kafka event bus"* so that FloxBoard automatically creates a structured, clean architecture diagram with connected services and containers on my whiteboard.
- **As a Product Manager or Scrum Master**, I want to use diagram presets (Flowchart, User Journey, Mind Map) and generate process steps from user stories without manually dragging and connecting shapes.
- **As a Power User**, I want to press `Cmd+K` / `Ctrl+K` while viewing the canvas to open a quick inline AI prompt bar and insert diagram components directly at my current viewport.
- **As a Pro / Team / Enterprise User**, I want to see how many AI generation credits an operation will consume before running it, and track my remaining monthly quota.
- **As a Free-Tier User**, I want to see a feature gate prompt with an upgrade modal when clicking the AI generation tool, explaining the benefits of Pro/Team plans.

### Functional Requirements
1. **Natural Language Diagram Synthesis:**
   - Accepts prompt string, optional diagram category (`FLOWCHART`, `ARCHITECTURE`, `MINDMAP`, `SEQUENCE`, `GENERAL`), and target layout direction (`HORIZONTAL`, `VERTICAL`).
   - Generates semantic nodes (rectangles, rounded boxes, ellipses, text labels, containers/frames) and directed/labeled connectors.
   - Deterministic layout engine computes non-overlapping coordinate positions, margins, connector anchor points, and color schemes.
2. **Quota & Credit Consumption Metering:**
   - Computes credit cost based on prompt length and generated element complexity:
     $$\text{Credits} = \text{Base Fee (10)} + \lfloor\text{Prompt Tokens}/100\rfloor \times 2 + (\text{Shape Count} \times 2) + (\text{Connector Count} \times 1)$$
   - Pre-checks quota using `EntitlementService.checkQuota(ownerId, "ai:monthly_credits", estimatedCredits)`.
   - Records consumption in `quota_usage_event` table via `UsageLedgerService.recordUsage(ownerId, "ai:monthly_credits", actualCredits, "text_to_diagram", metadata)`.
   - Returns remaining credit balance in response payload.
3. **Dual Canvas Insertion Workflow:**
   - **Modal Flow (`AiDiagramModal`):** Offers full prompt builder, category chips, credit cost estimation preview, and multi-mode placement (Insert into active board, Replace current canvas, or Fork into a new board).
   - **Inline Flow (`AiInlineCommandBar`):** Quick floating popover accessible via `Cmd+K` / `Ctrl+K` or canvas toolbar for zero-distraction generation at active viewport center.
4. **Collaborative Synchronization & Version History:**
   - Inserted shapes are integrated into the DGM `Editor`, centered in the viewport, and synced to all collaborative WebSocket peers via `YjsDgmBinding`.
   - Generates an automated snapshot checkpoint with `isGeneratedByAI: true` to record the AI milestone in `HistoryDrawer`.
5. **Feature Gating & Entitlements:**
   - Backend endpoint guarded with `@RequireFeature("ai:text_to_diagram")` (returns 403 for `FREE` plan without explicit grant).
   - Frontend triggers wrapped in `<FeatureGate feature="ai:text_to_diagram">` directing users to `LicenseModal`.

### Non-Functional Requirements
- **Performance:** End-to-end generation and layout computation completes within < 3 seconds; layout calculation executes in < 50ms.
- **Robustness & Validation:** LLM output is strictly validated against JSON schema; invalid or unparseable responses fallback to safe error handling without corrupting canvas state.
- **Security & Privacy:** System prompts sanitize input prompts; user board content is not sent unless explicitly referenced.

# Technical Design

### Current Implementation
- **Licensing & Metering:**
  - `PlanConfigurationService.kt` configures `ai:text_to_diagram` as `false` for `FREE` and `true` for `PRO`, `TEAM`, and `ENTERPRISE`.
  - Quotas for `ai:monthly_credits` are defined as `PRO: 1000`, `TEAM: 5000`, `ENTERPRISE: 50000`, `FREE: 0`.
  - `AiUsageResolvers.kt` provides `MonthlyAiCreditsUsageResolver` querying `QuotaUsageRepository.getUsageSince` for `ai:monthly_credits`.
  - `UsageLedgerService.kt` records usage events to `QuotaUsageEvent` entity.
  - `RequireFeatureInterceptor.kt` and `RequireQuotaInterceptor.kt` enforce `@RequireFeature` and `@RequireQuota`.
- **Canvas & DGM Model:**
  - `DgmModel.kt` defines Jackson-annotated DGM shapes (`Doc`, `Page`, `Rectangle`, `Ellipse`, `Line`, `Connector`, `Text`, `Frame`, `Group`).
  - `Whiteboard.tsx` manages `@dgmjs/core` `Editor` and `YjsDgmBinding` collaborative sync.
  - `WhiteboardSnapshot.kt` supports `isGeneratedByAI: Boolean` for history timeline checkpoints.
  - `FeatureGate.tsx` conditionally gates UI triggers based on active license entitlements.

### Key Decisions
1. **Semantic Graph Extraction with Server-Side Layout Engine:**
   - *Rationale:* Decoupling semantic graph extraction (LLM determining entities, groupings, and relations) from spatial layout calculation (deterministic Java/Kotlin layout engine) ensures robust positioning, avoids overlapping shapes, calculates exact connector anchors, and guarantees strictly valid DGM `Doc` JSON output regardless of LLM idiosyncrasies.
2. **Dual Entrypoints: Modal Dialog + Inline Command Bar:**
   - *Rationale:* Casual users and exploratory diagramming benefit from rich presets, previews, and prompt templates in `AiDiagramModal`, while power users can quickly summon `AiInlineCommandBar` via `Cmd+K` / `Ctrl+K` without leaving the canvas flow.
3. **Dynamic Complexity Quota Metering:**
   - *Rationale:* Combining a standard base invocation cost with per-element complexity rewards concise diagrams while fairly pricing expansive multi-tier architecture blueprints against the organization's monthly credit limit (`ai:monthly_credits`).
4. **Immediate Collaborative Broadcast via Yjs Binding:**
   - *Rationale:* Inserting generated shapes through `editor.actions.insert()` and calling `bindingRef.current?.syncEditorToYjs()` instantly broadcasts newly created diagram elements to all active collaborators with undo/redo capability.
5. **Pluggable LLM Provider & LangChain4j Architecture:**
   - *Rationale:* Utilizing Quarkus LangChain4j (`quarkus-langchain4j`) with declarative `@AiService` contracts provides automatic JSON Schema enforcement, strong type safety, and pluggable backends (OpenAI in production, Ollama / LocalAI for local LLMs, and `MockAiProviderAdapter` for zero-key deterministic development and CI tests).
6. **Service Attribution & Version History Checkpointing:**
   - *Rationale:* Attributing AI generations to the authenticated user and tagging snapshots with `isGeneratedByAI: true` links generation events directly to the Version History subsystem (`HistoryDrawer`), allowing users to inspect, preview, rollback, or fork AI-generated whiteboard iterations seamlessly.

### Proposed Changes

#### 1. Backend Architecture (`src/main/kotlin/de/einfloh/floxboard/ai/`)
- **`AiDiagramModels.kt`**: Request/response DTOs and semantic graph models (`AiDiagramRequest`, `AiDiagramResponse`, `AiDiagramGraph`, `AiNode`, `AiEdge`, `AiCreditEstimate`).
- **`AiDiagramAiService.kt` / `AiProviderPort.kt`**: Declarative LangChain4j `@AiService` and client port interface for structured JSON schema outputs, supporting OpenAI and Ollama.
- **`MockAiProviderAdapter.kt`**: Zero-configuration offline provider that deterministically synthesizes semantic diagram structures based on prompt keywords, enabling full local development and testing without third-party API keys.
- **`DiagramLayoutEngine.kt`**: Computes 2D coordinates for nodes and containers using layered DAG layout (Sugiyama-style topological sorting), assigns bounding dimensions, routes connector paths (`headAnchor`, `tailAnchor`), and maps to DGM `Shape` objects.
- **`AiDiagramService.kt`**: Orchestrates prompt validation, quota check, LLM synthesis, layout execution, credit calculation, ledger persistence (`UsageLedgerService.recordUsage`), and snapshot recording with user/service attribution.
- **`AiDiagramResource.kt`**: REST controller exposing:
  - `POST /api/v1/ai/text-to-diagram`: Generates diagram elements from prompt.
  - `POST /api/v1/ai/credits/estimate`: Pre-calculates expected credit cost.
  - `GET /api/v1/ai/credits/balance`: Returns current month credit balance and quota limit.

#### 2. Frontend Components (`src/main/webui/src/`)
- **`lib/api/ai.ts`**: API client methods for AI diagram endpoints.
- **`components/AiDiagramModal.tsx`**: Modal dialog with category tabs (Flowchart, Cloud Architecture, Mind Map, Sequence), prompt text area, credit estimator, preview canvas, and insertion triggers.
- **`components/AiInlineCommandBar.tsx`**: Floating canvas input bar with prompt input, loading animation, and quick insert.
- **`components/WhiteboardToolbar.tsx`**: Add Sparkles icon tool button wrapped in `<FeatureGate feature="ai:text_to_diagram">`.
- **`components/WhiteboardHeader.tsx`**: Add "Generate Diagram with AI..." menu item.
- **`components/Whiteboard.tsx`**: Connect `AiDiagramModal` and `AiInlineCommandBar` to canvas editor, execute viewport centering, trigger collaborative Yjs synchronization, and create AI-tagged snapshot.

### Data Models / Contracts

#### REST API Contracts
```typescript
export interface AiDiagramRequest {
  prompt: string;
  category?: 'FLOWCHART' | 'ARCHITECTURE' | 'MINDMAP' | 'SEQUENCE' | 'GENERAL';
  layoutDirection?: 'HORIZONTAL' | 'VERTICAL';
  whiteboardId?: string;
  theme?: 'slate' | 'white' | 'warm' | 'lightSlate';
}

export interface AiDiagramResponse {
  success: boolean;
  doc: any; // DGM Doc structure with generated shapes and connectors
  shapeCount: number;
  connectorCount: number;
  creditsConsumed: number;
  remainingCredits: number;
  summary?: string;
}

export interface AiCreditEstimate {
  estimatedCredits: number;
  remainingCredits: number;
  isAllowed: boolean;
}
```

#### Backend Semantic Graph Model
```kotlin
data class AiDiagramGraph(
    val title: String?,
    val nodes: List<AiNode>,
    val edges: List<AiEdge>,
    val containers: List<AiContainer> = emptyList()
)

data class AiNode(
    val id: String,
    val label: String,
    val shapeType: String = "Rectangle", // Rectangle, Ellipse, Box
    val strokeColor: String? = null,
    val fillColor: String? = null,
    val containerId: String? = null
)

data class AiEdge(
    val id: String,
    val fromNodeId: String,
    val toNodeId: String,
    val label: String? = null,
    val lineType: String = "straight",
    val arrowHead: String = "arrow"
)

data class AiContainer(
    val id: String,
    val label: String,
    val nodeIds: List<String>
)
```

### Architecture Diagram
```mermaid
graph TD
  subgraph Frontend["FloxBoard Frontend (React + DGM.js)"]
    Toolbar[WhiteboardToolbar / Sparkles] -->|Click| Gate[FeatureGate ai:text_to_diagram]
    KeyShortcut[Cmd+K / Ctrl+K] -->|Shortcut| InlineBar[AiInlineCommandBar]
    Gate -->|Entitled| Modal[AiDiagramModal]
    Gate -->|Free Plan| LicenseModal[LicenseModal Upgrade Dialog]
    Modal -->|Submit Prompt| ApiClient[lib/api/ai.ts]
    InlineBar -->|Submit Prompt| ApiClient
  end

  subgraph Backend["FloxBoard Backend (Quarkus)"]
    ApiClient --> Resource[AiDiagramResource /api/v1/ai/text-to-diagram]
    Resource --> Interceptors[@RequireFeature & @RequireQuota]
    Interceptors --> AiService[AiDiagramService]
    AiService --> Entitlements[EntitlementService Check Balance]
    AiService --> LLM[AiProviderPort / OpenAI / LLM]
    LLM --> Graph[Semantic Graph DTO]
    Graph --> Layout[DiagramLayoutEngine]
    Layout --> DgmDoc[Positioned DGM Doc]
    AiService --> Ledger[UsageLedgerService Record ai:monthly_credits]
  end

  Layout -->|Return JSON| ApiClient
  ApiClient -->|Insert Shapes| Editor[DGM Canvas Editor]
  Editor --> Sync[YjsDgmBinding Collab Broadcast]
  Editor --> Snapshot[Auto-Snapshot isGeneratedByAI: true]
```

### File Structure
- **New Files**:
  - `src/main/kotlin/de/einfloh/floxboard/ai/api/AiDiagramResource.kt`
  - `src/main/kotlin/de/einfloh/floxboard/ai/domain/AiDiagramModels.kt`
  - `src/main/kotlin/de/einfloh/floxboard/ai/domain/AiDiagramService.kt`
  - `src/main/kotlin/de/einfloh/floxboard/ai/domain/DiagramLayoutEngine.kt`
  - `src/main/kotlin/de/einfloh/floxboard/ai/infrastructure/AiProviderPort.kt`
  - `src/main/kotlin/de/einfloh/floxboard/ai/infrastructure/MockAiProviderAdapter.kt`
  - `src/main/kotlin/de/einfloh/floxboard/ai/infrastructure/OpenAiProviderAdapter.kt`
  - `src/test/kotlin/de/einfloh/floxboard/ai/AiDiagramResourceTest.kt`
  - `src/main/webui/src/lib/api/ai.ts`
  - `src/main/webui/src/components/AiDiagramModal.tsx`
  - `src/main/webui/src/components/AiDiagramModal.test.tsx`
  - `src/main/webui/src/components/AiInlineCommandBar.tsx`
  - `src/main/webui/src/components/AiInlineCommandBar.test.tsx`
- **Modified Files**:
  - `src/main/webui/src/components/WhiteboardToolbar.tsx`
  - `src/main/webui/src/components/WhiteboardHeader.tsx`
  - `src/main/webui/src/components/Whiteboard.tsx`
  - `src/main/webui/src/lib/api/index.ts`
  - `features/export-and-ai-services.md`
  - `features/licensing-and-entitlements.md`

### Risks & Mitigations
- **LLM Output Hallucination / Formatting Errors:** Strict JSON schema validation with fallback repair parsing ensures invalid LLM output does not crash the backend.
- **Diagram Overlap & Collision:** `DiagramLayoutEngine` applies topological level ordering, margin padding (minimum 40px horizontal, 60px vertical), and container bounding recalculations.
- **Credit Race Conditions / Overdraft:** Atomic ledger transaction and quota pre-assertion prevent negative quota balances during simultaneous requests.

# Testing

### Validation Approach
Verification combines automated backend integration tests (Quarkus `@QuarkusTest` with REST-Assured), unit tests for the deterministic layout engine, and Vitest / React Testing Library frontend tests for modal interactions, keyboard triggers, credit estimation, and canvas insertion.

### Key Scenarios
1. **Prompt to Diagram Generation Flow:**
   - Verify that sending a structured text prompt (e.g. 4-node flowchart) returns a valid DGM `Doc` with 4 Box/Rectangle shapes, 3 directed Connector lines, and proper coordinate positioning.
   - Verify that shapes are placed without overlapping and contain centered text labels.
2. **Dynamic Quota Deduction & Ledger Recording:**
   - Verify that an initial balance of 1,000 monthly credits (`PRO` plan) correctly deducts calculated credits (e.g., 10 base + 4 shapes $\times$ 2 + 3 connectors $\times$ 1 = 21 credits).
   - Verify that a `QuotaUsageEvent` is persisted in the database with `metricKey = "ai:monthly_credits"` and `unitsConsumed = 21`.
   - Verify that exceeding the monthly quota returns `403 Forbidden` / `QuotaExceededException`.
3. **Feature Gating:**
   - Verify that a user on the `FREE` plan requesting `/api/v1/ai/text-to-diagram` receives a `403 Forbidden` response.
   - Verify that clicking the AI Sparkles button on the frontend for a `FREE` user triggers the `LicenseModal` upgrade dialog.
4. **Canvas Placement & Collaborative Sync:**
   - Verify that generated shapes are inserted into the DGM canvas, centered in view, and broadcast to collaborative peers via `YjsDgmBinding`.
   - Verify that the auto-generated snapshot has `isGeneratedByAI: true` and renders the AI badge in `HistoryDrawer`.
5. **Inline Command Bar & Preset Modal:**
   - Verify that pressing `Cmd+K` / `Ctrl+K` opens `AiInlineCommandBar`.
   - Verify that selecting category presets (Flowchart, Architecture, Mind Map) populates sample prompt scaffolding in `AiDiagramModal`.

### Edge Cases
- **Empty / Gibberish Prompt:** Backend returns `400 Bad Request` with helpful error message without deducting credits.
- **Complex Containerized Architecture:** Multi-tier diagrams with parent frames/containers correctly nest child shapes within container bounds.
- **Zero Credit Balance:** Request is rejected before calling the LLM provider, saving third-party API costs.

### Test Changes
- `AiDiagramResourceTest.kt`: Integration tests for endpoint security, quota enforcement, JSON payload validation, and credit ledger recording.
- `DiagramLayoutEngineTest.kt`: Unit tests verifying spatial calculations, DAG node ordering, non-overlap constraints, and connector anchor mappings.
- `AiDiagramModal.test.tsx` & `AiInlineCommandBar.test.tsx`: UI component tests for form inputs, credit estimator, error displays, and submit handlers.
- `Whiteboard.test.tsx`: Component tests verifying toolbar trigger, `Cmd+K` shortcut, and canvas shape insertion.

# Delivery Steps

### ✓ Step 1: Backend AI Diagram Service, Layout Engine & Quota Metering
Backend infrastructure for AI diagram generation, prompt-to-graph synthesis, and dynamic quota metering is implemented.

- Create `AiDiagramModels.kt` defining semantic graph data transfer objects (`AiDiagramRequest`, `AiDiagramResponse`, `AiDiagramGraph`, `AiNode`, `AiEdge`, `AiCreditEstimate`).
- Implement `AiProviderPort` and `OpenAiClientAdapter` (with configurable model settings and fallback mock generator for test environments).
- Implement `DiagramLayoutEngine` to compute spatial coordinates (DAG/hierarchical, grid, and tree layout), shape dimensions, connector routes, and convert semantic graph nodes into DGM `Doc` shape structures (`Rectangle`, `Ellipse`, `Connector`, `Frame`, `Text`).
- Implement `AiDiagramService` integrating LLM generation, layout calculation, credit calculation formula (base 10 units + prompt length bonus + element complexity), and ledger recording via `UsageLedgerService.recordUsage`.
- Create `AiDiagramResource.kt` exposing `/api/v1/ai/text-to-diagram` and `/api/v1/ai/credits/estimate`, guarded with `@Authenticated`, `@RequireFeature("ai:text_to_diagram")`, and quota pre-checks.
- Add comprehensive backend tests in `AiDiagramResourceTest.kt` verifying prompt generation, DGM doc structure, feature gating, and quota ledger deduction.

### ✓ Step 2: Frontend AI Modal, Presets & Inline Command Bar Components
Frontend API client, comprehensive AI generator modal with presets, and quick inline canvas command bar are implemented.

- Create `src/main/webui/src/lib/api/ai.ts` with typed methods `generateDiagramFromPrompt`, `estimateAiCredits`, and `fetchAiQuotaBalance`.
- Create `AiDiagramModal.tsx` featuring prompt textarea, diagram category presets (Flowchart, Architecture, Mind Map, Sequence), credit consumption estimator, mini preview canvas, and insertion mode selectors ("Insert at Viewport Center", "Replace Canvas", "Create New Board").
- Create `AiInlineCommandBar.tsx` providing a lightweight floating canvas prompt input triggered via keyboard shortcut (`Cmd+K` / `Ctrl+K`) or toolbar button.
- Add `<FeatureGate feature="ai:text_to_diagram">` wrapper around modal triggers to open `LicenseModal` for non-entitled `FREE` users.
- Add unit tests in `AiDiagramModal.test.tsx` and `AiInlineCommandBar.test.tsx` for preset selection, credit calculation displays, validation, and submission states.

### ✓ Step 3: Whiteboard Canvas Integration, Collaborative Sync & Documentation
Canvas integration, collaborative sync, snapshot flagging, and feature documentation are completed.

- In `WhiteboardToolbar.tsx`, add an AI Sparkles action button with feature gating and tooltips.
- In `WhiteboardHeader.tsx`, add "Generate with AI" action in the board menu.
- In `Whiteboard.tsx`, wire `AiDiagramModal` and `AiInlineCommandBar` handlers to insert generated shapes into `@dgmjs/core` `Editor`, update text proportions, select inserted shapes, synchronize changes across peers via `YjsDgmBinding`, and trigger snapshot creation with `isGeneratedByAI: true`.
- Register keyboard shortcut (`Cmd+K` / `Ctrl+K`) in `Whiteboard.tsx` to toggle the inline AI command bar.
- Update `features/export-and-ai-services.md` and `features/licensing-and-entitlements.md` to mark `AI Text-to-Diagram Generation` as `[IMPLEMENTED]`.
- Add end-to-end component tests in `Whiteboard.test.tsx` verifying AI diagram generation, canvas placement, and collaborative broadcast.