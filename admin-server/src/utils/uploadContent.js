import { ApiError } from './ApiError.js';

const extensions = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'application/pdf': 'pdf' };

// File signatures are a second check, not an antivirus scanner. Never accept active SVG/HTML.
export function inspectUpload(file, { maxBytes, allowPdf = false }) {
  const buffer = file?.buffer;
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw ApiError.badRequest('Choose a non-empty file.');
  if (buffer.length > maxBytes) throw ApiError.badRequest(`Choose a file smaller than ${maxBytes / 1024 / 1024} MB.`);
  let mime;
  if (buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && buffer.toString('ascii', 12, 16) === 'IHDR') mime = 'image/png';
  else if (buffer.length >= 12 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff && buffer.at(-2) === 0xff && buffer.at(-1) === 0xd9) mime = 'image/jpeg';
  else if (buffer.length >= 20 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' && ['VP8 ', 'VP8L', 'VP8X'].includes(buffer.toString('ascii', 12, 16))) mime = 'image/webp';
  else if (allowPdf && /^%PDF-[12]\.\d/.test(buffer.toString('ascii', 0, 8)) && buffer.subarray(-1024).includes(Buffer.from('%%EOF'))) mime = 'application/pdf';
  if (!mime) throw ApiError.badRequest(allowPdf ? 'Choose a valid PDF, JPG, PNG, or WebP file.' : 'Choose a valid JPG, PNG, or WebP image.');
  if (file.mimetype && file.mimetype !== 'application/octet-stream' && file.mimetype !== mime) {
    throw ApiError.badRequest('The file contents do not match its file type.');
  }
  const originalname = String(file.originalname || 'upload').split(/[\\/]/).at(-1).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 240) || 'upload';
  const extension = extensions[mime];
  const suffix = originalname.split('.').at(-1).toLowerCase();
  if (!([extension, ...(extension === 'jpg' ? ['jpeg'] : [])].includes(suffix))) {
    throw ApiError.badRequest('The filename extension does not match the file contents.');
  }
  return { mime, extension, originalname };
}

export function safeDownloadType(filename) {
  const extension = String(filename).split('.').at(-1).toLowerCase();
  return { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' }[extension] || 'application/octet-stream';
}
