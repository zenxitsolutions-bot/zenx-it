import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';
import { MAX_PROFILE_PHOTO_BYTES } from '../utils/profilePhoto.js';

const receivePhoto = multer({
  storage: multer.memoryStorage(),
  // Busboy emits partsLimit when the count reaches its limit, including the
  // completed file part. Allow that closing boundary; files/fields stay strict.
  limits: { fileSize: MAX_PROFILE_PHOTO_BYTES, files: 1, fields: 0, parts: 2 },
}).single('photo');

export function uploadProfilePhoto(req, res, next) {
  receivePhoto(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      return next(ApiError.badRequest(error.code === 'LIMIT_FILE_SIZE'
        ? 'Choose a photo smaller than 2 MB.'
        : 'Upload one photo using the photo field.'));
    }
    next(error);
  });
}
