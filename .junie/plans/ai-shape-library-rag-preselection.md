---
sessionId: session-260918-114837-8sr9
---

# Requirements

### Overview & Goals
Enable intelligent pre-selection of diagram shapes and stencils using hybrid metadata and semantic retrieval (RAG) before assembling the prompt for `DiagramAiService`. This ensures high diagram precision across large shape libraries while minimizing token cost and preserving low single-pass generation latency.

### Scope
- **In Scope:**
  - Indexing shape definitions, categories, and tags.
  - Hybrid retrieval (metadata category filter + semantic/keyword scoring) to select top candidate shapes.
  - Dynamic injection of candidate shapes and schemas into the LLM system/user prompt.
  - Quota and latency optimization.
- **Out of Scope:**
  - Multi-turn conversational agent tool loops during diagram generation.
  - Client-side manual shape picking modifications.

### Functional Requirements
- When generating a diagram from a text prompt, the system automatically identifies relevant shape types from the catalog.
- If a specific `stencilCategory` is specified, retrieval is scoped to matching categories before ranking.
- Prompts are enriched with only the selected shape schemas, property structures, and constraints.
- Fallback behavior ensures standard core shapes (e.g. Rectangle, Ellipse) remain available if retrieval produces low-confidence matches.

# Technical Design

### Current Implementation
- `DiagramAiService` uses a static `@SystemMessage` containing a fixed list of `shapeType` options and static JSON schemas.
- `AiDiagramService.generateDiagram()` calls `aiProvider.generateGraph(prompt, effectiveCategory, request.layoutDirection)` in a single pass.
- Upfront credit estimation in `estimateCredits()` relies on known base fees and prompt lengths.

### Proposed Architecture
```
[User Request] ──> [AiDiagramService]
                          │
                          ▼
                  [ShapeRetriever]
                   ├── 1. Category Filter (Metadata)
                   └── 2. Semantic Ranker (Top-K shapes)
                          │
                          ▼
             [Dynamic Prompt Assembly]
                          │
                          ▼
             [LangChain4jAiProviderAdapter]
                          │
                          ▼
                [LLM Single-Pass JSON]
```

### Key Decisions
1. **RAG Pre-selection over Function Calling:** Pre-filtering shapes before LLM execution maintains single-pass generation latency (<3s), avoids multi-turn network roundtrips, and keeps quota estimation deterministic.
2. **Hybrid Filtering:** Category filtering acts as an initial hard boundary, followed by vector/keyword similarity to rank relevant shapes within or across compatible categories.
3. **Core Fallback Set:** Standard fundamental shapes (Rectangle, Diamond, Ellipse, Cylinder) are always included to guarantee diagram connectivity and valid fallbacks.

### Affected Components & File Structure
- `src/main/kotlin/de/einfloh/floxboard/ai/domain/ShapeRetriever.kt`: Retrieval orchestration and ranking.
- `src/main/kotlin/de/einfloh/floxboard/ai/domain/AiDiagramService.kt`: Coordinates shape pre-selection prior to provider dispatch.
- `src/main/kotlin/de/einfloh/floxboard/ai/infrastructure/DiagramAiService.kt`: Updated dynamic prompt templates supporting injected shape catalogs.
- `src/main/kotlin/de/einfloh/floxboard/ai/infrastructure/LangChain4jAiProviderAdapter.kt`: Formats candidate shapes into the prompt context.

# Testing

### Validation Approach
- **Unit Testing:**
  - Verify `ShapeRetriever` returns correct shapes for domain-specific queries (e.g., AWS cloud terms, UML class terms, Agile sprint terms).
  - Verify prompt builder injects valid shape type definitions and property rules.
- **Integration Testing:**
  - Execute end-to-end diagram generation with Quarkus LangChain4j mock and live providers.
  - Verify generated JSON adheres strictly to the dynamically injected schema and allowed shape types.
- **Performance & Quota Verification:**
  - Confirm single-turn latency and deterministic credit consumption calculations.

# Delivery Steps

### ✓ Step 1: Implement shape catalog metadata and indexing service
Shape catalog metadata (identifiers, categories, tags, and descriptions) is structured and indexed for semantic and keyword retrieval.

- Define data models for shape descriptors and metadata in `de.einfloh.floxboard.ai.domain`.
- Implement an indexing component in the AI domain/infrastructure to index available shape types and custom stencils with their tags, categories, and property schemas.
- Add unit tests validating metadata extraction and index construction.

### ✓ Step 2: Implement category and semantic shape retrieval pipeline
The retrieval pipeline filters shapes by category and selects the top-K relevant shapes using semantic similarity or keyword matching.

- Create a `ShapeRetriever` service that receives the diagram prompt and category, performing category filtering followed by relevance scoring.
- Bound retrieval results to a configurable top-K limit (e.g., 15–20 shapes) to control prompt size and token consumption.
- Implement tests covering exact matches, synonym queries, and fallback to default category stencils when query relevance is low.

### ✓ Step 3: Integrate shape pre-selection into AI diagram generation pipeline
DiagramAiService dynamically injects only pre-selected shapes and their schemas into the LLM prompt, producing valid structured diagrams.

- Update `DiagramAiService` and `LangChain4jAiProviderAdapter` to accept dynamically filtered shape schemas and allowed `shapeType` enums.
- Adapt `AiDiagramService` to orchestrate retrieval before calling the AI provider while maintaining deterministic quota estimation.
- Add integration tests verifying end-to-end diagram generation with filtered shape sets.