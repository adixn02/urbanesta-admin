import mongoose from 'mongoose';

const videoChangeLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['uploaded', 'updated', 'deleted'],
    required: true
  },
  videoUrl: {
    type: String,
    required: true
  },
  videoKey: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  changedByName: {
    type: String,
    required: true
  },
  changedByRole: {
    type: String,
    enum: ['admin', 'subadmin'],
    required: true
  },
  changedAt: {
    type: Date,
    default: Date.now
  },
  previousVideoUrl: {
    type: String
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

// Index for faster queries
videoChangeLogSchema.index({ changedAt: -1 });
videoChangeLogSchema.index({ changedBy: 1 });

const VideoChangeLog = mongoose.model('VideoChangeLog', videoChangeLogSchema);

export default VideoChangeLog;

