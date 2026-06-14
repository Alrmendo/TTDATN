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

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await syncDatabase();
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
};

startServer();