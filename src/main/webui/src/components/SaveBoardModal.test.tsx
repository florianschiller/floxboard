// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { SaveBoardModal } from './SaveBoardModal';

describe('SaveBoardModal', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <SaveBoardModal
        isOpen={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
        initialName="My Whiteboard"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('disables save button when initial name is not changed', () => {
    render(
      <SaveBoardModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        initialName="My Whiteboard"
      />
    );

    const input = screen.getByPlaceholderText('Enter board name...') as HTMLInputElement;
    expect(input.value).toBe('My Whiteboard');

    const saveButton = screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);
  });

  it('disables save button when name is cleared or only whitespace', () => {
    render(
      <SaveBoardModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        initialName="My Whiteboard"
      />
    );

    const input = screen.getByPlaceholderText('Enter board name...') as HTMLInputElement;
    const saveButton = screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement;

    fireEvent.change(input, { target: { value: '   ' } });
    expect(saveButton.disabled).toBe(true);
  });

  it('enables save button when a new name is defined and calls onSave on submit', async () => {
    const onSaveMock = vi.fn().mockResolvedValue(undefined);
    const onCloseMock = vi.fn();

    render(
      <SaveBoardModal
        isOpen={true}
        onClose={onCloseMock}
        onSave={onSaveMock}
        initialName="My Whiteboard"
      />
    );

    const input = screen.getByPlaceholderText('Enter board name...') as HTMLInputElement;
    const saveButton = screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement;

    fireEvent.change(input, { target: { value: 'New Awesome Board' } });
    expect(saveButton.disabled).toBe(false);

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(onSaveMock).toHaveBeenCalledWith('New Awesome Board');
    });
  });

  it('displays error message if onSave rejects', async () => {
    const onSaveMock = vi.fn().mockRejectedValue(new Error('A whiteboard with this name already exists'));

    render(
      <SaveBoardModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={onSaveMock}
        initialName="My Whiteboard"
      />
    );

    const input = screen.getByPlaceholderText('Enter board name...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Duplicate Board' } });

    const saveButton = screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement;
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('A whiteboard with this name already exists')).toBeDefined();
    });
  });

  it('calls onClose when Cancel button is clicked', () => {
    const onCloseMock = vi.fn();

    render(
      <SaveBoardModal
        isOpen={true}
        onClose={onCloseMock}
        onSave={vi.fn()}
        initialName="My Whiteboard"
      />
    );

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
