// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { Group } from '@dgmjs/core';
import { ShapeContextMenu } from './ShapeContextMenu';
import { WHITEBOARD_COLORS } from './WhiteboardToolbar';

describe('ShapeContextMenu Component', () => {
  afterEach(() => {
    cleanup();
  });
  const defaultProps = {
    position: { x: 100, y: 150 },
    shapes: [{ id: 'box1', _type: 'Box', strokeColor: '#000000', fillColor: '#ffffff' }],
    onBringToFront: vi.fn(),
    onSendToBack: vi.fn(),
    onColorChange: vi.fn(),
    onTextStyling: vi.fn(),
    onRotate: vi.fn(),
    onToggleLock: vi.fn(),
    onGroup: vi.fn(),
    onUngroup: vi.fn(),
    onSetLineArrow: vi.fn(),
    onClose: vi.fn(),
  };

  it('renders menu items for layer ordering, colors, text styling, rotation, and locking', () => {
    render(<ShapeContextMenu {...defaultProps} />);

    expect(screen.getByText('Bring to Foreground')).toBeDefined();
    expect(screen.getByText('Send to Background')).toBeDefined();
    expect(screen.getByText('Lock Shape')).toBeDefined();
    expect(screen.getByText(/Markdown supported:/i)).toBeDefined();

    // Verify all 7 color swatches are rendered
    WHITEBOARD_COLORS.forEach((c) => {
      expect(screen.getByTitle(c.name)).toBeDefined();
    });
  });

  it('triggers onBringToFront and onSendToBack callbacks and closes menu', () => {
    const onBringToFront = vi.fn();
    const onSendToBack = vi.fn();
    const onClose = vi.fn();

    const { rerender } = render(
      <ShapeContextMenu
        {...defaultProps}
        onBringToFront={onBringToFront}
        onSendToBack={onSendToBack}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText('Bring to Foreground'));
    expect(onBringToFront).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();

    rerender(
      <ShapeContextMenu
        {...defaultProps}
        onBringToFront={onBringToFront}
        onSendToBack={onSendToBack}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText('Send to Background'));
    expect(onSendToBack).toHaveBeenCalled();
  });

  it('triggers onColorChange when a color swatch is clicked', () => {
    const onColorChange = vi.fn();
    const onClose = vi.fn();

    render(
      <ShapeContextMenu
        {...defaultProps}
        onColorChange={onColorChange}
        onClose={onClose}
      />
    );

    const redSwatch = screen.getByTitle('Red');
    fireEvent.click(redSwatch);
    expect(onColorChange).toHaveBeenCalledWith({ stroke: '#d0021b', fill: '#f8d7da' });
    expect(onClose).toHaveBeenCalled();
  });

  it('triggers text styling callbacks for bold, italic, and clear', () => {
    const onTextStyling = vi.fn();

    render(<ShapeContextMenu {...defaultProps} onTextStyling={onTextStyling} />);

    fireEvent.click(screen.getByTitle('Toggle Bold'));
    expect(onTextStyling).toHaveBeenCalledWith('bold');

    fireEvent.click(screen.getByTitle('Toggle Italic'));
    expect(onTextStyling).toHaveBeenCalledWith('italic');

    fireEvent.click(screen.getByTitle('Clear Formatting'));
    expect(onTextStyling).toHaveBeenCalledWith('clear');
  });

  it('triggers rotation callbacks for +90, -90, and reset 0', () => {
    const onRotate = vi.fn();

    render(<ShapeContextMenu {...defaultProps} onRotate={onRotate} />);

    fireEvent.click(screen.getByTitle('Rotate 90° Clockwise'));
    expect(onRotate).toHaveBeenCalledWith(90);

    fireEvent.click(screen.getByTitle('Rotate 90° Counter-Clockwise'));
    expect(onRotate).toHaveBeenCalledWith(-90);

    fireEvent.click(screen.getByTitle('Reset Rotation (0°)'));
    expect(onRotate).toHaveBeenCalledWith(0, true);
  });

  it('shows Unlock option when shape is locked', () => {
    render(
      <ShapeContextMenu
        {...defaultProps}
        shapes={[{ id: 's1', isLocked: true }]}
      />
    );

    expect(screen.getByText('Unlock Shape')).toBeDefined();
  });

  it('renders Group button when multiple shapes are selected', () => {
    const onGroup = vi.fn();
    const onClose = vi.fn();

    render(
      <ShapeContextMenu
        {...defaultProps}
        shapes={[{ id: 's1' }, { id: 's2' }]}
        onGroup={onGroup}
        onClose={onClose}
      />
    );

    const groupBtn = screen.getByText('Group Shapes');
    expect(groupBtn).toBeDefined();

    fireEvent.click(groupBtn);
    expect(onGroup).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('renders Ungroup button when a group shape is selected', () => {
    const onUngroup = vi.fn();
    const onClose = vi.fn();

    render(
      <ShapeContextMenu
        {...defaultProps}
        shapes={[{ id: 'g1', _type: 'Group', children: [] }]}
        onUngroup={onUngroup}
        onClose={onClose}
      />
    );

    const ungroupBtn = screen.getByText('Ungroup');
    expect(ungroupBtn).toBeDefined();

    fireEvent.click(ungroupBtn);
    expect(onUngroup).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('renders Ungroup button when a live Group instance is selected', () => {
    const onUngroup = vi.fn();
    const onClose = vi.fn();
    const liveGroup = new Group();

    render(
      <ShapeContextMenu
        {...defaultProps}
        shapes={[liveGroup]}
        onUngroup={onUngroup}
        onClose={onClose}
      />
    );

    const ungroupBtn = screen.getByText('Ungroup');
    expect(ungroupBtn).toBeDefined();

    fireEvent.click(ungroupBtn);
    expect(onUngroup).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('renders Line Arrowhead controls when open line shape is selected', () => {
    const onSetLineArrow = vi.fn();

    render(
      <ShapeContextMenu
        {...defaultProps}
        shapes={[{ id: 'l1', _type: 'Line', path: [[0, 0], [100, 100]], headEndType: 'flat', tailEndType: 'flat' }]}
        onSetLineArrow={onSetLineArrow}
      />
    );

    expect(screen.getByText('Line Arrows')).toBeDefined();
    expect(screen.getByText('Start (Tail)')).toBeDefined();
    expect(screen.getByText('End (Head)')).toBeDefined();

    fireEvent.click(screen.getByTitle('Start Arrow'));
    expect(onSetLineArrow).toHaveBeenCalledWith('tail', 'arrow');

    fireEvent.click(screen.getByTitle('End Arrow'));
    expect(onSetLineArrow).toHaveBeenCalledWith('head', 'arrow');
  });

  it('does NOT render Line Arrowhead controls for closed polygon shapes like Triangles or Diamonds', () => {
    const triangle = {
      id: 't1',
      _type: 'Line',
      path: [[50, 0], [100, 100], [0, 100], [50, 0]],
      headEndType: 'flat',
      tailEndType: 'flat',
    };

    const { rerender } = render(
      <ShapeContextMenu
        {...defaultProps}
        shapes={[triangle]}
      />
    );

    expect(screen.queryByText('Line Arrows')).toBeNull();

    const diamond = {
      id: 'd1',
      _type: 'Line',
      path: [[50, 0], [100, 50], [50, 100], [0, 50], [50, 0]],
      headEndType: 'flat',
      tailEndType: 'flat',
    };

    rerender(
      <ShapeContextMenu
        {...defaultProps}
        shapes={[diamond]}
      />
    );

    expect(screen.queryByText('Line Arrows')).toBeNull();
  });

  it('dismisses when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<ShapeContextMenu {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  describe('Dot-Voting layout & actions', () => {
    const sampleVotingConfig = {
      enabled: true,
      isLocked: false,
      maxVotesPerUser: 5,
      categories: [
        { id: 'cat-1', name: 'High Priority', color: '#ef4444', comment: 'Critical items' },
        { id: 'cat-2', name: 'Quick Win', color: '#10b981', comment: 'Low effort' },
      ],
    };

    it('directly renders voting categories in the right pane without an expansion toggle', () => {
      render(
        <ShapeContextMenu
          {...defaultProps}
          votingConfig={sampleVotingConfig}
          userVotesUsed={2}
        />
      );

      // Verify Dot-Voting section and quota counter
      expect(screen.getByText('Dot-Voting')).toBeDefined();
      expect(screen.getByText('2/5')).toBeDefined();

      // Verify categories are directly rendered and visible
      expect(screen.getByText('High Priority')).toBeDefined();
      expect(screen.getByText('Quick Win')).toBeDefined();

      // Collapsible toggle should no longer exist
      expect(screen.queryByText('Vote on Shape')).toBeNull();
    });

    it('directly triggers onVote with categoryId and shapeId and closes menu when a category is clicked', () => {
      const onVote = vi.fn();
      const onClose = vi.fn();

      render(
        <ShapeContextMenu
          {...defaultProps}
          votingConfig={sampleVotingConfig}
          onVote={onVote}
          onClose={onClose}
        />
      );

      const highPriorityBtn = screen.getByText('High Priority');
      fireEvent.click(highPriorityBtn);

      expect(onVote).toHaveBeenCalledWith('box1', 'cat-1');
      expect(onClose).toHaveBeenCalled();
    });

    it('renders locked status when voting session is locked', () => {
      render(
        <ShapeContextMenu
          {...defaultProps}
          votingConfig={{ ...sampleVotingConfig, isLocked: true }}
        />
      );

      expect(screen.getByText('Voting is Locked')).toBeDefined();
      expect(screen.queryByText('High Priority')).toBeNull();
    });

    it('renders quota reached message when user has exhausted their voting quota', () => {
      render(
        <ShapeContextMenu
          {...defaultProps}
          votingConfig={sampleVotingConfig}
          userVotesUsed={5}
        />
      );

      expect(screen.getByText('Vote quota reached (5/5)')).toBeDefined();
      expect(screen.queryByText('High Priority')).toBeNull();
    });

    it('renders Remove My Vote button and triggers onRemoveVote when user has votes on the shape', () => {
      const onRemoveVote = vi.fn();
      const onClose = vi.fn();
      const shapeWithVote = {
        id: 'box1',
        _type: 'Box',
        customData: {
          votes: [
            {
              id: 'vote-123',
              userId: 'user-1',
              userName: 'Alice',
              categoryId: 'cat-1',
              createdAt: '2026-09-07T10:00:00Z',
            },
          ],
        },
      };

      render(
        <ShapeContextMenu
          {...defaultProps}
          shapes={[shapeWithVote]}
          votingConfig={sampleVotingConfig}
          currentUserId="user-1"
          onRemoveVote={onRemoveVote}
          onClose={onClose}
        />
      );

      const removeBtn = screen.getByText(/Remove My Vote/i);
      expect(removeBtn).toBeDefined();

      fireEvent.click(removeBtn);
      expect(onRemoveVote).toHaveBeenCalledWith('box1', 'vote-123');
      expect(onClose).toHaveBeenCalled();
    });

    it('does not render Dot-Voting section if votingConfig is disabled', () => {
      render(
        <ShapeContextMenu
          {...defaultProps}
          votingConfig={{ ...sampleVotingConfig, enabled: false }}
        />
      );

      expect(screen.queryByText('Dot-Voting')).toBeNull();
    });
  });
});
