import { describe, it, expect, vi } from 'vitest';
import { ensureCenteredTextDoc, updateShapeTextProportions, ensureAllShapesCentered, centerOnContent } from './shapeUtils';

describe('Shape text proportions and centering', () => {
  it('converts single-line string text into centered ProseMirror doc structure', () => {
    const doc = ensureCenteredTextDoc('Hello World', 'center');
    expect(doc.type).toBe('doc');
    expect(doc.content).toHaveLength(1);
    expect(doc.content[0].attrs.textAlign).toBe('center');
    expect(doc.content[0].content[0].text).toBe('Hello World');
  });

  it('converts multiline string text into centered ProseMirror doc paragraphs', () => {
    const doc = ensureCenteredTextDoc('Line 1\nLine 2\nLine 3', 'center');
    expect(doc.type).toBe('doc');
    expect(doc.content).toHaveLength(3);
    doc.content.forEach((paragraph: any, index: number) => {
      expect(paragraph.type).toBe('paragraph');
      expect(paragraph.attrs.textAlign).toBe('center');
      expect(paragraph.content[0].text).toBe(`Line ${index + 1}`);
    });
  });

  it('handles empty string and null/undefined values gracefully', () => {
    expect(ensureCenteredTextDoc(null)).toBeNull();
    expect(ensureCenteredTextDoc(undefined)).toBeUndefined();
    const emptyDoc = ensureCenteredTextDoc('');
    expect(emptyDoc.type).toBe('doc');
    expect(emptyDoc.content).toHaveLength(1);
    expect(emptyDoc.content[0].attrs.textAlign).toBe('center');
    expect(emptyDoc.content[0].content).toEqual([]);
  });

  it('ensures existing doc paragraphs have textAlign: center', () => {
    const originalDoc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { textAlign: 'left' },
          content: [{ type: 'text', text: 'Line 1' }],
        },
        {
          type: 'paragraph',
          attrs: {},
          content: [{ type: 'text', text: 'Line 2' }],
        },
      ],
    };

    const doc = ensureCenteredTextDoc(originalDoc, 'center');
    expect(doc.content[0].attrs.textAlign).toBe('center');
    expect(doc.content[1].attrs.textAlign).toBe('center');
  });

  it('sets shape horizontal and vertical alignment to center and middle and fontFamily to Roboto', () => {
    const shape: any = {
      width: 100,
      height: 100,
      text: 'Sample',
    };

    updateShapeTextProportions(shape, null);
    expect(shape.horzAlign).toBe('center');
    expect(shape.vertAlign).toBe('middle');
    expect(shape.fontFamily).toBe('Roboto');
    expect(shape.fontSize).toBe(20);
    expect(shape.text.content[0].attrs.textAlign).toBe('center');
  });

  it('reduces font size when text exceeds shape bounds', () => {
    const shape: any = {
      width: 50,
      height: 30,
      innerWidth: 40,
      innerHeight: 20,
      text: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            attrs: { textAlign: 'center' },
            content: [{ type: 'text', text: 'Very long text that cannot fit inside this small box' }],
          },
        ],
      },
    };

    const mockEditor: any = {
      canvas: {
        font: '',
        textMetric: (text = '') => ({
          width: (text || '').length * 10,
          height: 12,
          ascent: 10,
          descent: 2,
          actualAscent: 10,
          actualDescent: 2,
        }),
        resolveColor: (c: string) => c,
      },
    };

    updateShapeTextProportions(shape, mockEditor);
    expect(shape.fontSize).toBeLessThan(12);
    expect(shape.horzAlign).toBe('center');
    expect(shape.vertAlign).toBe('middle');
  });

  it('reduces font size using fallback calculation when canvas metric is unavailable', () => {
    const shape: any = {
      width: 40,
      height: 20,
      text: 'Extremely long line of text inside a tiny bounding box',
    };

    updateShapeTextProportions(shape, null);
    expect(shape.fontSize).toBeLessThan(12);
    expect(shape.horzAlign).toBe('center');
    expect(shape.vertAlign).toBe('middle');
    expect(shape.text.content[0].attrs.textAlign).toBe('center');
  });

  it('ensures all shapes on page are centered with ensureAllShapesCentered and set to Roboto font', () => {
    const shape1: any = { width: 100, height: 100, text: 'Shape 1' };
    const shape2: any = { width: 150, height: 80, text: 'Shape 2', horzAlign: 'left', vertAlign: 'top', fontFamily: 'Inter' };
    const childShape: any = { width: 50, height: 50, text: 'Child', fontFamily: 'Inter' };
    const groupShape: any = { width: 200, height: 200, children: [childShape] };
    const mockEditor: any = {
      getCurrentPage: () => ({
        children: [shape1, shape2, groupShape],
      }),
    };

    ensureAllShapesCentered(mockEditor);

    expect(shape1.horzAlign).toBe('center');
    expect(shape1.vertAlign).toBe('middle');
    expect(shape1.fontFamily).toBe('Roboto');
    expect(shape2.horzAlign).toBe('center');
    expect(shape2.vertAlign).toBe('middle');
    expect(shape2.fontFamily).toBe('Roboto');
    expect(shape2.text.content[0].attrs.textAlign).toBe('center');
    expect(childShape.fontFamily).toBe('Roboto');
  });

  it('centers the viewport on existing shapes bounding box', () => {
    const scrollCenterToMock = vi.fn();
    const repaintMock = vi.fn();
    const fitMock = vi.fn();
    const getOriginMock = vi.fn(() => [100, 150]);

    const mockEditor: any = {
      fit: fitMock,
      scrollCenterTo: scrollCenterToMock,
      repaint: repaintMock,
      getOrigin: getOriginMock,
      getCurrentPage: () => ({
        pageOrigin: [0, 0],
        children: [
          {
            getBoundingRect: () => [[100, 100], [200, 300]],
          },
          {
            getBoundingRect: () => [[300, 200], [500, 400]],
          },
        ],
      }),
    };

    centerOnContent(mockEditor);

    expect(fitMock).toHaveBeenCalled();
    // minX = 100, maxX = 500 => centerX = 300
    // minY = 100, maxY = 400 => centerY = 250
    expect(scrollCenterToMock).toHaveBeenCalledWith([300, 250]);
    expect(repaintMock).toHaveBeenCalled();
  });

  it('centers viewport on [0, 0] when no shapes exist on page', () => {
    const scrollCenterToMock = vi.fn();
    const repaintMock = vi.fn();
    const fitMock = vi.fn();
    const getOriginMock = vi.fn(() => [0, 0]);

    const mockEditor: any = {
      fit: fitMock,
      scrollCenterTo: scrollCenterToMock,
      repaint: repaintMock,
      getOrigin: getOriginMock,
      getCurrentPage: () => ({
        pageOrigin: [0, 0],
        children: [],
      }),
    };

    centerOnContent(mockEditor);

    expect(scrollCenterToMock).toHaveBeenCalledWith([0, 0]);
    expect(repaintMock).toHaveBeenCalled();
  });
});
