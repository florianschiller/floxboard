---
sessionId: session-260930-112314-h6oq
---

# Requirements

### Overview & Goals
Fix two UI issues with the whiteboard toolbar:
1. **Flyout Menus Outside Toolbar**: Ensure the Shapes and Color Picker flyout popovers render outside the toolbar container rather than being trapped inside the toolbar's scrollable container (which causes clipping or unwanted scrolling).
2. **Whiteboard Action Menu Stacking**: Ensure the top-left whiteboard header action menu displays in front of the vertical toolbar instead of appearing behind it when opened.

### Scope
- **In Scope**:
  - Updating `WhiteboardToolbar.tsx` to render flyout popovers cleanly outside the toolbar container using fixed / breakout positioning aligned to the trigger buttons, preventing clipping and scroll entrapment.
  - Updating `WhiteboardHeader.tsx` (and `WhiteboardCanvas.tsx` / `Whiteboard.tsx` as needed) stacking context and z-index hierarchy so that the whiteboard action menu and header dropdowns always render in front of the toolbar.
  - Updating unit tests in `WhiteboardToolbar.test.tsx` and `WhiteboardHeader.test.tsx` (or other relevant test suites) to verify flyout positioning, dismissal, and proper header stacking.
- **Out of Scope**:
  - Adding or removing toolbar actions or modifying whiteboard canvas drawing logic.
  - Reverting the toolbar back to the bottom horizontal layout.

### User Stories
- As a whiteboard user, when I click the Shapes or Color Picker buttons on the vertical toolbar, I want the flyout menus to appear immediately outside the toolbar next to the trigger button without creating scrollbars or requiring me to scroll the toolbar.
- As a user, when I open the top-left Whiteboard menu (Action menu), I want the dropdown menu to be clearly visible on top of the left-side toolbar without being obscured or hidden behind it.

### Functional Requirements
- **External Flyout Popovers**:
  - Opening the Shapes or Color Picker flyout displays the popover to the right of the vertical toolbar, floating directly over the canvas outside the toolbar's scroll boundary.
  - Flyout popovers must not cause horizontal or vertical scrollbars within the toolbar.
  - Flyout items remain fully clickable and immediately interactive.
  - Clicking outside or pressing Escape cleanly closes the flyout popovers.
- **Header Action Menu Stacking**:
  - The whiteboard action menu (`MoreVertical` menu at `top-4 left-4`) must have a higher z-index / stacking priority than the canvas toolbar (`z-40`/`z-50` vs `z-30`), so it renders completely on top of the left vertical toolbar when expanded.
  - All items in the action menu (New Whiteboard, Open from Cloud, Pages, Shape Libraries, Shape Customizer, Generate with AI, Save to Cloud, Export, Delete, etc.) must be visible and clickable without being clipped or covered by the toolbar.

# Technical Design

### Current Implementation
- In `src/main/webui/src/components/WhiteboardToolbar.tsx`:
  - The toolbar uses `max-h-[calc(100vh-4rem)] overflow-y-auto`.
  - The Shapes and Color Picker flyouts are rendered as `absolute left-full ml-2` children inside the scrollable container. Because CSS scroll containers constrain and clip child elements, the flyout is rendered within the scrollable viewport of the toolbar.
- In `src/main/webui/src/components/WhiteboardHeader.tsx`:
  - The left header control bar uses `absolute top-4 left-4 z-30`.
  - In `Whiteboard.tsx`, `WhiteboardCanvas` (containing `WhiteboardToolbar` with `z-30`) is rendered after `WhiteboardHeader`. Because of DOM order and matching `z-30`, when the action menu opens downward into the toolbar's area, it is rendered behind `WhiteboardToolbar`.

### Key Decisions
- **Flyouts Outside Toolbar**:
  - Use `fixed` positioning (or viewport-relative coordinates calculated from the trigger button ref's `getBoundingClientRect()`) for the flyout popovers, or structure the toolbar with a non-clipping wrapper so that flyouts escape the scroll container and render outside the toolbar directly on the canvas.
- **Header & Menu Stacking Context**:
  - Increase `WhiteboardHeader` left and right controls containers to `z-40` and dropdown menus to `z-50`.
  - Keep `WhiteboardToolbar` at `z-30` (with its flyouts at `z-40`/`z-50` when open, but lower than or equal to active header modals/menus).
  - This guarantees that when the header action menu is opened, it stays above the toolbar in the stacking order.

### Components Affected
- `src/main/webui/src/components/WhiteboardToolbar.tsx`: Update flyout popover positioning to fixed/breakout coordinates to render outside the scroll container.
- `src/main/webui/src/components/WhiteboardHeader.tsx`: Update container z-index to `z-40` (and menu dropdown to `z-50`) so it stacks above the vertical toolbar.
- `src/main/webui/src/components/WhiteboardToolbar.test.tsx`: Update test assertions for flyout rendering and interactions.

### File Structure
- `src/main/webui/src/components/WhiteboardToolbar.tsx` (Modified)
- `src/main/webui/src/components/WhiteboardHeader.tsx` (Modified)
- `src/main/webui/src/components/WhiteboardToolbar.test.tsx` (Modified)

# Testing

### Validation Approach
- Run Vitest unit tests for toolbar and header components.
- Verify flyout popovers appear outside the scroll container and are properly positioned.
- Verify header action menu opens above the toolbar without z-index collisions.

### Key Scenarios
1. **Flyout Menus Outside Toolbar**: Opening Shapes and Color popovers renders them outside the scrollable toolbar container next to their trigger buttons without causing toolbar scrolling.
2. **Flyout Actions & Dismissal**: Selecting shapes/colors triggers callbacks and closes flyouts; clicking outside or pressing Escape dismisses flyouts.
3. **Whiteboard Action Menu Overlap**: Opening the Action menu in `WhiteboardHeader` renders the dropdown menu above the toolbar without being hidden behind it.
4. **All Header Actions Functional**: Verify clicking action menu items (New Whiteboard, Open, Save, Export, etc.) continues to trigger modal and drawer events.

# Execution Plan

### ✓ Step 1: Update WhiteboardToolbar flyout rendering to float outside the scrollable toolbar container
### ✓ Step 2: Update WhiteboardHeader stacking context so action menus display in front of the toolbar
### ✓ Step 3: Update unit tests and verify all interactions and test suites