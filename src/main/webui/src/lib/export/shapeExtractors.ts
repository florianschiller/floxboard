import { textUtils } from '@dgmjs/core';

/**
 * Extract plain text or lines from a shape text property (string, TipTap JSON doc, or object)
 */
export function extractShapeTextLines(text: any): string[] {
  if (text === null || text === undefined) return [];
  if (typeof text === 'string') {
    const trimmed = text.trim();
    if (!trimmed) return [];
    return text.split('\n');
  }

  try {
    if (typeof textUtils?.convertTextNodeToString === 'function') {
      const converted = textUtils.convertTextNodeToString(text);
      if (converted && converted.trim()) return converted.split('\n');
    }
  } catch {}

  if (typeof text === 'object') {
    if (Array.isArray(text.content)) {
      const lines: string[] = [];
      for (const block of text.content) {
        if (!block) continue;
        if (Array.isArray(block.content)) {
          const lineText = block.content
            .map((c: any) => (c && typeof c.text === 'string' ? c.text : ''))
            .join('');
          lines.push(lineText);
        } else if (typeof block.text === 'string') {
          lines.push(block.text);
        }
      }
      if (lines.some((l) => l.trim().length > 0)) {
        return lines;
      }
    } else if (typeof text.text === 'string' && text.text.trim()) {
      return [text.text];
    }
  }

  return [];
}

/**
 * Extract data URL or convert in-memory / DOM image source to base64 data URL
 */
export function extractImageDataUrl(shape: any): string {
  if (!shape) return '';

  // 1. If shape.imageData is already a base64 data URL
  if (typeof shape.imageData === 'string' && shape.imageData.startsWith('data:image/')) {
    return shape.imageData;
  }

  // 2. If shape._imageDOM is present (HTMLImageElement)
  if (shape._imageDOM) {
    if (typeof shape._imageDOM.src === 'string' && shape._imageDOM.src.startsWith('data:image/')) {
      return shape._imageDOM.src;
    }
    if (typeof document !== 'undefined') {
      try {
        const img = shape._imageDOM;
        const width = img.naturalWidth || img.width || shape.imageWidth || shape.width || 100;
        const height = img.naturalHeight || img.height || shape.imageHeight || shape.height || 100;
        if (width > 0 && height > 0) {
          const offCanvas = document.createElement('canvas');
          offCanvas.width = width;
          offCanvas.height = height;
          const ctx = offCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataUrl = offCanvas.toDataURL('image/png');
            if (dataUrl && dataUrl.startsWith('data:image/')) {
              return dataUrl;
            }
          }
        }
      } catch {}
    }
  }

  // 3. Fallback to shape.imageData, shape.src, shape.url, shape.href, shape.image, or shape._imageDOM?.src
  return (
    shape.imageData ||
    shape.src ||
    shape.url ||
    shape.href ||
    shape.image ||
    shape._imageDOM?.src ||
    ''
  );
}
