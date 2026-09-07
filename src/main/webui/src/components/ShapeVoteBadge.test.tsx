// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { ShapeVoteBadge } from './ShapeVoteBadge';
import { WhiteboardVotingConfig, ShapeVote } from '@/types/voting';

describe('ShapeVoteBadge Component', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });
  const mockVotingConfig: WhiteboardVotingConfig = {
    enabled: true,
    isLocked: false,
    maxVotesPerUser: 5,
    categories: [
      { id: 'cat-priority', name: 'High Priority', color: '#ef4444', comment: 'Urgent' },
      { id: 'cat-feasibility', name: 'High Feasibility', color: '#10b981', comment: 'Easy' },
    ],
  };

  const createMockEditor = (
    shapes: any[],
    canvasOptions: { scale?: number; origin?: [number, number] } = {}
  ) => {
    const idIndex: Record<string, any> = {};
    shapes.forEach((s) => {
      idIndex[s.id] = s;
    });

    return {
      canvas: {
        scale: canvasOptions.scale ?? 1,
        origin: canvasOptions.origin ?? [0, 0],
      },
      store: {
        idIndex,
      },
      onRepaint: {
        addListener: vi.fn(() => ({ dispose: vi.fn() })),
      },
    } as any;
  };

  it('renders vote badge with vote count and category indicators on standard baseline shapes', () => {
    const mockShape = {
      id: 'shape-1',
      type: 'Rectangle',
      getBoundingRect: () => [
        [100, 100],
        [250, 250],
      ],
      customData: {
        votes: [
          {
            id: 'v-1',
            userId: 'user-alice',
            userName: 'Alice',
            categoryId: 'cat-priority',
            createdAt: '2026-09-07T10:00:00Z',
          },
          {
            id: 'v-2',
            userId: 'user-bob',
            userName: 'Bob',
            categoryId: 'cat-feasibility',
            createdAt: '2026-09-07T10:05:00Z',
          },
        ] as ShapeVote[],
      },
    };

    const editor = createMockEditor([mockShape]);

    render(
      <ShapeVoteBadge
        editor={editor}
        votingConfig={mockVotingConfig}
        currentUserId="user-alice"
        currentUserName="Alice"
        userVotesUsed={1}
      />
    );

    const badge = screen.getByTestId('shape-vote-badge');
    expect(badge).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();

    const container = screen.getByTestId('shape-vote-badge-container-shape-1');
    // 150x150 shape -> shapeDim: 150 -> shapeScaleFactor: 1.0, effectiveScale: 1.0, offset: 6px
    // maxX: 250, maxY: 250 -> left: 244px, top: 244px
    expect(container.style.left).toBe('244px');
    expect(container.style.top).toBe('244px');
    expect(container.style.transform).toBe('translate(-100%, -100%) scale(1)');
    expect(container.style.transformOrigin).toBe('bottom right');
  });

  it('sizes and positions badge proportionally on small shapes with clamped minimum scale', () => {
    const mockShape = {
      id: 'shape-small',
      type: 'StickyNote',
      getBoundingRect: () => [
        [10, 10],
        [85, 85],
      ],
      customData: {
        votes: [
          {
            id: 'v-small',
            userId: 'user-alice',
            userName: 'Alice',
            categoryId: 'cat-priority',
          },
        ] as ShapeVote[],
      },
    };

    const editor = createMockEditor([mockShape]);

    render(
      <ShapeVoteBadge
        editor={editor}
        votingConfig={mockVotingConfig}
        currentUserId="user-alice"
        currentUserName="Alice"
        userVotesUsed={1}
      />
    );

    const container = screen.getByTestId('shape-vote-badge-container-shape-small');
    // 75x75 shape -> shapeDim: 75 -> 75/150 = 0.5 clamped to 0.6
    // effectiveScale: 0.6, offset: 6 * 0.6 = 3.6px
    // maxX: 85, maxY: 85 -> left: 85 - 3.6 = 81.4px, top: 85 - 3.6 = 81.4px
    expect(container.style.left).toBe('81.4px');
    expect(container.style.top).toBe('81.4px');
    expect(container.style.transform).toBe('translate(-100%, -100%) scale(0.6)');
    expect(container.style.transformOrigin).toBe('bottom right');
  });

  it('sizes and positions badge proportionally on large shapes with clamped maximum scale, zoom, and pan', () => {
    const mockShape = {
      id: 'shape-large-zoom-pan',
      type: 'Rectangle',
      getBoundingRect: () => [
        [0, 0],
        [450, 300],
      ],
      customData: {
        votes: [
          {
            id: 'v-large',
            userId: 'user-alice',
            userName: 'Alice',
            categoryId: 'cat-priority',
          },
        ] as ShapeVote[],
      },
    };

    // 450x300 shape -> shapeDim: 300 -> 300/150 = 2.0 clamped to 1.6
    // Zoom 1.5x, origin [100, 50]
    // effectiveScale = 1.5 * 1.6 = 2.4
    // screenMaxX = (450 + 100) * 1.5 = 825px
    // screenMaxY = (300 + 50) * 1.5 = 525px
    // offset = 6 * 2.4 = 14.4px
    // left = 825 - 14.4 = 810.6px, top = 525 - 14.4 = 510.6px
    const editor = createMockEditor([mockShape], { scale: 1.5, origin: [100, 50] });

    render(
      <ShapeVoteBadge
        editor={editor}
        votingConfig={mockVotingConfig}
        currentUserId="user-alice"
        currentUserName="Alice"
        userVotesUsed={1}
      />
    );

    const container = screen.getByTestId('shape-vote-badge-container-shape-large-zoom-pan');
    expect(container.style.left).toBe('810.6px');
    expect(container.style.top).toBe('510.6px');
    expect(container.style.transform).toBe(`translate(-100%, -100%) scale(${1.5 * 1.6})`);
    expect(container.style.transformOrigin).toBe('bottom right');
  });

  it('accurately positions and scales the badge with fallback shape dimensions (left, top, width, height)', () => {
    const mockShape = {
      id: 'shape-fallback',
      type: 'Frame',
      left: 50,
      top: 60,
      width: 200,
      height: 140,
      customData: {
        votes: [
          {
            id: 'v-fb',
            userId: 'user-bob',
            userName: 'Bob',
            categoryId: 'cat-feasibility',
          },
        ] as ShapeVote[],
      },
    };

    // Frame: width 200, height 140 -> min dim = 140 -> scale factor = 140/150
    // Zoom 0.5x, origin [50, 20]
    // effectiveScale = 0.5 * (140/150) = 70/150 (~0.4666666666666667)
    // maxX = 50 + 200 = 250, maxY = 60 + 140 = 200
    // screenMaxX = (250 + 50) * 0.5 = 150px
    // screenMaxY = (200 + 20) * 0.5 = 110px
    // offset = 6 * (70/150) = 2.8px
    // left: 150 - 2.8 = 147.2px, top: 110 - 2.8 = 107.2px
    const editor = createMockEditor([mockShape], { scale: 0.5, origin: [50, 20] });

    render(
      <ShapeVoteBadge
        editor={editor}
        votingConfig={mockVotingConfig}
        currentUserId="user-alice"
        currentUserName="Alice"
        userVotesUsed={1}
      />
    );

    const container = screen.getByTestId('shape-vote-badge-container-shape-fallback');
    expect(container.style.left).toBe('147.2px');
    expect(container.style.top).toBe('107.2px');
    expect(container.style.transform).toBe(`translate(-100%, -100%) scale(${70 / 150})`);
    expect(container.style.transformOrigin).toBe('bottom right');
  });

  it('displays voter breakdown popover on hover and allows user to remove their vote', () => {
    const onRemoveVote = vi.fn();
    const mockShape = {
      id: 'shape-1',
      type: 'Rectangle',
      getBoundingRect: () => [
        [100, 100],
        [200, 200],
      ],
      customData: {
        votes: [
          {
            id: 'v-1',
            userId: 'user-alice',
            userName: 'Alice',
            categoryId: 'cat-priority',
            createdAt: '2026-09-07T10:00:00Z',
          },
        ] as ShapeVote[],
      },
    };

    const editor = createMockEditor([mockShape]);

    render(
      <ShapeVoteBadge
        editor={editor}
        votingConfig={mockVotingConfig}
        currentUserId="user-alice"
        currentUserName="Alice"
        userVotesUsed={1}
        onRemoveVote={onRemoveVote}
      />
    );

    const container = screen.getByTestId('shape-vote-badge-container-shape-1');
    fireEvent.mouseEnter(container);

    expect(screen.getByTestId('vote-breakdown-popover')).toBeDefined();
    expect(screen.getByText('Alice')).toBeDefined();
    expect(screen.getByText('(You)')).toBeDefined();

    const removeBtn = screen.getByRole('button', { name: /Remove vote/i });
    fireEvent.click(removeBtn);

    expect(onRemoveVote).toHaveBeenCalledWith('shape-1', 'v-1');
  });

  it('does not render vote badge or plus button when shape has no votes', () => {
    const mockShapeEmptyVotes = {
      id: 'shape-no-votes',
      type: 'Rectangle',
      getBoundingRect: () => [
        [100, 100],
        [200, 200],
      ],
      customData: {
        votes: [],
      },
    };
    const mockShapeUndefinedVotes = {
      id: 'shape-undef-votes',
      type: 'StickyNote',
      getBoundingRect: () => [
        [250, 250],
        [350, 350],
      ],
      customData: {},
    };

    const editor = createMockEditor([mockShapeEmptyVotes, mockShapeUndefinedVotes]);

    render(
      <ShapeVoteBadge
        editor={editor}
        votingConfig={mockVotingConfig}
        currentUserId="user-alice"
        currentUserName="Alice"
        userVotesUsed={0}
        canEdit={true}
      />
    );

    expect(screen.queryByRole('button', { name: /Vote \+1/i })).toBeNull();
    expect(screen.queryByTestId('shape-vote-badge-container-shape-no-votes')).toBeNull();
    expect(screen.queryByTestId('shape-vote-badge-container-shape-undef-votes')).toBeNull();
  });

  it('unmounts vote badge when the last vote is removed', () => {
    const mockShapeWithVote = {
      id: 'shape-rem-vote',
      type: 'Rectangle',
      getBoundingRect: () => [
        [100, 100],
        [200, 200],
      ],
      customData: {
        votes: [
          {
            id: 'v-last',
            userId: 'user-alice',
            userName: 'Alice',
            categoryId: 'cat-priority',
          },
        ] as ShapeVote[],
      },
    };

    const editor = createMockEditor([mockShapeWithVote]);

    const { rerender } = render(
      <ShapeVoteBadge
        editor={editor}
        votingConfig={mockVotingConfig}
        currentUserId="user-alice"
        currentUserName="Alice"
        userVotesUsed={1}
      />
    );

    expect(screen.getByTestId('shape-vote-badge-container-shape-rem-vote')).toBeDefined();
    expect(screen.getByRole('button', { name: /Vote \+1/i })).toBeDefined();

    // Rerender when vote was removed and shape now has no votes
    const mockShapeAfterRemoval = {
      ...mockShapeWithVote,
      customData: {
        votes: [],
      },
    };
    const updatedEditor = createMockEditor([mockShapeAfterRemoval]);

    rerender(
      <ShapeVoteBadge
        editor={updatedEditor}
        votingConfig={mockVotingConfig}
        currentUserId="user-alice"
        currentUserName="Alice"
        userVotesUsed={0}
      />
    );

    expect(screen.queryByTestId('shape-vote-badge-container-shape-rem-vote')).toBeNull();
    expect(screen.queryByRole('button', { name: /Vote \+1/i })).toBeNull();
  });

  it('allows casting a vote via quick +1 button and selecting category', () => {
    const onVote = vi.fn();
    const mockShape = {
      id: 'shape-1',
      type: 'Rectangle',
      getBoundingRect: () => [
        [100, 100],
        [200, 200],
      ],
      customData: {
        votes: [
          {
            id: 'v-existing',
            userId: 'user-bob',
            userName: 'Bob',
            categoryId: 'cat-feasibility',
          },
        ] as ShapeVote[],
      },
    };

    const editor = createMockEditor([mockShape]);

    render(
      <ShapeVoteBadge
        editor={editor}
        votingConfig={mockVotingConfig}
        currentUserId="user-alice"
        currentUserName="Alice"
        userVotesUsed={1}
        onVote={onVote}
      />
    );

    const voteBtn = screen.getByRole('button', { name: /Vote \+1/i });
    fireEvent.click(voteBtn);

    expect(screen.getByText('Select Category')).toBeDefined();
    const priorityOption = screen.getByText('High Priority');
    fireEvent.click(priorityOption);

    expect(onVote).toHaveBeenCalledWith('shape-1', 'cat-priority');
  });

  it('disables vote casting when quota is reached or voting session is locked', () => {
    const mockShape = {
      id: 'shape-1',
      type: 'Rectangle',
      getBoundingRect: () => [
        [100, 100],
        [200, 200],
      ],
      customData: {
        votes: [
          {
            id: 'v-existing',
            userId: 'user-bob',
            userName: 'Bob',
            categoryId: 'cat-feasibility',
          },
        ] as ShapeVote[],
      },
    };

    const editor = createMockEditor([mockShape]);

    // Test quota exhausted
    const { rerender } = render(
      <ShapeVoteBadge
        editor={editor}
        votingConfig={mockVotingConfig}
        currentUserId="user-alice"
        currentUserName="Alice"
        userVotesUsed={5} // Max is 5
      />
    );

    const voteBtn = screen.getByRole('button', { name: /Vote \+1/i });
    expect(voteBtn.getAttribute('disabled')).not.toBeNull();

    // Test session locked
    rerender(
      <ShapeVoteBadge
        editor={editor}
        votingConfig={{ ...mockVotingConfig, isLocked: true }}
        currentUserId="user-alice"
        currentUserName="Alice"
        userVotesUsed={2}
      />
    );

    expect(screen.queryByRole('button', { name: /Vote \+1/i })).toBeNull();
  });

  it('renders in-place menu on hover and dismisses on mouse leave restoring compact view', () => {
    const mockShape = {
      id: 'shape-hover-test',
      type: 'Rectangle',
      getBoundingRect: () => [
        [100, 100],
        [200, 200],
      ],
      customData: {
        votes: [
          {
            id: 'v-existing',
            userId: 'user-bob',
            userName: 'Bob',
            categoryId: 'cat-feasibility',
          },
        ] as ShapeVote[],
      },
    };

    const editor = createMockEditor([mockShape]);

    render(
      <ShapeVoteBadge
        editor={editor}
        votingConfig={mockVotingConfig}
        currentUserId="user-alice"
        currentUserName="Alice"
        userVotesUsed={0}
      />
    );

    const container = screen.getByTestId('shape-vote-badge-container-shape-hover-test');
    
    // Initially compact "+1" button is present
    expect(screen.getByRole('button', { name: /Vote \+1/i })).toBeDefined();
    expect(screen.queryByTestId('vote-breakdown-popover')).toBeNull();

    // Hover over container replaces button with in-place menu directly
    fireEvent.mouseEnter(container);
    expect(screen.getByTestId('vote-breakdown-popover')).toBeDefined();
    expect(screen.getByText('Select Category')).toBeDefined();
    expect(screen.getByText('High Priority')).toBeDefined();
    expect(screen.getAllByText(/High Feasibility/).length).toBeGreaterThan(0);

    // Mouse leave restores compact "+1" button
    fireEvent.mouseLeave(container);
    expect(screen.queryByTestId('vote-breakdown-popover')).toBeNull();
    expect(screen.getByRole('button', { name: /Vote \+1/i })).toBeDefined();
  });

  it('renders in-place menu on click and closes upon category selection', () => {
    const onVote = vi.fn();
    const mockShape = {
      id: 'shape-click-test',
      type: 'Rectangle',
      getBoundingRect: () => [
        [50, 50],
        [150, 150],
      ],
      customData: {
        votes: [
          {
            id: 'v-existing',
            userId: 'user-bob',
            userName: 'Bob',
            categoryId: 'cat-feasibility',
          },
        ] as ShapeVote[],
      },
    };

    const editor = createMockEditor([mockShape]);

    render(
      <ShapeVoteBadge
        editor={editor}
        votingConfig={mockVotingConfig}
        currentUserId="user-alice"
        currentUserName="Alice"
        userVotesUsed={1}
        onVote={onVote}
      />
    );

    const voteBtn = screen.getByRole('button', { name: /Vote \+1/i });
    fireEvent.click(voteBtn);

    // In-place menu is active
    expect(screen.getByTestId('vote-breakdown-popover')).toBeDefined();
    expect(screen.getByText('High Priority')).toBeDefined();

    // Select category to vote
    fireEvent.click(screen.getByText('High Priority'));
    expect(onVote).toHaveBeenCalledWith('shape-click-test', 'cat-priority');

    // In-place menu closes and compact view returns
    expect(screen.queryByTestId('vote-breakdown-popover')).toBeNull();
  });

  it('renders in-place menu with locked state and disabled vote indicators when session is locked', () => {
    const mockShape = {
      id: 'shape-locked-menu',
      type: 'Rectangle',
      getBoundingRect: () => [
        [100, 100],
        [200, 200],
      ],
      customData: {
        votes: [
          {
            id: 'v-1',
            userId: 'user-bob',
            userName: 'Bob',
            categoryId: 'cat-priority',
          },
        ] as ShapeVote[],
      },
    };

    const editor = createMockEditor([mockShape]);

    render(
      <ShapeVoteBadge
        editor={editor}
        votingConfig={{ ...mockVotingConfig, isLocked: true }}
        currentUserId="user-alice"
        currentUserName="Alice"
        userVotesUsed={1}
      />
    );

    const container = screen.getByTestId('shape-vote-badge-container-shape-locked-menu');
    fireEvent.mouseEnter(container);

    expect(screen.getByTestId('vote-breakdown-popover')).toBeDefined();
    expect(screen.getByText('Locked')).toBeDefined();
    expect(screen.queryByText('Select Category')).toBeNull();
  });

  it('disables +1 button and renders notice when duplicate votes are disallowed and user already voted', () => {
    const onVote = vi.fn();
    const mockShape = {
      id: 'shape-dup-test',
      type: 'Rectangle',
      getBoundingRect: () => [
        [100, 100],
        [200, 200],
      ],
      customData: {
        votes: [
          {
            id: 'v-1',
            userId: 'user-alice',
            userName: 'Alice',
            categoryId: 'cat-priority',
          },
        ] as ShapeVote[],
      },
    };

    const editor = createMockEditor([mockShape]);

    render(
      <ShapeVoteBadge
        editor={editor}
        votingConfig={{ ...mockVotingConfig, allowDuplicateVotes: false }}
        currentUserId="user-alice"
        currentUserName="Alice"
        userVotesUsed={1}
        onVote={onVote}
      />
    );

    const voteBtn = screen.getByRole('button', { name: /Vote \+1/i });
    expect(voteBtn.getAttribute('disabled')).not.toBeNull();
    expect(voteBtn.getAttribute('title')).toBe('You have already voted on this shape');

    const container = screen.getByTestId('shape-vote-badge-container-shape-dup-test');
    fireEvent.mouseEnter(container);

    expect(screen.getByTestId('vote-breakdown-popover')).toBeDefined();
    expect(screen.getByText('You have already voted on this shape')).toBeDefined();
    expect(screen.queryByText('Select Category')).toBeNull();
    expect(onVote).not.toHaveBeenCalled();
  });

  it('allows duplicate votes when allowDuplicateVotes is true even if user already voted', () => {
    const onVote = vi.fn();
    const mockShape = {
      id: 'shape-dup-allowed',
      type: 'Rectangle',
      getBoundingRect: () => [
        [100, 100],
        [200, 200],
      ],
      customData: {
        votes: [
          {
            id: 'v-1',
            userId: 'user-alice',
            userName: 'Alice',
            categoryId: 'cat-priority',
          },
        ] as ShapeVote[],
      },
    };

    const editor = createMockEditor([mockShape]);

    render(
      <ShapeVoteBadge
        editor={editor}
        votingConfig={{ ...mockVotingConfig, allowDuplicateVotes: true }}
        currentUserId="user-alice"
        currentUserName="Alice"
        userVotesUsed={1}
        onVote={onVote}
      />
    );

    const voteBtn = screen.getByRole('button', { name: /Vote \+1/i });
    expect(voteBtn.getAttribute('disabled')).toBeNull();

    fireEvent.click(voteBtn);
    expect(screen.getByText('Select Category')).toBeDefined();

    const priorityOption = screen.getByRole('button', { name: /High Priority/i });
    fireEvent.click(priorityOption);
    expect(onVote).toHaveBeenCalledWith('shape-dup-allowed', 'cat-priority');
  });
});
