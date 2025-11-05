// backend/utils/imageCompression.js
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

/**
 * Compress image to WebP format
 * @param {Buffer} imageBuffer - The image buffer to compress
 * @param {Object} options - Compression options
 * @param {number} options.quality - WebP quality (0-100, default: 85)
 * @param {number} options.maxWidth - Maximum width (default: 1920)
 * @param {number} options.maxHeight - Maximum height (default: 1080)
 * @returns {Promise<Buffer>} - Compressed WebP buffer
 */
export const compressToWebP = async (imageBuffer, options = {}) => {
  const {
    quality = 85,
    maxWidth = 1920,
    maxHeight = 1080
  } = options;

  try {
    const compressedBuffer = await sharp(imageBuffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ 
        quality: quality,
        effort: 6 // Higher effort for better compression
      })
      .toBuffer();

    const reductionPercent = Math.round((1 - compressedBuffer.length / imageBuffer.length) * 100);
    console.log(`📸 Image compressed: ${imageBuffer.length} bytes → ${compressedBuffer.length} bytes (${reductionPercent}% reduction)`);
    
    // Log compression details
    if (reductionPercent > 0) {
      console.log(`✅ WebP compression successful! File size reduced by ${reductionPercent}%`);
    } else {
      console.log(`⚠️  WebP compression resulted in larger file size. This might happen with very small images.`);
    }
    
    return compressedBuffer;
  } catch (error) {
    console.error('❌ Image compression error:', error);
    throw new Error(`Image compression failed: ${error.message}`);
  }
};

/**
 * Check if file is a supported image format
 * @param {string} mimetype - MIME type of the file
 * @returns {boolean} - Whether the file is a supported image
 */
export const isSupportedImage = (mimetype) => {
  const supportedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ];
  return supportedTypes.includes(mimetype.toLowerCase());
};

/**
 * Get file extension for WebP files
 * @param {string} originalName - Original filename
 * @returns {string} - New filename with .webp extension
 */
export const getWebPFileName = (originalName) => {
  const nameWithoutExt = path.parse(originalName).name;
  return `${nameWithoutExt}.webp`;
};

/**
 * Process image file and convert to WebP
 * @param {Object} file - Multer file object
 * @param {Object} options - Compression options
 * @returns {Promise<Object>} - Processed file object
 */
export const processImageFile = async (file, options = {}) => {
  try {
    // Check if it's a supported image
    if (!isSupportedImage(file.mimetype)) {
      console.log(`⚠️  File ${file.originalname} is not a supported image format, skipping compression`);
      return file;
    }

    // Read the file buffer
    let imageBuffer;
    if (file.buffer) {
      imageBuffer = file.buffer;
    } else if (file.path) {
      imageBuffer = fs.readFileSync(file.path);
    } else {
      throw new Error('No file buffer or path available');
    }

    // Compress to WebP
    const compressedBuffer = await compressToWebP(imageBuffer, options);
    
    // Update file properties
    const processedFile = {
      ...file,
      buffer: compressedBuffer,
      mimetype: 'image/webp',
      originalname: getWebPFileName(file.originalname),
      size: compressedBuffer.length
    };

    // If file has a path (local storage), update the file
    if (file.path) {
      fs.writeFileSync(file.path, compressedBuffer);
    }

    return processedFile;
  } catch (error) {
    console.error('❌ Error processing image file:', error);
    // Return original file if compression fails
    return file;
  }
};
