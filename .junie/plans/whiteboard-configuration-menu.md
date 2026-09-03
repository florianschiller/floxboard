---
sessionId: session-260903-125815-5c24
---

# Requirements

### Overview & Goals
Replace the **Dark Slate** canvas theme with a **Light Slate** theme across the whiteboard configuration modal, canvas rendering pipeline, and test suites:
1. **Remove Dark Slate Option:** Eliminate the high-contrast dark theme (`#0f172a` / `bg-slate-900` / `darkMode: true`) in favor of a soft, readable light slate background (`#f1f5f9` / `bg-slate-100`).
2. **Introduce Light Slate Theme:** Provide users with a dedicated Light Slate theme option (`lightSlate`) that renders a subtle, clean slate tone with low-contrast grid lines (`#e2e8f0`) to maximize visual comfort and drawing legibility.
3. **Harmonize Modal Swatches:** Update the theme palette grid in `WhiteboardConfigModal.tsx` to display the new Light Slate swatch alongside Default Slate, Clean White, and Warm Paper.

### Scope
- **In Scope:**
  - Update `CanvasTheme` type definition in `WhiteboardConfigModal.tsx` to `'slate' | 'white' | 'lightSlate' | 'warm'`.
  - Update theme card options and swatches in `WhiteboardConfigModal.tsx` replacing Dark Slate (`bg-slate-900`) with Light Slate (`bg-slate-100` / `border-slate-300`).
  - Update `THEME_CANVAS_COLORS` in `Whiteboard.tsx` replacing `dark` with `lightSlate: { canvas: '#f1f5f9', blank: '#f1f5f9', grid: '#e2e8f0' }`.
  - Update `canvasThemeClass` and dark mode handling in `Whiteboard.tsx` to support `lightSlate` and maintain bright canvas rendering.
  - Update unit and integration tests in `WhiteboardConfigModal.test.tsx` and `Whiteboard.test.tsx`.
- **Out of Scope:**
  - Changes to other themes (`slate`, `white`, `warm`).
  - Shape stroke/fill colors or tool palette defaults.

### User Stories
- **As a User**, I want a Light Slate canvas background option instead of a heavy Dark Slate background so that I can enjoy a soft, modern neutral backdrop that doesn't produce visual strain or clash with light drawing elements.

### Functional Requirements
1. **Theme Type & Option Updates:**
   - Replace the `dark` theme key with `lightSlate` in `CanvasTheme`.
   - In `WhiteboardConfigModal.tsx`, replace the Dark Slate card with `{ id: 'lightSlate', label: 'Light Slate', colorBg: 'bg-slate-100', border: 'border-slate-300' }`.
   - Remove dark-specific text styling from checkmark icons in swatches since all themes are now light backgrounds.
2. **Canvas Render Pipeline:**
   - In `Whiteboard.tsx`, map `lightSlate` to `canvas: '#f1f5f9'`, `blank: '#f1f5f9'`, and `grid: '#e2e8f0'`.
   - Ensure DGM editor `setDarkMode` is set to `false` across all themes.
   - When selecting Light Slate, the canvas wrapper receives `bg-slate-100` and the DGM editor immediately repaints with the light slate background.
3. **Persistence & Defaults:**
   - Default theme remains `slate` (`Default Slate`, `#fafbfd`).
   - Theme changes to `lightSlate` trigger standard `onUpdateCanvasConfig` callback.

### Non-Functional Requirements
- **Ergonomics & Legibility:** Ensure optimal visual contrast and eliminate dark-mode inversion artifacts.
- **Maintainability:** Ensure strict TypeScript typing and consistent color constants across components.

# Technical Design

### Current Implementation
- `WhiteboardConfigModal.tsx` defines:
  ```typescript
  export type CanvasTheme = 'slate' | 'white' | 'dark' | 'warm';
  ```
  and includes `{ id: 'dark', label: 'Dark Slate', colorBg: 'bg-slate-900', border: 'border-slate-800', textColor: 'text-white' }`.
- `Whiteboard.tsx` maps `dark` to `{ canvas: '#0f172a', blank: '#0f172a', grid: '#1e293b' }` and passes `darkMode={canvasConfig.theme === 'dark'}` to `<DGMEditor />`.

### Proposed Changes
1. **`src/main/webui/src/components/WhiteboardConfigModal.tsx`:**
   - Update `CanvasTheme`:
     ```typescript
     export type CanvasTheme = 'slate' | 'white' | 'lightSlate' | 'warm';
     ```
   - In theme options array, replace the `dark` entry with:
     ```typescript
     { id: 'lightSlate', label: 'Light Slate', colorBg: 'bg-slate-100', border: 'border-slate-300' },
     ```
   - Simplify checkmark icon color to `text-blue-600` for all options.
2. **`src/main/webui/src/components/Whiteboard.tsx`:**
   - Update `THEME_CANVAS_COLORS`:
     ```typescript
     export const THEME_CANVAS_COLORS: Record<CanvasTheme, { canvas: string; blank: string; grid?: string }> = {
       slate: { canvas: '#fafbfd', blank: '#fafbfd', grid: '#f1f5f9' },
       white: { canvas: '#ffffff', blank: '#ffffff', grid: '#f1f5f9' },
       lightSlate: { canvas: '#f1f5f9', blank: '#f1f5f9', grid: '#e2e8f0' },
       warm: { canvas: '#fefce8', blank: '#fefce8', grid: '#fef3c7' },
     };
     ```
   - Update `canvasThemeClass`:
     ```typescript
     switch (canvasConfig.theme) {
       case 'white':
         return 'bg-white';
       case 'lightSlate':
         return 'bg-slate-100';
       case 'warm':
         return 'bg-amber-50/70';
       case 'slate':
       default:
         return 'bg-slate-50';
     }
     ```
   - Set `darkMode={false}` / `editorRef.current.setDarkMode(false)` since all active themes are light.
3. **`src/main/webui/src/components/WhiteboardConfigModal.test.tsx`:**
   - Update theme switching test to click 'Light Slate' and verify `theme: 'lightSlate'`.
4. **`src/main/webui/src/components/Whiteboard.test.tsx`:**
   - Update theme switching test from 'Dark Slate' to 'Light Slate', asserting canvas colors `#f1f5f9` and grid color `#e2e8f0`.

### Data Models / Contracts
```typescript
export type CanvasTheme = 'slate' | 'white' | 'lightSlate' | 'warm';

export const THEME_CANVAS_COLORS: Record<CanvasTheme, { canvas: string; blank: string; grid?: string }> = {
  slate: { canvas: '#fafbfd', blank: '#fafbfd', grid: '#f1f5f9' },
  white: { canvas: '#ffffff', blank: '#ffffff', grid: '#f1f5f9' },
  lightSlate: { canvas: '#f1f5f9', blank: '#f1f5f9', grid: '#e2e8f0' },
  warm: { canvas: '#fefce8', blank: '#fefce8', grid: '#fef3c7' },
};
```

### Components
- **`WhiteboardConfigModal.tsx`** *(Modified)*: Replaces Dark Slate option with Light Slate option and swatch.
- **`Whiteboard.tsx`** *(Modified)*: Updates canvas theme colors, wrapper class mapping, and editor dark mode state.

### File Structure
- `src/main/webui/src/components/WhiteboardConfigModal.tsx` *(Modified)*
- `src/main/webui/src/components/Whiteboard.tsx` *(Modified)*
- `src/main/webui/src/components/WhiteboardConfigModal.test.tsx` *(Modified)*
- `src/main/webui/src/components/Whiteboard.test.tsx` *(Modified)*

# Testing

### Validation Approach
Verify using Vitest unit and integration test suites in `WhiteboardConfigModal.test.tsx` and `Whiteboard.test.tsx`.

### Key Scenarios
1. **Modal Theme Swatch Rendering:**
   - Verify that "Light Slate" is rendered in the Canvas & View tab with `bg-slate-100` preview swatch.
   - Verify that "Dark Slate" is no longer present.
2. **Light Slate Selection in Modal:**
   - Clicking "Light Slate" invokes `onUpdateCanvasConfig` with `{ theme: 'lightSlate' }`.
3. **Canvas Theme Update in Whiteboard:**
   - Selecting Light Slate updates `editorRef.current.options.canvasColor` to `#f1f5f9`, `gridColor` to `#e2e8f0`, sets dark mode to `false`, and triggers `repaint()`.
4. **Full Test Suite Execution:**
   - Execute `npm --prefix src/main/webui test -- --run` and ensure all 22 test files pass.

# Delivery Steps

### ✓ Step 1: Replace Dark Slate with Light Slate in WhiteboardConfigModal and Whiteboard
Update `CanvasTheme` type, replace Dark Slate with Light Slate in `WhiteboardConfigModal.tsx`, and update `THEME_CANVAS_COLORS` and theme handling in `Whiteboard.tsx`.

- Update `CanvasTheme` type in `WhiteboardConfigModal.tsx` to `'slate' | 'white' | 'lightSlate' | 'warm'`.
- In `WhiteboardConfigModal.tsx`, replace the `dark` swatch with `lightSlate` (`Light Slate`, `bg-slate-100`, `border-slate-300`).
- Update `THEME_CANVAS_COLORS` in `Whiteboard.tsx` to define `lightSlate: { canvas: '#f1f5f9', blank: '#f1f5f9', grid: '#e2e8f0' }`.
- Update `canvasThemeClass` and dark mode settings in `Whiteboard.tsx` for `lightSlate`.

### ✓ Step 2: Update Unit and Integration Tests & Verify
Update Vitest test suites in `WhiteboardConfigModal.test.tsx` and `Whiteboard.test.tsx` and run tests.

- In `WhiteboardConfigModal.test.tsx`, replace dark slate test assertions with Light Slate assertions.
- In `Whiteboard.test.tsx`, update test step 3 to test switching to Light Slate theme (`#f1f5f9` / `#e2e8f0`).
- Run `npm --prefix src/main/webui test -- --run` to verify all test suites pass.