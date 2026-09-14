// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Whiteboard from './Whiteboard';
import * as api from '@/lib/api';
import * as aiApi from '@/lib/api/ai';
import * as auth from '@/lib/auth';
import * as collab from '@/lib/useWhiteboardCollab';
import * as entitlementContext from '@/lib/entitlementContext';
import * as Y from 'yjs';

// Mock dependencies
vi.mock('@/lib/api');
vi.mock('@/lib/api/ai');
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
      getOrigin: vi.fn(() => [0, 0]),
      scrollCenterTo: vi.fn(),
      getCenter: vi.fn(() => [100, 100]),
      saveToJSON: vi.fn(() => JSON.parse(JSON.stringify(currentDocJSON))),
      loadFromJSON: vi.fn((json: any) => {
        currentDocJSON = JSON.parse(JSON.stringify(json));
        const shapes = json?.children?.[0]?.children || [];
        for (const s of shapes) {
          if (s && s.id) {
            mockEditorInstance.store.idIndex[s.id] = mockEditorInstance.store.idIndex[s.id] || { ...s };
          }
        }
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
        createRectangle: vi.fn((rect: any) => ({
          _type: 'Rectangle',
          id: 'rect_new',
          origin: rect ? rect[0] : [50, 50],
          size: rect ? [rect[1][0] - rect[0][0], rect[1][1] - rect[0][1]] : [100, 100],
        })),
        createCustom: vi.fn((rect: any, script: any) => ({
          _type: 'Custom',
          id: 'custom_new',
          rect: rect || [[0, 0], [100, 100]],
          script: script,
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
        root: {
          type: 'Doc',
        },
      },
      currentPage: {
        type: 'Page',
        getShapeAt: vi.fn(),
      },
      getCurrentPage: vi.fn(function () {
        return mockEditorInstance?.currentPage;
      }),
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
      awareness: {} as any,
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

    vi.mocked(aiApi.estimateAiCredits).mockResolvedValue({
      estimatedCredits: 25,
      remainingCredits: 950,
      isAllowed: true,
    });
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
    const snapToggles = screen.getAllByRole('switch');
    fireEvent.click(snapToggles[0]);
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

  it('persists voting configuration and shape votes in customData on auto-save', async () => {
    currentDocJSON.customData = {
      votingConfig: {
        enabled: true,
        isLocked: false,
        maxVotesPerUser: 10,
        categories: [
          { id: 'cat-test', name: 'Test Cat', color: '#10b981', comment: 'Testing vote config persistence' }
        ]
      }
    };
    currentDocJSON.children[0].children[0].customData = {
      votes: [
        {
          id: 'v-saved-1',
          userId: 'user_solo',
          userName: 'Solo User',
          userColor: '#3b82f6',
          categoryId: 'cat-test',
          createdAt: new Date().toISOString(),
          timestamp: Date.now()
        }
      ]
    };

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

    vi.mocked(api.saveWhiteboard).mockClear();

    // Simulate user editing canvas after load
    currentDocJSON.children[0].children.push({
      _type: 'Freehand',
      id: 'stroke_vote_test',
      points: [[10, 10]],
    });

    // Trigger auto-save via pointerUp
    fireEvent.pointerUp(window);

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(api.saveWhiteboard).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'board-solo-1',
        content: expect.objectContaining({
          customData: expect.objectContaining({
            votingConfig: expect.objectContaining({
              maxVotesPerUser: 10,
            })
          }),
          children: expect.arrayContaining([
            expect.objectContaining({
              children: expect.arrayContaining([
                expect.objectContaining({
                  id: 'shape_1',
                  customData: expect.objectContaining({
                    votes: expect.arrayContaining([
                      expect.objectContaining({ id: 'v-saved-1' })
                    ])
                  })
                })
              ])
            })
          ])
        })
      })
    );
  });

  it('restores shape customData votes onto in-memory shapes upon board load', async () => {
    const memoryShape1 = { id: 'shape_1', _type: 'Rectangle' };
    mockEditorInstance.store.idIndex['shape_1'] = memoryShape1;

    currentDocJSON.customData = {
      votingConfig: {
        enabled: true,
        isLocked: true,
        maxVotesPerUser: 7,
        categories: []
      }
    };
    currentDocJSON.children[0].children[0].customData = {
      votes: [
        {
          id: 'v-load-99',
          userId: 'user_other',
          userName: 'Other User',
          categoryId: 'cat-priority',
          createdAt: new Date().toISOString(),
          timestamp: Date.now()
        }
      ]
    };

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

    expect((memoryShape1 as any).customData).toEqual({
      votes: [
        expect.objectContaining({ id: 'v-load-99', userName: 'Other User' })
      ]
    });
  });

  it('enforces allowDuplicateVotes in voting configuration on whiteboard', async () => {
    const memoryShape1 = {
      id: 'shape_1',
      _type: 'Rectangle',
      getBoundingRect: () => [
        [10, 10],
        [100, 100],
      ],
      customData: {
        votes: [
          {
            id: 'v-1',
            userId: 'user_solo',
            userName: 'Solo User',
            categoryId: 'cat-priority',
            createdAt: new Date().toISOString(),
            timestamp: Date.now(),
          },
        ],
      },
    };
    mockEditorInstance.store.idIndex['shape_1'] = memoryShape1;

    currentDocJSON.customData = {
      votingConfig: {
        enabled: true,
        isLocked: false,
        allowDuplicateVotes: false,
        maxVotesPerUser: 5,
        categories: [
          { id: 'cat-priority', name: 'High Priority', color: '#ef4444' },
        ],
      },
    };

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

    const plusBtn = screen.getByRole('button', { name: /Vote \+1/i });
    expect(plusBtn.getAttribute('disabled')).not.toBeNull();
    expect(plusBtn.getAttribute('title')).toBe('You have already voted on this shape');
  });

  it('suppresses auto-save when previewing a snapshot', async () => {
    const snapshotSummary = {
      id: 'snap-prev-1',
      whiteboardId: 'board-solo-1',
      version: 1,
      name: 'Old Revision',
      description: null,
      isAutomatic: false,
      createdBy: 'user_solo',
      createdAt: '2026-09-08T10:00:00Z',
    };

    const snapshotFull = {
      ...snapshotSummary,
      content: {
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
                id: 'shape_old',
                origin: [50, 50],
                size: [200, 200],
              },
            ],
          },
        ],
      },
    };

    vi.mocked(api.listSnapshots).mockResolvedValue([snapshotSummary]);
    vi.mocked(api.getSnapshot).mockResolvedValue(snapshotFull);

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

    vi.mocked(api.saveWhiteboard).mockClear();

    // Open Menu & History Drawer
    const menuBtn = screen.getByLabelText('Action menu');
    fireEvent.click(menuBtn);

    const historyBtn = screen.getByText('Version History');
    fireEvent.click(historyBtn);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Click Preview on snapshot
    const previewBtn = screen.getByText('Preview');
    await act(async () => {
      fireEvent.click(previewBtn);
      await Promise.resolve();
      await Promise.resolve();
    });

    // Advance any timers
    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    // Ensure saveWhiteboard was NOT called during or after preview loading
    expect(api.saveWhiteboard).not.toHaveBeenCalled();

    // Simulate pointerUp during preview
    fireEvent.pointerUp(window);
    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    expect(api.saveWhiteboard).not.toHaveBeenCalled();
  });

  it('renders floating preview banner and restores pre-preview doc when exiting preview', async () => {
    const originalDoc = JSON.parse(JSON.stringify(currentDocJSON));

    const snapshotSummary = {
      id: 'snap-prev-2',
      whiteboardId: 'board-solo-1',
      version: 2,
      name: 'Sprint 2 Milestone',
      description: null,
      isAutomatic: false,
      createdBy: 'user_solo',
      createdAt: '2026-09-08T10:00:00Z',
    };

    const snapshotFull = {
      ...snapshotSummary,
      content: {
        _type: 'Doc',
        id: 'doc_1',
        version: 2,
        children: [
          {
            _type: 'Page',
            id: 'page_1',
            name: 'Page 1',
            children: [
              {
                _type: 'Ellipse',
                id: 'shape_ellipse',
                origin: [100, 100],
                size: [80, 80],
              },
            ],
          },
        ],
      },
    };

    vi.mocked(api.listSnapshots).mockResolvedValue([snapshotSummary]);
    vi.mocked(api.getSnapshot).mockResolvedValue(snapshotFull);

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

    // Open Menu & History Drawer
    const menuBtn = screen.getByLabelText('Action menu');
    fireEvent.click(menuBtn);

    const historyBtn = screen.getByText('Version History');
    fireEvent.click(historyBtn);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Click Preview
    const previewBtn = screen.getByText('Preview');
    await act(async () => {
      fireEvent.click(previewBtn);
      await Promise.resolve();
      await Promise.resolve();
    });

    // Close History Drawer
    const closeDrawerBtn = screen.getByRole('button', { name: /Close history drawer/i });
    fireEvent.click(closeDrawerBtn);

    await act(async () => {
      await Promise.resolve();
    });

    // Verify floating preview banner is present on canvas
    expect(screen.getByTestId('snapshot-preview-banner')).toBeDefined();
    expect(screen.getByText(/Snapshot Preview • Sprint 2 Milestone/i)).toBeDefined();

    // Click Exit Preview on banner
    const exitPreviewBtn = screen.getByText('Exit Preview');
    await act(async () => {
      fireEvent.click(exitPreviewBtn);
      await Promise.resolve();
    });

    // Verify banner is removed
    expect(screen.queryByTestId('snapshot-preview-banner')).toBeNull();

    // Verify editor loaded back the original live document
    expect(mockEditorInstance.loadFromJSON).toHaveBeenCalledWith(
      expect.objectContaining({
        id: originalDoc.id,
      })
    );
  });

  it('does not trigger auto-save when loading an existing whiteboard', async () => {
    vi.mocked(api.saveWhiteboard).mockClear();

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

    // Advance timers by 5 seconds
    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    expect(api.saveWhiteboard).not.toHaveBeenCalled();
  });

  it('does not trigger auto-save when receiving collaborative remote updates', async () => {
    let capturedOnRemoteUpdate: (() => void) | undefined;
    vi.mocked(collab.useWhiteboardCollab).mockImplementation((opts: any) => {
      capturedOnRemoteUpdate = opts.onRemoteUpdate;
      return {
        status: 'connected',
        peers: [],
        yDoc,
        awareness: {} as any,
        updatePresence: vi.fn(),
        broadcastFocus: vi.fn(),
      };
    });

    vi.mocked(api.saveWhiteboard).mockClear();

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

    // Simulate remote update event
    await act(async () => {
      capturedOnRemoteUpdate?.();
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    expect(api.saveWhiteboard).not.toHaveBeenCalled();
  });

  describe('AI text-to-diagram insertion', () => {
    const mockAiDiagramResponse = {
      id: "062ebc46-886d-4b3e-ba27-91daba5d588f",
      type: "Doc",
      children: [
        {
          id: "38355307-bc91-419d-a042-5ede535ebb87",
          type: "Page",
          children: [
            {
              id: "container-backend",
              type: "Frame",
              children: [],
              name: "Microservices Cluster",
              movable: "free",
              sizable: "free",
              left: 650.0,
              top: 55.0,
              width: 280.0,
              height: 245.0,
              strokeColor: "#94a3b8",
              strokeWidth: 1.5,
              fillColor: "rgba(248, 250, 252, 0.6)",
              fillStyle: "solid"
            },
            {
              id: "node-client",
              type: "Rectangle",
              children: [],
              movable: "free",
              sizable: "free",
              left: 100.0,
              top: 155.0,
              width: 180.0,
              height: 60.0,
              strokeColor: "#0284c7",
              strokeWidth: 2.0,
              fillColor: "#f0f9ff",
              fillStyle: "solid",
              fontColor: "#0f172a",
              fontFamily: "Inter, sans-serif",
              fontSize: 14.0,
              fontWeight: 500,
              corners: [8.0, 8.0, 8.0, 8.0],
              text: "Client / Web App",
              horzAlign: "center",
              vertAlign: "middle"
            },
            {
              id: "node-gateway",
              type: "Rectangle",
              children: [],
              movable: "free",
              sizable: "free",
              left: 370.0,
              top: 155.0,
              width: 220.0,
              height: 60.0,
              strokeColor: "#475569",
              strokeWidth: 2.0,
              fillColor: "#f8fafc",
              fillStyle: "solid",
              fontColor: "#0f172a",
              fontFamily: "Inter, sans-serif",
              fontSize: 14.0,
              fontWeight: 500,
              corners: [8.0, 8.0, 8.0, 8.0],
              text: "API Gateway (Kong / Nginx)",
              horzAlign: "center",
              vertAlign: "middle"
            },
            {
              id: "node-auth",
              type: "Rectangle",
              children: [],
              movable: "free",
              sizable: "free",
              left: 680.0,
              top: 100.0,
              width: 220.0,
              height: 60.0,
              strokeColor: "#ef4444",
              strokeWidth: 2.0,
              fillColor: "#fef2f2",
              fillStyle: "solid",
              fontColor: "#0f172a",
              fontFamily: "Inter, sans-serif",
              fontSize: 14.0,
              fontWeight: 500,
              corners: [8.0, 8.0, 8.0, 8.0],
              text: "Auth Service (Keycloak/JWT)",
              horzAlign: "center",
              vertAlign: "middle"
            },
            {
              id: "node-main-service",
              type: "Rectangle",
              children: [],
              movable: "free",
              sizable: "free",
              left: 710.0,
              top: 210.0,
              width: 160.0,
              height: 60.0,
              strokeColor: "#22c55e",
              strokeWidth: 2.0,
              fillColor: "#f0fdf4",
              fillStyle: "solid",
              fontColor: "#0f172a",
              fontFamily: "Inter, sans-serif",
              fontSize: 14.0,
              fontWeight: 500,
              corners: [8.0, 8.0, 8.0, 8.0],
              text: "Order Service",
              horzAlign: "center",
              vertAlign: "middle"
            },
            {
              id: "node-db",
              type: "Rectangle",
              children: [],
              movable: "free",
              sizable: "free",
              left: 990.0,
              top: 100.0,
              width: 180.0,
              height: 60.0,
              strokeColor: "#f59e0b",
              strokeWidth: 2.0,
              fillColor: "#fffbeb",
              fillStyle: "solid",
              fontColor: "#0f172a",
              fontFamily: "Inter, sans-serif",
              fontSize: 14.0,
              fontWeight: 500,
              corners: [8.0, 8.0, 8.0, 8.0],
              text: "PostgreSQL Database",
              horzAlign: "center",
              vertAlign: "middle"
            },
            {
              id: "node-eventbus",
              type: "Rectangle",
              children: [],
              movable: "free",
              sizable: "free",
              left: 1000.0,
              top: 210.0,
              width: 160.0,
              height: 60.0,
              strokeColor: "#c026d3",
              strokeWidth: 2.0,
              fillColor: "#fdf4ff",
              fillStyle: "solid",
              fontColor: "#0f172a",
              fontFamily: "Inter, sans-serif",
              fontSize: 14.0,
              fontWeight: 500,
              corners: [8.0, 8.0, 8.0, 8.0],
              text: "Kafka Event Bus",
              horzAlign: "center",
              vertAlign: "middle"
            },
            {
              id: "edge-1",
              type: "Connector",
              children: [],
              name: "HTTPS / REST",
              strokeColor: "#64748b",
              strokeWidth: 2.0,
              fontColor: "#475569",
              fontSize: 12.0,
              path: [[280.0, 185.0], [370.0, 185.0]],
              lineType: "straight",
              headEndType: "arrow",
              head: "node-gateway",
              tail: "node-client",
              headAnchor: [0.0, 0.5],
              tailAnchor: [1.0, 0.5]
            },
            {
              id: "edge-2",
              type: "Connector",
              children: [],
              name: "Validate Token",
              strokeColor: "#64748b",
              strokeWidth: 2.0,
              fontColor: "#475569",
              fontSize: 12.0,
              path: [[590.0, 185.0], [680.0, 130.0]],
              lineType: "straight",
              headEndType: "arrow",
              head: "node-auth",
              tail: "node-gateway",
              headAnchor: [0.0, 0.5],
              tailAnchor: [1.0, 0.5]
            },
            {
              id: "edge-3",
              type: "Connector",
              children: [],
              name: "Route Request",
              strokeColor: "#64748b",
              strokeWidth: 2.0,
              fontColor: "#475569",
              fontSize: 12.0,
              path: [[590.0, 185.0], [710.0, 240.0]],
              lineType: "straight",
              headEndType: "arrow",
              head: "node-main-service",
              tail: "node-gateway",
              headAnchor: [0.0, 0.5],
              tailAnchor: [1.0, 0.5]
            },
            {
              id: "edge-4",
              type: "Connector",
              children: [],
              name: "CRUD Queries",
              strokeColor: "#64748b",
              strokeWidth: 2.0,
              fontColor: "#475569",
              fontSize: 12.0,
              path: [[870.0, 240.0], [990.0, 130.0]],
              lineType: "straight",
              headEndType: "arrow",
              head: "node-db",
              tail: "node-main-service",
              headAnchor: [0.0, 0.5],
              tailAnchor: [1.0, 0.5]
            },
            {
              id: "edge-5",
              type: "Connector",
              children: [],
              name: "Publish Events",
              strokeColor: "#64748b",
              strokeWidth: 2.0,
              fontColor: "#475569",
              fontSize: 12.0,
              path: [[870.0, 240.0], [1000.0, 240.0]],
              lineType: "straight",
              headEndType: "arrow",
              head: "node-eventbus",
              tail: "node-main-service",
              headAnchor: [0.0, 0.5],
              tailAnchor: [1.0, 0.5]
            }
          ]
        }
      ],
      version: 1
    };

    it('inserts AI diagram in center mode, merging shapes with existing canvas and selecting new shapes', async () => {
      vi.mocked(aiApi.generateDiagramFromPrompt).mockResolvedValue({
        success: true,
        doc: mockAiDiagramResponse,
        shapeCount: 7,
        connectorCount: 5,
        creditsConsumed: 31,
        remainingCredits: 938,
        summary: "System Architecture Diagram",
      });

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

      // Open AI Modal via toolbar button
      const aiBtn = screen.getByTitle(/Generate Diagram with AI/i);
      fireEvent.click(aiBtn);

      expect(screen.getByText('AI Text-to-Diagram Synthesis')).toBeDefined();

      // Submit diagram generation in default center mode
      const generateBtn = screen.getByText(/Generate & Insert Shapes/i);
      await act(async () => {
        fireEvent.click(generateBtn);
        await Promise.resolve();
        await Promise.resolve();
      });

      // Verify loadFromJSON was called with merged document (1 existing shape + 12 AI elements = 13 total)
      expect(mockEditorInstance.loadFromJSON).toHaveBeenCalled();
      const lastCallArg = mockEditorInstance.loadFromJSON.mock.calls[mockEditorInstance.loadFromJSON.mock.calls.length - 1][0];
      expect(lastCallArg.children[0].children.length).toBe(13);
      expect(lastCallArg.children[0].children[0].id).toBe('shape_1');
      expect(lastCallArg.children[0].children[1].id).toBe('container-backend');

      // Verify selection was called with newly added shapes
      expect(mockEditorInstance.selection.select).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'container-backend' }),
          expect.objectContaining({ id: 'node-client' }),
        ])
      );

      // Verify snapshot checkpoint was created
      expect(api.createSnapshot).toHaveBeenCalledWith(
        'board-solo-1',
        expect.objectContaining({
          name: 'AI: Generated Diagram',
          isGeneratedByAI: true,
        })
      );
    });

    it('inserts AI diagram in replace mode, replacing canvas content and centering', async () => {
      vi.mocked(aiApi.generateDiagramFromPrompt).mockResolvedValue({
        success: true,
        doc: mockAiDiagramResponse,
        shapeCount: 7,
        connectorCount: 5,
        creditsConsumed: 31,
        remainingCredits: 938,
        summary: "System Architecture Diagram",
      });

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

      // Open AI Modal
      const aiBtn = screen.getByTitle(/Generate Diagram with AI/i);
      fireEvent.click(aiBtn);

      // Select Replace Canvas Content mode
      const modeSelect = screen.getByRole('combobox');
      fireEvent.change(modeSelect, { target: { value: 'replace' } });

      // Submit
      const generateBtn = screen.getByText(/Generate & Insert Shapes/i);
      await act(async () => {
        fireEvent.click(generateBtn);
        await Promise.resolve();
        await Promise.resolve();
      });

      // Verify loadFromJSON was called directly with the 12 incoming AI elements
      const lastCallArg = mockEditorInstance.loadFromJSON.mock.calls[mockEditorInstance.loadFromJSON.mock.calls.length - 1][0];
      expect(lastCallArg.children[0].children.length).toBe(12);
      expect(lastCallArg.children[0].children[0].id).toBe('container-backend');
    });

    it('handles AI diagram insertion in new_board mode by saving whiteboard and navigating', async () => {
      vi.mocked(aiApi.generateDiagramFromPrompt).mockResolvedValue({
        success: true,
        doc: mockAiDiagramResponse,
        shapeCount: 7,
        connectorCount: 5,
        creditsConsumed: 31,
        remainingCredits: 938,
        summary: "System Architecture Diagram",
      });
      vi.mocked(api.saveWhiteboard).mockResolvedValue({
        id: 'new-ai-board-123',
        name: 'AI Diagram - 10:00',
        content: mockAiDiagramResponse,
      } as any);

      render(
        <MemoryRouter initialEntries={['/board/board-solo-1']}>
          <Routes>
            <Route path="/board/:id" element={<Whiteboard />} />
            <Route path="/board/new-ai-board-123" element={<div data-testid="new-board-target" />} />
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

      // Open AI Modal
      const aiBtn = screen.getByTitle(/Generate Diagram with AI/i);
      fireEvent.click(aiBtn);

      // Select Fork into New Whiteboard mode
      const modeSelect = screen.getByRole('combobox');
      fireEvent.change(modeSelect, { target: { value: 'new_board' } });

      // Submit
      const generateBtn = screen.getByText(/Generate & Insert Shapes/i);
      await act(async () => {
        fireEvent.click(generateBtn);
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(api.saveWhiteboard).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringMatching(/AI Diagram/i),
          content: expect.objectContaining({
            id: mockAiDiagramResponse.id,
          }),
        })
      );
    });
  });

  describe('New Whiteboard creation and canvas reset', () => {
    it('resets canvas document state and navigates to /board when New Whiteboard is clicked from action menu', async () => {
      const onBoardChange = vi.fn();

      render(
        <MemoryRouter initialEntries={['/board/board-solo-1']}>
          <Routes>
            <Route path="/board/:id" element={<Whiteboard onBoardChange={onBoardChange} />} />
            <Route path="/board" element={<div data-testid="unsaved-board-target" />} />
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

      mockEditorInstance.newDoc.mockClear();

      // Open Action Menu
      const moreButton = screen.getByLabelText('Action menu');
      fireEvent.click(moreButton);

      // Click "New Whiteboard"
      const newBoardBtn = screen.getByText('New Whiteboard');
      await act(async () => {
        fireEvent.click(newBoardBtn);
        await Promise.resolve();
      });

      // Verify canvas was reset and route updated
      expect(mockEditorInstance.newDoc).toHaveBeenCalledTimes(1);
      expect(onBoardChange).toHaveBeenCalledWith(null);
      expect(screen.getByTestId('unsaved-board-target')).toBeDefined();
    });

    it('resets canvas document state and navigates to /board when New Whiteboard is clicked from OpenBoardModal', async () => {
      const onBoardChange = vi.fn();

      render(
        <MemoryRouter initialEntries={['/board/board-solo-1']}>
          <Routes>
            <Route path="/board/:id" element={<Whiteboard onBoardChange={onBoardChange} />} />
            <Route path="/board" element={<div data-testid="unsaved-board-target" />} />
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

      mockEditorInstance.newDoc.mockClear();

      // Open Action Menu and click "Open from Cloud" to trigger modal
      const moreButton = screen.getByLabelText('Action menu');
      fireEvent.click(moreButton);
      const openFromCloudBtn = screen.getByText('Open from Cloud');
      fireEvent.click(openFromCloudBtn);

      // Now OpenBoardModal is open. Find and click "+ New Whiteboard"
      const modalNewBoardBtn = screen.getByRole('button', { name: /New Whiteboard/i });
      await act(async () => {
        fireEvent.click(modalNewBoardBtn);
        await Promise.resolve();
      });

      expect(mockEditorInstance.newDoc).toHaveBeenCalledTimes(1);
      expect(onBoardChange).toHaveBeenCalledWith(null);
      expect(screen.getByTestId('unsaved-board-target')).toBeDefined();
    });
  });

  describe('Scripted custom stencil insertion & drop', () => {
    it('instantiates custom scripted shapes with scripts and properties when dropped onto canvas', async () => {
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

      const dropTarget = screen.getByTestId('dgm-editor-canvas').parentElement!;

      const mockScriptedStencil = {
        id: 'stencil-uml-class',
        name: 'UML Class',
        category: 'SOFTWARE_DESIGN_UML',
        width: 160,
        height: 120,
        shapes: [
          {
            id: 'class-box',
            type: 'Custom',
            left: 0,
            top: 0,
            width: 160,
            height: 120,
            script: 'ctx.strokeRect(0, 0, shape.width, shape.height);',
            properties: {
              className: 'OrderService',
              attributes: ['- id: string'],
              methods: ['+ process(): void'],
            },
            fillColor: '#ffffff',
            strokeColor: '#3b82f6',
          },
        ],
      };

      fireEvent.drop(dropTarget, {
        clientX: 300,
        clientY: 200,
        dataTransfer: {
          types: ['application/x-floxboard-stencil'],
          getData: (type: string) => {
            if (type === 'application/x-floxboard-stencil') {
              return JSON.stringify(mockScriptedStencil);
            }
            return '';
          },
        },
      });

      expect(mockEditorInstance.factory.createCustom).toHaveBeenCalledWith(
        expect.any(Array),
        'ctx.strokeRect(0, 0, shape.width, shape.height);'
      );
      expect(mockEditorInstance.actions.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          script: 'ctx.strokeRect(0, 0, shape.width, shape.height);',
          properties: {
            className: 'OrderService',
            attributes: ['- id: string'],
            methods: ['+ process(): void'],
          },
          strokeColor: '#3b82f6',
        })
      );
      expect(mockEditorInstance.selection.select).toHaveBeenCalled();
      expect(mockEditorInstance.repaint).toHaveBeenCalled();
    });

    it('loads and retains scripted custom shapes with properties on whiteboard open', async () => {
      const mockScriptedBoard = {
        id: 'board-scripted-1',
        name: 'Architecture Board',
        role: 'OWNER',
        content: {
          _type: 'Doc',
          id: 'doc_scripted',
          version: 1,
          children: [
            {
              _type: 'Page',
              id: 'page_1',
              children: [
                {
                  _type: 'Custom',
                  type: 'Custom',
                  id: 'uml-service-1',
                  rect: [[100, 100], [300, 250]],
                  script: 'function draw(ctx, shape) { ctx.strokeRect(0, 0, shape.width, shape.height); }',
                  properties: {
                    className: 'PaymentService',
                    methods: ['+ charge(): boolean'],
                  },
                },
              ],
            },
          ],
        },
      };

      vi.mocked(api.getWhiteboard).mockResolvedValueOnce(mockScriptedBoard as any);

      render(
        <MemoryRouter initialEntries={['/board/board-scripted-1']}>
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

      expect(mockEditorInstance.loadFromJSON).toHaveBeenCalledWith(mockScriptedBoard.content);
      expect(mockEditorInstance.store.idIndex['uml-service-1']).toBeDefined();
      expect(mockEditorInstance.store.idIndex['uml-service-1'].script).toBe(
        'function draw(ctx, shape) { ctx.strokeRect(0, 0, shape.width, shape.height); }'
      );
      expect(mockEditorInstance.store.idIndex['uml-service-1'].properties).toEqual({
        className: 'PaymentService',
        methods: ['+ charge(): boolean'],
      });
    });

    it('opens EditShapePropertiesModal on right-click context menu and updates scripted shape properties', async () => {
      const mockScriptedShape: any = {
        id: 'uml-1',
        type: 'Custom',
        _type: 'Custom',
        script: 'function draw(ctx, shape) {}',
        properties: {
          className: 'UserService',
          attributes: ['- id: UUID'],
        },
        getRectInDCS: () => [[100, 100], [250, 200]],
        update: vi.fn(),
      };

      mockEditorInstance.currentPage.getShapeAt.mockReturnValue(mockScriptedShape);
      mockEditorInstance.selection.getShapes.mockReturnValue([mockScriptedShape]);

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

      const canvasContainer = screen.getByTestId('dgm-editor-canvas').parentElement!;

      // Right-click on the canvas
      await act(async () => {
        fireEvent.contextMenu(canvasContainer, { clientX: 120, clientY: 120 });
      });

      // Verify "Edit Content / Properties" option appears in context menu
      const editOption = screen.getByText('Edit Content / Properties');
      expect(editOption).toBeDefined();

      // Click "Edit Content / Properties"
      await act(async () => {
        fireEvent.click(editOption);
      });

      // Verify modal is open
      expect(screen.getByRole('heading', { name: 'Edit Shape Properties' })).toBeDefined();
      const classNameInput = screen.getByLabelText('Class Name');
      expect((classNameInput as HTMLInputElement).value).toBe('UserService');

      // Change class name
      await act(async () => {
        fireEvent.change(classNameInput, { target: { value: 'CustomerService' } });
      });

      // Apply changes
      const applyBtn = screen.getByRole('button', { name: /Apply Changes/i });
      await act(async () => {
        fireEvent.click(applyBtn);
      });

      // Verify shape properties were updated and repaint called
      expect(mockScriptedShape.properties.className).toBe('CustomerService');
      expect(mockEditorInstance.repaint).toHaveBeenCalled();
    });

    it('opens EditShapePropertiesModal on canvas double-click on scripted shape', async () => {
      const mockScriptedShape: any = {
        id: 'story-1',
        type: 'Custom',
        _type: 'Custom',
        script: 'function draw(ctx, shape) {}',
        properties: {
          title: 'Initial Story',
          points: 5,
        },
        getRectInDCS: () => [[50, 50], [150, 150]],
        update: vi.fn(),
      };

      mockEditorInstance.currentPage.getShapeAt.mockReturnValue(mockScriptedShape);

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

      const canvasContainer = screen.getByTestId('dgm-editor-canvas').parentElement!;

      // Double-click on the scripted shape
      await act(async () => {
        fireEvent.doubleClick(canvasContainer, { clientX: 80, clientY: 80 });
      });

      // Verify modal opened
      expect(screen.getByRole('heading', { name: 'Edit Shape Properties' })).toBeDefined();
      const titleInput = screen.getByLabelText('Title');
      expect((titleInput as HTMLInputElement).value).toBe('Initial Story');
    });
  });
});
