export const VISUAL_AIDS_STORAGE_KEY = 'openalibi-visual-aids';
export const COLOR_VISION_STORAGE_KEY = 'openalibi-color-vision';
export const COLOR_VISION_MODES = Object.freeze([
  'standard',
  'red-green',
  'blue-yellow',
  'monochrome',
]);

export function resolveVisualAidsPreference(storedValue, prefersMoreContrast = false) {
  if (storedValue === 'true') return true;
  if (storedValue === 'false') return false;
  return Boolean(prefersMoreContrast);
}

export function normalizeColorVisionMode(value) {
  return COLOR_VISION_MODES.includes(value) ? value : 'standard';
}
