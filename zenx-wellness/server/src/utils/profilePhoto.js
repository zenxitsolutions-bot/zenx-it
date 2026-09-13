import { ApiError } from './ApiError.js';

export const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024;

// Inspect the bytes rather than trusting a client-provided filename or Content-Type.
// SVG and other active document formats are never accepted or served.
export function profilePhotoMime(buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw ApiError.badRequest('Choose a photo to upload.');
  if (buffer.length > MAX_PROFILE_PHOTO_BYTES) throw ApiError.badRequest('Choose a photo smaller than 2 MB.');
  if (buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && buffer.toString('ascii',12,16) === 'IHDR') return 'image/png';
  if (buffer.length >= 12 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff && buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9) return 'image/jpeg';
  if (buffer.length >= 20 && buffer.toString('ascii',0,4) === 'RIFF' && buffer.toString('ascii',8,12) === 'WEBP' && ['VP8 ', 'VP8L', 'VP8X'].includes(buffer.toString('ascii',12,16))) return 'image/webp';
  throw ApiError.badRequest('Choose a valid JPG, PNG, or WebP photo.');
}
