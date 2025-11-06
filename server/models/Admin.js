import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  role: {
    type: String,
    enum: ['admin', 'subadmin'],
    required: true,
    default: 'subadmin'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  permissions: [{
    type: String,
    enum: [
      'all',
      'dashboard',
      'cities',
      'city',
      'builders', 
      'properties',
      'property_management',
      'managedproperties',
      'leads',
      'users',
      'settings',
      'logs',
      'categories'
    ]
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  loginCount: {
    type: Number,
    default: 0
  },
  preferences: {
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      }
    }
  }
}, { 
  timestamps: true,
  collection: 'admins' // Explicitly set collection name
});

// Indexes for better performance
// Note: phoneNumber and email already have indexes from unique: true, so don't duplicate them
adminSchema.index({ role: 1 });
adminSchema.index({ isActive: 1 });
adminSchema.index({ createdAt: -1 });

// Virtual for isAdmin
adminSchema.virtual('isAdmin').get(function() {
  return this.role === 'admin';
});

// Ensure virtual fields are serialized
adminSchema.set('toJSON', { virtuals: true });
adminSchema.set('toObject', { virtuals: true });

export default mongoose.model("Admin", adminSchema);
