import React, { useEffect, useRef, useState } from 'react';
import {
  BringToFront,
  SendToBack,
  Bold,
  Italic,
  RemoveFormatting,
  RotateCw,
  RotateCcw,
  Lock,
  Unlock,
  Group as GroupIcon,
  Ungroup as UngroupIcon,
  ArrowRight,
  ArrowLeft,
  Minus,
  Sparkles,
} from 'lucide-react';
import { WHITEBOARD_COLORS } from './WhiteboardToolbar';
import { isShapeLocked, isGroupShape, isOpenLineShape } from '@/lib/shapeUtils';

export interface ShapeContextMenuProps {
  position: { x: number; y: number };
  shapes: any[];
  onBringToFront: () => void;
  onSendToBack: () => void;
  onColorChange: (color: { stroke: string; fill: string }) => void;
  onTextStyling: (style: 'bold' | 'italic' | 'clear') => void;
  onRotate: (delta: number, absolute?: boolean) => void;
  onToggleLock: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onSetLineArrow: (end: 'head' | 'tail', type: 'flat' | 'arrow' | 'solid-arrow') => void;
  onClose: () => void;
}

export function ShapeContextMenu({
  position,
  shapes,
  onBringToFront,
  onSendToBack,
  onColorChange,
  onTextStyling,
  onRotate,
  onToggleLock,
  onGroup,
  onUngroup,
  onSetLineArrow,
  onClose,
}: ShapeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  const isMultiple = shapes.length > 1;
  const isLocked = shapes.some((s) => isShapeLocked(s));
  const hasGroup = shapes.some((s) => isGroupShape(s));
  const hasLine = shapes.some((s) => isOpenLineShape(s));

  // Line endpoints state
  const lineShape = shapes.find((s) => isOpenLineShape(s));
  const currentHead = lineShape?.headEndType || 'flat';
  const currentTail = lineShape?.tailEndType || 'flat';

  // Position clamping to keep context menu within container viewport
  useEffect(() => {
    if (!menuRef.current) return;
    const menuEl = menuRef.current;
    const parentEl = menuEl.parentElement;
    if (!parentEl) return;

    const parentRect = parentEl.getBoundingClientRect();
    const menuRect = menuEl.getBoundingClientRect();

    let nextX = position.x;
    let nextY = position.y;

    if (nextX + menuRect.width > parentRect.width - 12) {
      nextX = Math.max(12, parentRect.width - menuRect.width - 12);
    }
    if (nextY + menuRect.height > parentRect.height - 12) {
      nextY = Math.max(12, parentRect.height - menuRect.height - 12);
    }

    setAdjustedPosition({ x: nextX, y: nextY });
  }, [position]);

  // Click outside and Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handlePointerDownOutside = (e: PointerEvent | MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDownOutside, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDownOutside, true);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Shape Context Menu"
      data-testid="shape-context-menu"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
      className="absolute z-50 w-60 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl p-2 text-xs text-slate-200 flex flex-col gap-1.5 select-none animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Layer Order (Z-Order) */}
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={() => {
            onBringToFront();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-slate-800 hover:text-white rounded-lg transition-colors text-left"
        >
          <BringToFront className="w-3.5 h-3.5 text-blue-400" />
          <span>Bring to Foreground</span>
        </button>
        <button
          type="button"
          onClick={() => {
            onSendToBack();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-slate-800 hover:text-white rounded-lg transition-colors text-left"
        >
          <SendToBack className="w-3.5 h-3.5 text-blue-400" />
          <span>Send to Background</span>
        </button>
      </div>

      <div className="w-full h-px bg-slate-800 my-0.5" />

      {/* 7 Color Presets */}
      <div className="px-2 py-1 flex flex-col gap-1">
        <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400">Color</span>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          {WHITEBOARD_COLORS.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => {
                onColorChange({ stroke: c.stroke, fill: c.fill });
                onClose();
              }}
              style={{ backgroundColor: c.stroke }}
              className="w-5 h-5 rounded-full hover:scale-125 transition-transform ring-1 ring-white/10 hover:ring-blue-400 focus:outline-none"
              title={c.name}
            />
          ))}
        </div>
      </div>

      <div className="w-full h-px bg-slate-800 my-0.5" />

      {/* Text Styling & Markdown Hint */}
      <div className="px-2 py-1 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400">Text Style</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onTextStyling('bold')}
              title="Toggle Bold"
              className="p-1 hover:bg-slate-800 hover:text-white rounded transition-colors"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onTextStyling('italic')}
              title="Toggle Italic"
              className="p-1 hover:bg-slate-800 hover:text-white rounded transition-colors"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onTextStyling('clear')}
              title="Clear Formatting"
              className="p-1 hover:bg-slate-800 hover:text-white rounded transition-colors"
            >
              <RemoveFormatting className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Markdown guidance hint */}
        <div className="flex items-start gap-1 px-1.5 py-1 bg-slate-800/60 rounded border border-slate-700/50 text-[10px] text-slate-400 leading-tight">
          <Sparkles className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
          <span>Markdown supported: **bold**, *italic*, `code`, # heading</span>
        </div>
      </div>

      <div className="w-full h-px bg-slate-800 my-0.5" />

      {/* Rotation */}
      <div className="px-2 py-1 flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400">Rotate</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onRotate(90)}
            title="Rotate 90° Clockwise"
            className="flex items-center gap-1 px-1.5 py-1 hover:bg-slate-800 hover:text-white rounded transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px]">+90°</span>
          </button>
          <button
            type="button"
            onClick={() => onRotate(-90)}
            title="Rotate 90° Counter-Clockwise"
            className="flex items-center gap-1 px-1.5 py-1 hover:bg-slate-800 hover:text-white rounded transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px]">-90°</span>
          </button>
          <button
            type="button"
            onClick={() => onRotate(0, true)}
            title="Reset Rotation (0°)"
            className="px-1.5 py-1 hover:bg-slate-800 hover:text-white rounded text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
          >
            0°
          </button>
        </div>
      </div>

      {/* Line Arrow Controls (conditional for line shapes) */}
      {hasLine && (
        <>
          <div className="w-full h-px bg-slate-800 my-0.5" />
          <div className="px-2 py-1 flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400">Line Arrows</span>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-slate-400">Start (Tail)</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSetLineArrow('tail', 'flat')}
                    className={`p-1 rounded transition-colors ${
                      currentTail === 'flat' ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                    title="No Arrow"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetLineArrow('tail', 'arrow')}
                    className={`p-1 rounded transition-colors ${
                      currentTail === 'arrow' || currentTail === 'solid-arrow'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                    title="Start Arrow"
                  >
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-slate-400">End (Head)</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSetLineArrow('head', 'flat')}
                    className={`p-1 rounded transition-colors ${
                      currentHead === 'flat' ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                    title="No Arrow"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetLineArrow('head', 'arrow')}
                    className={`p-1 rounded transition-colors ${
                      currentHead === 'arrow' || currentHead === 'solid-arrow'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                    title="End Arrow"
                  >
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="w-full h-px bg-slate-800 my-0.5" />

      {/* Group / Ungroup & Lock / Unlock */}
      <div className="flex flex-col gap-0.5">
        {isMultiple && (
          <button
            type="button"
            onClick={() => {
              onGroup();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-slate-800 hover:text-white rounded-lg transition-colors text-left"
          >
            <GroupIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span>Group Shapes</span>
          </button>
        )}

        {hasGroup && (
          <button
            type="button"
            onClick={() => {
              onUngroup();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-slate-800 hover:text-white rounded-lg transition-colors text-left"
          >
            <UngroupIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span>Ungroup</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            onToggleLock();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-slate-800 hover:text-white rounded-lg transition-colors text-left"
        >
          {isLocked ? (
            <>
              <Unlock className="w-3.5 h-3.5 text-amber-400" />
              <span>Unlock Shape{shapes.length > 1 ? 's' : ''}</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Lock Shape{shapes.length > 1 ? 's' : ''}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
