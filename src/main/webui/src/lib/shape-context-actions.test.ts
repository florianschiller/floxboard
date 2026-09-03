import { describe, it, expect, vi } from 'vitest';
import { Group, Page, Doc } from '@dgmjs/core';
import {
  isShapeLocked,
  toggleShapeLock,
  rotateShapes,
  applyColorToShapes,
  applyTextStyling,
  setLineArrows,
  isGroupShape,
  isOpenLineShape,
} from './shapeUtils';

describe('Shape Context Actions & Helper Utilities', () => {
  describe('Z-Order Manipulation (bringToFront & sendToBack)', () => {
    it('reorders shapes correctly in a parent container array', () => {
      const shape1 = { id: 's1', _type: 'Box' };
      const shape2 = { id: 's2', _type: 'Oval' };
      const shape3 = { id: 's3', _type: 'Diamond' };
      const children = [shape1, shape2, shape3];

      // Send shape3 to back (move to index 0)
      const sendToBack = (arr: any[], item: any) => {
        const idx = arr.indexOf(item);
        if (idx > -1) {
          arr.splice(idx, 1);
          arr.unshift(item);
        }
      };
      sendToBack(children, shape3);
      expect(children.map((s) => s.id)).toEqual(['s3', 's1', 's2']);

      // Bring shape1 to front (move to last index)
      const bringToFront = (arr: any[], item: any) => {
        const idx = arr.indexOf(item);
        if (idx > -1) {
          arr.splice(idx, 1);
          arr.push(item);
        }
      };
      bringToFront(children, shape1);
      expect(children.map((s) => s.id)).toEqual(['s3', 's2', 's1']);
    });
  });

  describe('Color Presets (applyColorToShapes)', () => {
    it('applies stroke and fill colors to regular shapes', () => {
      const shape = {
        id: 'box1',
        _type: 'Box',
        strokeColor: '#000000',
        fillColor: '#ffffff',
        fontColor: '#000000',
      };

      applyColorToShapes([shape], '#d0021b', '#f8d7da');
      expect(shape.strokeColor).toBe('#d0021b');
      expect(shape.fillColor).toBe('#f8d7da');
      expect(shape.fontColor).toBe('#d0021b');
    });

    it('applies stroke color to lines without overriding line fill', () => {
      const line = {
        id: 'line1',
        _type: 'Line',
        path: [[0, 0], [100, 100]],
        headEndType: 'flat',
        tailEndType: 'flat',
        strokeColor: '#000000',
        fontColor: '#000000',
      };

      applyColorToShapes([line], '#007bff', '#cce5ff');
      expect(line.strokeColor).toBe('#007bff');
      expect(line.fontColor).toBe('#007bff');
      expect((line as any).fillColor).toBeUndefined();
    });

    it('applies stroke color to freehand and highlighter strokes without adding unexpected fill', () => {
      const freehand = {
        id: 'fh1',
        _type: 'Freehand',
        path: [[0, 0], [10, 10], [20, 15]],
        strokeColor: '#000000',
        strokeWidth: 2,
      };
      const highlighter = {
        id: 'hl1',
        _type: 'Highlighter',
        path: [[0, 0], [50, 0]],
        strokeColor: '#000000',
        strokeWidth: 14,
        alpha: 0.35,
      };

      applyColorToShapes([freehand, highlighter], '#ffc107', '#fff3cd');
      expect(freehand.strokeColor).toBe('#ffc107');
      expect(highlighter.strokeColor).toBe('#ffc107');
      expect((freehand as any).fillColor).toBeUndefined();
      expect((highlighter as any).fillColor).toBeUndefined();
    });

    it('applies fill and stroke color to closed line shapes such as triangles and diamonds', () => {
      const triangle = {
        id: 'tri1',
        _type: 'Line',
        path: [[50, 0], [100, 100], [0, 100], [50, 0]],
        strokeColor: '#000000',
        fillColor: '#ffffff',
        fontColor: '#000000',
      };

      const diamond = {
        id: 'dia1',
        _type: 'Line',
        path: [[50, 0], [100, 50], [50, 100], [0, 50], [50, 0]],
        strokeColor: '#000000',
        fillColor: '#ffffff',
        fontColor: '#000000',
      };

      applyColorToShapes([triangle, diamond], '#d0021b', '#f8d7da');
      expect(triangle.strokeColor).toBe('#d0021b');
      expect(triangle.fillColor).toBe('#f8d7da');
      expect(diamond.strokeColor).toBe('#d0021b');
      expect(diamond.fillColor).toBe('#f8d7da');
    });

    it('recursively applies colors to all shapes inside a group', () => {
      const child1 = { id: 'c1', _type: 'Box', strokeColor: '#000', fillColor: '#fff' };
      const child2 = { id: 'c2', _type: 'Line', strokeColor: '#000' };
      const group = {
        id: 'g1',
        _type: 'Group',
        children: [child1, child2],
        strokeColor: '#000',
      };

      applyColorToShapes([group], '#28a745', '#d4edda');
      expect(group.strokeColor).toBe('#28a745');
      expect(child1.strokeColor).toBe('#28a745');
      expect(child1.fillColor).toBe('#d4edda');
      expect(child2.strokeColor).toBe('#28a745');
    });
  });

  describe('Text Styling (applyTextStyling)', () => {
    it('toggles bold font weight (400 <-> 700)', () => {
      const shape = { id: 'text1', fontWeight: 400 };

      // Toggle to bold
      applyTextStyling([shape], 'bold');
      expect(shape.fontWeight).toBe(700);

      // Toggle back to normal
      applyTextStyling([shape], 'bold');
      expect(shape.fontWeight).toBe(400);
    });

    it('toggles italic font style (normal <-> italic)', () => {
      const shape = { id: 'text1', fontStyle: 'normal' };

      // Toggle to italic
      applyTextStyling([shape], 'italic');
      expect(shape.fontStyle).toBe('italic');

      // Toggle back to normal
      applyTextStyling([shape], 'italic');
      expect(shape.fontStyle).toBe('normal');
    });

    it('clears formatting and strips rich text doc marks', () => {
      const shape = {
        id: 'text1',
        fontWeight: 700,
        fontStyle: 'italic',
        text: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Styled Note',
                  marks: [{ type: 'bold' }, { type: 'italic' }],
                },
              ],
            },
          ],
        },
      };

      applyTextStyling([shape], 'clear');
      expect(shape.fontWeight).toBe(400);
      expect(shape.fontStyle).toBe('normal');
      expect((shape.text.content[0].content[0] as any).marks).toBeUndefined();
    });
  });

  describe('Shape Rotation (rotateShapes)', () => {
    it('rotates shape clockwise by 90 degrees and normalizes angle', () => {
      const shape = { id: 's1', rotate: 0 };
      const mockEditor = { canvas: {} };

      rotateShapes([shape], 90, false, mockEditor as any);
      expect(shape.rotate).toBe(90);

      rotateShapes([shape], 90, false, mockEditor as any);
      expect(shape.rotate).toBe(180);

      rotateShapes([shape], 90, false, mockEditor as any);
      expect(shape.rotate).toBe(270);

      rotateShapes([shape], 90, false, mockEditor as any);
      expect(shape.rotate).toBe(0);
    });

    it('rotates shape counter-clockwise by -90 degrees', () => {
      const shape = { id: 's1', rotate: 0 };
      rotateShapes([shape], -90, false);
      expect(shape.rotate).toBe(270);

      rotateShapes([shape], -90, false);
      expect(shape.rotate).toBe(180);
    });

    it('resets rotation angle to 0 degrees when setAbsolute is true', () => {
      const shape = { id: 's1', rotate: 270 };
      rotateShapes([shape], 0, true);
      expect(shape.rotate).toBe(0);
    });

    it('invokes shape.update when editor is provided', () => {
      const updateMock = vi.fn();
      const shape = { id: 's1', rotate: 0, update: updateMock };
      const mockEditor = { canvas: { scale: 1 } };

      rotateShapes([shape], 90, false, mockEditor as any);
      expect(updateMock).toHaveBeenCalledWith(mockEditor.canvas);
    });
  });

  describe('Lock / Unlock Constraints (toggleShapeLock & isShapeLocked)', () => {
    it('correctly detects locked state', () => {
      expect(isShapeLocked({ isLocked: true })).toBe(true);
      expect(isShapeLocked({ movable: 'none' })).toBe(true);
      expect(isShapeLocked({ sizable: 'none' })).toBe(true);
      expect(isShapeLocked({ rotatable: false })).toBe(true);
      expect(isShapeLocked({ movable: 'free', sizable: 'free', rotatable: true, isLocked: false })).toBe(false);
    });

    it('locks unlocked shape setting constraints to none and rotatable to false', () => {
      const shape = {
        id: 's1',
        movable: 'free',
        sizable: 'free',
        rotatable: true,
        isLocked: false,
      };

      const locked = toggleShapeLock([shape]);
      expect(locked).toBe(true);
      expect(shape.isLocked).toBe(true);
      expect(shape.movable).toBe('none');
      expect(shape.sizable).toBe('none');
      expect(shape.rotatable).toBe(false);
    });

    it('unlocks locked shape restoring free movement and rotatable', () => {
      const shape = {
        id: 's1',
        movable: 'none',
        sizable: 'none',
        rotatable: false,
        isLocked: true,
      };

      const locked = toggleShapeLock([shape]);
      expect(locked).toBe(false);
      expect(shape.isLocked).toBe(false);
      expect(shape.movable).toBe('free');
      expect(shape.sizable).toBe('free');
      expect(shape.rotatable).toBe(true);
    });

    it('propagates lock and unlock states to all nested children in groups', () => {
      const child1 = { id: 'c1', movable: 'free', sizable: 'free', rotatable: true, isLocked: false };
      const child2 = { id: 'c2', movable: 'free', sizable: 'free', rotatable: true, isLocked: false };
      const group = {
        id: 'g1',
        _type: 'Group',
        children: [child1, child2],
        movable: 'free',
        sizable: 'free',
        rotatable: true,
        isLocked: false,
      };

      toggleShapeLock([group], true);
      expect(group.isLocked).toBe(true);
      expect(group.movable).toBe('none');
      expect(child1.isLocked).toBe(true);
      expect(child1.movable).toBe('none');
      expect(child2.isLocked).toBe(true);
      expect(child2.movable).toBe('none');

      toggleShapeLock([group], false);
      expect(group.isLocked).toBe(false);
      expect(group.movable).toBe('free');
      expect(child1.isLocked).toBe(false);
      expect(child1.movable).toBe('free');
      expect(child2.isLocked).toBe(false);
      expect(child2.movable).toBe('free');
    });
  });

  describe('Line Arrow Configuration (setLineArrows)', () => {
    it('sets head and tail arrowheads independently on line shapes', () => {
      const line = {
        id: 'l1',
        _type: 'Line',
        path: [[0, 0], [100, 100]],
        headEndType: 'flat',
        tailEndType: 'flat',
      };

      // Set head arrow
      setLineArrows([line], 'head', 'arrow');
      expect(line.headEndType).toBe('arrow');
      expect(line.tailEndType).toBe('flat');

      // Set tail arrow to solid-arrow
      setLineArrows([line], 'tail', 'solid-arrow');
      expect(line.headEndType).toBe('arrow');
      expect(line.tailEndType).toBe('solid-arrow');

      // Reset head to flat
      setLineArrows([line], 'head', 'flat');
      expect(line.headEndType).toBe('flat');
      expect(line.tailEndType).toBe('solid-arrow');
    });

    it('ignores closed line shapes like triangles and diamonds', () => {
      const triangle = {
        id: 't1',
        _type: 'Line',
        path: [[50, 0], [100, 100], [0, 100], [50, 0]],
        headEndType: 'flat',
        tailEndType: 'flat',
      };
      const diamond = {
        id: 'd1',
        _type: 'Line',
        path: [[50, 0], [100, 50], [50, 100], [0, 50], [50, 0]],
        headEndType: 'flat',
        tailEndType: 'flat',
      };

      setLineArrows([triangle, diamond], 'head', 'arrow');
      expect(triangle.headEndType).toBe('flat');
      expect(diamond.headEndType).toBe('flat');
    });

    it('ignores non-line shapes without line ending properties', () => {
      const box = { id: 'b1', _type: 'Box' };
      setLineArrows([box], 'head', 'arrow');
      expect((box as any).headEndType).toBeUndefined();
    });
  });

  describe('Group Shape Detection (isGroupShape)', () => {
    it('detects live Group class instances', () => {
      const group = new Group();
      expect(isGroupShape(group)).toBe(true);
    });

    it('detects serialized group objects with _type or name', () => {
      expect(isGroupShape({ _type: 'Group' })).toBe(true);
      expect(isGroupShape({ name: 'Group' })).toBe(true);
      expect(isGroupShape({ constructor: { name: 'Group' } })).toBe(true);
    });

    it('detects composite group objects containing child arrays', () => {
      const compGroup = { id: 'g1', children: [{ id: 'c1' }, { id: 'c2' }] };
      expect(isGroupShape(compGroup)).toBe(true);
    });

    it('returns false for non-group shapes, pages, docs, or empty objects', () => {
      expect(isGroupShape(null)).toBe(false);
      expect(isGroupShape(undefined)).toBe(false);
      expect(isGroupShape({ _type: 'Box' })).toBe(false);
      expect(isGroupShape({ _type: 'Page', children: [{ id: 'c1' }] })).toBe(false);
      expect(isGroupShape(new Page())).toBe(false);
      expect(isGroupShape(new Doc())).toBe(false);
      expect(isGroupShape({ type: 'Page', name: 'Page 1', children: [{ id: 'c1' }] })).toBe(false);
      expect(isGroupShape({ type: 'Doc', children: [{ id: 'page1', type: 'Page' }] })).toBe(false);
    });
  });

  describe('Open Line Shape Discrimination (isOpenLineShape)', () => {
    it('returns true for open lines and connectors', () => {
      const openLine = { _type: 'Line', path: [[0, 0], [100, 100]] };
      const multiSegLine = { _type: 'Line', path: [[0, 0], [50, 50], [100, 100]] };
      const connector = { _type: 'Connector', headEndType: 'flat' };
      expect(isOpenLineShape(openLine)).toBe(true);
      expect(isOpenLineShape(multiSegLine)).toBe(true);
      expect(isOpenLineShape(connector)).toBe(true);
    });

    it('returns false for closed polygons such as triangles and rhombuses', () => {
      const triangle = { _type: 'Line', path: [[50, 0], [100, 100], [0, 100], [50, 0]] };
      const rhombus = { _type: 'Line', path: [[50, 0], [100, 50], [50, 100], [0, 50], [50, 0]] };
      const liveClosedLine = { _type: 'Line', isClosed: () => true, path: [[0, 0], [100, 100]] };
      expect(isOpenLineShape(triangle)).toBe(false);
      expect(isOpenLineShape(rhombus)).toBe(false);
      expect(isOpenLineShape(liveClosedLine)).toBe(false);
    });

    it('returns false for non-line shapes like boxes, ovals, and groups', () => {
      expect(isOpenLineShape({ _type: 'Box' })).toBe(false);
      expect(isOpenLineShape({ _type: 'Oval' })).toBe(false);
      expect(isOpenLineShape({ _type: 'Frame' })).toBe(false);
      expect(isOpenLineShape({ type: 'Frame' })).toBe(false);
      expect(isOpenLineShape(new Group())).toBe(false);
      expect(isOpenLineShape(null)).toBe(false);
    });
  });
});
