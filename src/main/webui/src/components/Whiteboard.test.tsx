// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Whiteboard from './Whiteboard';
import * as api from '@/lib/api';
import * as auth from '@/lib/auth';
import * as collab from '@/lib/useWhiteboardCollab';
import * as entitlementContext from '@/lib/entitlementContext';
import * as Y from 'yjs';

// Mock dependencies
vi.mock('@/lib/api');
vi.mock('@/lib/auth');
vi.mock('@/lib/useWhiteboardCollab');
vi.mock('@/lib/entitlementContext');

let mockEditorInstance: any = null;
let registeredOnMount: ((editor: any) => void) | null = null;

vi.mock('@dgmjs/react', () => ({
  DGMEditor: ({ onMount }: { onMount: (editor: any) => void }) => {
    registeredOnMount = onMount;
    return <div data-testid="dgm-editor-canvas" />;
  },
}));

describe('Whiteboard single-user canvas interactions and persistence', () => {
  let yDoc: Y.Doc;
  let currentDocJSON: any;

  beforeEach(() => {
    vi.useFakeTimers();
    yDoc = new Y.Doc();
    currentDocJSON = {
      _type: 'Doc',
      id: 'doc_1',
      version: 1,
      children: [
        {
          _type: 'Page',
          id: 'page_1',
          name: 'Page 1',
          children: [
            {
              _type: 'Rectangle',
              id: 'shape_1',
              origin: [10, 10],
              size: [100, 100],
              strokeColor: '#000000',
              fillColor: '#ffffff',
            },
          ],
        },
      ],
    };

    mockEditorInstance = {
      options: {},
      canvas: { origin: [0, 0], scale: 1 },
      newDoc: vi.fn(),
      fitToScreen: vi.fn(),
      fit: vi.fn(),
      setShowGrid: vi.fn(),
      setSnapToGrid: vi.fn(),
      setDarkMode: vi.fn(),
      getScale: vi.fn(() => 1),
      setScale: vi.fn(),
      getCenter: vi.fn(() => [100, 100]),
      saveToJSON: vi.fn(() => JSON.parse(JSON.stringify(currentDocJSON))),
      loadFromJSON: vi.fn((json: any) => {
        currentDocJSON = JSON.parse(JSON.stringify(json));
      }),
      repaint: vi.fn(),
      onRepaint: { addListener: vi.fn(() => ({ dispose: vi.fn() })) },
      activateHandler: vi.fn(),
      setActiveHandlerLock: vi.fn(),
      selection: {
        getShapes: vi.fn(() => []),
        select: vi.fn(),
        deselectAll: vi.fn(),
        onChange: { addListener: vi.fn(() => ({ dispose: vi.fn() })) },
      },
      factory: {
        onShapeInitialize: { addListener: vi.fn(() => ({ dispose: vi.fn() })) },
        onCreate: { addListener: vi.fn(() => ({ dispose: vi.fn() })) },
        createRectangle: vi.fn(() => ({
          _type: 'Rectangle',
          id: 'rect_new',
          origin: [50, 50],
          size: [100, 100],
        })),
      },
      transform: {
        onTransaction: { addListener: vi.fn(() => ({ dispose: vi.fn() })) },
        onAction: { addListener: vi.fn(() => ({ dispose: vi.fn() })) },
        onUndo: { addListener: vi.fn(() => ({ dispose: vi.fn() })) },
        onRedo: { addListener: vi.fn(() => ({ dispose: vi.fn() })) },
        transact: vi.fn((fn: any) => fn({ assign: vi.fn() })),
      },
      actions: {
        insert: vi.fn(),
        update: vi.fn(),
      },
      store: {
        idIndex: {},
      },
    };

    vi.mocked(auth.useAuth).mockReturnValue({
      user: {
        profile: {
          sub: 'user_solo',
          name: 'Solo User',
          email: 'solo@example.com',
          preferred_username: 'solouser',
        },
        access_token: 'fake-token',
      } as any,
      refreshToken: vi.fn(),
    } as any);

    vi.mocked(entitlementContext.useEntitlements).mockReturnValue({
      plan: 'FREE',
      status: 'ACTIVE',
      isExpired: false,
      validUntil: null,
      entitlements: null,
      loading: false,
      hasFeature: () => true,
      getQuota: () => ({ current: 0, limit: 10, remaining: 10, isUnlimited: false, allowed: true }),
      refreshEntitlements: async () => {},
      activateKey: async () => {},
      deactivateKey: async () => {},
    });

    vi.mocked(collab.useWhiteboardCollab).mockReturnValue({
      status: 'connected',
      peers: [], // No other peers (single user scenario)
      yDoc,
      updatePresence: vi.fn(),
      broadcastFocus: vi.fn(),
    });

    vi.mocked(api.getWhiteboard).mockResolvedValue({
      id: 'board-solo-1',
      name: 'Solo Whiteboard',
      content: currentDocJSON,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: 'user_solo',
    } as any);

    vi.mocked(api.getBoardRole).mockResolvedValue({ role: 'OWNER' });
    vi.mocked(api.saveWhiteboard).mockResolvedValue({
      id: 'board-solo-1',
      name: 'Solo Whiteboard',
      content: currentDocJSON,
    } as any);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('triggers debounced auto-save upon pointerup after single-user drawing or moving shapes', async () => {
    render(
      <MemoryRouter initialEntries={['/board/board-solo-1']}>
        <Routes>
          <Route path="/board/:id" element={<Whiteboard />} />
        </Routes>
      </MemoryRouter>
    );

    // Mount editor
    await act(async () => {
      registeredOnMount?.(mockEditorInstance);
    });

    // Wait for board data loading to resolve
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Simulate user drawing a freehand stroke in editor
    currentDocJSON.children[0].children.push({
      _type: 'Freehand',
      id: 'stroke_solo',
      points: [[10, 10], [20, 30], [50, 80]],
      strokeColor: '#000000',
      strokeWidth: 2,
    });

    // Fire pointerup on the window (canvas pointer completion)
    fireEvent.pointerUp(window);

    // Fast-forward auto-save debounce timer (1000ms)
    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(api.saveWhiteboard).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'board-solo-1',
        content: expect.objectContaining({
          children: expect.arrayContaining([
            expect.objectContaining({
              children: expect.arrayContaining([
                expect.objectContaining({ id: 'stroke_solo', _type: 'Freehand' }),
              ]),
            }),
          ]),
        }),
      })
    );
  });

  it('triggers debounced auto-save upon keyup for Delete key', async () => {
    render(
      <MemoryRouter initialEntries={['/board/board-solo-1']}>
        <Routes>
          <Route path="/board/:id" element={<Whiteboard />} />
        </Routes>
      </MemoryRouter>
    );

    await act(async () => {
      registeredOnMount?.(mockEditorInstance);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Simulate user deleting shape_1
    currentDocJSON.children[0].children = [];

    // Trigger Delete keyup
    fireEvent.keyUp(window, { key: 'Delete' });

    // Advance 1s debounce
    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(api.saveWhiteboard).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'board-solo-1',
        content: expect.objectContaining({
          children: expect.arrayContaining([
            expect.objectContaining({
              children: [],
            }),
          ]),
        }),
      })
    );
  });

  it('persists total canvas clearing down to zero shapes without being suppressed by safety guard', async () => {
    render(
      <MemoryRouter initialEntries={['/board/board-solo-1']}>
        <Routes>
          <Route path="/board/:id" element={<Whiteboard />} />
        </Routes>
      </MemoryRouter>
    );

    await act(async () => {
      registeredOnMount?.(mockEditorInstance);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Select Eraser tool
    const eraserBtn = screen.getByTitle('Eraser');
    fireEvent.click(eraserBtn);

    // User erases all shapes
    currentDocJSON.children[0].children = [];

    // Pointer up after erasing
    fireEvent.pointerUp(window);

    // Advance 1s debounce
    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(api.saveWhiteboard).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'board-solo-1',
        content: expect.objectContaining({
          children: expect.arrayContaining([
            expect.objectContaining({
              children: [],
            }),
          ]),
        }),
      })
    );
  });

  it('opens WhiteboardConfigModal when clicking Whiteboard Settings in action menu dropdown', async () => {
    render(
      <MemoryRouter initialEntries={['/board/board-solo-1']}>
        <Routes>
          <Route path="/board/:id" element={<Whiteboard />} />
        </Routes>
      </MemoryRouter>
    );

    await act(async () => {
      registeredOnMount?.(mockEditorInstance);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const moreBtn = screen.getByLabelText('Action menu');
    expect(moreBtn).toBeDefined();
    fireEvent.click(moreBtn);

    const settingsOption = screen.getByText('Whiteboard Settings');
    expect(settingsOption).toBeDefined();
    fireEvent.click(settingsOption);

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByDisplayValue('Solo Whiteboard')).toBeDefined();
  });

  it('supports deep linking to configuration modal with initial tab via URL parameters', async () => {
    render(
      <MemoryRouter initialEntries={['/board/board-solo-1?modal=config&tab=canvas']}>
        <Routes>
          <Route path="/board/:id" element={<Whiteboard />} />
        </Routes>
      </MemoryRouter>
    );

    await act(async () => {
      registeredOnMount?.(mockEditorInstance);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText('Whiteboard Settings')).toBeDefined();
    expect(screen.getByText('Grid Style')).toBeDefined();
    expect(screen.getByText('Canvas Background Theme')).toBeDefined();
  });

  it('renames whiteboard and saves when submitted from WhiteboardConfigModal', async () => {
    render(
      <MemoryRouter initialEntries={['/board/board-solo-1?modal=config']}>
        <Routes>
          <Route path="/board/:id" element={<Whiteboard />} />
        </Routes>
      </MemoryRouter>
    );

    await act(async () => {
      registeredOnMount?.(mockEditorInstance);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const input = screen.getByDisplayValue('Solo Whiteboard');
    fireEvent.change(input, { target: { value: 'New Board Name' } });

    const renameBtn = screen.getByRole('button', { name: /Rename/i });
    await act(async () => {
      fireEvent.click(renameBtn);
    });

    expect(api.saveWhiteboard).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'board-solo-1',
        name: 'New Board Name',
      })
    );
  });

  it('configures DGM editor options on mount and updates them when canvasConfig changes in modal', async () => {
    render(
      <MemoryRouter initialEntries={['/board/board-solo-1?modal=config&tab=canvas']}>
        <Routes>
          <Route path="/board/:id" element={<Whiteboard />} />
        </Routes>
      </MemoryRouter>
    );

    await act(async () => {
      registeredOnMount?.(mockEditorInstance);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Check initial mount configuration
    expect(mockEditorInstance.setShowGrid).toHaveBeenCalledWith(true);
    expect(mockEditorInstance.setSnapToGrid).toHaveBeenCalledWith(true);
    expect(mockEditorInstance.setDarkMode).toHaveBeenCalledWith(false);
    expect(mockEditorInstance.options.canvasColor).toBe('#fafbfd');
    expect(mockEditorInstance.options.blankColor).toBe('#fafbfd');
    expect(mockEditorInstance.options.gridColor).toBe('#f1f5f9');

    // 1. Change grid style to None
    const noneGridBtn = screen.getByText('None');
    fireEvent.click(noneGridBtn);
    expect(mockEditorInstance.setShowGrid).toHaveBeenCalledWith(false);
    expect(mockEditorInstance.repaint).toHaveBeenCalled();

    // 2. Toggle snap to grid
    const snapToggle = screen.getByRole('switch');
    fireEvent.click(snapToggle);
    expect(mockEditorInstance.setSnapToGrid).toHaveBeenCalledWith(false);
    expect(mockEditorInstance.repaint).toHaveBeenCalled();

    // 3. Switch to Light Slate theme
    const lightSlateThemeBtn = screen.getByText('Light Slate');
    fireEvent.click(lightSlateThemeBtn);
    expect(mockEditorInstance.setDarkMode).toHaveBeenCalledWith(false);
    expect(mockEditorInstance.options.canvasColor).toBe('#f1f5f9');
    expect(mockEditorInstance.options.blankColor).toBe('#f1f5f9');
    expect(mockEditorInstance.options.gridColor).toBe('#e2e8f0');
    expect(mockEditorInstance.repaint).toHaveBeenCalled();

    // 4. Switch to Clean White theme
    const whiteThemeBtn = screen.getByText('Clean White');
    fireEvent.click(whiteThemeBtn);
    expect(mockEditorInstance.setDarkMode).toHaveBeenCalledWith(false);
    expect(mockEditorInstance.options.canvasColor).toBe('#ffffff');
    expect(mockEditorInstance.options.blankColor).toBe('#ffffff');
    expect(mockEditorInstance.options.gridColor).toBe('#f1f5f9');
    expect(mockEditorInstance.repaint).toHaveBeenCalled();

    // 5. Switch to Warm Paper theme
    const warmThemeBtn = screen.getByText('Warm Paper');
    fireEvent.click(warmThemeBtn);
    expect(mockEditorInstance.setDarkMode).toHaveBeenCalledWith(false);
    expect(mockEditorInstance.options.canvasColor).toBe('#fefce8');
    expect(mockEditorInstance.options.blankColor).toBe('#fefce8');
    expect(mockEditorInstance.options.gridColor).toBe('#fef3c7');
    expect(mockEditorInstance.repaint).toHaveBeenCalled();
  });
});
