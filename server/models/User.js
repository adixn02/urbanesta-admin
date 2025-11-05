import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    phoneNumber: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    role: {
      type: String,
      enum: ['admin', 'subadmin', 'user'],
      default: 'user'
    },
    isAdmin: {
      type: Boolean,
      default: false
    },
    permissions: {
      type: [String],
      default: []
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    lastActivity: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: {
      type: Date
    },
    joinDate: {
      type: Date
    },
    loginCount: {
      type: Number,
      default: 0
    },
    watchlist: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property'
    }],
    myProperties: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property'
    }],
    profile: {
      avatar: String,
      bio: String,
      location: String
    },
    preferences: {
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false }
      }
    }
  },
  { timestamps: true }
);

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

const User = mongoose.model("User", userSchema);

export default User;
