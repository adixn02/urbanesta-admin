import mongoose from "mongoose";

const propertyViewSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Managedproperty',
      required: true
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0
    },
    uniqueVisitors: {
      type: Number,
      default: 0,
      min: 0
    },
    lastViewedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Index for better query performance
propertyViewSchema.index({ propertyId: 1 });
propertyViewSchema.index({ viewCount: -1 });
propertyViewSchema.index({ lastViewedAt: -1 });

// Static method to get view count for a specific property
propertyViewSchema.statics.getPropertyViewCount = async function(propertyId) {
  try {
    const propertyView = await this.findOne({ propertyId });
    return propertyView ? propertyView.viewCount : 0;
  } catch (error) {
    console.error('Error getting property view count:', error);
    return 0;
  }
};

// Static method to get all property views with property details
propertyViewSchema.statics.getAllPropertyViews = async function() {
  try {
    const propertyViews = await this.find()
      .populate('propertyId', 'title projectName type status')
      .sort({ viewCount: -1 });
    
    return propertyViews;
  } catch (error) {
    console.error('Error getting all property views:', error);
    return [];
  }
};

// Static method to get total views across all properties
propertyViewSchema.statics.getTotalPropertyViews = async function() {
  try {
    const result = await this.aggregate([
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$viewCount' }
        }
      }
    ]);
    return result.length > 0 ? result[0].totalViews : 0;
  } catch (error) {
    console.error('Error getting total property views:', error);
    return 0;
  }
};

const PropertyView = mongoose.model("PropertyView", propertyViewSchema);

export default PropertyView;
