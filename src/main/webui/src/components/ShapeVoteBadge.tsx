import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@dgmjs/core';
import {
  WhiteboardVotingConfig,
  VotingCategory,
  ShapeVote,
  DEFAULT_VOTING_CONFIG,
} from '@/types/voting';
import { ThumbsUp, Plus, X, Lock, Check } from 'lucide-react';

export interface ShapeVoteBadgeProps {
  editor: Editor | null;
  votingConfig?: WhiteboardVotingConfig;
  currentUserId: string;
  currentUserName: string;
  currentUserColor?: string;
  currentUserAvatar?: string;
  userVotesUsed?: number;
  onVote?: (shapeId: string, categoryId?: string) => void;
  onRemoveVote?: (shapeId: string, voteId: string) => void;
  canEdit?: boolean;
}

interface ShapeVoteItemProps {
  shapeId: string;
  shape: any;
  editor: Editor;
  votingConfig: WhiteboardVotingConfig;
  currentUserId: string;
  userVotesUsed: number;
  onVote?: (shapeId: string, categoryId?: string) => void;
  onRemoveVote?: (shapeId: string, voteId: string) => void;
  canEdit: boolean;
}

function ShapeVoteItem({
  shapeId,
  shape,
  editor,
  votingConfig,
  currentUserId,
  userVotesUsed,
  onVote,
  onRemoveVote,
  canEdit,
}: ShapeVoteItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Compute bounding box in screen pixels (GCS transformed to screen coordinates with shape-proportional scaling)
  let screenPos: { x: number; y: number; effectiveScale: number; offset: number } | null = null;
  try {
    const canvas = editor?.canvas;
    if (canvas) {
      const rect =
        typeof shape.getBoundingRect === 'function'
          ? shape.getBoundingRect()
          : [
              [shape.left ?? 0, shape.top ?? 0],
              [(shape.left ?? 0) + (shape.width ?? 0), (shape.top ?? 0) + (shape.height ?? 0)],
            ];
      if (rect && rect.length >= 2 && Array.isArray(rect[0]) && Array.isArray(rect[1])) {
        const minX = Math.min(rect[0][0], rect[1][0]);
        const maxX = Math.max(rect[0][0], rect[1][0]);
        const minY = Math.min(rect[0][1], rect[1][1]);
        const maxY = Math.max(rect[0][1], rect[1][1]);
        const shapeWidth = Math.max(1, maxX - minX);
        const shapeHeight = Math.max(1, maxY - minY);
        const shapeDim = Math.min(shapeWidth, shapeHeight);
        const shapeScaleFactor = Math.min(Math.max(shapeDim / 150, 0.6), 1.6);

        const originX = Array.isArray(canvas.origin) ? canvas.origin[0] : 0;
        const originY = Array.isArray(canvas.origin) ? canvas.origin[1] : 0;
        const scale = typeof canvas.scale === 'number' ? canvas.scale : 1;
        const effectiveScale = scale * shapeScaleFactor;
        const screenX = (maxX + originX) * scale;
        const screenY = (maxY + originY) * scale;
        const offset = 6 * effectiveScale;

        screenPos = {
          x: screenX,
          y: screenY,
          effectiveScale,
          offset,
        };
      }
    }
  } catch {
    screenPos = null;
  }

  if (!screenPos) return null;

  const votes: ShapeVote[] = Array.isArray(shape.customData?.votes) ? shape.customData.votes : [];
  const hasVotes = votes.length > 0;
  const isLocked = Boolean(votingConfig.isLocked);
  const isQuotaExhausted = userVotesUsed >= votingConfig.maxVotesPerUser;

  const categoryMap = new Map<string, VotingCategory>();
  (votingConfig.categories || []).forEach((c) => categoryMap.set(c.id, c));

  // Count votes per category
  const categoryCounts = new Map<string, number>();
  votes.forEach((v) => {
    const catId = v.categoryId || (votingConfig.categories[0]?.id ?? 'default');
    categoryCounts.set(catId, (categoryCounts.get(catId) || 0) + 1);
  });

  const handleQuickVoteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked || !canEdit || isQuotaExhausted) return;

    if (votingConfig.categories.length === 1) {
      onVote?.(shapeId, votingConfig.categories[0].id);
    } else {
      setIsCategoryPickerOpen(!isCategoryPickerOpen);
    }
  };

  const handleCategorySelect = (e: React.MouseEvent, categoryId: string) => {
    e.stopPropagation();
    if (isLocked || !canEdit || isQuotaExhausted) return;
    onVote?.(shapeId, categoryId);
    setIsCategoryPickerOpen(false);
  };

  const handleRemoveVoteClick = (e: React.MouseEvent, voteId: string) => {
    e.stopPropagation();
    if (isLocked || !canEdit) return;
    onRemoveVote?.(shapeId, voteId);
  };

  // Do not render anything if shape has no votes and cannot edit
  if (!hasVotes && !canEdit) return null;

  return (
    <div
      data-testid={`shape-vote-badge-container-${shapeId}`}
      style={{
        position: 'absolute',
        left: `${screenPos.x - screenPos.offset}px`,
        top: `${screenPos.y - screenPos.offset}px`,
        transform: `translate(-100%, -100%) scale(${screenPos.effectiveScale})`,
        transformOrigin: 'bottom right',
      }}
      className="pointer-events-auto z-20 flex items-center gap-1 select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsCategoryPickerOpen(false);
      }}
    >
      {/* Vote Count Badge */}
      {hasVotes && (
        <div
          data-testid="shape-vote-badge"
          className="bg-white/95 backdrop-blur-xs border border-slate-200 text-slate-800 text-xs font-bold px-2 py-1 rounded-full shadow-md flex items-center gap-1.5 cursor-pointer hover:border-blue-400 hover:shadow-lg transition-all"
        >
          <ThumbsUp className="w-3 h-3 text-blue-600" />
          <span>{votes.length}</span>

          {/* Category colored dot indicators */}
          <div className="flex items-center -space-x-1 ml-0.5">
            {Array.from(categoryCounts.entries()).map(([catId]) => {
              const cat = categoryMap.get(catId);
              const color = cat?.color || '#3b82f6';
              return (
                <span
                  key={catId}
                  title={cat?.name || 'Category'}
                  style={{ backgroundColor: color }}
                  className="w-2.5 h-2.5 rounded-full border border-white shadow-2xs"
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Quick "+1" Action Button */}
      {canEdit && !isLocked && (
        <div className="relative">
          <button
            type="button"
            onClick={handleQuickVoteClick}
            disabled={isQuotaExhausted}
            title={
              isQuotaExhausted
                ? `Vote quota reached (${userVotesUsed}/${votingConfig.maxVotesPerUser})`
                : 'Cast a vote on this shape'
            }
            aria-label="Vote +1"
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-md cursor-pointer ${
              isQuotaExhausted
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-110 active:scale-95'
            } ${hasVotes ? 'opacity-90 hover:opacity-100' : isHovered ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Category Picker Dropdown */}
          {isCategoryPickerOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-xs animate-in fade-in zoom-in-95 duration-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2.5 py-1 font-semibold text-[10px] text-slate-400 uppercase tracking-wider">
                Select Category
              </div>
              {votingConfig.categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={(e) => handleCategorySelect(e, cat.id)}
                  className="w-full px-2.5 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 transition-colors cursor-pointer"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-xs text-slate-800 truncate">{cat.name}</div>
                    {(cat.comment || cat.description) && (
                      <div className="text-[10px] text-slate-400 truncate">{cat.comment || cat.description}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hover Voter Breakdown Popover */}
      {isHovered && hasVotes && !isCategoryPickerOpen && (
        <div
          ref={popoverRef}
          data-testid="vote-breakdown-popover"
          className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 z-30 text-xs animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Header & Category Breakdown */}
          <div className="pb-2 border-b border-slate-100">
            <div className="flex items-center justify-between font-semibold text-slate-800 text-xs mb-1.5">
              <span>Votes ({votes.length})</span>
              {isLocked && (
                <span className="text-[10px] text-amber-700 font-bold flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  <Lock className="w-2.5 h-2.5" /> Locked
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1">
              {Array.from(categoryCounts.entries()).map(([catId, count]) => {
                const cat = categoryMap.get(catId);
                const color = cat?.color || '#3b82f6';
                return (
                  <span
                    key={catId}
                    style={{ borderColor: color, color }}
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md border bg-slate-50 flex items-center gap-1"
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                    {cat?.name || 'Category'}: {count}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Voter List */}
          <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 mt-2 space-y-1">
            {votes.map((vote) => {
              const cat = vote.categoryId ? categoryMap.get(vote.categoryId) : undefined;
              const color = cat?.color || '#3b82f6';
              const isCurrentUserVote = vote.userId === currentUserId;
              const formattedTime = vote.createdAt
                ? new Date(vote.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : vote.timestamp
                ? new Date(vote.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <div key={vote.id} className="pt-1.5 pb-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* Avatar */}
                    <div
                      style={{ backgroundColor: vote.userColor || color }}
                      className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-white text-[9px] shrink-0 uppercase"
                    >
                      {(vote.userName || 'U').slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-xs text-slate-800 truncate flex items-center gap-1">
                        <span>{vote.userName || 'Collaborator'}</span>
                        {isCurrentUserVote && (
                          <span className="text-[9px] text-blue-600 font-normal">(You)</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <span style={{ color }} className="font-medium truncate">
                          {cat?.name || 'General'}
                        </span>
                        {formattedTime && <span>• {formattedTime}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Remove Vote Button for Current User */}
                  {isCurrentUserVote && !isLocked && canEdit && (
                    <button
                      type="button"
                      onClick={(e) => handleRemoveVoteClick(e, vote.id)}
                      title="Remove your vote"
                      aria-label="Remove vote"
                      className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function ShapeVoteBadge({
  editor,
  votingConfig = DEFAULT_VOTING_CONFIG,
  currentUserId,
  currentUserName,
  currentUserColor,
  currentUserAvatar,
  userVotesUsed = 0,
  onVote,
  onRemoveVote,
  canEdit = true,
}: ShapeVoteBadgeProps) {
  const [, setTick] = useState(0);

  // Re-render overlay when canvas repaints, pans, or zooms
  useEffect(() => {
    if (!editor) return;
    const handleRepaint = () => setTick((t) => (t + 1) % 10000);
    const d = editor.onRepaint?.addListener?.(handleRepaint);
    return () => d?.dispose?.();
  }, [editor]);

  if (!editor || !editor.canvas || !votingConfig?.enabled) return null;

  // Retrieve shapes from editor store
  const store = editor.store as any;
  const shapesMap = store?.idIndex || {};
  const shapeIds = Object.keys(shapesMap);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {shapeIds.map((shapeId) => {
        const shape = shapesMap[shapeId];
        if (!shape || shape.type === 'Page' || shape.type === 'Doc') return null;

        return (
          <ShapeVoteItem
            key={shapeId}
            shapeId={shapeId}
            shape={shape}
            editor={editor}
            votingConfig={votingConfig}
            currentUserId={currentUserId}
            userVotesUsed={userVotesUsed}
            onVote={onVote}
            onRemoveVote={onRemoveVote}
            canEdit={canEdit}
          />
        );
      })}
    </div>
  );
}
