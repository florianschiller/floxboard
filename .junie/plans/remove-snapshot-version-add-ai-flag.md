---
sessionId: session-260909-131504-1ajy
---

# Requirements

### Overview & Goals
Following the backend removal of sequential integer version numbers from whiteboard snapshots, residual frontend references still attempt to display snapshot versions (such as `<span ...>v{item.version}</span>` in `HistoryDrawer.tsx`), rendering an empty `v` prefix.

The goal of this task is to clean up all leftover snapshot version references in the frontend UI (`HistoryDrawer.tsx` and `Whiteboard.tsx`), replace version strings in modal dialogues, banner messages, and fallback names with clean snapshot labels, visually display an AI badge for snapshots flagged with `isGeneratedByAI: true`, and align all frontend test suites.

### Scope
- **In Scope**:
  - `HistoryDrawer.tsx`: Remove the `v{item.version}` tag, display an AI badge for snapshots where `isGeneratedByAI` is true, and update modal headers, error/success messages, and fork default names to avoid version numbers.
  - `Whiteboard.tsx`: Update snapshot preview banner, restore confirmation dialog, and restore toast notification to remove `v{version}` references.
  - `HistoryDrawer.test.tsx` & `Whiteboard.test.tsx`: Update test expectations to verify snapshot rendering without version badges and assert AI badge visibility.
- **Out of Scope**:
  - Backend database schema or API endpoint modifications (already completed).
  - DGM document schema version (`Doc.version`).

### User Stories
- **As a Whiteboard User**, I want my version history and preview banners to show clean snapshot names, badges, and timestamps without stray "v" prefixes or broken version labels.
- **As a Whiteboard User**, I want AI-generated snapshots to clearly display an "AI" badge in the history drawer so I can quickly identify automated milestones.

### Functional Requirements
- `HistoryDrawer.tsx` does not render the `v{item.version}` badge.
- `HistoryDrawer.tsx` renders an "AI" badge (with Sparkles icon) alongside "Auto" / "Milestone" badges when `snapshot.isGeneratedByAI` is `true`.
- Snapshot fallback titles render clean snapshot names (`item.name || 'Snapshot'`) instead of `Revision ${item.version}`.
- Restore modals, preview banners, and fork dialogs reference snapshot names and IDs instead of version numbers.
- Frontend test suites pass cleanly with updated expectations.

# Technical Design

### Current Implementation
In `HistoryDrawer.tsx`, the timeline card header renders:
```tsx
<span className="font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-200 text-slate-700 dark:text-slate-300 text-2xs font-mono">
  v{item.version}
</span>
```
Since `version` was removed from the snapshot response payload, `item.version` is `undefined`, resulting in `v` rendering on the screen. Additionally, dialog strings in `HistoryDrawer.tsx` and `Whiteboard.tsx` format messages like `Revision v${snapshot.version}` and `Restore to Revision v${restoreConfirmSnapshot.version}?`.

### Key Decisions
1. **Remove Version Badge & Add AI Tag**: Drop the `v{item.version}` badge from `HistoryDrawer.tsx`. In its place, when `item.isGeneratedByAI` is true, render an AI badge using the existing `Sparkles` icon from `lucide-react`:
   ```tsx
   {item.isGeneratedByAI && (
     <span className="text-2xs px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1">
       <Sparkles className="w-3 h-3" />
       AI
     </span>
   )}
   ```
2. **Refactor Dialog & Banner Messages**: Replace all `v${version}` string interpolations in `HistoryDrawer.tsx` and `Whiteboard.tsx`:
   - Preview banner: `Snapshot Preview${previewSnapshot.name ? ` • ${previewSnapshot.name}` : ''}`
   - Restore confirm modal: `Restore to snapshot?` with subtitle showing `restoreConfirmSnapshot.name || 'Checkpoint'`
   - Fork default name: `${boardName} (Fork)`
   - Error/success toasts: refer to "snapshot" rather than "revision v...".

### Components & File Structure
- **Modified**:
  - `src/main/webui/src/components/HistoryDrawer.tsx` (remove version badge, add AI tag, update dialogs & fallback names)
  - `src/main/webui/src/components/Whiteboard.tsx` (clean preview banner and restore modal strings)
  - `src/main/webui/src/components/HistoryDrawer.test.tsx` (update snapshot text assertions and test AI badge)
  - `src/main/webui/src/components/Whiteboard.test.tsx` (update preview banner regex match)

# Testing

### Validation Approach
Run Vitest frontend unit and component tests via `npm test` to verify component rendering, user interactions, and banner displays.

### Key Scenarios
- **HistoryDrawer UI Rendering**:
  - Verify that snapshots render with type badges ("Auto", "Milestone", "Current") without any stray "v" version badge.
  - Verify that snapshots with `isGeneratedByAI: true` render the "AI" badge with Sparkles icon.
- **Preview & Restore Flows**:
  - Verify snapshot preview banner on canvas displays proper label without `v${version}`.
  - Verify restore confirmation and fork modals display proper snapshot titles without version tags.

### Test Changes
- Update `HistoryDrawer.test.tsx` to assert new badge structure and AI badge rendering.
- Update `Whiteboard.test.tsx` to match the updated snapshot preview banner text.

# Delivery Steps

### ✓ Step 1: Clean up snapshot version references and add AI badge in HistoryDrawer and Whiteboard
Remove the stray `v` badge and version references from frontend components and add the AI badge for AI-generated snapshots.

- In `src/main/webui/src/components/HistoryDrawer.tsx`:
  - Remove `<span ...>v{item.version}</span>`.
  - Add an "AI" badge with `Sparkles` icon when `item.isGeneratedByAI` is `true`.
  - Update fallback title from `item.name || \`Revision \${item.version}\`` to `item.name || 'Snapshot'`.
  - Update restore confirmation modal, fork modal, and error/toast notifications to eliminate `v${version}` references.
- In `src/main/webui/src/components/Whiteboard.tsx`:
  - Update the snapshot preview banner text from `Revision v\${previewSnapshot.version}...` to `Snapshot Preview\${previewSnapshot.name ? \` • \${previewSnapshot.name}\` : ''}`.
  - Update restore confirmation modal subtitle and restore toast notification to remove `v\${version}`.

### ✓ Step 2: Update frontend unit and component tests
Update test assertions across HistoryDrawer and Whiteboard test suites and add verification for the AI badge.

- In `src/main/webui/src/components/HistoryDrawer.test.tsx`:
  - Remove assertions checking for `v1`, `v2`, etc.
  - Update modal and toast text matchers for restore and fork tests.
  - Add a unit test verifying that snapshots with `isGeneratedByAI: true` render the AI badge.
- In `src/main/webui/src/components/Whiteboard.test.tsx`:
  - Update preview banner text assertion to match the updated banner format.
- Run `npm test` in `src/main/webui` to verify all frontend tests pass.
