---
sessionId: session-260914-134902-1kk5
---

# Requirements

### Overview & Goals
The goal of this task is to resolve shape rendering, styling, and dimension synchronization defects in the **Shape Customizer (`ShapeScriptDrawer`)** and whiteboard canvas by leveraging native **DGM.js (`@dgmjs/core`)** capabilities:

1. **Arrow Line Stroke Synchronization:** Ensure line stroke modifications (color, width, solid/dashed/dotted patterns) on connectors and arrows are accurately reflected and rendered on the whiteboard canvas.
2. **Frame Styling & Accurate Preview:** Ensure frame container background fill (`fillColor`/`fillStyle`), corner radius (`corners`), and border styles (`strokePattern`) are applied on the board, and update the Live Sandbox preview to accurately reflect the real whiteboard frame appearance (title label above container, rounded corners, background fill).
3. **Image Border, Corner Radius & Opacity:** Ensure image styling (border color/width/pattern, corner radius clipping, and opacity) is applied and rendered directly on the whiteboard canvas.
4. **UML Arrow Endpoints:** Add UML-style arrow endpoints (`triangle` for UML Generalization/Inheritance, `triangle-filled`, `diamond` for UML Aggregation, `diamond-filled` for UML Composition, `circle` for Interface) using DGM.js native `LineEndType`.
5. **Real-Time Dimension Synchronization on Resize:** When resizing a frame, arrow, basic shape, or image directly on the canvas, ensure the updated width and height are immediately reflected in the Shape Customizer.

---

### Scope
- **In Scope:**
  - **Connector & Arrow Stroke Rendering:** Apply `shape.strokePattern` (`[]` for solid, `[8, 6]` for dashed, `[2, 4]` for dotted), `shape.strokeColor`, and `shape.strokeWidth` to DGM `Connector` shapes on the whiteboard canvas.
  - **Frame Container Background, Border Style & Corner Radius:** Enhance `Frame` rendering in `shapeUtils.ts` so `canvas.fillRoundRect` renders container background fills when `fillColor` is specified, `shape.corners` applies rounded corners, and `shape.strokePattern` applies dashed/dotted borders on the board.
  - **Frame Live Sandbox Preview Overhaul:** Update the preview canvas in `ShapeScriptDrawer.tsx` to render authentic frame graphics (title above container top edge, rounded borders, filled background) matching the canvas.
  - **Image Border, Corner Radius & Opacity Rendering:** Enhance `Image` rendering in `shapeUtils.ts` so `this.computeOpacity()` applies alpha, `this.computeCorners()` clips rounded corners, and `canvas.strokeRoundRect` draws the border outline on the canvas.
  - **UML Arrow Endpoints:** Expose UML arrow endpoints in `ShapeScriptDrawer.tsx` (`triangle`, `triangle-filled`, `diamond`, `diamond-filled`, `circle`) backed by DGM.js `LineEndType`.
  - **Live Canvas Resize Synchronization:** Wire `editor.transform.onTransaction` and `editor.transform.onAction` in `Whiteboard.tsx` and dynamic dimension observers in `ShapeScriptDrawer.tsx` to keep width and height inputs continuously synchronized when shapes are resized on canvas.
  - **Automated Tests:** Comprehensive unit and integration test coverage across `shapeUtils.test.ts`, `ShapeScriptDrawer.test.tsx`, and `Whiteboard.test.tsx`.
- **Out of Scope:**
  - Modifying external upstream `@dgmjs/core` package files (we leverage DGM's extensible prototype hooks in `shapeUtils.ts`).

---

### User Stories
- **As a System Architect / UML Designer**, I want to choose UML-standard arrow endpoints (Inheritance/Generalization triangles, Aggregation/Composition diamonds) and dash patterns for connectors so that my diagrams adhere to standard UML specifications.
- **As a Diagram Author**, I want my frame styling (background fill, border dash, corner radius) and image styling (borders, rounded corners, opacity) to render consistently on the whiteboard canvas and match the preview drawer.
- **As a Whiteboard User**, I want shape width and height inputs in the customizer to update in real time when I resize shapes using canvas handles so that dimension values are always accurate.

---

### Functional Requirements
1. **Arrow Line Stroke on Board:**
   - Setting stroke color, stroke width, or line style (solid, dashed, dotted) on a connector or arrow immediately updates `shape.strokeColor`, `shape.strokeWidth`, and `shape.strokePattern` in DGM.js, repainting the canvas.
2. **Frame Styling & Preview:**
   - Setting background fill on a frame sets `shape.fillColor` and `shape.fillStyle = 'solid'`, rendering a filled container box on the board.
   - Setting corner radius updates `shape.corners = [r, r, r, r]`, rendering rounded container corners on the board.
   - Setting border style (solid, dashed) updates `shape.strokePattern`, rendering dashed borders on the board.
   - The Live Sandbox preview in `ShapeScriptDrawer` displays the frame title above the container and renders matching background, border, and corners.
3. **Image Border, Corner Radius & Opacity:**
   - Setting corner radius on an image clips the rendered image using `shape.computeCorners()`.
   - Setting border color and width renders an outline using `canvas.strokeRoundRect`.
   - Setting opacity adjusts image transparency via `shape.computeOpacity()`.
4. **UML Arrow Endpoints:**
   - Head and tail endpoint selectors in `ShapeScriptDrawer` provide options for UML Generalization (`triangle`), UML Aggregation (`diamond`), UML Composition (`diamond-filled`), UML Interface (`circle`), along with standard arrows (`arrow`, `solid-arrow`, `flat`).
5. **Live Dimension Synchronization:**
   - Resizing any shape, frame, image, or arrow on the canvas triggers transaction updates that instantly refresh the width and height values in `ShapeScriptDrawer`.

---

### Non-Functional Requirements
- **Performance:** Frame and image canvas rendering executes in sub-millisecond time without impacting 60fps pan/zoom interactions.
- **DGM.js Compliance:** All styling uses native DGM shape properties (`strokePattern`, `corners`, `fillColor`, `fillStyle`, `opacity`, `LineEndType`) ensuring clean serialization and collaborative sync.
- **Out of Scope:**
  - Backend database schema or REST endpoint modifications.
  - Modifying external `@dgmjs/core` library files directly.

---

# Technical Design

### Current Implementation
- `src/main/webui/src/lib/shapeUtils.ts`:
  - Contains `setupScriptedShapeRendering()` which monkey-patches `Shape.prototype.draw`, `Shape.prototype.toJSON`, `fromJSON`, `assign`, and `clone`.
  - Currently, `Shape.prototype.draw` calls `originalDraw.call(this, canvas, showDOM)` when no custom script is defined.
  - In DGM core (`@dgmjs/core`):
    - `Frame.prototype.renderDefault` only strokes the rounded rectangle and renders title text; it does not fill the container background.
    - `Image.prototype.renderDefault` draws the image directly via `canvas.drawImage` without clipping corner radii or drawing stroke borders.
    - `Connector.prototype.renderDefault` renders line ends via `renderLineEnd` and strokes path with `this.strokePattern`, but `Whiteboard.tsx` was only setting a custom `shape.lineStyle` string rather than `shape.strokePattern = [8, 6]` or `[2, 4]`.
- `src/main/webui/src/components/ShapeScriptDrawer.tsx`:
  - Attributes tab currently provides head and tail endpoint dropdowns restricted to `flat`, `arrow`, `solid-arrow`.
  - Live preview for Frame draws a mock browser bar rather than authentic DGM canvas frame styling.
  - State initialization only ran once on shape selection and did not dynamically update when shape dimensions were mutated via canvas resizing.
- `src/main/webui/src/components/Whiteboard.tsx`:
  - `handleSaveShapeCustomization` persists custom attributes, but needs to map connector dash styles to `shape.strokePattern`, frame backgrounds to `shape.fillStyle = 'solid'`, image borders and corner radii to `shape.corners`, and dispatch `editor.repaint()`.
  - Listeners on `editor.transform.onTransaction` and `editor.transform.onAction` did not notify `ShapeScriptDrawer` when shapes were resized on canvas.

---

### Key Decisions
1. **Leverage DGM Native Properties & Prototype Extensions (`shapeUtils.ts`):**
   - *Decision:* Enhance `Frame.prototype.renderDefault` and `Image.prototype.renderDefault` in `setupScriptedShapeRendering()` in `shapeUtils.ts`.
   - *Rationale:* Keeps standard DGM shapes lightweight, ensures 100% compatibility with DGM canvas coordinate transformations, clipping, and zoom levels, and works seamlessly with Yjs CRDT serialization.
2. **Native UML Line End Types (`LineEndType`):**
   - *Decision:* Utilize DGM's built-in `LineEndType.TRIANGLE` (`triangle`), `LineEndType.TRIANGLE_FILLED` (`triangle-filled`), `LineEndType.DIAMOND` (`diamond`), `LineEndType.DIAMOND_FILLED` (`diamond-filled`), `LineEndType.CIRCLE` (`circle`), `LineEndType.ARROW` (`arrow`), and `LineEndType.SOLID_ARROW` (`solid-arrow`).
   - *Rationale:* DGM already implements geometry rendering for these UML endpoints in `Connector.prototype.renderLineEnd`. Exposing them in the UI enables full UML diagramming without custom rendering overhead.
3. **Accurate Frame Live Sandbox Preview:**
   - *Decision:* Update `ShapeScriptDrawer.tsx` preview canvas to render frames with their title label positioned above the container top-left boundary, and container box with matching fill, border stroke, dash pattern, and corner radius.
   - *Rationale:* Eliminates discrepancy between preview and canvas, ensuring "what you see is what you get".
4. **Reactive Live Dimension Sync on Canvas Resize:**
   - *Decision:* Subscribe to `editor.transform.onTransaction` and `editor.transform.onAction` in `Whiteboard.tsx` to update the active drawer shape reference, and update `ShapeScriptDrawer`'s dimension state whenever the underlying shape's dimensions (`shape.width`, `shape.height`, `shape.rect`, `shape.path`) change.
   - *Rationale:* Users can resize shapes on canvas and immediately see updated dimension values in the open customizer drawer.

---

### Proposed Changes

#### 1. Rendering Pipeline Enhancements (`src/main/webui/src/lib/shapeUtils.ts`)
- **Frame Background & Styling Hook:**
  - Enhance `Frame.prototype.renderDefault` so if `this.fillStyle !== 'none' && this.fillColor && this.fillColor !== 'transparent' && this.fillColor !== '$transparent'`, it executes `canvas.fillRoundRect(this.left, this.top, this.right, this.bottom, this.computeCorners(), this.getSeed())` prior to `canvas.strokeRoundRect`.
- **Image Border, Corner Radius & Opacity Hook:**
  - Enhance `Image.prototype.renderDefault` so:
    - Alpha is set via `this.computeOpacity()`.
    - Canvas context is clipped using `this.computeCorners()`.
    - Image is drawn.
    - If `this.strokeWidth > 0 && this.strokeColor && this.strokeColor !== 'transparent'`, `canvas.strokeRoundRect(this.left, this.top, this.right, this.bottom, this.computeCorners(), this.getSeed())` draws the border using `this.strokePattern`.
- **Connector Stroke Pattern Support:**
  - Ensure `shape.strokePattern` is preserved during cloning, serialization, and restoration.

#### 2. Shape Customizer Updates (`src/main/webui/src/components/ShapeScriptDrawer.tsx`)
- **UML Arrow Endpoints:**
  - Expand `headEndType` and `tailEndType` to support:
    - Standard: `flat` (None), `arrow` (Open Arrow), `solid-arrow` (Solid Arrow)
    - UML: `triangle` (UML Generalization / Inheritance), `triangle-filled` (UML Realization), `diamond` (UML Aggregation), `diamond-filled` (UML Composition), `circle` (UML Interface)
- **Authentic Frame Preview:**
  - Overhaul frame preview rendering in the mini canvas to match DGM's native frame layout: title label above the container, followed by the container box with `fillRoundRect` and `strokeRoundRect`.
- **Live Dimension Synchronization:**
  - Track dynamic dimensions (`shape.width`, `shape.height`, `shape.rect`, `shape.path`) in `useEffect` so changes made on the whiteboard canvas immediately reflect in the width and height inputs.

#### 3. Whiteboard Integration (`src/main/webui/src/components/Whiteboard.tsx`)
- **Apply Attributes:**
  - Update `handleSaveShapeCustomization` to:
    - Set `shape.strokePattern = [8, 6]` for dashed, `[2, 4]` for dotted, `[]` for solid on Connectors and Shapes.
    - Set `shape.fillColor = attrs.fillColor` and `shape.fillStyle = attrs.fillColor ? 'solid' : 'none'` on Frames.
    - Set `shape.corners = [r, r, r, r]` on Frames and Images.
    - Set `shape.opacity = attrs.opacity`, `shape.strokeColor = attrs.strokeColor`, `shape.strokeWidth = attrs.strokeWidth` on Images.
    - Set `shape.headEndType` and `shape.tailEndType` to selected UML or standard end types.
    - Invoke `shape.update()` and `editor.repaint()`.
- **Canvas Resize Listener:**
  - On `editor.transform.onTransaction` and `editor.transform.onAction`, if `isScriptDrawerOpen` and `scriptDrawerShape` is modified, refresh state so drawer inputs update in real-time.

---

### Architecture Diagram
```mermaid
graph TD
    subgraph Whiteboard Canvas
        Transform[Resize / Transform Transaction] -->|onTransaction / onAction| Whiteboard[Whiteboard Component]
        Whiteboard -->|Sync Live Dimensions| Drawer[ShapeScriptDrawer]
    end

    subgraph ShapeScriptDrawer Component
        Drawer -->|Select UML Endpoints| Endpoints[UML Arrowheads (triangle, diamond, etc.)]
        Drawer -->|Tweak Frame & Image Styles| StyleControls[Background, Corners, Stroke Pattern, Opacity]
        StyleControls --> LivePreview[Live Sandbox Preview (Accurate Frame/Image Rendering)]
        Drawer -->|Apply Changes| CommitHandler[handleSaveShapeCustomization]
    end

    subgraph DGM Core & ShapeUtils
        CommitHandler -->|shape.strokePattern / shape.corners| DGMShape[DGM Shape Instance]
        CommitHandler -->|shape.fillStyle = solid| DGMFrame[DGM Frame Instance]
        CommitHandler -->|shape.headEndType = triangle/diamond| DGMConn[DGM Connector Instance]
        CommitHandler -->|shape.opacity / shape.corners| DGMImage[DGM Image Instance]
        DGMShape -->|Enhanced renderDefault Hooks| Canvas2D[Canvas2D Render Engine]
        CommitHandler -->|Sync Changes| Yjs[Yjs CRDT Engine]
    end
```

---

### Data Models & Contracts
```typescript
export type LineEndTypeValue =
  | 'flat'
  | 'arrow'
  | 'solid-arrow'
  | 'triangle'
  | 'triangle-filled'
  | 'diamond'
  | 'diamond-filled'
  | 'circle';

export interface ShapeCustomizationAttributes {
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  fontFamily?: string;
  fontSize?: number;
  fontColor?: string;
  opacity?: number;
  width?: number;
  height?: number;
  headEndType?: LineEndTypeValue;
  tailEndType?: LineEndTypeValue;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  text?: string;
  title?: string;
  cornerRadius?: number;
  borderStyle?: 'solid' | 'dashed';
  aspectRatioLocked?: boolean;
  fitMode?: 'contain' | 'cover' | 'fill';
  altText?: string;
  caption?: string;
}
```

---

### File Structure & Changes
- `src/main/webui/src/lib/shapeUtils.ts`:
  - Hook `Frame.prototype.renderDefault` to support container background fill with `fillRoundRect`.
  - Hook `Image.prototype.renderDefault` to support opacity, rounded corner clipping via `computeCorners()`, and border stroke.
  - Update `generateDefaultShapeScript` to support UML connector snippets.
- `src/main/webui/src/lib/shapeUtils.test.ts`:
  - Unit tests for Frame fill rendering, Image corner radius/border/opacity rendering, and Connector strokePattern.
- `src/main/webui/src/components/ShapeScriptDrawer.tsx`:
  - Add UML arrow endpoint options (`triangle`, `triangle-filled`, `diamond`, `diamond-filled`, `circle`).
  - Overhaul Frame Live Sandbox preview to accurately reflect DGM canvas rendering.
  - Add live dimension synchronization on canvas resize.
- `src/main/webui/src/components/ShapeScriptDrawer.test.tsx`:
  - Unit tests for UML endpoint options, Frame preview rendering, and dimension update handling.
- `src/main/webui/src/components/Whiteboard.tsx`:
  - Update `handleSaveShapeCustomization` for strokePattern, frame background fill, image border/corner/opacity, and UML arrow endpoints.
  - Wire `onTransaction` / `onAction` to refresh `scriptDrawerShape` dimensions in real-time.
- `src/main/webui/src/components/Whiteboard.test.tsx`:
  - Integration tests for arrow stroke changes, frame styling, image styling, UML arrowheads, and resize dimension reflection.

---

### Risks & Mitigations
- **Risk:** Custom prototype hooks might interfere with standard DGM shapes if not properly guarded.
  - **Mitigation:** Ensure fallback to native DGM methods when no custom properties or fills are active; isolate rendering calls in safe `try/catch` wrappers.
- **Risk:** Rapid canvas resizing might cause input stutter in the customizer.
  - **Mitigation:** Only synchronize dimension state when the active shape is selected and dimensions actually change, avoiding unnecessary component re-renders.

---

# Testing

### Validation Approach
Verification will be executed using automated Vitest unit and integration tests covering shape utility rendering hooks, `ShapeScriptDrawer` component controls, and `Whiteboard.tsx` canvas interactions.

---

### Key Scenarios
1. **Arrow Line Stroke on Board:**
   - Change line style to dashed and dotted, change stroke color, change stroke width; verify `shape.strokePattern`, `shape.strokeColor`, `shape.strokeWidth` are updated and `editor.repaint()` is called.
2. **Frame Styling & Preview:**
   - Change frame background fill, corner radius, and border style; verify `shape.fillColor`, `shape.fillStyle = 'solid'`, `shape.corners`, and `shape.strokePattern` are updated on the board.
   - Verify Live Sandbox preview accurately renders the frame title above the container and container fill/stroke.
3. **Image Border, Corner Radius & Opacity:**
   - Change image corner radius, border color/width, and opacity; verify image renders with clipped corners, border outline, and transparency on the canvas.
4. **UML Arrow Endpoints:**
   - Select UML Generalization (`triangle`), UML Aggregation (`diamond`), UML Composition (`diamond-filled`), and UML Interface (`circle`); verify `shape.headEndType` and `shape.tailEndType` are updated and rendered on the board.
5. **Live Dimension Updates on Canvas Resize:**
   - Resize a frame, arrow, basic shape, or image on the canvas; verify the customizer's width and height inputs immediately display the new dimensions.

---

### Edge Cases
- Connectors with single-point or zero-length paths gracefully handle endpoint rendering.
- Images with missing `imageData` gracefully fallback to placeholder rendering without throwing exceptions.
- Extreme corner radii (larger than half the shape width/height) are clamped by DGM's `computeCorners()`.

---

### Test Changes
- `src/main/webui/src/lib/shapeUtils.test.ts`:
  - Test Frame background fill and corner radius rendering.
  - Test Image corner clipping, opacity, and border rendering.
  - Test Connector strokePattern and UML endpoints.
- `src/main/webui/src/components/ShapeScriptDrawer.test.tsx`:
  - Test UML arrow endpoint options in head/tail selectors.
  - Test Frame Live Sandbox preview rendering.
  - Test dimension synchronization on shape resize.
- `src/main/webui/src/components/Whiteboard.test.tsx`:
  - Test arrow line stroke persistence and rendering on board.
  - Test frame container background, corner radius, and border persistence on board.
  - Test image border, corner radius, and opacity persistence on board.
  - Test UML arrow endpoint selection and persistence.
  - Test live dimension reflection in Shape Customizer when resizing shapes on canvas.

---

### Delivery Plan

<!-- STAGE_1_START -->
### ✓ Step 1: Enhance DGM rendering for Frames, Images, and Arrow Line Strokes
Extend DGM shape prototype hooks and serialization in `shapeUtils.ts` and `Whiteboard.tsx` to support frame backgrounds, image borders/corners/opacity, and arrow stroke patterns.

- Update `setupScriptedShapeRendering` in `src/main/webui/src/lib/shapeUtils.ts` to hook `Frame.prototype.renderDefault` (or `render`) to draw container background fills via `canvas.fillRoundRect` when `fillColor` is set and `fillStyle !== 'none'`.
- Hook `Image.prototype.renderDefault` (or `render`) in `shapeUtils.ts` to apply `this.computeOpacity()`, clip rounded corners using `this.computeCorners()`, draw the image, and stroke border outlines using `canvas.strokeRoundRect` with `strokeColor`, `strokeWidth`, and `strokePattern`.
- Update `handleSaveShapeCustomization` in `src/main/webui/src/components/Whiteboard.tsx` to apply `strokePattern` (`[]` for solid, `[8, 6]` for dashed, `[2, 4]` for dotted), `shape.strokeColor`, `shape.strokeWidth`, `shape.corners`, `shape.fillColor`, and `shape.fillStyle = 'solid'` for frames and connectors.
- Add unit tests in `src/main/webui/src/lib/shapeUtils.test.ts` verifying frame background fill rendering, image corner clipping/border/opacity, and connector stroke pattern application.
<!-- STAGE_1_END -->

<!-- STAGE_2_START -->
### ✓ Step 2: Add UML arrow endpoints and fix Frame Live Sandbox preview in ShapeScriptDrawer
Add UML-standard arrow endpoints and overhaul the Frame Live Sandbox preview in `ShapeScriptDrawer.tsx`.

- Expand `headEndType` and `tailEndType` in `src/main/webui/src/components/ShapeScriptDrawer.tsx` to include UML options: `triangle` (Generalization/Inheritance), `triangle-filled` (Realization), `diamond` (Aggregation), `diamond-filled` (Composition), and `circle` (Interface), backed by DGM's `LineEndType`.
- Overhaul the Frame Live Sandbox preview in `ShapeScriptDrawer.tsx` so it accurately reflects DGM canvas rendering (title label above the top-left boundary, container box with background fill, border stroke, and corner radius).
- Update Image Live Sandbox preview in `ShapeScriptDrawer.tsx` to render border stroke, corner radius, and opacity matching the canvas.
- Add unit tests in `src/main/webui/src/components/ShapeScriptDrawer.test.tsx` for UML endpoint selection, Frame preview layout, and Image preview styling.
<!-- STAGE_2_END -->

<!-- STAGE_3_START -->
### ✓ Step 3: Synchronize live canvas resizing with Shape Customizer and validate end-to-end
Wire live canvas transform transactions to synchronize shape dimensions with the customizer in real-time, and validate all scenarios.

- In `src/main/webui/src/components/Whiteboard.tsx`, listen to `editor.transform.onTransaction` and `editor.transform.onAction` to trigger a state update for `scriptDrawerShape` when the active shape is resized on the canvas.
- In `src/main/webui/src/components/ShapeScriptDrawer.tsx`, track shape dimension changes (`shape.width`, `shape.height`, `shape.rect`, `shape.path`) and synchronize width/height inputs in real-time.
- Add integration tests in `src/main/webui/src/components/Whiteboard.test.tsx` verifying arrow line strokes, frame styling, image borders/corners/opacity, UML arrowheads, and canvas resize dimension reflection.
- Run complete test suites (`npm test` and `./gradlew.bat test`) to ensure zero regressions across the codebase.
<!-- STAGE_3_END -->