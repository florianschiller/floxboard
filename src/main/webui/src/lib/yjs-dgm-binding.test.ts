import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as Y from 'yjs';
import { YjsDgmBinding } from './yjs-dgm-binding';

describe('YjsDgmBinding', () => {
  let mockEditor: any;
  let yDoc: Y.Doc;
  let transactionListeners: Array<(tx: any) => void>;
  let actionListeners: Array<(action: any) => void>;
  let currentDocJSON: any;

  beforeEach(() => {
    yDoc = new Y.Doc();
    transactionListeners = [];
    actionListeners = [];
    let undoListeners: Array<(action: any) => void> = [];
    let redoListeners: Array<(action: any) => void> = [];

    currentDocJSON = {
      _type: 'Doc',
      id: 'doc_1',
      version: 1,
      children: [
        {
          _type: 'Page',
          id: 'page_1',
          name: 'Page 1',
          children: [
            {
              _type: 'Rectangle',
              id: 'shape_1',
              origin: [10, 10],
              size: [100, 100],
              strokeColor: '#000000',
              fillColor: '#ffffff',
            },
          ],
        },
      ],
    };

    mockEditor = {
      saveToJSON: () => JSON.parse(JSON.stringify(currentDocJSON)),
      loadFromJSON: (json: any) => {
        currentDocJSON = JSON.parse(JSON.stringify(json));
      },
      repaint: () => {},
      selection: {
        getShapes: () => [],
        select: () => {},
      },
      store: {
        idIndex: {},
      },
      transform: {
        onTransaction: {
          addListener: (fn: any) => {
            transactionListeners.push(fn);
            return {
              dispose: () => {
                transactionListeners = transactionListeners.filter((l) => l !== fn);
              },
            };
          },
        },
        onAction: {
          addListener: (fn: any) => {
            actionListeners.push(fn);
            return {
              dispose: () => {
                actionListeners = actionListeners.filter((l) => l !== fn);
              },
            };
          },
        },
        onUndo: {
          addListener: (fn: any) => {
            undoListeners.push(fn);
            return {
              dispose: () => {
                undoListeners = undoListeners.filter((l) => l !== fn);
              },
            };
          },
        },
        onRedo: {
          addListener: (fn: any) => {
            redoListeners.push(fn);
            return {
              dispose: () => {
                redoListeners = redoListeners.filter((l) => l !== fn);
              },
            };
          },
        },
        triggerUndo: () => undoListeners.forEach((fn) => fn({})),
        triggerRedo: () => redoListeners.forEach((fn) => fn({})),
      },
    };
  });

  it('initializes and synchronizes initial editor state to Yjs', () => {
    const binding = new YjsDgmBinding(mockEditor, yDoc);
    const yShapes = yDoc.getMap<any>('shapes');
    const yMeta = yDoc.getMap<any>('meta');

    expect(yShapes.size).toBe(1);
    expect(yShapes.get('shape_1')).toBeDefined();
    expect(yShapes.get('shape_1')._type).toBe('Rectangle');
    expect(yMeta.get('version')).toBe(1);

    binding.destroy();
  });

  it('propagates local editor mutations into Yjs map', () => {
    const binding = new YjsDgmBinding(mockEditor, yDoc);
    const yShapes = yDoc.getMap<any>('shapes');

    // Simulate adding a second shape locally to the page
    currentDocJSON.children[0].children.push({
      _type: 'Ellipse',
      id: 'shape_2',
      origin: [200, 200],
      size: [80, 80],
    });

    // Trigger local transaction
    transactionListeners.forEach((fn) => fn({}));

    expect(yShapes.size).toBe(2);
    expect(yShapes.get('shape_2')).toBeDefined();
    expect(yShapes.get('shape_2')._type).toBe('Ellipse');

    binding.destroy();
  });

  it('applies remote Yjs mutations back to local editor', () => {
    const binding = new YjsDgmBinding(mockEditor, yDoc);
    const yShapes = yDoc.getMap('shapes');

    // Simulate remote user updating a shape color and bounds
    yDoc.transact(() => {
      yShapes.set('shape_1', {
        _type: 'Rectangle',
        id: 'shape_1',
        origin: [50, 50],
        size: [120, 120],
        strokeColor: '#ff0000',
        fillColor: '#ffeeee',
      });
    }, 'remote');

    expect(currentDocJSON.children[0].children[0].origin).toEqual([50, 50]);
    expect(currentDocJSON.children[0].children[0].strokeColor).toBe('#ff0000');
    expect(currentDocJSON.children[0].children[0].fillColor).toBe('#ffeeee');

    binding.destroy();
  });

  it('removes deleted shapes from Yjs map', () => {
    const binding = new YjsDgmBinding(mockEditor, yDoc);
    const yShapes = yDoc.getMap('shapes');
    expect(yShapes.size).toBe(1);

    // Simulate deleting the shape locally
    currentDocJSON.children[0].children = [];
    transactionListeners.forEach((fn) => fn({}));

    expect(yShapes.size).toBe(0);

    binding.destroy();
  });

  it('synchronizes on undo and redo events', () => {
    const binding = new YjsDgmBinding(mockEditor, yDoc);
    const yShapes = yDoc.getMap<any>('shapes');

    // Add a shape and undo
    currentDocJSON.children[0].children.push({
      _type: 'Ellipse',
      id: 'shape_undo',
      origin: [30, 30],
    });
    mockEditor.transform.triggerUndo();
    expect(yShapes.size).toBe(2);
    expect(yShapes.get('shape_undo')).toBeDefined();

    // Revert local JSON and redo
    currentDocJSON.children[0].children = currentDocJSON.children[0].children.filter((s: any) => s.id !== 'shape_undo');
    mockEditor.transform.triggerRedo();
    expect(yShapes.size).toBe(1);
    expect(yShapes.get('shape_undo')).toBeUndefined();

    binding.destroy();
  });

  it('preserves shape z-order from rawDoc when applying remote updates', () => {
    // Initial doc with 3 shapes in order: shape_1, shape_2, shape_3
    currentDocJSON.children[0].children = [
      { _type: 'Rectangle', id: 'shape_1' },
      { _type: 'Rectangle', id: 'shape_2' },
      { _type: 'Rectangle', id: 'shape_3' },
    ];
    const binding = new YjsDgmBinding(mockEditor, yDoc);

    const remoteDoc = new Y.Doc();
    // Simulate multi-client sync by applying update from yDoc to remoteDoc
    const state = Y.encodeStateAsUpdate(yDoc);
    Y.applyUpdate(remoteDoc, state);

    // Remote client modifies shape_2 and adds shape_4
    remoteDoc.transact(() => {
      const remoteShapes = remoteDoc.getMap<any>('shapes');
      remoteShapes.set('shape_2', { _type: 'Rectangle', id: 'shape_2', fillColor: '#ff0000' });
      remoteShapes.set('shape_4', { _type: 'Rectangle', id: 'shape_4' });
    }, 'remote');

    // Propagate update back to yDoc
    const remoteUpdate = Y.encodeStateAsUpdate(remoteDoc);
    Y.applyUpdate(yDoc, remoteUpdate, 'remote');

    const children = currentDocJSON.children[0].children;
    expect(children.map((s: any) => s.id)).toEqual(['shape_1', 'shape_2', 'shape_3', 'shape_4']);
    expect(children[1].fillColor).toBe('#ff0000');

    binding.destroy();
    remoteDoc.destroy();
  });

  it('safely recovers when remote payload contains unexpected errors without locking isApplyingRemote', () => {
    const binding = new YjsDgmBinding(mockEditor, yDoc);

    // Mock loadFromJSON to throw an error
    const originalLoad = mockEditor.loadFromJSON;
    mockEditor.loadFromJSON = vi.fn().mockImplementation(() => {
      throw new Error('Corrupt shape payload');
    });

    const yShapes = yDoc.getMap<any>('shapes');
    expect(() => {
      yDoc.transact(() => {
        yShapes.set('shape_bad', { id: 'shape_bad' });
      }, 'remote');
    }).not.toThrow();

    // Restore loadFromJSON
    mockEditor.loadFromJSON = originalLoad;

    // Verify local modifications still sync after error
    currentDocJSON.children[0].children.push({
      _type: 'Rectangle',
      id: 'shape_after_error',
    });
    transactionListeners.forEach((fn) => fn({}));

    expect(yShapes.has('shape_after_error')).toBe(true);

    binding.destroy();
  });

  it('synchronizes batch shape deltas accumulated during offline/idle periods upon reconnection', () => {
    // Client A setup
    const bindingA = new YjsDgmBinding(mockEditor, yDoc);

    // Client B simulates changes on its own doc while Client A is idle
    const docB = new Y.Doc();
    const initialSync = Y.encodeStateAsUpdate(yDoc);
    Y.applyUpdate(docB, initialSync);

    // Client B makes multiple additions, modifications, and deletions offline
    const shapesB = docB.getMap<any>('shapes');
    docB.transact(() => {
      shapesB.set('shape_b1', { _type: 'Rectangle', id: 'shape_b1', origin: [10, 10] });
      shapesB.set('shape_b2', { _type: 'Ellipse', id: 'shape_b2', origin: [50, 50] });
      shapesB.delete('shape_1'); // deleted existing shape_1
    });

    // Client A resumes and receives batch diff
    const stateVectorA = Y.encodeStateVector(yDoc);
    const diffForA = Y.encodeStateAsUpdate(docB, stateVectorA);
    Y.applyUpdate(yDoc, diffForA, 'remote');

    // Client A editor doc should reflect all batch changes
    const childrenA = currentDocJSON.children[0].children;
    expect(childrenA.some((s: any) => s.id === 'shape_1')).toBe(false);
    expect(childrenA.some((s: any) => s.id === 'shape_b1')).toBe(true);
    expect(childrenA.some((s: any) => s.id === 'shape_b2')).toBe(true);

    bindingA.destroy();
    docB.destroy();
  });

  it('synchronizes group hierarchy and nested children across collaborative clients', () => {
    const bindingA = new YjsDgmBinding(mockEditor, yDoc);

    const groupShape = {
      _type: 'Group',
      id: 'group_1',
      children: [
        { _type: 'Box', id: 'child_1', strokeColor: '#000000', rotate: 45 },
        { _type: 'Line', id: 'child_2', strokeColor: '#d0021b', headEndType: 'arrow' },
      ],
      isLocked: false,
      rotate: 90,
    };

    currentDocJSON.children[0].children.push(groupShape);
    transactionListeners.forEach((fn) => fn({}));

    // Check that yShapes and rawDoc have the group
    const yShapes = yDoc.getMap<any>('shapes');
    expect(yShapes.has('group_1')).toBe(true);
    const storedGroup = yShapes.get('group_1');
    expect(storedGroup._type).toBe('Group');
    expect(storedGroup.children.length).toBe(2);
    expect(storedGroup.rotate).toBe(90);

    // Create Client B and load
    let clientBDocJSON: any = null;
    const mockEditorB = {
      saveToJSON: () => clientBDocJSON,
      loadFromJSON: (json: any) => {
        clientBDocJSON = JSON.parse(JSON.stringify(json));
      },
      repaint: vi.fn(),
      selection: { getShapes: () => [], select: vi.fn() },
      transform: {
        onTransaction: { addListener: vi.fn() },
        onAction: { addListener: vi.fn() },
        onUndo: { addListener: vi.fn() },
        onRedo: { addListener: vi.fn() },
      },
      store: { idIndex: {} },
    };

    const docB = new Y.Doc();
    const syncState = Y.encodeStateAsUpdate(yDoc);
    Y.applyUpdate(docB, syncState);

    const bindingB = new YjsDgmBinding(mockEditorB as any, docB);
    const bGroup = clientBDocJSON.children[0].children.find((s: any) => s.id === 'group_1');
    expect(bGroup).toBeDefined();
    expect(bGroup.children.length).toBe(2);
    expect(bGroup.children[0].id).toBe('child_1');
    expect(bGroup.children[1].id).toBe('child_2');

    bindingA.destroy();
    bindingB.destroy();
    docB.destroy();
  });

  it('preserves locked states, rotation angles, and z-order ordering across remote updates', () => {
    const bindingA = new YjsDgmBinding(mockEditor, yDoc);

    // Client A updates shape with locked state and rotation, and rearranges z-order
    currentDocJSON.children[0].children = [
      { _type: 'Oval', id: 'shape_2', rotate: 180, isLocked: true, movable: 'none', sizable: 'none', rotatable: false },
      { _type: 'Rectangle', id: 'shape_1', rotate: 90, isLocked: false, movable: 'free', sizable: 'free', rotatable: true },
    ];
    transactionListeners.forEach((fn) => fn({}));

    // Client B receives updates
    let clientBDocJSON: any = null;
    const mockEditorB = {
      saveToJSON: () => clientBDocJSON,
      loadFromJSON: (json: any) => {
        clientBDocJSON = JSON.parse(JSON.stringify(json));
      },
      repaint: vi.fn(),
      selection: { getShapes: () => [], select: vi.fn() },
      transform: {
        onTransaction: { addListener: vi.fn() },
        onAction: { addListener: vi.fn() },
        onUndo: { addListener: vi.fn() },
        onRedo: { addListener: vi.fn() },
      },
      store: { idIndex: {} },
    };

    const docB = new Y.Doc();
    const syncState = Y.encodeStateAsUpdate(yDoc);
    Y.applyUpdate(docB, syncState);

    const bindingB = new YjsDgmBinding(mockEditorB as any, docB);
    const shapesB = clientBDocJSON.children[0].children;

    // Check z-order: shape_2 is at index 0, shape_1 is at index 1
    expect(shapesB[0].id).toBe('shape_2');
    expect(shapesB[0].rotate).toBe(180);
    expect(shapesB[0].isLocked).toBe(true);
    expect(shapesB[0].movable).toBe('none');

    expect(shapesB[1].id).toBe('shape_1');
    expect(shapesB[1].rotate).toBe(90);
    expect(shapesB[1].isLocked).toBe(false);
    expect(shapesB[1].movable).toBe('free');

    bindingA.destroy();
    bindingB.destroy();
    docB.destroy();
  });

  it('merges simultaneous granular edits from different users on separate shapes without LWW overwrite', () => {
    // Initial board has two shapes
    currentDocJSON.children[0].children = [
      { _type: 'Rectangle', id: 'shape_a', origin: [0, 0], strokeColor: '#000000' },
      { _type: 'Rectangle', id: 'shape_b', origin: [100, 100], strokeColor: '#000000' },
    ];
    const bindingA = new YjsDgmBinding(mockEditor, yDoc);

    // Setup Client B
    let clientBDocJSON: any = null;
    let bTransactionListeners: Array<(tx: any) => void> = [];
    const mockEditorB = {
      saveToJSON: () => JSON.parse(JSON.stringify(clientBDocJSON)),
      loadFromJSON: (json: any) => {
        clientBDocJSON = JSON.parse(JSON.stringify(json));
      },
      repaint: vi.fn(),
      selection: { getShapes: () => [], select: vi.fn() },
      transform: {
        onTransaction: {
          addListener: (fn: any) => {
            bTransactionListeners.push(fn);
            return { dispose: () => {} };
          },
        },
        onAction: { addListener: vi.fn() },
        onUndo: { addListener: vi.fn() },
        onRedo: { addListener: vi.fn() },
      },
      store: { idIndex: {} },
    };

    const docB = new Y.Doc();
    const syncState = Y.encodeStateAsUpdate(yDoc);
    Y.applyUpdate(docB, syncState);
    const bindingB = new YjsDgmBinding(mockEditorB as any, docB);

    // User A edits shape_a locally
    currentDocJSON.children[0].children[0].strokeColor = '#ff0000';
    transactionListeners.forEach((fn) => fn({}));

    // User B simultaneously edits shape_b locally (before receiving User A's update)
    clientBDocJSON.children[0].children[1].strokeColor = '#0000ff';
    bTransactionListeners.forEach((fn) => fn({}));

    // Now propagate updates bidirectionally
    const updateA = Y.encodeStateAsUpdate(yDoc);
    const updateB = Y.encodeStateAsUpdate(docB);
    Y.applyUpdate(docB, updateA, 'remote');
    Y.applyUpdate(yDoc, updateB, 'remote');

    // Both documents must contain BOTH edits merged seamlessly
    const docA_shapes = currentDocJSON.children[0].children;
    const docB_shapes = clientBDocJSON.children[0].children;

    expect(docA_shapes.find((s: any) => s.id === 'shape_a').strokeColor).toBe('#ff0000');
    expect(docA_shapes.find((s: any) => s.id === 'shape_b').strokeColor).toBe('#0000ff');

    expect(docB_shapes.find((s: any) => s.id === 'shape_a').strokeColor).toBe('#ff0000');
    expect(docB_shapes.find((s: any) => s.id === 'shape_b').strokeColor).toBe('#0000ff');

    bindingA.destroy();
    bindingB.destroy();
    docB.destroy();
  });

  it('deduplicates shape entries in editor when yOrder contains duplicated IDs from concurrent reconnects', () => {
    const yShapes = yDoc.getMap<any>('shapes');
    const yOrder = yDoc.getArray<string>('shapeOrder');

    yShapes.set('shape_1', { _type: 'Rectangle', id: 'shape_1', origin: [0, 0] });
    yShapes.set('shape_2', { _type: 'Rectangle', id: 'shape_2', origin: [50, 50] });
    // Simulate duplicate entries in yOrder
    yOrder.push(['shape_1', 'shape_1', 'shape_2', 'shape_1']);

    const binding = new YjsDgmBinding(mockEditor, yDoc);

    const loadedShapes = currentDocJSON.children[0].children;
    expect(loadedShapes.length).toBe(2);
    expect(loadedShapes.map((s: any) => s.id)).toEqual(['shape_1', 'shape_2']);

    binding.destroy();
  });

  it('preserves viewport origin and scale when applying remote updates', () => {
    let currentOrigin = [250, 450];
    let currentScale = 1.5;

    mockEditor.getOrigin = vi.fn(() => currentOrigin);
    mockEditor.setOrigin = vi.fn((x: number, y: number) => {
      currentOrigin = [x, y];
    });
    mockEditor.getScale = vi.fn(() => currentScale);
    mockEditor.setScale = vi.fn((scale: number) => {
      currentScale = scale;
    });

    const binding = new YjsDgmBinding(mockEditor, yDoc);

    // Simulate loadFromJSON resetting origin and scale
    const originalLoadFromJSON = mockEditor.loadFromJSON;
    mockEditor.loadFromJSON = vi.fn((json: any) => {
      originalLoadFromJSON(json);
      currentOrigin = [0, 0];
      currentScale = 1.0;
    });

    const remoteDoc = new Y.Doc();
    const remoteShapes = remoteDoc.getMap<any>('shapes');
    remoteShapes.set('shape_1', { _type: 'Rectangle', id: 'shape_1', origin: [500, 500] });

    const update = Y.encodeStateAsUpdate(remoteDoc);
    Y.applyUpdate(yDoc, update, 'remote');

    expect(mockEditor.setOrigin).toHaveBeenCalledWith(250, 450);
    expect(mockEditor.setScale).toHaveBeenCalledWith(1.5);
    expect(currentOrigin).toEqual([250, 450]);
    expect(currentScale).toBe(1.5);

    binding.destroy();
    remoteDoc.destroy();
  });

  it('synchronizes Freehand and Highlighter shapes created by drawing tools into yShapes and yOrder', () => {
    const binding = new YjsDgmBinding(mockEditor, yDoc);
    const yShapes = yDoc.getMap<any>('shapes');
    const yOrder = yDoc.getArray<string>('shapeOrder');

    // Simulate user drawing freehand stroke and marker stroke
    currentDocJSON.children[0].children = [
      {
        _type: 'Freehand',
        id: 'stroke_1',
        strokeColor: '#0284c7',
        strokeWidth: 2,
        points: [[10, 10], [15, 20], [25, 35]],
      },
      {
        _type: 'Highlighter',
        id: 'marker_1',
        strokeColor: '#f59e0b',
        strokeWidth: 14,
        alpha: 0.35,
        points: [[100, 100], [150, 100]],
      },
    ];

    binding.syncEditorToYjs();

    expect(yShapes.size).toBe(2);
    expect(yShapes.get('stroke_1')).toBeDefined();
    expect(yShapes.get('stroke_1')._type).toBe('Freehand');
    expect(yShapes.get('stroke_1').points.length).toBe(3);
    expect(yShapes.get('marker_1')).toBeDefined();
    expect(yShapes.get('marker_1')._type).toBe('Highlighter');
    expect(yShapes.get('marker_1').alpha).toBe(0.35);

    expect(yOrder.toArray()).toEqual(['stroke_1', 'marker_1']);

    binding.destroy();
  });

  it('synchronizes repositioned and moved shapes (coordinate updates) to yShapes upon transaction / sync', () => {
    const binding = new YjsDgmBinding(mockEditor, yDoc);
    const yShapes = yDoc.getMap<any>('shapes');

    // Initial position was [10, 10]
    expect(yShapes.get('shape_1').origin).toEqual([10, 10]);

    // User moves shape to [150, 200]
    currentDocJSON.children[0].children[0].origin = [150, 200];
    binding.syncEditorToYjs();

    expect(yShapes.get('shape_1').origin).toEqual([150, 200]);

    binding.destroy();
  });

  it('removes erased and deleted shapes from yShapes and yOrder, and clears empty canvas to remote peers', () => {
    const bindingA = new YjsDgmBinding(mockEditor, yDoc);
    const yShapes = yDoc.getMap<any>('shapes');
    const yOrder = yDoc.getArray<string>('shapeOrder');

    // Add 2 shapes initially
    currentDocJSON.children[0].children = [
      { _type: 'Rectangle', id: 'shape_1', origin: [0, 0] },
      { _type: 'Freehand', id: 'stroke_1', points: [[0, 0], [10, 10]] },
    ];
    bindingA.syncEditorToYjs();
    expect(yShapes.size).toBe(2);

    // Setup client B
    let clientBDocJSON: any = null;
    const mockEditorB = {
      saveToJSON: () => JSON.parse(JSON.stringify(clientBDocJSON)),
      loadFromJSON: (json: any) => {
        clientBDocJSON = JSON.parse(JSON.stringify(json));
      },
      repaint: vi.fn(),
      selection: { getShapes: () => [], select: vi.fn() },
      transform: {
        onTransaction: { addListener: vi.fn() },
        onAction: { addListener: vi.fn() },
        onUndo: { addListener: vi.fn() },
        onRedo: { addListener: vi.fn() },
      },
      store: { idIndex: {} },
    };
    const docB = new Y.Doc();
    Y.applyUpdate(docB, Y.encodeStateAsUpdate(yDoc));
    const bindingB = new YjsDgmBinding(mockEditorB as any, docB);

    // 1. User A erases stroke_1
    currentDocJSON.children[0].children = [
      { _type: 'Rectangle', id: 'shape_1', origin: [0, 0] },
    ];
    bindingA.syncEditorToYjs();

    expect(yShapes.size).toBe(1);
    expect(yShapes.has('stroke_1')).toBe(false);
    expect(yOrder.toArray()).toEqual(['shape_1']);

    Y.applyUpdate(docB, Y.encodeStateAsUpdate(yDoc));
    expect(clientBDocJSON.children[0].children.length).toBe(1);
    expect(clientBDocJSON.children[0].children[0].id).toBe('shape_1');

    // 2. User A erases all remaining shapes (shape_1) down to 0 shapes
    currentDocJSON.children[0].children = [];
    bindingA.syncEditorToYjs();

    expect(yShapes.size).toBe(0);
    expect(yOrder.toArray()).toEqual([]);

    Y.applyUpdate(docB, Y.encodeStateAsUpdate(yDoc));
    expect(clientBDocJSON.children[0].children.length).toBe(0);

    bindingA.destroy();
    bindingB.destroy();
    docB.destroy();
  });

  it('synchronizes shape customData votes and doc votingConfig across collaborative clients', () => {
    const memoryShapeA = {
      id: 'shape_1',
      _type: 'Rectangle',
      customData: {
        votes: [
          { id: 'v-collab-1', userId: 'user-a', userName: 'User A', categoryId: 'cat-1' },
        ],
      },
    };
    mockEditor.store.idIndex['shape_1'] = memoryShapeA;
    mockEditor.doc = {
      customData: {
        votingConfig: { enabled: true, maxVotesPerUser: 5 },
      },
    };

    const bindingA = new YjsDgmBinding(mockEditor, yDoc);
    bindingA.syncEditorToYjs();

    const yShapes = yDoc.getMap<any>('shapes');
    const yMeta = yDoc.getMap<any>('meta');

    expect(yShapes.get('shape_1')?.customData?.votes).toHaveLength(1);
    expect(yShapes.get('shape_1')?.customData?.votes[0].id).toBe('v-collab-1');
    expect(yMeta.get('customData')?.votingConfig?.maxVotesPerUser).toBe(5);

    // Setup client B
    let clientBDocJSON: any = null;
    const memoryShapeB: any = { id: 'shape_1', _type: 'Rectangle' };
    const mockDocB: any = { id: 'doc_1', _type: 'Doc' };
    const mockEditorB = {
      doc: mockDocB,
      saveToJSON: () => JSON.parse(JSON.stringify(clientBDocJSON)),
      loadFromJSON: (json: any) => {
        clientBDocJSON = JSON.parse(JSON.stringify(json));
      },
      repaint: vi.fn(),
      selection: { getShapes: () => [], select: vi.fn() },
      transform: {
        onTransaction: { addListener: vi.fn() },
        onAction: { addListener: vi.fn() },
        onUndo: { addListener: vi.fn() },
        onRedo: { addListener: vi.fn() },
      },
      store: {
        idIndex: {
          shape_1: memoryShapeB,
        },
      },
    };

    const docB = new Y.Doc();
    const bindingB = new YjsDgmBinding(mockEditorB as any, docB);

    Y.applyUpdate(docB, Y.encodeStateAsUpdate(yDoc));

    expect(memoryShapeB.customData?.votes).toEqual([
      expect.objectContaining({ id: 'v-collab-1', userName: 'User A' }),
    ]);
    expect(mockDocB.customData?.votingConfig?.maxVotesPerUser).toBe(5);

    bindingA.destroy();
    bindingB.destroy();
    docB.destroy();
  });

  it('synchronizes multi-page document hierarchy and per-page shapes across collaborative clients', () => {
    currentDocJSON = {
      _type: 'Doc',
      id: 'multi_doc_1',
      version: 1,
      activePageId: 'page_2',
      children: [
        {
          _type: 'Page',
          id: 'page_1',
          name: 'Architecture Overview',
          children: [
            { _type: 'Rectangle', id: 's1', origin: [0, 0] },
          ],
        },
        {
          _type: 'Page',
          id: 'page_2',
          name: 'Database Schema',
          children: [
            { _type: 'Ellipse', id: 's2', origin: [50, 50] },
          ],
        },
      ],
    };

    const bindingA = new YjsDgmBinding(mockEditor, yDoc);
    bindingA.syncEditorToYjs();

    const yPages = yDoc.getArray<any>('pages');
    const yShapes = yDoc.getMap<any>('shapes');
    const yMeta = yDoc.getMap<any>('meta');

    expect(yPages.length).toBe(2);
    expect(yPages.get(0).id).toBe('page_1');
    expect(yPages.get(0).name).toBe('Architecture Overview');
    expect(yPages.get(1).id).toBe('page_2');
    expect(yPages.get(1).name).toBe('Database Schema');
    expect(yShapes.size).toBe(2);
    expect(yMeta.get('activePageId')).toBe('page_2');

    // Setup client B
    let clientBDocJSON: any = null;
    const mockEditorB = {
      saveToJSON: () => JSON.parse(JSON.stringify(clientBDocJSON)),
      loadFromJSON: (json: any) => {
        clientBDocJSON = JSON.parse(JSON.stringify(json));
      },
      repaint: vi.fn(),
      selection: { getShapes: () => [], select: vi.fn() },
      transform: {
        onTransaction: { addListener: vi.fn() },
        onAction: { addListener: vi.fn() },
        onUndo: { addListener: vi.fn() },
        onRedo: { addListener: vi.fn() },
      },
      store: { idIndex: {} },
    };

    const docB = new Y.Doc();
    const bindingB = new YjsDgmBinding(mockEditorB as any, docB);

    Y.applyUpdate(docB, Y.encodeStateAsUpdate(yDoc));

    expect(clientBDocJSON.children).toHaveLength(2);
    expect(clientBDocJSON.children[0].id).toBe('page_1');
    expect(clientBDocJSON.children[0].name).toBe('Architecture Overview');
    expect(clientBDocJSON.children[0].children[0].id).toBe('s1');
    expect(clientBDocJSON.children[1].id).toBe('page_2');
    expect(clientBDocJSON.children[1].name).toBe('Database Schema');
    expect(clientBDocJSON.children[1].children[0].id).toBe('s2');

    bindingA.destroy();
    bindingB.destroy();
    docB.destroy();
  });

  it('immediately propagates page creation, renaming, and reordering to peer clients and triggers callback', () => {
    // Client A setup
    const docA = new Y.Doc();
    let clientADocJSON: any = {
      _type: 'Doc',
      id: 'doc_1',
      version: 1,
      children: [
        {
          _type: 'Page',
          id: 'page_1',
          name: 'Initial Page',
          children: [{ _type: 'Rectangle', id: 's1' }],
        },
      ],
    };

    const mockEditorA: any = {
      saveToJSON: () => JSON.parse(JSON.stringify(clientADocJSON)),
      loadFromJSON: (json: any) => {
        clientADocJSON = JSON.parse(JSON.stringify(json));
      },
      repaint: vi.fn(),
      selection: { getShapes: () => [], select: vi.fn() },
      store: { idIndex: {} },
      transform: {
        onTransaction: { addListener: vi.fn() },
        onAction: { addListener: vi.fn() },
        onUndo: { addListener: vi.fn() },
        onRedo: { addListener: vi.fn() },
      },
    };

    const onRemoteUpdateA = vi.fn();
    const bindingA = new YjsDgmBinding(mockEditorA, docA, onRemoteUpdateA);

    // Client B setup
    const docB = new Y.Doc();
    let clientBDocJSON: any = null;
    const mockEditorB: any = {
      saveToJSON: () => JSON.parse(JSON.stringify(clientBDocJSON)),
      loadFromJSON: (json: any) => {
        clientBDocJSON = JSON.parse(JSON.stringify(json));
      },
      repaint: vi.fn(),
      selection: { getShapes: () => [], select: vi.fn() },
      store: { idIndex: {} },
      transform: {
        onTransaction: { addListener: vi.fn() },
        onAction: { addListener: vi.fn() },
        onUndo: { addListener: vi.fn() },
        onRedo: { addListener: vi.fn() },
      },
    };

    const onRemoteUpdateB = vi.fn();
    const bindingB = new YjsDgmBinding(mockEditorB, docB, onRemoteUpdateB);

    // Initial sync from A to B
    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));
    expect(onRemoteUpdateB).toHaveBeenCalledTimes(1);
    expect(clientBDocJSON.children).toHaveLength(1);
    expect(clientBDocJSON.children[0].name).toBe('Initial Page');

    // 1. Client A adds a new page "Sprint Backlog"
    clientADocJSON.children.push({
      _type: 'Page',
      id: 'page_2',
      name: 'Sprint Backlog',
      children: [{ _type: 'Rectangle', id: 's2' }],
    });
    bindingA.syncEditorToYjs();

    // Broadcast update from A to B
    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));
    expect(onRemoteUpdateB).toHaveBeenCalledTimes(2);
    expect(clientBDocJSON.children).toHaveLength(2);
    expect(clientBDocJSON.children[1].id).toBe('page_2');
    expect(clientBDocJSON.children[1].name).toBe('Sprint Backlog');

    // 2. Client A renames "Initial Page" to "Icebreaker & Agenda"
    clientADocJSON.children[0].name = 'Icebreaker & Agenda';
    bindingA.syncEditorToYjs();

    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));
    expect(onRemoteUpdateB).toHaveBeenCalledTimes(3);
    expect(clientBDocJSON.children[0].name).toBe('Icebreaker & Agenda');

    // 3. Client A reorders pages (swaps page_2 to be first)
    const [first, second] = clientADocJSON.children;
    clientADocJSON.children = [second, first];
    bindingA.syncEditorToYjs();

    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));
    expect(onRemoteUpdateB).toHaveBeenCalledTimes(4);
    expect(clientBDocJSON.children[0].id).toBe('page_2');
    expect(clientBDocJSON.children[1].id).toBe('page_1');

    // 4. Client A deletes page_2
    clientADocJSON.children = [clientADocJSON.children[1]];
    bindingA.syncEditorToYjs();

    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));
    expect(onRemoteUpdateB).toHaveBeenCalledTimes(5);
    expect(clientBDocJSON.children).toHaveLength(1);
    expect(clientBDocJSON.children[0].id).toBe('page_1');

    bindingA.destroy();
    bindingB.destroy();
    docA.destroy();
    docB.destroy();
  });

  it('triggers onRemoteUpdateCallback on initial binding construction when Yjs document already has pages', () => {
    const doc = new Y.Doc();
    const yPages = doc.getArray<any>('pages');
    yPages.push([
      { id: 'page_init_1', name: 'Page 1', _type: 'Page', shapeOrder: [] },
      { id: 'page_init_2', name: 'Page 2', _type: 'Page', shapeOrder: [] },
    ]);

    let loadedJSON: any = null;
    const mockEditor = {
      saveToJSON: () => loadedJSON,
      loadFromJSON: (json: any) => {
        loadedJSON = json;
      },
      repaint: vi.fn(),
      selection: { getShapes: () => [], select: vi.fn() },
      store: { idIndex: {} },
      transform: {
        onTransaction: { addListener: vi.fn() },
        onAction: { addListener: vi.fn() },
        onUndo: { addListener: vi.fn() },
        onRedo: { addListener: vi.fn() },
      },
    };

    const onRemoteUpdate = vi.fn();
    const binding = new YjsDgmBinding(mockEditor as any, doc, onRemoteUpdate);

    expect(onRemoteUpdate).toHaveBeenCalledTimes(1);
    expect(loadedJSON).toBeDefined();
    expect(loadedJSON.children).toHaveLength(2);
    expect(loadedJSON.children[0].id).toBe('page_init_1');
    expect(loadedJSON.children[1].id).toBe('page_init_2');

    binding.destroy();
    doc.destroy();
  });

  it('deduplicates duplicate page entries in yPages and preserves unique page tabs', () => {
    const doc = new Y.Doc();
    const yPages = doc.getArray<any>('pages');
    // Simulate duplicate page tombstones from concurrent peers
    yPages.push([
      { id: 'page_1', name: 'Page 1', _type: 'Page', shapeOrder: [] },
      { id: 'page_2', name: 'Page 2', _type: 'Page', shapeOrder: [] },
      { id: 'page_1', name: 'Page 1 (Duplicate)', _type: 'Page', shapeOrder: [] },
      { id: 'page_2', name: 'Page 2 (Duplicate)', _type: 'Page', shapeOrder: [] },
      { id: 'page_3', name: 'Page 3', _type: 'Page', shapeOrder: [] },
    ]);

    let loadedJSON: any = null;
    const mockEditor = {
      saveToJSON: () => loadedJSON,
      loadFromJSON: (json: any) => {
        loadedJSON = json;
      },
      repaint: vi.fn(),
      selection: { getShapes: () => [], select: vi.fn() },
      store: { idIndex: {} },
      transform: {
        onTransaction: { addListener: vi.fn() },
        onAction: { addListener: vi.fn() },
        onUndo: { addListener: vi.fn() },
        onRedo: { addListener: vi.fn() },
      },
    };

    const binding = new YjsDgmBinding(mockEditor as any, doc);

    expect(loadedJSON).toBeDefined();
    expect(loadedJSON.children).toHaveLength(3);
    expect(loadedJSON.children.map((p: any) => p.id)).toEqual(['page_1', 'page_2', 'page_3']);
    expect(loadedJSON.children[0].name).toBe('Page 1');
    expect(loadedJSON.children[1].name).toBe('Page 2');
    expect(loadedJSON.children[2].name).toBe('Page 3');

    binding.destroy();
    doc.destroy();
  });

  it('preserves existing multi-page document structure during shape updates when yPages is empty', () => {
    const doc = new Y.Doc();
    const yShapes = doc.getMap<any>('shapes');

    let currentEditorDoc: any = {
      _type: 'Doc',
      id: 'doc_root',
      activePageId: 'page_2',
      children: [
        {
          _type: 'Page',
          id: 'page_1',
          name: 'Architecture Context',
          children: [{ _type: 'Rectangle', id: 's1', _pageId: 'page_1' }],
        },
        {
          _type: 'Page',
          id: 'page_2',
          name: 'Container Diagram',
          children: [{ _type: 'Rectangle', id: 's2', _pageId: 'page_2' }],
        },
      ],
    };

    let loadedJSON: any = null;
    const mockEditor = {
      saveToJSON: () => JSON.parse(JSON.stringify(currentEditorDoc)),
      loadFromJSON: (json: any) => {
        loadedJSON = json;
        currentEditorDoc = JSON.parse(JSON.stringify(json));
      },
      repaint: vi.fn(),
      selection: { getShapes: () => [], select: vi.fn() },
      store: { idIndex: {} },
      transform: {
        onTransaction: { addListener: vi.fn() },
        onAction: { addListener: vi.fn() },
        onUndo: { addListener: vi.fn() },
        onRedo: { addListener: vi.fn() },
      },
    };

    const binding = new YjsDgmBinding(mockEditor as any, doc);

    // Now a remote peer updates a shape while yPages is empty
    yShapes.set('s3', {
      _type: 'Rectangle',
      id: 's3',
      _pageId: 'page_2',
      name: 'New Container Shape',
    });

    binding.applyRemoteToEditor();

    // Multi-page document should NOT collapse into single page
    expect(loadedJSON).toBeDefined();
    expect(loadedJSON.children).toHaveLength(2);
    expect(loadedJSON.children[0].id).toBe('page_1');
    expect(loadedJSON.children[0].name).toBe('Architecture Context');
    expect(loadedJSON.children[1].id).toBe('page_2');
    expect(loadedJSON.children[1].name).toBe('Container Diagram');

    binding.destroy();
    doc.destroy();
  });
});
