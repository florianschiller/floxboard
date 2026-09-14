---
sessionId: session-260911-114404-xche
---

# Requirements

### Overview & Goals
Fix two critical issues affecting AI diagram generation:
1. **Ollama Container Integration**: Ensure the backend correctly communicates with the containerized Ollama instance and that required models (e.g., `llama3.2`) are automatically pulled and accessible.
2. **AI Query Transaction Timeout & Frontend Stalling**: Prevent database transaction timeouts during lengthy LLM inferences by decoupling slow external AI calls from database transaction boundaries, ensuring the frontend receives proper success or error responses rather than hanging in a loading state.

### Scope
#### In Scope
- Refactoring `AiDiagramService` to move the LLM call (`aiProvider.generateGraph`) and deterministic spatial layout out of the `@Transactional` boundary, using isolated transactional methods only for database writes (ledger entry and snapshot creation).
- Updating `src/main/resources/application.yaml` to configure appropriate Ollama HTTP client timeouts (`quarkus.langchain4j.ollama.timeout` and `chat-model.timeout`) and connection properties.
- Updating `docker-compose.yaml` to include automatic model pulling/initialization for the `ollama` service so models are ready immediately.
- Updating `local.env` with default Ollama environment variables (`OLLAMA_PORT`, `OLLAMA_MODEL`, `OLLAMA_BASE_URL`).
- Ensuring `LangChain4jAiProviderAdapter` logs informative error details on connection or model failures.
- Verifying unit and integration tests for AI diagram generation.

#### Out of Scope
- Modifying canvas rendering engines or DGM shape data structures.
- Changing diagram layout algorithms in `DiagramLayoutEngine`.

### User Stories
- **As a user**, I want diagram generation to succeed even when the local AI model takes longer than 60 seconds to synthesize a diagram, so that I receive my generated diagram without database transaction errors.
- **As a user**, if an AI generation request encounters a network or timeout error, I want to see an informative error message immediately and have the UI exit the loading state.
- **As a developer**, I want starting `docker compose up` to automatically start Ollama and pull the required model so the backend works out-of-the-box without manual `ollama pull` commands.

### Functional Requirements
- **Transaction Decoupling**: The backend must not hold an active JTA transaction or database connection while waiting for the LLM response.
- **Atomic Persistence**: Ledger recording (`UsageLedgerService`) and snapshot checkpointing (`WhiteboardSnapshotRepository`) must execute atomically within their own transactional boundary once LLM synthesis succeeds.
- **Configurable LLM Timeout**: Ollama HTTP client timeout must be configurable via `OLLAMA_TIMEOUT` (defaulting to 180s or 300s) to support slower CPU/GPU inference.
- **Ollama Model Initialization**: Docker Compose must ensure `llama3.2` (or configured `$OLLAMA_MODEL`) is pulled and ready for inferences.
- **Frontend State Clean-Up**: When an AI request fails or times out, the frontend modal and inline command bar must exit the loading spinner state and display a clear toast/error message.

# Technical Design

### Current Implementation
- `AiDiagramService.generateDiagram(...)` is annotated with `@Transactional`. When an LLM inference takes longer than Quarkus' default JTA transaction timeout (60s), Narayana Transaction Manager aborts the transaction in the background. Subsequent database operations in the method fail with `TransactionRolledBackLocalException` or `ARJUNA016063`, causing an HTTP 500 error or connection abortion while the frontend awaits a response.
- `docker-compose.yaml` runs `ollama/ollama:latest` with an empty volume, requiring manual model pulls before any inference can succeed.
- `application.yaml` sets `quarkus.langchain4j.ollama.timeout: 60s`, which can prematurely terminate slow local model generations on CPU or heavy GPU workloads.

### Key Decisions
1. **Remove `@Transactional` from `AiDiagramService.generateDiagram`**:
   - *Rationale:* External network calls (LLMs, third-party APIs) should never execute inside a database transaction. Read checks (quota verification) can run without transactions, and state mutations (ledger usage and snapshot persisting) will be scoped to a dedicated transactional helper method `persistAiGenerationUsageAndSnapshot`.
2. **Auto-Pull Model in Docker Compose**:
   - *Rationale:* Add an `ollama-init` service in `docker-compose.yaml` (or startup entrypoint) that executes `ollama pull ${OLLAMA_MODEL:-llama3.2}` once `ollama` is healthy, ensuring zero-configuration developer onboarding.
3. **Increase LangChain4j Client Timeouts**:
   - *Rationale:* Set default Ollama client timeouts to `180s` (configurable via `OLLAMA_TIMEOUT`) in `application.yaml` so complex diagram prompts on local models have sufficient time to complete without connection dropouts.

### Proposed Changes

#### 1. `src/main/kotlin/de/einfloh/floxboard/ai/domain/AiDiagramService.kt`
- Remove `@Transactional` from `fun generateDiagram(...)`.
- Keep quota pre-check and LLM generation (`aiProvider.generateGraph`) non-transactional.
- Delegate ledger recording and snapshot persistence to a `@Transactional` helper:
```kotlin
@Transactional
fun recordUsageAndSnapshot(
    ownerId: UUID,
    whiteboardId: UUID?,
    graphTitle: String?,
    prompt: String,
    category: String?,
    layoutResult: DiagramLayoutResult,
    actualCredits: Long
) {
    entitlementService.assertQuota(ownerId, "ai:monthly_credits", actualCredits)
    usageLedgerService.recordUsage(
        ownerId = ownerId,
        metricKey = "ai:monthly_credits",
        units = actualCredits,
        operation = "text_to_diagram",
        metadata = mapOf(
            "prompt" to prompt.take(200),
            "category" to (category ?: "GENERAL"),
            "shapeCount" to layoutResult.shapeCount,
            "connectorCount" to layoutResult.connectorCount
        )
    )
    if (whiteboardId != null) {
        val whiteboard = whiteboardRepository.findById(whiteboardId)
        if (whiteboard != null) {
            val snapshot = WhiteboardSnapshot().apply {
                this.whiteboardId = whiteboard.id!!
                this.name = "AI: ${graphTitle ?: prompt.take(30)}"
                this.description = "Generated from prompt: \"$prompt\""
                this.isAutomatic = true
                this.isGeneratedByAI = true
                this.content = layoutResult.doc
                this.createdBy = ownerId
            }
            snapshotRepository.persist(snapshot)
            snapshotRepository.pruneAutoSnapshots(whiteboard.id!!)
        }
    }
}
```

#### 2. `docker-compose.yaml`
- Add an `ollama-init` container or updated entrypoint that automatically pulls `${OLLAMA_MODEL:-llama3.2}` once the `ollama` service starts.

#### 3. `src/main/resources/application.yaml` & `local.env`
- Update `quarkus.langchain4j.ollama.timeout: ${OLLAMA_TIMEOUT:180s}` and `quarkus.langchain4j.ollama.chat-model.timeout: ${OLLAMA_TIMEOUT:180s}`.
- Add `OLLAMA_PORT`, `OLLAMA_MODEL`, `OLLAMA_BASE_URL`, `OLLAMA_TIMEOUT` variables to `local.env`.

#### 4. `src/main/kotlin/de/einfloh/floxboard/ai/infrastructure/LangChain4jAiProviderAdapter.kt`
- Add diagnostic logging when Ollama connection errors or model not found errors occur.

### File Structure
- `src/main/kotlin/de/einfloh/floxboard/ai/domain/AiDiagramService.kt` (Modified)
- `src/main/kotlin/de/einfloh/floxboard/ai/infrastructure/LangChain4jAiProviderAdapter.kt` (Modified)
- `src/main/resources/application.yaml` (Modified)
- `docker-compose.yaml` (Modified)
- `local.env` (Modified)
- `src/test/kotlin/de/einfloh/floxboard/ai/AiDiagramResourceTest.kt` (Modified)

### Architecture Diagram
```mermaid
graph TD
    Client["Frontend Client (AiDiagramModal / Whiteboard)"]
    Resource["AiDiagramResource"]
    Service["AiDiagramService (Non-Transactional Orchestration)"]
    LLM["AiProviderPort / LangChain4jAiProviderAdapter"]
    Ollama["Ollama Container (llama3.2)"]
    Layout["DiagramLayoutEngine (In-Memory)"]
    TxHelper["recordUsageAndSnapshot (@Transactional)"]
    DB[(PostgreSQL Database)]

    Client -->|1. POST /text-to-diagram| Resource
    Resource --> Service
    Service -->|2. Check Quota (Read-Only)| DB
    Service -->|3. Generate Semantic Graph (No DB Tx)| LLM
    LLM -->|HTTP Call| Ollama
    Ollama -->|JSON Response| LLM
    LLM -->|AiDiagramGraph| Service
    Service -->|4. Compute Spatial Layout| Layout
    Service -->|5. Commit Ledger & Snapshot| TxHelper
    TxHelper -->|6. Atomic Insert| DB
    Service -->|7. Return 200 AiDiagramResponse| Client
```

### Risks & Mitigations
- **Risk:** User runs out of quota between initial check and actual credit deduction.
  - *Mitigation:* `TxHelper` re-asserts quota before writing to the ledger, rolling back only the write transaction if the limit was exceeded concurrently.
- **Risk:** Initial model pull in Docker Compose takes significant time on slow connections.
  - *Mitigation:* Ollama init container runs asynchronously without blocking database or keycloak startup; logs show download progress.

# Testing

### Validation Approach
Verify that AI diagram generation runs reliably without database transaction timeouts, that long-running inferences complete and return valid payloads, and that error responses cleanly unblock frontend UI components.

### Key Scenarios
1. **Extended AI Generation Duration**: Simulate an LLM call lasting >60s to ensure no transaction timeout or connection abort occurs and the result is persisted and returned successfully.
2. **Ollama Integration & Fallback**: Verify that `LangChain4jAiProviderAdapter` connects to the Ollama container and parses the graph output properly.
3. **Atomic Quota and Snapshot Persistence**: Confirm that `UsageLedgerService.recordUsage` and `WhiteboardSnapshotRepository.persist` succeed in their dedicated transaction upon diagram synthesis.
4. **Error Recovery & UI Reset**: Validate that backend 4xx/5xx or timeout errors trigger frontend `catch` blocks in `AiDiagramModal` and `Whiteboard`, terminating the `isGenerating` spinner and rendering the error toast.

### Edge Cases
- **Ollama container offline / unreachable**: LangChain4j adapter returns a clear exception and HTTP 500/503 response, resetting frontend loading state.
- **Empty prompt / validation error**: Returns 400 Bad Request immediately without invoking LLM or database.
- **Whiteboard ID not found / null**: Generates diagram and records ledger usage without attempting snapshot creation.

### Test Changes
- Run and update `AiDiagramResourceTest` to ensure all tests pass with the refactored transaction boundary.
- Run `AiProviderProducerTest` to verify provider resolution.

# Delivery Steps

### ✓ Step 1: Decouple database transaction from LLM execution in AiDiagramService
Remove the `@Transactional` annotation from the main LLM orchestration flow and isolate database operations into dedicated transactional methods.

- Remove `@Transactional` from `AiDiagramService.generateDiagram(...)` so the external LLM call (`aiProvider.generateGraph`) runs outside any database transaction.
- Create a dedicated `@Transactional` helper method (e.g., `persistAiGenerationUsageAndSnapshot`) to handle atomic quota assertion, ledger recording (`usageLedgerService.recordUsage`), and snapshot checkpointing (`snapshotRepository.persist`).
- Verify that read-only quota pre-checks execute safely without holding open JTA connections.

### ✓ Step 2: Configure Ollama container provisioning and LangChain4j timeouts
Configure Ollama model provisioning in Docker Compose and adjust LangChain4j timeouts in application configuration.

- Update `docker-compose.yaml` with an initialization mechanism (or `ollama-init` service / startup entrypoint) to ensure the target model (e.g., `llama3.2`) is automatically pulled and available upon container launch.
- Update `src/main/resources/application.yaml` to increase `quarkus.langchain4j.ollama.timeout` and `chat-model.timeout` (e.g., 180s–300s) to accommodate local model inference latencies.
- Update `local.env` with default Ollama environment variables (`OLLAMA_PORT`, `OLLAMA_MODEL`, `OLLAMA_BASE_URL`).

### ✓ Step 3: Validate error handling, frontend loading resilience, and test suites
Add robust error handling, logging, and automated unit/integration tests to verify timeout handling and transaction isolation.

- Update `LangChain4jAiProviderAdapter` to provide clear logging and error propagation when the Ollama service is unreachable, missing a model, or timing out.
- Update `AiDiagramResourceTest` and `AiProviderProducerTest` to validate non-transactional AI generation flows, ledger tracking, and failure recovery.
- Verify frontend loading state reset and error display in `AiDiagramModal` and `Whiteboard` inline command bar when AI generation fails or encounters backend errors.