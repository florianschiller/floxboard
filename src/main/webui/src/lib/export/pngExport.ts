import { Editor, Page, Doc } from '@dgmjs/core';
import { downloadBlob, sanitizeFilename } from './downloadUtils';
import { calculateShapesBoundingBox } from './boundsCalculator';
import { serializeDgmToSvg } from './svgExport';

/**
 * Handle PNG client-side export and download using dgm canvas rendering
 */
export async function exportWhiteboardToPNG(
  editor: Editor | null,
  boardName?: string | null,
  isDarkMode = false
): Promise<void> {
  if (!editor) return;
  try {
    const page =
      typeof (editor as any).getCurrentPage === 'function'
        ? (editor as any).getCurrentPage()
        : (editor as any).currentPage ||
          (typeof (editor as any).getDoc === 'function'
            ? (editor as any).getDoc()
            : (editor as any).doc);

    const shapes = (page?.children || []).filter(
      (s: any) =>
        s &&
        s !== page &&
        !(s instanceof Page) &&
        !(s instanceof Doc) &&
        s.type !== 'Page' &&
        s.type !== 'Doc'
    );
    const bounds = calculateShapesBoundingBox(shapes, 30);
    const width = Math.max(10, bounds.width);
    const height = Math.max(10, bounds.height);

    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      const dpr =
        typeof window !== 'undefined' && window.devicePixelRatio
          ? Math.max(2, window.devicePixelRatio)
          : 2;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = isDarkMode ? '#121212' : '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const svgString = serializeDgmToSvg(editor, isDarkMode);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      if (typeof Image !== 'undefined') {
        await new Promise<void>((resolve) => {
          const img = new Image();
          let settled = false;
          const finish = () => {
            if (!settled) {
              settled = true;
              URL.revokeObjectURL(url);
              resolve();
            }
          };
          img.onload = () => {
            try {
              if (ctx) {
                ctx.drawImage(img, 0, 0, width * dpr, height * dpr);
              }
            } catch {}
            finish();
          };
          img.onerror = () => {
            finish();
          };
          setTimeout(finish, 50);
          img.src = url;
        });
      }

      if (typeof canvas.toBlob === 'function') {
        canvas.toBlob((blob) => {
          if (blob) {
            downloadBlob(blob, `${sanitizeFilename(boardName)}.png`);
          }
        }, 'image/png');
      } else if (typeof canvas.toDataURL === 'function') {
        try {
          const dataUrl = canvas.toDataURL('image/png');
          const base64Data = dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
          const byteString = atob(base64Data);
          const ia = new Uint8Array(byteString.length);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([ia], { type: 'image/png' });
          downloadBlob(blob, `${sanitizeFilename(boardName)}.png`);
        } catch {}
      }
    }
  } catch (err) {
    console.error('Failed to export whiteboard to PNG:', err);
  }
}
