// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ShapeLibraryDrawer } from './ShapeLibraryDrawer';
import { StencilCategory } from '../types/shapeLibrary';
import * as shapeLibraryApi from '../lib/api/shapeLibrary';

describe('ShapeLibraryDrawer Component', () => {
  const mockInsert = vi.fn();
  const mockClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ShapeLibraryDrawer
        isOpen={false}
        onClose={mockClose}
        onInsertStencil={mockInsert}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders drawer header, category tabs, and prebuilt stencils when open', () => {
    render(
      <ShapeLibraryDrawer
        isOpen={true}
        onClose={mockClose}
        onInsertStencil={mockInsert}
      />
    );

    expect(screen.getByText('Shape Libraries')).toBeDefined();
    expect(screen.getByPlaceholderText('Search stencils by name, keyword...')).toBeDefined();
    expect(screen.getByRole('button', { name: 'All Categories' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Agile & Sprint' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Cloud Architecture' })).toBeDefined();

    // Verify presence of prebuilt agile stencil
    expect(screen.getByTestId('stencil-item-agile-story-card')).toBeDefined();
  });

  it('filters stencils by category tab click', () => {
    render(
      <ShapeLibraryDrawer
        isOpen={true}
        onClose={mockClose}
        onInsertStencil={mockInsert}
      />
    );

    // Click on Cloud Architecture
    fireEvent.click(screen.getByRole('button', { name: 'Cloud Architecture' }));

    // Should show Cloud stencils and not Agile stencils
    expect(screen.getByTestId('stencil-item-cloud-aws-stack')).toBeDefined();
    expect(screen.queryByTestId('stencil-item-agile-story-card')).toBeNull();
  });

  it('filters stencils by keyword search query', () => {
    render(
      <ShapeLibraryDrawer
        isOpen={true}
        onClose={mockClose}
        onInsertStencil={mockInsert}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search stencils by name, keyword...');
    fireEvent.change(searchInput, { target: { value: 'Poker' } });

    expect(screen.getByTestId('stencil-item-agile-planning-poker-set')).toBeDefined();
    expect(screen.queryByTestId('stencil-item-cloud-aws-stack')).toBeNull();
  });

  it('triggers onInsertStencil when a stencil card is clicked', () => {
    render(
      <ShapeLibraryDrawer
        isOpen={true}
        onClose={mockClose}
        onInsertStencil={mockInsert}
      />
    );

    const stencilCard = screen.getByTestId('stencil-item-agile-story-card');
    fireEvent.click(stencilCard);

    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsert.mock.calls[0][0].id).toBe('agile-story-card');
  });

  it('respects board allowedCollectionIds configuration', () => {
    render(
      <ShapeLibraryDrawer
        isOpen={true}
        onClose={mockClose}
        onInsertStencil={mockInsert}
        allowedCollectionIds={['prebuilt-cloud-architecture']}
      />
    );

    // Only cloud collection should be visible
    expect(screen.getByTestId('stencil-item-cloud-aws-stack')).toBeDefined();
    expect(screen.queryByTestId('stencil-item-agile-story-card')).toBeNull();
  });

  it('fetches and displays custom backend shape libraries', async () => {
    const mockCustomLib = {
      id: 'custom-lib-1',
      name: 'Custom Team Design Kit',
      description: 'Shared sprint cards',
      userId: 'user-1',
      organizationId: null,
      categories: [StencilCategory.GENERAL],
      defaultRole: 'ADMIN' as const,
      permission: 'ADMIN' as const,
      createdAt: '2026-09-11T00:00:00Z',
      updatedAt: null,
      stencils: [
        {
          id: 'custom-stencil-1',
          libraryId: 'custom-lib-1',
          name: 'Sprint Retro Sticky Note',
          category: StencilCategory.GENERAL,
          description: 'Custom sticky card',
          shapesJson: JSON.stringify([{ type: 'Rectangle', width: 100, height: 100 }]),
          thumbnailSvg: null,
          createdBy: 'user-1',
          createdAt: '2026-09-11T00:00:00Z',
        },
      ],
    };

    vi.spyOn(shapeLibraryApi, 'listShapeLibraries').mockResolvedValue([mockCustomLib]);

    render(
      <ShapeLibraryDrawer
        isOpen={true}
        onClose={mockClose}
        onInsertStencil={mockInsert}
        token="test-token"
        currentUser={{ id: 'user-1', name: 'Alice' }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Custom Team Design Kit')).toBeDefined();
      expect(screen.getByTestId('stencil-item-custom-stencil-1')).toBeDefined();
    });
  });

  it('renders and filters scripted stencils across UML, UI, and BPMN categories', () => {
    render(
      <ShapeLibraryDrawer
        isOpen={true}
        onClose={mockClose}
        onInsertStencil={mockInsert}
      />
    );

    // Filter Software & UML
    fireEvent.click(screen.getByRole('button', { name: 'Software & UML' }));
    expect(screen.getByTestId('stencil-item-uml-class-box')).toBeDefined();
    expect(screen.getByText('UML Class Box')).toBeDefined();

    // Filter UI Wireframing
    fireEvent.click(screen.getByRole('button', { name: 'UI Wireframing' }));
    expect(screen.getByTestId('stencil-item-ui-interactive-controls')).toBeDefined();
    expect(screen.getByText('UI Controls & Toggles')).toBeDefined();

    // Filter Flowchart & BPMN
    fireEvent.click(screen.getByRole('button', { name: 'Flowchart & BPMN' }));
    expect(screen.getByTestId('stencil-item-flowchart-bpmn-gateway-set')).toBeDefined();
    expect(screen.getByText('BPMN Gateway & Events')).toBeDefined();
  });

  it('sets application/x-floxboard-stencil data when drag begins on a scripted stencil', () => {
    render(
      <ShapeLibraryDrawer
        isOpen={true}
        onClose={mockClose}
        onInsertStencil={mockInsert}
      />
    );

    const umlCard = screen.getByTestId('stencil-item-agile-story-card');
    const setDataMock = vi.fn();

    fireEvent.dragStart(umlCard, {
      dataTransfer: {
        setData: setDataMock,
        effectAllowed: '',
      },
    });

    expect(setDataMock).toHaveBeenCalledWith(
      'application/x-floxboard-stencil',
      expect.stringContaining('agile-story-card')
    );
  });
});
