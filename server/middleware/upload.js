import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

function generateFilename(originalName) {
  const ext = path.extname(originalName) || '';
  const base = crypto.randomBytes(12).toString('hex');
  return `${Date.now()}-${base}${ext}`;
}

export function createUploadHelpers({ uploadsDir } = {}) {
  const uploadsPath = uploadsDir || path.join(process.cwd(), 'server', 'uploads');

  function ensureUploadsDir() {
    if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      ensureUploadsDir();
      cb(null, uploadsPath);
    },
    filename: function (req, file, cb) {
      cb(null, generateFilename(file.originalname));
    }
  });

  function fileFilter(req, file, cb) {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('invalid mime type'), false);
    }
    cb(null, true);
  }

  async function deleteFile(filename) {
    const p = path.join(uploadsPath, filename);
    try {
      await fs.promises.unlink(p);
      return true;
    } catch (e) {
      return false;
    }
  }

  return { ensureUploadsDir, storage, fileFilter, deleteFile, uploadsPath };
}
