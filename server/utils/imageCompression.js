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
    quality = 80, // Reduced from 85 to 80 for better compression
    maxWidth = 1920,
    maxHeight = 1080,
    maxFileSize = 2 * 1024 * 1024 // 2MB target max size
  } = options;

  try {
    // Get original image metadata
    const metadata = await sharp(imageBuffer).metadata();
    const originalSize = imageBuffer.length;
    
    // Calculate target dimensions if image is very large
    let targetWidth = maxWidth;
    let targetHeight = maxHeight;
    
    if (metadata.width && metadata.height) {
      // If image is very large, scale down more aggressively
      if (metadata.width > 3000 || metadata.height > 3000) {
        const scale = Math.min(3000 / metadata.width, 3000 / metadata.height);
        targetWidth = Math.round(metadata.width * scale);
        targetHeight = Math.round(metadata.height * scale);
      }
    }
    
    // First compression attempt
    let compressedBuffer = await sharp(imageBuffer)
      .resize(targetWidth, targetHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ 
        quality: quality,
        effort: 6 // Higher effort for better compression
      })
      .toBuffer();

    // If still too large, reduce quality further
    if (compressedBuffer.length > maxFileSize && quality > 60) {
      const newQuality = Math.max(60, quality - 10);
      compressedBuffer = await sharp(imageBuffer)
        .resize(targetWidth, targetHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ 
          quality: newQuality,
          effort: 6
        })
        .toBuffer();
    }

    const reductionPercent = Math.round((1 - compressedBuffer.length / originalSize) * 100);
    const sizeInMB = (compressedBuffer.length / (1024 * 1024)).toFixed(2);
    const originalSizeInMB = (originalSize / (1024 * 1024)).toFixed(2);
    
    console.log(`📸 Image compressed: ${originalSizeInMB}MB → ${sizeInMB}MB (${reductionPercent}% reduction)`);
    
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

    // Log original file size
    const originalSizeMB = (imageBuffer.length / (1024 * 1024)).toFixed(2);
    console.log(`📤 Processing image: ${file.originalname} (${originalSizeMB}MB)`);

    // Compress to WebP with optimized settings
    const compressionOptions = {
      quality: 80, // Good balance between quality and size
      maxWidth: 1920,
      maxHeight: 1080,
      maxFileSize: 2 * 1024 * 1024, // Target max 2MB
      ...options
    };
    
    const compressedBuffer = await compressToWebP(imageBuffer, compressionOptions);
    
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
