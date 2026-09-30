// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { WhiteboardHeader } from './WhiteboardHeader';
import { ThemeProvider } from '@/lib/themeContext';
import * as entitlementContext from '@/lib/entitlementContext';

describe('WhiteboardHeader export integration', () => {
  beforeEach(() => {
    vi.spyOn(entitlementContext, 'useEntitlements').mockReturnValue({
      plan: 'FREE',
      status: 'ACTIVE',
      isExpired: false,
      validUntil: null,
      entitlements: null,
      loading: false,
      hasFeature: () => true,
      getQuota: () => ({ current: 0, limit: 10, remaining: 10, isUnlimited: false, allowed: true }),
      refreshEntitlements: async () => {},
      activateKey: async () => {},
      deactivateKey: async () => {},
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const defaultProps = {
    boardName: 'Test Whiteboard',
    boardId: 'board-123',
    role: 'OWNER' as const,
    canEdit: true,
    collabStatus: 'connected',
    peers: [],
    currentUser: { id: 'user-1', name: 'Alice' },
    selectedShapeCount: 0,
    onOpenListModal: vi.fn(),
    onOpenSaveModal: vi.fn(),
    onExportSVG: vi.fn(),
    onExportPNG: vi.fn(),
    onExportPDF: vi.fn(),
    onExportJSON: vi.fn(),
    onImportJSON: vi.fn(),
    onDeleteBoard: vi.fn(),
    onOpenShareModal: vi.fn(),
    onOpenConfigModal: vi.fn(),
    onFocusAll: vi.fn(),
  };

  it('renders menu options including Export SVG, Export PNG, Export PDF, and Export JSON', () => {
    vi.spyOn(entitlementContext, 'useEntitlements').mockReturnValue({
      plan: 'FREE',
      status: 'ACTIVE',
      isExpired: false,
      validUntil: null,
      entitlements: null,
      loading: false,
      hasFeature: (feat) => feat === 'whiteboard:export:svg' || feat === 'whiteboard:export:png',
      getQuota: () => ({ current: 0, limit: 10, remaining: 10, isUnlimited: false, allowed: true }),
      refreshEntitlements: async () => {},
      activateKey: async () => {},
      deactivateKey: async () => {},
    });

    render(<WhiteboardHeader {...defaultProps} />);

    // Open action dropdown menu
    const moreButton = screen.getByLabelText('Action menu');
    fireEvent.click(moreButton);

    expect(screen.getByText('Export SVG')).toBeDefined();
    expect(screen.getByText('Export PNG')).toBeDefined();
    expect(screen.getByText('Export PDF')).toBeDefined();
    expect(screen.getByText('Export JSON')).toBeDefined();
  });

  it('triggers onExportSVG when clicking Export SVG', () => {
    vi.spyOn(entitlementContext, 'useEntitlements').mockReturnValue({
      plan: 'FREE',
      status: 'ACTIVE',
      isExpired: false,
      validUntil: null,
      entitlements: null,
      loading: false,
      hasFeature: () => true,
      getQuota: () => ({ current: 0, limit: 10, remaining: 10, isUnlimited: false, allowed: true }),
      refreshEntitlements: async () => {},
      activateKey: async () => {},
      deactivateKey: async () => {},
    });

    const onExportSVG = vi.fn();
    render(<WhiteboardHeader {...defaultProps} onExportSVG={onExportSVG} />);

    const moreButton = screen.getByLabelText('Action menu');
    fireEvent.click(moreButton);

    fireEvent.click(screen.getByText('Export SVG'));
    expect(onExportSVG).toHaveBeenCalledTimes(1);
  });

  it('triggers onExportPNG when clicking Export PNG', () => {
    vi.spyOn(entitlementContext, 'useEntitlements').mockReturnValue({
      plan: 'FREE',
      status: 'ACTIVE',
      isExpired: false,
      validUntil: null,
      entitlements: null,
      loading: false,
      hasFeature: () => true,
      getQuota: () => ({ current: 0, limit: 10, remaining: 10, isUnlimited: false, allowed: true }),
      refreshEntitlements: async () => {},
      activateKey: async () => {},
      deactivateKey: async () => {},
    });

    const onExportPNG = vi.fn();
    render(<WhiteboardHeader {...defaultProps} onExportPNG={onExportPNG} />);

    const moreButton = screen.getByLabelText('Action menu');
    fireEvent.click(moreButton);

    fireEvent.click(screen.getByText('Export PNG'));
    expect(onExportPNG).toHaveBeenCalledTimes(1);
  });

  it('triggers onExportPDF when PRO user clicks Export PDF', () => {
    vi.spyOn(entitlementContext, 'useEntitlements').mockReturnValue({
      plan: 'PRO',
      status: 'ACTIVE',
      isExpired: false,
      validUntil: null,
      entitlements: null,
      loading: false,
      hasFeature: (feat) => feat === 'whiteboard:export:pdf',
      getQuota: () => ({ current: 0, limit: 10, remaining: 10, isUnlimited: false, allowed: true }),
      refreshEntitlements: async () => {},
      activateKey: async () => {},
      deactivateKey: async () => {},
    });

    const onExportPDF = vi.fn();
    render(<WhiteboardHeader {...defaultProps} onExportPDF={onExportPDF} />);

    const moreButton = screen.getByLabelText('Action menu');
    fireEvent.click(moreButton);

    fireEvent.click(screen.getByText('Export PDF'));
    expect(onExportPDF).toHaveBeenCalledTimes(1);
  });

  it('shows upgrade modal and does NOT call onExportPDF when FREE user clicks Export PDF', () => {
    vi.spyOn(entitlementContext, 'useEntitlements').mockReturnValue({
      plan: 'FREE',
      status: 'ACTIVE',
      isExpired: false,
      validUntil: null,
      entitlements: null,
      loading: false,
      hasFeature: () => false,
      getQuota: () => ({ current: 0, limit: 10, remaining: 10, isUnlimited: false, allowed: true }),
      refreshEntitlements: async () => {},
      activateKey: async () => {},
      deactivateKey: async () => {},
    });

    const onExportPDF = vi.fn();
    render(<WhiteboardHeader {...defaultProps} onExportPDF={onExportPDF} />);

    const moreButton = screen.getByLabelText('Action menu');
    fireEvent.click(moreButton);

    expect(screen.getAllByText('PRO').length).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getByText('Export PDF'));

    expect(onExportPDF).not.toHaveBeenCalled();
    // LicenseModal should now be open
    expect(screen.getByText(/subscription & entitlements/i)).toBeDefined();
  });

  it('does not render standalone Share or Settings buttons in the top-right header bar', () => {
    render(<WhiteboardHeader {...defaultProps} />);

    expect(screen.queryByRole('button', { name: /^Share$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Settings$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Board Settings/i })).toBeNull();
  });

  it('triggers onOpenShareModal when clicking Share Board in action menu dropdown', () => {
    const onOpenShareModal = vi.fn();
    render(<WhiteboardHeader {...defaultProps} onOpenShareModal={onOpenShareModal} />);

    const moreButton = screen.getByLabelText('Action menu');
    fireEvent.click(moreButton);

    const shareOption = screen.getByText('Share Board');
    expect(shareOption).toBeDefined();
    fireEvent.click(shareOption);

    expect(onOpenShareModal).toHaveBeenCalledTimes(1);
  });

  it('triggers onOpenConfigModal when clicking Whiteboard Settings in action menu dropdown', () => {
    const onOpenConfigModal = vi.fn();
    render(<WhiteboardHeader {...defaultProps} onOpenConfigModal={onOpenConfigModal} />);

    const moreButton = screen.getByLabelText('Action menu');
    fireEvent.click(moreButton);

    const menuOption = screen.getByText('Whiteboard Settings');
    expect(menuOption).toBeDefined();
    fireEvent.click(menuOption);

    expect(onOpenConfigModal).toHaveBeenCalledTimes(1);
  });

  it('does not render Delete Board in action menu dropdown even for OWNER role', () => {
    render(<WhiteboardHeader {...defaultProps} role="OWNER" />);

    const moreButton = screen.getByLabelText('Action menu');
    fireEvent.click(moreButton);

    expect(screen.queryByText('Delete Board')).toBeNull();
  });

  it('closes the action menu when clicking outside of it', () => {
    render(<WhiteboardHeader {...defaultProps} />);

    const moreButton = screen.getByLabelText('Action menu');
    fireEvent.click(moreButton);

    expect(screen.getByText('Open from Cloud')).toBeDefined();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByText('Open from Cloud')).toBeNull();
  });

  it('closes the action menu when pressing Escape key', () => {
    render(<WhiteboardHeader {...defaultProps} />);

    const moreButton = screen.getByLabelText('Action menu');
    fireEvent.click(moreButton);

    expect(screen.getByText('Open from Cloud')).toBeDefined();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByText('Open from Cloud')).toBeNull();
  });

  it('renders voting quota indicator in header when votingConfig is provided', () => {
    const votingConfig = {
      enabled: true,
      isLocked: false,
      maxVotesPerUser: 5,
      categories: [],
    };

    render(
      <WhiteboardHeader
        {...defaultProps}
        votingConfig={votingConfig}
        userVotesUsed={2}
      />
    );

    const indicator = screen.getByTestId('voting-quota-indicator');
    expect(indicator).toBeDefined();
    expect(screen.getByText(/Votes: 2\/5 used/)).toBeDefined();
  });

  it('renders Version History option in action menu and triggers onOpenHistoryModal when clicked', () => {
    const onOpenHistoryModal = vi.fn();
    render(<WhiteboardHeader {...defaultProps} onOpenHistoryModal={onOpenHistoryModal} />);

    const moreButton = screen.getByLabelText('Action menu');
    fireEvent.click(moreButton);

    const historyOption = screen.getByText('Version History');
    expect(historyOption).toBeDefined();
    fireEvent.click(historyOption);

    expect(onOpenHistoryModal).toHaveBeenCalledTimes(1);
  });

  it('renders New Whiteboard option in action menu and triggers onNewBoard when clicked', () => {
    const onNewBoard = vi.fn();
    render(<WhiteboardHeader {...defaultProps} onNewBoard={onNewBoard} />);

    const moreButton = screen.getByLabelText('Action menu');
    fireEvent.click(moreButton);

    const newOption = screen.getByText('New Whiteboard');
    expect(newOption).toBeDefined();
    fireEvent.click(newOption);

    expect(onNewBoard).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('New Whiteboard')).toBeNull();
  });

  it('renders Shape Customizer and Shape Libraries menu items in dropdown and removes standalone header buttons', () => {
    const onOpenScriptDrawer = vi.fn();
    const onOpenShapeLibrary = vi.fn();
    render(
      <WhiteboardHeader
        {...defaultProps}
        onOpenScriptDrawer={onOpenScriptDrawer}
        onOpenShapeLibrary={onOpenShapeLibrary}
      />
    );

    // Verify standalone quick action buttons are removed from header
    expect(screen.queryByTestId('header-script-drawer-btn')).toBeNull();
    expect(screen.queryByTitle('Shape Libraries & Stencils')).toBeNull();
    expect(screen.queryByText('Customize')).toBeNull();
    expect(screen.queryByText('Shapes')).toBeNull();

    // Dropdown menu items
    const moreButton = screen.getByLabelText('Action menu');
    fireEvent.click(moreButton);

    const customizerOption = screen.getByText('Shape Customizer');
    expect(customizerOption).toBeDefined();
    expect(customizerOption.closest('button')?.querySelector('.text-indigo-600')).not.toBeNull();
    fireEvent.click(customizerOption);
    expect(onOpenScriptDrawer).toHaveBeenCalledTimes(1);

    fireEvent.click(moreButton);
    const libraryOption = screen.getByText('Shape Libraries');
    expect(libraryOption).toBeDefined();
    expect(libraryOption.closest('button')?.querySelector('.text-indigo-600')).not.toBeNull();
    fireEvent.click(libraryOption);
    expect(onOpenShapeLibrary).toHaveBeenCalledTimes(1);
  });

  it('renders dark mode styling classes across header containers and action menu items and excludes theme selector', () => {
    render(<WhiteboardHeader {...defaultProps} />);

    // Action menu button and items
    const moreButton = screen.getByLabelText('Action menu');
    expect(moreButton.className).toContain('dark:bg-slate-900/95');
    expect(moreButton.className).toContain('dark:border-slate-800');
    fireEvent.click(moreButton);

    // Verify theme selector toggle is removed
    expect(screen.queryByText('Light Mode')).toBeNull();
    expect(screen.queryByText('Dark Mode')).toBeNull();

    // Verify menu items have dark classes
    const openCloudBtn = screen.getByText('Open from Cloud').closest('button');
    expect(openCloudBtn?.className).toContain('dark:text-slate-300');
    expect(openCloudBtn?.className).toContain('dark:hover:bg-slate-800');
    expect(openCloudBtn?.className).toContain('dark:hover:text-slate-100');
  });

  it('does not render board name or page name bubble on the canvas header', () => {
    const { container } = render(
      <WhiteboardHeader
        {...defaultProps}
        boardName="System Architecture"
        activePageName="Container Diagram"
      />
    );

    expect(container.querySelector('[data-testid="header-active-page-name"]')).toBeNull();
    expect(screen.queryByText('System Architecture')).toBeNull();
    expect(screen.queryByText('Container Diagram')).toBeNull();
  });

  it('renders Focus All button to the left of collaborator avatars when shapes are selected', () => {
    const onFocusAll = vi.fn();
    const { container } = render(
      <WhiteboardHeader
        {...defaultProps}
        canEdit={true}
        selectedShapeCount={3}
        onFocusAll={onFocusAll}
      />
    );

    const focusBtn = screen.getByRole('button', { name: /Focus All/i });
    expect(focusBtn).toBeDefined();

    const rightHeaderRow = container.querySelector('.top-4.right-4 > div');
    expect(rightHeaderRow).not.toBeNull();
    const children = Array.from(rightHeaderRow?.children || []);
    const focusIndex = children.findIndex((el) => el.contains(focusBtn));
    const avatarIndex = children.findIndex((el) => el.querySelector('[data-testid="user-role-icon"]'));
    expect(focusIndex).toBeLessThan(avatarIndex);
  });

  it('renders role icons on the user avatar for different roles', () => {
    const { rerender } = render(
      <WhiteboardHeader {...defaultProps} role="OWNER" />
    );
    let roleBadge = screen.getByTestId('user-role-icon');
    expect(roleBadge).toBeDefined();
    expect(roleBadge.getAttribute('title')).toBe('Role: OWNER');
    expect(roleBadge.querySelector('.lucide-shield')).not.toBeNull();

    rerender(<WhiteboardHeader {...defaultProps} role="ADMIN" />);
    roleBadge = screen.getByTestId('user-role-icon');
    expect(roleBadge.getAttribute('title')).toBe('Role: ADMIN');
    expect(roleBadge.querySelector('.lucide-shield')).not.toBeNull();

    rerender(<WhiteboardHeader {...defaultProps} role="EDITOR" />);
    roleBadge = screen.getByTestId('user-role-icon');
    expect(roleBadge.getAttribute('title')).toBe('Role: EDITOR');
    expect(roleBadge.querySelector('.lucide-pencil')).not.toBeNull();

    rerender(<WhiteboardHeader {...defaultProps} role="VIEWER" />);
    roleBadge = screen.getByTestId('user-role-icon');
    expect(roleBadge.getAttribute('title')).toBe('Role: VIEWER');
    expect(roleBadge.querySelector('.lucide-eye')).not.toBeNull();
  });

  it('only renders vote counter below user avatars when userVotesUsed > 0 and hides when userVotesUsed is 0 or voting is disabled', () => {
    const { rerender, container } = render(
      <WhiteboardHeader
        {...defaultProps}
        votingConfig={{
          enabled: true,
          isLocked: false,
          maxVotesPerUser: 5,
          categories: [],
        }}
        userVotesUsed={0}
      />
    );

    // userVotesUsed === 0 -> hidden
    expect(screen.queryByTestId('voting-quota-indicator')).toBeNull();

    // userVotesUsed > 0 -> visible
    rerender(
      <WhiteboardHeader
        {...defaultProps}
        votingConfig={{
          enabled: true,
          isLocked: false,
          maxVotesPerUser: 5,
          categories: [],
        }}
        userVotesUsed={3}
      />
    );

    const indicator = screen.getByTestId('voting-quota-indicator');
    expect(indicator).toBeDefined();
    expect(screen.getByText(/Votes: 3\/5 used/)).toBeDefined();
    expect(screen.queryByText('(Locked)')).toBeNull();

    // Verify indicator is inside the right container column
    const rightHeaderBar = container.querySelector('.top-4.right-4');
    expect(rightHeaderBar?.contains(indicator)).toBe(true);

    // Locked state
    rerender(
      <WhiteboardHeader
        {...defaultProps}
        votingConfig={{
          enabled: true,
          isLocked: true,
          maxVotesPerUser: 5,
          categories: [],
        }}
        userVotesUsed={3}
      />
    );
    expect(screen.getByText('(Locked)')).toBeDefined();

    // Disabled state
    rerender(
      <WhiteboardHeader
        {...defaultProps}
        votingConfig={{
          enabled: false,
          isLocked: false,
          maxVotesPerUser: 5,
          categories: [],
        }}
        userVotesUsed={3}
      />
    );
    expect(screen.queryByTestId('voting-quota-indicator')).toBeNull();
  });

  it('renders Pages action in 3-dot menu and triggers onOpenPageDrawer when clicked', () => {
    const onOpenPageDrawer = vi.fn();
    render(
      <WhiteboardHeader
        {...defaultProps}
        onOpenPageDrawer={onOpenPageDrawer}
      />
    );

    const moreButton = screen.getByLabelText('Action menu');
    fireEvent.click(moreButton);

    const pagesBtn = screen.getByTestId('header-pages-menu-btn');
    expect(pagesBtn).toBeDefined();
    expect(screen.getByText('Pages')).toBeDefined();

    fireEvent.click(pagesBtn);
    expect(onOpenPageDrawer).toHaveBeenCalledTimes(1);
  });

  it('renders top left header bar with z-40 and action menu dropdown with z-50 to stack above toolbar', () => {
    const { container } = render(<WhiteboardHeader {...defaultProps} />);

    const leftHeaderBar = container.querySelector('.top-4.left-4');
    expect(leftHeaderBar).not.toBeNull();
    expect(leftHeaderBar?.className).toContain('z-40');

    const rightHeaderBar = container.querySelector('.top-4.right-4');
    expect(rightHeaderBar).not.toBeNull();
    expect(rightHeaderBar?.className).toContain('z-40');

    const moreButton = screen.getByLabelText('Action menu');
    fireEvent.click(moreButton);

    const dropdownMenu = screen.getByText('New Whiteboard').closest('.absolute');
    expect(dropdownMenu).not.toBeNull();
    expect(dropdownMenu?.className).toContain('z-50');
  });
});
