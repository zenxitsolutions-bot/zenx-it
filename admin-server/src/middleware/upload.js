import multer from 'multer';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ApiError } from '../utils/ApiError.js';
import { inspectUpload } from '../utils/uploadContent.js';

const uploadDir = path.join(process.cwd(), 'uploads', 'company-logos');
export const uploadCompanyLogo = {
  single(field) {
    const receive = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 0, parts: 2 } }).single(field);
    return (req, res, next) => receive(req, res, (error) => {
      if (error instanceof multer.MulterError) return next(ApiError.badRequest(error.code === 'LIMIT_FILE_SIZE'
        ? 'Choose a logo smaller than 2 MB.' : 'Upload one logo file.'));
      if (error) return next(error);
      try {
        if (req.file) Object.assign(req.file, inspectUpload(req.file, { maxBytes: 2 * 1024 * 1024 }));
        next();
      } catch (validationError) { next(validationError); }
    });
  },
};

export async function persistCompanyLogo(file) {
  if (!/^(png|jpg|webp)$/.test(file?.extension)) throw ApiError.badRequest('Invalid logo.');
  const filename = `${randomUUID()}.${file.extension}`;
  await mkdir(uploadDir, { recursive: true, mode: 0o700 });
  await writeFile(path.join(uploadDir, filename), file.buffer, { flag: 'wx', mode: 0o600 });
  return filename;
}
