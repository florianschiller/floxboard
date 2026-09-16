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

  it('submits the form when pressing Enter key in an input field', () => {
    const mockShape = {
      id: 'story-enter',
      properties: {
        title: 'Initial Title',
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

    const titleInput = screen.getByLabelText('Title');
    fireEvent.change(titleInput, { target: { value: 'Updated Title via Enter' } });
    fireEvent.submit(titleInput.closest('form')!);

    expect(mockSave).toHaveBeenCalledWith({
      title: 'Updated Title via Enter',
      points: 5,
    });
    expect(mockClose).toHaveBeenCalled();
  });

  it('submits the form when pressing Ctrl+Enter in a multiline textarea', () => {
    const mockShape = {
      id: 'uml-ctrl-enter',
      properties: {
        className: 'OrderService',
        attributes: ['- id: UUID'],
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

    const attrInput = screen.getByLabelText('Attributes');
    fireEvent.change(attrInput, { target: { value: '- id: UUID\n- total: Number' } });
    fireEvent.keyDown(attrInput, { key: 'Enter', ctrlKey: true });

    expect(mockSave).toHaveBeenCalledWith({
      className: 'OrderService',
      attributes: ['- id: UUID', '- total: Number'],
    });
    expect(mockClose).toHaveBeenCalled();
  });

  it('closes the modal when pressing Escape', () => {
    const mockShape = {
      id: 'story-esc',
      properties: { title: 'Test' },
    };

    render(
      <EditShapePropertiesModal
        isOpen={true}
        onClose={mockClose}
        shape={mockShape}
        onSave={mockSave}
      />
    );

    const form = screen.getByRole('dialog').querySelector('form')!;
    fireEvent.keyDown(form, { key: 'Escape' });

    expect(mockClose).toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('renders enum dropdown and color picker for rich property types', () => {
    const mockShape = {
      id: 'rich-shape-1',
      properties: {
        title: 'Story 101',
        priority: 'HIGH',
        status: 'IN PROGRESS',
        color: '#ff5722',
        checked: false,
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

    // Verify Enum Selects
    const prioritySelect = screen.getByLabelText('Priority') as HTMLSelectElement;
    expect(prioritySelect.tagName).toBe('SELECT');
    expect(prioritySelect.value).toBe('HIGH');
    fireEvent.change(prioritySelect, { target: { value: 'CRITICAL' } });

    const statusSelect = screen.getByLabelText('Status') as HTMLSelectElement;
    expect(statusSelect.tagName).toBe('SELECT');
    expect(statusSelect.value).toBe('IN PROGRESS');
    fireEvent.change(statusSelect, { target: { value: 'DONE' } });

    // Verify Color Picker
    const colorInput = screen.getByLabelText('Color Accent') as HTMLInputElement;
    expect(colorInput.type).toBe('color');
    expect(colorInput.value).toBe('#ff5722');
    fireEvent.change(colorInput, { target: { value: '#10b981' } });

    // Verify Checkbox
    const checkedInput = screen.getByLabelText('Checked / Active') as HTMLInputElement;
    expect(checkedInput.type).toBe('checkbox');
    expect(checkedInput.checked).toBe(false);
    fireEvent.click(checkedInput);

    // Apply
    const submitBtn = screen.getByRole('button', { name: /Apply Changes/i });
    fireEvent.click(submitBtn);

    expect(mockSave).toHaveBeenCalledWith({
      title: 'Story 101',
      priority: 'CRITICAL',
      status: 'DONE',
      color: '#10b981',
      checked: true,
      points: 5,
    });
  });

  it('supports adding custom enum properties with comma-separated option definitions', () => {
    const mockShape = {
      id: 'custom-enum-shape',
      properties: {},
    };

    render(
      <EditShapePropertiesModal
        isOpen={true}
        onClose={mockClose}
        shape={mockShape}
        onSave={mockSave}
      />
    );

    // Fill new custom property with Enum type
    const keyInput = screen.getByPlaceholderText(/Key name/i);
    fireEvent.change(keyInput, { target: { value: 'environment' } });

    const typeSelect = screen.getByDisplayValue('Text') as HTMLSelectElement;
    fireEvent.change(typeSelect, { target: { value: 'enum' } });

    // Provide custom options
    const optionsInput = screen.getByPlaceholderText(/Comma-separated options/i);
    fireEvent.change(optionsInput, { target: { value: 'DEVELOPMENT, STAGING, PRODUCTION' } });

    const addBtn = screen.getByRole('button', { name: /^Add$/i });
    fireEvent.click(addBtn);

    // Verify added enum select
    const envSelect = screen.getByLabelText('environment') as HTMLSelectElement;
    expect(envSelect.tagName).toBe('SELECT');
    expect(envSelect.options.length).toBe(3);
    expect(envSelect.value).toBe('DEVELOPMENT');

    fireEvent.change(envSelect, { target: { value: 'PRODUCTION' } });

    // Apply
    const submitBtn = screen.getByRole('button', { name: /Apply Changes/i });
    fireEvent.click(submitBtn);

    expect(mockSave).toHaveBeenCalledWith({
      environment: 'PRODUCTION',
    });
  });

  it('populates initial properties from shape.customData.properties when shape.properties is undefined', () => {
    const mockShape: any = {
      id: 'custom-data-fallback-shape',
      customData: {
        properties: {
          code: 'AG-99',
          title: 'Fallback Story Title',
          points: 13,
          priority: 'CRITICAL',
        },
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

    expect(screen.getByText('Fallback Story Title')).toBeDefined();
    const titleInput = screen.getByLabelText('Title') as HTMLInputElement;
    expect(titleInput.value).toBe('Fallback Story Title');
    const pointsInput = screen.getByLabelText('Story Points') as HTMLInputElement;
    expect(pointsInput.value).toBe('13');

    const submitBtn = screen.getByRole('button', { name: /Apply Changes/i });
    fireEvent.click(submitBtn);

    expect(mockSave).toHaveBeenCalledWith({
      code: 'AG-99',
      title: 'Fallback Story Title',
      points: 13,
      priority: 'CRITICAL',
    });
    expect(mockShape.properties).toEqual({
      code: 'AG-99',
      title: 'Fallback Story Title',
      points: 13,
      priority: 'CRITICAL',
    });
    expect(mockShape.customData.properties).toEqual({
      code: 'AG-99',
      title: 'Fallback Story Title',
      points: 13,
      priority: 'CRITICAL',
    });
  });
});
