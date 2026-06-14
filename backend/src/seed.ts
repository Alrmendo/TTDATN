import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from './config/database';
import { syncDatabase, User, Store, Category, Product, Inventory, Customer } from './models';
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

  // --- Default category ---
  const [category, catCreated] = await Category.findOrCreate({
    where: { categoryName: 'Đồ uống' },
    defaults: { categoryName: 'Đồ uống', description: 'Beverages' },
  });
  if (catCreated) {
    console.log(`✅ Category created: ${category.categoryName}`);
  } else {
    console.log(`Category already exists, skipping: ${category.categoryName}`);
  }

  // --- Sample products ---
  const sampleProducts = [
    { sku: 'SP001', productName: 'Coca Cola 330ml', price: 12000, costPrice: 8000 },
    { sku: 'SP002', productName: 'Bánh mì sandwich', price: 25000, costPrice: 15000 },
    { sku: 'SP003', productName: 'Nước suối Lavie 500ml', price: 8000, costPrice: 5000 },
  ];

  const createdProducts: Product[] = [];
  for (const p of sampleProducts) {
    const [product, created] = await Product.findOrCreate({
      where: { sku: p.sku },
      defaults: { ...p, categoryId: category.id, isActive: true },
    });
    createdProducts.push(product);
    if (created) {
      console.log(`✅ Product created: ${product.productName} (${product.sku})`);
    } else {
      console.log(`Product already exists, skipping: ${product.sku}`);
    }
  }

  // --- Initial inventory at Chi nhánh Quận 1 ---
  const q1Store = await Store.findOne({ where: { storeName: 'Chi nhánh Quận 1' } });
  if (!q1Store) {
    console.log('⚠️  Chi nhánh Quận 1 not found, skipping inventory seed.');
  } else {
    for (const product of createdProducts) {
      const [, created] = await Inventory.findOrCreate({
        where: { storeId: q1Store.id, productId: product.id },
        defaults: {
          storeId: q1Store.id,
          productId: product.id,
          quantity: 100,
          lowStockThreshold: 10,
          lastUpdated: new Date(),
        },
      });
      if (created) {
        console.log(`✅ Inventory seeded: ${product.productName} @ ${q1Store.storeName} (qty: 100)`);
      } else {
        console.log(`Inventory already exists, skipping: ${product.sku} @ ${q1Store.storeName}`);
      }
    }
  }

  // --- Sample customer ---
  const [customer, custCreated] = await Customer.findOrCreate({
    where: { phone: '0909999999' },
    defaults: { fullName: 'Lê Thị Khách', phone: '0909999999' },
  });
  if (custCreated) {
    console.log(`✅ Customer created: ${customer.fullName} (${customer.phone})`);
  } else {
    console.log(`Customer already exists, skipping: ${customer.phone}`);
  }

  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
