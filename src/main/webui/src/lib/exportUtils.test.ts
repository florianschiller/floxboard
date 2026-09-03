// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  Box,
  Ellipse,
  Line,
  Connector,
  Freehand,
  Highlighter,
  Text as DgmText,
  Image as DgmImage,
  Frame,
  Group,
  Page,
} from '@dgmjs/core';
import {
  calculateShapesBoundingBox,
  extractShapeTextLines,
  extractImageDataUrl,
  resolveDgmColor,
  serializeDgmToSvg,
  generatePdfDocument,
  sanitizeFilename,
  exportWhiteboardToSVG,
  exportWhiteboardToPNG,
  exportWhiteboardToPDF,
  downloadBlob,
} from './exportUtils';

describe('exportUtils', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: '',
    } as any);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation((type = 'image/png') => {
      if (type === 'image/jpeg') {
        return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
      }
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sanitizeFilename', () => {
    it('sanitizes unsafe characters and defaults to whiteboard', () => {
      expect(sanitizeFilename(null)).toBe('whiteboard');
      expect(sanitizeFilename('')).toBe('whiteboard');
      expect(sanitizeFilename('   ')).toBe('whiteboard');
      expect(sanitizeFilename('my/cool:board?*')).toBe('my_cool_board__');
      expect(sanitizeFilename('Project Alpha')).toBe('Project Alpha');
    });
  });

  describe('resolveDgmColor', () => {
    it('resolves theme color tokens for light mode', () => {
      expect(resolveDgmColor('$foreground', false)).toBe('#000000');
      expect(resolveDgmColor('$background', false)).toBe('#ffffff');
      expect(resolveDgmColor('$transparent', false)).toBe('none');
      expect(resolveDgmColor('transparent', false)).toBe('none');
      expect(resolveDgmColor('none', false)).toBe('none');
    });

    it('resolves theme color tokens for dark mode', () => {
      expect(resolveDgmColor('$foreground', true)).toBe('#ffffff');
      expect(resolveDgmColor('$background', true)).toMatch(/#000000|#121212/);
      expect(resolveDgmColor('$transparent', true)).toBe('none');
    });

    it('resolves named palette tokens like $gray9', () => {
      expect(resolveDgmColor('$gray9', false)).toBe('#8d8d8d');
    });

    it('passes through raw hex and rgb colors', () => {
      expect(resolveDgmColor('#ef4444')).toBe('#ef4444');
      expect(resolveDgmColor('rgba(255, 0, 0, 0.5)')).toBe('rgba(255, 0, 0, 0.5)');
    });

    it('handles undefined and empty colors with fallback', () => {
      expect(resolveDgmColor(undefined, false)).toBe('#000000');
      expect(resolveDgmColor(undefined, true)).toBe('#ffffff');
    });
  });

  describe('extractShapeTextLines', () => {
    it('extracts lines from string, null, and empty text', () => {
      expect(extractShapeTextLines(null)).toEqual([]);
      expect(extractShapeTextLines(undefined)).toEqual([]);
      expect(extractShapeTextLines('')).toEqual([]);
      expect(extractShapeTextLines('Hello World')).toEqual(['Hello World']);
      expect(extractShapeTextLines('Line 1\nLine 2\nLine 3')).toEqual(['Line 1', 'Line 2', 'Line 3']);
    });

    it('extracts lines from TipTap JSON doc structure', () => {
      const doc = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Paragraph 1' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Paragraph 2' }],
          },
        ],
      };
      expect(extractShapeTextLines(doc)).toEqual(['Paragraph 1', 'Paragraph 2']);
    });
  });

  describe('extractImageDataUrl', () => {
    it('returns empty string for null or empty shape', () => {
      expect(extractImageDataUrl(null)).toBe('');
      expect(extractImageDataUrl({})).toBe('');
    });

    it('returns data URL directly when shape.imageData is base64', () => {
      const shape = { imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==' };
      expect(extractImageDataUrl(shape)).toBe('data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==');
    });

    it('extracts data URL from _imageDOM when present', () => {
      const mockImg = {
        complete: true,
        naturalWidth: 100,
        naturalHeight: 80,
      };
      const shape = {
        _imageDOM: mockImg,
        imageData: 'blob:http://localhost:3000/12345',
      };
      const dataUrl = extractImageDataUrl(shape);
      expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    });

    it('falls back to shape.src, shape.url, or shape.imageData if _imageDOM not available', () => {
      expect(extractImageDataUrl({ src: 'https://example.com/logo.png' })).toBe('https://example.com/logo.png');
      expect(extractImageDataUrl({ url: '/api/whiteboards/image.png' })).toBe('/api/whiteboards/image.png');
      expect(extractImageDataUrl({ imageData: 'blob:http://localhost/abc' })).toBe('blob:http://localhost/abc');
    });
  });

  describe('calculateShapesBoundingBox', () => {
    it('returns default bounds when shapes array is empty', () => {
      const bounds = calculateShapesBoundingBox([]);
      expect(bounds.width).toBe(800);
      expect(bounds.height).toBe(600);
      expect(bounds.minX).toBe(0);
      expect(bounds.minY).toBe(0);
    });

    it('calculates bounding box from shape left/top/width/height with padding', () => {
      const box = new Box();
      box.left = 100;
      box.top = 100;
      box.width = 200;
      box.height = 150;

      const bounds = calculateShapesBoundingBox([box], 20);
      expect(bounds.minX).toBe(80); // 100 - 20
      expect(bounds.minY).toBe(80); // 100 - 20
      expect(bounds.maxX).toBe(320); // 300 + 20
      expect(bounds.maxY).toBe(270); // 250 + 20
      expect(bounds.width).toBe(240);
      expect(bounds.height).toBe(190);
    });

    it('handles DGM Line/Connector with points array', () => {
      const line = new Line();
      (line as any).points = [
        [50, 50],
        [150, 200],
        [250, 100],
      ];

      const bounds = calculateShapesBoundingBox([line], 10);
      expect(bounds.minX).toBe(40);
      expect(bounds.minY).toBe(40);
      expect(bounds.maxX).toBe(260);
      expect(bounds.maxY).toBe(210);
      expect(bounds.width).toBe(220);
      expect(bounds.height).toBe(170);
    });

    it('handles nested Group shapes', () => {
      const box1 = new Box();
      box1.left = 50;
      box1.top = 50;
      box1.width = 100;
      box1.height = 100;

      const box2 = new Box();
      box2.left = 200;
      box2.top = 200;
      box2.width = 100;
      box2.height = 100;

      const group = new Group();
      group.children = [box1, box2];

      const bounds = calculateShapesBoundingBox([group], 10);
      expect(bounds.minX).toBe(40);
      expect(bounds.minY).toBe(40);
      expect(bounds.maxX).toBe(310);
      expect(bounds.maxY).toBe(310);
    });
  });

  describe('serializeDgmToSvg', () => {
    it('generates a valid SVG document for DGM shapes and resolves theme colors', () => {
      const box = new Box();
      box.left = 100;
      box.top = 100;
      box.width = 200;
      box.height = 120;
      box.strokeColor = '$foreground';
      box.fillColor = '$background';
      box.text = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Architecture Core' }],
          },
        ],
      };

      const ell = new Ellipse();
      ell.left = 350;
      ell.top = 100;
      ell.width = 120;
      ell.height = 120;
      ell.strokeColor = '#10b981';
      ell.fillColor = '#ecfdf5';

      const conn = new Connector();
      (conn as any).points = [
        [300, 160],
        [350, 160],
      ];
      conn.strokeColor = '$foreground';
      conn.headEndType = 'arrow';

      const freehand = new Freehand();
      (freehand as any).points = [
        [10, 10],
        [20, 30],
        [40, 50],
      ];
      freehand.strokeColor = '#f59e0b';

      const highlighter = new Highlighter();
      (highlighter as any).points = [
        [100, 300],
        [250, 300],
      ];
      highlighter.strokeColor = '#eab308';

      const dgmText = new DgmText();
      dgmText.left = 400;
      dgmText.top = 300;
      dgmText.width = 150;
      dgmText.height = 50;
      dgmText.text = 'Standalone Title';

      const dgmImage = new DgmImage();
      dgmImage.left = 50;
      dgmImage.top = 400;
      dgmImage.width = 100;
      dgmImage.height = 100;
      dgmImage.imageData = 'data:image/png;base64,mock';

      const frame = new Frame();
      frame.left = 0;
      frame.top = 0;
      frame.width = 600;
      frame.height = 600;

      const page = new Page();
      page.children = [box, ell, conn, freehand, highlighter, dgmText, dgmImage, frame];

      const mockEditor: any = {
        getCurrentPage: () => page,
      };

      const svg = serializeDgmToSvg(mockEditor, false);

      expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('viewBox=');
      expect(svg).toContain('Inter');
      expect(svg).toContain('<rect');
      expect(svg).toContain('<ellipse');
      expect(svg).toContain('<path');
      expect(svg).toContain('<image');
      expect(svg).toContain('href="data:image/png;base64,mock"');
      expect(svg).toContain('xlink:href="data:image/png;base64,mock"');
      expect(svg).toContain('Architecture Core');
      expect(svg).toContain('Standalone Title');
      expect(svg).toContain('marker-end="url(#arrow-marker)"');
      // Theme colors should be resolved to valid hex strings, not unparsed $ tokens
      expect(svg).not.toContain('fill="$background"');
      expect(svg).not.toContain('stroke="$foreground"');
      expect(svg).toContain('fill="#ffffff"');
      expect(svg).toContain('stroke="#000000"');
    });

    it('serializes Freehand, Highlighter with opacity, Connector with arrowheads, and Frame with header', () => {
      const freehand = new Freehand();
      (freehand as any).points = [[0, 0], [10, 20], [30, 40]];
      freehand.strokeColor = '#ff0000';
      freehand.strokeWidth = 3;

      const highlighter = new Highlighter();
      (highlighter as any).points = [[50, 50], [150, 50]];
      highlighter.strokeColor = '#ffff00';
      highlighter.strokeWidth = 14;
      (highlighter as any).alpha = 0.35;

      const connector = new Connector();
      (connector as any).points = [[100, 100], [200, 200]];
      connector.strokeColor = '#0000ff';
      connector.headEndType = 'arrow';
      connector.tailEndType = 'solid-arrow';

      const line = new Line();
      (line as any).points = [[300, 100], [400, 100]];
      line.strokeColor = '#00ff00';
      line.headEndType = 'arrow';

      const frame = new Frame();
      frame.left = 500;
      frame.top = 100;
      frame.width = 300;
      frame.height = 200;
      frame.name = 'Frontend Components';
      frame.strokeColor = '#333333';

      const page = new Page();
      page.children = [freehand, highlighter, connector, line, frame];

      const mockEditor: any = {
        getCurrentPage: () => page,
      };

      const svg = serializeDgmToSvg(mockEditor, false);

      // Verify Freehand
      expect(svg).toContain('stroke="#ff0000"');
      expect(svg).toContain('stroke-width="3"');

      // Verify Highlighter opacity and width
      expect(svg).toContain('stroke="#ffff00"');
      expect(svg).toContain('opacity="0.35"');
      expect(svg).toContain('stroke-width="14"');

      // Verify Connector and Line arrowheads
      expect(svg).toContain('stroke="#0000ff"');
      expect(svg).toContain('marker-start="url(#arrow-marker)"');
      expect(svg).toContain('marker-end="url(#arrow-marker)"');
      expect(svg).toContain('stroke="#00ff00"');

      // Verify Frame border and title
      expect(svg).toContain('Frontend Components');
      expect(svg).toContain('stroke="#333333"');
    });

    it('inlines in-memory DOM images from _imageDOM into SVG', () => {
      const imgShape = new DgmImage();
      imgShape.left = 100;
      imgShape.top = 100;
      imgShape.width = 120;
      imgShape.height = 90;
      imgShape.imageData = 'blob:http://localhost:3000/mock-blob-uuid';
      (imgShape as any)._imageDOM = {
        complete: true,
        naturalWidth: 120,
        naturalHeight: 90,
      };

      const page = new Page();
      page.children = [imgShape];

      const mockEditor: any = {
        getCurrentPage: () => page,
      };

      const svg = serializeDgmToSvg(mockEditor, false);
      expect(svg).toContain('<image');
      expect(svg).toMatch(/href="data:image\/png;base64,/);
      expect(svg).toMatch(/xlink:href="data:image\/png;base64,/);
      expect(svg).not.toContain('blob:http://localhost:3000/mock-blob-uuid');
    });

    it('falls back gracefully on empty editor', () => {
      const svg = serializeDgmToSvg(null);
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });

    it('uses editor.exportToSvg when available and valid XML', () => {
      const mockEditor: any = {
        exportToSvg: () => '<svg id="native-svg"></svg>',
      };
      const svg = serializeDgmToSvg(mockEditor);
      expect(svg).toBe('<svg id="native-svg"></svg>');
    });
  });

  describe('generatePdfDocument', () => {
    it('constructs a valid PDF 1.4 binary blob with DCTDecode image XObject and trailer', async () => {
      // 1x1 JPEG / PNG data URL
      const dummyJpegDataUrl =
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
      const pdfBlob = generatePdfDocument(dummyJpegDataUrl, 800, 600, 1600, 1200);

      expect(pdfBlob).toBeInstanceOf(Blob);
      expect(pdfBlob.type).toBe('application/pdf');

      const arrayBuffer = await pdfBlob.arrayBuffer();
      const text = new TextDecoder('latin1').decode(arrayBuffer);

      expect(text).toContain('%PDF-1.4');
      expect(text).toContain('/Type /Catalog');
      expect(text).toContain('/Type /Pages');
      expect(text).toContain('/Type /Page');
      expect(text).toContain('/MediaBox [0 0 800.00 600.00]');
      expect(text).toContain('/Type /XObject');
      expect(text).toContain('/Filter /DCTDecode');
      expect(text).toContain('/Width 1600 /Height 1200');
      expect(text).toContain('xref');
      expect(text).toContain('trailer');
      expect(text).toContain('%%EOF');
    });
  });

  describe('Export handlers download verification', () => {
    let createObjectURLSpy: any;
    let revokeObjectURLSpy: any;

    beforeEach(() => {
      createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    });

    afterEach(() => {
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it('exportWhiteboardToSVG triggers blob creation and download', async () => {
      const box = new Box();
      box.left = 10;
      box.top = 10;
      box.width = 50;
      box.height = 50;
      const page = new Page();
      page.children = [box];

      const mockEditor: any = {
        getCurrentPage: () => page,
      };

      await exportWhiteboardToSVG(mockEditor, 'Test Board');
      expect(createObjectURLSpy).toHaveBeenCalled();
    });

    it('exportWhiteboardToPNG triggers offscreen capture and download', async () => {
      const box = new Box();
      box.left = 10;
      box.top = 10;
      box.width = 50;
      box.height = 50;
      const page = new Page();
      page.children = [box];

      const mockEditor: any = {
        getCurrentPage: () => page,
      };

      await exportWhiteboardToPNG(mockEditor, 'Test Board');
    });

    it('exportWhiteboardToPDF triggers PDF generation and download', async () => {
      const box = new Box();
      box.left = 10;
      box.top = 10;
      box.width = 50;
      box.height = 50;
      const page = new Page();
      page.children = [box];

      const mockEditor: any = {
        getCurrentPage: () => page,
      };

      await exportWhiteboardToPDF(mockEditor, 'Test Board');
    });
  });
});
