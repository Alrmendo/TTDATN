import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export class Invoice extends Model {
  declare id: string;
  declare storeId: string;
  declare staffId: string;
  declare customerId: string | null;
  declare promotionId: string | null;
  declare status: 'draft' | 'completed' | 'cancelled';
  declare subtotal: number;
  declare discountAmount: number;
  declare totalAmount: number;
  declare paymentMethod: string | null;
  declare paymentStatus: 'pending' | 'success' | 'failed';
  declare paidAt: Date | null;
  declare createdAt: Date;
}

Invoice.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    storeId: { type: DataTypes.UUID, allowNull: false },
    staffId: { type: DataTypes.UUID, allowNull: false },
    customerId: { type: DataTypes.UUID, allowNull: true },
    promotionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'promotions', key: 'id' },
    },
    status: {
      type: DataTypes.ENUM('draft', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'draft',
    },
    subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    discountAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    totalAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    paymentMethod: { type: DataTypes.STRING, allowNull: true },
    paymentStatus: {
      type: DataTypes.ENUM('pending', 'success', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    paidAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    tableName: 'invoices',
    timestamps: true,
    updatedAt: false,
  }
);
