import { Group, Page, Doc } from '@dgmjs/core';

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

// Check whether a shape is an open line / connector / freehand / highlighter (excluding closed polygons such as triangles and rhombuses/diamonds)
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
    type === 'Frame' ||
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

  // Check points geometry
  const pts = Array.isArray(shape.points) ? shape.points : (Array.isArray(shape.path) ? shape.path : null);
  if (Array.isArray(pts) && pts.length >= 3) {
    const first = pts[0];
    const last = pts[pts.length - 1];
    if (Array.isArray(first) && Array.isArray(last) && first.length >= 2 && last.length >= 2) {
      if (Math.abs(first[0] - last[0]) < 0.001 && Math.abs(first[1] - last[1]) < 0.001) {
        return false;
      }
    }
  }

  // Must be a Line, Connector, Freehand, or Highlighter shape or have line ending properties
  const isLineOrConnector =
    type === 'Line' ||
    type === 'Connector' ||
    type === 'Freehand' ||
    type === 'Highlighter' ||
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
