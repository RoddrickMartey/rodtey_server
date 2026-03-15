import sharp from 'sharp';
import cloudinary from '../config/cloudinary.js';
import { AppError } from './AppError.js';

type UploadResult = {
  url: string;
  publicId: string;
};

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// ─── Convert base64 to webp buffer ──────────────────────
const toWebP = async (base64: string): Promise<Buffer> => {
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  if (buffer.byteLength > MAX_SIZE_BYTES) {
    throw new AppError('Image must be less than 5MB', 400);
  }

  return sharp(buffer).webp({ quality: 80 }).toBuffer();
};

// ─── Upload single image ─────────────────────────────────
export const uploadImage = (base64: string, folder: string): Promise<UploadResult> => {
  return new Promise(async (resolve, reject) => {
    try {
      const webpBuffer = await toWebP(base64);

      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image', format: 'webp' },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );

      stream.end(webpBuffer);
    } catch (error) {
      reject(error);
    }
  });
};

// ─── Upload multiple images ──────────────────────────────
export const uploadImages = async (
  base64Array: string[],
  folder: string,
): Promise<UploadResult[]> => {
  return Promise.all(base64Array.map((base64) => uploadImage(base64, folder)));
};

// ─── Delete single image ─────────────────────────────────
export const deleteImage = async (publicId: string): Promise<void> => {
  await cloudinary.uploader.destroy(publicId);
};

// ─── Delete multiple images ──────────────────────────────
export const deleteImages = async (publicIds: string[]): Promise<void> => {
  await Promise.all(publicIds.map((publicId) => deleteImage(publicId)));
};
