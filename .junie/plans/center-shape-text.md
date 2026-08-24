---
sessionId: session-260820-110433-1oct
---

# Requirements

### Overview & Goals
Ensure all text rendered inside shapes (boxes/rectangles, ellipses/ovals, triangles, rhombuses, and text elements) on the collaborative whiteboard is centered both horizontally and vertically by default and remains centered during creation, editing, resizing, and loading.

### Scope
- **In Scope**:
  - Default horizontal alignment (`horzAlign = 'center'`) and vertical alignment (`vertAlign = 'middle'`) for shapes.
  - ProseMirror/TipTap document structure normalization (`textAlign: 'center'`) on all text paragraph nodes.
  - Dynamic font sizing and boundary constraint checking to keep centered text within shape bounds.
  - Ensuring centered text configuration across shape creation, interactive canvas additions, user text input, and document loading/importing.
  - Unit tests verifying text centering logic and document transformations.
- **Out of Scope**:
  - Backend schema changes (shape contents remain generic JSON in PostgreSQL).
  - Custom non-centered alignment toolbar overrides unless explicitly requested.

### User Stories
- As a whiteboard user, I want text placed inside any shape to be centered horizontally and vertically so that diagrams and notes look neat, balanced, and readable.
- As a whiteboard user, when I type or edit text within a shape, I want each line of text to remain centered within the shape's boundaries.
- As a whiteboard user, when I load an existing board or receive remote collaborative updates, I want shape texts to consistently display in the center.

### Functional Requirements
- **Horizontal & Vertical Centering**: All shapes with text must have `horzAlign` set to `'center'` and `vertAlign` set to `'middle'`.
- **Paragraph Alignment**: When converting text to ProseMirror/TipTap JSON format, each paragraph block must specify `attrs: { textAlign: 'center' }`.
- **Shape Creation**: Newly added shapes (via toolbar buttons or canvas drawing) must default to centered text properties.
- **Editing & Resizing**: During text editing or shape transformation, text centering must be preserved while dynamic font fitting prevents overflow.
- **Loading & Sync**: Loaded and imported boards must maintain centered text properties across all shapes.

# Technical Design

### Current Implementation
- `src/main/webui/src/lib/shapeUtils.ts`: Provides `ensureCenteredTextDoc` for formatting string or ProseMirror documents with `textAlign: 'center'`, and `updateShapeTextProportions` to assign `horzAlign = 'center'` and `vertAlign = 'middle'` alongside dynamic font scaling.
- `src/main/webui/src/components/Whiteboard.tsx`: Uses `updateShapeTextProportions` in `onShapeInitialize`, `onTransaction`, `onAction`, and toolbar shape creation handlers (`handleAddShape`, `handleAddText`).
- `src/main/webui/src/lib/shape-proportions.test.ts`: Contains Vitest unit tests verifying doc structure conversions and shape alignment properties.

### Key Decisions
- **ProseMirror/TipTap Node Alignment**: Standardize text formatting at both the shape model level (`horzAlign`, `vertAlign`) and the inner rich-text document level (`attrs.textAlign = 'center'`) to ensure consistent rendering across `@dgmjs/core` canvas renderers and rich text editors.
- **Lifecycle Integration**: Enforce text centering continuously during shape creation (`onShapeInitialize`), user mutations (`onTransaction`, `onAction`), and board data deserialization.

### Proposed Changes
- **`src/main/webui/src/lib/shapeUtils.ts`**:
  - Ensure `ensureCenteredTextDoc` handles edge cases (empty strings, nested content blocks, multiline strings) by applying `textAlign: 'center'`.
  - Ensure `updateShapeTextProportions` applies `horzAlign: 'center'`, `vertAlign: 'middle'`, and centered doc attrs across all shape types.
- **`src/main/webui/src/components/Whiteboard.tsx`**:
  - Guarantee that `handleAddShape`, `handleAddText`, `onShapeInitialize`, `loadBoardData`, and `handleImportJSON` apply text centering to all shapes.
- **`src/main/webui/src/lib/shape-proportions.test.ts`**:
  - Extend test cases covering multiline text, structured docs, and alignment attribute persistence.

### File Structure
- `src/main/webui/src/lib/shapeUtils.ts` — Text centering and proportional font scaling utilities.
- `src/main/webui/src/components/Whiteboard.tsx` — DGM canvas mounting, shape creation, and event listeners.
- `src/main/webui/src/lib/shape-proportions.test.ts` — Unit tests for shape text centering.

# Testing

### Validation Approach
Run frontend test suites using Vitest (`npm test` in `src/main/webui`) and verify shape text centering logic and edge cases.

### Key Scenarios
- **String Text Centering**: Passing a plain text string to `ensureCenteredTextDoc` produces paragraph blocks with `attrs: { textAlign: 'center' }`.
- **Multiline Text Centering**: Multiline strings produce multiple paragraph blocks, each with `attrs: { textAlign: 'center' }`.
- **Shape Alignment Properties**: `updateShapeTextProportions` sets `shape.horzAlign = 'center'` and `shape.vertAlign = 'middle'`.
- **Font Reduction & Centering**: Long text inside constrained shapes reduces font size while keeping horizontal and vertical center alignment.

### Edge Cases
- Empty string or blank text nodes inside shapes.
- Existing ProseMirror docs with explicit left or right alignments converted to center alignment.
- Shapes with missing dimension properties defaulting gracefully without throwing errors.

# Delivery Steps

### ✓ Step 1: Enhance shape text centering utilities in shapeUtils
Ensure text formatting and alignment helpers in `src/main/webui/src/lib/shapeUtils.ts` consistently enforce horizontal and vertical centering for all shape types.

- Verify `ensureCenteredTextDoc` processes single-line strings, multiline strings, and ProseMirror/TipTap JSON document structures to apply `textAlign: 'center'` to all paragraph/block nodes.
- Ensure `updateShapeTextProportions` sets `horzAlign = 'center'` and `vertAlign = 'middle'` on target shapes.
- Maintain dynamic proportional font calculation and inner bounds constraints so centered text scales appropriately within shape boundaries.

### ✓ Step 2: Integrate shape text centering across Whiteboard editor lifecycle
Ensure shape text centering is applied during shape creation, inline text editing, and board data loading/deserialization in `src/main/webui/src/components/Whiteboard.tsx`.

- Ensure `editor.factory.onShapeInitialize` and shape creation handlers (`handleAddShape`, `handleAddText`) initialize shapes with centered horizontal and vertical text alignment.
- Hook into editor transaction and action listeners (`onTransaction`, `onAction`) to maintain text centering when shapes are edited, resized, or modified.
- Ensure shapes loaded from storage (`loadBoardData`), imported from JSON files (`handleImportJSON`), or synchronized via collaboration maintain centered text styling.

### ✓ Step 3: Add and verify unit tests for shape text centering
Validate shape text centering behavior with comprehensive unit tests in `src/main/webui/src/lib/shape-proportions.test.ts`.

- Test conversion of string inputs and structured doc nodes to ensure `textAlign: 'center'` is applied to all blocks.
- Test shape properties verification for `horzAlign: 'center'` and `vertAlign: 'middle'`.
- Verify multiline text handling and font size scaling to prevent text clipping while remaining centered.
- Run `npm test` using Vitest to ensure all tests pass cleanly.