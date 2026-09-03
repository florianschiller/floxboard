// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { WhiteboardConfigModal, CanvasConfig } from './WhiteboardConfigModal';

describe('WhiteboardConfigModal', () => {
  const defaultCanvasConfig: CanvasConfig = {
    gridStyle: 'grid',
    theme: 'slate',
    snapToGrid: true,
    showCollaboratorCursors: true,
    showPeerLabels: true,
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    boardId: 'test-board-123',
    boardName: 'My Awesome Board',
    currentUserRole: 'OWNER' as const,
    createdAt: '2026-09-01T12:00:00Z',
    updatedAt: '2026-09-02T15:30:00Z',
    canvasConfig: defaultCanvasConfig,
    onUpdateCanvasConfig: vi.fn(),
    onRenameBoard: vi.fn().mockResolvedValue(undefined),
    onClearCanvas: vi.fn(),
    onDeleteBoard: vi.fn(),
  };

  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<WhiteboardConfigModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders General tab by default with board metadata and details', () => {
    render(<WhiteboardConfigModal {...defaultProps} />);

    expect(screen.getByText('Whiteboard Settings')).toBeDefined();
    expect(screen.getByDisplayValue('My Awesome Board')).toBeDefined();
    expect(screen.getByText('test-board-123')).toBeDefined();
    expect(screen.getAllByText('OWNER').length).toBeGreaterThan(0);
    expect(screen.getByText(/General/)).toBeDefined();
    expect(screen.getByText(/Canvas & View/)).toBeDefined();
    expect(screen.getByText(/Collaboration/)).toBeDefined();
    expect(screen.getByText(/Danger Zone/)).toBeDefined();
  });

  it('allows owner/admin to rename board and shows success feedback', async () => {
    const onRenameBoard = vi.fn().mockResolvedValue(undefined);
    render(<WhiteboardConfigModal {...defaultProps} onRenameBoard={onRenameBoard} />);

    const input = screen.getByDisplayValue('My Awesome Board');
    fireEvent.change(input, { target: { value: 'Renamed Board' } });

    const renameBtn = screen.getByRole('button', { name: /Rename/i });
    expect(renameBtn).toBeDefined();
    fireEvent.click(renameBtn);

    await waitFor(() => {
      expect(onRenameBoard).toHaveBeenCalledWith('Renamed Board');
      expect(screen.getByText('Board name updated successfully.')).toBeDefined();
    });
  });

  it('disables board renaming for viewer/editor roles', () => {
    render(<WhiteboardConfigModal {...defaultProps} currentUserRole="VIEWER" />);

    const input = screen.getByDisplayValue('My Awesome Board');
    expect(input.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/Only board owners and admins can rename this board/i)).toBeDefined();
    expect(screen.queryByRole('button', { name: /Rename/i })).toBeNull();
  });

  it('copies board ID to clipboard on copy button click', async () => {
    render(<WhiteboardConfigModal {...defaultProps} />);

    const copyBtn = screen.getByTitle('Copy ID');
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test-board-123');
  });

  it('navigates to Canvas & View tab and triggers configuration changes', () => {
    const onUpdateCanvasConfig = vi.fn();
    render(<WhiteboardConfigModal {...defaultProps} onUpdateCanvasConfig={onUpdateCanvasConfig} />);

    // Click Canvas & View tab
    const canvasTab = screen.getByRole('button', { name: /Canvas & View/i });
    fireEvent.click(canvasTab);

    expect(screen.getByText('Grid Style')).toBeDefined();
    expect(screen.getByText('Canvas Background Theme')).toBeDefined();
    expect(screen.getByText('Snap to Grid')).toBeDefined();
    expect(screen.queryByText('Dots')).toBeNull();

    // Click None option
    const noneOption = screen.getByText('Blank background');
    fireEvent.click(noneOption);
    expect(onUpdateCanvasConfig).toHaveBeenCalledWith({
      ...defaultCanvasConfig,
      gridStyle: 'none',
    });

    // Click Grid option
    const gridOption = screen.getByText('Lined grid squares');
    fireEvent.click(gridOption);
    expect(onUpdateCanvasConfig).toHaveBeenCalledWith({
      ...defaultCanvasConfig,
      gridStyle: 'grid',
    });

    // Click Light Slate theme
    const lightSlateTheme = screen.getByText('Light Slate');
    fireEvent.click(lightSlateTheme);
    expect(onUpdateCanvasConfig).toHaveBeenCalledWith({
      ...defaultCanvasConfig,
      theme: 'lightSlate',
    });

    // Toggle snap to grid
    const snapToggle = screen.getByRole('switch', { name: '' });
    fireEvent.click(snapToggle);
    expect(onUpdateCanvasConfig).toHaveBeenCalledWith({
      ...defaultCanvasConfig,
      snapToGrid: false,
    });
  });

  it('navigates to Collaboration tab and toggles presence settings', () => {
    const onUpdateCanvasConfig = vi.fn();
    render(<WhiteboardConfigModal {...defaultProps} onUpdateCanvasConfig={onUpdateCanvasConfig} />);

    const collabTab = screen.getByRole('button', { name: /Collaboration/i });
    fireEvent.click(collabTab);

    expect(screen.getByText('Live Collaborator Cursors')).toBeDefined();
    expect(screen.getByText('Collaborator Name Badges')).toBeDefined();

    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBe(2);

    // Toggle cursors
    fireEvent.click(switches[0]);
    expect(onUpdateCanvasConfig).toHaveBeenCalledWith({
      ...defaultCanvasConfig,
      showCollaboratorCursors: false,
    });

    // Toggle name badges
    fireEvent.click(switches[1]);
    expect(onUpdateCanvasConfig).toHaveBeenCalledWith({
      ...defaultCanvasConfig,
      showPeerLabels: false,
    });
  });

  it('displays danger zone with clear canvas and delete board confirmation flows for owners', async () => {
    const onClearCanvas = vi.fn();
    const onDeleteBoard = vi.fn();

    render(
      <WhiteboardConfigModal
        {...defaultProps}
        onClearCanvas={onClearCanvas}
        onDeleteBoard={onDeleteBoard}
        initialTab="danger"
      />
    );

    expect(screen.getByText('Clear All Canvas Shapes')).toBeDefined();
    expect(screen.getAllByText('Delete Whiteboard').length).toBeGreaterThan(0);

    // Clear Canvas flow
    const clearBtn = screen.getByRole('button', { name: /Clear Canvas Shapes/i });
    fireEvent.click(clearBtn);

    expect(screen.getByText('Are you sure? This cannot be undone.')).toBeDefined();
    const confirmClearBtn = screen.getByRole('button', { name: /Yes, Clear Canvas/i });
    fireEvent.click(confirmClearBtn);

    expect(onClearCanvas).toHaveBeenCalled();
    expect(screen.getByText('Canvas shapes have been cleared.')).toBeDefined();

    // Delete Board flow
    const deleteBtn = screen.getByRole('button', { name: /Delete Whiteboard/i });
    fireEvent.click(deleteBtn);

    expect(screen.getByText(/Are you completely sure\? This is irreversible\./i)).toBeDefined();
    const confirmDeleteBtn = screen.getByRole('button', { name: /Yes, Delete Board/i });
    fireEvent.click(confirmDeleteBtn);

    expect(onDeleteBoard).toHaveBeenCalled();
  });

  it('locks danger zone actions for non-owner/non-admin roles', () => {
    render(<WhiteboardConfigModal {...defaultProps} currentUserRole="EDITOR" initialTab="danger" />);

    expect(screen.getByText(/You must be a board/i)).toBeDefined();
    expect(screen.getByText('Owner')).toBeDefined();
    expect(screen.queryByRole('button', { name: /Clear Canvas Shapes/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Delete Whiteboard/i })).toBeNull();
  });

  it('calls onClose when close icon or close button is clicked or Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<WhiteboardConfigModal {...defaultProps} onClose={onClose} />);

    // Click close icon in header
    const closeButtons = screen.getAllByRole('button', { name: /Close/i });
    fireEvent.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Press Escape key
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
