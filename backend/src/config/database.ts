import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL as string;
const useSSL = databaseUrl?.includes('render.com');

export const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: false,
  ...(useSSL && {
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
    },
  }),
});

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected successfully');
    // Cho phép tìm kiếm tiếng Việt không phân biệt dấu (ILIKE + unaccent)
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS unaccent;');
  } catch (error) {
    console.error('❌ Unable to connect to database:', error);
    process.exit(1);
  }
};