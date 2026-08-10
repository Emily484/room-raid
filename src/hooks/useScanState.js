import { useCallback, useMemo, useState, useEffect } from 'react';
import { SCAN_SLOTS } from '../data/scanSlots';
import * as scansApi from '../api/scans.js';

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
  const [scan, setScan] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // filesRef remains for local optimistic previews (kept minimal)
  const filesRef = useState(() => ({}))[0];

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        let current = await scansApi.getCurrentScan().catch(() => null);
        if (!current) {
          current = await scansApi.createScan();
        }
        if (!mounted) return;
        setScan(current);
      } catch (e) {
        setError(e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const refreshScan = useCallback(async () => {
    try {
      const s = await scansApi.getCurrentScan();
      setScan(s);
      return s;
    } catch (e) {
      setError(e);
      throw e;
    }
  }, []);

  const addImage = useCallback(async (slotId, file, meta) => {
    if (!scan || !scan.id) throw new Error('no scan');
    // upload to server
    try {
      const result = await scansApi.uploadScanImage(scan.id, slotId, file, meta.width, meta.height);
      // result: { image, scan }
      setScan(result.scan);
      return result.image;
    } catch (e) {
      setError(e);
      throw e;
    }
  }, [scan]);

  const removeImage = useCallback(async (slotId, imageId) => {
    if (!scan || !scan.id) throw new Error('no scan');
    try {
      const result = await scansApi.deleteScanImage(scan.id, imageId);
      setScan(result.scan);
      return true;
    } catch (e) {
      setError(e);
      throw e;
    }
  }, [scan]);

  const clearScan = useCallback(async () => {
    if (!scan || !scan.id) throw new Error('no scan');
    try {
      await scansApi.deleteScan(scan.id);
      // create fresh scan
      const fresh = await scansApi.createScan();
      setScan(fresh);
      return fresh;
    } catch (e) {
      setError(e);
      throw e;
    }
  }, [scan]);

  const totalImages = useMemo(() => (scan ? Object.values(scan.slots || {}).flat().length : 0), [scan]);

  return {
    scan,
    loading,
    error,
    addImage,
    removeImage,
    clearScan,
    refreshScan,
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
