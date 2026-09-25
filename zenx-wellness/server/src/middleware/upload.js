import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { ApiError } from '../utils/ApiError.js';
import { inspectUpload } from '../utils/uploadContent.js';

// Single source of truth for the on-disk uploads directory — report.controller.js's file-read
// endpoint imports this too, so the write side (here) and the read side can never silently
// resolve to two different directories.
export const uploadsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

// Receive bounded data in memory; controllers persist only AFTER resource authorization.
export const upload = {
  single(field) {
    const receive = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 1, fieldSize: 4000, parts: 3 },
    }).single(field);
    return (req, res, next) => receive(req, res, (error) => {
      if (error instanceof multer.MulterError) return next(ApiError.badRequest(error.code === 'LIMIT_FILE_SIZE'
        ? 'Choose a file smaller than 10 MB.' : 'Upload one file with a note of at most 4,000 bytes.'));
      if (error) return next(error);
      try {
        if (req.file) Object.assign(req.file, inspectUpload(req.file, { maxBytes: MAX_UPLOAD_BYTES, allowPdf: field === 'file' }));
        next();
      } catch (validationError) { next(validationError); }
    });
  },
};

export async function persistUpload(file) {
  if (!file?.extension || !/^(png|jpg|webp|pdf)$/.test(file.extension)) throw ApiError.badRequest('Invalid upload.');
  const filename = `${randomUUID()}.${file.extension}`;
  await mkdir(uploadsDir, { recursive: true, mode: 0o700 });
  await writeFile(path.join(uploadsDir, filename), file.buffer, { flag: 'wx', mode: 0o600 });
  return filename;
}
