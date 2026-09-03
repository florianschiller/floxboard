import { useRef } from "react";
import {
  MousePointer,
  Pencil,
  Highlighter,
  Eraser,
  Square,
  Circle as CircleIcon,
  Minus,
  Workflow,
  Frame as FrameIcon,
  Type,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Eye,
} from "lucide-react";

export interface ColorOption {
  name: string;
  stroke: string;
  fill: string;
}

export const WHITEBOARD_COLORS: ColorOption[] = [
  { name: "Black", stroke: "#000000", fill: "#ffffff" },
  { name: "Red", stroke: "#d0021b", fill: "#f8d7da" },
  { name: "Blue", stroke: "#007bff", fill: "#cce5ff" },
  { name: "Green", stroke: "#28a745", fill: "#d4edda" },
  { name: "Yellow", stroke: "#ffc107", fill: "#fff3cd" },
  { name: "Purple", stroke: "#6f42c1", fill: "#e2d9f3" },
  { name: "Gray", stroke: "#6c757d", fill: "#e2e3e5" },
];

export type WhiteboardTool =
  | 'select'
  | 'freehand'
  | 'marker'
  | 'eraser'
  | 'line'
  | 'connector'
  | 'rectangle'
  | 'ellipse'
  | 'frame'
  | 'text';

export interface WhiteboardToolbarProps {
  isViewer: boolean;
  activeTool?: WhiteboardTool;
  activeColor: { stroke: string; fill: string };
  onColorChange: (color: { stroke: string; fill: string }) => void;
  onToolChange?: (tool: WhiteboardTool) => void;
  onAddShape: (type: "Box" | "Oval") => void;
  onAddLine: () => void;
  onAddConnector?: () => void;
  onAddFrame?: () => void;
  onAddText: () => void;
  onUploadImage?: (file: File) => void;
  onZoom: (delta: number) => void;
}

export function WhiteboardToolbar({
  isViewer,
  activeTool = 'select',
  activeColor,
  onColorChange,
  onToolChange,
  onAddShape,
  onAddLine,
  onAddConnector,
  onAddFrame,
  onAddText,
  onUploadImage,
  onZoom,
}: WhiteboardToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadImage) {
      onUploadImage(file);
    }
    if (e.target) {
      e.target.value = "";
    }
  };

  if (isViewer) {
    return (
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-xl">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue-600" />
          <span>Viewer Mode (Read Only)</span>
        </div>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Zoom controls for viewers */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onZoom(0.1)}
            title="Zoom In"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onZoom(-0.1)}
            title="Zoom Out"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-1.5 shadow-xl">
      {/* Interaction & Drawing tools */}
      <button
        type="button"
        onPointerDown={(e) => e.preventDefault()}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onToolChange?.('select')}
        title="Select"
        className={`p-2 rounded-xl transition-colors cursor-pointer ${
          activeTool === 'select'
            ? 'bg-blue-100 text-blue-700 shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <MousePointer className="w-4 h-4" />
      </button>
      <button
        type="button"
        onPointerDown={(e) => e.preventDefault()}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onToolChange?.('freehand')}
        title="Freehand"
        className={`p-2 rounded-xl transition-colors cursor-pointer ${
          activeTool === 'freehand'
            ? 'bg-blue-100 text-blue-700 shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        type="button"
        onPointerDown={(e) => e.preventDefault()}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onToolChange?.('marker')}
        title="Marker"
        className={`p-2 rounded-xl transition-colors cursor-pointer ${
          activeTool === 'marker'
            ? 'bg-blue-100 text-blue-700 shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <Highlighter className="w-4 h-4" />
      </button>
      <button
        type="button"
        onPointerDown={(e) => e.preventDefault()}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onToolChange?.('eraser')}
        title="Eraser"
        className={`p-2 rounded-xl transition-colors cursor-pointer ${
          activeTool === 'eraser'
            ? 'bg-blue-100 text-blue-700 shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <Eraser className="w-4 h-4" />
      </button>

      <div className="w-px h-6 bg-slate-200 mx-1" />

      {/* Shape tools */}
      <button
        type="button"
        onPointerDown={(e) => e.preventDefault()}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onAddShape("Box")}
        title="Rectangle"
        className={`p-2 rounded-xl transition-colors cursor-pointer ${
          activeTool === 'rectangle'
            ? 'bg-blue-100 text-blue-700 shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <Square className="w-4 h-4" />
      </button>
      <button
        type="button"
        onPointerDown={(e) => e.preventDefault()}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onAddShape("Oval")}
        title="Circle / Oval"
        className={`p-2 rounded-xl transition-colors cursor-pointer ${
          activeTool === 'ellipse'
            ? 'bg-blue-100 text-blue-700 shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <CircleIcon className="w-4 h-4" />
      </button>
      <button
        type="button"
        onPointerDown={(e) => e.preventDefault()}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onAddLine}
        title="Line"
        className={`p-2 rounded-xl transition-colors cursor-pointer ${
          activeTool === 'line'
            ? 'bg-blue-100 text-blue-700 shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <Minus className="w-4 h-4" />
      </button>
      <button
        type="button"
        onPointerDown={(e) => e.preventDefault()}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => (onAddConnector ? onAddConnector() : onToolChange?.('connector'))}
        title="Connector"
        className={`p-2 rounded-xl transition-colors cursor-pointer ${
          activeTool === 'connector'
            ? 'bg-blue-100 text-blue-700 shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <Workflow className="w-4 h-4" />
      </button>
      <button
        type="button"
        onPointerDown={(e) => e.preventDefault()}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => (onAddFrame ? onAddFrame() : onToolChange?.('frame'))}
        title="Frame"
        className={`p-2 rounded-xl transition-colors cursor-pointer ${
          activeTool === 'frame'
            ? 'bg-blue-100 text-blue-700 shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <FrameIcon className="w-4 h-4" />
      </button>
      <button
        type="button"
        onPointerDown={(e) => e.preventDefault()}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onAddText}
        title="Text"
        className={`p-2 rounded-xl transition-colors cursor-pointer ${
          activeTool === 'text'
            ? 'bg-blue-100 text-blue-700 shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <Type className="w-4 h-4" />
      </button>
      <button
        type="button"
        onPointerDown={(e) => e.preventDefault()}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        title="Upload Image"
        className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
      >
        <ImageIcon className="w-4 h-4" />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="w-px h-6 bg-slate-200 mx-1" />

      {/* Color Palettes */}
      <div className="flex items-center gap-1 px-1">
        {WHITEBOARD_COLORS.map((c) => (
          <button
            key={c.name}
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onColorChange({ stroke: c.stroke, fill: c.fill })}
            style={{ backgroundColor: c.stroke }}
            className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
              activeColor.stroke === c.stroke
                ? "scale-125 ring-2 ring-blue-500"
                : "hover:scale-110"
            }`}
            title={c.name}
          />
        ))}
      </div>

      <div className="w-px h-6 bg-slate-200 mx-1" />

      {/* Zoom controls */}
      <button
        type="button"
        onPointerDown={(e) => e.preventDefault()}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onZoom(0.1)}
        title="Zoom In"
        className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
      >
        <ZoomIn className="w-4 h-4" />
      </button>
      <button
        type="button"
        onPointerDown={(e) => e.preventDefault()}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onZoom(-0.1)}
        title="Zoom Out"
        className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
      >
        <ZoomOut className="w-4 h-4" />
      </button>
    </div>
  );
}
