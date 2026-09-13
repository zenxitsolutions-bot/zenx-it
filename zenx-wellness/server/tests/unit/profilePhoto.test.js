import test from 'node:test';
import assert from 'node:assert/strict';
import { profilePhotoMime, MAX_PROFILE_PHOTO_BYTES } from '../../src/utils/profilePhoto.js';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aSgAAAABJRU5ErkJggg==', 'base64');
test('accepts a PNG by its actual content', () => assert.equal(profilePhotoMime(png), 'image/png'));
test('rejects active content even if named as an image', () => assert.throws(() => profilePhotoMime(Buffer.from('<svg onload="alert(1)"></svg>')), /valid JPG/));
test('rejects empty, truncated and oversized uploads', () => {
  assert.throws(() => profilePhotoMime(undefined), /Choose a photo/);
  assert.throws(() => profilePhotoMime(png.subarray(0, 8)), /valid JPG/);
  assert.throws(() => profilePhotoMime(Buffer.alloc(MAX_PROFILE_PHOTO_BYTES + 1)), /smaller than 2 MB/);
});
