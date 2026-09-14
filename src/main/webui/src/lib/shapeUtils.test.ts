import { describe, it, expect, vi } from 'vitest';
import { shapeInstantiator, Rectangle } from '@dgmjs/core';
import {
  serializeDocWithCustomData,
  restoreDocCustomData,
  serializeShapesToStencil,
  instantiateStencilShapes,
  executeShapeScript,
  setupScriptedShapeRendering,
} from './shapeUtils';

describe('shapeUtils customData serialization and restoration', () => {
  it('serializes doc with root customData and shape customData from in-memory store', () => {
    const mockShape1 = {
      id: 'shape-1',
      type: 'Box',
      customData: {
        votes: [
          { id: 'v1', userId: 'u1', userName: 'Alice', categoryId: 'cat-1' },
        ],
      },
    };
    const mockShape2 = {
      id: 'shape-2',
      type: 'Box',
    };

    const mockEditor: any = {
      saveToJSON: () => ({
        id: 'doc-1',
        type: 'Doc',
        version: 1,
        children: [
          {
            id: 'page-1',
            type: 'Page',
            children: [
              { id: 'shape-1', type: 'Box' },
              { id: 'shape-2', type: 'Box' },
            ],
          },
        ],
      }),
      store: {
        idIndex: {
          'shape-1': mockShape1,
          'shape-2': mockShape2,
        },
      },
      doc: {
        customData: {
          existingFlag: true,
        },
      },
    };

    const serialized = serializeDocWithCustomData(mockEditor, {
      votingConfig: {
        enabled: true,
        maxVotesPerUser: 5,
      },
    });

    expect(serialized).toBeDefined();
    expect(serialized.customData).toEqual({
      existingFlag: true,
      votingConfig: {
        enabled: true,
        maxVotesPerUser: 5,
      },
    });

    const page = serialized.children[0];
    expect(page.children[0].id).toBe('shape-1');
    expect(page.children[0].customData).toEqual({
      votes: [
        { id: 'v1', userId: 'u1', userName: 'Alice', categoryId: 'cat-1' },
      ],
    });
    expect(page.children[1].id).toBe('shape-2');
    expect(page.children[1].customData).toBeUndefined();
  });

  it('restores shape customData and doc customData into editor memory objects', () => {
    const mockShape1: any = { id: 'shape-1', type: 'Box' };
    const mockShape2: any = { id: 'shape-2', type: 'Box' };
    const mockDoc: any = { id: 'doc-1', type: 'Doc' };

    const mockEditor: any = {
      doc: mockDoc,
      store: {
        idIndex: {
          'shape-1': mockShape1,
          'shape-2': mockShape2,
        },
      },
    };

    const incomingContent = {
      id: 'doc-1',
      type: 'Doc',
      customData: {
        votingConfig: {
          enabled: true,
          isLocked: true,
        },
      },
      children: [
        {
          id: 'page-1',
          type: 'Page',
          children: [
            {
              id: 'shape-1',
              type: 'Box',
              customData: {
                votes: [{ id: 'v-100', userId: 'u2' }],
              },
            },
            {
              id: 'shape-2',
              type: 'Box',
            },
          ],
        },
      ],
    };

    restoreDocCustomData(mockEditor, incomingContent);

    expect(mockDoc.customData).toEqual({
      votingConfig: {
        enabled: true,
        isLocked: true,
      },
    });
    expect(mockShape1.customData).toEqual({
      votes: [{ id: 'v-100', userId: 'u2' }],
    });
    expect(mockShape2.customData).toBeUndefined();
  });

  it('handles null and undefined editor or content safely', () => {
    expect(serializeDocWithCustomData(null)).toBeNull();
    expect(serializeDocWithCustomData(undefined)).toBeNull();
    expect(() => restoreDocCustomData(null, {})).not.toThrow();
    expect(() => restoreDocCustomData({} as any, null)).not.toThrow();
  });

  it('serializes and restores scripts and properties across doc sync', () => {
    const scriptedShape = {
      id: 'custom-1',
      type: 'Custom',
      script: 'ctx.fillRect(0, 0, shape.width, shape.height);',
      properties: { header: 'User', attributes: ['+ id: string'] },
    };

    const mockEditor: any = {
      saveToJSON: () => ({
        id: 'doc-1',
        type: 'Doc',
        children: [
          {
            id: 'page-1',
            type: 'Page',
            children: [{ id: 'custom-1', type: 'Custom' }],
          },
        ],
      }),
      store: {
        idIndex: {
          'custom-1': scriptedShape,
        },
      },
      doc: {},
    };

    const serialized = serializeDocWithCustomData(mockEditor);
    expect(serialized.children[0].children[0].script).toBe('ctx.fillRect(0, 0, shape.width, shape.height);');
    expect(serialized.children[0].children[0].properties).toEqual({
      header: 'User',
      attributes: ['+ id: string'],
    });

    const restoreTargetShape: any = { id: 'custom-1', type: 'Custom' };
    const restoreEditor: any = {
      doc: {},
      store: {
        idIndex: {
          'custom-1': restoreTargetShape,
        },
      },
    };

    restoreDocCustomData(restoreEditor, serialized);
    expect(restoreTargetShape.script).toBe('ctx.fillRect(0, 0, shape.width, shape.height);');
    expect(restoreTargetShape.properties).toEqual({
      header: 'User',
      attributes: ['+ id: string'],
    });
  });
});

describe('shapeUtils stencil serialization and instantiation for scripted shapes', () => {
  it('serializes scripted shapes to stencil preserving relative bounds, script, and properties', () => {
    const drawFunction = (ctx: any, shape: any) => {
      ctx.strokeRect(0, 0, shape.width, shape.height);
    };

    const inputShapes = [
      {
        id: 'shape-a',
        type: 'Custom',
        left: 200,
        top: 150,
        width: 120,
        height: 80,
        script: drawFunction,
        properties: { state: 'active', level: 3 },
        fillColor: '#3b82f6',
        strokeColor: '#1d4ed8',
        customData: { domain: 'cloud' },
      },
      {
        id: 'shape-b',
        type: 'Custom',
        rect: [[250, 200], [350, 260]],
        script: 'ctx.beginPath();',
        properties: { badge: 'V1' },
      },
    ];

    const result = serializeShapesToStencil(inputShapes);
    expect(result.width).toBe(150); // 350 - 200 = 150
    expect(result.height).toBe(110); // 260 - 150 = 110
    expect(result.shapes).toHaveLength(2);

    const s1 = result.shapes[0];
    expect(s1.left).toBe(0); // 200 - 200 = 0
    expect(s1.top).toBe(0); // 150 - 150 = 0
    expect(s1.width).toBe(120);
    expect(s1.height).toBe(80);
    expect(typeof s1.script).toBe('string');
    expect(s1.properties).toEqual({ state: 'active', level: 3 });
    expect(s1.customData).toEqual({ domain: 'cloud' });
    expect(s1.fillColor).toBe('#3b82f6');

    const s2 = result.shapes[1];
    expect(s2.left).toBe(50); // 250 - 200 = 50
    expect(s2.top).toBe(50); // 200 - 150 = 50
    expect(s2.script).toBe('ctx.beginPath();');
    expect(s2.properties).toEqual({ badge: 'V1' });
  });

  it('instantiates stencil shapes at target coordinates with fresh UUIDs and preserved scripts', () => {
    const fnScript = (ctx: any) => { ctx.save(); };
    const stencilShapes = [
      {
        id: 'orig-1',
        type: 'Custom',
        left: 0,
        top: 0,
        width: 100,
        height: 60,
        script: fnScript,
        properties: { role: 'header' },
        customData: { flag: 1 },
      },
      {
        id: 'orig-2',
        type: 'Connector',
        rect: [[0, 0], [100, 100]],
        tail: 'orig-1',
      },
    ];

    const instantiated = instantiateStencilShapes(stencilShapes, 500, 300);
    expect(instantiated).toHaveLength(2);

    const s1 = instantiated[0];
    expect(s1.id).not.toBe('orig-1');
    expect(s1.left).toBe(500);
    expect(s1.top).toBe(300);
    expect(s1.width).toBe(100);
    expect(s1.height).toBe(60);
    expect(s1.script).toBe(fnScript);
    expect(s1.properties).toEqual({ role: 'header' });
    expect(s1.customData).toEqual({ flag: 1 });

    const s2 = instantiated[1];
    expect(s2.id).not.toBe('orig-2');
    expect(s2.tail).toBe(s1.id);
  });
});

describe('Custom scripted shape rendering and execution lifecycle', () => {
  it('executes function-based scripts directly with ctx and shape', () => {
    const mockCtx: any = {
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
    };
    const shape = {
      width: 150,
      height: 90,
      properties: { label: 'Node A' },
      script: vi.fn((ctx: any, s: any) => {
        ctx.fillRect(0, 0, s.width, s.height);
      }),
    };

    const success = executeShapeScript(mockCtx, shape);
    expect(success).toBe(true);
    expect(shape.script).toHaveBeenCalledWith(mockCtx, shape);
    expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 150, 90);
  });

  it('evaluates and executes string function scripts (function draw(ctx, shape))', () => {
    const mockCtx: any = {
      strokeRect: vi.fn(),
      fillText: vi.fn(),
    };
    const shape = {
      width: 200,
      height: 100,
      properties: { className: 'Order' },
      script: `function draw(ctx, shape) {
        ctx.strokeRect(0, 0, shape.width, shape.height);
        ctx.fillText(shape.properties.className, 10, 20);
      }`,
    };

    const success = executeShapeScript(mockCtx, shape);
    expect(success).toBe(true);
    expect(mockCtx.strokeRect).toHaveBeenCalledWith(0, 0, 200, 100);
    expect(mockCtx.fillText).toHaveBeenCalledWith('Order', 10, 20);
  });

  it('evaluates and executes statement-based script strings', () => {
    const mockCtx: any = {
      fillRect: vi.fn(),
    };
    const shape = {
      width: 80,
      height: 40,
      script: 'ctx.fillRect(0, 0, shape.width, shape.height);',
    };

    const success = executeShapeScript(mockCtx, shape);
    expect(success).toBe(true);
    expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 80, 40);
  });

  it('catches malformed script errors gracefully and returns false without throwing', () => {
    const mockCtx: any = {};
    const shape = {
      id: 'broken-shape',
      script: 'throw new Error("Broken drawing logic");',
    };

    const success = executeShapeScript(mockCtx, shape);
    expect(success).toBe(false);
  });

  it('registers Custom type in shapeInstantiator and creates custom shape instances', () => {
    setupScriptedShapeRendering();
    expect(typeof (shapeInstantiator as any)?.fnMap?.['Custom']).toBe('function');
    const instantiated = (shapeInstantiator as any).fnMap['Custom']();
    expect(instantiated.type).toBe('Custom');
  });

  it('Shape.prototype.draw draws at local origin without double-translating coordinates', () => {
    setupScriptedShapeRendering();
    const shape = new Rectangle();
    shape.left = 100;
    shape.top = 200;
    shape.width = 150;
    shape.height = 80;
    (shape as any).script = vi.fn((ctx: any, s: any) => {
      ctx.fillRect(0, 0, s.width, s.height);
    });

    const mockCtx: any = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      fillRect: vi.fn(),
    };

    const mockCanvas: any = {
      save: vi.fn(),
      restore: vi.fn(),
      context: mockCtx,
    };

    shape.draw(mockCanvas);

    expect((shape as any).script).toHaveBeenCalledWith(mockCtx, shape);
    expect(mockCtx.translate).not.toHaveBeenCalled();
    expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 150, 80);
  });
});
