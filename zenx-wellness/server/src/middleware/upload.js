import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Single source of truth for the on-disk uploads directory — report.controller.js's file-read
// endpoint imports this too, so the write side (here) and the read side can never silently
// resolve to two different directories.
export const uploadsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');

const storage = multer.diskStorage({
  destination: uploadsDir,
  // path.basename strips any directory components from the client-supplied original filename
  // before it ever reaches the filesystem — multer does not sanitize this itself, so an
  // originalname containing `../` or `/` would otherwise let a malicious upload write outside
  // uploadsDir (a path-traversal write), and the resulting filePath would carry the same risk on
  // every future read of it. Found while fixing the file-read path for this same bug (spec
  // §2026-round2-fixes item 6) — flagged and fixed alongside it since it's the same file-naming
  // code path, not a separate task.
  filename: (req, file, cb) => cb(null, `${Date.now()}-${path.basename(file.originalname)}`),
});

export const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
