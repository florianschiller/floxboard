import { Editor } from '@dgmjs/core';
import { isOpenLineShape } from './shapeClassification';

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

// Apply color palette preset to shapes, groups, lines, freehand, connectors, and frames
export const applyColorToShapes = (shapes: any[], strokeColor: string, fillColor?: string): void => {
  if (!shapes || shapes.length === 0) return;

  const applyRecursive = (shape: any) => {
    if (!shape) return;
    shape.strokeColor = strokeColor;
    shape.fontColor = strokeColor;

    const isOpenLine = isOpenLineShape(shape);
    const isMarker = shape.type === 'Highlighter' || shape._type === 'Highlighter';
    
    if (fillColor && !isOpenLine && !isMarker && shape.fillColor !== undefined) {
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
