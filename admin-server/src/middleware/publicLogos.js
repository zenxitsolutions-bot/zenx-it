import { Router } from 'express';
import path from 'node:path';
import { ApiError } from '../utils/ApiError.js';
import { safeDownloadType } from '../utils/uploadContent.js';

// Only company logos are public. Do not expose every present/future uploads
// subdirectory or infer active document types for legacy files.
export function publicLogos(root = path.join(process.cwd(), 'uploads', 'company-logos')) {
  const router = Router();
  router.get('/:filename', (req, res, next) => {
    const filename = req.params.filename;
    const type = safeDownloadType(filename);
    if (!/^[a-z0-9_.-]+\.(?:png|jpe?g|webp)$/i.test(filename) || filename.startsWith('.') || !type.startsWith('image/')) {
      return next(ApiError.notFound('Logo not found'));
    }
    res.setHeader('Content-Type', type);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.sendFile(filename, { root, dotfiles: 'deny' }, (error) => {
      if (!error) return;
      if (res.headersSent) return next(error);
      res.removeHeader('Content-Type');
      next(error.code === 'ENOENT' ? ApiError.notFound('Logo not found') : error);
    });
  });
  return router;
}
