export interface WhiteboardProps {
  onBoardChange?: (name: string | null) => void;
}

export type { CanvasConfig, CanvasTheme, GridStyle } from '../WhiteboardConfigModal';
export type { WhiteboardTool } from '../WhiteboardToolbar';
export type { ShapeCustomizationPayload } from '../ShapeScriptDrawer';
