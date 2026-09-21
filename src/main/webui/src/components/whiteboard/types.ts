export interface WhiteboardProps {
  onBoardChange?: (name: string | null) => void;
}

export type { CanvasConfig, CanvasTheme, GridStyle } from '../WhiteboardConfigModal';
export type { WhiteboardTool } from '../WhiteboardToolbar';
export type { ShapeCustomizationPayload } from '../ShapeScriptDrawer';
export type {
  PageViewport,
  DgmPageMetadata,
  DgmPageNode,
  DgmDocumentPayload,
  ShapePageLink,
} from '@/types/pages';
