// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { WhiteboardToolbar, WHITEBOARD_COLORS } from './WhiteboardToolbar';

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

  it('does not render legacy triangle and diamond buttons and renders direct shapes in editor toolbar', () => {
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
    expect(screen.getByTitle('Line')).toBeDefined();
    expect(screen.getByTitle('Connector')).toBeDefined();
    expect(screen.getByTitle('Frame')).toBeDefined();
  });

  it('renders Freehand, Marker, and Eraser drawing tools and triggers onToolChange', () => {
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
    const eraserBtn = screen.getByTitle('Eraser');

    expect(freehandBtn).toBeDefined();
    expect(markerBtn).toBeDefined();
    expect(eraserBtn).toBeDefined();

    expect(freehandBtn.className).toContain('bg-indigo-100');

    fireEvent.click(markerBtn);
    expect(onToolChangeMock).toHaveBeenCalledWith('marker');

    fireEvent.click(eraserBtn);
    expect(onToolChangeMock).toHaveBeenCalledWith('eraser');
  });

  it('renders Navigation tools (Select, Hand, Zoom Out, Zoom In) and triggers their actions', () => {
    const onToolChangeMock = vi.fn();
    const onZoomMock = vi.fn();

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
        onZoom={onZoomMock}
      />
    );

    const selectBtn = screen.getByTitle('Select');
    const handBtn = screen.getByTitle('Hand (Pan)');
    const zoomOutBtn = screen.getByTitle('Zoom Out');
    const zoomInBtn = screen.getByTitle('Zoom In');

    expect(selectBtn).toBeDefined();
    expect(handBtn).toBeDefined();
    expect(zoomOutBtn).toBeDefined();
    expect(zoomInBtn).toBeDefined();

    expect(selectBtn.className).toContain('bg-indigo-100');

    fireEvent.click(handBtn);
    expect(onToolChangeMock).toHaveBeenCalledWith('hand');

    fireEvent.click(zoomOutBtn);
    expect(onZoomMock).toHaveBeenCalledWith(-0.1);

    fireEvent.click(zoomInBtn);
    expect(onZoomMock).toHaveBeenCalledWith(0.1);
  });

  it('renders Line, Connector, and Frame tools directly and triggers their actions', () => {
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
    expect(lineBtn).toBeDefined();
    fireEvent.click(lineBtn);
    expect(onAddLineMock).toHaveBeenCalledTimes(1);

    const connectorBtn = screen.getByTitle('Connector');
    expect(connectorBtn).toBeDefined();
    fireEvent.click(connectorBtn);
    expect(onAddConnectorMock).toHaveBeenCalledTimes(1);

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

  it('defaults activeTool to hand when not provided', () => {
    render(
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

    const handBtn = screen.getByTitle('Hand (Pan)');
    const selectBtn = screen.getByTitle('Select');
    expect(handBtn.className).toContain('bg-indigo-100');
    expect(handBtn.className).toContain('text-indigo-700');
    expect(selectBtn.className).not.toContain('bg-indigo-100');
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
    expect(toolbarWrapper.className).toContain('absolute');
    expect(toolbarWrapper.className).toContain('left-4');
    expect(toolbarWrapper.className).toContain('top-16');

    const innerCard = toolbarWrapper.firstElementChild as HTMLElement;
    expect(innerCard).toBeDefined();
    expect(innerCard.className).toContain('flex-col');
    expect(innerCard.className).toContain('max-h-[calc(100vh-5rem)]');

    const scrollContainer = innerCard.querySelector('.overflow-y-auto') as HTMLElement;
    expect(scrollContainer).toBeDefined();
    expect(scrollContainer.className).toContain('flex-col');
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
    expect(toolbarWrapper.className).toContain('absolute');
    expect(toolbarWrapper.className).toContain('left-4');
    expect(toolbarWrapper.className).toContain('top-16');

    const innerCard = toolbarWrapper.firstElementChild as HTMLElement;
    expect(innerCard).toBeDefined();
    expect(innerCard.className).toContain('flex-col');
    expect(innerCard.className).toContain('max-h-[calc(100vh-5rem)]');

    const scrollContainer = innerCard.querySelector('.overflow-y-auto') as HTMLElement;
    expect(scrollContainer).toBeDefined();
    expect(scrollContainer.className).toContain('flex-col');
  });

  it('renders direct color swatches and triggers onColorChange when clicked', () => {
    const onColorChangeMock = vi.fn();
    render(
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

    WHITEBOARD_COLORS.forEach((color) => {
      expect(screen.getByTitle(color.name)).toBeDefined();
    });

    const redBtn = screen.getByTitle('Red');
    fireEvent.click(redBtn);
    expect(onColorChangeMock).toHaveBeenCalledWith({ stroke: '#d0021b', fill: '#f8d7da' });

    const blueBtn = screen.getByTitle('Blue');
    fireEvent.click(blueBtn);
    expect(onColorChangeMock).toHaveBeenCalledWith({ stroke: '#007bff', fill: '#cce5ff' });
  });

  it('renders direct shape buttons for Rectangle and Circle / Oval and triggers onAddShape', () => {
    const onAddShapeMock = vi.fn();
    render(
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

    const rectBtn = screen.getByTestId('toolbar-shape-rectangle-btn');
    expect(rectBtn).toBeDefined();
    fireEvent.click(rectBtn);
    expect(onAddShapeMock).toHaveBeenCalledWith('Box');

    const ovalBtn = screen.getByTestId('toolbar-shape-oval-btn');
    expect(ovalBtn).toBeDefined();
    fireEvent.click(ovalBtn);
    expect(onAddShapeMock).toHaveBeenCalledWith('Oval');
  });

  it('collapses and expands toolbar in editor mode', () => {
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

    expect(screen.getByTitle('Select')).toBeDefined();
    expect(screen.queryByTestId('toolbar-expand-btn')).toBeNull();
    const toolbarWrapper = container.firstElementChild as HTMLElement;
    expect(toolbarWrapper.className).toContain('top-16');
    expect(toolbarWrapper.className).toContain('left-4');

    const collapseBtn = screen.getByTestId('toolbar-collapse-btn');
    fireEvent.click(collapseBtn);

    expect(screen.queryByTitle('Select')).toBeNull();
    const expandBtn = screen.getByTestId('toolbar-expand-btn');
    expect(expandBtn).toBeDefined();
    expect(expandBtn.parentElement?.className).toContain('top-16');
    expect(expandBtn.parentElement?.className).toContain('left-4');

    fireEvent.click(expandBtn);
    expect(screen.getByTitle('Select')).toBeDefined();
    expect(screen.queryByTestId('toolbar-expand-btn')).toBeNull();
  });

  it('collapses and expands toolbar in viewer mode', () => {
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

    expect(screen.getByText(/Viewer Mode/i)).toBeDefined();
    expect(screen.queryByTestId('toolbar-expand-btn')).toBeNull();
    const toolbarWrapper = container.firstElementChild as HTMLElement;
    expect(toolbarWrapper.className).toContain('top-16');
    expect(toolbarWrapper.className).toContain('left-4');

    const collapseBtn = screen.getByTestId('toolbar-collapse-btn');
    fireEvent.click(collapseBtn);

    expect(screen.queryByText(/Viewer Mode/i)).toBeNull();
    const expandBtn = screen.getByTestId('toolbar-expand-btn');
    expect(expandBtn).toBeDefined();
    expect(expandBtn.parentElement?.className).toContain('top-16');
    expect(expandBtn.parentElement?.className).toContain('left-4');

    fireEvent.click(expandBtn);
    expect(screen.getByText(/Viewer Mode/i)).toBeDefined();
    expect(screen.queryByTestId('toolbar-expand-btn')).toBeNull();
  });

  it('renders tool groups in horizontal flex rows with dividers and enforces 3-item row limit in editor mode', () => {
    const { container } = render(
      <WhiteboardToolbar
        isViewer={false}
        activeColor={{ stroke: '#000000', fill: '#ffffff' }}
        onColorChange={vi.fn()}
        onAddShape={vi.fn()}
        onAddLine={vi.fn()}
        onAddText={vi.fn()}
        onOpenAiModal={vi.fn()}
        onOpenScriptDrawer={vi.fn()}
        onOpenShapeLibrary={vi.fn()}
        onZoom={vi.fn()}
        pages={[
          { id: 'page-1', name: 'Page 1', order: 0 },
          { id: 'page-2', name: 'Page 2', order: 1 },
        ]}
        activePageId="page-1"
      />
    );

    // Left alignment check on toolbar root and containers
    const toolbarWrapper = container.firstElementChild as HTMLElement;
    expect(toolbarWrapper.className).toContain('items-start');
    const innerCard = toolbarWrapper.firstElementChild as HTMLElement;
    expect(innerCard.className).toContain('items-start');

    // Verify collapse button is headerless
    const collapseBtn = screen.getByTestId('toolbar-collapse-btn');
    expect(collapseBtn.parentElement).toBe(innerCard);
    expect(collapseBtn.previousElementSibling).toBeNull();

    // Group headers in editor mode
    expect(screen.getByText('Navigation')).toBeDefined();
    expect(screen.getByText('Draw')).toBeDefined();
    expect(screen.getByText('Create')).toBeDefined();
    expect(screen.getByText('Color')).toBeDefined();
    expect(screen.getByText('Pages')).toBeDefined();

    // Group 1: Navigation group -> Row 1: Select, Hand (2 items); Row 2: Zoom Out, Zoom In (2 items)
    const selectBtn = screen.getByTitle('Select');
    const handBtn = screen.getByTitle('Hand (Pan)');
    const zoomOutBtn = screen.getByTitle('Zoom Out');
    const zoomInBtn = screen.getByTitle('Zoom In');

    const navRow1 = selectBtn.parentElement;
    expect(navRow1?.className).toContain('flex-row');
    expect(handBtn.parentElement).toBe(navRow1);
    expect(navRow1?.children.length).toBe(2);
    expect(navRow1?.children.length).toBeLessThanOrEqual(3);

    const navRow2 = zoomOutBtn.parentElement;
    expect(navRow2?.className).toContain('flex-row');
    expect(zoomInBtn.parentElement).toBe(navRow2);
    expect(navRow2).not.toBe(navRow1);
    expect(navRow2?.children.length).toBe(2);
    expect(navRow2?.children.length).toBeLessThanOrEqual(3);

    // Group 2: Draw group (Freehand, Marker, Eraser) -> 3 items
    const freehandBtn = screen.getByTitle('Freehand');
    const markerBtn = screen.getByTitle('Marker');
    const eraserBtn = screen.getByTitle('Eraser');
    const drawRow = freehandBtn.parentElement;
    expect(drawRow?.className).toContain('flex-row');
    expect(markerBtn.parentElement).toBe(drawRow);
    expect(eraserBtn.parentElement).toBe(drawRow);
    expect(drawRow?.children.length).toBe(3);
    expect(drawRow?.children.length).toBeLessThanOrEqual(3);

    // Group 3: Create group (Row 1: 3 items, Row 2: 3 items, Row 3: 1 item, Row 4: 3 items)
    const rectBtn = screen.getByTestId('toolbar-shape-rectangle-btn');
    const ovalBtn = screen.getByTestId('toolbar-shape-oval-btn');
    const lineBtn = screen.getByTestId('toolbar-shape-line-btn');
    const createRow1 = rectBtn.parentElement;
    expect(createRow1?.className).toContain('flex-row');
    expect(ovalBtn.parentElement).toBe(createRow1);
    expect(lineBtn.parentElement).toBe(createRow1);
    expect(createRow1?.children.length).toBe(3);
    expect(createRow1?.children.length).toBeLessThanOrEqual(3);

    const connectorBtn = screen.getByTestId('toolbar-shape-connector-btn');
    const frameBtn = screen.getByTestId('toolbar-shape-frame-btn');
    const textBtn = screen.getByTitle('Text');
    const createRow2 = connectorBtn.parentElement;
    expect(createRow2?.className).toContain('flex-row');
    expect(frameBtn.parentElement).toBe(createRow2);
    expect(textBtn.parentElement).toBe(createRow2);
    expect(createRow2).not.toBe(createRow1);
    expect(createRow2?.children.length).toBe(3);
    expect(createRow2?.children.length).toBeLessThanOrEqual(3);

    const uploadBtn = screen.getByTitle('Upload Image');
    const createRow3 = uploadBtn.parentElement;
    expect(createRow3?.className).toContain('flex-row');
    expect(createRow3).not.toBe(createRow2);
    const createRow3Buttons = Array.from(createRow3?.querySelectorAll('button') || []);
    expect(createRow3Buttons.length).toBe(1);
    expect(createRow3Buttons.length).toBeLessThanOrEqual(3);

    const aiBtn = screen.getByTitle('Generate Diagram with AI (Cmd+K / Ctrl+K)');
    const scriptBtn = screen.getByTestId('toolbar-script-drawer-btn');
    const shapeLibBtn = screen.getByTestId('toolbar-shape-library-btn');
    const createRow4 = aiBtn.parentElement;
    expect(createRow4?.className).toContain('flex-row');
    expect(scriptBtn.parentElement).toBe(createRow4);
    expect(shapeLibBtn.parentElement).toBe(createRow4);
    expect(createRow4).not.toBe(createRow3);
    expect(createRow4?.children.length).toBe(3);
    expect(createRow4?.children.length).toBeLessThanOrEqual(3);

    // Group 4: Color group (Row 1: 3 swatches, Row 2: 3 swatches, Row 3: 1 swatch)
    const blackBtn = screen.getByTitle('Black');
    const redBtn = screen.getByTitle('Red');
    const blueBtn = screen.getByTitle('Blue');
    const colorRow1 = blackBtn.parentElement;
    expect(colorRow1?.className).toContain('flex-row');
    expect(redBtn.parentElement).toBe(colorRow1);
    expect(blueBtn.parentElement).toBe(colorRow1);
    expect(colorRow1?.children.length).toBe(3);
    expect(colorRow1?.children.length).toBeLessThanOrEqual(3);

    const greenBtn = screen.getByTitle('Green');
    const yellowBtn = screen.getByTitle('Yellow');
    const purpleBtn = screen.getByTitle('Purple');
    const colorRow2 = greenBtn.parentElement;
    expect(colorRow2?.className).toContain('flex-row');
    expect(yellowBtn.parentElement).toBe(colorRow2);
    expect(purpleBtn.parentElement).toBe(colorRow2);
    expect(colorRow2).not.toBe(colorRow1);
    expect(colorRow2?.children.length).toBe(3);
    expect(colorRow2?.children.length).toBeLessThanOrEqual(3);

    const grayBtn = screen.getByTitle('Gray');
    const colorRow3 = grayBtn.parentElement;
    expect(colorRow3?.className).toContain('flex-row');
    expect(colorRow3).not.toBe(colorRow2);
    expect(colorRow3?.children.length).toBe(1);
    expect(colorRow3?.children.length).toBeLessThanOrEqual(3);

    // Group 5: Pages group (Prev Page, Next Page) -> 2 items
    const prevPageBtn = screen.getByTestId('toolbar-prev-page-btn');
    const nextPageBtn = screen.getByTestId('toolbar-next-page-btn');
    const pageRow = prevPageBtn.parentElement;
    expect(pageRow?.className).toContain('flex-row');
    expect(nextPageBtn.parentElement).toBe(pageRow);
    expect(pageRow?.children.length).toBe(2);
    expect(pageRow?.children.length).toBeLessThanOrEqual(3);
  });

  it('renders Shape Library button and triggers onOpenShapeLibrary when clicked', () => {
    const onOpenShapeLibrary = vi.fn();
    render(
      <WhiteboardToolbar
        isViewer={false}
        activeColor={{ stroke: '#000000', fill: '#ffffff' }}
        onColorChange={vi.fn()}
        onAddShape={vi.fn()}
        onAddLine={vi.fn()}
        onAddText={vi.fn()}
        onOpenShapeLibrary={onOpenShapeLibrary}
        onZoom={vi.fn()}
      />
    );

    const shapeLibBtn = screen.getByTestId('toolbar-shape-library-btn');
    expect(shapeLibBtn).toBeDefined();
    expect(shapeLibBtn.getAttribute('title')).toBe('Shape Libraries & Stencils');

    fireEvent.click(shapeLibBtn);
    expect(onOpenShapeLibrary).toHaveBeenCalledTimes(1);
  });

  it('renders tool groups in horizontal flex rows with dividers in viewer mode', () => {
    const { container } = render(
      <WhiteboardToolbar
        isViewer={true}
        activeColor={{ stroke: '#000000', fill: '#ffffff' }}
        onColorChange={vi.fn()}
        onAddShape={vi.fn()}
        onAddLine={vi.fn()}
        onAddText={vi.fn()}
        onZoom={vi.fn()}
        pages={[
          { id: 'page-1', name: 'Page 1', order: 0 },
          { id: 'page-2', name: 'Page 2', order: 1 },
        ]}
        activePageId="page-1"
      />
    );

    // Left alignment check on toolbar root and containers
    const toolbarWrapper = container.firstElementChild as HTMLElement;
    expect(toolbarWrapper.className).toContain('items-start');
    const innerCard = toolbarWrapper.firstElementChild as HTMLElement;
    expect(innerCard.className).toContain('items-start');

    // Group headers in viewer mode
    expect(screen.getByText('Mode')).toBeDefined();
    expect(screen.getByText('Navigation')).toBeDefined();
    expect(screen.getByText('Pages')).toBeDefined();

    // Navigation controls row in viewer mode
    const zoomInBtn = screen.getByTitle('Zoom In');
    const zoomOutBtn = screen.getByTitle('Zoom Out');
    const navRow = zoomInBtn.parentElement;
    expect(navRow?.className).toContain('flex-row');
    expect(zoomOutBtn.parentElement).toBe(navRow);
    expect(navRow?.children.length).toBe(2);
    expect(navRow?.children.length).toBeLessThanOrEqual(5);

    // Page navigation row in viewer mode
    const prevPageBtn = screen.getByTestId('toolbar-prev-page-btn');
    const nextPageBtn = screen.getByTestId('toolbar-next-page-btn');
    const pageRow = prevPageBtn.parentElement;
    expect(pageRow?.className).toContain('flex-row');
    expect(nextPageBtn.parentElement).toBe(pageRow);
    expect(pageRow?.children.length).toBe(2);
    expect(pageRow?.children.length).toBeLessThanOrEqual(5);
  });

  it('stops wheel event propagation to prevent canvas zooming when scrolling over the toolbar in editor mode', () => {
    const parentWheelHandler = vi.fn();
    const { container } = render(
      <div onWheel={parentWheelHandler}>
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

    const toolbarContainer = container.querySelector('.absolute.left-4') as HTMLElement;
    expect(toolbarContainer).toBeDefined();

    fireEvent.wheel(toolbarContainer, { deltaY: -100 });
    expect(parentWheelHandler).not.toHaveBeenCalled();

    const selectBtn = screen.getByTitle('Select');
    fireEvent.wheel(selectBtn, { deltaY: 100 });
    expect(parentWheelHandler).not.toHaveBeenCalled();
  });

  it('stops wheel event propagation to prevent canvas zooming when scrolling over the toolbar in viewer and collapsed modes', () => {
    const parentWheelHandler = vi.fn();
    const { container, rerender } = render(
      <div onWheel={parentWheelHandler}>
        <WhiteboardToolbar
          isViewer={true}
          activeColor={{ stroke: '#000000', fill: '#ffffff' }}
          onColorChange={vi.fn()}
          onAddShape={vi.fn()}
          onAddLine={vi.fn()}
          onAddText={vi.fn()}
          onZoom={vi.fn()}
        />
      </div>
    );

    // Viewer mode expanded
    const viewerToolbar = container.querySelector('.absolute.left-4') as HTMLElement;
    fireEvent.wheel(viewerToolbar, { deltaY: 50 });
    expect(parentWheelHandler).not.toHaveBeenCalled();

    // Collapse toolbar
    const collapseBtn = screen.getByTestId('toolbar-collapse-btn');
    fireEvent.click(collapseBtn);

    const expandBtn = screen.getByTestId('toolbar-expand-btn');
    fireEvent.wheel(expandBtn, { deltaY: 50 });
    expect(parentWheelHandler).not.toHaveBeenCalled();
  });
});
