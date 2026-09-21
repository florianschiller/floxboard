import { Page, Doc } from '@dgmjs/core';
import { ExportBounds } from './types';

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
