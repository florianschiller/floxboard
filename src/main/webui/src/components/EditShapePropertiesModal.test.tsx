// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { EditShapePropertiesModal } from './EditShapePropertiesModal';

describe('EditShapePropertiesModal Component', () => {
  const mockClose = vi.fn();
  const mockSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders nothing when isOpen is false', () => {
    const mockShape = {
      id: 'shape-1',
      properties: { className: 'Order' },
    };

    const { container } = render(
      <EditShapePropertiesModal
        isOpen={false}
        onClose={mockClose}
        shape={mockShape}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when shape is null', () => {
    const { container } = render(
      <EditShapePropertiesModal
        isOpen={true}
        onClose={mockClose}
        shape={null}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders property fields for a UML class shape with string and array properties', () => {
    const mockShape = {
      id: 'uml-1',
      properties: {
        className: 'UserService',
        stereotype: '<<Service>>',
        attributes: ['- id: UUID', '- email: String'],
        methods: ['+ findById(): User', '+ save(u: User): void'],
      },
    };

    render(
      <EditShapePropertiesModal
        isOpen={true}
        onClose={mockClose}
        shape={mockShape}
        onSave={mockSave}
      />
    );

    expect(screen.getByRole('heading', { name: 'Edit Shape Properties' })).toBeDefined();
    expect(screen.getByLabelText('Class Name')).toBeDefined();
    expect(screen.getByLabelText('Stereotype')).toBeDefined();
    expect(screen.getByLabelText('Attributes')).toBeDefined();
    expect(screen.getByLabelText('Methods')).toBeDefined();

    const classNameInput = screen.getByLabelText('Class Name') as HTMLInputElement;
    expect(classNameInput.value).toBe('UserService');

    const attrInput = screen.getByLabelText('Attributes') as HTMLTextAreaElement;
    expect(attrInput.value).toContain('- id: UUID');
    expect(attrInput.value).toContain('- email: String');
  });

  it('allows updating fields and saves parsed properties', () => {
    const mockShape = {
      id: 'story-1',
      properties: {
        code: 'US-101',
        title: 'Sign In',
        points: 3,
        checked: true,
      },
    };

    render(
      <EditShapePropertiesModal
        isOpen={true}
        onClose={mockClose}
        shape={mockShape}
        onSave={mockSave}
      />
    );

    const titleInput = screen.getByLabelText('Title');
    fireEvent.change(titleInput, { target: { value: 'User Sign In with OAuth' } });

    const pointsInput = screen.getByLabelText('Story Points');
    fireEvent.change(pointsInput, { target: { value: '8' } });

    const submitBtn = screen.getByRole('button', { name: /Apply Changes/i });
    fireEvent.click(submitBtn);

    expect(mockSave).toHaveBeenCalledWith({
      code: 'US-101',
      title: 'User Sign In with OAuth',
      points: 8,
      checked: true,
    });
    expect(mockShape.properties.title).toBe('User Sign In with OAuth');
    expect(mockShape.properties.points).toBe(8);
    expect(mockClose).toHaveBeenCalled();
  });

  it('supports adding and deleting custom properties', () => {
    const mockShape = {
      id: 'custom-1',
      properties: {
        label: 'Node 1',
      },
    };

    render(
      <EditShapePropertiesModal
        isOpen={true}
        onClose={mockClose}
        shape={mockShape}
        onSave={mockSave}
      />
    );

    // Add custom property
    const keyInput = screen.getByPlaceholderText(/Key name/i);
    fireEvent.change(keyInput, { target: { value: 'region' } });

    const addBtn = screen.getByRole('button', { name: /^Add$/i });
    fireEvent.click(addBtn);

    expect(screen.getByText('region')).toBeDefined();

    const regionInput = screen.getByLabelText('region');
    fireEvent.change(regionInput, { target: { value: 'eu-central-1' } });

    // Remove original label property
    const removeLabelBtn = screen.getByRole('button', { name: /Remove property label/i });
    fireEvent.click(removeLabelBtn);

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Apply Changes/i });
    fireEvent.click(submitBtn);

    expect(mockSave).toHaveBeenCalledWith({
      region: 'eu-central-1',
    });
  });

  it('validates numeric fields and rejects non-numeric input', () => {
    const mockShape = {
      id: 'meter-1',
      properties: {
        points: 5,
      },
    };

    render(
      <EditShapePropertiesModal
        isOpen={true}
        onClose={mockClose}
        shape={mockShape}
        onSave={mockSave}
      />
    );

    const pointsInput = screen.getByLabelText('Story Points');
    fireEvent.change(pointsInput, { target: { value: 'invalid-number' } });

    const submitBtn = screen.getByRole('button', { name: /Apply Changes/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/Invalid numeric value/i)).toBeDefined();
    expect(mockSave).not.toHaveBeenCalled();
  });
});
