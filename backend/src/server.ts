import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
import { syncDatabase } from './models';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
import authRoutes from './routes/auth.routes';
app.use('/api/auth', authRoutes);

import accountRoutes from './routes/account.routes';
app.use('/api/accounts', accountRoutes);

import storeRoutes from './routes/store.routes';
app.use('/api/stores', storeRoutes);

import inventoryRoutes from './routes/inventory.routes';
app.use('/api/inventory', inventoryRoutes);

import orderRoutes from './routes/order.routes';
app.use('/api/invoices', orderRoutes);

import customerRoutes from './routes/customer.routes';
app.use('/api/customers', customerRoutes);

import loyaltyPointRoutes from './routes/loyaltyPointRoutes';
app.use('/api/loyalty-points', loyaltyPointRoutes);

import productRoutes from './routes/product.routes';
app.use('/api/products', productRoutes);

import categoryRoutes from './routes/category.routes';
app.use('/api/categories', categoryRoutes);

import promotionRoutes from './routes/promotion.routes';
app.use('/api/promotions', promotionRoutes);

import purchaseOrderRoutes from './routes/purchase-order.routes';
app.use('/api/purchase-orders', purchaseOrderRoutes);

import supplierRoutes from './routes/supplier.routes';
app.use('/api/suppliers', supplierRoutes);

import stockTransferRoutes from './routes/stock-transfer.routes';
app.use('/api/stock-transfers', stockTransferRoutes);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await syncDatabase();
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
};

startServer();