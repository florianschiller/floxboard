// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { ShapeScriptDrawer, SCRIPT_SNIPPETS, roundDimension } from './ShapeScriptDrawer';

describe('ShapeScriptDrawer', () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  let mockCtx: any;

  beforeEach(() => {
    vi.useFakeTimers();
    mockCtx = {
      resetTransform: vi.fn(),
      setTransform: vi.fn(),
      scale: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      beginPath: vi.fn(),
      roundRect: vi.fn(),
      ellipse: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      arc: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      setLineDash: vi.fn(),
      drawImage: vi.fn(),
      clip: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 50, height: 14 }),
    };
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  const mockShape = {
    id: 'shape-12345678',
    type: 'Rectangle',
    width: 200,
    height: 120,
    fillColor: '#ffffff',
    strokeColor: '#3b82f6',
    strokeWidth: 2,
    fontFamily: 'Inter, sans-serif',
    fontSize: 14,
    fontColor: '#0f172a',
    opacity: 1,
    script: 'ctx.strokeRect(0, 0, shape.width, shape.height);',
    defaultScript: '// default code',
    properties: { title: 'Test Shape' },
  };

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ShapeScriptDrawer
        isOpen={false}
        onClose={vi.fn()}
        shape={mockShape}
        onApplyScript={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders drawer header, preview canvas, and default Attributes tab when isOpen is true', () => {
    render(
      <ShapeScriptDrawer
        isOpen={true}
        onClose={vi.fn()}
        shape={mockShape}
        onApplyScript={vi.fn()}
      />
    );

    expect(screen.getByTestId('shape-script-drawer')).toBeDefined();
    expect(screen.getByText('Shape Customizer & Script Editor')).toBeDefined();
    expect(screen.getByText('Rectangle')).toBeDefined();
    expect(screen.getByTestId('shape-script-preview-canvas')).toBeDefined();

    // Default active tab is Attributes
    expect(screen.getByTestId('attr-fill-color-input')).toBeDefined();
    expect(screen.getByTestId('attr-stroke-width-slider')).toBeDefined();

    // Switch to Script tab to verify script editor
    fireEvent.click(screen.getByTestId('tab-script'));
    const textarea = screen.getByTestId('shape-script-textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('ctx.strokeRect(0, 0, shape.width, shape.height);');
  });

  it('switches between Attributes, Script, and Properties tabs in order', () => {
    render(
      <ShapeScriptDrawer
        isOpen={true}
        onClose={vi.fn()}
        shape={mockShape}
        onApplyScript={vi.fn()}
      />
    );

    // Initial default tab is Attributes
    expect(screen.getByTestId('attr-fill-color-input')).toBeDefined();

    // Switch to Script Tab (2nd tab)
    const scriptTabBtn = screen.getByTestId('tab-script');
    fireEvent.click(scriptTabBtn);
    expect(screen.getByTestId('shape-script-textarea')).toBeDefined();

    // Switch to Properties Tab (3rd tab)
    const propsTabBtn = screen.getByTestId('tab-properties');
    fireEvent.click(propsTabBtn);

    expect(screen.getByText('Quick Preset Property Fields')).toBeDefined();
    expect(screen.getByText('title')).toBeDefined();
    expect(screen.getByTestId('property-key-input')).toBeDefined();

    // Switch back to Attributes Tab (1st tab)
    const attrsTabBtn = screen.getByTestId('tab-attributes');
    fireEvent.click(attrsTabBtn);
    expect(screen.getByTestId('attr-fill-color-input')).toBeDefined();
  });

  it('manages custom properties: add, edit, apply presets, and delete in Properties tab', () => {
    render(
      <ShapeScriptDrawer
        isOpen={true}
        onClose={vi.fn()}
        shape={mockShape}
        onApplyScript={vi.fn()}
      />
    );

    // Open Properties Tab
    fireEvent.click(screen.getByTestId('tab-properties'));

    // Existing property 'title' is displayed
    expect(screen.getByText('title')).toBeDefined();

    // Add a new property
    const keyInput = screen.getByTestId('property-key-input');
    const typeSelect = screen.getByTestId('property-type-select');
    const valInput = screen.getByTestId('property-value-input');
    const addBtn = screen.getByTestId('add-property-btn');

    fireEvent.change(keyInput, { target: { value: 'score' } });
    fireEvent.change(typeSelect, { target: { value: 'number' } });
    fireEvent.change(valInput, { target: { value: '42' } });
    fireEvent.click(addBtn);

    expect(screen.getByText('score')).toBeDefined();

    // Apply preset field helper
    const presetBtn = screen.getByText('+ Story Points');
    fireEvent.click(presetBtn);
    expect((screen.getByTestId('property-key-input') as HTMLInputElement).value).toBe('points');

    fireEvent.click(screen.getByTestId('add-property-btn'));
    expect(screen.getByText('points')).toBeDefined();

    // Delete a property
    const deleteButtons = screen.getAllByTitle('Delete property');
    expect(deleteButtons.length).toBeGreaterThan(0);
    fireEvent.click(deleteButtons[0]);
    expect(screen.queryByText('title')).toBeNull();
  });

  it('updates visual styling attributes in Attributes tab', () => {
    render(
      <ShapeScriptDrawer
        isOpen={true}
        onClose={vi.fn()}
        shape={mockShape}
        onApplyScript={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('tab-attributes'));

    const fillColorInput = screen.getByTestId('attr-fill-color-input');
    fireEvent.change(fillColorInput, { target: { value: '#ff00ff' } });

    const strokeWidthSlider = screen.getByTestId('attr-stroke-width-slider');
    fireEvent.change(strokeWidthSlider, { target: { value: '6' } });

    const fontSizeInput = screen.getByTestId('attr-font-size-input');
    fireEvent.change(fontSizeInput, { target: { value: '20' } });

    const widthInput = screen.getByTestId('attr-width-input');
    fireEvent.change(widthInput, { target: { value: '350' } });

    expect((fillColorInput as HTMLInputElement).value).toBe('#ff00ff');
    expect((strokeWidthSlider as HTMLInputElement).value).toBe('6');
    expect((fontSizeInput as HTMLInputElement).value).toBe('20');
    expect((widthInput as HTMLInputElement).value).toBe('350');
  });

  it('initializes with default boilerplate when shape has no script attached', () => {
    const unscriptedShape = {
      id: 'rect-1',
      type: 'Rectangle',
      fillColor: '#fef08a',
      strokeColor: '#ca8a04',
      strokeWidth: 2,
    };

    render(
      <ShapeScriptDrawer
        isOpen={true}
        onClose={vi.fn()}
        shape={unscriptedShape}
        onApplyScript={vi.fn()}
      />
    );

    // Switch to Script tab
    fireEvent.click(screen.getByTestId('tab-script'));

    const textarea = screen.getByTestId('shape-script-textarea') as HTMLTextAreaElement;
    expect(textarea.value).toContain('ctx.roundRect(0, 0, w, h');
  });

  it('inserts selected snippet template into code editor', () => {
    render(
      <ShapeScriptDrawer
        isOpen={true}
        onClose={vi.fn()}
        shape={mockShape}
        onApplyScript={vi.fn()}
      />
    );

    // Switch to Script tab
    fireEvent.click(screen.getByTestId('tab-script'));

    const snippetSelect = screen.getByTestId('snippet-select');
    fireEvent.change(snippetSelect, { target: { value: 'kpi-metric-badge' } });

    const textarea = screen.getByTestId('shape-script-textarea') as HTMLTextAreaElement;
    expect(textarea.value).toContain('Metric KPI Badge');
  });

  it('detects syntax errors in code and displays error banner', async () => {
    render(
      <ShapeScriptDrawer
        isOpen={true}
        onClose={vi.fn()}
        shape={mockShape}
        onApplyScript={vi.fn()}
      />
    );

    // Switch to Script tab
    fireEvent.click(screen.getByTestId('tab-script'));

    const textarea = screen.getByTestId('shape-script-textarea');
    fireEvent.change(textarea, { target: { value: 'ctx.strokeRect(0, 0, broken' } });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByTestId('script-error-banner')).toBeDefined();
  });

  it('calls onApplyCustomization and onApplyScript when Apply button is clicked', () => {
    const onApplyCustomization = vi.fn();
    const onApplyScript = vi.fn();
    render(
      <ShapeScriptDrawer
        isOpen={true}
        onClose={vi.fn()}
        shape={mockShape}
        onApplyCustomization={onApplyCustomization}
        onApplyScript={onApplyScript}
      />
    );

    // Switch to Script tab
    fireEvent.click(screen.getByTestId('tab-script'));

    const textarea = screen.getByTestId('shape-script-textarea');
    fireEvent.change(textarea, { target: { value: 'ctx.fillRect(0, 0, 50, 50);' } });

    const applyBtn = screen.getByTestId('apply-script-btn');
    fireEvent.click(applyBtn);

    expect(onApplyScript).toHaveBeenCalledWith(mockShape, 'ctx.fillRect(0, 0, 50, 50);');
    expect(onApplyCustomization).toHaveBeenCalledWith(mockShape, expect.objectContaining({
      script: 'ctx.fillRect(0, 0, 50, 50);',
      properties: { title: 'Test Shape' },
      attributes: expect.objectContaining({
        fillColor: '#ffffff',
        strokeColor: '#3b82f6',
      }),
    }));
    expect(screen.getByText('Applied!')).toBeDefined();
  });

  it('handles Ctrl+Enter shortcut to apply customization', () => {
    const onApplyCustomization = vi.fn();
    const onApplyScript = vi.fn();
    render(
      <ShapeScriptDrawer
        isOpen={true}
        onClose={vi.fn()}
        shape={mockShape}
        onApplyCustomization={onApplyCustomization}
        onApplyScript={onApplyScript}
      />
    );

    // Switch to Script tab
    fireEvent.click(screen.getByTestId('tab-script'));

    const textarea = screen.getByTestId('shape-script-textarea');
    fireEvent.change(textarea, { target: { value: 'ctx.arc(50, 50, 20, 0, 2 * Math.PI);' } });

    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

    expect(onApplyScript).toHaveBeenCalledWith(mockShape, 'ctx.arc(50, 50, 20, 0, 2 * Math.PI);');
    expect(onApplyCustomization).toHaveBeenCalled();
  });

  it('handles Tab key to indent code with 2 spaces', () => {
    render(
      <ShapeScriptDrawer
        isOpen={true}
        onClose={vi.fn()}
        shape={mockShape}
        onApplyScript={vi.fn()}
      />
    );

    // Switch to Script tab
    fireEvent.click(screen.getByTestId('tab-script'));

    const textarea = screen.getByTestId('shape-script-textarea') as HTMLTextAreaElement;
    textarea.selectionStart = 0;
    textarea.selectionEnd = 0;

    fireEvent.keyDown(textarea, { key: 'Tab' });

    expect(textarea.value.startsWith('  ')).toBe(true);
  });

  it('calls onRevertScript and resets to defaultScript when Revert is clicked', () => {
    const onRevertScript = vi.fn();
    render(
      <ShapeScriptDrawer
        isOpen={true}
        onClose={vi.fn()}
        shape={mockShape}
        onApplyScript={vi.fn()}
        onRevertScript={onRevertScript}
      />
    );

    // Switch to Script tab
    fireEvent.click(screen.getByTestId('tab-script'));

    const revertBtn = screen.getByTestId('revert-script-btn');
    fireEvent.click(revertBtn);

    expect(onRevertScript).toHaveBeenCalledWith(mockShape);
    const textarea = screen.getByTestId('shape-script-textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('// default code');
  });

  it('calls onClearScript and clears code when Clear is clicked', () => {
    const onClearScript = vi.fn();
    render(
      <ShapeScriptDrawer
        isOpen={true}
        onClose={vi.fn()}
        shape={mockShape}
        onApplyScript={vi.fn()}
        onClearScript={onClearScript}
      />
    );

    // Switch to Script tab
    fireEvent.click(screen.getByTestId('tab-script'));

    const clearBtn = screen.getByTestId('clear-script-btn');
    fireEvent.click(clearBtn);

    expect(onClearScript).toHaveBeenCalledWith(mockShape);
    const textarea = screen.getByTestId('shape-script-textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('');
  });

  it('toggles API and properties cheat sheet', () => {
    render(
      <ShapeScriptDrawer
        isOpen={true}
        onClose={vi.fn()}
        shape={mockShape}
        onApplyScript={vi.fn()}
      />
    );

    // Switch to Script tab
    fireEvent.click(screen.getByTestId('tab-script'));

    expect(screen.queryByText('Execution Arguments:')).toBeNull();

    const toggleBtn = screen.getByText('Canvas2D API & Shape Properties Helper');
    fireEvent.click(toggleBtn);

    expect(screen.getByText('Execution Arguments:')).toBeDefined();
    expect(screen.getByText(/ctx.beginPath\(\)/)).toBeDefined();
  });

  it('does not attach script when applying visual attributes or properties on an unscripted shape', () => {
    const unscriptedShape = {
      id: 'rect-101',
      type: 'Rectangle',
      width: 150,
      height: 80,
      fillColor: '#ffffff',
      strokeColor: '#000000',
      strokeWidth: 2,
      fontFamily: 'Inter, sans-serif',
      fontSize: 16,
      fontColor: '#1e293b',
      text: 'Sample whiteboard note',
    };

    const onApplyCustomization = vi.fn();
    const onApplyScript = vi.fn();

    render(
      <ShapeScriptDrawer
        isOpen={true}
        onClose={vi.fn()}
        shape={unscriptedShape}
        onApplyCustomization={onApplyCustomization}
        onApplyScript={onApplyScript}
      />
    );

    // Check script disabled banner on Script tab
    fireEvent.click(screen.getByTestId('tab-script'));
    expect(screen.getByTestId('script-disabled-banner')).toBeDefined();

    // Switch to Attributes tab and modify Typography
    fireEvent.click(screen.getByTestId('tab-attributes'));

    expect(screen.queryByTestId('attr-font-family-select')).toBeNull();

    const fontSizeInput = screen.getByTestId('attr-font-size-input');
    fireEvent.change(fontSizeInput, { target: { value: '24' } });

    const fontColorInput = screen.getByTestId('attr-font-color-input');
    fireEvent.change(fontColorInput, { target: { value: '#dc2626' } });

    // Click Apply
    const applyBtn = screen.getByTestId('apply-script-btn');
    fireEvent.click(applyBtn);

    expect(onApplyScript).not.toHaveBeenCalled();
    expect(onApplyCustomization).toHaveBeenCalledWith(unscriptedShape, {
      script: undefined,
      properties: {},
      attributes: expect.objectContaining({
        fontSize: 24,
        fontColor: '#dc2626',
      }),
    });
  });

  it('attaches script when explicitly clicking Enable Script or editing code on an unscripted shape', () => {
    const unscriptedShape = {
      id: 'rect-102',
      type: 'Rectangle',
      width: 150,
      height: 80,
      fillColor: '#ffffff',
      strokeColor: '#000000',
    };

    const onApplyCustomization = vi.fn();
    const onApplyScript = vi.fn();

    render(
      <ShapeScriptDrawer
        isOpen={true}
        onClose={vi.fn()}
        shape={unscriptedShape}
        onApplyCustomization={onApplyCustomization}
        onApplyScript={onApplyScript}
      />
    );

    // Switch to Script tab
    fireEvent.click(screen.getByTestId('tab-script'));

    // Click Enable Script button
    const enableBtn = screen.getByTestId('enable-script-btn');
    fireEvent.click(enableBtn);

    expect(screen.getByTestId('script-enabled-banner')).toBeDefined();

    // Click Apply
    const applyBtn = screen.getByTestId('apply-script-btn');
    fireEvent.click(applyBtn);

    expect(onApplyScript).toHaveBeenCalled();
    expect(onApplyCustomization).toHaveBeenCalledWith(unscriptedShape, expect.objectContaining({
      script: expect.stringContaining('Canvas2D Custom Drawing Script'),
    }));
  });

  it('dispatches script: null when script is disabled or cleared on a scripted shape', () => {
    const scriptedShape = {
      ...mockShape,
      script: 'ctx.fillRect(0, 0, shape.width, shape.height);',
    };

    const onApplyCustomization = vi.fn();
    const onClearScript = vi.fn();

    render(
      <ShapeScriptDrawer
        isOpen={true}
        onClose={vi.fn()}
        shape={scriptedShape}
        onApplyCustomization={onApplyCustomization}
        onClearScript={onClearScript}
      />
    );

    // Switch to Script tab
    fireEvent.click(screen.getByTestId('tab-script'));

    // Active banner is visible
    expect(screen.getByTestId('script-enabled-banner')).toBeDefined();

    // Disable script
    const disableBtn = screen.getByTestId('disable-script-btn');
    fireEvent.click(disableBtn);

    expect(screen.getByTestId('script-disabled-banner')).toBeDefined();

    // Click Apply
    const applyBtn = screen.getByTestId('apply-script-btn');
    fireEvent.click(applyBtn);

    expect(onApplyCustomization).toHaveBeenCalledWith(scriptedShape, expect.objectContaining({
      script: null,
    }));
  });

  it('renders preset color swatches for Font Color, updates hex indicator, and applies selection', () => {
    const shape = {
      id: 'shape-font-color-test',
      type: 'Rectangle',
      width: 150,
      height: 80,
      fontColor: '#000000',
    };

    const onApplyCustomization = vi.fn();

    render(
      <ShapeScriptDrawer
        isOpen={true}
        onClose={vi.fn()}
        shape={shape}
        onApplyCustomization={onApplyCustomization}
      />
    );

    // Switch to Attributes tab
    fireEvent.click(screen.getByTestId('tab-attributes'));

    // Check header hex indicator
    expect(screen.getByText('#000000')).toBeDefined();

    // Select blue swatch #3b82f6
    const blueSwatch = screen.getByTestId('attr-font-color-swatch-#3b82f6');
    expect(blueSwatch).toBeDefined();
    fireEvent.click(blueSwatch);

    // Header hex indicator updates
    expect(screen.getByText('#3b82f6')).toBeDefined();
    expect(blueSwatch.className).toContain('ring-2 ring-indigo-500');

    // Select red swatch #ef4444
    const redSwatch = screen.getByTestId('attr-font-color-swatch-#ef4444');
    fireEvent.click(redSwatch);
    expect(screen.getByText('#ef4444')).toBeDefined();
    expect(redSwatch.className).toContain('ring-2 ring-indigo-500');

    // Click Apply
    const applyBtn = screen.getByTestId('apply-script-btn');
    fireEvent.click(applyBtn);

    expect(onApplyCustomization).toHaveBeenCalledWith(
      shape,
      expect.objectContaining({
        attributes: expect.objectContaining({
          fontColor: '#ef4444',
        }),
      })
    );
  });

  it('allows multiple consecutive typography and font styling adjustments in the same drawer session', () => {
    const shape = {
      id: 'shape-typography-multi',
      type: 'Rectangle',
      width: 160,
      height: 90,
      fontSize: 14,
      fontColor: '#0f172a',
      customData: {
        fontSize: 14,
        fontColor: '#0f172a',
      },
    };

    const onApplyCustomization = vi.fn();

    render(
      <ShapeScriptDrawer
        isOpen={true}
        onClose={vi.fn()}
        shape={shape}
        onApplyCustomization={onApplyCustomization}
      />
    );

    fireEvent.click(screen.getByTestId('tab-attributes'));

    expect(screen.queryByTestId('attr-font-family-select')).toBeNull();
    const fontSizeInput = screen.getByTestId('attr-font-size-input');
    const applyBtn = screen.getByTestId('apply-script-btn');

    // First change: 24, green swatch #10b981
    fireEvent.change(fontSizeInput, { target: { value: '24' } });
    fireEvent.click(screen.getByTestId('attr-font-color-swatch-#10b981'));
    fireEvent.click(applyBtn);

    expect(onApplyCustomization).toHaveBeenNthCalledWith(
      1,
      shape,
      expect.objectContaining({
        attributes: expect.objectContaining({
          fontSize: 24,
          fontColor: '#10b981',
        }),
      })
    );

    // Second consecutive change: 18, amber swatch #f59e0b
    fireEvent.change(fontSizeInput, { target: { value: '18' } });
    fireEvent.click(screen.getByTestId('attr-font-color-swatch-#f59e0b'));
    fireEvent.click(applyBtn);

    expect(onApplyCustomization).toHaveBeenNthCalledWith(
      2,
      shape,
      expect.objectContaining({
        attributes: expect.objectContaining({
          fontSize: 18,
          fontColor: '#f59e0b',
        }),
      })
    );

    // Third consecutive change: 32, purple swatch #8b5cf6
    fireEvent.change(fontSizeInput, { target: { value: '32' } });
    fireEvent.click(screen.getByTestId('attr-font-color-swatch-#8b5cf6'));
    fireEvent.click(applyBtn);

    expect(onApplyCustomization).toHaveBeenNthCalledWith(
      3,
      shape,
      expect.objectContaining({
        attributes: expect.objectContaining({
          fontSize: 32,
          fontColor: '#8b5cf6',
        }),
      })
    );
  });

  describe('Connector / Line Menu Variant', () => {
    it('renders dedicated connector controls for arrowheads and dashed line patterns', () => {
      const connectorShape = {
        id: 'conn-1',
        _type: 'Connector',
        strokeColor: '#3b82f6',
        strokeWidth: 2,
        headEndType: 'flat',
        tailEndType: 'flat',
      };

      const onApplyCustomization = vi.fn();

      render(
        <ShapeScriptDrawer
          isOpen={true}
          onClose={vi.fn()}
          shape={connectorShape}
          onApplyCustomization={onApplyCustomization}
        />
      );

      // Verify Connector header badge and variant controls in Attributes tab
      expect(screen.getByText('Connector')).toBeDefined();
      expect(screen.getByText('Arrowheads & Line Style')).toBeDefined();
      expect(screen.getByTestId('attr-arrow-preset-forward')).toBeDefined();
      expect(screen.getByTestId('attr-tail-end-select')).toBeDefined();
      expect(screen.getByTestId('attr-head-end-select')).toBeDefined();
      expect(screen.getByTestId('attr-line-style-select')).toBeDefined();

      // Click Forward arrow preset
      fireEvent.click(screen.getByTestId('attr-arrow-preset-forward'));

      // Change line stroke pattern to dashed
      fireEvent.change(screen.getByTestId('attr-line-style-select'), { target: { value: 'dashed' } });

      // Change stroke width
      fireEvent.change(screen.getByTestId('attr-stroke-width-slider'), { target: { value: '4' } });

      // Apply changes
      fireEvent.click(screen.getByTestId('apply-script-btn'));

      expect(onApplyCustomization).toHaveBeenCalledWith(
        connectorShape,
        expect.objectContaining({
          attributes: expect.objectContaining({
            headEndType: 'arrow',
            tailEndType: 'flat',
            lineStyle: 'dashed',
            strokeWidth: 4,
          }),
        })
      );
    });

    it('supports UML arrow endpoint selections (triangle, diamond, circle, etc.) and persists in customization payload', () => {
      const connectorShape = {
        id: 'conn-uml',
        _type: 'Connector',
        strokeColor: '#3b82f6',
      };
      const onApplyCustomization = vi.fn();

      render(
        <ShapeScriptDrawer
          isOpen={true}
          onClose={vi.fn()}
          shape={connectorShape}
          onApplyCustomization={onApplyCustomization}
        />
      );

      const tailSelect = screen.getByTestId('attr-tail-end-select') as HTMLSelectElement;
      const headSelect = screen.getByTestId('attr-head-end-select') as HTMLSelectElement;

      // Select UML options
      fireEvent.change(tailSelect, { target: { value: 'diamond' } });
      fireEvent.change(headSelect, { target: { value: 'triangle' } });

      expect(tailSelect.value).toBe('diamond');
      expect(headSelect.value).toBe('triangle');

      // Apply
      fireEvent.click(screen.getByTestId('apply-script-btn'));

      expect(onApplyCustomization).toHaveBeenCalledWith(
        connectorShape,
        expect.objectContaining({
          attributes: expect.objectContaining({
            tailEndType: 'diamond',
            headEndType: 'triangle',
          }),
        })
      );
    });

    it('inserts specialized connector script snippets', () => {
      const connectorShape = {
        id: 'conn-2',
        _type: 'Connector',
      };

      render(
        <ShapeScriptDrawer
          isOpen={true}
          onClose={vi.fn()}
          shape={connectorShape}
        />
      );

      fireEvent.click(screen.getByTestId('tab-script'));

      const snippetSelect = screen.getByTestId('snippet-select');
      fireEvent.change(snippetSelect, { target: { value: 'animated-flow-connector' } });

      const textarea = screen.getByTestId('shape-script-textarea') as HTMLTextAreaElement;
      expect(textarea.value).toContain('Animated Flow Connector');
      expect(textarea.value).toContain('setLineDash');
    });
  });

  describe('Frame Menu Variant', () => {
    it('renders dedicated frame controls with device size presets and frame title', () => {
      const frameShape = {
        id: 'frame-100',
        type: 'Frame',
        title: 'App Overview',
        width: 800,
        height: 600,
        fillColor: '#f8fafc',
        strokeColor: '#cbd5e1',
      };

      const onApplyCustomization = vi.fn();

      render(
        <ShapeScriptDrawer
          isOpen={true}
          onClose={vi.fn()}
          shape={frameShape}
          onApplyCustomization={onApplyCustomization}
        />
      );

      // Verify Frame badge and title input
      expect(screen.getByText('Frame')).toBeDefined();
      expect(screen.getByText('Frame Container & Device Presets')).toBeDefined();

      const titleInput = screen.getByTestId('attr-frame-title-input') as HTMLInputElement;
      expect(titleInput.value).toBe('App Overview');

      // Edit title
      fireEvent.change(titleInput, { target: { value: 'Mobile Checkout Flow' } });

      // Select Mobile Device Preset (375x812)
      const mobilePresetBtn = screen.getByTestId('attr-device-preset-mobile');
      fireEvent.click(mobilePresetBtn);

      const widthInput = screen.getByTestId('attr-width-input') as HTMLInputElement;
      const heightInput = screen.getByTestId('attr-height-input') as HTMLInputElement;
      expect(widthInput.value).toBe('375');
      expect(heightInput.value).toBe('812');

      // Adjust corner radius
      const radiusSlider = screen.getByTestId('attr-corner-radius-slider');
      fireEvent.change(radiusSlider, { target: { value: '24' } });

      // Apply changes
      fireEvent.click(screen.getByTestId('apply-script-btn'));

      expect(onApplyCustomization).toHaveBeenCalledWith(
        frameShape,
        expect.objectContaining({
          attributes: expect.objectContaining({
            title: 'Mobile Checkout Flow',
            width: 375,
            height: 812,
            cornerRadius: 24,
          }),
        })
      );
    });

    it('inserts specialized frame script snippets like browser mockup', () => {
      const frameShape = {
        id: 'frame-101',
        type: 'Frame',
      };

      render(
        <ShapeScriptDrawer
          isOpen={true}
          onClose={vi.fn()}
          shape={frameShape}
        />
      );

      fireEvent.click(screen.getByTestId('tab-script'));

      const snippetSelect = screen.getByTestId('snippet-select');
      fireEvent.change(snippetSelect, { target: { value: 'browser-window-mockup' } });

      const textarea = screen.getByTestId('shape-script-textarea') as HTMLTextAreaElement;
      expect(textarea.value).toContain('Browser Window Mockup');
    });

    it('renders Frame Live Sandbox preview with container fill and title badge above container', () => {
      const frameShape = {
        id: 'frame-preview-test',
        type: 'Frame',
        title: 'Project Roadmap',
        fillColor: '#eff6ff',
        strokeColor: '#3b82f6',
        strokeWidth: 2,
        width: 400,
        height: 300,
      };

      render(
        <ShapeScriptDrawer
          isOpen={true}
          onClose={vi.fn()}
          shape={frameShape}
        />
      );

      act(() => {
        vi.advanceTimersByTime(200);
      });

      const canvas = screen.getByTestId('shape-script-preview-canvas') as HTMLCanvasElement;
      expect(canvas).toBeDefined();
      const ctx = canvas.getContext('2d');
      expect(ctx?.roundRect).toHaveBeenCalled();
      expect(ctx?.fillText).toHaveBeenCalledWith('Project Roadmap', 14, -4);
    });
  });

  describe('Image Menu Variant', () => {
    it('renders dedicated image controls with aspect ratio lock, scaling presets, and captioning', () => {
      const imageShape = {
        id: 'img-100',
        type: 'Image',
        imageData: 'data:image/png;base64,mock...',
        width: 400,
        height: 300,
        altText: 'System Diagram',
        caption: 'Figure 1.1',
      };

      const onApplyCustomization = vi.fn();

      render(
        <ShapeScriptDrawer
          isOpen={true}
          onClose={vi.fn()}
          shape={imageShape}
          onApplyCustomization={onApplyCustomization}
        />
      );

      // Verify Image header badge and variant controls
      expect(screen.getByText('Image')).toBeDefined();
      expect(screen.getByText('Image Sizing & Aspect Ratio')).toBeDefined();
      expect(screen.getByTestId('attr-aspect-ratio-lock-btn')).toBeDefined();
      expect(screen.getByTestId('attr-fit-mode-select')).toBeDefined();
      expect(screen.getByTestId('attr-image-alt-input')).toBeDefined();
      expect(screen.getByTestId('attr-image-caption-input')).toBeDefined();

      // Click 50% scale preset
      const scale50Btn = screen.getByTestId('attr-scale-preset-50');
      fireEvent.click(scale50Btn);

      const widthInput = screen.getByTestId('attr-width-input') as HTMLInputElement;
      expect(widthInput.value).toBe('200');

      // Edit Alt Text & Caption
      const altInput = screen.getByTestId('attr-image-alt-input');
      const captionInput = screen.getByTestId('attr-image-caption-input');
      fireEvent.change(altInput, { target: { value: 'Updated Logo Asset' } });
      fireEvent.change(captionInput, { target: { value: 'Logo v2' } });

      // Change corner radius
      fireEvent.change(screen.getByTestId('attr-corner-radius-slider'), { target: { value: '16' } });

      // Apply changes
      fireEvent.click(screen.getByTestId('apply-script-btn'));

      expect(onApplyCustomization).toHaveBeenCalledWith(
        imageShape,
        expect.objectContaining({
          attributes: expect.objectContaining({
            width: 200,
            altText: 'Updated Logo Asset',
            caption: 'Logo v2',
            cornerRadius: 16,
          }),
        })
      );
    });

    it('inserts specialized image script snippets like polaroid card', () => {
      const imageShape = {
        id: 'img-101',
        type: 'Image',
      };

      render(
        <ShapeScriptDrawer
          isOpen={true}
          onClose={vi.fn()}
          shape={imageShape}
        />
      );

      fireEvent.click(screen.getByTestId('tab-script'));

      const snippetSelect = screen.getByTestId('snippet-select');
      fireEvent.change(snippetSelect, { target: { value: 'polaroid-photo-card' } });

      const textarea = screen.getByTestId('shape-script-textarea') as HTMLTextAreaElement;
      expect(textarea.value).toContain('Polaroid Photo Card');
    });

    it('renders Image Live Sandbox preview with corner radius clipping and border outline', () => {
      const imageShape = {
        id: 'img-preview-test',
        type: 'Image',
        altText: 'Banner Image',
        strokeColor: '#dc2626',
        strokeWidth: 3,
        cornerRadius: 16,
        width: 300,
        height: 200,
        opacity: 0.8,
      };

      render(
        <ShapeScriptDrawer
          isOpen={true}
          onClose={vi.fn()}
          shape={imageShape}
        />
      );

      act(() => {
        vi.advanceTimersByTime(200);
      });

      const canvas = screen.getByTestId('shape-script-preview-canvas') as HTMLCanvasElement;
      expect(canvas).toBeDefined();
      const ctx = canvas.getContext('2d');
      expect(ctx?.roundRect).toHaveBeenCalled();
      expect(ctx?.stroke).toHaveBeenCalled();
    });

    it('synchronizes dimensions in real time when shape is resized on canvas', () => {
      const liveShape = {
        id: 'resize-shape-1',
        type: 'Rectangle',
        width: 200,
        height: 100,
      };

      const { rerender } = render(
        <ShapeScriptDrawer
          isOpen={true}
          onClose={vi.fn()}
          shape={liveShape}
        />
      );

      const widthInput = screen.getByTestId('attr-width-input') as HTMLInputElement;
      const heightInput = screen.getByTestId('attr-height-input') as HTMLInputElement;
      expect(widthInput.value).toBe('200');
      expect(heightInput.value).toBe('100');

      // Mutate dimensions on canvas resize
      liveShape.width = 450;
      liveShape.height = 320;

      rerender(
        <ShapeScriptDrawer
          isOpen={true}
          onClose={vi.fn()}
          shape={{ ...liveShape }}
        />
      );

      expect(widthInput.value).toBe('450');
      expect(heightInput.value).toBe('320');
    });

    it('renders corner radius slider for Rectangle shape and updates preview canvas and customization payload', () => {
      const rectShape = {
        id: 'rect-corner-test',
        type: 'Rectangle',
        width: 240,
        height: 160,
        cornerRadius: 0,
      };

      const onApplyCustomization = vi.fn();

      render(
        <ShapeScriptDrawer
          isOpen={true}
          onClose={vi.fn()}
          shape={rectShape}
          onApplyCustomization={onApplyCustomization}
        />
      );

      // Verify corner radius slider is rendered
      const slider = screen.getByTestId('attr-corner-radius-slider') as HTMLInputElement;
      expect(slider).toBeDefined();
      expect(slider.value).toBe('0');
      expect(screen.getByText('0px')).toBeDefined();

      // Change corner radius to 16px
      fireEvent.change(slider, { target: { value: '16' } });
      expect(slider.value).toBe('16');
      expect(screen.getByText('16px')).toBeDefined();

      // Live canvas preview timer
      act(() => {
        vi.advanceTimersByTime(200);
      });

      const canvas = screen.getByTestId('shape-script-preview-canvas') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d');
      expect(ctx?.roundRect).toHaveBeenCalledWith(0, 0, 240, 160, 16);

      // Apply customization
      fireEvent.click(screen.getByTestId('apply-script-btn'));
      expect(onApplyCustomization).toHaveBeenCalledWith(
        rectShape,
        expect.objectContaining({
          attributes: expect.objectContaining({
            cornerRadius: 16,
          }),
        })
      );
    });

    it('rounds dimensions with long floating-point precision to 1 decimal place on load and live update', () => {
      const floatShape = {
        id: 'float-dim-shape',
        type: 'Rectangle',
        width: 320.0100000000002,
        height: 280.01,
      };

      const { rerender } = render(
        <ShapeScriptDrawer
          isOpen={true}
          onClose={vi.fn()}
          shape={floatShape}
        />
      );

      const widthInput = screen.getByTestId('attr-width-input') as HTMLInputElement;
      const heightInput = screen.getByTestId('attr-height-input') as HTMLInputElement;

      expect(widthInput.value).toBe('320');
      expect(heightInput.value).toBe('280');

      // Live canvas update with floating point imprecise values
      floatShape.width = 150.364;
      floatShape.height = 99.88;

      rerender(
        <ShapeScriptDrawer
          isOpen={true}
          onClose={vi.fn()}
          shape={{ ...floatShape }}
        />
      );

      expect(widthInput.value).toBe('150.4');
      expect(heightInput.value).toBe('99.9');
    });

    it('rounds dimensions using roundDimension helper utility correctly', () => {
      expect(roundDimension(320.0100000000002)).toBe(320);
      expect(roundDimension(280.01)).toBe(280);
      expect(roundDimension(150.364)).toBe(150.4);
      expect(roundDimension(150.34)).toBe(150.3);
      expect(roundDimension(NaN)).toBe(0);
      expect(roundDimension('invalid' as any)).toBe(0);
    });

    it('follows unified Indigo color scheme across header badge, tabs, properties badge and apply button', () => {
      const shapeWithProps = {
        id: 'shape-theme-check',
        type: 'Rectangle',
        width: 100,
        height: 100,
        properties: { customKey: 'val' },
      };

      render(
        <ShapeScriptDrawer
          isOpen={true}
          onClose={vi.fn()}
          shape={shapeWithProps}
        />
      );

      const drawer = screen.getByTestId('shape-script-drawer');
      // Header icon badge container has bg-indigo-50 text-indigo-600
      const headerIconContainer = drawer.querySelector('.bg-indigo-50.text-indigo-600');
      expect(headerIconContainer).not.toBeNull();

      // Active tab (Attributes by default) has bg-indigo-600
      const activeTab = screen.getByTestId('tab-attributes');
      expect(activeTab.className).toContain('bg-indigo-600');

      // Properties count badge when not active has bg-indigo-100 text-indigo-700
      const propBadge = screen.getByText('1');
      expect(propBadge.className).toContain('bg-indigo-100');
      expect(propBadge.className).toContain('text-indigo-700');

      // Primary apply button has bg-indigo-600
      const applyBtn = screen.getByTestId('apply-script-btn');
      expect(applyBtn.className).toContain('bg-indigo-600');
    });

    it('renders with unified Slate background, elevated white cards, and light code editor', () => {
      const sampleShape = {
        id: 'shape-bg-theme',
        type: 'Rectangle',
        width: 150,
        height: 100,
        properties: { status: 'DONE' },
        script: '// custom script',
      };

      render(
        <ShapeScriptDrawer
          isOpen={true}
          onClose={vi.fn()}
          shape={sampleShape}
        />
      );

      const drawer = screen.getByTestId('shape-script-drawer');
      // Root drawer background
      expect(drawer.className).toContain('bg-slate-50');
      expect(drawer.className).toContain('border-slate-200');

      // Header container background
      const header = drawer.querySelector('.bg-slate-50\\/70');
      expect(header).not.toBeNull();

      // Elevated white section cards
      const whiteCards = drawer.querySelectorAll('.bg-white.border-slate-200');
      expect(whiteCards.length).toBeGreaterThan(0);

      // Switch to script tab to verify light editor theme
      fireEvent.click(screen.getByTestId('tab-script'));
      const textarea = screen.getByTestId('shape-script-textarea');
      expect(textarea.className).toContain('text-slate-800');
      expect(textarea.parentElement?.className).toContain('bg-slate-50');
      expect(textarea.parentElement?.className).toContain('text-slate-800');
    });
  });
});
