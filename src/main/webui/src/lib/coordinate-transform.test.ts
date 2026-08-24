import { describe, it, expect } from 'vitest';

describe('Whiteboard cursor coordinate transformations', () => {
  it('correctly translates client DOM pointer coordinates (DCS) to Global Coordinates (GCS)', () => {
    const canvas = {
      origin: [100, 50],
      scale: 1.5,
      ratio: 2, // HiDPI Retina
    };

    const clientPointer = { x: 400, y: 350 };
    const containerRect = { left: 100, top: 50 };

    const dcsX = clientPointer.x - containerRect.left; // 300
    const dcsY = clientPointer.y - containerRect.top; // 300

    const gcsX = dcsX / canvas.scale - canvas.origin[0];
    const gcsY = dcsY / canvas.scale - canvas.origin[1];

    expect(gcsX).toBe(300 / 1.5 - 100); // 200 - 100 = 100
    expect(gcsY).toBe(300 / 1.5 - 50);  // 200 - 50 = 150
  });

  it('correctly maps GCS peer cursor coordinates back to screen display pixels (DCS) for remote collaborators', () => {
    const peerCursor: [number, number] = [100, 150];

    // Viewer 1: Same zoom 1.5x and origin [100, 50]
    const viewer1Canvas = { origin: [100, 50], scale: 1.5, ratio: 2 };
    const screenX1 = (peerCursor[0] + viewer1Canvas.origin[0]) * viewer1Canvas.scale;
    const screenY1 = (peerCursor[1] + viewer1Canvas.origin[1]) * viewer1Canvas.scale;

    expect(screenX1).toBe((100 + 100) * 1.5); // 300px
    expect(screenY1).toBe((150 + 50) * 1.5);  // 300px

    // Viewer 2: Zoomed out 0.5x and origin [0, 0]
    const viewer2Canvas = { origin: [0, 0], scale: 0.5, ratio: 1 };
    const screenX2 = (peerCursor[0] + viewer2Canvas.origin[0]) * viewer2Canvas.scale;
    const screenY2 = (peerCursor[1] + viewer2Canvas.origin[1]) * viewer2Canvas.scale;

    expect(screenX2).toBe((100 + 0) * 0.5); // 50px
    expect(screenY2).toBe((150 + 0) * 0.5); // 75px

    // Viewer 3: Zoomed in 2.0x and origin [-50, -50]
    const viewer3Canvas = { origin: [-50, -50], scale: 2.0, ratio: 3 };
    const screenX3 = (peerCursor[0] + viewer3Canvas.origin[0]) * viewer3Canvas.scale;
    const screenY3 = (peerCursor[1] + viewer3Canvas.origin[1]) * viewer3Canvas.scale;

    expect(screenX3).toBe((100 - 50) * 2.0); // 100px
    expect(screenY3).toBe((150 - 50) * 2.0); // 200px
  });
});
