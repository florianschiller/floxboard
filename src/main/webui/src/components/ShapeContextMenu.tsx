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
  ThumbsUp,
  X,
  BookmarkPlus,
  Sliders,
  Trash2,
  Code,
} from 'lucide-react';
import { WHITEBOARD_COLORS } from './WhiteboardToolbar';
import { isShapeLocked, isGroupShape, isOpenLineShape } from '@/lib/shapeUtils';
import { WhiteboardVotingConfig, ShapeVote } from '@/types/voting';

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
  onEditProperties?: () => void;
  onEditScript?: () => void;
  onSaveAsStencil?: () => void;
  onDelete?: () => void;
  votingConfig?: WhiteboardVotingConfig;
  onVote?: (shapeId: string, categoryId?: string) => void;
  onRemoveVote?: (shapeId: string, voteId: string) => void;
  currentUserId?: string;
  userVotesUsed?: number;
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
  onEditProperties,
  onEditScript,
  onSaveAsStencil,
  onDelete,
  votingConfig,
  onVote,
  onRemoveVote,
  currentUserId,
  userVotesUsed = 0,
  onClose,
}: ShapeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  const isMultiple = shapes.length > 1;
  const isLocked = shapes.some((s) => isShapeLocked(s));
  const hasGroup = shapes.some((s) => isGroupShape(s));
  const hasLine = shapes.some((s) => isOpenLineShape(s));
  const hasScriptOrProperties = shapes.some((s) => s && (s.script || s.properties || s.customData?.script || s.customData?.properties));

  // Line endpoints state
  const lineShape = shapes.find((s) => isOpenLineShape(s));
  const currentHead = lineShape?.headEndType || 'flat';
  const currentTail = lineShape?.tailEndType || 'flat';

  // Voting calculations
  const isVotingEnabled = votingConfig !== undefined && votingConfig?.enabled !== false;
  const primaryShape = shapes[0];
  const shapeVotes: ShapeVote[] = Array.isArray(primaryShape?.customData?.votes)
    ? primaryShape.customData.votes
    : [];
  const userVotesOnShape = currentUserId
    ? shapeVotes.filter((v) => v.userId === currentUserId)
    : [];
  const isVotingLocked = Boolean(votingConfig?.isLocked);
  const isQuotaExhausted = Boolean(
    votingConfig && userVotesUsed >= votingConfig.maxVotesPerUser
  );
  const isDuplicateDisallowed = Boolean(
    votingConfig?.allowDuplicateVotes === false && userVotesOnShape.length > 0
  );

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
  }, [position, votingConfig]);

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
      className="absolute z-50 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-xl p-2 text-xs text-slate-800 flex flex-row items-stretch select-none animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Left Column: Shape Tools */}
      <div className="w-60 flex flex-col gap-1.5 shrink-0">
        {/* Layer Order (Z-Order) */}
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => {
              onBringToFront();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-lg transition-colors text-left cursor-pointer"
          >
            <BringToFront className="w-3.5 h-3.5 text-indigo-600" />
            <span>Bring to Foreground</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onSendToBack();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-lg transition-colors text-left cursor-pointer"
          >
            <SendToBack className="w-3.5 h-3.5 text-indigo-600" />
            <span>Send to Background</span>
          </button>
        </div>

        <div className="w-full h-px bg-slate-100 my-0.5" />

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
                className="w-5 h-5 rounded-full hover:scale-125 transition-transform ring-1 ring-slate-200 hover:ring-indigo-500 focus:outline-none cursor-pointer"
                title={c.name}
              />
            ))}
          </div>
        </div>

        <div className="w-full h-px bg-slate-100 my-0.5" />

        {/* Text Styling & Markdown Hint */}
        <div className="px-2 py-1 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400">Text Style</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onTextStyling('bold')}
                title="Toggle Bold"
                className="p-1 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded transition-colors cursor-pointer"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onTextStyling('italic')}
                title="Toggle Italic"
                className="p-1 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded transition-colors cursor-pointer"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onTextStyling('clear')}
                title="Clear Formatting"
                className="p-1 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded transition-colors cursor-pointer"
              >
                <RemoveFormatting className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Markdown guidance hint */}
          <div className="flex items-start gap-1 px-1.5 py-1 bg-slate-50 rounded border border-slate-200 text-[10px] text-slate-500 leading-tight">
            <Sparkles className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
            <span>Markdown supported: **bold**, *italic*, `code`, # heading</span>
          </div>
        </div>

        <div className="w-full h-px bg-slate-100 my-0.5" />

        {/* Rotation */}
        <div className="px-2 py-1 flex items-center justify-between">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400">Rotate</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onRotate(90)}
              title="Rotate 90° Clockwise"
              className="flex items-center gap-1 px-1.5 py-1 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[10px]">+90°</span>
            </button>
            <button
              type="button"
              onClick={() => onRotate(-90)}
              title="Rotate 90° Counter-Clockwise"
              className="flex items-center gap-1 px-1.5 py-1 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[10px]">-90°</span>
            </button>
            <button
              type="button"
              onClick={() => onRotate(0, true)}
              title="Reset Rotation (0°)"
              className="px-1.5 py-1 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded text-[10px] transition-colors cursor-pointer"
            >
              0°
            </button>
          </div>
        </div>

        {/* Line Arrow Controls (conditional for line shapes) */}
        {hasLine && (
          <>
            <div className="w-full h-px bg-slate-100 my-0.5" />
            <div className="px-2 py-1 flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400">Line Arrows</span>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-slate-400">Start (Tail)</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onSetLineArrow('tail', 'flat')}
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        currentTail === 'flat' ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                      title="No Arrow"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetLineArrow('tail', 'arrow')}
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        currentTail === 'arrow' || currentTail === 'solid-arrow'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
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
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        currentHead === 'flat' ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                      title="No Arrow"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetLineArrow('head', 'arrow')}
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        currentHead === 'arrow' || currentHead === 'solid-arrow'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
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

        <div className="w-full h-px bg-slate-100 my-0.5" />

        {/* Group / Ungroup & Lock / Unlock */}
        <div className="flex flex-col gap-0.5">
          {isMultiple && (
            <button
              type="button"
              onClick={() => {
                onGroup();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-lg transition-colors text-left cursor-pointer"
            >
              <GroupIcon className="w-3.5 h-3.5 text-indigo-600" />
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
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-lg transition-colors text-left cursor-pointer"
            >
              <UngroupIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span>Ungroup</span>
            </button>
          )}

          {onEditProperties && (
            <button
              type="button"
              onClick={() => {
                onEditProperties();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-lg transition-colors text-left cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              <span>Edit Content / Properties</span>
            </button>
          )}

          {onEditScript && (
            <button
              type="button"
              onClick={() => {
                onEditScript();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-lg transition-colors text-left cursor-pointer"
            >
              <Code className="w-3.5 h-3.5 text-indigo-600" />
              <span>Customize Shape (Script, Props & Style)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onToggleLock();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-lg transition-colors text-left cursor-pointer"
          >
            {isLocked ? (
              <>
                <Unlock className="w-3.5 h-3.5 text-amber-600" />
                <span>Unlock Shape{shapes.length > 1 ? 's' : ''}</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Lock Shape{shapes.length > 1 ? 's' : ''}</span>
              </>
            )}
          </button>

          {onSaveAsStencil && (
            <button
              type="button"
              onClick={() => {
                onSaveAsStencil();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-lg transition-colors text-left cursor-pointer"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-indigo-600" />
              <span>Save as Stencil</span>
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-red-50 text-red-600 hover:text-red-700 rounded-lg transition-colors text-left cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Right Column: Dot-Voting Section (expanded horizontally to the right) */}
      {isVotingEnabled && (
        <>
          <div className="w-px bg-slate-100 mx-2 self-stretch" />
          <div className="w-48 sm:w-52 flex flex-col gap-1 shrink-0">
            <div className="px-1 py-0.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ThumbsUp className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400">Dot-Voting</span>
              </div>
              {votingConfig?.maxVotesPerUser !== undefined && (
                <span className="text-[10px] text-slate-400 font-medium">
                  {userVotesUsed}/{votingConfig.maxVotesPerUser}
                </span>
              )}
            </div>

            {isVotingLocked ? (
              <div className="flex items-center gap-2 px-2 py-2 text-slate-400 text-xs italic bg-amber-50/50 rounded-lg border border-amber-100/50">
                <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Voting is Locked</span>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {isDuplicateDisallowed ? (
                  <div className="px-2 py-2 text-slate-400 text-[11px] italic bg-slate-50 rounded-lg border border-slate-100 text-center">
                    You have already voted on this shape
                  </div>
                ) : !isQuotaExhausted ? (
                  <div className="flex flex-col gap-0.5">
                    {votingConfig?.categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          onVote?.(primaryShape?.id, cat.id);
                          onClose();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-lg text-xs transition-colors text-left cursor-pointer group"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 group-hover:scale-110 transition-transform"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="truncate flex-1">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-2 py-2 text-slate-400 text-[11px] italic bg-slate-50 rounded-lg border border-slate-100">
                    Vote quota reached ({userVotesUsed}/{votingConfig.maxVotesPerUser})
                  </div>
                )}

                {userVotesOnShape.length > 0 && (
                  <>
                    <div className="w-full h-px bg-slate-100 my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        onRemoveVote?.(primaryShape?.id, userVotesOnShape[0].id);
                        onClose();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-red-50 text-red-600 hover:text-red-700 rounded-lg transition-colors text-left cursor-pointer text-xs"
                    >
                      <X className="w-3.5 h-3.5 text-red-500" />
                      <span>Remove My Vote ({userVotesOnShape.length})</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
