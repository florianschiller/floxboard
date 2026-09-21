import { CanvasTheme } from '../WhiteboardConfigModal';

export const THEME_CANVAS_COLORS: Record<CanvasTheme, { canvas: string; blank: string; grid?: string }> = {
  slate: { canvas: '#fafbfd', blank: '#fafbfd', grid: '#f1f5f9' },
  white: { canvas: '#ffffff', blank: '#ffffff', grid: '#f1f5f9' },
  lightSlate: { canvas: '#f1f5f9', blank: '#f1f5f9', grid: '#e2e8f0' },
  warm: { canvas: '#fefce8', blank: '#fefce8', grid: '#fef3c7' },
};

export const DARK_THEME_CANVAS_COLORS: Record<CanvasTheme, { canvas: string; blank: string; grid?: string }> = {
  slate: { canvas: '#020617', blank: '#020617', grid: '#1e293b' },
  white: { canvas: '#0f172a', blank: '#0f172a', grid: '#1e293b' },
  lightSlate: { canvas: '#1e293b', blank: '#1e293b', grid: '#334155' },
  warm: { canvas: '#1c1917', blank: '#1c1917', grid: '#292524' },
};
