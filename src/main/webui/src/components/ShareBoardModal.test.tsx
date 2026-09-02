// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import React from 'react';
import { ShareBoardModal } from './ShareBoardModal';
import * as api from '@/lib/api';

describe('ShareBoardModal', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders with members tab by default', async () => {
    vi.spyOn(api, 'getCollaborators').mockResolvedValue([
      {
        id: '1',
        userId: 'user-1',
        userEmail: 'alice@example.com',
        username: 'alice',
        role: 'OWNER',
        createdAt: '2026-09-01T10:00:00Z',
      },
    ]);
    vi.spyOn(api, 'getAccessRequests').mockResolvedValue([]);

    render(
      <ShareBoardModal
        isOpen={true}
        onClose={vi.fn()}
        boardId="test-board-id"
        boardName="Test Board"
        currentUserRole="OWNER"
        currentUserId="user-1"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Collaborators (1)')).toBeDefined();
      expect(screen.getByText('alice')).toBeDefined();
    });
  });

  it('renders with Pending Requests tab when initialTab is requests', async () => {
    vi.spyOn(api, 'getCollaborators').mockResolvedValue([
      {
        id: '1',
        userId: 'user-1',
        userEmail: 'alice@example.com',
        username: 'alice',
        role: 'OWNER',
        createdAt: '2026-09-01T10:00:00Z',
      },
    ]);
    vi.spyOn(api, 'getAccessRequests').mockResolvedValue([
      {
        id: 'req-1',
        whiteboardId: 'test-board-id',
        userId: 'user-2',
        userEmail: 'bob@example.com',
        username: 'bob',
        requestedRole: 'EDITOR',
        status: 'PENDING',
        message: 'Need editor access please',
        createdAt: '2026-09-02T10:00:00Z',
      },
    ]);

    render(
      <ShareBoardModal
        isOpen={true}
        onClose={vi.fn()}
        boardId="test-board-id"
        boardName="Test Board"
        currentUserRole="OWNER"
        currentUserId="user-1"
        initialTab="requests"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Pending Requests')).toBeDefined();
      expect(screen.getByText('bob')).toBeDefined();
      expect(screen.getByText('(bob@example.com)')).toBeDefined();
      expect(screen.getByText('"Need editor access please"')).toBeDefined();
      expect(screen.getByText(/Approve as EDITOR/i)).toBeDefined();
      expect(screen.getByText('Decline')).toBeDefined();
    });
  });
});
