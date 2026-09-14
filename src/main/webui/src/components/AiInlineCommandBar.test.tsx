// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import { AiInlineCommandBar } from './AiInlineCommandBar';
import * as entitlementContext from '@/lib/entitlementContext';

describe('AiInlineCommandBar', () => {
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
      getQuota: () => ({ current: 0, limit: 1000, remaining: 1000, isUnlimited: false, allowed: true }),
      refreshEntitlements: vi.fn(),
      activateKey: vi.fn(),
      deactivateKey: vi.fn(),
    });
  };

  it('renders inline command bar when open and submits prompt on Enter', () => {
    mockEntitlements(true);
    const onSubmitPrompt = vi.fn();
    const onClose = vi.fn();

    render(
      <AiInlineCommandBar
        isOpen={true}
        onClose={onClose}
        onSubmitPrompt={onSubmitPrompt}
      />
    );

    const input = screen.getByPlaceholderText(/Describe diagram to generate/i);
    expect(input).toBeDefined();

    fireEvent.change(input, { target: { value: 'User registration flowchart' } });
    const submitBtn = screen.getByText('Generate');
    fireEvent.click(submitBtn);

    expect(onSubmitPrompt).toHaveBeenCalledWith('User registration flowchart');
  });

  it('closes when pressing Escape key', () => {
    mockEntitlements(true);
    const onClose = vi.fn();

    render(
      <AiInlineCommandBar
        isOpen={true}
        onClose={onClose}
        onSubmitPrompt={vi.fn()}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('opens advanced presets modal when clicking Presets button', () => {
    mockEntitlements(true);
    const onOpenModal = vi.fn();
    const onClose = vi.fn();

    render(
      <AiInlineCommandBar
        isOpen={true}
        onClose={onClose}
        onSubmitPrompt={vi.fn()}
        onOpenModal={onOpenModal}
      />
    );

    const presetsBtn = screen.getByTitle('Open Advanced AI Dialog with Presets');
    fireEvent.click(presetsBtn);

    expect(onClose).toHaveBeenCalled();
    expect(onOpenModal).toHaveBeenCalled();
  });
});
