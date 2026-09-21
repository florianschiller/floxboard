import { describe, it, expect, vi } from 'vitest';
import { shapeInstantiator, Rectangle, Frame, Image as DgmImage, Connector, manipulatorManager, MemoizationCanvas, Doc, Page } from '@dgmjs/core';
import {
  normalizeDocTypes,
  serializeDocWithCustomData,
  restoreDocCustomData,
  serializeShapesToStencil,
  instantiateStencilShapes,
  executeShapeScript,
  generateDefaultShapeScript,
  scaleFontString,
  setupScriptedShapeRendering,
} from './shapeUtils';
import { DRAW_SCRIPTS } from './prebuiltStencils';

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

  it('correctly executes DRAW_SCRIPTS.databaseCylinder with proper path sweep parameters and text rendering', () => {
    const mockCtx: any = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      ellipse: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
    };

    const shape = {
      width: 140,
      height: 100,
      fillColor: '#eff6ff',
      strokeColor: '#2563eb',
      strokeWidth: 2,
      properties: {
        title: 'PrimaryDB',
        subtitle: 'PostgreSQL 16',
      },
      script: DRAW_SCRIPTS.databaseCylinder,
    };

    const success = executeShapeScript(mockCtx, shape);
    expect(success).toBe(true);

    expect(mockCtx.save).toHaveBeenCalled();
    expect(mockCtx.restore).toHaveBeenCalled();

    // Body path verification:
    // 1. moveTo(0, ry) where ry = Math.min(20, 100 * 0.18) = 18
    expect(mockCtx.moveTo).toHaveBeenCalledWith(0, 18);
    // 2. lineTo(0, h - ry) = (0, 82)
    expect(mockCtx.lineTo).toHaveBeenCalledWith(0, 82);
    // 3. bottom base ellipse sweep: cx=70, cy=82, rx=70, ry=18, rot=0, start=Math.PI, end=0, anticlockwise=true
    expect(mockCtx.ellipse).toHaveBeenCalledWith(70, 82, 70, 18, 0, Math.PI, 0, true);
    // 4. lineTo(w, ry) = (140, 18)
    expect(mockCtx.lineTo).toHaveBeenCalledWith(140, 18);
    // 5. top cap ellipse sweep: cx=70, cy=18, rx=70, ry=18, rot=0, start=0, end=Math.PI, anticlockwise=true
    expect(mockCtx.ellipse).toHaveBeenCalledWith(70, 18, 70, 18, 0, 0, Math.PI, true);
    // 6. closePath
    expect(mockCtx.closePath).toHaveBeenCalled();

    // Top rim ellipse: cx=70, cy=18, rx=70, ry=18, rot=0, start=0, end=2*Math.PI, anticlockwise=false
    expect(mockCtx.ellipse).toHaveBeenCalledWith(70, 18, 70, 18, 0, 0, 2 * Math.PI, false);

    // Intermediate tier rings:
    // ringY1 = 18 + (100 - 36) * 0.35 = 18 + 22.4 = 40.4
    // ringY2 = 18 + (100 - 36) * 0.70 = 18 + 44.8 = 62.8
    expect(mockCtx.ellipse).toHaveBeenCalledWith(70, 40.4, 70, 18, 0, 0, Math.PI, false);
    expect(mockCtx.ellipse).toHaveBeenCalledWith(70, 62.8, 70, 18, 0, 0, Math.PI, false);

    // Text labels
    expect(mockCtx.fillText).toHaveBeenCalledWith('PrimaryDB', 70, 48);
    expect(mockCtx.fillText).toHaveBeenCalledWith('PostgreSQL 16', 70, 63);
  });

  it('registers Custom type in shapeInstantiator and creates custom shape instances', () => {
    setupScriptedShapeRendering();
    expect(typeof (shapeInstantiator as any)?.fnMap?.['Custom']).toBe('function');
    const instantiated = (shapeInstantiator as any).fnMap['Custom']();
    expect(instantiated.type).toBe('Custom');
  });

  it('registers Custom manipulator in manipulatorManager with BoxManipulator controllers', () => {
    setupScriptedShapeRendering();
    const customManipulator = manipulatorManager.get('Custom');
    expect(customManipulator).toBeDefined();
    expect(customManipulator).not.toBeNull();
    const rectManipulator = manipulatorManager.get('Rectangle');
    expect(customManipulator).toBe(rectManipulator);
    expect(Array.isArray((customManipulator as any)?.controllers)).toBe(true);
    expect((customManipulator as any)?.controllers?.length).toBeGreaterThan(0);
  });

  it('Shape.prototype.draw translates canvas context by (shape.left, shape.top) and draws at shape position', () => {
    setupScriptedShapeRendering();
    const shape = new Rectangle();
    shape.left = 120;
    shape.top = 250;
    shape.width = 160;
    shape.height = 90;
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

    expect(mockCtx.translate).toHaveBeenCalledWith(120, 250);
    expect((shape as any).script).toHaveBeenCalledWith(mockCtx, shape);
    expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 160, 90);

    // Test moving the shape updates translate coordinates
    mockCtx.translate.mockClear();
    shape.left = 340;
    shape.top = 480;

    shape.draw(mockCanvas);
    expect(mockCtx.translate).toHaveBeenCalledWith(340, 480);
  });

  it('scaleFontString scales pixel sizes in CSS font strings proportionally', () => {
    expect(scaleFontString('12px sans-serif', 2)).toBe('24px sans-serif');
    expect(scaleFontString('bold 14px "Open Sans", sans-serif', 1.5)).toBe('bold 21px "Open Sans", sans-serif');
    expect(scaleFontString('italic 500 16px Roboto', 0.5)).toBe('italic 500 8px Roboto');
    expect(scaleFontString('14px Arial', 1)).toBe('14px Arial');
    expect(scaleFontString('', 2)).toBe('');
  });

  it('Shape.prototype.draw applies ctx.scale relative to initial dimensions and provides baseline dimensions to draw scripts', () => {
    setupScriptedShapeRendering();
    const shape = new Rectangle();
    shape.left = 50;
    shape.top = 75;
    shape.width = 300;
    shape.height = 200;
    (shape as any).customData = {
      initialWidth: 150,
      initialHeight: 100,
      properties: { title: 'Test Shape' },
    };
    (shape as any).script = vi.fn((ctx: any, s: any) => {
      ctx.fillRect(0, 0, s.width, s.height);
    });

    const mockCtx: any = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      fillRect: vi.fn(),
    };

    const mockCanvas: any = {
      save: vi.fn(),
      restore: vi.fn(),
      context: mockCtx,
    };

    shape.draw(mockCanvas);

    expect(mockCtx.translate).toHaveBeenCalledWith(50, 75);
    // scaleX = 300 / 150 = 2, scaleY = 200 / 100 = 2
    expect(mockCtx.scale).toHaveBeenCalledWith(2, 2);
    // Script receives baseline dimensions (150, 100) so its coordinate arithmetic scales cleanly
    expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 150, 100);
  });

  it('serializeDocWithCustomData and restoreDocCustomData ensure dual persistence of properties and script', () => {
    const mockShape = {
      id: 'shape-persistent-1',
      type: 'Custom',
      properties: { priority: 'HIGH', status: 'IN_PROGRESS' },
      script: 'function draw(ctx, shape) {}',
      customData: {
        initialWidth: 200,
        initialHeight: 120,
      },
    };

    const mockEditor: any = {
      store: {
        idIndex: {
          'shape-persistent-1': mockShape,
        },
      },
      saveToJSON: () => ({
        version: 1,
        _type: 'Doc',
        id: 'root-doc',
        children: [
          {
            id: 'page-1',
            _type: 'Page',
            children: [
              {
                id: 'shape-persistent-1',
                _type: 'Custom',
              },
            ],
          },
        ],
      }),
    };

    const serialized = serializeDocWithCustomData(mockEditor);
    const serializedChild = serialized.children[0].children[0];

    expect(serializedChild.properties).toEqual({ priority: 'HIGH', status: 'IN_PROGRESS' });
    expect(serializedChild.script).toBe('function draw(ctx, shape) {}');
    expect(serializedChild.customData.properties).toEqual({ priority: 'HIGH', status: 'IN_PROGRESS' });
    expect(serializedChild.customData.script).toBe('function draw(ctx, shape) {}');
    expect(serializedChild.customData.initialWidth).toBe(200);

    // Test restore
    const restoreStore: any = {
      'shape-persistent-1': {
        id: 'shape-persistent-1',
      },
    };
    const mockRestoreEditor: any = {
      store: { idIndex: restoreStore },
      doc: {},
    };

    restoreDocCustomData(mockRestoreEditor, serialized);
    const restoredShape = restoreStore['shape-persistent-1'];

    expect(restoredShape.properties).toEqual({ priority: 'HIGH', status: 'IN_PROGRESS' });
    expect(restoredShape.script).toBe('function draw(ctx, shape) {}');
    expect(restoredShape.customData.properties).toEqual({ priority: 'HIGH', status: 'IN_PROGRESS' });
    expect(restoredShape.customData.script).toBe('function draw(ctx, shape) {}');
  });

  it('Shape.prototype.toJSON, fromJSON, assign, and clone preserve properties, scripts, and customData', () => {
    setupScriptedShapeRendering();
    const originalShape = new Rectangle();
    originalShape.id = 'test-shape-lifecycle';
    originalShape.type = 'Custom';
    (originalShape as any).properties = {
      className: 'OrderAggregate',
      stereotype: '<<Entity>>',
      methods: ['+ submit(): void'],
    };
    (originalShape as any).script = 'function draw(ctx, s) { ctx.strokeRect(0, 0, s.width, s.height); }';
    (originalShape as any).customData = {
      initialWidth: 240,
      initialHeight: 140,
    };

    // Test toJSON
    const json = (originalShape as any).toJSON();
    expect(json).toBeDefined();
    expect(json.properties).toEqual({
      className: 'OrderAggregate',
      stereotype: '<<Entity>>',
      methods: ['+ submit(): void'],
    });
    expect(json.script).toBe('function draw(ctx, s) { ctx.strokeRect(0, 0, s.width, s.height); }');
    expect(json.customData.initialWidth).toBe(240);
    expect(json.customData.properties).toEqual({
      className: 'OrderAggregate',
      stereotype: '<<Entity>>',
      methods: ['+ submit(): void'],
    });
    expect(json.customData.script).toBe('function draw(ctx, s) { ctx.strokeRect(0, 0, s.width, s.height); }');

    // Test fromJSON
    const recreatedShape = new Rectangle();
    (recreatedShape as any).fromJSON(json);
    expect((recreatedShape as any).properties).toEqual(json.properties);
    expect((recreatedShape as any).script).toBe(json.script);
    expect((recreatedShape as any).customData.initialWidth).toBe(240);
    expect((recreatedShape as any).customData.properties).toEqual(json.properties);

    // Test assign
    const targetShape = new Rectangle();
    (targetShape as any).left = 0;
    (targetShape as any).top = 0;
    (originalShape as any).left = 150;
    (originalShape as any).top = 250;
    (originalShape as any).width = 300;
    (originalShape as any).height = 180;
    (targetShape as any).assign(originalShape);
    expect((targetShape as any).properties).toEqual((originalShape as any).properties);
    expect((targetShape as any).script).toBe((originalShape as any).script);
    expect((targetShape as any).customData.initialWidth).toBe(240);
    expect((targetShape as any).customData.properties).toEqual((originalShape as any).properties);
    expect((targetShape as any).customData.script).toBe((originalShape as any).script);
    expect((targetShape as any).left).toBe(150);
    expect((targetShape as any).top).toBe(250);
    expect((targetShape as any).width).toBe(300);
    expect((targetShape as any).height).toBe(180);

    // Test clone
    const clonedShape = (originalShape as any).clone();
    expect(clonedShape).toBeDefined();
    expect((clonedShape as any).properties).toEqual((originalShape as any).properties);
    expect((clonedShape as any).script).toBe((originalShape as any).script);
    expect((clonedShape as any).customData.initialWidth).toBe(240);
    expect((clonedShape as any).customData.properties).toEqual((originalShape as any).properties);
    expect((clonedShape as any).customData.script).toBe((originalShape as any).script);
  });

  it('generateDefaultShapeScript produces valid starter templates for rectangles and ellipses', () => {
    const rectShape = { type: 'Rectangle', fillColor: '#fef08a', strokeColor: '#ca8a04', strokeWidth: 2 };
    const rectScript = generateDefaultShapeScript(rectShape);
    expect(rectScript).toContain('ctx.roundRect(0, 0, w, h');
    expect(rectScript).toContain('#fef08a');
    expect(rectScript).toContain('#ca8a04');

    const ellipseShape = { type: 'Ellipse', fillColor: '#bfdbfe', strokeColor: '#2563eb', strokeWidth: 3 };
    const ellipseScript = generateDefaultShapeScript(ellipseShape);
    expect(ellipseScript).toContain('ctx.ellipse(rx, ry, rx, ry');
    expect(ellipseScript).toContain('#bfdbfe');
    expect(ellipseScript).toContain('#2563eb');

    // Connector shape
    const connShape = { _type: 'Connector', strokeColor: '#6366f1', strokeWidth: 2, headEndType: 'arrow' };
    const connScript = generateDefaultShapeScript(connShape);
    expect(connScript).toContain('Canvas2D Custom Connector Drawing Script');
    expect(connScript).toContain('#6366f1');

    // Frame shape
    const frameShape = { type: 'Frame', title: 'Sprint Board Frame', fillColor: '#f8fafc', strokeColor: '#94a3b8' };
    const frameScript = generateDefaultShapeScript(frameShape);
    expect(frameScript).toContain('Canvas2D Custom Frame Container Script');
    expect(frameScript).toContain('Sprint Board Frame');

    // Image shape
    const imgShape = { type: 'Image', imageData: 'data:image/png;base64,...', width: 300, height: 200, altText: 'Logo' };
    const imgScript = generateDefaultShapeScript(imgShape);
    expect(imgScript).toContain('Canvas2D Custom Image Script');
    expect(imgScript).toContain('drawImage');
  });

  it('preserves defaultScript across serialization, restoration, and stencil lifecycles', () => {
    const mockShape: any = {
      id: 'stencil-shape-1',
      type: 'Custom',
      defaultScript: '// default code',
      script: '// customized code',
      properties: { title: 'KPI Gauge' },
    };

    const stencilData = serializeShapesToStencil([mockShape]);
    expect(stencilData.shapes[0].defaultScript).toBe('// default code');
    expect(stencilData.shapes[0].script).toBe('// customized code');

    const instantiated = instantiateStencilShapes(stencilData.shapes, 100, 100);
    expect(instantiated[0].defaultScript).toBe('// default code');
    expect(instantiated[0].script).toBe('// customized code');
  });

  it('executes shape script when attached under shape.customData.script', () => {
    const ctxMock: any = {
      save: vi.fn(),
      restore: vi.fn(),
      strokeRect: vi.fn(),
    };
    const shape = {
      id: 'custom-data-script-shape',
      customData: {
        script: 'ctx.strokeRect(0, 0, shape.width, shape.height);',
      },
      width: 120,
      height: 80,
    };

    const res = executeShapeScript(ctxMock, shape);
    expect(res).toBe(true);
    expect(ctxMock.strokeRect).toHaveBeenCalledWith(0, 0, 120, 80);
  });

  it('renders Frame container background fill and corner radius via canvas.fillRoundRect', () => {
    const frame = new Frame();
    frame.left = 10;
    frame.top = 20;
    frame.width = 300;
    frame.height = 200;
    frame.fillColor = '#3b82f6';
    frame.fillStyle = 'solid';
    frame.corners = [16, 16, 16, 16];
    frame.strokeColor = '#1d4ed8';
    frame.strokeWidth = 2;

    const fillRoundRectMock = vi.fn();
    const strokeRoundRectMock = vi.fn();
    const mockCanvas: any = {
      fillRoundRect: fillRoundRectMock,
      strokeRoundRect: strokeRoundRectMock,
      fillRect: vi.fn(),
      fillText: vi.fn(),
      context: {
        save: vi.fn(),
        restore: vi.fn(),
      },
      textMetric: vi.fn().mockReturnValue({ width: 50, height: 14 }),
    };

    frame.renderDefault(mockCanvas);

    expect(fillRoundRectMock).toHaveBeenCalledWith(10, 20, 310, 220, [16, 16, 16, 16], expect.anything());
    expect(strokeRoundRectMock).toHaveBeenCalledWith(10, 20, 310, 220, [16, 16, 16, 16], expect.anything());
  });

  it('renders Image corner clipping, opacity, and border stroke via renderDefault fallback on direct context', () => {
    const img = new DgmImage();
    img.left = 50;
    img.top = 60;
    img.width = 200;
    img.height = 150;
    img.opacity = 0.75;
    img.corners = [12, 12, 12, 12];
    img.strokeColor = '#ef4444';
    img.strokeWidth = 3;

    const strokeRoundRectMock = vi.fn();
    const saveMock = vi.fn();
    const restoreMock = vi.fn();
    const clipMock = vi.fn();
    const beginPathMock = vi.fn();

    const mockCanvas: any = {
      strokeRoundRect: strokeRoundRectMock,
      context: {
        save: saveMock,
        restore: restoreMock,
        clip: clipMock,
        beginPath: beginPathMock,
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        arcTo: vi.fn(),
        closePath: vi.fn(),
        drawImage: vi.fn(),
        globalAlpha: 1,
      },
    };

    img.renderDefault(mockCanvas);

    expect(saveMock).toHaveBeenCalled();
    expect(clipMock).toHaveBeenCalled();
    expect(mockCanvas.context.globalAlpha).toBe(0.75);
    expect(restoreMock).toHaveBeenCalled();
    expect(strokeRoundRectMock).toHaveBeenCalledWith(50, 60, 250, 210, [12, 12, 12, 12], expect.anything());
  });

  it('renders Image on MemoizationCanvas without context property without errors', () => {
    const img = new DgmImage();
    img.imageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    img.left = 100;
    img.top = 150;
    img.width = 300;
    img.height = 200;
    img.opacity = 0.8;
    img.corners = [8, 8, 8, 8];
    img.strokeColor = '#3b82f6';
    img.strokeWidth = 2;

    const memoCanvas = new MemoizationCanvas();
    memoCanvas.setCanvas({ resolveColor: (c: string) => c } as any);
    expect(() => {
      img.renderDefault(memoCanvas);
    }).not.toThrow();

    // Verify memoized drawing commands
    const drawItem: any = memoCanvas.do.find((item: any) => item.type === 'drawImage');
    expect(drawItem).toBeDefined();
    expect(drawItem?.x).toBe(100);
    expect(drawItem?.y).toBe(150);
    expect(drawItem?.w).toBe(300);
    expect(drawItem?.h).toBe(200);
    expect(drawItem?.radius).toEqual([8, 8, 8, 8]);

    const strokeItem: any = memoCanvas.do.find((item: any) => item.type === 'strokeRoundRect');
    expect(strokeItem).toBeDefined();
    expect(strokeItem?.x).toBe(100);
    expect(strokeItem?.y).toBe(150);
    expect(strokeItem?.w).toBe(300);
    expect(strokeItem?.h).toBe(200);
    expect(strokeItem?.radius).toEqual([8, 8, 8, 8]);
  });

  it('renders Image via canvas.drawImage and sets alpha when canvas has drawImage method directly', () => {
    const img = new DgmImage();
    img.imageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    img.left = 20;
    img.top = 30;
    img.width = 160;
    img.height = 120;
    img.opacity = 0.6;
    img.corners = [4, 4, 4, 4];
    img.strokeWidth = 0;

    const drawImageMock = vi.fn();
    const setAlphaMock = vi.fn();
    const mockCanvas: any = {
      drawImage: drawImageMock,
      setAlpha: setAlphaMock,
    };

    img.renderDefault(mockCanvas);

    expect(setAlphaMock).toHaveBeenCalledWith(0.6);
    expect(drawImageMock).toHaveBeenCalledWith(expect.anything(), 20, 30, 160, 120, [4, 4, 4, 4]);
  });

  it('successfully executes Shape.prototype.update on Image with MemoizationCanvas', () => {
    const img = new DgmImage();
    img.imageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    img.left = 10;
    img.top = 20;
    img.width = 100;
    img.height = 80;

    const mockScreenCanvas: any = {
      resolveColor: (c: string) => c,
      textMetric: vi.fn().mockReturnValue({ width: 50, height: 14 }),
      context: {
        save: vi.fn(),
        restore: vi.fn(),
        drawImage: vi.fn(),
      },
    };

    expect(() => {
      img.update(mockScreenCanvas);
    }).not.toThrow();
  });

  it('successfully loads and updates a whiteboard document containing Image shapes without throwing exceptions', () => {
    const boardContent = {
      id: 'doc-board-1',
      type: 'Doc',
      version: 1,
      children: [
        {
          id: 'page-1',
          type: 'Page',
          children: [
            {
              id: 'image-shape-1',
              type: 'Image',
              left: 50,
              top: 50,
              width: 250,
              height: 180,
              imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
              corners: [10, 10, 10, 10],
              opacity: 0.9,
              strokeColor: '#000000',
              strokeWidth: 1,
            },
            {
              id: 'frame-1',
              type: 'Frame',
              left: 0,
              top: 0,
              width: 500,
              height: 400,
              text: 'Frame Title',
            },
          ],
        },
      ],
    };

    const doc: any = shapeInstantiator.createFromJson(boardContent);
    const mockScreenCanvas: any = {
      resolveColor: (c: string) => c,
      textMetric: vi.fn().mockReturnValue({ width: 50, height: 14 }),
      context: {
        save: vi.fn(),
        restore: vi.fn(),
        drawImage: vi.fn(),
      },
    };

    expect(() => {
      (doc?.children as Page[]).forEach((p) => p.update(mockScreenCanvas));
    }).not.toThrow();

    const page = doc?.children[0] as Page;
    expect(page).toBeDefined();
    expect(page.children.length).toBe(2);
    const loadedImage = page.children[0] as any;
    expect(loadedImage.type).toBe('Image');
    expect(loadedImage.left).toBe(50);
    expect(loadedImage.imageData).toContain('data:image/png;base64');
  });

  it('persists Connector strokePattern and LineEndType across DGM instances', () => {
    const conn = new Connector();
    conn.strokeColor = '#8b5cf6';
    conn.strokeWidth = 2;
    conn.strokePattern = [8, 6];
    conn.headEndType = 'triangle';
    conn.tailEndType = 'diamond-filled';

    expect(conn.strokePattern).toEqual([8, 6]);
    expect(conn.headEndType).toBe('triangle');
    expect(conn.tailEndType).toBe('diamond-filled');

    const json = conn.toJSON();
    expect(json.strokePattern).toEqual([8, 6]);

    const conn2 = new Connector();
    conn2.fromJSON(json);
    expect(conn2.strokePattern).toEqual([8, 6]);
    expect(conn2.headEndType).toBe('triangle');
    expect(conn2.tailEndType).toBe('diamond-filled');
  });

  it('normalizes legacy documents with direct shapes into Page 1 container', () => {
    const legacyDoc = {
      id: 'legacy-doc',
      type: 'Doc',
      version: 1,
      children: [
        { id: 'shape-1', type: 'Rectangle', x: 10, y: 20, width: 100, height: 80 },
        { id: 'shape-2', type: 'Ellipse', x: 150, y: 120, width: 80, height: 80 },
      ],
    };

    const normalized = normalizeDocTypes(legacyDoc);
    expect(normalized.type).toBe('Doc');
    expect(normalized._type).toBe('Doc');
    expect(normalized.children.length).toBe(1);
    expect(normalized.children[0].type).toBe('Page');
    expect(normalized.children[0]._type).toBe('Page');
    expect(normalized.children[0].id).toBe('page_1');
    expect(normalized.children[0].name).toBe('Page 1');
    expect(normalized.children[0].children.length).toBe(2);
    expect(normalized.children[0].children[0].id).toBe('shape-1');
    expect(normalized.children[0].children[1].id).toBe('shape-2');
  });

  it('normalizes mixed root children by moving direct shapes into first page', () => {
    const mixedDoc = {
      id: 'mixed-doc',
      type: 'Doc',
      children: [
        {
          id: 'page_1',
          name: 'Main Page',
          type: 'Page',
          children: [{ id: 'shape-1', type: 'Rectangle', x: 0, y: 0, width: 50, height: 50 }],
        },
        { id: 'shape-2', type: 'Text', text: 'Floating text', x: 100, y: 100 },
        {
          id: 'page_2',
          name: 'Second Page',
          type: 'Page',
          children: [],
        },
      ],
    };

    const normalized = normalizeDocTypes(mixedDoc);
    expect(normalized.children.length).toBe(2);
    expect(normalized.children[0].id).toBe('page_1');
    expect(normalized.children[0].children.length).toBe(2);
    expect(normalized.children[0].children[1].id).toBe('shape-2');
    expect(normalized.children[1].id).toBe('page_2');
  });

  it('initializes empty document with default Page 1 container', () => {
    const emptyDoc = { id: 'empty-doc' };
    const normalized = normalizeDocTypes(emptyDoc);
    expect(normalized.type).toBe('Doc');
    expect(normalized._type).toBe('Doc');
    expect(normalized.children.length).toBe(1);
    expect(normalized.children[0].id).toBe('page_1');
    expect(normalized.children[0].name).toBe('Page 1');
    expect(normalized.children[0].children).toEqual([]);
  });
});
