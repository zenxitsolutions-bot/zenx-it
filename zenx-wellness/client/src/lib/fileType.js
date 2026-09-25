// What the built-in report viewer can render inline, by file extension — everything else still
// downloads fine, it just can't be previewed in the browser.
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];

export function getFilePreviewKind(fileName, contentType) {
  const ext = fileName?.split('.').pop()?.toLowerCase();
  if (contentType !== undefined) {
    const mime = contentType.split(';')[0].trim().toLowerCase();
    if (ext === 'pdf' && mime === 'application/pdf') return 'pdf';
    const imageTypes = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
    return imageTypes[ext] === mime ? 'image' : 'unsupported';
  }
  if (ext === 'pdf') return 'pdf';
  if (ext && IMAGE_EXTENSIONS.includes(ext)) return 'image';
  return 'unsupported';
}
