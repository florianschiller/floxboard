import { describe, it, expect } from 'vitest';
import { PREBUILT_STENCIL_COLLECTIONS, DRAW_SCRIPTS } from './prebuiltStencils';
import { instantiateStencilShapes } from './shapeUtils';
import { StencilItem } from '../types/shapeLibrary';

describe('Prebuilt Agile Stencils as Frames with Starter Items', () => {
  const agileCollection = PREBUILT_STENCIL_COLLECTIONS.find(
    (c) => c.id === 'prebuilt-agile-sprint'
  );

  it('contains the agile collection with all adapted retrospective and kanban stencils', () => {
    expect(agileCollection).toBeDefined();
    const stencilIds = agileCollection!.stencils.map((s) => s.id);
    expect(stencilIds).toContain('agile-retro-columns');
    expect(stencilIds).toContain('agile-mad-sad-glad');
    expect(stencilIds).toContain('agile-sailboat-retro');
    expect(stencilIds).toContain('agile-kanban-board');
  });

  describe('Sprint Retrospective Columns (agile-retro-columns)', () => {
    const stencil = agileCollection!.stencils.find(
      (s) => s.id === 'agile-retro-columns'
    ) as StencilItem;

    it('has expanded overall dimensions of 870x580', () => {
      expect(stencil.width).toBe(870);
      expect(stencil.height).toBe(580);
    });

    it('has 3 Frame columns with expanded 270x580 dimensions, expected titles and styling', () => {
      const frames = stencil.shapes.filter((s) => s.type === 'Frame');
      expect(frames).toHaveLength(3);

      expect(frames[0].name).toBe('🟢 What Went Well');
      expect(frames[0].title).toBe('🟢 What Went Well');
      expect(frames[0].width).toBe(270);
      expect(frames[0].height).toBe(580);

      expect(frames[1].name).toBe('🔴 To Improve');
      expect(frames[1].title).toBe('🔴 To Improve');
      expect(frames[1].width).toBe(270);
      expect(frames[1].height).toBe(580);

      expect(frames[2].name).toBe('🔵 Action Items');
      expect(frames[2].title).toBe('🔵 Action Items');
      expect(frames[2].width).toBe(270);
      expect(frames[2].height).toBe(580);
    });

    it('contains starter sticky note rectangles (230x85) nested strictly inside each frame column bounds with >=55px top clearance', () => {
      const frames = stencil.shapes.filter((s) => s.type === 'Frame');
      const rectangles = stencil.shapes.filter((s) => s.type === 'Rectangle');
      expect(rectangles).toHaveLength(6);

      frames.forEach((frame) => {
        const frameNotes = rectangles.filter(
          (r) =>
            r.left >= frame.left &&
            r.top >= frame.top &&
            r.left + r.width <= frame.left + frame.width &&
            r.top + r.height <= frame.top + frame.height
        );
        expect(frameNotes.length).toBeGreaterThanOrEqual(2);
        frameNotes.forEach((note) => {
          expect(note.top - frame.top).toBeGreaterThanOrEqual(55);
          expect(note.width).toBe(230);
          expect(note.height).toBe(85);
          expect(note.text).toBeTruthy();
          expect(note.text).toContain('\n');
          expect(note.customData?.fontSize).toBe(12);
          expect(note.fillColor).toBeTruthy();
          expect(note.strokeColor).toBeTruthy();
        });
      });
    });
  });

  describe('Mad / Sad / Glad Retro (agile-mad-sad-glad)', () => {
    const stencil = agileCollection!.stencils.find(
      (s) => s.id === 'agile-mad-sad-glad'
    ) as StencilItem;

    it('has expanded overall dimensions of 870x580', () => {
      expect(stencil.width).toBe(870);
      expect(stencil.height).toBe(580);
    });

    it('has 3 Frame columns with expanded 270x580 dimensions, expected titles and styling', () => {
      const frames = stencil.shapes.filter((s) => s.type === 'Frame');
      expect(frames).toHaveLength(3);

      expect(frames[0].name).toBe('😡 MAD');
      expect(frames[0].title).toBe('😡 MAD');
      expect(frames[0].width).toBe(270);
      expect(frames[0].height).toBe(580);

      expect(frames[1].name).toBe('😢 SAD');
      expect(frames[1].title).toBe('😢 SAD');
      expect(frames[1].width).toBe(270);
      expect(frames[1].height).toBe(580);

      expect(frames[2].name).toBe('😄 GLAD');
      expect(frames[2].title).toBe('😄 GLAD');
      expect(frames[2].width).toBe(270);
      expect(frames[2].height).toBe(580);
    });

    it('contains emotional reflection sticky notes (230x85) positioned inside each frame column bounds with >=55px top clearance', () => {
      const frames = stencil.shapes.filter((s) => s.type === 'Frame');
      const rectangles = stencil.shapes.filter((s) => s.type === 'Rectangle');
      expect(rectangles).toHaveLength(6);

      frames.forEach((frame) => {
        const frameNotes = rectangles.filter(
          (r) =>
            r.left >= frame.left &&
            r.top >= frame.top &&
            r.left + r.width <= frame.left + frame.width &&
            r.top + r.height <= frame.top + frame.height
        );
        expect(frameNotes.length).toBeGreaterThanOrEqual(2);
        frameNotes.forEach((note) => {
          expect(note.top - frame.top).toBeGreaterThanOrEqual(55);
          expect(note.width).toBe(230);
          expect(note.height).toBe(85);
          expect(note.text).toContain('\n');
          expect(note.customData?.fontSize).toBe(12);
        });
      });
    });
  });

  describe('Sailboat Retrospective (agile-sailboat-retro)', () => {
    const stencil = agileCollection!.stencils.find(
      (s) => s.id === 'agile-sailboat-retro'
    ) as StencilItem;

    it('has expanded overall dimensions of 800x600', () => {
      expect(stencil.width).toBe(800);
      expect(stencil.height).toBe(600);
    });

    it('has 4 Frame quadrants (380x280) arranged in a 2x2 grid', () => {
      const frames = stencil.shapes.filter((s) => s.type === 'Frame');
      expect(frames).toHaveLength(4);

      const names = frames.map((f) => f.name);
      expect(names).toContain('💨 Wind / Propellers');
      expect(names).toContain('🏝️ Destination / Goals');
      expect(names).toContain('⚓ Anchors');
      expect(names).toContain('🪨 Rocks / Risks');

      frames.forEach((frame) => {
        expect(frame.width).toBe(380);
        expect(frame.height).toBe(280);
      });

      // Check 2x2 layout positioning
      const topLeft = frames.find((f) => f.name.includes('Wind'));
      const topRight = frames.find((f) => f.name.includes('Destination'));
      const bottomLeft = frames.find((f) => f.name.includes('Anchors'));
      const bottomRight = frames.find((f) => f.name.includes('Rocks'));

      expect(topLeft!.left).toBeLessThan(topRight!.left);
      expect(topLeft!.top).toBe(topRight!.top);
      expect(bottomLeft!.left).toBeLessThan(bottomRight!.left);
      expect(bottomLeft!.top).toBe(bottomRight!.top);
      expect(topLeft!.top).toBeLessThan(bottomLeft!.top);
    });

    it('contains starter reflection sticky notes (340x70) in all 4 quadrants within bounds with >=55px top clearance', () => {
      const frames = stencil.shapes.filter((s) => s.type === 'Frame');
      const rectangles = stencil.shapes.filter((s) => s.type === 'Rectangle');
      expect(rectangles).toHaveLength(8);

      frames.forEach((frame) => {
        const frameNotes = rectangles.filter(
          (r) =>
            r.left >= frame.left &&
            r.top >= frame.top &&
            r.left + r.width <= frame.left + frame.width &&
            r.top + r.height <= frame.top + frame.height
        );
        expect(frameNotes.length).toBeGreaterThanOrEqual(2);
        frameNotes.forEach((note) => {
          expect(note.top - frame.top).toBeGreaterThanOrEqual(55);
          expect(note.width).toBe(340);
          expect(note.height).toBe(70);
          expect(note.text).toContain('\n');
          expect(note.customData?.fontSize).toBe(12);
        });
      });
    });
  });

  describe('Kanban Stages Board (agile-kanban-board)', () => {
    const stencil = agileCollection!.stencils.find(
      (s) => s.id === 'agile-kanban-board'
    ) as StencilItem;

    it('has expanded overall dimensions of 1210x600', () => {
      expect(stencil.width).toBe(1210);
      expect(stencil.height).toBe(600);
    });

    it('has 4 Frame columns (280x600) with WIP limit headers', () => {
      const frames = stencil.shapes.filter((s) => s.type === 'Frame');
      expect(frames).toHaveLength(4);

      expect(frames[0].name).toBe('📋 Backlog (∞)');
      expect(frames[0].title).toBe('📋 Backlog (∞)');
      expect(frames[0].width).toBe(280);
      expect(frames[0].height).toBe(600);

      expect(frames[1].name).toBe('⚡ In Progress [WIP: 3]');
      expect(frames[1].title).toBe('⚡ In Progress [WIP: 3]');
      expect(frames[1].width).toBe(280);
      expect(frames[1].height).toBe(600);

      expect(frames[2].name).toBe('🔍 In Review [WIP: 2]');
      expect(frames[2].title).toBe('🔍 In Review [WIP: 2]');
      expect(frames[2].width).toBe(280);
      expect(frames[2].height).toBe(600);

      expect(frames[3].name).toBe('✅ Done');
      expect(frames[3].title).toBe('✅ Done');
      expect(frames[3].width).toBe(280);
      expect(frames[3].height).toBe(600);
    });

    it('contains starter User Story Ticket custom shapes (240x160) with agile metadata positioned inside column bounds with >=55px top clearance', () => {
      const frames = stencil.shapes.filter((s) => s.type === 'Frame');
      const tickets = stencil.shapes.filter((s) => s.type === 'Custom');
      expect(tickets).toHaveLength(5);

      tickets.forEach((t) => {
        expect(t.script).toBe(DRAW_SCRIPTS.agileStoryCard);
        expect(t.width).toBe(240);
        expect(t.height).toBe(160);
        expect(t.properties).toBeDefined();
        expect(t.properties.code).toMatch(/^US-\d+$/);
        expect(t.properties.title).toBeTruthy();
        expect(t.properties.persona).toMatch(/^As an? /);
        expect(t.properties.goal).toMatch(/^I want /);
        expect(t.properties.value).toMatch(/^So that /);
        expect(t.properties.points).toMatch(/^\d+$/);
        expect(t.properties.status).toBeTruthy();
      });

      frames.forEach((frame) => {
        const columnTickets = tickets.filter(
          (t) =>
            t.left >= frame.left &&
            t.top >= frame.top &&
            t.left + t.width <= frame.left + frame.width &&
            t.top + t.height <= frame.top + frame.height
        );
        expect(columnTickets.length).toBeGreaterThanOrEqual(1);
        columnTickets.forEach((ticket) => {
          expect(ticket.top - frame.top).toBeGreaterThanOrEqual(55);
        });
      });
    });
  });

  describe('User Story Ticket Custom Renderer (DRAW_SCRIPTS.agileStoryCard)', () => {
    it('defines two-tier layout, safe text truncation helper, and boundary clipping', () => {
      expect(DRAW_SCRIPTS.agileStoryCard).toContain('drawTruncatedText');
      expect(DRAW_SCRIPTS.agileStoryCard).toContain('codeW');
      expect(DRAW_SCRIPTS.agileStoryCard).toContain('statusW');
      expect(DRAW_SCRIPTS.agileStoryCard).toContain('ctx.clip()');
    });

    it('standalone user story card stencil has updated 240x160 dimensions', () => {
      const cardStencil = agileCollection!.stencils.find((s) => s.id === 'agile-story-card');
      expect(cardStencil).toBeDefined();
      expect(cardStencil!.width).toBe(240);
      expect(cardStencil!.height).toBe(160);
    });
  });

  describe('Stencil Instantiation with Frames & Custom Children', () => {
    it('correctly shifts coordinate offsets for frames and custom story ticket shapes when instantiated', () => {
      const kanban = agileCollection!.stencils.find((s) => s.id === 'agile-kanban-board')!;
      const instantiated = instantiateStencilShapes(kanban.shapes, 500, 300);

      expect(instantiated).toHaveLength(kanban.shapes.length);

      const instantiatedFrames = instantiated.filter((s) => s.type === 'Frame');
      const instantiatedTickets = instantiated.filter((s) => s.type === 'Custom');

      expect(instantiatedFrames).toHaveLength(4);
      expect(instantiatedTickets).toHaveLength(5);

      // Verify relative spatial containment holds after global offset translation
      instantiatedFrames.forEach((frame) => {
        const columnTickets = instantiatedTickets.filter(
          (t) =>
            t.left >= frame.left &&
            t.top >= frame.top &&
            t.left + t.width <= frame.left + frame.width &&
            t.top + t.height <= frame.top + frame.height
        );
        expect(columnTickets.length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
