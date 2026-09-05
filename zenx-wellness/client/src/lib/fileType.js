// What the built-in report viewer can render inline, by file extension — everything else still
// downloads fine, it just can't be previewed in the browser.
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'];

export function getFilePreviewKind(fileName) {
  const ext = fileName?.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext && IMAGE_EXTENSIONS.includes(ext)) return 'image';
  return 'unsupported';
}
