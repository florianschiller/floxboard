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

  it('navigates to Voting & Facilitation tab and displays voting configuration', () => {
    render(<WhiteboardConfigModal {...defaultProps} initialTab="voting" />);

    expect(screen.getByText('Voting Session Status')).toBeDefined();
    expect(screen.getByText('Active (Voting Open)')).toBeDefined();
    expect(screen.getByText('Per-User Vote Limit')).toBeDefined();
    expect(screen.getByLabelText('Max Votes Per User')).toBeDefined();
    expect(screen.getByText(/Voting Categories/)).toBeDefined();
    expect(screen.getByText('High Priority')).toBeDefined();
    expect(screen.getAllByText('Reset All Votes').length).toBeGreaterThan(0);
  });

  it('allows owner to toggle voting session lock status', () => {
    const onUpdateVotingConfig = vi.fn();
    render(
      <WhiteboardConfigModal
        {...defaultProps}
        initialTab="voting"
        onUpdateVotingConfig={onUpdateVotingConfig}
      />
    );

    const lockToggle = screen.getByRole('switch', { name: /Toggle Voting Session Lock/i });
    fireEvent.click(lockToggle);

    expect(onUpdateVotingConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        isLocked: true,
      })
    );
  });

  it('allows owner to adjust per-user vote limit quota', () => {
    const onUpdateVotingConfig = vi.fn();
    render(
      <WhiteboardConfigModal
        {...defaultProps}
        initialTab="voting"
        onUpdateVotingConfig={onUpdateVotingConfig}
      />
    );

    const maxVotesInput = screen.getByLabelText('Max Votes Per User');
    fireEvent.change(maxVotesInput, { target: { value: '8' } });

    expect(onUpdateVotingConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        maxVotesPerUser: 8,
      })
    );
  });

  it('allows owner to add a new voting category with name, comment, and color', () => {
    const onUpdateVotingConfig = vi.fn();
    render(
      <WhiteboardConfigModal
        {...defaultProps}
        initialTab="voting"
        onUpdateVotingConfig={onUpdateVotingConfig}
      />
    );

    const addBtn = screen.getByRole('button', { name: /Add Category/i });
    fireEvent.click(addBtn);

    const nameInput = screen.getByPlaceholderText(/High Priority, Feasibility/i);
    const commentInput = screen.getByPlaceholderText(/Highest business value/i);

    fireEvent.change(nameInput, { target: { value: 'Cost Efficiency' } });
    fireEvent.change(commentInput, { target: { value: 'Lowest resource expenditure' } });

    const submitBtn = screen.getByRole('button', { name: /Add Category/i });
    fireEvent.click(submitBtn);

    expect(onUpdateVotingConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        categories: expect.arrayContaining([
          expect.objectContaining({
            name: 'Cost Efficiency',
            comment: 'Lowest resource expenditure',
          }),
        ]),
      })
    );
  });

  it('allows owner to edit and delete categories and handles reset all votes flow', () => {
    const onUpdateVotingConfig = vi.fn();
    const onResetAllVotes = vi.fn();

    render(
      <WhiteboardConfigModal
        {...defaultProps}
        initialTab="voting"
        onUpdateVotingConfig={onUpdateVotingConfig}
        onResetAllVotes={onResetAllVotes}
      />
    );

    // Edit category
    const editButtons = screen.getAllByLabelText(/Edit /i);
    fireEvent.click(editButtons[0]);

    const nameInput = screen.getByDisplayValue('High Priority');
    fireEvent.change(nameInput, { target: { value: 'Urgent Priority' } });

    const saveBtn = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveBtn);

    expect(onUpdateVotingConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        categories: expect.arrayContaining([
          expect.objectContaining({
            name: 'Urgent Priority',
          }),
        ]),
      })
    );

    // Delete category
    const deleteButtons = screen.getAllByLabelText(/Delete /i);
    fireEvent.click(deleteButtons[0]);
    expect(onUpdateVotingConfig).toHaveBeenCalled();

    // Reset all votes flow
    const resetBtn = screen.getByRole('button', { name: /Reset All Votes/i });
    fireEvent.click(resetBtn);

    expect(screen.getByText('Are you sure? This cannot be undone.')).toBeDefined();
    const confirmResetBtn = screen.getByRole('button', { name: /Yes, Reset All Votes/i });
    fireEvent.click(confirmResetBtn);

    expect(onResetAllVotes).toHaveBeenCalled();
  });

  it('maintains active tab when votingConfig prop updates while modal is open', () => {
    const initialVotingConfig = {
      enabled: true,
      isLocked: false,
      maxVotesPerUser: 5,
      categories: [
        { id: 'cat-1', name: 'High Priority', color: '#ef4444', comment: 'Critical items' },
      ],
    };

    const { rerender } = render(
      <WhiteboardConfigModal
        {...defaultProps}
        initialTab="general"
        votingConfig={initialVotingConfig}
      />
    );

    // Switch tab to Voting
    const votingTabBtn = screen.getByRole('button', { name: /Voting & Facilitation/i });
    fireEvent.click(votingTabBtn);

    expect(screen.getByText('Voting Session Status')).toBeDefined();

    // Rerender with updated votingConfig as happens when saving a category
    const updatedVotingConfig = {
      ...initialVotingConfig,
      categories: [
        ...initialVotingConfig.categories,
        { id: 'cat-new', name: 'Strategic Alignment', color: '#10b981', comment: 'Strategy' },
      ],
    };

    rerender(
      <WhiteboardConfigModal
        {...defaultProps}
        initialTab="general"
        votingConfig={updatedVotingConfig}
      />
    );

    // Should still be on Voting tab, not reset to general
    expect(screen.getByText('Voting Session Status')).toBeDefined();
    expect(screen.getByText('Strategic Alignment')).toBeDefined();
    expect(screen.queryByLabelText('Board Title')).toBeNull();
  });
});
