import React from 'react';
import * as api from '@/lib/api';
import { SaveBoardModal } from '../../SaveBoardModal';
import { OpenBoardModal } from '../../OpenBoardModal';
import { ShareBoardModal } from '../../ShareBoardModal';
import { WhiteboardConfigModal, CanvasConfig } from '../../WhiteboardConfigModal';
import { HistoryDrawer } from '../../HistoryDrawer';
import { AiDiagramModal } from '../../AiDiagramModal';
import { ShapeLibraryDrawer } from '../../ShapeLibraryDrawer';
import { SaveStencilModal } from '../../SaveStencilModal';
import { EditShapePropertiesModal } from '../../EditShapePropertiesModal';
import { ShapeScriptDrawer, ShapeCustomizationPayload } from '../../ShapeScriptDrawer';
import { PageSwitcherDrawer } from '../../PageSwitcherDrawer';
import { LicenseModal } from '../../LicenseModal';
import { WhiteboardRestoreConfirmDialog } from './WhiteboardRestoreConfirmDialog';
import { StencilItem } from '@/types/shapeLibrary';
import { WhiteboardVotingConfig } from '@/types/voting';
import { DgmPageMetadata } from '@/types/pages';

export interface WhiteboardModalsContainerProps {
  // Save Board Modal
  isSaveModalOpen: boolean;
  onCloseSaveModal: () => void;
  isSaveAsModalOpen: boolean;
  onCloseSaveAsModal: () => void;
  currentBoardName: string;
  onSaveBoard: (name: string, isSaveAs?: boolean) => void;

  // Open Board Modal
  isOpenModalOpen: boolean;
  onCloseOpenModal: () => void;
  currentBoardId: string | null;
  routeBoardId?: string;
  onOpenBoard: (board: api.WhiteboardSummary) => void;
  onNewBoard?: () => void;
  onDeleteBoard: (boardId: string) => void;

  // Share Board Modal
  isShareModalOpen: boolean;
  onCloseShareModal: () => void;
  currentRole: string | null;
  currentUserId: string;
  shareModalInitialTab: 'members' | 'requests';
  onLeaveBoard: () => void;

  // Config Modal
  isConfigModalOpen: boolean;
  onCloseConfigModal: () => void;
  configModalInitialTab: 'general' | 'canvas' | 'collaboration' | 'voting' | 'danger';
  boardMetadata: { createdAt?: string; updatedAt?: string };
  canvasConfig: CanvasConfig;
  onUpdateCanvasConfig: (config: CanvasConfig) => void;
  onRenameBoard: (name: string) => void;
  onClearCanvas?: () => void;
  onDeleteBoardPermanently: () => void;
  votingConfig: WhiteboardVotingConfig;
  onUpdateVotingConfig: (config: WhiteboardVotingConfig) => void;
  onResetAllVotes: () => void;

  // History Drawer
  isHistoryDrawerOpen: boolean;
  onCloseHistoryDrawer: () => void;
  onRestoreSnapshot: (snapshot: api.WhiteboardSnapshotDto) => void;
  onPreviewSnapshot: (snapshot: api.WhiteboardSnapshotDto | null) => void;
  previewSnapshotId: string | null;
  onForkSuccess: (forkedBoardId: string) => void;

  // AI Diagram Modal
  isAiModalOpen: boolean;
  onCloseAiModal: () => void;
  onInsertAiDiagram: (incomingDoc: any, mode: 'center' | 'replace' | 'new_board') => void;
  onOpenLicenseModal: () => void;

  // License Modal
  isLicenseModalOpen: boolean;
  onCloseLicenseModal: () => void;
  licenseModalFeature?: string;

  // Shape Library Drawer
  isShapeLibraryOpen: boolean;
  onCloseShapeLibrary: () => void;
  onInsertStencil: (stencil: StencilItem, targetPosition?: { x: number; y: number }) => void;
  collabUser: any;
  userToken?: string;

  // Save Stencil Modal
  isSaveStencilOpen: boolean;
  onCloseSaveStencil: () => void;
  selectedShapesForStencil: any[];
  onStencilSaved: (stencil: StencilItem) => void;

  // Edit Shape Properties Modal
  isEditPropertiesModalOpen: boolean;
  onCloseEditPropertiesModal: () => void;
  editingShape: any;
  onSaveShapeProperties: (properties: Record<string, any>) => void;

  // Shape Script Drawer
  isScriptDrawerOpen: boolean;
  onCloseScriptDrawer: () => void;
  scriptDrawerShape: any;
  revision?: number;
  onApplyShapeCustomization: (shape: any, payload: ShapeCustomizationPayload) => void;
  onApplyShapeScript: (shape: any, scriptCode: string) => void;
  onRevertShapeScript: (shape: any) => void;
  onClearShapeScript: (shape: any) => void;

  // Restore Snapshot Confirm Dialog
  pendingRestoreSnapshot: api.WhiteboardSnapshotDto | null;
  isRestoreConfirmOpen: boolean;
  isRestoringSnapshot: boolean;
  onConfirmRestore: () => void;
  onCancelRestore: () => void;

  // Page Switcher Drawer
  isPageDrawerOpen?: boolean;
  onClosePageDrawer?: () => void;
  pages?: DgmPageMetadata[];
  activePageId?: string;
  isViewer?: boolean;
  onSelectPage?: (pageId: string) => void;
  onAddPage?: () => void;
  onDuplicatePage?: (pageId: string) => void;
  onRenamePage?: (pageId: string, newName: string) => void;
  onReorderPages?: (startIndex: number, endIndex: number) => void;
  onDeletePage?: (pageId: string) => void;
}

export const WhiteboardModalsContainer: React.FC<WhiteboardModalsContainerProps> = ({
  isSaveModalOpen,
  onCloseSaveModal,
  isSaveAsModalOpen,
  onCloseSaveAsModal,
  currentBoardName,
  onSaveBoard,
  isOpenModalOpen,
  onCloseOpenModal,
  currentBoardId,
  routeBoardId,
  onOpenBoard,
  onNewBoard,
  onDeleteBoard,
  isShareModalOpen,
  onCloseShareModal,
  currentRole,
  currentUserId,
  shareModalInitialTab,
  onLeaveBoard,
  isConfigModalOpen,
  onCloseConfigModal,
  configModalInitialTab,
  boardMetadata,
  canvasConfig,
  onUpdateCanvasConfig,
  onRenameBoard,
  onClearCanvas,
  onDeleteBoardPermanently,
  votingConfig,
  onUpdateVotingConfig,
  onResetAllVotes,
  isHistoryDrawerOpen,
  onCloseHistoryDrawer,
  onRestoreSnapshot,
  onPreviewSnapshot,
  previewSnapshotId,
  onForkSuccess,
  isAiModalOpen,
  onCloseAiModal,
  onInsertAiDiagram,
  onOpenLicenseModal,
  isLicenseModalOpen,
  onCloseLicenseModal,
  licenseModalFeature,
  isShapeLibraryOpen,
  onCloseShapeLibrary,
  onInsertStencil,
  collabUser,
  userToken,
  isSaveStencilOpen,
  onCloseSaveStencil,
  selectedShapesForStencil,
  onStencilSaved,
  isEditPropertiesModalOpen,
  onCloseEditPropertiesModal,
  editingShape,
  onSaveShapeProperties,
  isScriptDrawerOpen,
  onCloseScriptDrawer,
  scriptDrawerShape,
  revision,
  onApplyShapeCustomization,
  onApplyShapeScript,
  onRevertShapeScript,
  onClearShapeScript,
  pendingRestoreSnapshot,
  isRestoreConfirmOpen,
  isRestoringSnapshot,
  onConfirmRestore,
  onCancelRestore,
  isPageDrawerOpen = false,
  onClosePageDrawer,
  pages = [],
  activePageId = 'page_1',
  isViewer = false,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onRenamePage,
  onReorderPages,
  onDeletePage,
}) => {
  const activeBoardId = currentBoardId || routeBoardId;

  return (
    <>
      {/* Save Board Modal */}
      <SaveBoardModal
        isOpen={isSaveModalOpen}
        onClose={onCloseSaveModal}
        currentName={currentBoardName}
        onSave={(name) => onSaveBoard(name, false)}
        initialName={currentBoardId ? currentBoardName : "My Whiteboard"}
      />

      {/* Save As Board Modal */}
      <SaveBoardModal
        isOpen={isSaveAsModalOpen}
        onClose={onCloseSaveAsModal}
        currentName={`${currentBoardName} (Copy)`}
        onSave={(name) => onSaveBoard(name, true)}
        initialName={`${currentBoardName} (Copy)`}
      />

      {/* Open Board Modal */}
      <OpenBoardModal
        isOpen={isOpenModalOpen}
        onClose={onCloseOpenModal}
        onSelectBoard={onOpenBoard}
        onNewBoard={onNewBoard}
      />

      {/* Share Board Modal */}
      {activeBoardId && (
        <ShareBoardModal
          isOpen={isShareModalOpen}
          onClose={onCloseShareModal}
          boardId={activeBoardId}
          boardName={currentBoardName}
          currentUserRole={currentRole}
          currentUserId={currentUserId}
          initialTab={shareModalInitialTab}
          onLeaveBoard={onLeaveBoard}
        />
      )}

      {/* Whiteboard Configuration Modal */}
      {activeBoardId && (
        <WhiteboardConfigModal
          isOpen={isConfigModalOpen}
          onClose={onCloseConfigModal}
          boardId={activeBoardId}
          boardName={currentBoardName}
          currentUserRole={currentRole}
          createdAt={boardMetadata.createdAt}
          updatedAt={boardMetadata.updatedAt}
          canvasConfig={canvasConfig}
          onUpdateCanvasConfig={onUpdateCanvasConfig}
          onRenameBoard={onRenameBoard}
          onClearCanvas={onClearCanvas}
          onDeleteBoard={onDeleteBoardPermanently}
          initialTab={configModalInitialTab}
          votingConfig={votingConfig}
          onUpdateVotingConfig={onUpdateVotingConfig}
          onResetAllVotes={onResetAllVotes}
        />
      )}

      {/* Version History Drawer */}
      {activeBoardId && (
        <HistoryDrawer
          isOpen={isHistoryDrawerOpen}
          onClose={onCloseHistoryDrawer}
          boardId={activeBoardId}
          boardName={currentBoardName}
          currentUserRole={currentRole}
          currentUserId={currentUserId}
          onRestoreSnapshot={onRestoreSnapshot}
          onPreviewSnapshot={onPreviewSnapshot}
          previewSnapshotId={previewSnapshotId}
          onForkSuccess={onForkSuccess}
        />
      )}

      {/* AI Text-to-Diagram Synthesis Modal */}
      <AiDiagramModal
        isOpen={isAiModalOpen}
        onClose={onCloseAiModal}
        whiteboardId={activeBoardId || undefined}
        onInsertDiagram={onInsertAiDiagram}
        onOpenLicenseModal={onOpenLicenseModal}
      />

      {/* License / Subscription Upgrade Modal */}
      <LicenseModal
        isOpen={isLicenseModalOpen}
        onClose={onCloseLicenseModal}
        feature={licenseModalFeature}
      />

      {/* Shape Library Drawer */}
      <ShapeLibraryDrawer
        isOpen={isShapeLibraryOpen}
        onClose={onCloseShapeLibrary}
        onInsertStencil={onInsertStencil}
        allowedCollectionIds={canvasConfig.allowedStencilCollections}
        currentUser={collabUser}
        token={userToken}
      />

      {/* Save Stencil Modal */}
      <SaveStencilModal
        isOpen={isSaveStencilOpen}
        onClose={onCloseSaveStencil}
        shapes={selectedShapesForStencil}
        onSaved={onStencilSaved}
        currentUser={collabUser}
        token={userToken}
      />

      {/* Edit Shape Properties Modal */}
      {editingShape && (
        <EditShapePropertiesModal
          isOpen={isEditPropertiesModalOpen}
          onClose={onCloseEditPropertiesModal}
          shape={editingShape}
          pages={pages}
          onSave={onSaveShapeProperties}
        />
      )}

      {/* Shape Script & Customization Drawer */}
      <ShapeScriptDrawer
        isOpen={isScriptDrawerOpen}
        onClose={onCloseScriptDrawer}
        shape={scriptDrawerShape}
        revision={revision}
        onApplyCustomization={onApplyShapeCustomization}
        onApplyScript={onApplyShapeScript}
        onRevertScript={onRevertShapeScript}
        onClearScript={onClearShapeScript}
      />

      {/* Restore Snapshot Confirmation Modal */}
      <WhiteboardRestoreConfirmDialog
        snapshot={pendingRestoreSnapshot}
        isOpen={isRestoreConfirmOpen}
        isRestoring={isRestoringSnapshot}
        onConfirm={onConfirmRestore}
        onCancel={onCancelRestore}
      />

      {/* Page Switcher Drawer */}
      {onClosePageDrawer && onSelectPage && onAddPage && onDuplicatePage && onRenamePage && onReorderPages && onDeletePage && (
        <PageSwitcherDrawer
          isOpen={isPageDrawerOpen}
          onClose={onClosePageDrawer}
          pages={pages}
          activePageId={activePageId}
          isViewer={isViewer}
          onSelectPage={onSelectPage}
          onAddPage={onAddPage}
          onDuplicatePage={onDuplicatePage}
          onRenamePage={onRenamePage}
          onReorderPages={onReorderPages}
          onDeletePage={onDeletePage}
        />
      )}
    </>
  );
};
