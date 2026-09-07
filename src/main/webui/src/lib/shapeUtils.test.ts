import { describe, it, expect } from 'vitest';
import { serializeDocWithCustomData, restoreDocCustomData } from './shapeUtils';

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
});
