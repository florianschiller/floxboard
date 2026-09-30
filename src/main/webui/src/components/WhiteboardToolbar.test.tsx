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

    // Shapes button is present
    const shapesBtn = screen.getByTestId('toolbar-shapes-btn');
    expect(shapesBtn).toBeDefined();

    // Open shapes flyout
    fireEvent.click(shapesBtn);

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

  it('renders Line, Connector, and Frame tools in shapes flyout and triggers their actions', () => {
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

    const shapesBtn = screen.getByTestId('toolbar-shapes-btn');
    expect(shapesBtn).toBeDefined();

    // Open flyout for Line
    fireEvent.click(shapesBtn);
    const lineBtn = screen.getByTitle('Line');
    expect(lineBtn).toBeDefined();
    fireEvent.click(lineBtn);
    expect(onAddLineMock).toHaveBeenCalledTimes(1);

    // Open flyout for Connector
    fireEvent.click(shapesBtn);
    const connectorBtn = screen.getByTitle('Connector');
    expect(connectorBtn).toBeDefined();
    fireEvent.click(connectorBtn);
    expect(onAddConnectorMock).toHaveBeenCalledTimes(1);

    // Open flyout for Frame
    fireEvent.click(shapesBtn);
    const frameBtn = screen.getByTitle('Frame');
    expect(frameBtn).toBeDefined();
    fireEvent.click(frameBtn);
    expect(onAddFrameMock).toHaveBeenCalledTimes(1);
  });

  it('renders Shape Customizer toggle button and triggers onOpenScriptDrawer', () => {
    const onOpenScriptDrawer = vi.fn();
    render(
      <WhiteboardToolbar
        isViewer={false}
        activeColor={{ stroke: '#000000', fill: '#ffffff' }}
        onColorChange={vi.fn()}
        onAddShape={vi.fn()}
        onAddLine={vi.fn()}
        onAddText={vi.fn()}
        onOpenScriptDrawer={onOpenScriptDrawer}
        onZoom={vi.fn()}
      />
    );

    const customizerBtn = screen.getByTestId('toolbar-script-drawer-btn');
    expect(customizerBtn).toBeDefined();
    expect(customizerBtn.getAttribute('title')).toBe('Customize Shape (Properties, Style & Script)');
    expect(customizerBtn.className).toContain('text-indigo-600');

    fireEvent.click(customizerBtn);
    expect(onOpenScriptDrawer).toHaveBeenCalledTimes(1);
  });

  it('renders active tool with indigo highlight style', () => {
    render(
      <WhiteboardToolbar
        isViewer={false}
        activeTool="freehand"
        activeColor={{ stroke: '#000000', fill: '#ffffff' }}
        onColorChange={vi.fn()}
        onAddShape={vi.fn()}
        onAddLine={vi.fn()}
        onAddText={vi.fn()}
        onZoom={vi.fn()}
      />
    );

    const freehandBtn = screen.getByTitle('Freehand');
    expect(freehandBtn.className).toContain('bg-indigo-100');
    expect(freehandBtn.className).toContain('text-indigo-700');
  });

  it('renders page navigation buttons and handles disabled states at boundaries', () => {
    const onPrevPage = vi.fn();
    const onNextPage = vi.fn();
    const pages = [
      { id: 'page_1', name: 'Page 1', order: 0 },
      { id: 'page_2', name: 'Page 2', order: 1 },
      { id: 'page_3', name: 'Page 3', order: 2 },
    ];

    const { rerender } = render(
      <WhiteboardToolbar
        isViewer={false}
        activeColor={{ stroke: '#000000', fill: '#ffffff' }}
        onColorChange={vi.fn()}
        onAddShape={vi.fn()}
        onAddLine={vi.fn()}
        onAddText={vi.fn()}
        onZoom={vi.fn()}
        pages={pages}
        activePageId="page_1"
        onPrevPage={onPrevPage}
        onNextPage={onNextPage}
      />
    );

    const prevBtn = screen.getByTestId('toolbar-prev-page-btn');
    const nextBtn = screen.getByTestId('toolbar-next-page-btn');

    expect(prevBtn).toBeDefined();
    expect(nextBtn).toBeDefined();

    // On first page, prev is disabled, next is enabled
    expect((prevBtn as HTMLButtonElement).disabled).toBe(true);
    expect((nextBtn as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(nextBtn);
    expect(onNextPage).toHaveBeenCalledTimes(1);

    // On middle page, both are enabled
    rerender(
      <WhiteboardToolbar
        isViewer={false}
        activeColor={{ stroke: '#000000', fill: '#ffffff' }}
        onColorChange={vi.fn()}
        onAddShape={vi.fn()}
        onAddLine={vi.fn()}
        onAddText={vi.fn()}
        onZoom={vi.fn()}
        pages={pages}
        activePageId="page_2"
        onPrevPage={onPrevPage}
        onNextPage={onNextPage}
      />
    );

    expect((prevBtn as HTMLButtonElement).disabled).toBe(false);
    expect((nextBtn as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(prevBtn);
    expect(onPrevPage).toHaveBeenCalledTimes(1);

    // On last page, prev is enabled, next is disabled
    rerender(
      <WhiteboardToolbar
        isViewer={false}
        activeColor={{ stroke: '#000000', fill: '#ffffff' }}
        onColorChange={vi.fn()}
        onAddShape={vi.fn()}
        onAddLine={vi.fn()}
        onAddText={vi.fn()}
        onZoom={vi.fn()}
        pages={pages}
        activePageId="page_3"
        onPrevPage={onPrevPage}
        onNextPage={onNextPage}
      />
    );

    expect((prevBtn as HTMLButtonElement).disabled).toBe(false);
    expect((nextBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders page navigation buttons in viewer mode and triggers page navigation', () => {
    const onPrevPage = vi.fn();
    const onNextPage = vi.fn();
    const pages = [
      { id: 'page_1', name: 'Page 1', order: 0 },
      { id: 'page_2', name: 'Page 2', order: 1 },
    ];

    render(
      <WhiteboardToolbar
        isViewer={true}
        activeColor={{ stroke: '#000000', fill: '#ffffff' }}
        onColorChange={vi.fn()}
        onAddShape={vi.fn()}
        onAddLine={vi.fn()}
        onAddText={vi.fn()}
        onZoom={vi.fn()}
        pages={pages}
        activePageId="page_1"
        onPrevPage={onPrevPage}
        onNextPage={onNextPage}
      />
    );

    const prevBtn = screen.getByTestId('toolbar-prev-page-btn');
    const nextBtn = screen.getByTestId('toolbar-next-page-btn');

    expect(prevBtn).toBeDefined();
    expect(nextBtn).toBeDefined();
    expect((prevBtn as HTMLButtonElement).disabled).toBe(true);
    expect((nextBtn as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(nextBtn);
    expect(onNextPage).toHaveBeenCalledTimes(1);
  });

  it('renders editor toolbar positioned on the left side with vertical flex layout and viewport constraints', () => {
    const { container } = render(
      <WhiteboardToolbar
        isViewer={false}
        activeColor={{ stroke: '#000000', fill: '#ffffff' }}
        onColorChange={vi.fn()}
        onAddShape={vi.fn()}
        onAddLine={vi.fn()}
        onAddText={vi.fn()}
        onZoom={vi.fn()}
      />
    );

    const toolbarWrapper = container.firstElementChild as HTMLElement;
    expect(toolbarWrapper).toBeDefined();
    expect(toolbarWrapper.className).toContain('left-4');
    expect(toolbarWrapper.className).toContain('top-1/2');
    expect(toolbarWrapper.className).toContain('-translate-y-1/2');

    const scrollContainer = toolbarWrapper.firstElementChild as HTMLElement;
    expect(scrollContainer).toBeDefined();
    expect(scrollContainer.className).toContain('flex-col');
    expect(scrollContainer.className).toContain('max-h-[calc(100vh-4rem)]');
    expect(scrollContainer.className).toContain('overflow-y-auto');
  });

  it('renders viewer mode toolbar positioned on the left side with vertical flex layout and viewport constraints', () => {
    const { container } = render(
      <WhiteboardToolbar
        isViewer={true}
        activeColor={{ stroke: '#000000', fill: '#ffffff' }}
        onColorChange={vi.fn()}
        onAddShape={vi.fn()}
        onAddLine={vi.fn()}
        onAddText={vi.fn()}
        onZoom={vi.fn()}
      />
    );

    const toolbarWrapper = container.firstElementChild as HTMLElement;
    expect(toolbarWrapper).toBeDefined();
    expect(toolbarWrapper.className).toContain('left-4');
    expect(toolbarWrapper.className).toContain('top-1/2');
    expect(toolbarWrapper.className).toContain('-translate-y-1/2');

    const scrollContainer = toolbarWrapper.firstElementChild as HTMLElement;
    expect(scrollContainer).toBeDefined();
    expect(scrollContainer.className).toContain('flex-col');
    expect(scrollContainer.className).toContain('max-h-[calc(100vh-4rem)]');
    expect(scrollContainer.className).toContain('overflow-y-auto');
  });

  it('opens color picker flyout, selects a color swatch, and triggers onColorChange outside scroll container', () => {
    const onColorChangeMock = vi.fn();
    const { container } = render(
      <WhiteboardToolbar
        isViewer={false}
        activeColor={{ stroke: '#000000', fill: '#ffffff' }}
        onColorChange={onColorChangeMock}
        onAddShape={vi.fn()}
        onAddLine={vi.fn()}
        onAddText={vi.fn()}
        onZoom={vi.fn()}
      />
    );

    const toolbarWrapper = container.firstElementChild as HTMLElement;
    const scrollContainer = toolbarWrapper.firstElementChild as HTMLElement;

    const colorPickerBtn = screen.getByTestId('toolbar-color-picker-btn');
    expect(colorPickerBtn).toBeDefined();
    expect(screen.queryByTestId('toolbar-color-flyout')).toBeNull();

    // Open color flyout
    fireEvent.click(colorPickerBtn);
    const colorFlyout = screen.getByTestId('toolbar-color-flyout');
    expect(colorFlyout).toBeDefined();

    // Verify flyout is rendered outside the scrollable container
    expect(scrollContainer.contains(colorFlyout)).toBe(false);
    expect(toolbarWrapper.contains(colorFlyout)).toBe(true);

    // Select Red color swatch
    const redBtn = screen.getByTitle('Red');
    expect(redBtn).toBeDefined();
    fireEvent.click(redBtn);

    expect(onColorChangeMock).toHaveBeenCalledWith({ stroke: '#d0021b', fill: '#f8d7da' });
    expect(screen.queryByTestId('toolbar-color-flyout')).toBeNull();
  });

  it('opens shapes flyout, selects Box and Oval shapes, and closes flyout outside scroll container', () => {
    const onAddShapeMock = vi.fn();
    const { container } = render(
      <WhiteboardToolbar
        isViewer={false}
        activeColor={{ stroke: '#000000', fill: '#ffffff' }}
        onColorChange={vi.fn()}
        onAddShape={onAddShapeMock}
        onAddLine={vi.fn()}
        onAddText={vi.fn()}
        onZoom={vi.fn()}
      />
    );

    const toolbarWrapper = container.firstElementChild as HTMLElement;
    const scrollContainer = toolbarWrapper.firstElementChild as HTMLElement;
    const shapesBtn = screen.getByTestId('toolbar-shapes-btn');

    // Open shapes flyout and pick Box (Rectangle)
    fireEvent.click(shapesBtn);
    const shapesFlyout = screen.getByTestId('toolbar-shapes-flyout');
    expect(shapesFlyout).toBeDefined();

    // Verify flyout is rendered outside the scrollable container
    expect(scrollContainer.contains(shapesFlyout)).toBe(false);
    expect(toolbarWrapper.contains(shapesFlyout)).toBe(true);

    const rectBtn = screen.getByTestId('toolbar-shape-rectangle-btn');
    fireEvent.click(rectBtn);
    expect(onAddShapeMock).toHaveBeenCalledWith('Box');
    expect(screen.queryByTestId('toolbar-shapes-flyout')).toBeNull();

    // Open shapes flyout and pick Oval (Circle)
    fireEvent.click(shapesBtn);
    expect(screen.getByTestId('toolbar-shapes-flyout')).toBeDefined();
    const ovalBtn = screen.getByTestId('toolbar-shape-oval-btn');
    fireEvent.click(ovalBtn);
    expect(onAddShapeMock).toHaveBeenCalledWith('Oval');
    expect(screen.queryByTestId('toolbar-shapes-flyout')).toBeNull();
  });

  it('closes flyouts when clicking outside or pressing Escape key', () => {
    render(
      <div>
        <div data-testid="outside-area">Outside</div>
        <WhiteboardToolbar
          isViewer={false}
          activeColor={{ stroke: '#000000', fill: '#ffffff' }}
          onColorChange={vi.fn()}
          onAddShape={vi.fn()}
          onAddLine={vi.fn()}
          onAddText={vi.fn()}
          onZoom={vi.fn()}
        />
      </div>
    );

    const colorPickerBtn = screen.getByTestId('toolbar-color-picker-btn');
    const outsideArea = screen.getByTestId('outside-area');

    // Open color flyout, then click outside
    fireEvent.click(colorPickerBtn);
    expect(screen.getByTestId('toolbar-color-flyout')).toBeDefined();
    fireEvent.mouseDown(outsideArea);
    expect(screen.queryByTestId('toolbar-color-flyout')).toBeNull();

    // Open shapes flyout, then press Escape key
    const shapesBtn = screen.getByTestId('toolbar-shapes-btn');
    fireEvent.click(shapesBtn);
    expect(screen.getByTestId('toolbar-shapes-flyout')).toBeDefined();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('toolbar-shapes-flyout')).toBeNull();
  });
});
