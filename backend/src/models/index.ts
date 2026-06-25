import { sequelize } from '../config/database';
import { User } from './user.model';
import { Store } from './store.model';
import { Category } from './category.model';
import { Product } from './product.model';
import { Inventory } from './inventory.model';
import { Customer } from './customer.model';
import { Invoice } from './invoice.model';
import { InvoiceDetail } from './invoice-detail.model';
import { Promotion } from './promotion.model';
import { LoyaltyPoint } from './loyalty-point.model';
import { Supplier } from './supplier.model';
import { PurchaseOrder } from './purchase-order.model';
import { PurchaseOrderDetail } from './purchase-order-detail.model';
import { StockTransfer } from './stock-transfer.model';

// --- Users & Stores ---
User.belongsTo(Store, { foreignKey: 'storeId' });
Store.hasMany(User, { foreignKey: 'storeId' });

// --- Products & Categories ---
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
Category.hasMany(Product, { foreignKey: 'categoryId' });

// --- Inventory ---
Inventory.belongsTo(Store, { foreignKey: 'storeId' });
Store.hasMany(Inventory, { foreignKey: 'storeId' });
Inventory.belongsTo(Product, { foreignKey: 'productId' });
Product.hasMany(Inventory, { foreignKey: 'productId' });

// --- Suppliers ---
Supplier.hasMany(PurchaseOrder, { foreignKey: 'supplierId' });
PurchaseOrder.belongsTo(Supplier, { foreignKey: 'supplierId' });

// --- Purchase Orders ---
Store.hasMany(PurchaseOrder, { foreignKey: 'storeId' });
PurchaseOrder.belongsTo(Store, { foreignKey: 'storeId' });
PurchaseOrder.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
PurchaseOrder.belongsTo(User, { foreignKey: 'confirmedBy', as: 'confirmer' });
PurchaseOrder.hasMany(PurchaseOrderDetail, { foreignKey: 'purchaseOrderId', as: 'details', onDelete: 'CASCADE' });
PurchaseOrderDetail.belongsTo(PurchaseOrder, { foreignKey: 'purchaseOrderId' });
PurchaseOrderDetail.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Product.hasMany(PurchaseOrderDetail, { foreignKey: 'productId' });

// --- Invoices ---
Invoice.belongsTo(Store, { foreignKey: 'storeId' });
Store.hasMany(Invoice, { foreignKey: 'storeId' });
Invoice.belongsTo(User, { foreignKey: 'staffId', as: 'staff' });
Invoice.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
Customer.hasMany(Invoice, { foreignKey: 'customerId' });

// --- Invoice Details ---
Invoice.hasMany(InvoiceDetail, { foreignKey: 'invoiceId', as: 'invoiceDetails' });
InvoiceDetail.belongsTo(Invoice, { foreignKey: 'invoiceId' });
InvoiceDetail.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Product.hasMany(InvoiceDetail, { foreignKey: 'productId' });

// --- Promotions ---
Promotion.belongsTo(Product, { foreignKey: 'productId' });
Product.hasMany(Promotion, { foreignKey: 'productId' });
Invoice.belongsTo(Promotion, { foreignKey: 'promotionId', as: 'promotion' });
Promotion.hasMany(Invoice, { foreignKey: 'promotionId' });

// --- Stock Transfers ---
StockTransfer.belongsTo(Store, { foreignKey: 'fromStoreId', as: 'fromStore' });
StockTransfer.belongsTo(Store, { foreignKey: 'toStoreId', as: 'toStore' });
StockTransfer.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
StockTransfer.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
StockTransfer.belongsTo(User, { foreignKey: 'confirmedBy', as: 'confirmer' });

// --- Loyalty Points ---
LoyaltyPoint.belongsTo(Customer, { foreignKey: 'customerId' });
Customer.hasOne(LoyaltyPoint, { foreignKey: 'customerId', as: 'loyaltyPoints' });

export const syncDatabase = async () => {
  await sequelize.sync({ alter: true });
  console.log('✅ Database synced');
};

export {
  User,
  Store,
  Category,
  Product,
  Inventory,
  Customer,
  Invoice,
  InvoiceDetail,
  Promotion,
  LoyaltyPoint,
  Supplier,
  PurchaseOrder,
  PurchaseOrderDetail,
  StockTransfer,
};
