// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { PageTabBar } from './PageTabBar';
import { DgmPageMetadata } from '@/types/pages';

describe('PageTabBar', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const mockPages: DgmPageMetadata[] = [
    { id: 'page_1', name: 'Page 1', order: 0, shapeCount: 3 },
    { id: 'page_2', name: 'Architecture', order: 1, shapeCount: 5 },
  ];

  it('renders page tabs and highlights the active page tab', () => {
    const onSelectPage = vi.fn();
    const onAddPage = vi.fn();
    const onRenamePage = vi.fn();
    const onOpenDrawer = vi.fn();

    render(
      <PageTabBar
        pages={mockPages}
        activePageId="page_1"
        onSelectPage={onSelectPage}
        onAddPage={onAddPage}
        onRenamePage={onRenamePage}
        onOpenDrawer={onOpenDrawer}
      />
    );

    expect(screen.getByText('Page 1')).toBeDefined();
    expect(screen.getByText('Architecture')).toBeDefined();
    expect(screen.getByText('Pages (2)')).toBeDefined();

    const activeTab = screen.getByTestId('page-tab-page_1');
    expect(activeTab.className).toContain('bg-blue-600');
  });

  it('triggers onSelectPage when clicking a page tab', () => {
    const onSelectPage = vi.fn();
    const onAddPage = vi.fn();
    const onRenamePage = vi.fn();
    const onOpenDrawer = vi.fn();

    render(
      <PageTabBar
        pages={mockPages}
        activePageId="page_1"
        onSelectPage={onSelectPage}
        onAddPage={onAddPage}
        onRenamePage={onRenamePage}
        onOpenDrawer={onOpenDrawer}
      />
    );

    fireEvent.click(screen.getByTestId('page-tab-page_2'));
    expect(onSelectPage).toHaveBeenCalledWith('page_2');
  });

  it('triggers onAddPage when clicking the plus button', () => {
    const onSelectPage = vi.fn();
    const onAddPage = vi.fn();
    const onRenamePage = vi.fn();
    const onOpenDrawer = vi.fn();

    render(
      <PageTabBar
        pages={mockPages}
        activePageId="page_1"
        onSelectPage={onSelectPage}
        onAddPage={onAddPage}
        onRenamePage={onRenamePage}
        onOpenDrawer={onOpenDrawer}
      />
    );

    fireEvent.click(screen.getByTestId('add-page-btn'));
    expect(onAddPage).toHaveBeenCalledTimes(1);
  });

  it('triggers onOpenDrawer when clicking the drawer button', () => {
    const onSelectPage = vi.fn();
    const onAddPage = vi.fn();
    const onRenamePage = vi.fn();
    const onOpenDrawer = vi.fn();

    render(
      <PageTabBar
        pages={mockPages}
        activePageId="page_1"
        onSelectPage={onSelectPage}
        onAddPage={onAddPage}
        onRenamePage={onRenamePage}
        onOpenDrawer={onOpenDrawer}
      />
    );

    fireEvent.click(screen.getByTestId('open-page-drawer-btn'));
    expect(onOpenDrawer).toHaveBeenCalledTimes(1);
  });

  it('allows inline renaming on double click', () => {
    const onSelectPage = vi.fn();
    const onAddPage = vi.fn();
    const onRenamePage = vi.fn();
    const onOpenDrawer = vi.fn();

    render(
      <PageTabBar
        pages={mockPages}
        activePageId="page_1"
        onSelectPage={onSelectPage}
        onAddPage={onAddPage}
        onRenamePage={onRenamePage}
        onOpenDrawer={onOpenDrawer}
      />
    );

    fireEvent.doubleClick(screen.getByTestId('page-tab-page_1'));

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input.value).toBe('Page 1');

    fireEvent.change(input, { target: { value: 'New Overview' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(onRenamePage).toHaveBeenCalledWith('page_1', 'New Overview');
  });

  it('hides editing controls when in isViewer mode', () => {
    const onSelectPage = vi.fn();
    const onAddPage = vi.fn();
    const onRenamePage = vi.fn();
    const onOpenDrawer = vi.fn();

    render(
      <PageTabBar
        pages={mockPages}
        activePageId="page_1"
        isViewer={true}
        onSelectPage={onSelectPage}
        onAddPage={onAddPage}
        onRenamePage={onRenamePage}
        onOpenDrawer={onOpenDrawer}
      />
    );

    expect(screen.queryByTestId('add-page-btn')).toBeNull();
    expect(screen.queryByTestId('page-menu-trigger-page_1')).toBeNull();
  });

  it('opens and toggles menu on trigger button click', () => {
    const onSelectPage = vi.fn();
    const onAddPage = vi.fn();
    const onRenamePage = vi.fn();
    const onOpenDrawer = vi.fn();

    render(
      <PageTabBar
        pages={mockPages}
        activePageId="page_1"
        onSelectPage={onSelectPage}
        onAddPage={onAddPage}
        onRenamePage={onRenamePage}
        onOpenDrawer={onOpenDrawer}
      />
    );

    expect(screen.queryByTestId('page-menu-page_1')).toBeNull();

    // Click trigger button to open
    const trigger = screen.getByTestId('page-menu-trigger-page_1');
    fireEvent.click(trigger);

    expect(screen.getByTestId('page-menu-page_1')).toBeDefined();
    expect(screen.getByTestId('page-menu-rename-btn')).toBeDefined();

    // Click trigger button again to toggle closed
    fireEvent.click(trigger);
    expect(screen.queryByTestId('page-menu-page_1')).toBeNull();
  });

  it('opens menu on tab right-click contextmenu', () => {
    const onSelectPage = vi.fn();
    const onAddPage = vi.fn();
    const onRenamePage = vi.fn();
    const onOpenDrawer = vi.fn();

    render(
      <PageTabBar
        pages={mockPages}
        activePageId="page_1"
        onSelectPage={onSelectPage}
        onAddPage={onAddPage}
        onRenamePage={onRenamePage}
        onOpenDrawer={onOpenDrawer}
      />
    );

    const tab = screen.getByTestId('page-tab-page_2');
    fireEvent.contextMenu(tab);

    expect(screen.getByTestId('page-menu-page_2')).toBeDefined();
  });

  it('executes rename from menu and closes menu', () => {
    const onSelectPage = vi.fn();
    const onAddPage = vi.fn();
    const onRenamePage = vi.fn();
    const onOpenDrawer = vi.fn();

    render(
      <PageTabBar
        pages={mockPages}
        activePageId="page_1"
        onSelectPage={onSelectPage}
        onAddPage={onAddPage}
        onRenamePage={onRenamePage}
        onOpenDrawer={onOpenDrawer}
      />
    );

    fireEvent.click(screen.getByTestId('page-menu-trigger-page_1'));
    fireEvent.click(screen.getByTestId('page-menu-rename-btn'));

    expect(screen.queryByTestId('page-menu-page_1')).toBeNull();
    expect(screen.getByTestId('page-tab-editing-page_1')).toBeDefined();
  });

  it('executes duplicate and delete actions from menu', () => {
    const onSelectPage = vi.fn();
    const onAddPage = vi.fn();
    const onRenamePage = vi.fn();
    const onDuplicatePage = vi.fn();
    const onDeletePage = vi.fn();
    const onOpenDrawer = vi.fn();

    render(
      <PageTabBar
        pages={mockPages}
        activePageId="page_1"
        onSelectPage={onSelectPage}
        onAddPage={onAddPage}
        onRenamePage={onRenamePage}
        onDuplicatePage={onDuplicatePage}
        onDeletePage={onDeletePage}
        onOpenDrawer={onOpenDrawer}
      />
    );

    // Duplicate
    fireEvent.click(screen.getByTestId('page-menu-trigger-page_1'));
    fireEvent.click(screen.getByTestId('page-menu-duplicate-btn'));
    expect(onDuplicatePage).toHaveBeenCalledWith('page_1');
    expect(screen.queryByTestId('page-menu-page_1')).toBeNull();

    // Delete
    fireEvent.click(screen.getByTestId('page-menu-trigger-page_2'));
    fireEvent.click(screen.getByTestId('page-menu-delete-btn'));
    expect(onDeletePage).toHaveBeenCalledWith('page_2');
    expect(screen.queryByTestId('page-menu-page_2')).toBeNull();
  });

  it('dismisses menu on click outside and escape key', () => {
    const onSelectPage = vi.fn();
    const onAddPage = vi.fn();
    const onRenamePage = vi.fn();
    const onOpenDrawer = vi.fn();

    render(
      <PageTabBar
        pages={mockPages}
        activePageId="page_1"
        onSelectPage={onSelectPage}
        onAddPage={onAddPage}
        onRenamePage={onRenamePage}
        onOpenDrawer={onOpenDrawer}
      />
    );

    // Open menu
    fireEvent.click(screen.getByTestId('page-menu-trigger-page_1'));
    expect(screen.getByTestId('page-menu-page_1')).toBeDefined();

    // Click outside
    fireEvent.mouseDown(document.body);
    expect(screen.queryByTestId('page-menu-page_1')).toBeNull();

    // Open menu again
    fireEvent.click(screen.getByTestId('page-menu-trigger-page_1'));
    expect(screen.getByTestId('page-menu-page_1')).toBeDefined();

    // Escape key
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(screen.queryByTestId('page-menu-page_1')).toBeNull();
  });

  it('deduplicates duplicate page entries in pages prop', () => {
    const onSelectPage = vi.fn();
    const onAddPage = vi.fn();
    const onRenamePage = vi.fn();
    const onOpenDrawer = vi.fn();

    const duplicatePages: DgmPageMetadata[] = [
      { id: 'page_1', name: 'Page 1', order: 0, shapeCount: 3 },
      { id: 'page_2', name: 'Architecture', order: 1, shapeCount: 5 },
      { id: 'page_1', name: 'Page 1 Duplicate', order: 2, shapeCount: 3 },
      { id: 'page_2', name: 'Architecture Duplicate', order: 3, shapeCount: 5 },
    ];

    render(
      <PageTabBar
        pages={duplicatePages}
        activePageId="page_1"
        onSelectPage={onSelectPage}
        onAddPage={onAddPage}
        onRenamePage={onRenamePage}
        onOpenDrawer={onOpenDrawer}
      />
    );

    expect(screen.getByText('Pages (2)')).toBeDefined();
    const tab1 = screen.getAllByTestId('page-tab-page_1');
    expect(tab1).toHaveLength(1);
    const tab2 = screen.getAllByTestId('page-tab-page_2');
    expect(tab2).toHaveLength(1);
  });
});
