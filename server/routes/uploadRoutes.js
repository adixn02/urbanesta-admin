// backend/routes/uploadRoutes.js
import express from "express";
import upload, { processUploadedFiles } from "../middleware/upload.js";
import { convertToCloudFrontUrl } from "../utils/cloudfront.js";
import path from "path";
import logger from "../utils/logger.js";

const router = express.Router();

// Single file upload
router.post("/single", (req, res) => {
  upload.single("image")(req, res, async (err) => {
    if (err) {
      logger.error("Upload middleware error:", { error: err.message });
      return res.status(500).json({ error: err.message });
    }
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      // Process uploaded file for WebP compression (for local storage)
      if (!req.file.location) {
        await processUploadedFiles(req, res, () => {});
      }
      
      // Handle both S3 and local file storage
      let imageUrl;
      if (req.file.location) {
        // S3 storage
        logger.info("File uploaded successfully to S3:", { location: req.file.location });
        imageUrl = convertToCloudFrontUrl(req.file.location);
        logger.debug("CloudFront URL:", { url: imageUrl });
      } else {
        // Local storage
        logger.info("File uploaded successfully to local storage:", { filename: req.file.filename });
        imageUrl = `/uploads/${req.file.filename}`;
        logger.debug("Local URL:", { url: imageUrl });
      }
      
      res.json({ imageUrl });
    } catch (error) {
      logger.error("Upload error:", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });
});

// Multiple files upload (array)
router.post("/multiple", (req, res) => {
  upload.array("images", 5)(req, res, async (err) => {
    if (err) {
      logger.error("Upload middleware error:", { error: err.message });
      return res.status(400).json({ 
        error: err.message || "File upload failed",
        details: err.message,
        type: "UPLOAD_ERROR"
      });
    }
    
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }
      
      // Process uploaded files for WebP compression (for local storage)
      if (req.files && req.files.length > 0 && !req.files[0].location) {
        await processUploadedFiles(req, res, () => {});
      }
      
      const urls = req.files.map((file) => {
        if (file.location) {
          // S3 storage
          return convertToCloudFrontUrl(file.location);
        } else {
          // Local storage
          return `/uploads/${file.filename}`;
        }
      });
      res.json({ imageUrls: urls });
    } catch (error) {
      logger.error("Multiple upload error:", { error: error.message, stack: error.stack });
      res.status(500).json({ 
        error: error.message || "Failed to process uploaded files",
        type: "PROCESSING_ERROR"
      });
    }
  });
});

// Multiple fields upload (for builder form - logo + backgroundImage)
router.post("/builder", (req, res) => {
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "backgroundImage", maxCount: 1 },
  ])(req, res, async (err) => {
    if (err) {
      logger.error("Upload middleware error:", { error: err.message });
      return res.status(500).json({ 
        error: "Upload failed", 
        details: err.message,
        type: "UPLOAD_ERROR"
      });
    }
    
    try {
      if (!req.files) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      // Process uploaded files for WebP compression (for local storage)
      if (req.files && !req.files.logo?.[0]?.location) {
        await processUploadedFiles(req, res, () => {});
      }

      // Helper function to get URL for a file
      const getFileUrl = (file) => {
        if (!file) return null;
        if (file.location) {
          // S3 storage
          return convertToCloudFrontUrl(file.location);
        } else {
          // Local storage
          return `/uploads/${file.filename}`;
        }
      };

      const response = {
        message: "Files uploaded successfully",
        files: {
          logo: req.files.logo ? getFileUrl(req.files.logo[0]) : null,
          backgroundImage: req.files.backgroundImage ? getFileUrl(req.files.backgroundImage[0]) : null,
        },
      };

      logger.info("Builder files uploaded:", { files: response.files });
      res.json(response);
    } catch (err) {
      logger.error("Upload processing error:", { error: err.message });
      res.status(500).json({ 
        error: "Upload processing failed", 
        details: err.message,
        type: "PROCESSING_ERROR"
      });
    }
  });
});

export default router;
