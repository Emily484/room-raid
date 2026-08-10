import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { SCAN_SLOTS } from '../../src/data/scanSlots.js';

function generateId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
}

function makeEmptyScan() {
  const now = new Date().toISOString();
  return {
    id: generateId('scan'),
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    slots: Object.fromEntries(SCAN_SLOTS.map(s => [s.id, []])),
  };
}

export function createScanStore({ dataDir, uploadsDir, deleteUploadedFileFn } = {}) {
  const DATA_DIR = dataDir || path.join(process.cwd(), 'server', 'data');
  const SCANS_FILE = path.join(DATA_DIR, 'scans.json');
  const UPLOADS_DIR = uploadsDir || path.join(process.cwd(), 'server', 'uploads');

  function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    if (!fs.existsSync(SCANS_FILE)) fs.writeFileSync(SCANS_FILE, JSON.stringify({ scans: [], currentScanId: null }, null, 2));
  }

  function readStore() {
    ensureDataDir();
    try {
      const raw = fs.readFileSync(SCANS_FILE, 'utf-8');
      return JSON.parse(raw);
    } catch (e) {
      return { scans: [], currentScanId: null };
    }
  }

  function writeStore(data) {
    ensureDataDir();
    // atomic-ish write
    const tmp = `${SCANS_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, SCANS_FILE);
  }

  const scanStore = {
    async createScan() {
      const store = readStore();
      const scan = makeEmptyScan();
      writeStore({ ...store, scans: [...store.scans, scan], currentScanId: scan.id });
      return scan;
    },

    async getScan(scanId) {
      const store = readStore();
      return store.scans.find(s => s.id === scanId) || null;
    },

    async getCurrentScan() {
      const store = readStore();
      if (store.currentScanId) {
        return store.scans.find(s => s.id === store.currentScanId) || null;
      }
      // fallback: latest updated
      const sorted = [...store.scans].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      return sorted[0] || null;
    },

    async saveScan(scan) {
      const store = readStore();
      const scans = store.scans.filter(s => s.id !== scan.id).concat([scan]);
      const currentScanId = store.currentScanId || (scan.id);
      writeStore({ scans, currentScanId });
      return scan;
    },

    async deleteScan(scanId) {
      const store = readStore();
      const scan = store.scans.find(s => s.id === scanId);
      if (!scan) return false;
      // delete files associated
      for (const slot of Object.values(scan.slots || {})) {
        for (const img of slot) {
          if (img.storedFileName && typeof deleteUploadedFileFn === 'function') {
            try { await deleteUploadedFileFn(img.storedFileName); } catch (e) {}
          }
        }
      }
      const scans = store.scans.filter(s => s.id !== scanId);
      const currentScanId = scans.length ? scans[scans.length - 1].id : null;
      writeStore({ scans, currentScanId });
      return true;
    },

    async addImageToScan(scanId, { slotId, originalFileName, storedFileName, mimeType, size, width = null, height = null }) {
      const store = readStore();
      const scan = store.scans.find(s => s.id === scanId);
      if (!scan) throw new Error('scan not found');

      if (!scan.slots) scan.slots = {};
      if (!scan.slots[slotId]) scan.slots[slotId] = [];

      const image = {
        id: generateId('img'),
        slotId,
        originalFileName,
        storedFileName,
        mimeType,
        size,
        width,
        height,
        addedAt: new Date().toISOString(),
        url: `/api/uploads/${storedFileName}`,
      };

      scan.slots[slotId].push(image);
      scan.updatedAt = new Date().toISOString();

      writeStore(store);
      return image;
    },

    async removeImageFromScan(scanId, imageId) {
      const store = readStore();
      const scan = store.scans.find(s => s.id === scanId);
      if (!scan) return false;

      let found = null;
      for (const [slotId, items] of Object.entries(scan.slots || {})) {
        const idx = items.findIndex(i => i.id === imageId);
        if (idx !== -1) {
          found = items[idx];
          items.splice(idx, 1);
          break;
        }
      }

      if (!found) return false;

      if (found.storedFileName && typeof deleteUploadedFileFn === 'function') {
        try { await deleteUploadedFileFn(found.storedFileName); } catch (e) {}
      }

      scan.updatedAt = new Date().toISOString();
      writeStore(store);
      return true;
    },

    async deleteUploadedFile(filename) {
      if (typeof deleteUploadedFileFn === 'function') return deleteUploadedFileFn(filename);
      return false;
    }
  };

  return scanStore;
}

// default instance for production use
const defaultStore = createScanStore();
export default defaultStore;
