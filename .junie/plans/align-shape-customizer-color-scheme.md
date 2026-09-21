---
sessionId: session-260916-123449-27tn
---

# Requirements

### Overview & Goals
Align and standardize the background color architecture of the **Shape Customizer & Script Editor** (`ShapeScriptDrawer.tsx`) to create a cohesive, unified visual experience with **Shape Libraries** (`ShapeLibraryDrawer.tsx`) and the rest of the floxBoard application.

### Scope
- **In Scope:**
  - **Full Drawer Panel & Scrollable Body Background:** Set root drawer container and scrollable canvas body in `ShapeScriptDrawer.tsx` to `bg-slate-50` with `border-l border-slate-200` (dark: `dark:bg-slate-900 dark:border-slate-800`).
  - **Header, Action Footer & Live Preview Panel Backgrounds:** Align drawer header, action footer, and live preview container to `bg-slate-50/70` with `border-slate-200` to mirror `ShapeLibraryDrawer.tsx`.
  - **Section Cards & Forms:** Elevate all parameter cards, attribute option groups, and custom property forms with clean `bg-white border border-slate-200 shadow-2xs` containers (dark: `dark:bg-slate-200/80 dark:border-slate-700`).
  - **Light Monospace Code Editor:** Update the Canvas2D JavaScript script editor from dark `bg-slate-900` to a clean, readable light theme (`bg-slate-50 border-slate-300 text-slate-800`) with line gutter (`bg-slate-100 border-slate-200 text-slate-400`), while maintaining full dark mode styling (`dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100`).
  - **Component Unit Tests:** Update `ShapeScriptDrawer.test.tsx` and related test suites to validate the updated background and border classes.
- **Out of Scope:**
  - Changes to script execution logic or shape customization payloads.
  - Adding new canvas tools or backend shape library endpoints.

### User Stories
- **As a whiteboard user**, I want the Shape Customizer & Script Editor drawer background and cards to match the soft slate and white visual design of the Shape Libraries panel so that the application feels harmonious, modern, and polished.
- **As a diagram creator**, I want the script editor and parameter cards to have consistent, comfortable contrast and background styling in both light and dark modes.

### Functional Requirements
- **FR-1: Drawer Container & Canvas Body:**
  - The root container of `ShapeScriptDrawer.tsx` must use `bg-slate-50 border-l border-slate-200 shadow-2xl` (dark: `dark:bg-slate-900 dark:border-slate-800`).
  - The scrollable body must use `bg-slate-50` (dark: `dark:bg-slate-900`).
- **FR-2: Header, Footer & Preview Backgrounds:**
  - The drawer header must use `bg-slate-50/70 border-b border-slate-200` (dark: `dark:bg-slate-900/70 dark:border-slate-800`).
  - The tab bar container must use `bg-slate-50/70 border-b border-slate-200` (dark: `dark:bg-slate-900 dark:border-slate-800`).
  - The live sandbox preview container must use `bg-slate-100/70 border border-slate-200 rounded-xl` with a crisp `bg-white` canvas inside (dark: `dark:bg-slate-950/40 dark:border-slate-800 dark:bg-slate-900`).
  - The drawer action footer must use `bg-slate-50/70 border-t border-slate-200` (dark: `dark:bg-slate-900/70 dark:border-slate-800`).
- **FR-3: Elevated Section Cards:**
  - Attribute cards (Arrowheads & Line Style, Stroke & Fill, Frame Title & Presets, Dimensions, Colors, Typography, Image Border) must use `bg-white border border-slate-200 rounded-xl shadow-2xs` (dark: `dark:bg-slate-200/80 dark:border-slate-700`).
  - Property cards and custom property creation forms must use `bg-white border border-slate-200 rounded-xl shadow-2xs` (dark: `dark:bg-slate-200/80 dark:border-slate-700`).
- **FR-4: Light Code Editor & Syntax Presentation:**
  - Monospace code editor container must use `border border-slate-300 bg-slate-50 rounded-xl text-slate-800 shadow-inner dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100`.
  - Line number gutter must use `bg-slate-100 border-r border-slate-200 text-slate-400 dark:bg-slate-900/90 dark:border-slate-800 dark:text-slate-500`.
  - Textarea must use `bg-transparent text-slate-800 dark:text-slate-100` with clean focus handling.

# Technical Design

### Current Implementation
- `src/main/webui/src/components/ShapeScriptDrawer.tsx`:
  - Root container currently has `bg-white` with `bg-slate-50/60` nested section cards.
  - Action footer currently uses `bg-white`.
  - Monospace code editor currently uses dark `bg-slate-900` with `bg-slate-950/70` line gutter regardless of page theme.
- `src/main/webui/src/components/ShapeLibraryDrawer.tsx`:
  - Uses `bg-slate-50/70` header and `bg-slate-50` footer.

### Key Decisions
- **Decision 1: Invert Container/Card Background Layering:**
  - Transition the drawer body background to `bg-slate-50` and elevate all inner attribute sections, property forms, and snippet selectors onto crisp `bg-white border border-slate-200 shadow-2xs` cards, matching modern high-fidelity design standards.
- **Decision 2: Harmonize Header & Footer Panels:**
  - Update drawer header and action footer in `ShapeScriptDrawer.tsx` to `bg-slate-50/70 border-slate-200` to mirror `ShapeLibraryDrawer.tsx`.
- **Decision 3: Light Monospace Script Editor Theme:**
  - Update the code editor container to `bg-slate-50` with `bg-slate-100` line gutter and `text-slate-800` code font for light mode, while retaining sleek dark mode classes (`dark:bg-slate-950`, `dark:border-slate-800`, `dark:text-slate-100`).

### Components
- **`ShapeScriptDrawer`**: Root drawer, header, tab bar, live canvas preview, section cards, light code editor, and action footer.
- **`ShapeLibraryDrawer`**: Reference drawer for consistent slate header/footer background styling.

### File Structure
- `src/main/webui/src/components/ShapeScriptDrawer.tsx` (modified): Update drawer root background, header, footer, preview box, cards, and code editor.
- `src/main/webui/src/components/ShapeScriptDrawer.test.tsx` (modified): Validate updated background styling assertions.

# Testing

### Validation Approach
Verify that the Shape Customizer & Script Editor displays with the cohesive soft slate background, elevated white cards, aligned header/footer, and light code editor in both light and dark modes.

### Key Scenarios
1. **Drawer Container, Header & Footer Backgrounds:**
   - Open Shape Customizer and verify the panel background is `bg-slate-50` with `bg-slate-50/70` header and footer.
2. **Elevated Section Cards:**
   - Verify all attribute groups, frame properties, dimensions, typography, and custom property forms render inside `bg-white` elevated cards with subtle borders.
3. **Monospace Script Editor:**
   - Switch to the Script tab and verify the code editor renders with a clean light slate background (`bg-slate-50`), slate gutter (`bg-slate-100`), and dark text in light mode, switching properly in dark mode.
4. **Visual Preview Sandbox:**
   - Verify the live canvas preview box blends seamlessly with the updated background palette.

### Test Changes
- Run `npm test` across all Vitest test suites in `src/main/webui` to ensure 100% test pass rate.

# Delivery Steps

### ✓ Step 1: Update ShapeScriptDrawer root panel, header, footer, and live preview backgrounds
Align drawer container, header bar, tab navigation, footer action bar, and live preview panel with the unified Slate palette.

- Update root drawer container to `bg-slate-50 border-l border-slate-200` (dark: `dark:bg-slate-900 dark:border-slate-800`).
- Update drawer header and tab bar backgrounds to `bg-slate-50/70 border-b border-slate-200`.
- Update drawer action footer to `bg-slate-50/70 border-t border-slate-200`.
- Update live sandboxed preview container to `bg-slate-100/70 border-slate-200` with `bg-white` canvas.

### ✓ Step 2: Elevate section cards and style the light monospace code editor
Update all inner attribute cards, property forms, and script editor to elevated white cards and light code editor styling.

- Update all section cards in the Attributes and Properties tabs to `bg-white border border-slate-200 rounded-xl shadow-2xs` (dark: `dark:bg-slate-200/80 dark:border-slate-700`).
- Update the Canvas2D code editor container to `bg-slate-50 border border-slate-300 text-slate-800` (dark: `dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100`).
- Update the code editor line gutter to `bg-slate-100 border-r border-slate-200 text-slate-400` (dark: `dark:bg-slate-900/90 dark:border-slate-800 dark:text-slate-500`).
- Update textarea font color to `text-slate-800 dark:text-slate-100`.

### ✓ Step 3: Verify component styling and execute frontend test suite
Run the complete Vitest test suite and ensure all tests pass cleanly.

- Update any affected test assertions in `ShapeScriptDrawer.test.tsx`.
- Execute `npm test -- --run` in `src/main/webui` to verify 100% test pass rate across all test suites.
