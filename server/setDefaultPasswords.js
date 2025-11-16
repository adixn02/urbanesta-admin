import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './models/Admin.js';

// Load environment variables
dotenv.config();

const DEFAULT_PASSWORD = 'Password@,109';

async function setDefaultPasswords() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('✅ Connected to MongoDB');

    // Find all users without passwords
    const usersWithoutPassword = await Admin.find({ 
      $or: [
        { password: { $exists: false } },
        { password: null },
        { password: '' }
      ]
    });

    console.log(`\nFound ${usersWithoutPassword.length} users without passwords`);

    if (usersWithoutPassword.length === 0) {
      console.log('✅ All users already have passwords!');
      await mongoose.connection.close();
      return;
    }

    // Update each user with default password
    for (const user of usersWithoutPassword) {
      user.password = DEFAULT_PASSWORD;
      await user.save();
      console.log(`✅ Set default password for: ${user.name} (${user.phoneNumber}) - Role: ${user.role}`);
    }

    console.log(`\n✅ Successfully set default password for ${usersWithoutPassword.length} users`);
    console.log(`\n🔐 Default Password: ${DEFAULT_PASSWORD}`);
    console.log('\n⚠️  IMPORTANT: Ask users to change their password immediately after first login!');

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
setDefaultPasswords();

