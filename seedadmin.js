import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'node:fs';

// Get current directory and server directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serverDir = join(__dirname, 'server');

// Use require to load modules from server/node_modules
const require = createRequire(join(serverDir, 'package.json'));
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables from server directory
const hasEnvFile = existsSync(join(serverDir, '.env'));
const envFile = hasEnvFile 
  ? join(serverDir, '.env')
  : (process.env.NODE_ENV === 'production' 
      ? join(serverDir, 'env.production') 
      : join(serverDir, 'env.development'));
dotenv.config({ path: envFile });

const MONGODB_URL = process.env.MONGODB_URL;

if (!MONGODB_URL) {
  console.error("❌ MONGODB_URL environment variable is required");
  process.exit(1);
}

// Admin data from old database
const adminData = [
  {
    _id: new mongoose.Types.ObjectId("68f4f921bf105f1c815e68a6"),
    name: "Main Admin",
    phoneNumber: "+918198982098",
    email: "admin@urbanesta.com",
    role: "admin",
    isActive: true,
    permissions: ["all"],
    createdBy: null,
    lastLogin: new Date(1762417979510),
    lastActivity: new Date(1762417979511),
    loginCount: 0,
    preferences: {
      notifications: {
        email: true,
        sms: false
      }
    },
    createdAt: new Date(1760885025536),
    updatedAt: new Date(1762417979511),
    __v: 0
  },
  {
    _id: new mongoose.Types.ObjectId("68f4f92df0dc6b02e508c79e"),
    name: "Sub Admin",
    phoneNumber: "+919812171400",
    email: "subadmin@urbanesta.com",
    role: "subadmin",
    isActive: true,
    permissions: ["city", "builders", "dashboard", "property_management"],
    createdBy: null,
    lastLogin: new Date(1762441968052),
    lastActivity: new Date(1762441968052),
    loginCount: 0,
    preferences: {
      notifications: {
        email: true,
        sms: false
      }
    },
    createdAt: new Date(1760885037951),
    updatedAt: new Date(1762441968053),
    __v: 0
  }
];

async function seedAdmins() {
  try {
    // Import Admin model dynamically
    const AdminModule = await import(join(serverDir, 'models', 'Admin.js'));
    const Admin = AdminModule.default;

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URL);
    console.log('✅ Connected to MongoDB successfully');

    // Clear existing admins (optional - comment out if you want to keep existing data)
    const existingCount = await Admin.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing admin(s) in database`);
      console.log('🗑️  Clearing existing admins...');
      await Admin.deleteMany({});
      console.log('✅ Cleared existing admins');
    }

    console.log('🌱 Seeding admin data...');
    
    // Insert admins
    for (const admin of adminData) {
      try {
        // Check if admin with same email or phone already exists
        const existing = await Admin.findOne({
          $or: [
            { email: admin.email },
            { phoneNumber: admin.phoneNumber }
          ]
        });

        if (existing) {
          console.log(`⚠️  Admin with email ${admin.email} or phone ${admin.phoneNumber} already exists. Skipping...`);
          continue;
        }

        // Create admin with specific _id and timestamps
        const newAdmin = new Admin(admin);
        await newAdmin.save();
        console.log(`✅ Seeded admin: ${admin.name} (${admin.email})`);
      } catch (error) {
        if (error.code === 11000) {
          console.log(`⚠️  Duplicate key error for ${admin.email}. Skipping...`);
        } else {
          console.error(`❌ Error seeding admin ${admin.name}:`, error.message);
        }
      }
    }

    // Verify seeded data
    const seededCount = await Admin.countDocuments();
    console.log(`\n📊 Total admins in database: ${seededCount}`);
    
    const admins = await Admin.find({});
    console.log('\n📋 Seeded admins:');
    admins.forEach(admin => {
      console.log(`   - ${admin.name} (${admin.email}) - Role: ${admin.role}`);
    });

    console.log('\n✅ Admin seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admins:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the seed function
seedAdmins();
