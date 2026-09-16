---
sessionId: session-260916-113600-zcyz
---

# Requirements

### Overview & Goals
When opening a whiteboard containing image shapes, the application crashes during board loading with `TypeError: Cannot read properties of undefined (reading 'save')` at `DgmImage.renderDefault (shapeUtils.ts:597:13)`. The goal of this task is to fix `DgmImage.prototype.renderDefault` in `src/main/webui/src/lib/shapeUtils.ts` to properly support `@dgmjs/core`'s `MemoizationCanvas` and direct `Canvas` instances, allowing whiteboards with images to load and render seamlessly.

### Scope
- **In Scope:**
  - Fix `DgmImage.prototype.renderDefault` in `src/main/webui/src/lib/shapeUtils.ts` to interact with `@dgmjs/core` canvas abstractions (`MemoizationCanvas` and `Canvas`) without assuming `canvas.context` is always defined.
  - Guard context operations across all patched prototypes (`Frame`, `Shape`) in `shapeUtils.ts` against undefined `canvas.context`.
  - Add unit and regression tests in `src/main/webui/src/lib/shapeUtils.test.ts` covering `MemoizationCanvas` rendering, shape updates, and document loading with image shapes.
- **Out of Scope:**
  - Modifying backend whiteboard endpoints or data models.
  - Changing image upload or export pipelines in `exportUtils.ts`.

### User Stories
- **As a floxBoard user**, I want to open and collaborate on whiteboards containing uploaded images so that I can view diagram screenshots and visual assets without the board failing to load.

### Functional Requirements
- When a whiteboard document containing one or more `Image` shapes is loaded via `editor.loadFromJSON()`, the shapes must initialize and update without throwing unhandled exceptions.
- Image shapes must render their bitmap data, corner radius clipping, opacity, and custom border stroke correctly on canvas.
- Fallback rendering paths must not crash if `canvas.context` is not directly exposed.

# Technical Design

### Current Implementation
In `src/main/webui/src/lib/shapeUtils.ts` (lines 582–635), `setupScriptedShapeRendering()` monkey-patches `DgmImage.prototype.renderDefault`:
```typescript
if (DgmImage && DgmImage.prototype) {
  DgmImage.prototype.renderDefault = function (canvas: any) {
    if (!this._imageDOM && this.imageData) {
      this._imageDOM = new (globalThis as any).Image();
      this._imageDOM.src = this.imageData;
    }
    const corners = typeof this.computeCorners === 'function' ? this.computeCorners() : (this.corners || [0, 0, 0, 0]);
    const hasCorners = Array.isArray(corners) ? corners.some((r: number) => r > 0) : corners > 0;
    const ctx = canvas.context;
    ...
    ctx.save(); // -> Crashes with TypeError: Cannot read properties of undefined (reading 'save')
```
During `@dgmjs/core`'s shape update cycle (`Shape.prototype.update`), `@dgmjs/core` passes `this._memoCanvas` (`MemoizationCanvas`) to `render()` and `renderDefault()`. `MemoizationCanvas` records drawing commands via its own methods (`canvas.drawImage`, `canvas.strokeRoundRect`, `canvas.setAlpha`, etc.) and does **not** have a `.context` property.

### Key Decisions
- **Standard `@dgmjs/core` Canvas API Delegation:** Use `canvas.drawImage(this._imageDOM, this.left, this.top, this.width, this.height, corners)` as the primary rendering method. Both `MemoizationCanvas` and `Canvas` in `@dgmjs/core` implement `drawImage` with corner radius support natively.
- **Defensive Context Access:** If custom 2D canvas context manipulation is executed, wrap all `canvas.context` accesses with existence checks (`if (ctx) { ctx.save(); ... }`).
- **Unified Alpha & Stroke Support:** Use `canvas.setAlpha?.(opacity)` or assign opacity before drawing, and invoke `canvas.strokeRoundRect?.(...)` for border strokes when configured.

### Proposed Changes
1. **`src/main/webui/src/lib/shapeUtils.ts`**:
   - Update `DgmImage.prototype.renderDefault`:
     - Ensure `this._imageDOM` is instantiated from `this.imageData`.
     - Retrieve `corners` using `this.computeCorners?.() || this.corners || [0, 0, 0, 0]`.
     - Retrieve `opacity` using `this.computeOpacity?.() || this.opacity || 1`.
     - Set canvas alpha via `canvas.setAlpha?.(opacity)`.
     - If `typeof canvas.drawImage === 'function'`, call `canvas.drawImage(this._imageDOM, this.left, this.top, this.width, this.height, corners)`.
     - If `canvas.context` is present and direct 2D drawing is needed as fallback, safely wrap with `if (ctx) { ctx.save(); ... ctx.restore(); }`.
     - Render stroke border via `canvas.strokeRoundRect?.(this.left, this.top, this.right, this.bottom, corners, seed)` when `this.strokeWidth > 0` and `strokeColor` is valid.
   - Add null checks to `Frame.prototype.renderDefault` text rendering block to ensure `canvas.context` is guarded.

### Components
- `shapeUtils.ts`: Custom rendering hooks and shape prototype patch management.
- `Whiteboard.tsx`: Whiteboard editor loader component calling `editor.loadFromJSON(board.content)`.

### File Structure
- `src/main/webui/src/lib/shapeUtils.ts` (Modified: fix `DgmImage.prototype.renderDefault` and canvas context handling)
- `src/main/webui/src/lib/shapeUtils.test.ts` (Modified: add test cases for `MemoizationCanvas` rendering and whiteboard loading)

# Testing

### Validation Approach
- Verify with unit tests in Vitest that `DgmImage.prototype.renderDefault` executes without error on both `MemoizationCanvas` (the recording canvas used during `update()`) and standard `Canvas` objects with `.context`.
- Verify full test suite execution (`npm test` in `src/main/webui`) passes with no regressions.

### Key Scenarios
- **MemoizationCanvas Render:** Invoke `img.renderDefault(memoCanvas)` where `memoCanvas` has `drawImage`, `setAlpha`, and `strokeRoundRect` methods but `context` is `undefined`. Verify methods are called with expected parameters and no exception is thrown.
- **Direct Canvas Context Render:** Invoke `img.renderDefault(mockCanvas)` where `mockCanvas.context` is a 2D rendering context mock. Verify `save()`, `drawImage()`, and `restore()` calls execute correctly.
- **Full Document Load Cycle:** Load a whiteboard document containing an image shape via `new Image()` and `shape.update(canvas)`. Verify `Shape.prototype.update` completes successfully.

### Edge Cases
- Image shape without `imageData` or uninitialized `_imageDOM`.
- `corners` specified as a number, array of 4 numbers, or missing.
- `opacity` specified or computed as 0, fractional, or undefined.
- Missing `canvas.drawImage` fallback.
- Transparent or `none` stroke colors with nonzero `strokeWidth`.

# Delivery Steps

### ✓ Step 1: Fix DgmImage.prototype.renderDefault and Canvas context handling in shapeUtils.ts
`DgmImage.prototype.renderDefault` in `shapeUtils.ts` safely renders on both `MemoizationCanvas` and direct Canvas rendering contexts without throwing TypeError.

- Refactor `DgmImage.prototype.renderDefault` in `src/main/webui/src/lib/shapeUtils.ts` to invoke `canvas.drawImage(this._imageDOM, this.left, this.top, this.width, this.height, corners)` when available.
- Add null-safe guards (`ctx?.save()`, `ctx?.restore()`) for direct canvas context drawing fallbacks when `canvas.context` is present.
- Support opacity via `canvas.setAlpha?.(opacity)` and border stroke via `canvas.strokeRoundRect?.(...)`.
- Add defensive guards to `Frame.prototype.renderDefault` and other prototype hooks to prevent undefined context access.

### ✓ Step 2: Add unit and regression tests for Image rendering and whiteboard loading
Comprehensive unit tests verify image rendering across both MemoizationCanvas lifecycle and direct mock canvas contexts.

- Add unit test in `src/main/webui/src/lib/shapeUtils.test.ts` verifying that `img.renderDefault(memoCanvas)` and `img.update(canvas)` succeed when `canvas` is a `MemoizationCanvas` without `.context`.
- Update existing `shapeUtils.test.ts` image rendering tests to validate corner radius clipping, opacity, and stroke borders across both canvas types.
- Add regression test simulating whiteboard JSON document loading containing an Image shape with `editor.loadFromJSON` to ensure no uncaught runtime exceptions occur during initial board load.