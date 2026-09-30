// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { CollabOverlay } from './CollabOverlay';
import { PeerPresence } from '@/lib/useWhiteboardCollab';

describe('CollabOverlay Component', () => {
  afterEach(() => {
    cleanup();
  });

  const mockEditor: any = {
    canvas: {
      origin: [0, 0],
      scale: 1,
    },
    store: {
      idIndex: {
        'shape-1': {
          getRectInDCS: () => [
            [10, 10],
            [110, 60],
          ],
        },
        'shape-2': {
          getRectInDCS: () => [
            [200, 200],
            [300, 250],
          ],
        },
      },
    },
    onRepaint: {
      addListener: vi.fn(() => ({ dispose: vi.fn() })),
    },
  };

  it('renders remote cursors and selection boxes only for peers on the same activePageId', () => {
    const peers: PeerPresence[] = [
      {
        clientId: 1,
        user: { id: 'u1', name: 'Alice', color: '#ff0000' },
        pageId: 'page_1',
        cursor: [100, 150],
        selection: ['shape-1'],
        lastUpdated: Date.now(),
      },
      {
        clientId: 2,
        user: { id: 'u2', name: 'Bob', color: '#00ff00' },
        pageId: 'page_2',
        cursor: [300, 400],
        selection: ['shape-2'],
        lastUpdated: Date.now(),
      },
    ];

    const { rerender } = render(
      <CollabOverlay
        editor={mockEditor}
        peers={peers}
        activePageId="page_1"
        showCursors={true}
        showLabels={true}
      />
    );

    // Alice is on page_1, so her label, cursor, and selection are rendered
    expect(screen.getAllByText('Alice')).toHaveLength(2);
    // Bob is on page_2, so he is filtered out
    expect(screen.queryAllByText('Bob')).toHaveLength(0);

    // When local active page changes to page_2, Bob should now be rendered and Alice hidden
    rerender(
      <CollabOverlay
        editor={mockEditor}
        peers={peers}
        activePageId="page_2"
        showCursors={true}
        showLabels={true}
      />
    );

    expect(screen.queryAllByText('Alice')).toHaveLength(0);
    expect(screen.getAllByText('Bob')).toHaveLength(2);
  });

  it('renders legacy peer without pageId as fallback', () => {
    const peers: PeerPresence[] = [
      {
        clientId: 1,
        user: { id: 'u1', name: 'Charlie', color: '#0000ff' },
        cursor: [50, 50],
        selection: [],
        lastUpdated: Date.now(),
      },
    ];

    render(
      <CollabOverlay
        editor={mockEditor}
        peers={peers}
        activePageId="page_1"
        showCursors={true}
        showLabels={true}
      />
    );

    expect(screen.getByText('Charlie')).toBeDefined();
  });
});
