# Requirements

### Overview & Goals
The collaborative whiteboard uses `@dgmjs/core` for rendering shapes and canvas elements. By default, newly created shapes and text containers inherit the library's default `fontFamily: 'Inter'`. Because `Inter` is not loaded by the application frontend, browsers fall back to the default serif font (Times New Roman), causing visual inconsistency with the rest of the application which uses `Roboto`. The objective is to enforce the `Roboto` font family across all shapes and text elements on the whiteboard.

### Scope
- **In Scope**:
  - Enforce `fontFamily = 'Roboto'` across all whiteboard shape creation, initialization, and text scaling operations.
  - Ensure `ensureAllShapesCentered` and text styling handlers consistently maintain the `Roboto` font family across shape hierarchies (including groups and child shapes).
  - Add unit tests verifying `fontFamily` persistence on shapes.
  - Update `bugs.md` marking bug 5 as resolved.
- **Out of Scope**:
  - Custom font family picker UI dropdown.
  - Backend database schema changes (DGM shape models already support `fontFamily`).

### User Stories
- **As a whiteboard user**, I want text in all shapes (boxes, circles, triangles, sticky notes, and text elements) to render in Roboto so that the whiteboard matches the modern look and feel of the rest of the application.
- **As a collaborator**, I want imported, loaded, and remote synced shapes to consistently render with the Roboto font family without falling back to Times New Roman.

### Functional Requirements
- **FR-1: Default Shape Font Family**: When any shape or text element is initialized or formatted, its `fontFamily` property must be set to `'Roboto'`.
- **FR-2: Preservation across Resizing, Scaling, and Lifecycle Updates**: `updateShapeTextProportions` and editor lifecycle hooks must ensure `fontFamily` remains `'Roboto'`.
- **FR-3: Style Reset & Hierarchy Traversal**: Resetting text styling or running `ensureAllShapesCentered` on loaded documents must apply `Roboto` font family across all shapes and nested children.

# Technical Design

### Current Implementation & Root Cause Analysis
1. `@dgmjs/core` shapes (`Rectangle`, `Ellipse`, `Text`, `Box`, etc.) initialize with `fontFamily: 'Inter'`.
2. In `src/main/webui/index.html`, Google Fonts imports `Roboto` (`family=Roboto:wght@300;400;500;700`), but does not load `Inter`.
3. When HTML5 Canvas renders text (`ctx.font = '... "Inter"'`), the browser fails to resolve `Inter` and falls back to system serif (`Times New Roman`).
4. `updateShapeTextProportions` in `src/main/webui/src/lib/shapeUtils.ts` standardizes shape text centering and font scaling, but did not explicitly set `shape.fontFamily = 'Roboto'`.

### Key Decisions
- Set `shape.fontFamily = 'Roboto'` inside `updateShapeTextProportions` in `src/main/webui/src/lib/shapeUtils.ts`.
- Ensure `applyTextStyling(..., 'clear')` resets `fontFamily` to `'Roboto'`.
- Ensure `ensureAllShapesCentered` traverses nested children recursively to ensure all shapes in composite groups or imported pages have `Roboto` applied.

### Proposed Changes
- **`src/main/webui/src/lib/shapeUtils.ts`**:
  - In `updateShapeTextProportions`: assign `shape.fontFamily = 'Roboto'`.
  - In `applyTextStyling`: ensure `'clear'` style sets `shape.fontFamily = 'Roboto'`.
  - In `ensureAllShapesCentered`: traverse shape children recursively and invoke `updateShapeTextProportions`.
- **`src/main/webui/src/lib/shape-proportions.test.ts`**:
  - Add assertions verifying `shape.fontFamily` is `'Roboto'`.
- **`bugs.md`**:
  - Mark issue 5 as fixed with ✅.

# Testing

### Validation Approach
- Execute frontend unit test suite via Vitest (`npm test` in `src/main/webui`).
- Verify backend DGM model compatibility via Gradle tests (`./gradlew test --tests DgmModelTest`).

### Key Scenarios
1. Shape initialization assigns `fontFamily: 'Roboto'`.
2. Scaling and proportional updates retain `fontFamily: 'Roboto'`.
3. Document-wide centering and deserialization sets `fontFamily: 'Roboto'` on top-level and nested shapes.

# Delivery Steps

### ✓ Step 1: Update shape utilities to enforce Roboto font family
Ensure `src/main/webui/src/lib/shapeUtils.ts` sets `shape.fontFamily = 'Roboto'` during shape text proportion updates, styling resets, and page-wide traversal.

### ✓ Step 2: Add unit tests verifying Roboto font family assignment
Extend `src/main/webui/src/lib/shape-proportions.test.ts` to assert `fontFamily === 'Roboto'` across single shapes, resized shapes, and composite shape trees.

### ✓ Step 3: Mark bug 5 as resolved in bugs.md and run full test suites
Update `bugs.md` with ✅ on bug 5 and run all test suites to ensure zero regressions.
