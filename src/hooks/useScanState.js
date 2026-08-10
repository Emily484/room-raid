import { useCallback, useMemo, useState, useEffect } from 'react';
import { SCAN_SLOTS } from '../data/scanSlots';

function makeEmptyScan() {
  const slots = Object.fromEntries(
    SCAN_SLOTS.map((s) => [s.id, []])
  );

  const now = new Date().toISOString();
  return {
    id: `scan-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    slots,
  };
}

// The hook keeps File objects and preview URLs in component/session memory.
// Only safe metadata may be persisted externally. For now we keep everything
// in memory; scans are session-only and image files do not survive refresh.
export function useScanState(initial = null) {
  const [scan, setScan] = useState(() => initial ?? makeEmptyScan());
  // Keep a parallel in-memory map of files/preview URLs; not persisted.
  const filesRef = useState(() => ({}))[0];

  // Cleanup on unmount: revoke any remaining object URLs. This effect
  // runs when the hook owner unmounts (e.g., App unmount). It intentionally
  // does not run on route navigation while App remains mounted.
  // We reference filesRef directly which is a stable object.
  useEffect(() => {
    return () => {
      // revoke any remaining object URLs on unmount
      try {
        for (const k of Object.keys(filesRef)) {
          try { URL.revokeObjectURL(filesRef[k].previewUrl); } catch (e) {}
          delete filesRef[k];
        }
      } catch (e) {
        // swallow cleanup errors
      }
    };
  }, [filesRef]);

  const addImage = useCallback(async (slotId, file, meta) => {
    setScan((current) => {
      const now = new Date().toISOString();
      const next = {
        ...current,
        slots: { ...current.slots, [slotId]: [...(current.slots[slotId] ?? []), meta] },
        updatedAt: now,
      };
      return next;
    });

    // store File object and preview url in filesRef under meta.id
    filesRef[meta.id] = { file, previewUrl: meta.previewUrl };
  }, [filesRef]);

  const removeImage = useCallback((slotId, imageId) => {
    setScan((current) => {
      const now = new Date().toISOString();
      const nextSlot = (current.slots[slotId] ?? []).filter((i) => i.id !== imageId);
      const next = { ...current, slots: { ...current.slots, [slotId]: nextSlot }, updatedAt: now };
      return next;
    });

    if (filesRef[imageId]) {
      const { previewUrl } = filesRef[imageId];
      try { URL.revokeObjectURL(previewUrl); } catch (e) {}
      delete filesRef[imageId];
    }
  }, [filesRef]);

  const replaceImage = useCallback((slotId, imageId, newFile, newMeta) => {
    setScan((current) => {
      const now = new Date().toISOString();
      const nextSlot = (current.slots[slotId] ?? []).map((i) => (i.id === imageId ? newMeta : i));
      const next = { ...current, slots: { ...current.slots, [slotId]: nextSlot }, updatedAt: now };
      return next;
    });

    if (filesRef[imageId]) {
      try { URL.revokeObjectURL(filesRef[imageId].previewUrl); } catch (e) {}
      delete filesRef[imageId];
    }
    filesRef[newMeta.id] = { file: newFile, previewUrl: newMeta.previewUrl };
  }, [filesRef]);

  const clearScan = useCallback(() => {
    // revoke all object URLs
    for (const k of Object.keys(filesRef)) {
      try { URL.revokeObjectURL(filesRef[k].previewUrl); } catch (e) {}
      delete filesRef[k];
    }
    setScan(makeEmptyScan());
  }, [filesRef]);

  const getFileForId = useCallback((id) => filesRef[id]?.file, [filesRef]);
  const getPreviewForId = useCallback((id) => filesRef[id]?.previewUrl, [filesRef]);

  const totalImages = useMemo(() => Object.values(scan.slots).flat().length, [scan]);

  return {
    scan,
    addImage,
    removeImage,
    replaceImage,
    clearScan,
    getFileForId,
    getPreviewForId,
    totalImages,
  };
}

// Testable helpers: revoke a single preview URL and revoke/clear all from a files map.
export function revokePreviewUrl(url) {
  try { URL.revokeObjectURL(url); } catch (e) {}
}

export function revokeAllFromFilesMap(filesMap) {
  if (!filesMap || typeof filesMap !== 'object') return;
  for (const k of Object.keys(filesMap)) {
    try { URL.revokeObjectURL(filesMap[k].previewUrl); } catch (e) {}
    delete filesMap[k];
  }
}
