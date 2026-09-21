/**
 * Trigger browser file download for a given Blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof window === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Helper to sanitize filename
 */
export function sanitizeFilename(name?: string | null, fallback = 'whiteboard'): string {
  if (!name || !name.trim()) return fallback;
  return name.trim().replace(/[\\/:*?"<>|]/g, '_');
}
