import mongoose from "mongoose";
import bcrypt from "bcryptjs";

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
  password: {
    type: String,
    required: true, // Password required for both admin and subadmin
    select: false // Don't include password in queries by default
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
  collection: 'admins', // Explicitly set collection name
  strict: true // Only save fields defined in schema (prevents saving undefined email field)
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

// Hash password before saving
adminSchema.pre('save', async function(next) {
  // Remove email field completely to avoid duplicate key errors with old DB index
  // Email field is not part of current schema but database may have unique index on it
  if (this.isNew) {
    // Explicitly unset email field to prevent MongoDB from setting it to null
    this.set('email', undefined, { strict: false });
    // Also delete from the document object
    if (this.email !== undefined) {
      delete this.email;
    }
  }
  
  // Only hash password if it's modified (or new)
  if (!this.isModified('password')) {
    return next();
  }
  
  // Only hash if password exists
  if (this.password) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      return next(error);
    }
  }
  
  next();
});

// Method to compare passwords
adminSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    if (!this.password) {
      return false;
    }
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

export default mongoose.model("Admin", adminSchema);
