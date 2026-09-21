import { Editor, Page, Doc } from '@dgmjs/core';
import { downloadBlob, sanitizeFilename } from './downloadUtils';
import { resolveDgmColor } from './colorUtils';
import { extractShapeTextLines, extractImageDataUrl } from './shapeExtractors';
import { calculateShapesBoundingBox } from './boundsCalculator';

/**
 * Escape XML/SVG special characters
 */
export function escapeXml(unsafe: string): string {
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
export function serializeShapeToSvg(shape: any, isDarkMode = false): string {
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
  // 7. Frame shape
  else if (type === 'Frame') {
    const rx = shape.rx ?? shape.borderRadius ?? 4;
    const frameBorder = `<rect x="${left}" y="${top}" width="${w}" height="${h}" rx="${rx}" ry="${rx}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-dasharray="${strokeDash}" opacity="${opacity}"${transformAttr} />`;
    const frameTitle = shape.name || shape.title || 'Frame';
    const titleSvg = `<text x="${left + 8}" y="${top + 16}" font-size="12" font-weight="600" font-family="Inter, -apple-system, sans-serif" fill="${strokeColor}" opacity="${opacity}">${escapeXml(frameTitle)}</text>`;
    
    let childrenSvg = '';
    if (Array.isArray(shape.children) && shape.children.length > 0) {
      childrenSvg = shape.children
        .map((c: any) => serializeShapeToSvg(c, isDarkMode))
        .filter(Boolean)
        .join('\n');
    }
    
    shapeSvg = `${frameBorder}\n${titleSvg}${childrenSvg ? '\n' + childrenSvg : ''}`;
  }
  // 8. Box / Rectangle / Default
  else {
    const rx = shape.rx ?? shape.borderRadius ?? (shape.roundness ? 8 : 0);
    shapeSvg = `<rect x="${left}" y="${top}" width="${w}" height="${h}" rx="${rx}" ry="${rx}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-dasharray="${strokeDash}" opacity="${opacity}"${transformAttr} />`;
  }

  // 8. Render Text Content (inside shape or standalone text, skipped for Frames as frame header badge is already rendered)
  if (type !== 'Frame') {
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
