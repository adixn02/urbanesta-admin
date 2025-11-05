import mongoose from "mongoose";

const analyticsSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      default: mongoose.Types.ObjectId
    },
    ipAddress: {
      type: String,
      required: true
    },
    userAgent: {
      type: String,
      default: ""
    },
    device: {
      type: String,
      default: ""
    },
    browser: {
      type: String,
      default: ""
    },
    operatingSystem: {
      type: String,
      default: ""
    },
    country: {
      type: String,
      default: ""
    },
    city: {
      type: String,
      default: ""
    },
    region: {
      type: String,
      default: ""
    },
    pageUrl: {
      type: String,
      required: true
    },
    pageTitle: {
      type: String,
      default: ""
    },
    referrer: {
      type: String,
      default: ""
    },
    sessionId: {
      type: String,
      required: true
    },
    screenResolution: {
      type: String,
      default: ""
    },
    language: {
      type: String,
      default: ""
    },
    timezone: {
      type: String,
      default: ""
    },
    isReturningVisitor: {
      type: Boolean,
      default: false
    },
    visitDuration: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// Index for better query performance
analyticsSchema.index({ createdAt: -1 });
analyticsSchema.index({ pageUrl: 1 });
analyticsSchema.index({ sessionId: 1 });

// Static method to get total views count
analyticsSchema.statics.getTotalViews = async function() {
  try {
    const totalViews = await this.countDocuments();
    return totalViews;
  } catch (error) {
    console.error('Error getting total views:', error);
    return 0;
  }
};

const Analytics = mongoose.model("Analytics", analyticsSchema);

export default Analytics;
