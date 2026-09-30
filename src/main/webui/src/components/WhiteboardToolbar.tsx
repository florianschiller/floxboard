import { useState, useRef, useEffect, useCallback, ChangeEvent } from "react";
import {
  MousePointer,
  Pencil,
  Highlighter,
  Eraser,
  Shapes,
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
  onZoom: (delta: number) => void;
  pages?: DgmPageMetadata[];
  activePageId?: string;
  onPrevPage?: () => void;
  onNextPage?: () => void;
  onSelectPage?: (pageId: string) => void;
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
  onOpenAiModal,
  onOpenScriptDrawer,
  onZoom,
  pages,
  activePageId,
  onPrevPage,
  onNextPage,
  onSelectPage,
}: WhiteboardToolbarProps) {
  const [isShapesOpen, setIsShapesOpen] = useState(false);
  const [isColorOpen, setIsColorOpen] = useState(false);
  const [shapesFlyoutTop, setShapesFlyoutTop] = useState(0);
  const [colorFlyoutTop, setColorFlyoutTop] = useState(0);

  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const shapesBtnRef = useRef<HTMLButtonElement | null>(null);
  const colorBtnRef = useRef<HTMLButtonElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeIndex = pages && activePageId ? pages.findIndex((p) => p.id === activePageId) : 0;
  const isFirstPage = !pages || pages.length <= 1 || activeIndex <= 0;
  const isLastPage = !pages || pages.length <= 1 || activeIndex >= pages.length - 1;

  const isShapeToolActive = ['rectangle', 'ellipse', 'line', 'connector', 'frame'].includes(activeTool);
  const currentColor = WHITEBOARD_COLORS.find((c) => c.stroke.toLowerCase() === activeColor.stroke.toLowerCase()) || WHITEBOARD_COLORS[0];

  const updateFlyoutPositions = useCallback(() => {
    if (toolbarRef.current) {
      const toolbarRect = toolbarRef.current.getBoundingClientRect();
      if (shapesBtnRef.current) {
        const btnRect = shapesBtnRef.current.getBoundingClientRect();
        setShapesFlyoutTop(btnRect.top - toolbarRect.top);
      }
      if (colorBtnRef.current) {
        const btnRect = colorBtnRef.current.getBoundingClientRect();
        setColorFlyoutTop(btnRect.top - toolbarRect.top);
      }
    }
  }, []);

  useEffect(() => {
    if (isShapesOpen || isColorOpen) {
      updateFlyoutPositions();
    }
  }, [isShapesOpen, isColorOpen, updateFlyoutPositions]);

  useEffect(() => {
    window.addEventListener("resize", updateFlyoutPositions);
    return () => {
      window.removeEventListener("resize", updateFlyoutPositions);
    };
  }, [updateFlyoutPositions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (toolbarRef.current && !toolbarRef.current.contains(target)) {
        setIsShapesOpen(false);
        setIsColorOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsShapesOpen(false);
        setIsColorOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const closeFlyouts = () => {
    setIsShapesOpen(false);
    setIsColorOpen(false);
  };

  const handlePrevPage = () => {
    closeFlyouts();
    if (onPrevPage) {
      onPrevPage();
    } else if (onSelectPage && pages && activeIndex > 0) {
      onSelectPage(pages[activeIndex - 1].id);
    }
  };

  const handleNextPage = () => {
    closeFlyouts();
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
    return (
      <div
        ref={toolbarRef}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30"
      >
        <div className="max-h-[calc(100vh-4rem)] overflow-y-auto flex flex-col items-center gap-2 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-2 text-xs font-semibold text-slate-700 shadow-xl dark:bg-slate-900/95 dark:border-slate-800 dark:text-slate-300">
          <div className="flex flex-col items-center gap-1 text-center" title="Viewer Mode (Read Only)">
            <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-[10px] leading-tight text-center max-w-[48px]">Viewer Mode</span>
          </div>

          <div className="w-6 h-px bg-slate-200 dark:bg-slate-800 my-0.5" />

          {/* Zoom controls for viewers */}
          <div className="flex flex-col items-center gap-1">
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

          {pages && pages.length > 0 && (
            <>
              <div className="w-6 h-px bg-slate-200 dark:bg-slate-800 my-0.5" />
              <div className="flex flex-col items-center gap-1">
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
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={toolbarRef}
      className="absolute left-4 top-1/2 -translate-y-1/2 z-30"
    >
      <div
        ref={scrollContainerRef}
        onScroll={updateFlyoutPositions}
        className="max-h-[calc(100vh-4rem)] overflow-y-auto flex flex-col items-center gap-1 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-1.5 shadow-xl dark:bg-slate-900/95 dark:border-slate-800"
      >
        {/* Interaction & Drawing tools */}
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            closeFlyouts();
            onToolChange?.('select');
          }}
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
          onClick={() => {
            closeFlyouts();
            onToolChange?.('freehand');
          }}
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
          onClick={() => {
            closeFlyouts();
            onToolChange?.('marker');
          }}
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
          onClick={() => {
            closeFlyouts();
            onToolChange?.('eraser');
          }}
          title="Eraser"
          className={`p-2 rounded-xl transition-colors cursor-pointer ${
            activeTool === 'eraser'
              ? 'bg-indigo-100 text-indigo-700 shadow-xs dark:bg-indigo-950/70 dark:text-indigo-300'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Eraser className="w-4 h-4" />
        </button>

        <div className="w-6 h-px bg-slate-200 dark:bg-slate-800 my-1" />

        {/* Shapes Flyout Trigger Button */}
        <button
          ref={shapesBtnRef}
          type="button"
          data-testid="toolbar-shapes-btn"
          onPointerDown={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setIsShapesOpen((prev) => {
              const next = !prev;
              if (next) {
                updateFlyoutPositions();
              }
              return next;
            });
            setIsColorOpen(false);
          }}
          title="Shapes"
          className={`p-2 rounded-xl transition-colors cursor-pointer ${
            isShapeToolActive || isShapesOpen
              ? 'bg-indigo-100 text-indigo-700 shadow-xs dark:bg-indigo-950/70 dark:text-indigo-300'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Shapes className="w-4 h-4" />
        </button>

        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            closeFlyouts();
            onAddText();
          }}
          title="Text"
          className={`p-2 rounded-xl transition-colors cursor-pointer ${
            activeTool === 'text'
              ? 'bg-indigo-100 text-indigo-700 shadow-xs dark:bg-indigo-950/70 dark:text-indigo-300'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Type className="w-4 h-4" />
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            closeFlyouts();
            fileInputRef.current?.click();
          }}
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

        {onOpenAiModal && (
          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              closeFlyouts();
              onOpenAiModal();
            }}
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
            onClick={() => {
              closeFlyouts();
              onOpenScriptDrawer();
            }}
            title="Customize Shape (Properties, Style & Script)"
            className="p-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:text-indigo-300 dark:hover:bg-indigo-950/50 rounded-xl transition-colors cursor-pointer relative"
          >
            <Code className="w-4 h-4" />
          </button>
        )}

        <div className="w-6 h-px bg-slate-200 dark:bg-slate-800 my-1" />

        {/* Collapsible Color Picker Flyout Trigger */}
        <button
          ref={colorBtnRef}
          type="button"
          data-testid="toolbar-color-picker-btn"
          onPointerDown={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setIsColorOpen((prev) => {
              const next = !prev;
              if (next) {
                updateFlyoutPositions();
              }
              return next;
            });
            setIsShapesOpen(false);
          }}
          title={`Color: ${currentColor.name}`}
          className={`p-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center ${
            isColorOpen
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <div
            className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 shadow-xs ring-2 ring-indigo-500/80"
            style={{ backgroundColor: activeColor.stroke }}
          />
        </button>

        <div className="w-6 h-px bg-slate-200 dark:bg-slate-800 my-1" />

        {/* Zoom controls */}
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            closeFlyouts();
            onZoom(0.1);
          }}
          title="Zoom In"
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            closeFlyouts();
            onZoom(-0.1);
          }}
          title="Zoom Out"
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {pages && pages.length > 0 && (
          <>
            <div className="w-6 h-px bg-slate-200 dark:bg-slate-800 my-1" />
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
          </>
        )}
      </div>

      {/* Shapes Flyout Popover rendered outside scroll container */}
      {isShapesOpen && (
        <div
          data-testid="toolbar-shapes-flyout"
          style={{ top: shapesFlyoutTop }}
          className="absolute left-full ml-2 z-40 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-1.5 shadow-xl flex flex-col gap-1 dark:bg-slate-900/95 dark:border-slate-800"
        >
          <button
            type="button"
            data-testid="toolbar-shape-rectangle-btn"
            onPointerDown={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onAddShape("Box");
              setIsShapesOpen(false);
            }}
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
            onClick={() => {
              onAddShape("Oval");
              setIsShapesOpen(false);
            }}
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
            onClick={() => {
              onAddLine();
              setIsShapesOpen(false);
            }}
            title="Line"
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              activeTool === 'line'
                ? 'bg-indigo-100 text-indigo-700 shadow-xs dark:bg-indigo-950/70 dark:text-indigo-300'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Minus className="w-4 h-4" />
          </button>
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
              setIsShapesOpen(false);
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
              setIsShapesOpen(false);
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
        </div>
      )}

      {/* Collapsible Color Picker Flyout rendered outside scroll container */}
      {isColorOpen && (
        <div
          data-testid="toolbar-color-flyout"
          style={{ top: colorFlyoutTop }}
          className="absolute left-full ml-2 z-40 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-2 shadow-xl flex flex-col gap-1.5 dark:bg-slate-900/95 dark:border-slate-800"
        >
          {WHITEBOARD_COLORS.map((c) => (
            <button
              key={c.name}
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onColorChange({ stroke: c.stroke, fill: c.fill });
                setIsColorOpen(false);
              }}
              style={{ backgroundColor: c.stroke }}
              className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                activeColor.stroke === c.stroke
                  ? "scale-125 ring-2 ring-indigo-500"
                  : "hover:scale-110"
              }`}
              title={c.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
