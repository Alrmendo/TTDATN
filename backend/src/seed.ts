import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from './config/database';
import { syncDatabase, User, Store } from './models';
import bcrypt from 'bcrypt';

const seed = async (): Promise<void> => {
  await connectDB();
  await syncDatabase();

  // --- Manager user ---
  const managerEmail = 'manager@test.com';
  const managerPassword = 'password123';

  const existingManager = await User.findOne({ where: { email: managerEmail } });
  if (existingManager) {
    console.log('Manager user already exists, skipping.');
  } else {
    const passwordHash = await bcrypt.hash(managerPassword, 10);
    await User.create({
      fullName: 'Test Manager',
      email: managerEmail,
      passwordHash,
      role: 'Manager',
      isActive: true,
    });
    console.log(`✅ Seed user created: ${managerEmail} / ${managerPassword}`);
  }

  // --- Sample stores ---
  const sampleStores = [
    { storeName: 'Chi nhánh Quận 1', address: '123 Nguyễn Huệ, Quận 1, TP.HCM' },
    { storeName: 'Chi nhánh Quận 7', address: '456 Nguyễn Văn Linh, Quận 7, TP.HCM' },
    { storeName: 'Chi nhánh Bình Thạnh', address: '789 Điện Biên Phủ, Bình Thạnh, TP.HCM' },
  ];

  for (const storeData of sampleStores) {
    const [store, created] = await Store.findOrCreate({
      where: { storeName: storeData.storeName },
      defaults: storeData,
    });
    if (created) {
      console.log(`✅ Store created: ${store.storeName}`);
    } else {
      console.log(`Store already exists, skipping: ${store.storeName}`);
    }
  }

  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
