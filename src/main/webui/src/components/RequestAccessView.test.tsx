// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { RequestAccessView } from './RequestAccessView';
import { ThemeProvider } from '@/lib/themeContext';
import * as api from '@/lib/api';

describe('RequestAccessView', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.spyOn(api, 'getBoardRole').mockResolvedValue(null as any);
    vi.spyOn(api, 'getMyAccessRequest').mockResolvedValue(null as any);
  });

  it('renders request access form with role buttons and submits access request', async () => {
    const requestAccessMock = vi.spyOn(api, 'requestAccess').mockResolvedValue({
      id: 'req-1',
      boardId: 'board-123',
      userId: 'user-1',
      userEmail: 'user@floxboard.io',
      userName: 'User One',
      requestedRole: 'EDITOR',
      status: 'PENDING',
      message: 'Need edit access for collaboration',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    render(
      <ThemeProvider defaultTheme="dark">
        <MemoryRouter>
          <RequestAccessView boardId="board-123" />
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(screen.getByText('Access Required')).toBeDefined();
    expect(screen.getByText('Desired Permission Role')).toBeDefined();

    const editorBtn = screen.getByRole('button', { name: 'Editor' });
    expect(editorBtn).toBeDefined();

    const textarea = screen.getByPlaceholderText(/e\.g\. Hi, I'm working on the architecture diagram with you/i);
    fireEvent.change(textarea, { target: { value: 'Need edit access for collaboration' } });

    const submitBtn = screen.getByRole('button', { name: 'Submit Access Request' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(requestAccessMock).toHaveBeenCalledWith('board-123', 'EDITOR', 'Need edit access for collaboration');
    });
  });

  it('renders pending status card when an existing access request is pending', async () => {
    vi.spyOn(api, 'getMyAccessRequest').mockResolvedValue({
      id: 'req-2',
      boardId: 'board-123',
      userId: 'user-1',
      userEmail: 'user@floxboard.io',
      userName: 'User One',
      requestedRole: 'ADMIN',
      status: 'PENDING',
      message: 'Please grant admin access',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    render(
      <ThemeProvider defaultTheme="light">
        <MemoryRouter>
          <RequestAccessView boardId="board-123" />
        </MemoryRouter>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Pending Approval')).toBeDefined();
      expect(screen.getByText('ADMIN')).toBeDefined();
    });
  });
});
