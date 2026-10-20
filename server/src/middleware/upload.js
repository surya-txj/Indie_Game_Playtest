import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { env } from '../config/env.js';
import { MAX_SCREENSHOT_BYTES, MAX_SCREENSHOTS } from '../constants.js';
import { ApiError } from '../utils/ApiError.js';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const UPLOAD_ROOT = path.resolve(serverRoot, env.UPLOAD_DIR);
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const EXTENSIONS = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };

const storage = multer.diskStorage({
  destination: UPLOAD_ROOT,
  // Random names: the client never chooses a path on disk.
  filename: (req, file, cb) => cb(null, `${crypto.randomBytes(16).toString('hex')}${EXTENSIONS[file.mimetype]}`),
});

function fileFilter(req, file, cb) {
  if (!EXTENSIONS[file.mimetype]) {
    return cb(ApiError.badRequest('Only PNG, JPEG or WebP screenshots are allowed', [
      { path: 'screenshots', message: `unsupported type ${file.mimetype}` },
    ]));
  }
  cb(null, true);
}

const multerScreenshots = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SCREENSHOT_BYTES, files: MAX_SCREENSHOTS, fields: 20, fieldSize: 64 * 1024 },
}).array('screenshots', MAX_SCREENSHOTS);

function sniffType(buf) {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

/** Checks each saved file's magic bytes against its declared MIME type. */
async function verifyMagicBytes(req) {
  for (const file of req.files ?? []) {
    const handle = await fs.promises.open(file.path, 'r');
    try {
      const { buffer, bytesRead } = await handle.read(Buffer.alloc(12), 0, 12, 0);
      if (sniffType(buffer.subarray(0, bytesRead)) !== file.mimetype) {
        throw ApiError.badRequest('File content does not match an image type', [
          { path: 'screenshots', message: `${file.originalname} is not a valid ${file.mimetype}` },
        ]);
      }
    } finally {
      await handle.close();
    }
  }
}

/** multer + magic-byte check. On any error the error handler deletes the saved files. */
export function uploadScreenshots(req, res, next) {
  multerScreenshots(req, res, (err) => {
    if (err) return next(err);
    verifyMagicBytes(req).then(() => next(), next);
  });
}

export function screenshotPath(filename) {
  const full = path.resolve(UPLOAD_ROOT, path.basename(filename));
  return full.startsWith(UPLOAD_ROOT) ? full : null;
}
