import React, { useEffect, useState } from 'react';
import { Editor } from '@dgmjs/core';
import { PeerPresence } from '@/lib/useWhiteboardCollab';

interface CollabOverlayProps {
  editor: Editor | null;
  peers: PeerPresence[];
  focusedShapeIds?: string[];
  showCursors?: boolean;
  showLabels?: boolean;
}

export function CollabOverlay({
  editor,
  peers,
  focusedShapeIds = [],
  showCursors = true,
  showLabels = true,
}: CollabOverlayProps) {
  const [, setTick] = useState(0);

  // Re-render overlay when canvas pans, zooms, or repaints
  useEffect(() => {
    if (!editor) return;
    const handleRepaint = () => setTick((t) => (t + 1) % 10000);
    const d = editor.onRepaint.addListener(handleRepaint);
    return () => d.dispose();
  }, [editor]);

  if (!editor || !editor.canvas) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {/* Remote Selection Highlights */}
      {peers.map((peer) => {
        if (!peer.selection || peer.selection.length === 0) return null;

        return peer.selection.map((shapeId) => {
          const shape = (editor.store as any).idIndex?.[shapeId];
          if (!shape) return null;

          try {
            const rect = shape.getRectInDCS(editor.canvas);
            if (!rect || rect.length < 2) return null;

            const x = Math.min(rect[0][0], rect[1][0]);
            const y = Math.min(rect[0][1], rect[1][1]);
            const w = Math.abs(rect[1][0] - rect[0][0]);
            const h = Math.abs(rect[1][1] - rect[0][1]);

            return (
              <div
                key={`selection-${peer.clientId}-${shapeId}`}
                style={{
                  position: 'absolute',
                  left: `${x - 4}px`,
                  top: `${y - 4}px`,
                  width: `${w + 8}px`,
                  height: `${h + 8}px`,
                  borderColor: peer.user.color,
                  backgroundColor: `${peer.user.color}15`,
                }}
                className="border-2 border-dashed rounded transition-all duration-75 pointer-events-none"
              >
                <div
                  style={{
                    backgroundColor: peer.user.color,
                    color: '#ffffff',
                  }}
                  className="absolute -top-5 left-0 text-[10px] font-sans font-semibold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap"
                >
                  {peer.user.name}
                </div>
              </div>
            );
          } catch {
            return null;
          }
        });
      })}

      {/* Focus Target Highlights */}
      {focusedShapeIds.map((shapeId) => {
        const shape = (editor.store as any).idIndex?.[shapeId];
        if (!shape) return null;

        try {
          const rect = shape.getRectInDCS(editor.canvas);
          if (!rect || rect.length < 2) return null;

          const x = Math.min(rect[0][0], rect[1][0]);
          const y = Math.min(rect[0][1], rect[1][1]);
          const w = Math.abs(rect[1][0] - rect[0][0]);
          const h = Math.abs(rect[1][1] - rect[0][1]);

          return (
            <div
              key={`focus-${shapeId}`}
              style={{
                position: 'absolute',
                left: `${x - 8}px`,
                top: `${y - 8}px`,
                width: `${w + 16}px`,
                height: `${h + 16}px`,
              }}
              className="border-4 border-amber-500 rounded-lg animate-pulse pointer-events-none shadow-lg shadow-amber-500/30"
            />
          );
        } catch {
          return null;
        }
      })}

      {/* Remote Cursors */}
      {showCursors &&
        peers.map((peer) => {
          if (!peer.cursor) return null;

          try {
            const canvas = editor.canvas;
            const screenX = (peer.cursor[0] + canvas.origin[0]) * canvas.scale;
            const screenY = (peer.cursor[1] + canvas.origin[1]) * canvas.scale;

            return (
              <div
                key={`cursor-${peer.clientId}`}
                style={{
                  position: 'absolute',
                  transform: `translate(${screenX}px, ${screenY}px)`,
                  transition: 'transform 0.05s linear',
                }}
                className="pointer-events-none"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ color: peer.user.color }}
                  className="drop-shadow-md"
                >
                  <path
                    d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                    fill="currentColor"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </svg>
                {showLabels && (
                  <div
                    style={{
                      backgroundColor: peer.user.color,
                      color: '#ffffff',
                    }}
                    className="text-[11px] font-sans font-medium px-2 py-0.5 rounded-full shadow-md ml-3 -mt-1 whitespace-nowrap inline-block"
                  >
                    {peer.user.name}
                  </div>
                )}
              </div>
            );
          } catch {
            return null;
          }
        })}
    </div>
  );
}
