import express from 'express';
import multer from 'multer';
import { SCAN_SLOTS } from '../../src/data/scanSlots.js';

const router = express.Router();

// Note: upload helpers and scanStore are provided via app.locals by createApp

function makeUploadMiddleware(uploadHelpers) {
  return multer({ storage: uploadHelpers.storage, fileFilter: uploadHelpers.fileFilter, limits: { fileSize: 15 * 1024 * 1024 } });
}

function isValidSlot(slotId) {
  return SCAN_SLOTS.some(s => s.id === slotId);
}

router.get('/current', async (req, res) => {
  try {
    const scan = await req.app.locals.scanStore.getCurrentScan();
    res.json(scan);
  } catch (e) {
    res.status(500).json({ error: 'failed to read scans' });
  }
});

router.post('/', async (req, res) => {
  try {
    const scan = await req.app.locals.scanStore.createScan();
    res.status(201).json(scan);
  } catch (e) {
    res.status(500).json({ error: 'failed to create scan' });
  }
});

router.get('/:scanId', async (req, res) => {
  const { scanId } = req.params;
  const scan = await req.app.locals.scanStore.getScan(scanId);
  if (!scan) return res.status(404).json({ error: 'not found' });
  res.json(scan);
});

// Upload image to a scan slot
router.post('/:scanId/images', (req, res, next) => {
  const upload = makeUploadMiddleware(req.app.locals.uploadHelpers);
  return upload.single('image')(req, res, next);
}, async (req, res) => {
  const { scanId } = req.params;
  const { slotId, width, height } = req.body;

  if (!isValidSlot(slotId)) {
    // if multer already saved a file, remove it to avoid orphans
    if (req.file && req.app.locals && req.app.locals.scanStore && typeof req.app.locals.scanStore.deleteUploadedFile === 'function') {
      try { await req.app.locals.scanStore.deleteUploadedFile(req.file.filename); } catch (e) {}
    }
    return res.status(400).json({ error: 'invalid slotId' });
  }

  const scan = await req.app.locals.scanStore.getScan(scanId);
  if (!scan) return res.status(404).json({ error: 'scan not found' });

  if (!req.file) return res.status(400).json({ error: 'no file uploaded' });

  // enforce slot max images
  const slotDef = SCAN_SLOTS.find(s => s.id === slotId);
  const currentCount = (scan.slots[slotId] || []).length;
  if (currentCount >= slotDef.maxImages) {
    // delete the uploaded file
    await req.app.locals.scanStore.deleteUploadedFile(req.file.filename);
    return res.status(400).json({ error: 'slot full' });
  }

  const image = await req.app.locals.scanStore.addImageToScan(scanId, {
    slotId,
    originalFileName: req.file.originalname,
    storedFileName: req.file.filename,
    mimeType: req.file.mimetype,
    size: req.file.size,
    width: width ? parseInt(width, 10) : null,
    height: height ? parseInt(height, 10) : null,
  });
  res.status(201).json({ image, scan: await req.app.locals.scanStore.getScan(scanId) });
});

// Delete image
router.delete('/:scanId/images/:imageId', async (req, res) => {
  const { scanId, imageId } = req.params;
  const scan = await req.app.locals.scanStore.getScan(scanId);
  if (!scan) return res.status(404).json({ error: 'scan not found' });

  const deleted = await req.app.locals.scanStore.removeImageFromScan(scanId, imageId);
  if (!deleted) return res.status(404).json({ error: 'image not found' });

  res.json({ scan: await req.app.locals.scanStore.getScan(scanId) });
});

// Delete entire scan
router.delete('/:scanId', async (req, res) => {
  const { scanId } = req.params;
  const ok = await req.app.locals.scanStore.deleteScan(scanId);
  if (!ok) return res.status(404).json({ error: 'scan not found' });
  res.json({ ok: true });
});

export default router;
