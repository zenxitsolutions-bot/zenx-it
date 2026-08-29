import multer from 'multer';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const uploadDir = path.join(process.cwd(), 'uploads', 'company-logos');
if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' }[file.mimetype] || '';
    cb(null, `${req.params.id}${ext}`);
  },
});

export const uploadCompanyLogo = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, ALLOWED_MIME.has(file.mimetype)),
});
