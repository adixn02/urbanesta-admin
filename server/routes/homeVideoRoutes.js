import express from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import HomeVideo from '../models/HomeVideo.js';
import VideoChangeLog from '../models/VideoChangeLog.js';
import Admin from '../models/Admin.js';
import { authenticateJWT } from '../middleware/jwtAuth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Configure S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/avi'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  }
});

// Get current active home video
router.get('/current', async (req, res) => {
  try {
    const video = await HomeVideo.findOne({ isActive: true })
      .sort({ uploadedAt: -1 })
      .populate('uploadedBy', 'name email');

    if (!video) {
      return res.json({
        success: true,
        video: null,
        message: 'No home video found'
      });
    }

    res.json({
      success: true,
      video: {
        _id: video._id,
        url: video.url,
        fileName: video.fileName,
        fileSize: video.fileSize,
        uploadedAt: video.uploadedAt,
        uploadedBy: video.uploadedBy
      }
    });
  } catch (error) {
    logger.error('Error fetching current home video:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch home video'
    });
  }
});

// Upload/Update home video
router.post('/upload', authenticateJWT, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No video file provided'
      });
    }

    const file = req.file;
    const timestamp = Date.now();
    const fileName = `home-videos/${timestamp}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    // Get admin details for logging
    const admin = await Admin.findById(req.user.id).select('name role phone');
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    // Get previous video for logging
    const previousVideo = await HomeVideo.findOne({ isActive: true });

    // Upload to S3
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    // Use CloudFront URL instead of S3 direct URL
    const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN || `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com`;
    const videoUrl = `${cloudfrontDomain}/${fileName}`;

    // Deactivate all previous videos
    await HomeVideo.updateMany({ isActive: true }, { isActive: false });

    // Delete old video from S3 (optional, to save space)
    const oldVideos = await HomeVideo.find({ isActive: false }).limit(1).sort({ uploadedAt: -1 });
    if (oldVideos.length > 0) {
      const oldVideo = oldVideos[0];
      try {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: oldVideo.key
        }));
      } catch (deleteError) {
        logger.warn('Failed to delete old video from S3:', { error: deleteError.message });
      }
    }

    // Create new video record
    const newVideo = new HomeVideo({
      url: videoUrl,
      key: fileName,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      isActive: true,
      uploadedBy: req.user.id
    });

    await newVideo.save();

    // Create change log entry
    const changeLog = new VideoChangeLog({
      action: previousVideo ? 'updated' : 'uploaded',
      videoUrl: videoUrl,
      videoKey: fileName,
      fileName: file.originalname,
      fileSize: file.size,
      changedBy: req.user.id,
      changedByName: admin.name || admin.phone || 'Unknown',
      changedByRole: admin.role,
      previousVideoUrl: previousVideo?.url,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });

    await changeLog.save();

    logger.info('Home video uploaded successfully', {
      videoId: newVideo._id,
      uploadedBy: req.user.id,
      action: previousVideo ? 'updated' : 'uploaded'
    });

    res.json({
      success: true,
      message: 'Video uploaded successfully',
      video: {
        _id: newVideo._id,
        url: newVideo.url,
        fileName: newVideo.fileName,
        fileSize: newVideo.fileSize,
        uploadedAt: newVideo.uploadedAt
      }
    });
  } catch (error) {
    logger.error('Error uploading home video:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to upload video. Please try again.'
    });
  }
});

// Get all home videos (admin only)
router.get('/history', authenticateJWT, async (req, res) => {
  try {
    const videos = await HomeVideo.find()
      .sort({ uploadedAt: -1 })
      .populate('uploadedBy', 'name email')
      .limit(10);

    res.json({
      success: true,
      videos: videos.map(video => ({
        _id: video._id,
        url: video.url,
        fileName: video.fileName,
        fileSize: video.fileSize,
        isActive: video.isActive,
        uploadedAt: video.uploadedAt,
        uploadedBy: video.uploadedBy
      }))
    });
  } catch (error) {
    logger.error('Error fetching video history:', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch video history'
    });
  }
});

export default router;

