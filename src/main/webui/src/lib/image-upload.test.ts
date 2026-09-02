import { describe, it, expect, vi } from 'vitest';
import { calculateImageDimensions, createImageShape } from './shapeUtils';

describe('Image Upload & Shape Helpers', () => {
  describe('calculateImageDimensions', () => {
    it('scales down wide landscape images preserving aspect ratio', () => {
      const dimensions = calculateImageDimensions(1920, 1080, 400, 400);
      expect(dimensions.width).toBe(400);
      expect(dimensions.height).toBe(225);
    });

    it('scales down tall portrait images preserving aspect ratio', () => {
      const dimensions = calculateImageDimensions(1080, 1920, 400, 400);
      expect(dimensions.width).toBe(225);
      expect(dimensions.height).toBe(400);
    });

    it('preserves dimensions when image is smaller than max bounds', () => {
      const dimensions = calculateImageDimensions(300, 200, 400, 400);
      expect(dimensions.width).toBe(300);
      expect(dimensions.height).toBe(200);
    });

    it('handles square images properly', () => {
      const dimensions = calculateImageDimensions(800, 800, 400, 400);
      expect(dimensions.width).toBe(400);
      expect(dimensions.height).toBe(400);
    });

    it('handles zero or invalid dimensions gracefully', () => {
      const dimensions = calculateImageDimensions(0, 0, 400, 400);
      expect(dimensions.width).toBe(400);
      expect(dimensions.height).toBe(400);
    });
  });

  describe('createImageShape', () => {
    it('constructs an Image shape with proper ratio sizing and image data', () => {
      const mockFactory = {
        createRectangle: vi.fn((rect) => ({
          rect,
          type: 'Rectangle',
          _type: 'Rectangle',
        })),
      };
      const mockEditor = {
        factory: mockFactory,
        getCenter: () => [100, 100],
      } as any;

      const shape = createImageShape(mockEditor, '/api/v1/whiteboards/123/assets/456', 300, 200, [100, 100]);

      expect(shape.type).toBe('Image');
      expect(shape.imageData).toBe('/api/v1/whiteboards/123/assets/456');
      expect(shape.imageWidth).toBe(300);
      expect(shape.imageHeight).toBe(200);
      expect(shape.sizable).toBe('ratio');
      expect(shape.movable).toBe('free');
      expect(shape.rotatable).toBe(true);
      expect(shape.containable).toBe(false);
      expect(shape.rect).toEqual([
        [-50, 0],
        [250, 200],
      ]);
    });
  });
});
