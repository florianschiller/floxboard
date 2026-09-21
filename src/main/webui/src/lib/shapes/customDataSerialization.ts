import { Editor } from '@dgmjs/core';

/**
 * Serializes the editor document tree to JSON while preserving shape-level `customData`
 * (such as dot-votes) and document-level `customData` (such as voting configuration).
 */
export const serializeDocWithCustomData = (
  editor: Editor | null | undefined,
  rootCustomData?: Record<string, any>
): any => {
  if (!editor) return null;
  const anyEditor = editor as any;
  const docJson = typeof editor.saveToJSON === 'function'
    ? editor.saveToJSON()
    : (anyEditor.doc && typeof anyEditor.doc.toJSON === 'function' ? anyEditor.doc.toJSON(true) : null);

  if (!docJson) return docJson;

  const storeIdIndex = (editor.store as any)?.idIndex || {};

  // Attach root customData
  const docCustomData = {
    ...(anyEditor.doc?.customData || {}),
    ...(docJson.customData || {}),
    ...(rootCustomData || {}),
  };
  if (Object.keys(docCustomData).length > 0) {
    docJson.customData = JSON.parse(JSON.stringify(docCustomData));
  }

  // Recursively enrich each shape node with customData, script, and properties from the in-memory store
  const enrichNode = (node: any) => {
    if (!node) return;
    if (node.id) {
      const memoryObj = storeIdIndex[node.id] || (typeof anyEditor.findObj === 'function' ? anyEditor.findObj(node.id) : null);
      if (memoryObj) {
        if (memoryObj.type && memoryObj.type !== 'Shape') {
          node.type = memoryObj.type;
        }
        if (memoryObj.customData) {
          node.customData = JSON.parse(JSON.stringify(memoryObj.customData));
        }
        if (memoryObj.script !== undefined) {
          node.script = typeof memoryObj.script === 'function' ? memoryObj.script.toString() : memoryObj.script;
          node.customData = { ...(node.customData || {}), script: node.script };
        }
        if (memoryObj.defaultScript !== undefined) {
          node.defaultScript = typeof memoryObj.defaultScript === 'function' ? memoryObj.defaultScript.toString() : memoryObj.defaultScript;
          node.customData = { ...(node.customData || {}), defaultScript: node.defaultScript };
        }
        if (memoryObj.properties !== undefined) {
          try {
            node.properties = JSON.parse(JSON.stringify(memoryObj.properties));
          } catch {
            node.properties = { ...memoryObj.properties };
          }
          node.customData = { ...(node.customData || {}), properties: node.properties };
        }
      }
    }
    if (Array.isArray(node.children)) {
      node.children.forEach(enrichNode);
    }
  };

  enrichNode(docJson);
  return docJson;
};

/**
 * Restores shape-level and document-level `customData`, `script`, and `properties` onto in-memory DGM objects
 * following an `editor.loadFromJSON` or remote JSON payload load.
 */
export const restoreDocCustomData = (
  editor: Editor | null | undefined,
  content: any
): void => {
  if (!editor || !content) return;
  const anyEditor = editor as any;

  // Restore doc-level customData
  if (content.customData && anyEditor.doc) {
    anyEditor.doc.customData = JSON.parse(JSON.stringify(content.customData));
  }

  const storeIdIndex = (editor.store as any)?.idIndex || {};

  const restoreNode = (node: any) => {
    if (!node) return;
    if (node.id) {
      const memoryObj = storeIdIndex[node.id] || (typeof anyEditor.findObj === 'function' ? anyEditor.findObj(node.id) : null);
      if (memoryObj) {
        if (node.type && node.type !== 'Shape') {
          memoryObj.type = node.type;
        }
        if (node.customData) {
          memoryObj.customData = JSON.parse(JSON.stringify(node.customData));
        }
        if (node.script !== undefined || node.customData?.script !== undefined) {
          memoryObj.script = node.script ?? node.customData?.script;
          memoryObj.customData = { ...(memoryObj.customData || {}), script: memoryObj.script };
        }
        if (node.defaultScript !== undefined || node.customData?.defaultScript !== undefined) {
          memoryObj.defaultScript = node.defaultScript ?? node.customData?.defaultScript;
          memoryObj.customData = { ...(memoryObj.customData || {}), defaultScript: memoryObj.defaultScript };
        }
        if (node.properties || node.customData?.properties) {
          try {
            memoryObj.properties = JSON.parse(JSON.stringify(node.properties || node.customData?.properties));
          } catch {
            memoryObj.properties = { ...(node.properties || node.customData?.properties) };
          }
          memoryObj.customData = { ...(memoryObj.customData || {}), properties: memoryObj.properties };
        }
      }
    }
    if (Array.isArray(node.children)) {
      node.children.forEach(restoreNode);
    }
  };

  restoreNode(content);
};

/**
 * Normalizes an array of shapes into relative coordinates based on the selection's top-left origin.
 */
export const serializeShapesToStencil = (
  shapes: any[]
): { shapesJson: string; width: number; height: number; shapes: any[] } => {
  if (!shapes || shapes.length === 0) {
    return { shapesJson: '[]', width: 0, height: 0, shapes: [] };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  shapes.forEach((s) => {
    const left = s.left ?? (s.rect ? Math.min(s.rect[0][0], s.rect[1][0]) : 0);
    const top = s.top ?? (s.rect ? Math.min(s.rect[0][1], s.rect[1][1]) : 0);
    const w = s.width ?? (s.rect ? Math.abs(s.rect[1][0] - s.rect[0][0]) : 100);
    const h = s.height ?? (s.rect ? Math.abs(s.rect[1][1] - s.rect[0][1]) : 60);

    minX = Math.min(minX, left);
    minY = Math.min(minY, top);
    maxX = Math.max(maxX, left + w);
    maxY = Math.max(maxY, top + h);
  });

  if (!isFinite(minX)) minX = 0;
  if (!isFinite(minY)) minY = 0;
  if (!isFinite(maxX)) maxX = 100;
  if (!isFinite(maxY)) maxY = 60;

  const width = Math.max(10, maxX - minX);
  const height = Math.max(10, maxY - minY);

  const normalizedShapes = shapes.map((s) => {
    let raw: any;
    try {
      raw = typeof s.toJSON === 'function' ? s.toJSON(true) : JSON.parse(JSON.stringify(s));
    } catch {
      raw = { ...s };
    }

    // Capture and preserve script, properties, and custom draw parameters if not in raw
    if (s.script !== undefined && raw.script === undefined) {
      raw.script = typeof s.script === 'function' ? s.script.toString() : s.script;
    } else if (typeof raw.script === 'function') {
      raw.script = raw.script.toString();
    }
    if (s.defaultScript !== undefined && raw.defaultScript === undefined) {
      raw.defaultScript = typeof s.defaultScript === 'function' ? s.defaultScript.toString() : s.defaultScript;
    } else if (typeof raw.defaultScript === 'function') {
      raw.defaultScript = raw.defaultScript.toString();
    }
    if (s.properties !== undefined && raw.properties === undefined) {
      try {
        raw.properties = JSON.parse(JSON.stringify(s.properties));
      } catch {
        raw.properties = { ...s.properties };
      }
    }
    if (s.customData !== undefined && raw.customData === undefined) {
      try {
        raw.customData = JSON.parse(JSON.stringify(s.customData));
      } catch {
        raw.customData = { ...s.customData };
      }
    }
    if (s.fillColor !== undefined && raw.fillColor === undefined) raw.fillColor = s.fillColor;
    if (s.strokeColor !== undefined && raw.strokeColor === undefined) raw.strokeColor = s.strokeColor;
    if (s.strokeWidth !== undefined && raw.strokeWidth === undefined) raw.strokeWidth = s.strokeWidth;
    if (s.text !== undefined && raw.text === undefined) raw.text = s.text;
    if (s.fontColor !== undefined && raw.fontColor === undefined) raw.fontColor = s.fontColor;
    if (s.fontSize !== undefined && raw.fontSize === undefined) raw.fontSize = s.fontSize;
    if (s.fontFamily !== undefined && raw.fontFamily === undefined) raw.fontFamily = s.fontFamily;

    const left = raw.left ?? (raw.rect ? Math.min(raw.rect[0][0], raw.rect[1][0]) : (s.left ?? (s.rect ? Math.min(s.rect[0][0], s.rect[1][0]) : 0)));
    const top = raw.top ?? (raw.rect ? Math.min(raw.rect[0][1], raw.rect[1][1]) : (s.top ?? (s.rect ? Math.min(s.rect[0][1], s.rect[1][1]) : 0)));
    const w = raw.width ?? (raw.rect ? Math.abs(raw.rect[1][0] - raw.rect[0][0]) : (s.width ?? 100));
    const h = raw.height ?? (raw.rect ? Math.abs(raw.rect[1][1] - raw.rect[0][1]) : (s.height ?? 60));

    const relLeft = left - minX;
    const relTop = top - minY;

    return {
      ...raw,
      left: relLeft,
      top: relTop,
      width: w,
      height: h,
      rect: raw.rect ? [
        [relLeft, relTop],
        [relLeft + w, relTop + h],
      ] : undefined,
    };
  });

  return {
    shapesJson: JSON.stringify(normalizedShapes),
    width,
    height,
    shapes: normalizedShapes,
  };
};

/**
 * Instantiates a stencil's shapes at a target global canvas coordinate, remapping IDs to fresh UUIDs.
 */
export const instantiateStencilShapes = (
  stencilShapes: any[],
  targetX: number,
  targetY: number
): any[] => {
  if (!stencilShapes || !Array.isArray(stencilShapes) || stencilShapes.length === 0) {
    return [];
  }

  const idMap: Record<string, string> = {};
  stencilShapes.forEach((s) => {
    if (s.id) {
      idMap[s.id] = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `shape-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }
  });

  return stencilShapes.map((s) => {
    let clone: any;
    try {
      clone = JSON.parse(JSON.stringify(s));
    } catch {
      clone = { ...s };
    }

    // Preserve execution scripts (functions or strings), default scripts, properties, and custom data
    if (s.script !== undefined && clone.script === undefined) {
      clone.script = s.script;
    }
    if (s.defaultScript !== undefined && clone.defaultScript === undefined) {
      clone.defaultScript = s.defaultScript;
    }
    if (s.properties !== undefined && clone.properties === undefined) {
      try {
        clone.properties = JSON.parse(JSON.stringify(s.properties));
      } catch {
        clone.properties = { ...s.properties };
      }
    }
    if (s.customData !== undefined && clone.customData === undefined) {
      try {
        clone.customData = JSON.parse(JSON.stringify(s.customData));
      } catch {
        clone.customData = { ...s.customData };
      }
    }

    const newId = (s.id && idMap[s.id])
      ? idMap[s.id]
      : ((typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `shape-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    const relLeft = clone.left ?? (clone.rect ? Math.min(clone.rect[0][0], clone.rect[1][0]) : 0);
    const relTop = clone.top ?? (clone.rect ? Math.min(clone.rect[0][1], clone.rect[1][1]) : 0);
    const w = clone.width ?? (clone.rect ? Math.abs(clone.rect[1][0] - clone.rect[0][0]) : 100);
    const h = clone.height ?? (clone.rect ? Math.abs(clone.rect[1][1] - clone.rect[0][1]) : 60);

    const posX = targetX + relLeft;
    const posY = targetY + relTop;

    const result: any = {
      ...clone,
      id: newId,
      left: posX,
      top: posY,
      width: w,
      height: h,
    };

    if (clone.rect) {
      result.rect = [
        [posX, posY],
        [posX + w, posY + h],
      ];
    }

    if (clone.tail && idMap[clone.tail]) {
      result.tail = idMap[clone.tail];
    }
    if (clone.head && idMap[clone.head]) {
      result.head = idMap[clone.head];
    }

    return result;
  });
};
