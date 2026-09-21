import { Editor, Page, Doc } from '@dgmjs/core';
import { downloadBlob, sanitizeFilename } from './downloadUtils';
import { calculateShapesBoundingBox } from './boundsCalculator';
import { serializeDgmToSvg } from './svgExport';

/**
 * Generate a valid PDF 1.4 binary blob embedding an image / canvas
 */
export function generatePdfDocument(
  imageDataUrl: string,
  widthPt: number,
  heightPt: number,
  pixelWidth?: number,
  pixelHeight?: number
): Blob {
  let imageBytes: Uint8Array;
  try {
    const base64Data = imageDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
    if (typeof atob === 'function') {
      const binaryString = atob(base64Data);
      imageBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        imageBytes[i] = binaryString.charCodeAt(i);
      }
    } else {
      imageBytes = new Uint8Array(0);
    }
  } catch {
    imageBytes = new Uint8Array(0);
  }

  const imgWidth = pixelWidth || Math.round(widthPt * 2);
  const imgHeight = pixelHeight || Math.round(heightPt * 2);

  // Construct PDF Objects
  // 1: Catalog, 2: Pages, 3: Page, 4: Image XObject, 5: Contents
  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${widthPt.toFixed(
    2
  )} ${heightPt.toFixed(
    2
  )}] /Contents 5 0 R /Resources << /ProcSet [/PDF /ImageB /ImageC /ImageI] /XObject << /Im1 4 0 R >> >> >>\nendobj\n`;
  const obj4Header = `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgWidth} /Height ${imgHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`;
  const obj4Footer = '\nendstream\nendobj\n';
  const contentStream = `q\n${widthPt.toFixed(2)} 0 0 ${heightPt.toFixed(2)} 0 0 cm\n/Im1 Do\nQ\n`;
  const obj5 = `5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`;

  // Assemble full PDF with binary image stream
  const header = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const enc = new TextEncoder();

  const hBytes = enc.encode(header);
  const o1Bytes = enc.encode(obj1);
  const o2Bytes = enc.encode(obj2);
  const o3Bytes = enc.encode(obj3);
  const o4HBytes = enc.encode(obj4Header);
  const o4FBytes = enc.encode(obj4Footer);
  const o5Bytes = enc.encode(obj5);

  const offset1 = hBytes.length;
  const offset2 = offset1 + o1Bytes.length;
  const offset3 = offset2 + o2Bytes.length;
  const offset4 = offset3 + o3Bytes.length;
  const offset5 = offset4 + o4HBytes.length + imageBytes.length + o4FBytes.length;
  const xrefOffset = offset5 + o5Bytes.length;

  const xref = `xref
0 6
0000000000 65535 f 
${offset1.toString().padStart(10, '0')} 00000 n 
${offset2.toString().padStart(10, '0')} 00000 n 
${offset3.toString().padStart(10, '0')} 00000 n 
${offset4.toString().padStart(10, '0')} 00000 n 
${offset5.toString().padStart(10, '0')} 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${xrefOffset}
%%EOF
`;
  const xrefBytes = enc.encode(xref);

  const totalLength = xrefOffset + xrefBytes.length;
  const pdfBuffer = new Uint8Array(totalLength);
  let pos = 0;

  pdfBuffer.set(hBytes, pos);
  pos += hBytes.length;
  pdfBuffer.set(o1Bytes, pos);
  pos += o1Bytes.length;
  pdfBuffer.set(o2Bytes, pos);
  pos += o2Bytes.length;
  pdfBuffer.set(o3Bytes, pos);
  pos += o3Bytes.length;
  pdfBuffer.set(o4HBytes, pos);
  pos += o4HBytes.length;
  pdfBuffer.set(imageBytes, pos);
  pos += imageBytes.length;
  pdfBuffer.set(o4FBytes, pos);
  pos += o4FBytes.length;
  pdfBuffer.set(o5Bytes, pos);
  pos += o5Bytes.length;
  pdfBuffer.set(xrefBytes, pos);

  return new Blob([pdfBuffer], { type: 'application/pdf' });
}

/**
 * Handle PDF client-side export and download
 */
export async function exportWhiteboardToPDF(
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
    const width = Math.max(100, bounds.width);
    const height = Math.max(100, bounds.height);

    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      const dpr = 2;
      canvas.width = width * dpr;
      canvas.height = height * dpr;

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

      let jpegDataUrl = '';
      if (typeof canvas.toDataURL === 'function') {
        try {
          jpegDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        } catch {}
      }

      if (jpegDataUrl && jpegDataUrl.startsWith('data:image/')) {
        const pdfBlob = generatePdfDocument(jpegDataUrl, width, height, width * dpr, height * dpr);
        downloadBlob(pdfBlob, `${sanitizeFilename(boardName)}.pdf`);
      }
    }
  } catch (err) {
    console.error('Failed to export whiteboard to PDF:', err);
  }
}
