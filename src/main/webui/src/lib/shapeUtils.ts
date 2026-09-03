import { Editor, textUtils, Group, Page, Doc, Image as DgmImage, Sizable } from '@dgmjs/core';

// Helper to ensure all paragraph/heading/block nodes in TipTap doc or string are horizontally centered
export const ensureCenteredTextDoc = (text: any, horzAlign = 'center'): any => {
  if (text === null || text === undefined) {
    return text;
  }
  if (typeof text === 'string') {
    return {
      type: 'doc',
      content: text.split('\n').map((line) => ({
        type: 'paragraph',
        attrs: { textAlign: horzAlign },
        content: line ? [{ type: 'text', text: line }] : [],
      })),
    };
  }
  if (typeof text === 'object') {
    if (Array.isArray(text.content)) {
      const newContent = text.content.map((block: any) => {
        if (block && typeof block === 'object') {
          return {
            ...block,
            attrs: {
              ...(block.attrs || {}),
              textAlign: horzAlign,
            },
          };
        }
        return block;
      });
      return {
        ...text,
        type: text.type || 'doc',
        content: newContent,
      };
    }
  }
  return text;
};

// Proportional centered text helper for shapes with dynamic font reduction for long text
export const updateShapeTextProportions = (shape: any, editor?: Editor | null) => {
  if (!shape) return;
  shape.fontFamily = 'Roboto';
  shape.horzAlign = 'center';
  shape.vertAlign = 'middle';
  if (shape.text !== undefined && shape.text !== null) {
    shape.text = ensureCenteredTextDoc(shape.text, 'center');
  }

  const w = shape.width ?? (shape.rect ? Math.abs(shape.rect[1][0] - shape.rect[0][0]) : 0);
  const h = shape.height ?? (shape.rect ? Math.abs(shape.rect[1][1] - shape.rect[0][1]) : 0);
  const minDim = Math.min(w, h);
  if (minDim > 0) {
    const baseFontSize = Math.max(12, Math.round(minDim * 0.2));
    shape.fontSize = baseFontSize;

    // Check if text is present and reduce font size if it exceeds the shape bounds
    let textStr = '';
    try {
      if (typeof shape.text === 'string') {
        textStr = shape.text;
      } else if (shape.text && typeof textUtils?.convertTextNodeToString === 'function') {
        textStr = textUtils.convertTextNodeToString(shape.text);
      }
    } catch {
      textStr = '';
    }
    textStr = textStr ? textStr.trim() : '';

    if (textStr.length > 0) {
      const activeCanvas = editor?.canvas;
      const availableWidth = Math.max(10, (shape.innerWidth ?? (w - 16)));
      const availableHeight = Math.max(10, (shape.innerHeight ?? (h - 16)));

      if (activeCanvas && typeof activeCanvas.textMetric === 'function' && typeof textUtils?.measureText === 'function') {
        try {
          let metric = textUtils.measureText(activeCanvas, shape, shape.text);
          while ((metric.width > availableWidth || metric.height > availableHeight) && shape.fontSize > 6) {
            shape.fontSize -= 1;
            metric = textUtils.measureText(activeCanvas, shape, shape.text);
          }
        } catch {
          // Fallback estimation if measureText fails
          const lines: string[] = textStr.split('\n');
          const maxLineLen = Math.max(...lines.map((l: string) => l.length), 1);
          while (
            (maxLineLen * shape.fontSize * 0.6 > availableWidth ||
              lines.length * shape.fontSize * 1.3 > availableHeight) &&
            shape.fontSize > 6
          ) {
            shape.fontSize -= 1;
          }
        }
      } else {
        // Fallback estimation if canvas is not yet initialized
        const lines: string[] = textStr.split('\n');
        const maxLineLen = Math.max(...lines.map((l: string) => l.length), 1);
        while (
          (maxLineLen * shape.fontSize * 0.6 > availableWidth ||
            lines.length * shape.fontSize * 1.3 > availableHeight) &&
          shape.fontSize > 6
        ) {
          shape.fontSize -= 1;
        }
      }
    }
  }
};

// Applies centered text formatting and alignment to all shapes in the editor
export const ensureAllShapesCentered = (editor?: Editor | null) => {
  if (!editor) return;
  const page = typeof (editor as any).getCurrentPage === 'function' 
    ? (editor as any).getCurrentPage() 
    : (editor as any).currentPage;
  if (!page) return;

  const applyRecursive = (shape: any) => {
    if (!shape) return;
    if (shape !== page) {
      updateShapeTextProportions(shape, editor);
    }
    if (Array.isArray(shape.children)) {
      shape.children.forEach(applyRecursive);
    }
  };

  const shapes = (page.children || []).filter((s: any) => s !== page);
  for (const shape of shapes) {
    applyRecursive(shape);
  }
};

// Automatically centers the whiteboard viewport on the content (shapes)
export const centerOnContent = (editor?: Editor | null) => {
  if (!editor) return;
  try {
    if (typeof editor.fit === 'function') {
      editor.fit();
    }
  } catch {}

  const page = typeof (editor as any).getCurrentPage === 'function' 
    ? (editor as any).getCurrentPage() 
    : (editor as any).currentPage;
  if (!page) return;

  const shapes = (page.children || []).filter((s: any) => s !== page);
  if (shapes.length > 0) {
    const minXs: number[] = [];
    const minYs: number[] = [];
    const maxXs: number[] = [];
    const maxYs: number[] = [];

    for (const shape of shapes) {
      if (typeof (shape as any).getBoundingRect === 'function') {
        const rect = (shape as any).getBoundingRect();
        if (rect && Array.isArray(rect) && rect.length >= 2 && rect[0] && rect[1]) {
          minXs.push(Math.min(rect[0][0], rect[1][0]));
          minYs.push(Math.min(rect[0][1], rect[1][1]));
          maxXs.push(Math.max(rect[0][0], rect[1][0]));
          maxYs.push(Math.max(rect[0][1], rect[1][1]));
        }
      } else if (typeof (shape as any).getCenter === 'function') {
        const c = (shape as any).getCenter();
        if (c && Array.isArray(c) && c.length >= 2) {
          minXs.push(c[0]);
          minYs.push(c[1]);
          maxXs.push(c[0]);
          maxYs.push(c[1]);
        }
      }
    }

    if (minXs.length > 0) {
      const minX = Math.min(...minXs);
      const minY = Math.min(...minYs);
      const maxX = Math.max(...maxXs);
      const maxY = Math.max(...maxYs);
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      editor.scrollCenterTo([centerX, centerY]);
      if (page) {
        page.pageOrigin = editor.getOrigin();
      }
      editor.repaint();
      return;
    }
  }

  // If no shapes exist, center on origin [0, 0]
  editor.scrollCenterTo([0, 0]);
  if (page) {
    page.pageOrigin = editor.getOrigin();
  }
  editor.repaint();
};

// Check whether a shape represents a group (live class instance, serialized object, or composite children)
export const isGroupShape = (shape: any): boolean => {
  if (!shape) return false;
  if (typeof Group !== 'undefined' && shape instanceof Group) return true;
  if (typeof Page !== 'undefined' && shape instanceof Page) return false;
  if (typeof Doc !== 'undefined' && shape instanceof Doc) return false;
  if (shape.constructor?.name === 'Group') return true;
  if (shape._type === 'Group' || shape.name === 'Group' || shape.type === 'Group') return true;
  if (
    shape._type === 'Page' ||
    shape.name === 'Page' ||
    shape.type === 'Page' ||
    shape.constructor?.name === 'Page' ||
    shape.constructor?.name === 'Page2' ||
    shape.constructor?.name === '_Page' ||
    shape._type === 'Doc' ||
    shape.name === 'Doc' ||
    shape.type === 'Doc' ||
    shape.constructor?.name === 'Doc' ||
    shape.constructor?.name === 'Doc3' ||
    shape.constructor?.name === '_Doc'
  ) {
    return false;
  }
  if (
    Array.isArray(shape.children) &&
    shape.children.length > 0 &&
    shape._type !== 'Page' &&
    shape.name !== 'Page' &&
    shape.type !== 'Page' &&
    shape._type !== 'Doc' &&
    shape.name !== 'Doc' &&
    shape.type !== 'Doc'
  ) {
    return true;
  }
  return false;
};

// Check whether a shape is an open line / connector (excluding closed polygons such as triangles and rhombuses/diamonds)
export const isOpenLineShape = (shape: any): boolean => {
  if (!shape) return false;
  if (isGroupShape(shape)) return false;

  const type = shape._type || shape.name || shape.constructor?.name || shape.type;
  if (
    type === 'Box' ||
    type === 'Rectangle' ||
    type === 'Oval' ||
    type === 'Ellipse' ||
    type === 'Text' ||
    type === 'Image' ||
    type === 'Page' ||
    type === 'Doc'
  ) {
    return false;
  }

  // Check if live shape reports isClosed()
  if (typeof shape.isClosed === 'function' && shape.isClosed()) {
    return false;
  }
  if (shape.closed === true) {
    return false;
  }

  // Check path / points coordinates for closed loop (e.g. Triangle, Rhombus/Diamond, Polygon)
  const pts = Array.isArray(shape.path)
    ? shape.path
    : Array.isArray(shape.points)
    ? shape.points
    : null;

  if (pts && pts.length >= 3) {
    const first = pts[0];
    const last = pts[pts.length - 1];
    if (
      Array.isArray(first) &&
      Array.isArray(last) &&
      first.length >= 2 &&
      last.length >= 2 &&
      Math.hypot(first[0] - last[0], first[1] - last[1]) < 1
    ) {
      return false;
    }
  }

  // Must be a Line or Connector shape or have line ending properties
  const isLineOrConnector =
    type === 'Line' ||
    type === 'Connector' ||
    'headEndType' in shape ||
    'tailEndType' in shape ||
    (Array.isArray(pts) && pts.length >= 2);

  return Boolean(isLineOrConnector);
};

// Check whether a shape or any shape in group is locked
export const isShapeLocked = (shape: any): boolean => {
  if (!shape) return false;
  return Boolean(shape.isLocked || shape.movable === 'none' || shape.sizable === 'none' || shape.rotatable === false);
};

// Lock or unlock shapes (and nested children for groups)
export const toggleShapeLock = (shapes: any[], forceState?: boolean): boolean => {
  if (!shapes || shapes.length === 0) return false;

  // If forceState is not provided, lock if any shape is unlocked, otherwise unlock
  const shouldLock = forceState !== undefined 
    ? forceState 
    : shapes.some((s) => !isShapeLocked(s));

  const applyLockRecursive = (shape: any) => {
    if (!shape) return;
    shape.isLocked = shouldLock;
    shape.movable = shouldLock ? 'none' : 'free';
    shape.sizable = shouldLock ? 'none' : 'free';
    shape.rotatable = !shouldLock;

    if (Array.isArray(shape.children)) {
      shape.children.forEach(applyLockRecursive);
    }
  };

  shapes.forEach(applyLockRecursive);
  return shouldLock;
};

// Rotate shapes by delta or set absolute degree
export const rotateShapes = (shapes: any[], angleDelta: number, setAbsolute = false, editor?: Editor | null): void => {
  if (!shapes || shapes.length === 0) return;

  shapes.forEach((shape) => {
    if (!shape) return;
    const current = Number(shape.rotate) || 0;
    const nextAngle = setAbsolute 
      ? (((angleDelta % 360) + 360) % 360)
      : ((((current + angleDelta) % 360) + 360) % 360);
    
    shape.rotate = nextAngle;
    if (editor && typeof shape.update === 'function') {
      try {
        shape.update(editor.canvas);
      } catch {}
    }
  });
};

// Apply color palette preset to shapes, groups, and lines
export const applyColorToShapes = (shapes: any[], strokeColor: string, fillColor?: string): void => {
  if (!shapes || shapes.length === 0) return;

  const applyRecursive = (shape: any) => {
    if (!shape) return;
    shape.strokeColor = strokeColor;
    shape.fontColor = strokeColor;

    const isOpenLine = isOpenLineShape(shape);
    if (fillColor && !isOpenLine && shape.fillColor !== undefined) {
      shape.fillColor = fillColor;
    }

    if (Array.isArray(shape.children)) {
      shape.children.forEach(applyRecursive);
    }
  };

  shapes.forEach(applyRecursive);
};

// Strip marks from TipTap / ProseMirror rich text doc
const clearMarksFromDoc = (node: any): any => {
  if (!node || typeof node !== 'object') return node;
  const newNode = { ...node };
  if ('marks' in newNode) {
    delete newNode.marks;
  }
  if (Array.isArray(newNode.content)) {
    newNode.content = newNode.content.map(clearMarksFromDoc);
  }
  return newNode;
};

// Text styling toggle (Bold, Italic, Clear)
export const applyTextStyling = (shapes: any[], style: 'bold' | 'italic' | 'clear'): void => {
  if (!shapes || shapes.length === 0) return;

  const applyRecursive = (shape: any) => {
    if (!shape) return;

    if (style === 'bold') {
      const isBold = shape.fontWeight === 700 || shape.fontWeight === '700' || shape.fontWeight === 'bold';
      shape.fontWeight = isBold ? 400 : 700;
    } else if (style === 'italic') {
      const isItalic = shape.fontStyle === 'italic';
      shape.fontStyle = isItalic ? 'normal' : 'italic';
    } else if (style === 'clear') {
      shape.fontWeight = 400;
      shape.fontStyle = 'normal';
      shape.fontFamily = 'Roboto';
      if (shape.text && typeof shape.text === 'object') {
        shape.text = clearMarksFromDoc(shape.text);
      }
    }

    if (Array.isArray(shape.children)) {
      shape.children.forEach(applyRecursive);
    }
  };

  shapes.forEach(applyRecursive);
};

// Configure arrowheads on line shapes
export const setLineArrows = (
  shapes: any[], 
  end: 'head' | 'tail', 
  type: 'flat' | 'arrow' | 'solid-arrow'
): void => {
  if (!shapes || shapes.length === 0) return;

  shapes.forEach((shape) => {
    if (!shape || !isOpenLineShape(shape)) return;
    if (end === 'head') {
      shape.headEndType = type;
    } else if (end === 'tail') {
      shape.tailEndType = type;
    }
  });
};

// Calculate proportional bounds for an image constrained within max bounding limits
export const calculateImageDimensions = (
  naturalWidth: number,
  naturalHeight: number,
  maxWidth = 400,
  maxHeight = 400
): { width: number; height: number } => {
  if (!naturalWidth || !naturalHeight || naturalWidth <= 0 || naturalHeight <= 0) {
    return { width: maxWidth, height: maxHeight };
  }
  const aspectRatio = naturalWidth / naturalHeight;
  let width = naturalWidth;
  let height = naturalHeight;

  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }
  return { width: Math.round(width), height: Math.round(height) };
};

// Construct an Image shape on the canvas with proportional sizing and ratio constraints
export const createImageShape = (
  editor: Editor,
  imageUrl: string,
  width: number,
  height: number,
  position?: [number, number]
): any => {
  const center = position || editor.getCenter();
  const halfW = width / 2;
  const halfH = height / 2;
  const left = center[0] - halfW;
  const top = center[1] - halfH;

  let shape: any;
  if (DgmImage) {
    shape = new DgmImage();
    shape.left = left;
    shape.top = top;
    shape.width = width;
    shape.height = height;
    shape.rect = [
      [left, top],
      [left + width, top + height],
    ];
    if (editor?.factory?.onShapeInitialize?.emit) {
      editor.factory.onShapeInitialize.emit(shape);
    }
  } else if (typeof (editor?.factory as any)?.createRectangle === 'function') {
    const rect: [[number, number], [number, number]] = [
      [left, top],
      [left + width, top + height],
    ];
    shape = editor.factory.createRectangle(rect);
    shape.type = 'Image';
    shape._type = 'Image';
  } else {
    shape = {
      type: 'Image',
      left,
      top,
      width,
      height,
      rect: [
        [left, top],
        [left + width, top + height],
      ],
    };
  }

  shape.imageData = imageUrl;
  shape.imageWidth = width;
  shape.imageHeight = height;
  shape.sizable = typeof Sizable !== 'undefined' && Sizable.RATIO ? Sizable.RATIO : 'ratio';
  shape.movable = 'free';
  shape.rotatable = true;
  shape.containable = false;

  return shape;
};

export {
  resolveDgmColor,
  extractShapeTextLines,
  extractImageDataUrl,
  serializeDgmToSvg,
  generatePdfDocument,
  exportWhiteboardToSVG,
  exportWhiteboardToPNG,
  exportWhiteboardToPDF,
  downloadBlob,
  calculateShapesBoundingBox,
} from './exportUtils';
