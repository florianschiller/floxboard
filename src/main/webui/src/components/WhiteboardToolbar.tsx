import { useState, useRef, ChangeEvent } from "react";
import {
  MousePointer,
  Hand,
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
  ChevronLeft,
  ChevronRight,
  Eye,
  Sparkles,
  Code,
  Library,
} from "lucide-react";
import { DgmPageMetadata } from "@/types/pages";

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
  | 'hand'
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
  onOpenAiModal?: () => void;
  onOpenScriptDrawer?: () => void;
  onOpenShapeLibrary?: () => void;
  onZoom: (delta: number) => void;
  pages?: DgmPageMetadata[];
  activePageId?: string;
  onPrevPage?: () => void;
  onNextPage?: () => void;
  onSelectPage?: (pageId: string) => void;
}

export function WhiteboardToolbar({
  isViewer,
  activeTool = 'hand',
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
  onOpenShapeLibrary,
  onZoom,
  pages,
  activePageId,
  onPrevPage,
  onNextPage,
  onSelectPage,
}: WhiteboardToolbarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeIndex = pages && activePageId ? pages.findIndex((p) => p.id === activePageId) : 0;
  const isFirstPage = !pages || pages.length <= 1 || activeIndex <= 0;
  const isLastPage = !pages || pages.length <= 1 || activeIndex >= pages.length - 1;

  const handlePrevPage = () => {
    if (onPrevPage) {
      onPrevPage();
    } else if (onSelectPage && pages && activeIndex > 0) {
      onSelectPage(pages[activeIndex - 1].id);
    }
  };

  const handleNextPage = () => {
    if (onNextPage) {
      onNextPage();
    } else if (onSelectPage && pages && activeIndex < pages.length - 1) {
      onSelectPage(pages[activeIndex + 1].id);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadImage) {
      onUploadImage(file);
    }
    if (e.target) {
      e.target.value = "";
    }
  };

  if (isViewer) {
    if (isCollapsed) {
      return (
        <div className="absolute left-4 top-16 z-30" onWheel={(e) => e.stopPropagation()}>
          <button
            type="button"
            data-testid="toolbar-expand-btn"
            onClick={() => setIsCollapsed(false)}
            title="Expand Toolbar"
            className="flex items-center justify-center p-2 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 text-slate-600 shadow-xl hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer dark:bg-slate-900/95 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      );
    }

    return (
      <div
        ref={toolbarRef}
        className="absolute left-4 top-16 z-30 flex flex-col items-start"
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="max-h-[calc(100vh-5rem)] flex flex-col items-start bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-2 text-xs font-semibold text-slate-700 shadow-xl dark:bg-slate-900/95 dark:border-slate-800 dark:text-slate-300">
          <button
            type="button"
            data-testid="toolbar-collapse-btn"
            onPointerDown={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setIsCollapsed(true)}
            title="Collapse Toolbar"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="w-full h-px bg-slate-200 dark:bg-slate-800 my-1 shrink-0" />

          <div className="overflow-y-auto flex flex-col items-start gap-1 w-full">
            <div className="flex flex-col items-start gap-1 w-full">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 select-none">
                Mode
              </span>
              <div className="flex flex-row items-center gap-1.5 px-1 py-0.5 text-center" title="Viewer Mode (Read Only)">
                <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-[10px] leading-tight text-center whitespace-nowrap">Viewer Mode</span>
              </div>
            </div>

            <div className="w-full h-px bg-slate-200 dark:bg-slate-800 my-1 shrink-0" />

            {/* Navigation controls for viewers */}
            <div className="flex flex-col items-start gap-1 w-full">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 select-none">
                Navigation
              </span>
              <div className="flex flex-row items-center gap-1">
                <button
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onZoom(0.1)}
                  title="Zoom In"
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onZoom(-0.1)}
                  title="Zoom Out"
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {pages && pages.length > 0 && (
              <>
                <div className="w-full h-px bg-slate-200 dark:bg-slate-800 my-1 shrink-0" />
                <div className="flex flex-col items-start gap-1 w-full">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 select-none">
                    Pages
                  </span>
                  <div className="flex flex-row items-center gap-1">
                    <button
                      type="button"
                      data-testid="toolbar-prev-page-btn"
                      onPointerDown={(e) => e.preventDefault()}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={handlePrevPage}
                      disabled={isFirstPage}
                      title="Previous Page"
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      data-testid="toolbar-next-page-btn"
                      onPointerDown={(e) => e.preventDefault()}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={handleNextPage}
                      disabled={isLastPage}
                      title="Next Page"
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isCollapsed) {
    return (
      <div className="absolute left-4 top-16 z-30" onWheel={(e) => e.stopPropagation()}>
        <button
          type="button"
          data-testid="toolbar-expand-btn"
          onClick={() => setIsCollapsed(false)}
          title="Expand Toolbar"
          className="flex items-center justify-center p-2 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 text-slate-600 shadow-xl hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer dark:bg-slate-900/95 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={toolbarRef}
      className="absolute left-4 top-16 z-30 flex flex-col items-start"
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="max-h-[calc(100vh-5rem)] flex flex-col items-start bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-1.5 shadow-xl dark:bg-slate-900/95 dark:border-slate-800">
        {/* Top Collapse Button outside scroll list */}
        <button
          type="button"
          data-testid="toolbar-collapse-btn"
          onPointerDown={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setIsCollapsed(true)}
          title="Collapse Toolbar"
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="w-full h-px bg-slate-200 dark:bg-slate-800 my-1 shrink-0" />

        {/* Scrollable Tool List */}
        <div className="overflow-y-auto flex flex-col items-start gap-1 w-full">
          {/* Navigation group */}
          <div className="flex flex-col items-start gap-1 w-full">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 select-none">
              Navigation
            </span>
            {/* Row 1: Select & Hand */}
            <div className="flex flex-row items-center gap-1">
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onToolChange?.('select')}
                title="Select"
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  activeTool === 'select'
                    ? 'bg-indigo-100 text-indigo-700 shadow-xs dark:bg-indigo-950/70 dark:text-indigo-300'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <MousePointer className="w-4 h-4" />
              </button>
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onToolChange?.('hand')}
                title="Hand (Pan)"
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  activeTool === 'hand'
                    ? 'bg-indigo-100 text-indigo-700 shadow-xs dark:bg-indigo-950/70 dark:text-indigo-300'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Hand className="w-4 h-4" />
              </button>
            </div>
            {/* Row 2: Zoom Out & Zoom In */}
            <div className="flex flex-row items-center gap-1">
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onZoom(-0.1)}
                title="Zoom Out"
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onZoom(0.1)}
                title="Zoom In"
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="w-full h-px bg-slate-200 dark:bg-slate-800 my-1 shrink-0" />

          {/* Draw group */}
          <div className="flex flex-col items-start gap-1 w-full">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 select-none">
              Draw
            </span>
            <div className="flex flex-row items-center gap-1">
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onToolChange?.('freehand')}
                title="Freehand"
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  activeTool === 'freehand'
                    ? 'bg-indigo-100 text-indigo-700 shadow-xs dark:bg-indigo-950/70 dark:text-indigo-300'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800'
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
                    ? 'bg-indigo-100 text-indigo-700 shadow-xs dark:bg-indigo-950/70 dark:text-indigo-300'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800'
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
                    ? 'bg-indigo-100 text-indigo-700 shadow-xs dark:bg-indigo-950/70 dark:text-indigo-300'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Eraser className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="w-full h-px bg-slate-200 dark:bg-slate-800 my-1 shrink-0" />

          {/* Create group (Direct Shapes & Tools) */}
          <div className="flex flex-col items-start gap-1 w-full">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 select-none">
              Create
            </span>
            {/* Row 1: Rectangle, Circle / Oval, Line (3 items) */}
            <div className="flex flex-row items-center gap-1">
              <button
                type="button"
                data-testid="toolbar-shape-rectangle-btn"
                onPointerDown={(e) => e.preventDefault()}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onAddShape("Box")}
                title="Rectangle"
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  activeTool === 'rectangle'
                    ? 'bg-indigo-100 text-indigo-700 shadow-xs dark:bg-indigo-950/70 dark:text-indigo-300'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Square className="w-4 h-4" />
              </button>
              <button
                type="button"
                data-testid="toolbar-shape-oval-btn"
                onPointerDown={(e) => e.preventDefault()}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onAddShape("Oval")}
                title="Circle / Oval"
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  activeTool === 'ellipse'
                    ? 'bg-indigo-100 text-indigo-700 shadow-xs dark:bg-indigo-950/70 dark:text-indigo-300'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <CircleIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                data-testid="toolbar-shape-line-btn"
                onPointerDown={(e) => e.preventDefault()}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onAddLine()}
                title="Line"
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  activeTool === 'line'
                    ? 'bg-indigo-100 text-indigo-700 shadow-xs dark:bg-indigo-950/70 dark:text-indigo-300'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>

            {/* Row 2: Connector, Frame, Text (3 items) */}
            <div className="flex flex-row items-center gap-1">
              <button
                type="button"
                data-testid="toolbar-shape-connector-btn"
                onPointerDown={(e) => e.preventDefault()}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (onAddConnector) {
                    onAddConnector();
                  } else {
                    onToolChange?.('connector');
                  }
                }}
                title="Connector"
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  activeTool === 'connector'
                    ? 'bg-indigo-100 text-indigo-700 shadow-xs dark:bg-indigo-950/70 dark:text-indigo-300'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Workflow className="w-4 h-4" />
              </button>
              <button
                type="button"
                data-testid="toolbar-shape-frame-btn"
                onPointerDown={(e) => e.preventDefault()}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (onAddFrame) {
                    onAddFrame();
                  } else {
                    onToolChange?.('frame');
                  }
                }}
                title="Frame"
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  activeTool === 'frame'
                    ? 'bg-indigo-100 text-indigo-700 shadow-xs dark:bg-indigo-950/70 dark:text-indigo-300'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <FrameIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onAddText()}
                title="Text"
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  activeTool === 'text'
                    ? 'bg-indigo-100 text-indigo-700 shadow-xs dark:bg-indigo-950/70 dark:text-indigo-300'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Type className="w-4 h-4" />
              </button>
            </div>

            {/* Row 3: Upload Image (1 item) */}
            <div className="flex flex-row items-center gap-1">
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                title="Upload Image"
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
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
            </div>

            {/* Row 4: AI Diagram, Shape Customizer, Shape Library (3 items) */}
            <div className="flex flex-row items-center gap-1">
              {onOpenAiModal && (
                <button
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onOpenAiModal()}
                  title="Generate Diagram with AI (Cmd+K / Ctrl+K)"
                  className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-950/50 rounded-xl transition-colors cursor-pointer relative"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
              )}

              {onOpenScriptDrawer && (
                <button
                  type="button"
                  data-testid="toolbar-script-drawer-btn"
                  onPointerDown={(e) => e.preventDefault()}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onOpenScriptDrawer()}
                  title="Customize Shape (Properties, Style & Script)"
                  className="p-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:text-indigo-300 dark:hover:bg-indigo-950/50 rounded-xl transition-colors cursor-pointer relative"
                >
                  <Code className="w-4 h-4" />
                </button>
              )}

              {onOpenShapeLibrary && (
                <button
                  type="button"
                  data-testid="toolbar-shape-library-btn"
                  onPointerDown={(e) => e.preventDefault()}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onOpenShapeLibrary()}
                  title="Shape Libraries & Stencils"
                  className="p-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:text-indigo-300 dark:hover:bg-indigo-950/50 rounded-xl transition-colors cursor-pointer relative"
                >
                  <Library className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="w-full h-px bg-slate-200 dark:bg-slate-800 my-1 shrink-0" />

          {/* Color group (Direct Swatches) */}
          <div className="flex flex-col items-start gap-1 w-full">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 select-none">
              Color
            </span>
            {/* Row 1: First 3 colors */}
            <div className="flex flex-row items-center gap-1">
              {WHITEBOARD_COLORS.slice(0, 3).map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onColorChange({ stroke: c.stroke, fill: c.fill })}
                  title={c.name}
                  className="p-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <div
                    className={`w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 transition-transform ${
                      activeColor.stroke.toLowerCase() === c.stroke.toLowerCase()
                        ? "scale-110 ring-2 ring-indigo-500 shadow-xs"
                        : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: c.stroke }}
                  />
                </button>
              ))}
            </div>
            {/* Row 2: Next 3 colors */}
            <div className="flex flex-row items-center gap-1">
              {WHITEBOARD_COLORS.slice(3, 6).map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onColorChange({ stroke: c.stroke, fill: c.fill })}
                  title={c.name}
                  className="p-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <div
                    className={`w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 transition-transform ${
                      activeColor.stroke.toLowerCase() === c.stroke.toLowerCase()
                        ? "scale-110 ring-2 ring-indigo-500 shadow-xs"
                        : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: c.stroke }}
                  />
                </button>
              ))}
            </div>
            {/* Row 3: Remaining colors (1 color) */}
            <div className="flex flex-row items-center gap-1">
              {WHITEBOARD_COLORS.slice(6).map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onColorChange({ stroke: c.stroke, fill: c.fill })}
                  title={c.name}
                  className="p-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <div
                    className={`w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 transition-transform ${
                      activeColor.stroke.toLowerCase() === c.stroke.toLowerCase()
                        ? "scale-110 ring-2 ring-indigo-500 shadow-xs"
                        : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: c.stroke }}
                  />
                </button>
              ))}
            </div>
          </div>

          {pages && pages.length > 0 && (
            <>
              <div className="w-full h-px bg-slate-200 dark:bg-slate-800 my-1 shrink-0" />
              {/* Pages group */}
              <div className="flex flex-col items-start gap-1 w-full">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 select-none">
                  Pages
                </span>
                <div className="flex flex-row items-center gap-1">
                  <button
                    type="button"
                    data-testid="toolbar-prev-page-btn"
                    onPointerDown={(e) => e.preventDefault()}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handlePrevPage}
                    disabled={isFirstPage}
                    title="Previous Page"
                    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    data-testid="toolbar-next-page-btn"
                    onPointerDown={(e) => e.preventDefault()}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleNextPage}
                    disabled={isLastPage}
                    title="Next Page"
                    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
