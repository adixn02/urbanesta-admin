// backend/middleware/upload.js
import multer from "multer";
import multerS3 from "@vickos/multer-s3-transforms-v3";
import { S3Client } from "@aws-sdk/client-s3";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { processImageFile, isSupportedImage, getWebPFileName } from "../utils/imageCompression.js";

// Function to check if AWS credentials are available
const checkAwsCredentials = () => {
  return process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
};

// Function to create upload middleware
const createUploadMiddleware = () => {
  const hasAwsCredentials = checkAwsCredentials();
  
  console.log("🔍 AWS Credentials Check:");
  console.log("AWS_ACCESS_KEY_ID:", process.env.AWS_ACCESS_KEY_ID ? "✅ Found" : "❌ Missing");
  console.log("AWS_SECRET_ACCESS_KEY:", process.env.AWS_SECRET_ACCESS_KEY ? "✅ Found" : "❌ Missing");
  console.log("AWS_REGION:", process.env.AWS_REGION || "❌ Missing");
  console.log("AWS_S3_BUCKET:", process.env.AWS_S3_BUCKET || "❌ Missing");

  if (!hasAwsCredentials) {
    console.warn("⚠️  AWS credentials not found. Using local file storage as fallback.");
    console.warn("To use S3 storage, create a .env file in the server directory with:");
    console.warn("AWS_REGION=ap-south-1");
    console.warn("AWS_ACCESS_KEY_ID=your_access_key_here");
    console.warn("AWS_SECRET_ACCESS_KEY=your_secret_key_here");
    console.warn("AWS_S3_BUCKET=urbanesta-assets");
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
              processImageFile(file, { quality: 85, maxWidth: 1920, maxHeight: 1080 })
                .then(processedFile => {
                  cb(null, processedFile.buffer);
                })
                .catch(error => {
                  console.error('WebP compression error:', error);
                  cb(error);
                });
            } else {
              // For non-image files, just pass through
              cb(null, file.buffer);
            }
          }
        }]
      }),
      fileFilter: (req, file, cb) => {
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
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
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
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
        console.log(`🖼️  Processing image: ${req.file.originalname}`);
        const processedFile = await processImageFile(req.file, { 
          quality: 85, 
          maxWidth: 1920, 
          maxHeight: 1080 
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
              console.log(`🖼️  Processing image: ${file.originalname}`);
              const processedFile = await processImageFile(file, { 
                quality: 85, 
                maxWidth: 1920, 
                maxHeight: 1080 
              });
              processedFiles[fieldName].push(processedFile);
            } else {
              processedFiles[fieldName].push(file);
            }
          }
        } else {
          // Single file in field
          if (isSupportedImage(files.mimetype)) {
            console.log(`🖼️  Processing image: ${files.originalname}`);
            const processedFile = await processImageFile(files, { 
              quality: 85, 
              maxWidth: 1920, 
              maxHeight: 1080 
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
    console.error('❌ Error processing uploaded files:', error);
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
