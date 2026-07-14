import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Uploads an in-memory file buffer (from multer's memoryStorage) to Cloudinary.
 * Returns { url, publicId } — store both on the model so deletion works later.
 */
export function uploadBufferToCloudinary(buffer, folder = 'mms') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

/**
 * Deletes a Cloudinary asset by its public_id. Safe to call with a null/undefined id.
 */
export async function deleteFromCloudinary(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    // Non-fatal: log and continue, don't block the DB delete on a storage cleanup failure
    console.error('[cloudinary] failed to delete asset', publicId, err.message);
  }
}

export default cloudinary;
