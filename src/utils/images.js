// Utilities for handling image files in the Scan UI.

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB

export function isImageFile(file) {
  if (!file || typeof file.type !== 'string') return false;
  return file.type.startsWith('image/');
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function readImageDimensions(file) {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || null;
        const h = img.naturalHeight || null;
        URL.revokeObjectURL(url);
        resolve({ width: w, height: h });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ width: null, height: null });
      };
      img.src = url;
    } catch (e) {
      resolve({ width: null, height: null });
    }
  });
}

// Placeholder for future resizing/compression work. For now it is a
// pass-through that returns the same file. Later this will accept options
// and return a processed Blob/File.
export async function prepareImageForUpload(file) {
  // TODO: implement client-side resizing/compression in Phase 6B.
  return file;
}
