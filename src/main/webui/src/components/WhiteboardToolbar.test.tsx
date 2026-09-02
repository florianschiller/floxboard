// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { WhiteboardToolbar } from './WhiteboardToolbar';

describe('WhiteboardToolbar Component', () => {
  afterEach(() => {
    cleanup();
  });
  it('renders image upload button and triggers onUploadImage when a file is selected', () => {
    const onUploadImageMock = vi.fn();
    const { container } = render(
      <WhiteboardToolbar
        isViewer={false}
        activeColor={{ stroke: '#000000', fill: '#ffffff' }}
        onColorChange={vi.fn()}
        onAddShape={vi.fn()}
        onAddLine={vi.fn()}
        onAddText={vi.fn()}
        onUploadImage={onUploadImageMock}
        onZoom={vi.fn()}
      />
    );

    const uploadButton = screen.getByTitle('Upload Image');
    expect(uploadButton).toBeDefined();

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeDefined();

    const file = new File(['dummy image content'], 'test.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(onUploadImageMock).toHaveBeenCalledTimes(1);
    expect(onUploadImageMock).toHaveBeenCalledWith(file);
  });

  it('renders viewer mode without edit buttons when isViewer is true', () => {
    render(
      <WhiteboardToolbar
        isViewer={true}
        activeColor={{ stroke: '#000000', fill: '#ffffff' }}
        onColorChange={vi.fn()}
        onAddShape={vi.fn()}
        onAddLine={vi.fn()}
        onAddText={vi.fn()}
        onUploadImage={vi.fn()}
        onZoom={vi.fn()}
      />
    );

    expect(screen.getByText(/Viewer Mode/i)).toBeDefined();
    expect(screen.queryByTitle('Upload Image')).toBeNull();
    expect(screen.queryByTitle('Rectangle')).toBeNull();
  });
});
