import * as Y from 'yjs';
import { Editor } from '@dgmjs/core';
import { ensureAllShapesCentered, serializeDocWithCustomData, restoreDocCustomData } from './shapeUtils';

export class YjsDgmBinding {
  private editor: Editor;
  private yDoc: Y.Doc;
  private yShapes: Y.Map<any>;
  private yOrder: Y.Array<string>;
  private yMeta: Y.Map<any>;
  private isApplyingRemote = false;
  private isApplyingLocal = false;
  private isPaused = false;
  private unbindHandlers: (() => void)[] = [];
  private onRemoteUpdateCallback?: () => void;

  constructor(editor: Editor, yDoc: Y.Doc, onRemoteUpdate?: () => void) {
    this.editor = editor;
    this.yDoc = yDoc;
    this.yShapes = yDoc.getMap<any>('shapes');
    this.yOrder = yDoc.getArray<string>('shapeOrder');
    this.yMeta = yDoc.getMap<any>('meta');
    this.onRemoteUpdateCallback = onRemoteUpdate;

    this.init();
  }

  private init() {
    if (this.yShapes.size > 0 || this.yOrder.length > 0 || this.yMeta.has('pageId') || this.yMeta.has('id') || this.yMeta.has('rawDoc')) {
      this.applyRemoteToEditor();
    } else {
      this.syncEditorToYjs();
    }

    const handleTransaction = () => {
      if (this.isApplyingRemote || this.isPaused) return;
      this.syncEditorToYjs();
    };

    const d1 = this.editor.transform?.onTransaction?.addListener?.(handleTransaction);
    const d2 = this.editor.transform?.onAction?.addListener?.(handleTransaction);
    const d3 = this.editor.transform?.onUndo?.addListener?.(handleTransaction);
    const d4 = this.editor.transform?.onRedo?.addListener?.(handleTransaction);

    const handleDocUpdate = (update: Uint8Array, origin: any) => {
      if (origin === 'local' || this.isApplyingLocal || this.isPaused) return;
      this.applyRemoteToEditor();
      this.onRemoteUpdateCallback?.();
    };

    this.yDoc.on('update', handleDocUpdate);

    this.unbindHandlers.push(() => {
      d1?.dispose?.();
      d2?.dispose?.();
      d3?.dispose?.();
      d4?.dispose?.();
      this.yDoc.off('update', handleDocUpdate);
    });
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
  }

  public syncEditorToYjs() {
    if (this.isApplyingRemote || this.isPaused) return;
    this.isApplyingLocal = true;
    try {
      const docJSON = serializeDocWithCustomData(this.editor);
      if (!docJSON) return;

      this.yDoc.transact(() => {
        this.yMeta.set('version', docJSON.version ?? 1);
        this.yMeta.set('_type', docJSON._type ?? 'Doc');
        this.yMeta.set('id', docJSON.id);
        if (docJSON.customData) {
          this.yMeta.set('customData', docJSON.customData);
        }

        const currentShapeIds = new Set<string>();
        const orderedShapeIds: string[] = [];

        if (Array.isArray(docJSON.children)) {
          docJSON.children.forEach((pageOrChild: any) => {
            if (pageOrChild && Array.isArray(pageOrChild.children)) {
              if (pageOrChild.id) this.yMeta.set('pageId', pageOrChild.id);
              if (pageOrChild.name) this.yMeta.set('pageName', pageOrChild.name);
              if (pageOrChild._type) this.yMeta.set('pageType', pageOrChild._type);

              // DGM standard hierarchy: Page containing shapes
              pageOrChild.children.forEach((child: any) => {
                if (child && child.id) {
                  currentShapeIds.add(child.id);
                  orderedShapeIds.push(child.id);
                  const memoryObj = (this.editor.store as any)?.idIndex?.[child.id];
                  if (memoryObj?.customData && !child.customData) {
                    child.customData = JSON.parse(JSON.stringify(memoryObj.customData));
                  }
                  if (memoryObj?.properties && !child.properties) {
                    child.properties = JSON.parse(JSON.stringify(memoryObj.properties));
                  }
                  if (memoryObj?.script !== undefined && child.script === undefined) {
                    child.script = memoryObj.script;
                  }
                  if (child.properties && (!child.customData || !child.customData.properties)) {
                    child.customData = { ...(child.customData || {}), properties: JSON.parse(JSON.stringify(child.properties)) };
                  } else if (child.customData?.properties && !child.properties) {
                    child.properties = JSON.parse(JSON.stringify(child.customData.properties));
                  }
                  if (child.script !== undefined && (!child.customData || child.customData.script === undefined)) {
                    child.customData = { ...(child.customData || {}), script: child.script };
                  } else if (child.customData?.script !== undefined && child.script === undefined) {
                    child.script = child.customData.script;
                  }
                  const existing = this.yShapes.get(child.id);
                  const serialized = JSON.stringify(child);
                  if (!existing || JSON.stringify(existing) !== serialized) {
                    this.yShapes.set(child.id, child);
                  }
                }
              });
            } else if (pageOrChild && pageOrChild.id) {
              // Direct shape child fallback
              currentShapeIds.add(pageOrChild.id);
              orderedShapeIds.push(pageOrChild.id);
              const memoryObj = (this.editor.store as any)?.idIndex?.[pageOrChild.id];
              if (memoryObj?.customData && !pageOrChild.customData) {
                pageOrChild.customData = JSON.parse(JSON.stringify(memoryObj.customData));
              }
              if (memoryObj?.properties && !pageOrChild.properties) {
                pageOrChild.properties = JSON.parse(JSON.stringify(memoryObj.properties));
              }
              if (memoryObj?.script !== undefined && pageOrChild.script === undefined) {
                pageOrChild.script = memoryObj.script;
              }
              if (pageOrChild.properties && (!pageOrChild.customData || !pageOrChild.customData.properties)) {
                pageOrChild.customData = { ...(pageOrChild.customData || {}), properties: JSON.parse(JSON.stringify(pageOrChild.properties)) };
              } else if (pageOrChild.customData?.properties && !pageOrChild.properties) {
                pageOrChild.properties = JSON.parse(JSON.stringify(pageOrChild.customData.properties));
              }
              if (pageOrChild.script !== undefined && (!pageOrChild.customData || pageOrChild.customData.script === undefined)) {
                pageOrChild.customData = { ...(pageOrChild.customData || {}), script: pageOrChild.script };
              } else if (pageOrChild.customData?.script !== undefined && pageOrChild.script === undefined) {
                pageOrChild.script = pageOrChild.customData.script;
              }
              const existing = this.yShapes.get(pageOrChild.id);
              const serialized = JSON.stringify(pageOrChild);
              if (!existing || JSON.stringify(existing) !== serialized) {
                this.yShapes.set(pageOrChild.id, pageOrChild);
              }
            }
          });
        }

        // Clean up deleted shapes
        for (const key of Array.from(this.yShapes.keys())) {
          if (!currentShapeIds.has(key)) {
            this.yShapes.delete(key);
          }
        }

        // Deduplicate orderedShapeIds to ensure clean z-index array
        const uniqueOrderedShapeIds: string[] = [];
        const seenOrderIds = new Set<string>();
        for (const id of orderedShapeIds) {
          if (!seenOrderIds.has(id)) {
            seenOrderIds.add(id);
            uniqueOrderedShapeIds.push(id);
          }
        }

        // Update shape ordering if changed
        const existingOrder = this.yOrder.toArray();
        const orderChanged =
          existingOrder.length !== uniqueOrderedShapeIds.length ||
          existingOrder.some((id, idx) => id !== uniqueOrderedShapeIds[idx]);

        if (orderChanged) {
          this.yOrder.delete(0, this.yOrder.length);
          if (uniqueOrderedShapeIds.length > 0) {
            this.yOrder.push(uniqueOrderedShapeIds);
          }
        }

        // Clean up legacy rawDoc to avoid LWW collisions
        if (this.yMeta.has('rawDoc')) {
          this.yMeta.delete('rawDoc');
        }
      }, 'local');
    } finally {
      this.isApplyingLocal = false;
    }
  }

  public applyRemoteToEditor() {
    if (this.isApplyingLocal || this.isPaused) return;
    this.isApplyingRemote = true;
    try {
      let docToLoad: any = null;

      if (this.yShapes.size > 0 || this.yOrder.length > 0 || this.yMeta.has('pageId') || this.yMeta.has('id')) {
        const orderedShapes: any[] = [];
        const seenIds = new Set<string>();

        // 1. First add shapes according to yOrder, strictly ensuring no duplicates
        const orderedIds = this.yOrder.toArray();
        orderedIds.forEach((shapeId) => {
          if (shapeId && !seenIds.has(shapeId) && this.yShapes.has(shapeId)) {
            orderedShapes.push(this.yShapes.get(shapeId));
            seenIds.add(shapeId);
          }
        });

        // 2. Append any shapes in yShapes not in yOrder (concurrent inserts)
        this.yShapes.forEach((shapeJson, shapeId) => {
          if (shapeJson && !seenIds.has(shapeId)) {
            orderedShapes.push(shapeJson);
            seenIds.add(shapeId);
          }
        });

        const pageId = this.yMeta.get('pageId') || 'page_1';
        const pageName = this.yMeta.get('pageName') || 'Page 1';
        const pageType = this.yMeta.get('pageType') || 'Page';
        const customData = this.yMeta.get('customData');

        docToLoad = {
          type: this.yMeta.get('type') || this.yMeta.get('_type') || 'Doc',
          _type: this.yMeta.get('_type') || this.yMeta.get('type') || 'Doc',
          id: this.yMeta.get('id') || 'root_doc',
          version: this.yMeta.get('version') || 1,
          ...(customData ? { customData } : {}),
          children: [
            {
              type: pageType,
              _type: pageType,
              id: pageId,
              name: pageName,
              children: orderedShapes,
            },
          ],
        };
      } else if (this.yMeta.has('rawDoc')) {
        // Fallback for legacy documents
        docToLoad = JSON.parse(JSON.stringify(this.yMeta.get('rawDoc')));
      }

      if (docToLoad) {
        const selectedShapes = this.editor.selection.getShapes();
        const selectedIds = new Set(selectedShapes.map((s) => s.id));
        const prevOrigin = this.editor.getOrigin?.()
          ? [...this.editor.getOrigin()]
          : this.editor.canvas?.origin
          ? [...this.editor.canvas.origin]
          : null;
        const prevScale = this.editor.getScale?.() ?? this.editor.canvas?.scale;

        this.editor.loadFromJSON(docToLoad);
        restoreDocCustomData(this.editor, docToLoad);
        ensureAllShapesCentered(this.editor);

        if (prevOrigin && typeof this.editor.setOrigin === 'function') {
          this.editor.setOrigin(prevOrigin[0], prevOrigin[1]);
        }
        if (prevScale !== undefined && typeof this.editor.setScale === 'function') {
          this.editor.setScale(prevScale);
        }

        if (selectedIds.size > 0) {
          const shapesToSelect = Array.from(selectedIds)
            .map((id) => this.editor.store.idIndex[id])
            .filter((s): s is any => Boolean(s) && typeof (s as any).getRectInDCS === 'function');
          if (shapesToSelect.length > 0) {
            this.editor.selection.select(shapesToSelect);
          }
        }

        this.editor.repaint();
      }
    } catch (err) {
      console.error('Error applying remote Yjs updates to DGM editor:', err);
    } finally {
      this.isApplyingRemote = false;
    }
  }

  public destroy() {
    this.unbindHandlers.forEach((fn) => fn());
    this.unbindHandlers = [];
  }
}
