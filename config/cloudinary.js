import { v2 as cloudinary } from 'cloudinary';

// Validate Cloudinary environment variables
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

// Debug logging (only show partial values for security)
if (process.env.NODE_ENV !== 'production') {
  console.log('🔍 Cloudinary Config Check:');
  console.log('  Cloud Name:', cloudName ? `${cloudName.substring(0, 3)}***` : 'MISSING');
  console.log('  API Key:', apiKey ? `${apiKey.substring(0, 3)}***` : 'MISSING');
  console.log('  API Secret:', apiSecret ? 'SET (hidden)' : 'MISSING');
}

if (!cloudName || !apiKey || !apiSecret) {
  const missing = [];
  if (!cloudName) missing.push('CLOUDINARY_CLOUD_NAME');
  if (!apiKey) missing.push('CLOUDINARY_API_KEY');
  if (!apiSecret) missing.push('CLOUDINARY_API_SECRET');
  
  console.error('❌ Missing Cloudinary environment variables:', missing.join(', '));
  console.error('Please add these to your .env file in bestvocabulary_backend folder:');
  console.error('CLOUDINARY_CLOUD_NAME=your_cloud_name');
  console.error('CLOUDINARY_API_KEY=your_api_key');
  console.error('CLOUDINARY_API_SECRET=your_api_secret');
  console.error('');
  console.error('You can get these from your Cloudinary dashboard: https://cloudinary.com/console');
}

// Configure Cloudinary (will throw error if missing, which is handled in routes)
try {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
  
  if (process.env.NODE_ENV !== 'production' && cloudName && apiKey && apiSecret) {
    console.log('✅ Cloudinary configured successfully');
  }
} catch (configError) {
  console.error('❌ Error configuring Cloudinary:', configError.message);
}

/**
 * Upload image to Cloudinary
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {String} folder - Folder path in Cloudinary (e.g., 'categories')
 * @param {String} publicId - Optional custom public ID
 * @returns {Promise<Object>} Cloudinary upload result
 */
export const uploadToCloudinary = async (fileBuffer, folder = 'categories', publicId = null) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: folder,
      resource_type: 'image',
      transformation: [
        { width: 1000, height: 1000, crop: 'limit' }, // Max dimensions
        { quality: 'auto' }, // Auto optimize quality
        { format: 'auto' }, // Auto format (webp when possible)
      ],
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
};

/**
 * Delete image from Cloudinary
 * @param {String} publicId - Cloudinary public ID or URL
 * @returns {Promise<Object>} Deletion result
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    // Extract public_id from URL if URL is provided
    let public_id = publicId;
    
    if (publicId.includes('cloudinary.com')) {
      // Extract public_id from URL
      const urlParts = publicId.split('/');
      const uploadIndex = urlParts.indexOf('upload');
      if (uploadIndex !== -1 && uploadIndex + 1 < urlParts.length) {
        // Get the path after 'upload' and before file extension
        const pathAfterUpload = urlParts.slice(uploadIndex + 1).join('/');
        public_id = pathAfterUpload.split('.')[0]; // Remove file extension
      }
    }

    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type: 'image',
    });

    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

export default cloudinary;

