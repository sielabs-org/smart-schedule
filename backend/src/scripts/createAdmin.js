require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

const run = async () => {
  const { BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD } = process.env;
  if (!BOOTSTRAP_ADMIN_NAME?.trim() || !BOOTSTRAP_ADMIN_EMAIL?.trim() || !BOOTSTRAP_ADMIN_PASSWORD) {
    throw new Error(
      'Set BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL, and BOOTSTRAP_ADMIN_PASSWORD before running this command'
    );
  }
  if (BOOTSTRAP_ADMIN_PASSWORD.length < 12) {
    throw new Error('Bootstrap admin password must be at least 12 characters long');
  }

  await connectDB();
  try {
    if (await User.exists({ role: 'admin', isAdminProvisioned: true })) {
      throw new Error('An admin account already exists. Create additional accounts from the admin dashboard.');
    }

    const email = BOOTSTRAP_ADMIN_EMAIL.trim().toLowerCase();
    const existingUser = await User.findOne({ email }).select('+password');
    if (existingUser && existingUser.role !== 'admin') {
      throw new Error('The bootstrap email is already assigned to a non-admin account');
    }

    const user = existingUser || new User({ email });
    user.name = BOOTSTRAP_ADMIN_NAME.trim();
    user.password = BOOTSTRAP_ADMIN_PASSWORD;
    user.role = 'admin';
    user.isAdminProvisioned = true;
    user.isActive = true;
    await user.save();
    console.log(`Bootstrap admin created: ${user.email}`);
  } finally {
    await mongoose.connection.close();
  }
};

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
