import { Editor, textUtils } from '@dgmjs/core';

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

  const isFrame = shape.type === 'Frame' || shape._type === 'Frame' || Boolean(shape.isFrame);
  if (isFrame) {
    // Frames use header badges (name/title) and do not have centered body text unless explicitly provided as non-empty text content
    const hasExplicitText =
      typeof shape.text === 'string'
        ? shape.text.trim().length > 0
        : shape.text && typeof shape.text === 'object' && Array.isArray(shape.text.content) && shape.text.content.length > 0;
    if (!hasExplicitText) {
      shape.text = undefined;
      return;
    }
  }

  if (shape.customData?.fontFamily) {
    shape.fontFamily = shape.customData.fontFamily;
  } else if (!shape.fontFamily) {
    shape.fontFamily = 'Roboto';
  }

  shape.horzAlign = 'center';
  shape.vertAlign = 'middle';
  if (shape.text !== undefined && shape.text !== null) {
    shape.text = ensureCenteredTextDoc(shape.text, 'center');
  }

  if (typeof shape.customData?.fontSize === 'number' && shape.customData.fontSize > 0) {
    shape.fontSize = shape.customData.fontSize;
    return;
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
