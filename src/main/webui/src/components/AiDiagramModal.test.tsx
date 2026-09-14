// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AiDiagramModal } from './AiDiagramModal';
import * as entitlementContext from '@/lib/entitlementContext';
import * as aiApi from '@/lib/api/ai';

describe('AiDiagramModal', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const mockEntitlements = (hasAiFeature = true) => {
    vi.spyOn(entitlementContext, 'useEntitlements').mockReturnValue({
      plan: hasAiFeature ? 'PRO' : 'FREE',
      status: 'ACTIVE',
      isExpired: false,
      validUntil: null,
      entitlements: null,
      loading: false,
      hasFeature: (feat: string) => (feat === 'ai:text_to_diagram' ? hasAiFeature : false),
      getQuota: (key: string) => ({
        current: 50,
        limit: 1000,
        remaining: 950,
        isUnlimited: false,
        allowed: true,
      }),
      refreshEntitlements: vi.fn(),
      activateKey: vi.fn(),
      deactivateKey: vi.fn(),
    });
  };

  it('renders modal with preset categories, prompt input, and credit quota when open and entitled', () => {
    mockEntitlements(true);

    render(
      <AiDiagramModal
        isOpen={true}
        onClose={vi.fn()}
        onInsertDiagram={vi.fn()}
      />
    );

    expect(screen.getByText('AI Text-to-Diagram Synthesis')).toBeDefined();
    expect(screen.getByText('Cloud Architecture')).toBeDefined();
    expect(screen.getByText('Flowchart')).toBeDefined();
    expect(screen.getByText('Mind Map')).toBeDefined();
    expect(screen.getByText('Sequence Flow')).toBeDefined();
    expect(screen.getByDisplayValue(/Microservices architecture with API Gateway/i)).toBeDefined();
    expect(screen.getByText(/950 \/ 1000 mo/i)).toBeDefined();
  });

  it('updates prompt when selecting a different preset category', () => {
    mockEntitlements(true);

    render(
      <AiDiagramModal
        isOpen={true}
        onClose={vi.fn()}
        onInsertDiagram={vi.fn()}
      />
    );

    const flowchartBtn = screen.getByText('Flowchart');
    fireEvent.click(flowchartBtn);

    expect(screen.getByDisplayValue(/User authentication process with login validation/i)).toBeDefined();
  });

  it('shows upgrade banner when user is on Free plan without ai:text_to_diagram feature', () => {
    mockEntitlements(false);
    const onOpenLicenseModal = vi.fn();

    render(
      <AiDiagramModal
        isOpen={true}
        onClose={vi.fn()}
        onInsertDiagram={vi.fn()}
        onOpenLicenseModal={onOpenLicenseModal}
      />
    );

    expect(screen.getByText(/Pro Feature: AI Diagram Generation/i)).toBeDefined();
    const upgradeBtn = screen.getByText('Upgrade Subscription');
    fireEvent.click(upgradeBtn);
    expect(onOpenLicenseModal).toHaveBeenCalled();
  });

  it('calls generateDiagramFromPrompt and onInsertDiagram on form submit', async () => {
    mockEntitlements(true);
    const onInsertDiagram = vi.fn();
    const onClose = vi.fn();

    vi.spyOn(aiApi, 'generateDiagramFromPrompt').mockResolvedValue({
      success: true,
      doc: { type: 'Doc', children: [] },
      shapeCount: 4,
      connectorCount: 3,
      creditsConsumed: 21,
      remainingCredits: 979,
      summary: 'Generated Architecture',
    });

    render(
      <AiDiagramModal
        isOpen={true}
        onClose={onClose}
        onInsertDiagram={onInsertDiagram}
      />
    );

    const submitBtn = screen.getByText(/Generate & Insert Shapes/i);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(aiApi.generateDiagramFromPrompt).toHaveBeenCalled();
      expect(onInsertDiagram).toHaveBeenCalledWith(expect.objectContaining({ type: 'Doc' }), 'center');
      expect(onClose).toHaveBeenCalled();
    });
  });
});
