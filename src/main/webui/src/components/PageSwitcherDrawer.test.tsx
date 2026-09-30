// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { PageSwitcherDrawer } from './PageSwitcherDrawer';
import { DgmPageMetadata } from '@/types/pages';

describe('PageSwitcherDrawer', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const mockPages: DgmPageMetadata[] = [
    { id: 'page_1', name: 'Architecture Overview', order: 0, shapeCount: 4 },
    { id: 'page_2', name: 'Database Schema', order: 1, shapeCount: 12 },
    { id: 'page_3', name: 'User Flow', order: 2, shapeCount: 0 },
  ];

  it('renders all pages with shape counts and highlights active page', () => {
    const onClose = vi.fn();
    const onSelectPage = vi.fn();
    const onAddPage = vi.fn();
    const onDuplicatePage = vi.fn();
    const onRenamePage = vi.fn();
    const onReorderPages = vi.fn();
    const onDeletePage = vi.fn();

    render(
      <PageSwitcherDrawer
        isOpen={true}
        onClose={onClose}
        pages={mockPages}
        activePageId="page_2"
        onSelectPage={onSelectPage}
        onAddPage={onAddPage}
        onDuplicatePage={onDuplicatePage}
        onRenamePage={onRenamePage}
        onReorderPages={onReorderPages}
        onDeletePage={onDeletePage}
      />
    );

    expect(screen.getByText('Pages (3)')).toBeDefined();
    expect(screen.getByText('Architecture Overview')).toBeDefined();
    expect(screen.getByText('Database Schema')).toBeDefined();
    expect(screen.getByText('User Flow')).toBeDefined();
    expect(screen.getByText('4 shapes')).toBeDefined();
    expect(screen.getByText('12 shapes')).toBeDefined();
    expect(screen.getByText('0 shapes')).toBeDefined();
    expect(screen.getByText('Active')).toBeDefined();
  });

  it('filters pages by search query', () => {
    const onClose = vi.fn();
    const onSelectPage = vi.fn();
    const onAddPage = vi.fn();
    const onDuplicatePage = vi.fn();
    const onRenamePage = vi.fn();
    const onReorderPages = vi.fn();
    const onDeletePage = vi.fn();

    render(
      <PageSwitcherDrawer
        isOpen={true}
        onClose={onClose}
        pages={mockPages}
        activePageId="page_1"
        onSelectPage={onSelectPage}
        onAddPage={onAddPage}
        onDuplicatePage={onDuplicatePage}
        onRenamePage={onRenamePage}
        onReorderPages={onReorderPages}
        onDeletePage={onDeletePage}
      />
    );

    const searchInput = screen.getByTestId('page-search-input');
    fireEvent.change(searchInput, { target: { value: 'Database' } });

    expect(screen.getByText('Database Schema')).toBeDefined();
    expect(screen.queryByText('Architecture Overview')).toBeNull();
    expect(screen.queryByText('User Flow')).toBeNull();
  });

  it('handles page selection, duplication, and reordering', () => {
    const onClose = vi.fn();
    const onSelectPage = vi.fn();
    const onAddPage = vi.fn();
    const onDuplicatePage = vi.fn();
    const onRenamePage = vi.fn();
    const onReorderPages = vi.fn();
    const onDeletePage = vi.fn();

    render(
      <PageSwitcherDrawer
        isOpen={true}
        onClose={onClose}
        pages={mockPages}
        activePageId="page_1"
        onSelectPage={onSelectPage}
        onAddPage={onAddPage}
        onDuplicatePage={onDuplicatePage}
        onRenamePage={onRenamePage}
        onReorderPages={onReorderPages}
        onDeletePage={onDeletePage}
      />
    );

    // Select page
    fireEvent.click(screen.getByTestId('drawer-page-card-page_2'));
    expect(onSelectPage).toHaveBeenCalledWith('page_2');

    // Duplicate page
    fireEvent.click(screen.getByTestId('drawer-duplicate-page_1'));
    expect(onDuplicatePage).toHaveBeenCalledWith('page_1');

    // Move down page 1 (index 0 -> index 1)
    fireEvent.click(screen.getByTestId('drawer-move-down-page_1'));
    expect(onReorderPages).toHaveBeenCalledWith(0, 1);
  });

  it('shows delete confirmation when deleting a page with shapes', () => {
    const onClose = vi.fn();
    const onSelectPage = vi.fn();
    const onAddPage = vi.fn();
    const onDuplicatePage = vi.fn();
    const onRenamePage = vi.fn();
    const onReorderPages = vi.fn();
    const onDeletePage = vi.fn();

    render(
      <PageSwitcherDrawer
        isOpen={true}
        onClose={onClose}
        pages={mockPages}
        activePageId="page_1"
        onSelectPage={onSelectPage}
        onAddPage={onAddPage}
        onDuplicatePage={onDuplicatePage}
        onRenamePage={onRenamePage}
        onReorderPages={onReorderPages}
        onDeletePage={onDeletePage}
      />
    );

    // Page 1 has 4 shapes, should trigger confirmation
    fireEvent.click(screen.getByTestId('drawer-delete-page_1'));
    expect(screen.getByText('Delete Page?')).toBeDefined();
    expect(onDeletePage).not.toHaveBeenCalled();

    // Confirm delete
    fireEvent.click(screen.getByTestId('confirm-delete-page-btn'));
    expect(onDeletePage).toHaveBeenCalledWith('page_1');
  });

  it('deletes empty page immediately without extra modal', () => {
    const onClose = vi.fn();
    const onSelectPage = vi.fn();
    const onAddPage = vi.fn();
    const onDuplicatePage = vi.fn();
    const onRenamePage = vi.fn();
    const onReorderPages = vi.fn();
    const onDeletePage = vi.fn();

    render(
      <PageSwitcherDrawer
        isOpen={true}
        onClose={onClose}
        pages={mockPages}
        activePageId="page_1"
        onSelectPage={onSelectPage}
        onAddPage={onAddPage}
        onDuplicatePage={onDuplicatePage}
        onRenamePage={onRenamePage}
        onReorderPages={onReorderPages}
        onDeletePage={onDeletePage}
      />
    );

    // Page 3 has 0 shapes
    fireEvent.click(screen.getByTestId('drawer-delete-page_3'));
    expect(onDeletePage).toHaveBeenCalledWith('page_3');
  });

  it('disables delete button when only 1 page remains', () => {
    const singlePage: DgmPageMetadata[] = [
      { id: 'page_1', name: 'Only Page', order: 0, shapeCount: 0 },
    ];
    const onClose = vi.fn();
    const onSelectPage = vi.fn();
    const onAddPage = vi.fn();
    const onDuplicatePage = vi.fn();
    const onRenamePage = vi.fn();
    const onReorderPages = vi.fn();
    const onDeletePage = vi.fn();

    render(
      <PageSwitcherDrawer
        isOpen={true}
        onClose={onClose}
        pages={singlePage}
        activePageId="page_1"
        onSelectPage={onSelectPage}
        onAddPage={onAddPage}
        onDuplicatePage={onDuplicatePage}
        onRenamePage={onRenamePage}
        onReorderPages={onReorderPages}
        onDeletePage={onDeletePage}
      />
    );

    const deleteBtn = screen.getByTestId('drawer-delete-page_1') as HTMLButtonElement;
    expect(deleteBtn.disabled).toBe(true);
  });

  it('deduplicates duplicate page entries in pages prop', () => {
    const duplicatePages: DgmPageMetadata[] = [
      { id: 'page_1', name: 'Overview', order: 0, shapeCount: 2 },
      { id: 'page_2', name: 'Containers', order: 1, shapeCount: 4 },
      { id: 'page_1', name: 'Overview Duplicate', order: 2, shapeCount: 2 },
    ];
    const onClose = vi.fn();
    const onSelectPage = vi.fn();
    const onAddPage = vi.fn();
    const onDuplicatePage = vi.fn();
    const onRenamePage = vi.fn();
    const onReorderPages = vi.fn();
    const onDeletePage = vi.fn();

    render(
      <PageSwitcherDrawer
        isOpen={true}
        onClose={onClose}
        pages={duplicatePages}
        activePageId="page_1"
        onSelectPage={onSelectPage}
        onAddPage={onAddPage}
        onDuplicatePage={onDuplicatePage}
        onRenamePage={onRenamePage}
        onReorderPages={onReorderPages}
        onDeletePage={onDeletePage}
      />
    );

    expect(screen.getByText('Pages (2)')).toBeDefined();
    const card1 = screen.getAllByTestId('drawer-page-card-page_1');
    expect(card1).toHaveLength(1);
    const card2 = screen.getAllByTestId('drawer-page-card-page_2');
    expect(card2).toHaveLength(1);
  });

  it('renders dark mode classes on active and inactive cards and active pill badge', () => {
    render(
      <PageSwitcherDrawer
        isOpen={true}
        onClose={vi.fn()}
        pages={mockPages}
        activePageId="page_1"
        onSelectPage={vi.fn()}
        onAddPage={vi.fn()}
        onDuplicatePage={vi.fn()}
        onRenamePage={vi.fn()}
        onReorderPages={vi.fn()}
        onDeletePage={vi.fn()}
      />
    );

    const activeCard = screen.getByTestId('drawer-page-card-page_1');
    expect(activeCard.className).toContain('dark:bg-blue-950/60');
    expect(activeCard.className).toContain('dark:border-blue-500');

    const inactiveCard = screen.getByTestId('drawer-page-card-page_2');
    expect(inactiveCard.className).toContain('dark:bg-slate-800/80');
    expect(inactiveCard.className).toContain('dark:border-slate-800');

    const activeBadge = screen.getByText('Active');
    expect(activeBadge.className).toContain('dark:bg-blue-900/60');
    expect(activeBadge.className).toContain('dark:text-blue-300');
  });
});
