import express from 'express';
import multer from 'multer';
import { SCAN_SLOTS } from '../../src/data/scanSlots.js';
import { validateObservation } from '../services/visionObservationSchema.js';
import { ConfigError, ProviderError, SchemaError } from '../services/visionObserver.js';
import path from "path";

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

// Analyze a scan using the configured vision observer
router.post('/:scanId/analyze', async (req, res) => {
  const { scanId } = req.params;
  const scan = await req.app.locals.scanStore.getScan(scanId);
  if (!scan) return res.status(404).json({ error: 'scan not found' });

  const observer = req.app.locals.visionObserver;
  if (!observer || typeof observer.analyzeScan !== 'function') {
    return res.status(503).json({ error: 'vision observer not available' });
  }

  // Build imageFiles array: [{ slotId, image, path }]
  const uploadHelpers = req.app.locals.uploadHelpers;
  const imageFiles = [];
  for (const [slotId, imgs] of Object.entries(scan.slots || {})) {
    for (const img of imgs) {
      const p = uploadHelpers
  ? (
      uploadHelpers.uploadsPath
        ? path.join(
            uploadHelpers.uploadsPath,
            img.storedFileName
          )
        : null
    )
  : null;
      imageFiles.push({ slotId, image: img, path: p });
    }
  }

  // Diagnostic logging (temporary): report scan and imageFiles info before analysis
  try {
    console.info('[diagnostic] analyze request', { scanId, imageFilesCount: imageFiles.length });
    for (const f of imageFiles) {
      const sf = f.image && f.image.storedFileName ? f.image.storedFileName : null;
      const exists = f.path ? require('fs').existsSync(f.path) : false;
      // Do NOT log file contents or data URIs
      console.info('[diagnostic] image', { slotId: f.slotId, storedFileName: sf, path: f.path || null, exists });
    }
  } catch (diagErr) {
    // swallow diagnostic errors to avoid changing behavior
    // eslint-disable-next-line no-console
    console.error('[diagnostic] analyze logging failed', diagErr && diagErr.message ? diagErr.message : diagErr);
  }

  try {
    const result = await observer.analyzeScan({ scan, imageFiles });

    // result expected shape: { model, observation }
    const obs = result && result.observation ? result.observation : result;
    const validObs = validateObservation(obs, scan);
    if (!validObs) {
      return res.status(502).json({ error: 'invalid analysis result' });
    }

    const analysisRecord = {
      model: result && result.model ? result.model : (observer && observer.model) || 'unknown',
      schemaVersion: obs.version || 1,
      status: 'completed',
      observation: obs,
    };

    const saved = await req.app.locals.scanStore.addAnalysisToScan(scanId, analysisRecord);
    res.status(201).json({ analysis: saved, scan: await req.app.locals.scanStore.getScan(scanId) });
  } catch (err) {
    // classify errors
    // eslint-disable-next-line no-console
    console.error('analysis error', err && err.stack ? err.stack : err && err.message ? err.message : err);
    if (err instanceof ConfigError) {
      return res.status(503).json({ error: 'Vision analysis is not configured.' });
    }
    if (err instanceof ProviderError || err instanceof SchemaError) {
      return res.status(502).json({ error: 'analysis provider error' });
    }
    return res.status(500).json({ error: 'analysis failed' });
  }
});

export default router;
