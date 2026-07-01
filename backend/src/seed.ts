import dotenv from 'dotenv';
dotenv.config();

import { v4 as uuidv4 } from 'uuid'; //npm install uuid @types/uuid nếu lỗi uuid
import { connectDB } from './config/database';
import {
  syncDatabase,
  User,
  Store,
  Category,
  Product,
  Inventory,
  Customer,
  LoyaltyPoint,
  Supplier,
  PurchaseOrder,
  PurchaseOrderDetail,
  StockTransfer,
  Promotion,
  Invoice,
  InvoiceDetail,
} from './models';
import bcrypt from 'bcrypt';

// ─── helpers ────────────────────────────────────────────────────────────────

const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randItem = <T>(arr: T[]): T => arr[randInt(0, arr.length - 1)];

/** Date cách hôm nay N ngày, giờ ngẫu nhiên trong khung giờ cửa hàng 8h-21h */
const randomTs = (daysBack: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  d.setHours(randInt(8, 21), randInt(0, 59), randInt(0, 59), 0);
  return d;
};

// ─── seed ───────────────────────────────────────────────────────────────────

const seed = async (): Promise<void> => {
  await connectDB();
  await syncDatabase();

  // ══════════════════════════════════════════════════════════
  // 1. STORES
  // ══════════════════════════════════════════════════════════
  const storeRows = [
    { storeName: 'Chi nhánh Quận 1',    address: '123 Nguyễn Huệ, Quận 1, TP.HCM',          phone: '028 3822 1111' },
    { storeName: 'Chi nhánh Quận 7',    address: '456 Nguyễn Văn Linh, Quận 7, TP.HCM',      phone: '028 3822 2222' },
    { storeName: 'Chi nhánh Bình Thạnh',address: '789 Điện Biên Phủ, Bình Thạnh, TP.HCM',   phone: '028 3822 3333' },
  ];

  const stores: Store[] = [];
  for (const r of storeRows) {
    const [s, created] = await Store.findOrCreate({ where: { storeName: r.storeName }, defaults: r });
    stores.push(s);
    console.log(created ? `✅ Store: ${s.storeName}` : `⏭  Store exists: ${s.storeName}`);
  }
  const [q1, q7, bt] = stores;

  // ══════════════════════════════════════════════════════════
  // 2. USERS
  // ══════════════════════════════════════════════════════════
  const pwHash = await bcrypt.hash('password123', 10);

  const userRows = [
    // Manager (không gắn store)
    { fullName: 'Nguyễn Văn Quản',     email: 'manager@test.com',       role: 'Manager',        storeId: null,  salary: null    },
    // Staff — 1 người/chi nhánh
    { fullName: 'Trần Thị Thoa',      email: 'staff.q1@test.com',      role: 'Staff',          storeId: q1.id, salary: 7000000 },
    { fullName: 'Lê Văn Thu',         email: 'staff.q7@test.com',      role: 'Staff',          storeId: q7.id, salary: 7000000 },
    { fullName: 'Phạm Thị Hồng',     email: 'staff.bt@test.com',      role: 'Staff',          storeId: bt.id, salary: 7000000 },
    // WarehouseStaff — 1 người/chi nhánh
    { fullName: 'Hoàng Văn Lộc',      email: 'warehouse.q1@test.com',  role: 'WarehouseStaff', storeId: q1.id, salary: 7500000 },
    { fullName: 'Đặng Thị Kiêm',      email: 'warehouse.q7@test.com',  role: 'WarehouseStaff', storeId: q7.id, salary: 7500000 },
    { fullName: 'Nguyễn Văn Vũ',         email: 'warehouse.bt@test.com',  role: 'WarehouseStaff', storeId: bt.id, salary: 7500000 },
  ];

  const userMap: Record<string, User> = {};
  for (const r of userRows) {
    const [u, created] = await User.findOrCreate({
      where: { email: r.email },
      defaults: { ...r, passwordHash: pwHash, phone: `09${randInt(10000000,99999999)}`, isActive: true },
    });
    userMap[r.email] = u;
    console.log(created ? `✅ User: ${r.email} (${r.role})` : `⏭  User exists: ${r.email}`);
  }

  const manager     = userMap['manager@test.com'];
  const staffUsers  = [userMap['staff.q1@test.com'], userMap['staff.q7@test.com'], userMap['staff.bt@test.com']];
  const whUsers     = [userMap['warehouse.q1@test.com'], userMap['warehouse.q7@test.com'], userMap['warehouse.bt@test.com']];

  console.log('ℹ️  Mật khẩu mặc định tất cả tài khoản: password123');

  // ══════════════════════════════════════════════════════════
  // 3. CATEGORIES
  // ══════════════════════════════════════════════════════════
  const catRows = [
    { categoryName: 'Đồ uống',              description: 'Nước ngọt, nước suối, trà, cà phê đóng chai' },
    { categoryName: 'Bánh kẹo',             description: 'Bánh mì, bánh quy, kẹo các loại' },
    { categoryName: 'Đồ ăn vặt',            description: 'Snack, mì gói, đồ ăn nhanh' },
    { categoryName: 'Sữa & Sản phẩm từ sữa',description: 'Sữa tươi, sữa chua, phô mai' },
  ];

  const cats: Category[] = [];
  for (const r of catRows) {
    const [c, created] = await Category.findOrCreate({ where: { categoryName: r.categoryName }, defaults: r });
    cats.push(c);
    console.log(created ? `✅ Category: ${c.categoryName}` : `⏭  Category exists: ${c.categoryName}`);
  }
  const [catDU, catBK, catDV, catSua] = cats;

  // ══════════════════════════════════════════════════════════
  // 4. PRODUCTS
  // ══════════════════════════════════════════════════════════
  const productRows = [
    { sku:'SP0001', productName:'Coca Cola 330ml',               price:12000, costPrice:8000,  categoryId:catDU.id  },
    { sku:'SP0002', productName:'Pepsi 330ml',                   price:12000, costPrice:8000,  categoryId:catDU.id  },
    { sku:'SP0003', productName:'Nước suối Lavie 500ml',         price: 8000, costPrice:5000,  categoryId:catDU.id  },
    { sku:'SP0004', productName:'Trà xanh không độ chai 455ml',  price:11000, costPrice:7000,  categoryId:catDU.id  },
    { sku:'SP0005', productName:'Cà phê sữa đóng lon 185ml',     price:14000, costPrice:9500,  categoryId:catDU.id  },
    { sku:'SP0006', productName:'Bánh mì sandwich',              price:25000, costPrice:15000, categoryId:catBK.id  },
    { sku:'SP0007', productName:'Bánh quy bơ hộp 150g',         price:18000, costPrice:11000, categoryId:catBK.id  },
    { sku:'SP0008', productName:'Kẹo dẻo trái cây gói 50g',     price:10000, costPrice:6000,  categoryId:catBK.id  },
    { sku:'SP0009', productName:'Snack khoai tây vị phô mai',    price:15000, costPrice:9000,  categoryId:catDV.id  },
    { sku:'SP0010', productName:'Mì tôm ly hải sản',             price:13000, costPrice:8500,  categoryId:catDV.id  },
    { sku:'SP0011', productName:'Sữa tươi tiệt trùng có đường 1L',price:32000,costPrice:24000,categoryId:catSua.id },
    { sku:'SP0012', productName:'Sữa chua uống vị dâu 180ml',   price: 9000, costPrice:6000,  categoryId:catSua.id },
    { sku:'SP0013', productName:'Phô mai que Con Bò Cười',       price:22000, costPrice:15000, categoryId:catSua.id },
    { sku:'SP0014', productName:'Nước tăng lực Sting 330ml',     price:12000, costPrice:8000,  categoryId:catDU.id  },
    { sku:'SP0015', productName:'Bánh gạo lứt cuộn rong biển',   price:20000, costPrice:13000, categoryId:catDV.id  },
  ];

  const products: Product[] = [];
  for (const r of productRows) {
    const [p, created] = await Product.findOrCreate({
      where: { sku: r.sku },
      defaults: { ...r, isActive: true },
    });
    products.push(p);
    console.log(created ? `✅ Product: ${p.sku} ${p.productName}` : `⏭  Product exists: ${p.sku}`);
  }

  // ══════════════════════════════════════════════════════════
  // 5. INVENTORY
  // ══════════════════════════════════════════════════════════
  for (const store of stores) {
    for (const product of products) {
      // Vài bản ghi sắp hết hàng ở Bình Thạnh để demo cảnh báo
      const qty = (store.id === bt.id && ['SP0003','SP0012'].includes(product.sku))
        ? randInt(2, 8)
        : randInt(50, 200);
      const [, created] = await Inventory.findOrCreate({
        where: { storeId: store.id, productId: product.id },
        defaults: { storeId: store.id, productId: product.id, quantity: qty, lowStockThreshold: 10, lastUpdated: new Date() },
      });
      if (created) console.log(`✅ Inventory: ${product.sku} @ ${store.storeName} qty=${qty}`);
    }
  }

  // ══════════════════════════════════════════════════════════
  // 6. CUSTOMERS + LOYALTY POINTS
  // ══════════════════════════════════════════════════════════
  const customerRows: Array<{
    fullName: string; phone: string; email: string|null; address: string;
    memberLevel: string; points: number;
  }> = [
    { fullName:'Lê Thị Hoa',        phone:'0909111111', email:'hoa.le@gmail.com',       address:'Quận 1, TP.HCM',      memberLevel:'Vàng',        points:850  },
    { fullName:'Nguyễn Văn Hùng',   phone:'0911222333', email:'hung.nguyen@gmail.com',  address:'Quận 7, TP.HCM',      memberLevel:'Bạc',         points:320  },
    { fullName:'Trần Thị Mai',      phone:'0922333444', email:'mai.tran@gmail.com',     address:'Bình Thạnh, TP.HCM',  memberLevel:'Kim cương',   points:2100 },
    { fullName:'Phạm Minh Tuấn',    phone:'0933444555', email:null,                     address:'Quận 3, TP.HCM',      memberLevel:'Đồng',        points:45   },
    { fullName:'Vũ Thị Lan Anh',    phone:'0944555666', email:'lananh.vu@gmail.com',    address:'Quận 1, TP.HCM',      memberLevel:'Bạc',         points:410  },
    { fullName:'Đỗ Văn Quang',      phone:'0955666777', email:null,                     address:'Quận 7, TP.HCM',      memberLevel:'Đồng',        points:60   },
    { fullName:'Bùi Thị Thu Hương', phone:'0966777888', email:'huong.bui@gmail.com',   address:'Bình Thạnh, TP.HCM',  memberLevel:'Vàng',        points:1200 },
    { fullName:'Hoàng Minh Khoa',   phone:'0977888999', email:null,                     address:'Quận 1, TP.HCM',      memberLevel:'Đồng',        points:15   },
    { fullName:'Đinh Thị Ngọc',     phone:'0988999000', email:'ngoc.dinh@gmail.com',   address:'Quận 7, TP.HCM',      memberLevel:'Bạc',         points:290  },
    { fullName:'Lý Văn Phúc',       phone:'0909000111', email:null,                     address:'Bình Thạnh, TP.HCM',  memberLevel:'Đồng',        points:5    },
  ];

  const customers: Customer[] = [];
  for (const r of customerRows) {
    const [c, created] = await Customer.findOrCreate({
      where: { phone: r.phone },
      defaults: { fullName: r.fullName, phone: r.phone, email: r.email, address: r.address, memberLevel: r.memberLevel },
    });
    customers.push(c);
    console.log(created ? `✅ Customer: ${c.fullName} (${r.memberLevel})` : `⏭  Customer exists: ${c.phone}`);

    const [, lpCreated] = await LoyaltyPoint.findOrCreate({
      where: { customerId: c.id },
      defaults: { customerId: c.id, points: r.points },
    });
    if (lpCreated) console.log(`   ↳ Loyalty: ${r.points} điểm`);
  }

  // ══════════════════════════════════════════════════════════
  // 7. SUPPLIERS
  // ══════════════════════════════════════════════════════════
  const supplierRows = [
    { supplierName:'Công ty TNHH Phân phối Nước giải khát Miền Nam', contactInfo:'lienhe@ngkmiennam.vn – 028 3999 1111' },
    { supplierName:'Công ty CP Thực phẩm An Bình',                    contactInfo:'sales@anbinhfood.vn – 028 3999 2222'  },
    { supplierName:'Đại lý Sữa & Bánh kẹo Hoàng Gia',                contactInfo:'hoanggia.dl@gmail.com – 0909 888 777' },
  ];

  const suppliers: Supplier[] = [];
  for (const r of supplierRows) {
    const [s, created] = await Supplier.findOrCreate({ where: { supplierName: r.supplierName }, defaults: r });
    suppliers.push(s);
    console.log(created ? `✅ Supplier: ${s.supplierName}` : `⏭  Supplier exists: ${s.supplierName}`);
  }

  // ══════════════════════════════════════════════════════════
  // 8. PROMOTIONS
  // ══════════════════════════════════════════════════════════
  const promoRows: Array<{
    name:string; type:'percentage'|'fixed'; value:number;
    productId:string|null; minOrderValue:number|null;
    startDate:Date; endDate:Date; isActive:boolean;
  }> = [
    { name:'Giảm 10% cho đơn từ 100.000đ', type:'percentage', value:10,   productId:null, minOrderValue:100000,
      startDate:new Date(Date.now()-10*86400000), endDate:new Date(Date.now()+20*86400000), isActive:true },
    { name:'Giảm 5.000đ cho đơn từ 50.000đ', type:'fixed',  value:5000,  productId:null, minOrderValue:50000,
      startDate:new Date(Date.now()-10*86400000), endDate:new Date(Date.now()+20*86400000), isActive:true },
    { name:'Giảm 2.000đ Coca Cola',           type:'fixed',  value:2000,
      productId: products.find(p=>p.sku==='SP0001')?.id ?? null,
      minOrderValue:null,
      startDate:new Date(Date.now()-10*86400000), endDate:new Date(Date.now()+20*86400000), isActive:true },
    { name:'Khuyến mãi Tết (đã hết hạn)',     type:'percentage', value:15, productId:null, minOrderValue:200000,
      startDate:new Date(Date.now()-60*86400000), endDate:new Date(Date.now()-30*86400000), isActive:false },
  ];

  const promotions: Promotion[] = [];
  for (const r of promoRows) {
    const [promo, created] = await Promotion.findOrCreate({ where: { name: r.name }, defaults: r });
    promotions.push(promo);
    console.log(created ? `✅ Promotion: ${promo.name}` : `⏭  Promotion exists: ${promo.name}`);
  }
  const [promoP10, promoF5k] = promotions; // hai promo đang active dùng cho invoices

  // ══════════════════════════════════════════════════════════
  // 9. PURCHASE ORDERS
  // ══════════════════════════════════════════════════════════
  const poCount = await PurchaseOrder.count();
  if (poCount > 0) {
    console.log(`⏭  PurchaseOrders already exist (${poCount}), skipping.`);
  } else {
    const poStatuses: Array<'pending'|'completed'|'cancelled'> = ['completed','completed','completed','pending','cancelled','completed','pending'];
    for (let day = 6; day >= 0; day--) {
      const store    = stores[day % stores.length];
      const supplier = suppliers[day % suppliers.length];
      const status   = poStatuses[day];
      const wh       = whUsers.find(w => w.storeId === store.id) ?? whUsers[0];
      const lineProds = [...products].sort(()=>0.5-Math.random()).slice(0,randInt(2,4));
      const detailData = lineProds.map(p => ({ p, qty:randInt(20,80), cost:Number(p.costPrice)||5000 }));
      const totalCost  = detailData.reduce((s,d)=>s+d.qty*d.cost, 0);
      const createdAt  = randomTs(day);

      const po = await PurchaseOrder.create({
        supplierId:  supplier.id,
        storeId:     store.id,
        status,
        totalCost,
        createdBy:   manager.id,
        confirmedBy: status==='completed' ? wh.id : null,
        createdAt,
        confirmedAt: status==='completed' ? randomTs(Math.max(day-1,0)) : null,
      });
      await PurchaseOrderDetail.bulkCreate(detailData.map(d=>({
        purchaseOrderId: po.id,
        productId:       d.p.id,
        quantity:        d.qty,
        receivedQuantity:status==='completed' ? d.qty : null,
        unitCost:        d.cost,
      })));
      console.log(`✅ PO day-${day}: ${supplier.supplierName.slice(0,20)}… → ${store.storeName} [${status}] ${totalCost.toLocaleString('vi-VN')}đ`);
    }
  }

  // ══════════════════════════════════════════════════════════
  // 10. STOCK TRANSFERS
  // ══════════════════════════════════════════════════════════
  const stCount = await StockTransfer.count();
  if (stCount > 0) {
    console.log(`⏭  StockTransfers already exist (${stCount}), skipping.`);
  } else {
    const pairs: Array<[Store,Store,number]> = [[q1,q7,6],[q7,bt,4],[bt,q1,2],[q1,bt,1]];
    for (const [from, to, day] of pairs) {
      const product = randItem(products);
      const qty     = randInt(10,40);
      const status: 'pending'|'completed' = day > 1 ? 'completed' : 'pending';
      const wh      = whUsers.find(w=>w.storeId===to.id) ?? whUsers[0];
      await StockTransfer.create({
        fromStoreId: from.id, toStoreId: to.id, productId: product.id, quantity: qty, status,
        createdBy:   manager.id,
        confirmedBy: status==='completed' ? wh.id : null,
        createdAt:   randomTs(day),
        confirmedAt: status==='completed' ? randomTs(Math.max(day-1,0)) : null,
      });
      console.log(`✅ Transfer: ${product.sku} ×${qty} ${from.storeName}→${to.storeName} [${status}]`);
    }
  }

  // ══════════════════════════════════════════════════════════
  // 11. INVOICES + INVOICE DETAILS
  // ══════════════════════════════════════════════════════════
  const invoiceCount = await Invoice.count();
  if (invoiceCount > 0) {
    console.log(`⏭  Invoices already exist (${invoiceCount}), skipping.`);
  } else {
    const pmethods = ['cash','card','transfer'];

    // Build staff-by-store lookup
    const staffByStore: Record<string, User[]> = {};
    for (const store of stores) {
      staffByStore[store.id] = staffUsers.filter(u=>u.storeId===store.id);
    }

    let totalInvoices = 0;

    for (let day = 6; day >= 0; day--) {
      const targetRevenue = randInt(2_000_000, 12_000_000);
      let accumulated     = 0;

      // Chuẩn bị batch arrays cho ngày này
      const invoiceBatch:       object[] = [];
      const detailBatch:        object[] = [];

      while (accumulated < targetRevenue) {
        const store  = randItem(stores);
        const staff  = staffByStore[store.id]?.length
          ? randItem(staffByStore[store.id])
          : randItem(staffUsers);

        const isWalkIn    = Math.random() < 0.25;      // 25% khách vãng lai
        const customer    = isWalkIn ? null : randItem(customers);
        const isCancelled = Math.random() < 0.05;      // 5% đơn hủy

        // 1–4 dòng sản phẩm, không trùng nhau trong đơn
        const lineProds = [...products].sort(()=>0.5-Math.random()).slice(0,randInt(1,4));
        const lines = lineProds.map(p => {
          const qty       = randInt(1,6);
          const unitPrice = Number(p.price);
          return { productId:p.id, qty, unitPrice, sub: qty*unitPrice };
        });
        const subtotal = lines.reduce((s,l)=>s+l.sub, 0);

        // Khuyến mãi 20% cơ hội nếu đơn đủ điều kiện
        let promotionId: string|null = null;
        let discountAmount = 0;
        if (!isCancelled && Math.random() < 0.20) {
          if (subtotal >= 100000) {
            promotionId   = promoP10.id;
            discountAmount = Math.round(subtotal * 10 / 100);
          } else if (subtotal >= 50000) {
            promotionId   = promoF5k.id;
            discountAmount = 5000;
          }
        }
        const totalAmount = subtotal - discountAmount;
        const createdAt   = randomTs(day);
        const invoiceId   = uuidv4();

        invoiceBatch.push({
          id:            invoiceId,
          storeId:       store.id,
          staffId:       staff.id,
          customerId:    customer?.id ?? null,
          promotionId,
          status:        isCancelled ? 'cancelled' : 'completed',
          subtotal,
          discountAmount,
          totalAmount,
          paymentMethod: isCancelled ? null : randItem(pmethods),
          paymentStatus: isCancelled ? 'failed'  : 'success',
          paidAt:        isCancelled ? null : createdAt,
          createdAt,
          updatedAt:     createdAt,
        });

        for (const l of lines) {
          detailBatch.push({
            id:          uuidv4(),
            invoiceId,
            productId:   l.productId,
            quantity:    l.qty,
            unitPrice:   l.unitPrice,
            subtotal:    l.sub,
          });
        }

        if (!isCancelled) accumulated += totalAmount;
      }

      // bulkCreate toàn bộ ngày một lần
      await Invoice.bulkCreate(invoiceBatch as any[]);
      await InvoiceDetail.bulkCreate(detailBatch as any[]);

      totalInvoices += invoiceBatch.length;
      console.log(
        `✅ Day-${day}: ${invoiceBatch.length} đơn | doanh thu ~${accumulated.toLocaleString('vi-VN')}đ` +
        ` | mục tiêu ${targetRevenue.toLocaleString('vi-VN')}đ`
      );
    }

    console.log(`\n📦 Tổng cộng ${totalInvoices} invoices đã seed.`);
  }

  // ══════════════════════════════════════════════════════════
  console.log('\n🎉 Seed hoàn tất!');
  console.log('   Manager:        manager@test.com / password123');
  console.log('   Staff (mẫu):    staff.q1@test.com / password123');
  console.log('   WarehouseStaff: warehouse.q1@test.com / password123');
  process.exit(0);
};

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
