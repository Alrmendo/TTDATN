import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from './config/database';
import { syncDatabase, User } from './models';
import bcrypt from 'bcrypt';

const seed = async (): Promise<void> => {
  await connectDB();
  await syncDatabase();

  const email = 'manager@test.com';
  const password = 'password123';

  const existing = await User.findOne({ where: { email } });
  if (existing) {
    console.log('Seed user already exists, skipping.');
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await User.create({
    fullName: 'Test Manager',
    email,
    passwordHash,
    role: 'Manager',
    isActive: true,
  });

  console.log(`✅ Seed user created: ${email} / ${password}`);
  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
