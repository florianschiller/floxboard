// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { SaveStencilModal } from './SaveStencilModal';
import { StencilCategory, StencilPermission } from '../types/shapeLibrary';
import * as shapeLibraryApi from '../lib/api/shapeLibrary';

describe('SaveStencilModal Component', () => {
  const mockClose = vi.fn();
  const mockSaved = vi.fn();
  const mockShapes = [
    {
      id: 'shape-1',
      type: 'Rectangle',
      left: 100,
      top: 100,
      width: 150,
      height: 80,
      text: 'My Selected Shape',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <SaveStencilModal
        isOpen={false}
        onClose={mockClose}
        shapes={mockShapes}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders form fields with selected shapes count', async () => {
    vi.spyOn(shapeLibraryApi, 'listShapeLibraries').mockResolvedValue([]);

    render(
      <SaveStencilModal
        isOpen={true}
        onClose={mockClose}
        shapes={mockShapes}
        onSaved={mockSaved}
      />
    );

    expect(screen.getByRole('heading', { name: 'Save as Stencil' })).toBeDefined();
    expect(screen.getByPlaceholderText('e.g. Header Navigation Bar')).toBeDefined();
    expect(screen.getByText('Category')).toBeDefined();
    expect(screen.getByText('Target Library')).toBeDefined();
  });

  it('validates required name field before submitting', async () => {
    vi.spyOn(shapeLibraryApi, 'listShapeLibraries').mockResolvedValue([]);
    const createStencilSpy = vi.spyOn(shapeLibraryApi, 'createShapeStencil');

    render(
      <SaveStencilModal
        isOpen={true}
        onClose={mockClose}
        shapes={mockShapes}
        onSaved={mockSaved}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Save Stencil/i });
    fireEvent.click(submitBtn);

    expect(createStencilSpy).not.toHaveBeenCalled();
  });

  it('creates library and stencil on submit and invokes onSaved', async () => {
    vi.spyOn(shapeLibraryApi, 'listShapeLibraries').mockResolvedValue([]);
    const createLibSpy = vi.spyOn(shapeLibraryApi, 'createShapeLibrary').mockResolvedValue({
      id: 'new-lib-123',
      name: 'My Custom Stencils',
      description: null,
      userId: 'user-1',
      organizationId: null,
      categories: [StencilCategory.GENERAL],
      defaultRole: StencilPermission.ADMIN,
      permission: StencilPermission.ADMIN,
      createdAt: '2026-09-11T00:00:00Z',
      updatedAt: null,
      stencils: [],
    });

    const createStencilSpy = vi.spyOn(shapeLibraryApi, 'createShapeStencil').mockResolvedValue({
      id: 'new-stencil-456',
      libraryId: 'new-lib-123',
      name: 'Custom Action Bar',
      category: StencilCategory.GENERAL,
      description: 'Useful bar',
      shapesJson: JSON.stringify(mockShapes),
      thumbnailSvg: null,
      createdBy: 'user-1',
      createdAt: '2026-09-11T00:00:00Z',
    });

    render(
      <SaveStencilModal
        isOpen={true}
        onClose={mockClose}
        shapes={mockShapes}
        onSaved={mockSaved}
        currentUser={{ id: 'user-1', name: 'Alice' }}
        token="test-token"
      />
    );

    const nameInput = screen.getByPlaceholderText('e.g. Header Navigation Bar');
    fireEvent.change(nameInput, { target: { value: 'Custom Action Bar' } });

    const descInput = screen.getByPlaceholderText('Add optional notes or usage guidelines...');
    fireEvent.change(descInput, { target: { value: 'Useful bar' } });

    const submitBtn = screen.getByRole('button', { name: /Save Stencil/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createLibSpy).toHaveBeenCalledWith(
        {
          name: 'My Custom Stencils',
          categories: [StencilCategory.GENERAL],
        },
        'test-token'
      );
      expect(createStencilSpy).toHaveBeenCalled();
      expect(mockSaved).toHaveBeenCalled();
      expect(mockClose).toHaveBeenCalled();
    });
  });
});
