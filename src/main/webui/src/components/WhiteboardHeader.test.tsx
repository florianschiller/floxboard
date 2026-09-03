// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { WhiteboardHeader } from './WhiteboardHeader';
import * as entitlementContext from '@/lib/entitlementContext';

describe('WhiteboardHeader export integration', () => {
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

    expect(screen.getByText('PRO')).toBeDefined();
    fireEvent.click(screen.getByText('Export PDF'));

    expect(onExportPDF).not.toHaveBeenCalled();
    // LicenseModal should now be open
    expect(screen.getByText(/subscription & entitlements/i)).toBeDefined();
  });
});
