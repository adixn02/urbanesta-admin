import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    propertyId: {
      type: String,
      trim: true
    },
    propertyName: {
      type: String,
      trim: true
    },
    propertyUrl: {
      type: String,
      trim: true
    },
    formType: {
      type: String,
      enum: ['general-inquiry', 'callback-request', 'property-inquiry', 'partnership', 'other'],
      default: 'general-inquiry'
    },
    message: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'in-progress', 'qualified', 'resolved', 'closed'],
      default: 'new'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    source: {
      type: String,
      enum: ['website', 'phone', 'email', 'referral', 'social-media', 'other'],
      default: 'website'
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    propertyInterest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Managedproperty'
    },
    notes: [{
      note: String,
      addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    }],
    tags: [String],
    followUpDate: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Index for better query performance
leadSchema.index({ email: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ priority: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ assignedTo: 1 });

const Lead = mongoose.model("Lead", leadSchema);

export default Lead;
