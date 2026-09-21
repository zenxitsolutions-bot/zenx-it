// Scope cached private image bytes to both the viewer and the pictured user.
// A missing peer must not silently fall back to the signed-in person's photo.
export function profileUserId(value) {
  const id = value && typeof value === 'object' ? value._id ?? value.id : value;
  return typeof id === 'string' || typeof id === 'number' ? String(id).trim() || null : null;
}

export function profilePhotoKey(viewerId, targetId) {
  return ['profile-photo', profileUserId(viewerId), profileUserId(targetId)];
}

export function profileInitial(name) {
  return Array.from(String(name ?? '').trim())[0]?.toUpperCase() || '?';
}
