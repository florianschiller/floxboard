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
    expect(screen.queryByTitle('Circle / Oval')).toBeNull();
    expect(screen.queryByTitle('Freehand')).toBeNull();
    expect(screen.queryByTitle('Marker')).toBeNull();
    expect(screen.queryByTitle('Eraser')).toBeNull();
    expect(screen.queryByTitle('Line')).toBeNull();
    expect(screen.queryByTitle('Connector')).toBeNull();
    expect(screen.queryByTitle('Frame')).toBeNull();
  });

  it('does not render legacy triangle and diamond buttons in editor toolbar', () => {
    render(
      <WhiteboardToolbar
        isViewer={false}
        activeColor={{ stroke: '#000000', fill: '#ffffff' }}
        onColorChange={vi.fn()}
        onAddShape={vi.fn()}
        onAddLine={vi.fn()}
        onAddText={vi.fn()}
        onUploadImage={vi.fn()}
        onZoom={vi.fn()}
      />
    );

    expect(screen.queryByTitle('Triangle')).toBeNull();
    expect(screen.queryByTitle('Diamond / Rhombus')).toBeNull();
    expect(screen.getByTitle('Rectangle')).toBeDefined();
    expect(screen.getByTitle('Circle / Oval')).toBeDefined();
  });

  it('renders Freehand and Marker drawing tools and triggers onToolChange', () => {
    const onToolChangeMock = vi.fn();
    render(
      <WhiteboardToolbar
        isViewer={false}
        activeTool="freehand"
        activeColor={{ stroke: '#000000', fill: '#ffffff' }}
        onColorChange={vi.fn()}
        onToolChange={onToolChangeMock}
        onAddShape={vi.fn()}
        onAddLine={vi.fn()}
        onAddText={vi.fn()}
        onUploadImage={vi.fn()}
        onZoom={vi.fn()}
      />
    );

    const freehandBtn = screen.getByTitle('Freehand');
    const markerBtn = screen.getByTitle('Marker');
    expect(freehandBtn).toBeDefined();
    expect(markerBtn).toBeDefined();

    fireEvent.click(markerBtn);
    expect(onToolChangeMock).toHaveBeenCalledWith('marker');

    fireEvent.click(freehandBtn);
    expect(onToolChangeMock).toHaveBeenCalledWith('freehand');
  });

  it('renders Eraser tool and triggers onToolChange', () => {
    const onToolChangeMock = vi.fn();
    render(
      <WhiteboardToolbar
        isViewer={false}
        activeTool="select"
        activeColor={{ stroke: '#000000', fill: '#ffffff' }}
        onColorChange={vi.fn()}
        onToolChange={onToolChangeMock}
        onAddShape={vi.fn()}
        onAddLine={vi.fn()}
        onAddText={vi.fn()}
        onUploadImage={vi.fn()}
        onZoom={vi.fn()}
      />
    );

    const eraserBtn = screen.getByTitle('Eraser');
    expect(eraserBtn).toBeDefined();

    fireEvent.click(eraserBtn);
    expect(onToolChangeMock).toHaveBeenCalledWith('eraser');
  });

  it('renders Line, Connector, and Frame tools and triggers their actions', () => {
    const onAddLineMock = vi.fn();
    const onAddConnectorMock = vi.fn();
    const onAddFrameMock = vi.fn();

    render(
      <WhiteboardToolbar
        isViewer={false}
        activeTool="select"
        activeColor={{ stroke: '#000000', fill: '#ffffff' }}
        onColorChange={vi.fn()}
        onAddShape={vi.fn()}
        onAddLine={onAddLineMock}
        onAddConnector={onAddConnectorMock}
        onAddFrame={onAddFrameMock}
        onAddText={vi.fn()}
        onUploadImage={vi.fn()}
        onZoom={vi.fn()}
      />
    );

    const lineBtn = screen.getByTitle('Line');
    const connectorBtn = screen.getByTitle('Connector');
    const frameBtn = screen.getByTitle('Frame');

    expect(lineBtn).toBeDefined();
    expect(connectorBtn).toBeDefined();
    expect(frameBtn).toBeDefined();

    fireEvent.click(lineBtn);
    expect(onAddLineMock).toHaveBeenCalledTimes(1);

    fireEvent.click(connectorBtn);
    expect(onAddConnectorMock).toHaveBeenCalledTimes(1);

    fireEvent.click(frameBtn);
    expect(onAddFrameMock).toHaveBeenCalledTimes(1);
  });
});
