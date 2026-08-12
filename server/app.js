import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import scansRouter from './routes/scans.js';
import { createUploadHelpers } from './middleware/upload.js';
import { createScanStore } from './services/scanStore.js';
import { createRealVisionObserver } from './services/visionObserver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp({ dataDir, uploadsDir, visionObserver } = {}) {
  const app = express();
  app.use(express.json());

  // create injectable helpers
  const uploadHelpers = createUploadHelpers({ uploadsDir });
  const scanStore = createScanStore({ dataDir, uploadsDir, deleteUploadedFileFn: uploadHelpers.deleteFile });

  // visionObserver injection (mockable in tests)
  let observer = visionObserver || null;
  if (!observer) {
    const apiKey = process.env.OPENAI_API_KEY || null;
    if (apiKey) {
      try {
        observer = createRealVisionObserver({ apiKey, model: process.env.OPENAI_VISION_MODEL });
      } catch (e) {
        // don't crash the server if creation fails; leave observer null
        // eslint-disable-next-line no-console
        console.error('vision observer not initialized:', e && e.message ? e.message : e);
        observer = null;
      }
    }
  }


  // mount routes with store injection by attaching to req.app.locals
  app.locals.scanStore = scanStore;
  app.locals.uploadHelpers = uploadHelpers;
  app.locals.visionObserver = observer;

  // ensure uploads dir exists
  uploadHelpers.ensureUploadsDir();

  // Mount API routes (routes import uses app.locals.scanStore internally)
  app.use('/api/scans', scansRouter);

  // Health endpoint
  app.get('/api/health', (req, res) => {
    res.json({ ok: true });
  });

  // Serve uploaded files under /api/uploads
  const uploadsPath = uploadHelpers.uploadsPath;
  app.use('/api/uploads', express.static(uploadsPath, { index: false }));

  // Basic error handler to convert errors to JSON
  app.use((err, req, res, next) => {
    // multer fileFilter throws an Error object; detect common multer errors
    if (err && (err.code === 'LIMIT_FILE_SIZE' || err.message === 'invalid mime type')) {
      return res.status(400).json({ error: err.message || 'invalid upload' });
    }
    if (err) {
      // generic 500 safe message
      // eslint-disable-next-line no-console
      console.error('API error', err && err.stack ? err.stack : err);
      return res.status(500).json({ error: 'internal server error' });
    }
    return next();
  });

  return app;
}

export default createApp;
