// backend/middleware/upload.js
import multer from "multer";
import multerS3 from "@vickos/multer-s3-transforms-v3";
import { S3Client } from "@aws-sdk/client-s3";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { processImageFile, isSupportedImage, getWebPFileName } from "../utils/imageCompression.js";
import logger from "../utils/logger.js";

// Function to check if AWS credentials are available
const checkAwsCredentials = () => {
  return process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
};

// Function to create upload middleware
const createUploadMiddleware = () => {
  const hasAwsCredentials = checkAwsCredentials();
  
  logger.info("AWS Credentials Check:", {
    hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
    hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || "Missing",
    bucket: process.env.AWS_S3_BUCKET || "Missing"
  });

  if (!hasAwsCredentials) {
    logger.warn("AWS credentials not found. Using local file storage as fallback.");
    logger.warn("To use S3 storage, configure AWS credentials in environment variables.");
  }

  let upload;

  if (hasAwsCredentials) {
    // Configure AWS S3 Client v3
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || "ap-south-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    upload = multer({
      storage: multerS3({
        s3: s3Client,
        bucket: process.env.AWS_S3_BUCKET || "urbanesta-assets",
        acl: undefined, // Remove ACL to avoid bucket policy issues
        contentType: multerS3.AUTO_CONTENT_TYPE, // Auto-detect MIME type
        metadata: (req, file, cb) => {
          cb(null, { fieldName: file.fieldname });
        },
        key: (req, file, cb) => {
          // Generate crypto-based filename
          const randomName = crypto.randomBytes(16).toString('hex');
          // Always use .webp extension for images
          const extension = isSupportedImage(file.mimetype) ? 'webp' : file.originalname.split('.').pop();
          cb(null, `img-assets/${randomName}.${extension}`);
        },
        transforms: [{
          id: 'webp',
          key: function (req, file, cb) {
            const randomName = crypto.randomBytes(16).toString('hex');
            const extension = isSupportedImage(file.mimetype) ? 'webp' : file.originalname.split('.').pop();
            cb(null, `img-assets/${randomName}.${extension}`);
          },
          transform: function (req, file, cb) {
            // Only compress if it's a supported image
            if (isSupportedImage(file.mimetype)) {
              processImageFile(file, { 
                quality: 80, // Optimized for better compression
                maxWidth: 1920, 
                maxHeight: 1080,
                maxFileSize: 2 * 1024 * 1024 // Target max 2MB
              })
                .then(processedFile => {
                  logger.info('Image compressed for S3 upload:', {
                    original: file.originalname,
                    originalSize: file.size,
                    compressedSize: processedFile.size,
                    reduction: Math.round((1 - processedFile.size / file.size) * 100) + '%'
                  });
                  cb(null, processedFile.buffer);
                })
                .catch(error => {
                  logger.error('WebP compression error:', { error: error.message });
                  // If compression fails, try to use original buffer
                  cb(null, file.buffer);
                });
            } else {
              // For non-image files, just pass through
              cb(null, file.buffer);
            }
          }
        }]
      }),
      fileFilter: (req, file, cb) => {
        // Validate MIME types - only allow images
        const allowedMimes = [
          'image/jpeg',
          'image/jpg', 
          'image/png',
          'image/webp',
          'image/gif',
          'image/avif', // AVIF format support
          'image/x-png', // Some browsers send this for PNG
          'image/pjpeg' // Some browsers send this for JPEG
        ];
        
        // Also check file extension as fallback (some browsers don't set MIME type correctly)
        const fileExtension = file.originalname.toLowerCase().split('.').pop();
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];
        
        if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
          cb(null, true);
        } else {
          logger.warn('File upload rejected:', { 
            mimetype: file.mimetype, 
            filename: file.originalname,
            extension: fileExtension 
          });
          cb(new Error(`Invalid file type. Please upload only image files (JPEG, PNG, WebP, GIF, or AVIF format).`));
        }
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit (will be compressed to smaller size)
      },
    });
  } else {
    // Fallback to local file storage
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    upload = multer({
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const randomName = crypto.randomBytes(16).toString('hex');
          // Always use .webp extension for images
          const extension = isSupportedImage(file.mimetype) ? 'webp' : file.originalname.split('.').pop();
          cb(null, `img-assets-${randomName}.${extension}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Validate MIME types - only allow images
        const allowedMimes = [
          'image/jpeg',
          'image/jpg', 
          'image/png',
          'image/webp',
          'image/gif',
          'image/avif', // AVIF format support
          'image/x-png', // Some browsers send this for PNG
          'image/pjpeg' // Some browsers send this for JPEG
        ];
        
        // Also check file extension as fallback (some browsers don't set MIME type correctly)
        const fileExtension = file.originalname.toLowerCase().split('.').pop();
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];
        
        if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
          cb(null, true);
        } else {
          logger.warn('File upload rejected:', { 
            mimetype: file.mimetype, 
            filename: file.originalname,
            extension: fileExtension 
          });
          cb(new Error(`Invalid file type. Please upload only image files (JPEG, PNG, WebP, GIF, or AVIF format).`));
        }
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit (will be compressed to smaller size)
      },
    });
  }

  return upload;
};

// Middleware to process uploaded files (for local storage)
export const processUploadedFiles = async (req, res, next) => {
  try {
    if (req.file) {
      // Process single file
      if (isSupportedImage(req.file.mimetype)) {
        logger.debug(`Processing image: ${req.file.originalname}`);
        const processedFile = await processImageFile(req.file, { 
          quality: 80, // Optimized for better compression
          maxWidth: 1920, 
          maxHeight: 1080,
          maxFileSize: 2 * 1024 * 1024 // Target max 2MB
        });
        logger.info('Image compressed for local storage:', {
          original: req.file.originalname,
          originalSize: req.file.size,
          compressedSize: processedFile.size,
          reduction: Math.round((1 - processedFile.size / req.file.size) * 100) + '%'
        });
        req.file = processedFile;
      }
    } else if (req.files) {
      // Process multiple files
      const processedFiles = {};
      
      for (const [fieldName, files] of Object.entries(req.files)) {
        if (Array.isArray(files)) {
          processedFiles[fieldName] = [];
          for (const file of files) {
            if (isSupportedImage(file.mimetype)) {
              logger.debug(`Processing image: ${file.originalname}`);
              const processedFile = await processImageFile(file, { 
                quality: 80, // Optimized for better compression
                maxWidth: 1920, 
                maxHeight: 1080,
                maxFileSize: 2 * 1024 * 1024 // Target max 2MB
              });
              logger.info('Image compressed:', {
                original: file.originalname,
                originalSize: file.size,
                compressedSize: processedFile.size,
                reduction: Math.round((1 - processedFile.size / file.size) * 100) + '%'
              });
              processedFiles[fieldName].push(processedFile);
            } else {
              processedFiles[fieldName].push(file);
            }
          }
        } else {
          // Single file in field
          if (isSupportedImage(files.mimetype)) {
            logger.debug(`Processing image: ${files.originalname}`);
            const processedFile = await processImageFile(files, { 
              quality: 80, // Optimized for better compression
              maxWidth: 1920, 
              maxHeight: 1080,
              maxFileSize: 2 * 1024 * 1024 // Target max 2MB
            });
            logger.info('Image compressed:', {
              original: files.originalname,
              originalSize: files.size,
              compressedSize: processedFile.size,
              reduction: Math.round((1 - processedFile.size / files.size) * 100) + '%'
            });
            processedFiles[fieldName] = processedFile;
          } else {
            processedFiles[fieldName] = files;
          }
        }
      }
      
      req.files = processedFiles;
    }
    
    next();
  } catch (error) {
    logger.error('Error processing uploaded files:', { error: error.message });
    next(error);
  }
};

// Lazy-loaded upload middleware
let uploadInstance = null;

const getUploadMiddleware = () => {
  if (!uploadInstance) {
    uploadInstance = createUploadMiddleware();
  }
  return uploadInstance;
};

// Export a proxy object that creates the middleware when accessed
export default new Proxy({}, {
  get(target, prop) {
    const upload = getUploadMiddleware();
    return upload[prop];
  },
  apply(target, thisArg, argumentsList) {
    const upload = getUploadMiddleware();
    return upload.apply(thisArg, argumentsList);
  }
});
