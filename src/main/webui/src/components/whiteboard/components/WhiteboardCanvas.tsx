import React from 'react';
import { Editor } from '@dgmjs/core';
import { DGMEditor } from '@dgmjs/react';
import { CollabOverlay } from '../../CollabOverlay';
import { ShapeVoteBadge } from '../../ShapeVoteBadge';
import { ShapeContextMenu } from '../../ShapeContextMenu';
import { WhiteboardToolbar, WhiteboardTool } from '../../WhiteboardToolbar';
import { AiInlineCommandBar } from '../../AiInlineCommandBar';
import { CanvasConfig } from '../../WhiteboardConfigModal';
import { WhiteboardVotingConfig } from '@/types/voting';
import { getUserColor } from '@/lib/useWhiteboardCollab';
import { Eye, History, RotateCcw, X } from 'lucide-react';
import * as api from '@/lib/api';

export interface WhiteboardCanvasProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  editorRef: React.RefObject<Editor | null>;
  onMount: (editor: Editor) => void;
  canvasConfig: CanvasConfig;
  resolvedTheme: string;
  isViewer: boolean;
  canEdit: boolean;
  user: any;

  // Snapshot preview
  previewSnapshot: api.WhiteboardSnapshotDto | null;
  onExitPreview: () => void;
  onOpenRestoreConfirm: () => void;
  onOpenHistoryDrawer?: () => void;

  // Collaboration
  peers: any[];
  focusedShapeIds: string[];
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerLeave: () => void;
  onPointerUp: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;

  // Voting
  votingConfig: WhiteboardVotingConfig;
  userVotesUsed: number;
  onVote: (shapeId: string, categoryId?: string) => void;
  onRemoveVote: (shapeId: string, voteId: string) => void;

  // Context Menu
  contextMenu: { position: { x: number; y: number }; shapes: any[] } | null;
  onCloseContextMenu: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onContextMenuColorChange: (color: { stroke: string; fill: string }) => void;
  onTextStyling: (style: 'bold' | 'italic' | 'clear') => void;
  onRotate: (delta: number, absolute?: boolean) => void;
  onToggleLock: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onSetLineArrow: (end: 'head' | 'tail', type: 'flat' | 'arrow' | 'solid-arrow') => void;
  onOpenEditProperties: () => void;
  onOpenEditScript: () => void;
  onSaveAsStencil: () => void;
  onDeleteSelectedShapes: (shapes: any[]) => void;

  // Toolbar
  activeTool: WhiteboardTool;
  activeColor: { stroke: string; fill: string };
  onColorChange: (color: { stroke: string; fill: string }) => void;
  onToolChange: (tool: WhiteboardTool) => void;
  onAddShape: (type: 'rectangle' | 'ellipse' | 'frame') => void;
  onAddLine: () => void;
  onAddConnector: () => void;
  onAddFrame: () => void;
  onAddText: () => void;
  onUploadImage: (file: File) => void;
  onOpenAiModal: () => void;
  onOpenScriptDrawer: () => void;
  onZoom: (delta: number) => void;

  // AI Inline
  isAiInlineBarOpen: boolean;
  onCloseAiInlineBar: () => void;
  onSubmitInlineAiPrompt: (prompt: string) => Promise<void>;
  isAiGenerating: boolean;
}

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({
  containerRef,
  editorRef,
  onMount,
  canvasConfig,
  resolvedTheme,
  isViewer,
  canEdit,
  user,
  previewSnapshot,
  onExitPreview,
  onOpenRestoreConfirm,
  onOpenHistoryDrawer,
  peers,
  focusedShapeIds,
  onPointerMove,
  onPointerLeave,
  onPointerUp,
  onContextMenu,
  onDragOver,
  onDrop,
  votingConfig,
  userVotesUsed,
  onVote,
  onRemoveVote,
  contextMenu,
  onCloseContextMenu,
  onBringToFront,
  onSendToBack,
  onContextMenuColorChange,
  onTextStyling,
  onRotate,
  onToggleLock,
  onGroup,
  onUngroup,
  onSetLineArrow,
  onOpenEditProperties,
  onOpenEditScript,
  onSaveAsStencil,
  onDeleteSelectedShapes,
  activeTool,
  activeColor,
  onColorChange,
  onToolChange,
  onAddShape,
  onAddLine,
  onAddConnector,
  onAddFrame,
  onAddText,
  onUploadImage,
  onOpenAiModal,
  onOpenScriptDrawer,
  onZoom,
  isAiInlineBarOpen,
  onCloseAiInlineBar,
  onSubmitInlineAiPrompt,
  isAiGenerating,
}) => {
  return (
    <div
      ref={containerRef}
      className="relative flex-1 w-full h-full overflow-hidden select-none bg-slate-50 dark:bg-slate-950"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerUp={onPointerUp}
      onContextMenu={onContextMenu}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Floating Snapshot Preview Banner */}
      {previewSnapshot && (
        <div
          data-testid="snapshot-preview-banner"
          className="absolute top-4 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-auto mx-auto px-4 py-2.5 bg-amber-500/95 dark:bg-amber-600/95 text-white backdrop-blur-md rounded-2xl shadow-xl flex items-center justify-between gap-4 border border-amber-400/40 animate-in fade-in slide-in-from-top duration-200"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-1.5 rounded-lg bg-amber-600 dark:bg-amber-700 text-white shrink-0">
              <Eye className="w-4 h-4" />
            </span>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-tight uppercase px-1.5 py-0.5 rounded bg-amber-600/80 dark:bg-amber-700/80 text-amber-100 text-[10px]">
                  Preview Mode
                </span>
                <span className="text-xs font-semibold truncate">
                  Snapshot Preview{previewSnapshot.name ? ` • ${previewSnapshot.name}` : ''}
                </span>
              </div>
              <span className="text-[11px] text-amber-100/90 truncate">
                Viewing historical snapshot. Canvas is in read-only mode.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenHistoryDrawer && (
              <button
                onClick={onOpenHistoryDrawer}
                className="px-2.5 py-1.5 text-xs font-medium rounded-xl bg-amber-600/60 hover:bg-amber-600 text-white transition-colors flex items-center gap-1 cursor-pointer"
              >
                <History className="w-3.5 h-3.5" />
                <span>Snapshots</span>
              </button>
            )}

            {canEdit && (
              <button
                onClick={onOpenRestoreConfirm}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-white text-amber-900 hover:bg-amber-50 transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore</span>
              </button>
            )}

            <button
              onClick={onExitPreview}
              className="px-2.5 py-1.5 text-xs font-medium rounded-xl bg-amber-600/60 hover:bg-amber-600 text-white transition-colors flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Exit Preview</span>
            </button>
          </div>
        </div>
      )}

      <DGMEditor
        className="w-full h-full"
        onMount={onMount}
        showGrid={canvasConfig.gridStyle !== 'none'}
        snapToGrid={canvasConfig.snapToGrid}
        darkMode={resolvedTheme === 'dark'}
      />
      <CollabOverlay
        editor={editorRef.current}
        peers={peers}
        focusedShapeIds={focusedShapeIds}
        showCursors={canvasConfig.showCollaboratorCursors}
        showLabels={canvasConfig.showPeerLabels}
      />
      <ShapeVoteBadge
        editor={editorRef.current}
        votingConfig={votingConfig}
        currentUserId={user?.profile?.sub || ''}
        currentUserName={user?.profile?.name || user?.profile?.preferred_username || user?.profile?.email || 'You'}
        currentUserColor={getUserColor(user?.profile?.sub || 'me')}
        currentUserAvatar={user?.profile?.avatar as string | undefined}
        userVotesUsed={userVotesUsed}
        onVote={onVote}
        onRemoveVote={onRemoveVote}
        canEdit={!isViewer}
      />
      {contextMenu && !isViewer && (
        <ShapeContextMenu
          position={contextMenu.position}
          shapes={contextMenu.shapes}
          onBringToFront={onBringToFront}
          onSendToBack={onSendToBack}
          onColorChange={onContextMenuColorChange}
          onTextStyling={onTextStyling}
          onRotate={onRotate}
          onToggleLock={onToggleLock}
          onGroup={onGroup}
          onUngroup={onUngroup}
          onSetLineArrow={onSetLineArrow}
          onEditProperties={onOpenEditProperties}
          onEditScript={onOpenEditScript}
          onSaveAsStencil={onSaveAsStencil}
          onDelete={() => {
            if (contextMenu.shapes && contextMenu.shapes.length > 0) {
              onDeleteSelectedShapes(contextMenu.shapes);
            }
          }}
          votingConfig={votingConfig}
          onVote={onVote}
          onRemoveVote={onRemoveVote}
          currentUserId={user?.profile?.sub || ''}
          userVotesUsed={userVotesUsed}
          onClose={onCloseContextMenu}
        />
      )}

      {/* Floating Canvas Action Toolbar */}
      <WhiteboardToolbar
        isViewer={isViewer || !!previewSnapshot}
        activeTool={activeTool}
        activeColor={activeColor}
        onColorChange={onColorChange}
        onToolChange={onToolChange}
        onAddShape={onAddShape}
        onAddLine={onAddLine}
        onAddConnector={onAddConnector}
        onAddFrame={onAddFrame}
        onAddText={onAddText}
        onUploadImage={onUploadImage}
        onOpenAiModal={onOpenAiModal}
        onOpenScriptDrawer={onOpenScriptDrawer}
        onZoom={onZoom}
      />

      {/* AI Inline Floating Command Bar (Cmd+K / Ctrl+K) */}
      <AiInlineCommandBar
        isOpen={isAiInlineBarOpen}
        onClose={onCloseAiInlineBar}
        onSubmitPrompt={onSubmitInlineAiPrompt}
        isGenerating={isAiGenerating}
        onOpenModal={onOpenAiModal}
      />
    </div>
  );
};
