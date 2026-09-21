import { Editor, Image as DgmImage, Sizable } from '@dgmjs/core';

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
