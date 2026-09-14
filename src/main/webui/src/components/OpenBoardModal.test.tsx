// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import React from 'react';
import { OpenBoardModal } from './OpenBoardModal';
import * as api from '@/lib/api';

vi.mock('@/lib/api');

describe('OpenBoardModal', () => {
  beforeEach(() => {
    vi.mocked(api.listWhiteboards).mockResolvedValue([
      {
        id: 'board-1',
        name: 'Project Alpha',
        updatedAt: '2026-09-01T10:00:00Z',
        role: 'OWNER',
      } as any,
    ]);
    vi.mocked(api.listSharedWhiteboards).mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <OpenBoardModal
        isOpen={false}
        onClose={vi.fn()}
        onSelectBoard={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal with New Whiteboard button and triggers onNewBoard and onClose when clicked', async () => {
    const onNewBoard = vi.fn();
    const onClose = vi.fn();
    const onSelectBoard = vi.fn();

    await act(async () => {
      render(
        <OpenBoardModal
          isOpen={true}
          onClose={onClose}
          onSelectBoard={onSelectBoard}
          onNewBoard={onNewBoard}
        />
      );
    });

    expect(screen.getByText('Open Whiteboard')).toBeDefined();
    const newBoardBtn = screen.getByRole('button', { name: /New Whiteboard/i });
    expect(newBoardBtn).toBeDefined();

    fireEvent.click(newBoardBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onNewBoard).toHaveBeenCalledTimes(1);
  });

  it('renders board items and invokes onSelectBoard when a board item is clicked', async () => {
    const onSelectBoard = vi.fn();

    await act(async () => {
      render(
        <OpenBoardModal
          isOpen={true}
          onClose={vi.fn()}
          onSelectBoard={onSelectBoard}
        />
      );
    });

    const boardItem = await screen.findByText('Project Alpha');
    expect(boardItem).toBeDefined();

    fireEvent.click(boardItem);
    expect(onSelectBoard).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'board-1',
        name: 'Project Alpha',
      })
    );
  });
});
