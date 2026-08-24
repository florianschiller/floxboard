import * as Y from 'yjs';
import { Editor } from '@dgmjs/core';
import { ensureAllShapesCentered } from './shapeUtils';

export class YjsDgmBinding {
  private editor: Editor;
  private yDoc: Y.Doc;
  private yShapes: Y.Map<any>;
  private yMeta: Y.Map<any>;
  private isApplyingRemote = false;
  private isApplyingLocal = false;
  private unbindHandlers: (() => void)[] = [];
  private onRemoteUpdateCallback?: () => void;

  constructor(editor: Editor, yDoc: Y.Doc, onRemoteUpdate?: () => void) {
    this.editor = editor;
    this.yDoc = yDoc;
    this.yShapes = yDoc.getMap<any>('shapes');
    this.yMeta = yDoc.getMap<any>('meta');
    this.onRemoteUpdateCallback = onRemoteUpdate;

    this.init();
  }

  private init() {
    if (this.yShapes.size > 0 || this.yMeta.has('rawDoc')) {
      this.applyRemoteToEditor();
    } else {
      this.syncEditorToYjs();
    }

    const handleTransaction = () => {
      if (this.isApplyingRemote) return;
      this.syncEditorToYjs();
    };

    const d1 = this.editor.transform?.onTransaction?.addListener?.(handleTransaction);
    const d2 = this.editor.transform?.onAction?.addListener?.(handleTransaction);
    const d3 = this.editor.transform?.onUndo?.addListener?.(handleTransaction);
    const d4 = this.editor.transform?.onRedo?.addListener?.(handleTransaction);

    const handleYjsChange = (event: Y.YMapEvent<any>) => {
      if (event.transaction.origin === 'local' || this.isApplyingLocal) return;
      this.applyRemoteToEditor();
      this.onRemoteUpdateCallback?.();
    };

    const handleDocUpdate = (update: Uint8Array, origin: any) => {
      if (origin === 'local' || this.isApplyingLocal) return;
      this.applyRemoteToEditor();
      this.onRemoteUpdateCallback?.();
    };

    this.yShapes.observe(handleYjsChange);
    this.yMeta.observe(handleYjsChange);
    this.yDoc.on('update', handleDocUpdate);

    this.unbindHandlers.push(() => {
      d1?.dispose?.();
      d2?.dispose?.();
      d3?.dispose?.();
      d4?.dispose?.();
      this.yShapes.unobserve(handleYjsChange);
      this.yMeta.unobserve(handleYjsChange);
      this.yDoc.off('update', handleDocUpdate);
    });
  }

  public syncEditorToYjs() {
    if (this.isApplyingRemote) return;
    this.isApplyingLocal = true;
    try {
      const docJSON = this.editor.saveToJSON();
      if (!docJSON) return;

      this.yDoc.transact(() => {
        this.yMeta.set('version', docJSON.version ?? 1);
        this.yMeta.set('_type', docJSON._type ?? 'Doc');
        this.yMeta.set('id', docJSON.id);

        const currentShapeIds = new Set<string>();

        if (Array.isArray(docJSON.children)) {
          docJSON.children.forEach((pageOrChild: any) => {
            if (pageOrChild && Array.isArray(pageOrChild.children)) {
              // DGM standard hierarchy: Page containing shapes
              pageOrChild.children.forEach((child: any) => {
                if (child && child.id) {
                  currentShapeIds.add(child.id);
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
              const existing = this.yShapes.get(pageOrChild.id);
              const serialized = JSON.stringify(pageOrChild);
              if (!existing || JSON.stringify(existing) !== serialized) {
                this.yShapes.set(pageOrChild.id, pageOrChild);
              }
            }
          });
        }

        this.yMeta.set('rawDoc', docJSON);

        for (const key of Array.from(this.yShapes.keys())) {
          if (!currentShapeIds.has(key)) {
            this.yShapes.delete(key);
          }
        }
      }, 'local');
    } finally {
      this.isApplyingLocal = false;
    }
  }

  public applyRemoteToEditor() {
    if (this.isApplyingLocal) return;
    this.isApplyingRemote = true;
    try {
      const rawDoc = this.yMeta.get('rawDoc');
      let docToLoad: any = null;

      if (rawDoc) {
        docToLoad = JSON.parse(JSON.stringify(rawDoc));
        if (this.yShapes.size > 0 && Array.isArray(docToLoad.children) && docToLoad.children.length > 0) {
          const page = docToLoad.children[0];
          const existingChildren = Array.isArray(page?.children) ? page.children : [];
          const orderedShapes: any[] = [];
          const seenIds = new Set<string>();

          // Preserve existing order of shapes from rawDoc, updated with latest yShapes content
          existingChildren.forEach((child: any) => {
            if (child && child.id && this.yShapes.has(child.id)) {
              orderedShapes.push(this.yShapes.get(child.id));
              seenIds.add(child.id);
            }
          });

          // Append any newly added shapes from yShapes that were not in rawDoc.children
          this.yShapes.forEach((shapeJson, shapeId) => {
            if (shapeJson && !seenIds.has(shapeId)) {
              orderedShapes.push(shapeJson);
              seenIds.add(shapeId);
            }
          });

          if (page && (Array.isArray(page.children) || page._type === 'Page')) {
            page.children = orderedShapes;
          } else {
            docToLoad.children = orderedShapes;
          }
        }
      } else if (this.yShapes.size > 0) {
        const shapesFromMap: any[] = [];
        this.yShapes.forEach((shapeJson) => {
          if (shapeJson) shapesFromMap.push(shapeJson);
        });
        docToLoad = {
          type: this.yMeta.get('type') || this.yMeta.get('_type') || 'Doc',
          _type: this.yMeta.get('_type') || this.yMeta.get('type') || 'Doc',
          id: this.yMeta.get('id') || 'root_doc',
          version: this.yMeta.get('version') || 1,
          children: [
            {
              type: 'Page',
              _type: 'Page',
              id: 'page_1',
              name: 'Page 1',
              children: shapesFromMap,
            },
          ],
        };
      }

      if (docToLoad) {
        const selectedShapes = this.editor.selection.getShapes();
        const selectedIds = new Set(selectedShapes.map((s) => s.id));

        this.editor.loadFromJSON(docToLoad);
        ensureAllShapesCentered(this.editor);

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
