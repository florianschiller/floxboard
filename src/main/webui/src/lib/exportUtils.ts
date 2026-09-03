import { Editor, drawShapesOnCanvas, Page, Doc, textUtils, themeColors } from '@dgmjs/core';

export interface ExportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

/**
 * Trigger browser file download for a given Blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof window === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Helper to sanitize filename
 */
export function sanitizeFilename(name?: string | null, fallback = 'whiteboard'): string {
  if (!name || !name.trim()) return fallback;
  return name.trim().replace(/[\\/:*?"<>|]/g, '_');
}

/**
 * Resolve DGM theme color tokens ($foreground, $background, $gray1..12, etc.) to valid CSS/hex strings
 */
export function resolveDgmColor(color?: string, isDarkMode = false): string {
  if (!color) return isDarkMode ? '#ffffff' : '#000000';
  if (color === 'transparent' || color === 'none' || color === '$transparent') return 'none';
  if (color.startsWith('$')) {
    const token = color.substring(1);
    const palette = (isDarkMode ? themeColors?.dark : themeColors?.light) as Record<string, string> | undefined;
    if (palette && palette[token]) {
      const val = palette[token];
      if (token === 'transparent') return 'none';
      return val;
    }
    if (token === 'background') return isDarkMode ? '#121212' : '#ffffff';
    if (token === 'foreground') return isDarkMode ? '#ffffff' : '#000000';
    return isDarkMode ? '#ffffff' : '#000000';
  }
  return color;
}

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

/**
 * Calculate bounding box covering all active shapes on the board
 */
export function calculateShapesBoundingBox(shapes: any[], padding = 20): ExportBounds {
  if (!shapes || shapes.length === 0) {
    return { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const processShape = (s: any) => {
    if (!s || s.visible === false) return;
    if (
      s instanceof Page ||
      s instanceof Doc ||
      s._type === 'Page' ||
      s._type === 'Doc' ||
      s.type === 'Page' ||
      s.type === 'Doc'
    )
      return;

    // 0. Group shape: recurse into children only
    if (s.type === 'Group' || s._type === 'Group' || s.name === 'Group') {
      if (Array.isArray(s.children)) {
        s.children.forEach(processShape);
      }
      return;
    }

    // 1. Check points / path array (for Line, Connector, Freehand, Highlighter)
    const pts =
      Array.isArray(s.points) && s.points.length > 0
        ? s.points
        : Array.isArray(s.path) && s.path.length > 0
        ? s.path
        : null;

    if (pts && pts.length > 0) {
      for (const p of pts) {
        if (Array.isArray(p) && p.length >= 2 && typeof p[0] === 'number' && typeof p[1] === 'number') {
          minX = Math.min(minX, p[0]);
          minY = Math.min(minY, p[1]);
          maxX = Math.max(maxX, p[0]);
          maxY = Math.max(maxY, p[1]);
        }
      }
      if (Array.isArray(s.children)) {
        s.children.forEach(processShape);
      }
      return;
    }

    // 2. getBoundingRect method if available
    if (typeof s.getBoundingRect === 'function') {
      try {
        const rect = s.getBoundingRect();
        if (
          rect &&
          Array.isArray(rect) &&
          rect.length >= 2 &&
          Array.isArray(rect[0]) &&
          Array.isArray(rect[1])
        ) {
          const rx1 = rect[0][0];
          const ry1 = rect[0][1];
          const rx2 = rect[1][0];
          const ry2 = rect[1][1];
          if (
            isFinite(rx1) &&
            isFinite(ry1) &&
            isFinite(rx2) &&
            isFinite(ry2) &&
            (rx1 !== rx2 || ry1 !== ry2)
          ) {
            minX = Math.min(minX, rx1, rx2);
            minY = Math.min(minY, ry1, ry2);
            maxX = Math.max(maxX, rx1, rx2);
            maxY = Math.max(maxY, ry1, ry2);
            if (Array.isArray(s.children)) {
              s.children.forEach(processShape);
            }
            return;
          }
        }
      } catch {}
    }

    // 3. Rect property
    if (
      s.rect &&
      Array.isArray(s.rect) &&
      s.rect.length >= 2 &&
      Array.isArray(s.rect[0]) &&
      Array.isArray(s.rect[1])
    ) {
      const rx1 = s.rect[0][0];
      const ry1 = s.rect[0][1];
      const rx2 = s.rect[1][0];
      const ry2 = s.rect[1][1];
      if (isFinite(rx1) && isFinite(ry1) && isFinite(rx2) && isFinite(ry2)) {
        minX = Math.min(minX, rx1, rx2);
        minY = Math.min(minY, ry1, ry2);
        maxX = Math.max(maxX, rx1, rx2);
        maxY = Math.max(maxY, ry1, ry2);
        if (Array.isArray(s.children)) {
          s.children.forEach(processShape);
        }
        return;
      }
    }

    // 4. left / top / width / height (or x / y / width / height)
    const left = s.left ?? s.x;
    const top = s.top ?? s.y;
    const w = s.width ?? 0;
    const h = s.height ?? 0;

    if (left !== undefined && top !== undefined && isFinite(left) && isFinite(top)) {
      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
      maxX = Math.max(maxX, left + Math.max(0, w));
      maxY = Math.max(maxY, top + Math.max(0, h));
    }

    // 5. Nested group shapes
    if (Array.isArray(s.children)) {
      s.children.forEach(processShape);
    }
  };

  shapes.forEach(processShape);

  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
    return { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 };
  }

  const boundedMinX = Math.floor(minX - padding);
  const boundedMinY = Math.floor(minY - padding);
  const boundedMaxX = Math.ceil(maxX + padding);
  const boundedMaxY = Math.ceil(maxY + padding);
  const width = Math.max(10, boundedMaxX - boundedMinX);
  const height = Math.max(10, boundedMaxY - boundedMinY);

  return {
    minX: boundedMinX,
    minY: boundedMinY,
    maxX: boundedMaxX,
    maxY: boundedMaxY,
    width,
    height,
  };
}

/**
 * Escape XML/SVG special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Serialize a single DGM shape to SVG string
 */
function serializeShapeToSvg(shape: any, isDarkMode = false): string {
  if (!shape || shape.visible === false) return '';
  const type =
    shape.type ||
    shape._type ||
    shape.name ||
    shape.constructor?.name?.replace(/^_/, '').replace(/2$/, '') ||
    'Box';
  if (type === 'Page' || type === 'Doc') return '';

  const opacity = shape.opacity !== undefined && shape.opacity !== null ? shape.opacity : 1;
  const strokeColor = resolveDgmColor(shape.strokeColor, isDarkMode);
  const strokeWidth = shape.strokeWidth !== undefined ? shape.strokeWidth : 1;
  const strokeDash =
    Array.isArray(shape.strokePattern) && shape.strokePattern.length > 0
      ? shape.strokePattern.join(',')
      : shape.strokePattern === 'dashed'
      ? '6,4'
      : shape.strokePattern === 'dotted'
      ? '2,4'
      : 'none';

  let fillColor = 'none';
  if (shape.fillStyle !== 'none' && shape.fillStyle !== 0) {
    fillColor = resolveDgmColor(shape.fillColor, isDarkMode);
  }

  let left = shape.left ?? shape.x ?? 0;
  let top = shape.top ?? shape.y ?? 0;
  let w = shape.width ?? 0;
  let h = shape.height ?? 0;

  if (
    shape.rect &&
    Array.isArray(shape.rect) &&
    shape.rect.length >= 2 &&
    Array.isArray(shape.rect[0]) &&
    Array.isArray(shape.rect[1])
  ) {
    left = Math.min(shape.rect[0][0], shape.rect[1][0]);
    top = Math.min(shape.rect[0][1], shape.rect[1][1]);
    w = Math.abs(shape.rect[1][0] - shape.rect[0][0]);
    h = Math.abs(shape.rect[1][1] - shape.rect[0][1]);
  }

  const transformParts: string[] = [];
  if (shape.rotate) {
    const cx = left + w / 2;
    const cy = top + h / 2;
    transformParts.push(`rotate(${shape.rotate} ${cx} ${cy})`);
  }
  const transformAttr = transformParts.length > 0 ? ` transform="${transformParts.join(' ')}"` : '';

  let shapeSvg = '';

  // 1. Group shape
  if (type === 'Group') {
    const children = Array.isArray(shape.children) ? shape.children : [];
    const childrenSvg = children
      .map((c: any) => serializeShapeToSvg(c, isDarkMode))
      .filter(Boolean)
      .join('\n');
    return `<g id="${shape.id || ''}" opacity="${opacity}"${transformAttr}>\n${childrenSvg}\n</g>`;
  }

  // 2. Ellipse / Oval
  if (type === 'Ellipse' || type === 'Oval') {
    const rx = w / 2;
    const ry = h / 2;
    const cx = left + rx;
    const cy = top + ry;
    shapeSvg = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-dasharray="${strokeDash}" opacity="${opacity}"${transformAttr} />`;
  }
  // 3. Line / Connector
  else if (type === 'Line' || type === 'Connector') {
    const pts =
      Array.isArray(shape.points) && shape.points.length >= 2
        ? shape.points
        : Array.isArray(shape.path) && shape.path.length >= 2
        ? shape.path
        : null;
    if (pts && pts.length >= 2) {
      const d = pts
        .map((p: number[], idx: number) => `${idx === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`)
        .join(' ');

      let markerStart = '';
      let markerEnd = '';
      if (shape.tailEndType === 'arrow' || shape.tailEndType === 'solid-arrow') {
        markerStart = ' marker-start="url(#arrow-marker)"';
      }
      if (shape.headEndType === 'arrow' || shape.headEndType === 'solid-arrow') {
        markerEnd = ' marker-end="url(#arrow-marker)"';
      }

      shapeSvg = `<path d="${d}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-dasharray="${strokeDash}" stroke-linecap="round" stroke-linejoin="round"${markerStart}${markerEnd} opacity="${opacity}"${transformAttr} />`;
    }
  }
  // 4. Freehand / Highlighter / Path
  else if (type === 'Freehand' || type === 'Highlighter' || type === 'Path') {
    const pts =
      Array.isArray(shape.points) && shape.points.length >= 2
        ? shape.points
        : Array.isArray(shape.path) && shape.path.length >= 2
        ? shape.path
        : null;
    if (pts && pts.length >= 2) {
      const d = pts
        .map((p: number[], idx: number) => `${idx === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`)
        .join(' ');
      const hlOpacity = type === 'Highlighter' ? 0.35 : opacity;
      const hlStrokeWidth = type === 'Highlighter' ? Math.max(strokeWidth, 8) : strokeWidth;
      shapeSvg = `<path d="${d}" fill="${
        type === 'Freehand' && typeof shape.isClosed === 'function' && shape.isClosed()
          ? fillColor
          : 'none'
      }" stroke="${strokeColor}" stroke-width="${hlStrokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${hlOpacity}"${transformAttr} />`;
    }
  }
  // 5. Image
  else if (type === 'Image') {
    const href = extractImageDataUrl(shape);
    shapeSvg = `<image href="${href}" xlink:href="${href}" x="${left}" y="${top}" width="${w}" height="${h}" preserveAspectRatio="none" opacity="${opacity}"${transformAttr} />`;
  }
  // 6. Standalone Text container (only if explicitly filled/bordered)
  else if (type === 'Text') {
    if (fillColor !== 'none' || (strokeColor !== 'none' && strokeWidth > 0)) {
      shapeSvg = `<rect x="${left}" y="${top}" width="${w}" height="${h}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" opacity="${opacity}"${transformAttr} />`;
    }
  }
  // 7. Box / Rectangle / Frame / Default
  else {
    const rx = shape.rx ?? shape.borderRadius ?? (shape.roundness ? 8 : 0);
    shapeSvg = `<rect x="${left}" y="${top}" width="${w}" height="${h}" rx="${rx}" ry="${rx}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-dasharray="${strokeDash}" opacity="${opacity}"${transformAttr} />`;
  }

  // 8. Render Text Content (inside shape or standalone text)
  const textLines = extractShapeTextLines(shape.text);
  if (textLines.length > 0) {
    const fontSize = shape.fontSize || 16;
    const fontFamily = shape.fontFamily || 'Inter, -apple-system, sans-serif';
    const fontColor = resolveDgmColor(shape.fontColor || '$foreground', isDarkMode);
    const horzAlign = shape.horzAlign || (type === 'Text' ? 'left' : 'center');
    const vertAlign = shape.vertAlign || (type === 'Text' ? 'top' : 'middle');

    let textAnchor = 'middle';
    let textX = left + w / 2;
    if (horzAlign === 'left') {
      textAnchor = 'start';
      textX = left + 8;
    } else if (horzAlign === 'right') {
      textAnchor = 'end';
      textX = left + w - 8;
    }

    const lineHeight = fontSize * 1.3;
    const totalTextHeight = textLines.length * lineHeight;
    let startY = top + (h - totalTextHeight) / 2 + fontSize * 0.85;
    if (vertAlign === 'top') {
      startY = top + fontSize * 0.9 + 4;
    } else if (vertAlign === 'bottom') {
      startY = top + h - totalTextHeight + fontSize * 0.85;
    }

    const tspans = textLines
      .map((line, idx) => {
        const lineY = startY + idx * lineHeight;
        return `<tspan x="${textX}" y="${lineY}">${escapeXml(line)}</tspan>`;
      })
      .join('');

    const textSvg = `<text font-family="${fontFamily}" font-size="${fontSize}" fill="${fontColor}" text-anchor="${textAnchor}" opacity="${opacity}"${transformAttr}>${tspans}</text>`;
    shapeSvg = shapeSvg ? `${shapeSvg}\n${textSvg}` : textSvg;
  }

  return shapeSvg;
}

/**
 * Serialize full DGM Editor state or shapes into an SVG document string
 */
export function serializeDgmToSvg(editor: Editor | any, isDarkMode = false): string {
  if (!editor)
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600"></svg>';

  // Check if editor natively provides exportToSvg or toSVG and returns valid XML
  if (typeof editor.exportToSvg === 'function') {
    try {
      const res = editor.exportToSvg();
      if (typeof res === 'string' && res.trim().startsWith('<svg')) return res;
    } catch {}
  }
  if (typeof editor.toSVG === 'function') {
    try {
      const res = editor.toSVG();
      if (typeof res === 'string' && res.trim().startsWith('<svg')) return res;
    } catch {}
  }

  const page =
    typeof editor.getCurrentPage === 'function'
      ? editor.getCurrentPage()
      : editor.currentPage || (typeof editor.getDoc === 'function' ? editor.getDoc() : editor.doc);

  const rawShapes: any[] = page?.children || [];
  const shapes = rawShapes.filter(
    (s: any) =>
      s &&
      s !== page &&
      !(s instanceof Page) &&
      !(s instanceof Doc) &&
      s.type !== 'Page' &&
      s.type !== 'Doc'
  );

  const bounds = calculateShapesBoundingBox(shapes, 30);
  const { minX, minY, width, height } = bounds;

  const serializedShapes = shapes
    .map((s) => serializeShapeToSvg(s, isDarkMode))
    .filter(Boolean)
    .join('\n');

  const bgFill = isDarkMode ? '#121212' : '#ffffff';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${minX} ${minY} ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&amp;display=swap');
      text {
        font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        user-select: none;
      }
    </style>
    <marker id="arrow-marker" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="context-stroke" stroke="context-stroke" />
    </marker>
  </defs>
  <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="${bgFill}" />
  <g id="whiteboard-content">
${serializedShapes}
  </g>
</svg>`;
}

/**
 * Handle SVG client-side export and download
 */
export async function exportWhiteboardToSVG(
  editor: Editor | null,
  boardName?: string | null,
  isDarkMode = false
): Promise<void> {
  if (!editor) return;
  try {
    const svgString = serializeDgmToSvg(editor, isDarkMode);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, `${sanitizeFilename(boardName)}.svg`);
  } catch (err) {
    console.error('Failed to export whiteboard to SVG:', err);
  }
}

/**
 * Handle PNG client-side export and download using dgm canvas rendering
 */
export async function exportWhiteboardToPNG(
  editor: Editor | null,
  boardName?: string | null,
  isDarkMode = false
): Promise<void> {
  if (!editor) return;
  try {
    const page =
      typeof (editor as any).getCurrentPage === 'function'
        ? (editor as any).getCurrentPage()
        : (editor as any).currentPage ||
          (typeof (editor as any).getDoc === 'function'
            ? (editor as any).getDoc()
            : (editor as any).doc);

    const shapes = (page?.children || []).filter(
      (s: any) =>
        s &&
        s !== page &&
        !(s instanceof Page) &&
        !(s instanceof Doc) &&
        s.type !== 'Page' &&
        s.type !== 'Doc'
    );
    const bounds = calculateShapesBoundingBox(shapes, 30);
    const width = Math.max(10, bounds.width);
    const height = Math.max(10, bounds.height);

    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      const dpr =
        typeof window !== 'undefined' && window.devicePixelRatio
          ? Math.max(2, window.devicePixelRatio)
          : 2;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = isDarkMode ? '#121212' : '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const svgString = serializeDgmToSvg(editor, isDarkMode);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      if (typeof Image !== 'undefined') {
        await new Promise<void>((resolve) => {
          const img = new Image();
          let settled = false;
          const finish = () => {
            if (!settled) {
              settled = true;
              URL.revokeObjectURL(url);
              resolve();
            }
          };
          img.onload = () => {
            try {
              if (ctx) {
                ctx.drawImage(img, 0, 0, width * dpr, height * dpr);
              }
            } catch {}
            finish();
          };
          img.onerror = () => {
            finish();
          };
          setTimeout(finish, 50);
          img.src = url;
        });
      }

      if (typeof canvas.toBlob === 'function') {
        canvas.toBlob((blob) => {
          if (blob) {
            downloadBlob(blob, `${sanitizeFilename(boardName)}.png`);
          }
        }, 'image/png');
      } else if (typeof canvas.toDataURL === 'function') {
        try {
          const dataUrl = canvas.toDataURL('image/png');
          const base64Data = dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
          const byteString = atob(base64Data);
          const ia = new Uint8Array(byteString.length);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([ia], { type: 'image/png' });
          downloadBlob(blob, `${sanitizeFilename(boardName)}.png`);
        } catch {}
      }
    }
  } catch (err) {
    console.error('Failed to export whiteboard to PNG:', err);
  }
}

/**
 * Generate a valid PDF 1.4 binary blob embedding an image / canvas
 */
export function generatePdfDocument(
  imageDataUrl: string,
  widthPt: number,
  heightPt: number,
  pixelWidth?: number,
  pixelHeight?: number
): Blob {
  let imageBytes: Uint8Array;
  try {
    const base64Data = imageDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
    if (typeof atob === 'function') {
      const binaryString = atob(base64Data);
      imageBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        imageBytes[i] = binaryString.charCodeAt(i);
      }
    } else {
      imageBytes = new Uint8Array(0);
    }
  } catch {
    imageBytes = new Uint8Array(0);
  }

  const imgWidth = pixelWidth || Math.round(widthPt * 2);
  const imgHeight = pixelHeight || Math.round(heightPt * 2);

  // Construct PDF Objects
  // 1: Catalog, 2: Pages, 3: Page, 4: Image XObject, 5: Contents
  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${widthPt.toFixed(
    2
  )} ${heightPt.toFixed(
    2
  )}] /Contents 5 0 R /Resources << /ProcSet [/PDF /ImageB /ImageC /ImageI] /XObject << /Im1 4 0 R >> >> >>\nendobj\n`;
  const obj4Header = `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgWidth} /Height ${imgHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`;
  const obj4Footer = '\nendstream\nendobj\n';
  const contentStream = `q\n${widthPt.toFixed(2)} 0 0 ${heightPt.toFixed(2)} 0 0 cm\n/Im1 Do\nQ\n`;
  const obj5 = `5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`;

  // Assemble full PDF with binary image stream
  const header = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const enc = new TextEncoder();

  const hBytes = enc.encode(header);
  const o1Bytes = enc.encode(obj1);
  const o2Bytes = enc.encode(obj2);
  const o3Bytes = enc.encode(obj3);
  const o4HBytes = enc.encode(obj4Header);
  const o4FBytes = enc.encode(obj4Footer);
  const o5Bytes = enc.encode(obj5);

  const offset1 = hBytes.length;
  const offset2 = offset1 + o1Bytes.length;
  const offset3 = offset2 + o2Bytes.length;
  const offset4 = offset3 + o3Bytes.length;
  const offset5 = offset4 + o4HBytes.length + imageBytes.length + o4FBytes.length;
  const xrefOffset = offset5 + o5Bytes.length;

  const xref = `xref
0 6
0000000000 65535 f 
${offset1.toString().padStart(10, '0')} 00000 n 
${offset2.toString().padStart(10, '0')} 00000 n 
${offset3.toString().padStart(10, '0')} 00000 n 
${offset4.toString().padStart(10, '0')} 00000 n 
${offset5.toString().padStart(10, '0')} 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${xrefOffset}
%%EOF
`;
  const xrefBytes = enc.encode(xref);

  const totalLength = xrefOffset + xrefBytes.length;
  const pdfBuffer = new Uint8Array(totalLength);
  let pos = 0;

  pdfBuffer.set(hBytes, pos);
  pos += hBytes.length;
  pdfBuffer.set(o1Bytes, pos);
  pos += o1Bytes.length;
  pdfBuffer.set(o2Bytes, pos);
  pos += o2Bytes.length;
  pdfBuffer.set(o3Bytes, pos);
  pos += o3Bytes.length;
  pdfBuffer.set(o4HBytes, pos);
  pos += o4HBytes.length;
  pdfBuffer.set(imageBytes, pos);
  pos += imageBytes.length;
  pdfBuffer.set(o4FBytes, pos);
  pos += o4FBytes.length;
  pdfBuffer.set(o5Bytes, pos);
  pos += o5Bytes.length;
  pdfBuffer.set(xrefBytes, pos);

  return new Blob([pdfBuffer], { type: 'application/pdf' });
}

/**
 * Handle PDF client-side export and download
 */
export async function exportWhiteboardToPDF(
  editor: Editor | null,
  boardName?: string | null,
  isDarkMode = false
): Promise<void> {
  if (!editor) return;
  try {
    const page =
      typeof (editor as any).getCurrentPage === 'function'
        ? (editor as any).getCurrentPage()
        : (editor as any).currentPage ||
          (typeof (editor as any).getDoc === 'function'
            ? (editor as any).getDoc()
            : (editor as any).doc);

    const shapes = (page?.children || []).filter(
      (s: any) =>
        s &&
        s !== page &&
        !(s instanceof Page) &&
        !(s instanceof Doc) &&
        s.type !== 'Page' &&
        s.type !== 'Doc'
    );
    const bounds = calculateShapesBoundingBox(shapes, 30);
    const width = Math.max(100, bounds.width);
    const height = Math.max(100, bounds.height);

    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      const dpr = 2;
      canvas.width = width * dpr;
      canvas.height = height * dpr;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = isDarkMode ? '#121212' : '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const svgString = serializeDgmToSvg(editor, isDarkMode);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      if (typeof Image !== 'undefined') {
        await new Promise<void>((resolve) => {
          const img = new Image();
          let settled = false;
          const finish = () => {
            if (!settled) {
              settled = true;
              URL.revokeObjectURL(url);
              resolve();
            }
          };
          img.onload = () => {
            try {
              if (ctx) {
                ctx.drawImage(img, 0, 0, width * dpr, height * dpr);
              }
            } catch {}
            finish();
          };
          img.onerror = () => {
            finish();
          };
          setTimeout(finish, 50);
          img.src = url;
        });
      }

      let dataUrl = '';
      try {
        dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      } catch {}

      const pdfBlob = generatePdfDocument(dataUrl, width, height, canvas.width, canvas.height);
      downloadBlob(pdfBlob, `${sanitizeFilename(boardName)}.pdf`);
    }
  } catch (err) {
    console.error('Failed to export whiteboard to PDF:', err);
  }
}
