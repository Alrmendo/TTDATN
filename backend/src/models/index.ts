import { sequelize } from '../config/database';
import { User } from './user.model';
import { Store } from './store.model';
import { Category } from './category.model';
import { Product } from './product.model';
import { Inventory } from './inventory.model';
import { Customer } from './customer.model';
import { Invoice } from './invoice.model';
import { InvoiceDetail } from './invoice-detail.model';

// --- Users & Stores ---
User.belongsTo(Store, { foreignKey: 'storeId' });
Store.hasMany(User, { foreignKey: 'storeId' });

// --- Products & Categories ---
Product.belongsTo(Category, { foreignKey: 'categoryId' });
Category.hasMany(Product, { foreignKey: 'categoryId' });

// --- Inventory ---
Inventory.belongsTo(Store, { foreignKey: 'storeId' });
Store.hasMany(Inventory, { foreignKey: 'storeId' });
Inventory.belongsTo(Product, { foreignKey: 'productId' });
Product.hasMany(Inventory, { foreignKey: 'productId' });

// --- Invoices ---
Invoice.belongsTo(Store, { foreignKey: 'storeId' });
Store.hasMany(Invoice, { foreignKey: 'storeId' });
Invoice.belongsTo(User, { foreignKey: 'staffId', as: 'staff' });
Invoice.belongsTo(Customer, { foreignKey: 'customerId' });
Customer.hasMany(Invoice, { foreignKey: 'customerId' });

// --- Invoice Details ---
Invoice.hasMany(InvoiceDetail, { foreignKey: 'invoiceId' });
InvoiceDetail.belongsTo(Invoice, { foreignKey: 'invoiceId' });
InvoiceDetail.belongsTo(Product, { foreignKey: 'productId' });
Product.hasMany(InvoiceDetail, { foreignKey: 'productId' });

export const syncDatabase = async () => {
  await sequelize.sync({ alter: true });
  console.log('✅ Database synced');
};

export { User, Store, Category, Product, Inventory, Customer, Invoice, InvoiceDetail };
