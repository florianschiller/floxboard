import { themeColors } from '@dgmjs/core';

/**
 * Resolve DGM theme color tokens ($foreground, $background, $gray1..12, etc.) to valid CSS/hex strings
 */
export function resolveDgmColor(color?: string, isDarkMode = false): string {
  if (!color) return isDarkMode ? '#ffffff' : '#000000';
  if (color === 'transparent' || color === 'none' || color === '$transparent') return 'none';
  if (color.startsWith('$')) {
    const token = color.substring(1);
    const palette = (isDarkMode ? themeColors?.dark : themeColors?.light) as Record<string, string> | undefined;
    if (palette && palette[token]) {
      const val = palette[token];
      if (token === 'transparent') return 'none';
      return val;
    }
    if (token === 'background') return isDarkMode ? '#121212' : '#ffffff';
    if (token === 'foreground') return isDarkMode ? '#ffffff' : '#000000';
    return isDarkMode ? '#ffffff' : '#000000';
  }
  return color;
}
