const json = async (res) => {
  const t = await res.text();
  try { return JSON.parse(t); } catch (e) { return t; }
};

export async function getCurrentScan() {
  const res = await fetch('/api/scans/current');
  if (!res.ok) throw new Error('failed to load current scan');
  return json(res);
}

export async function createScan() {
  const res = await fetch('/api/scans', { method: 'POST' });
  if (!res.ok) throw new Error('failed to create scan');
  return json(res);
}

export async function getScan(scanId) {
  const res = await fetch(`/api/scans/${scanId}`);
  if (!res.ok) throw new Error('failed to get scan');
  return json(res);
}

export async function uploadScanImage(scanId, slotId, file, width = null, height = null) {
  const fd = new FormData();
  fd.append('image', file);
  fd.append('slotId', slotId);
  if (width) fd.append('width', String(width));
  if (height) fd.append('height', String(height));

  const res = await fetch(`/api/scans/${scanId}/images`, {
    method: 'POST',
    body: fd,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || 'upload failed');
    err.info = body;
    throw err;
  }

  return json(res);
}

export async function deleteScanImage(scanId, imageId) {
  const res = await fetch(`/api/scans/${scanId}/images/${imageId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('failed to delete image');
  return json(res);
}

export async function deleteScan(scanId) {
  const res = await fetch(`/api/scans/${scanId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('failed to delete scan');
  return json(res);
}
