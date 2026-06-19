import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export class Promotion extends Model {
  declare id: string;
  declare name: string;
  declare type: 'percentage' | 'fixed';
  declare value: number;
  declare productId: string | null;
  declare minOrderValue: number | null;
  declare startDate: Date;
  declare endDate: Date;
  declare isActive: boolean;
  declare createdAt: Date;

  isValid(orderValue: number): boolean {
    const now = new Date();
    if (!this.isActive) return false;
    if (now < this.startDate || now > this.endDate) return false;
    if (this.productId === null && orderValue < (this.minOrderValue ?? 0)) return false;
    return true;
  }

  calculateDiscount(amount: number): number {
    if (this.type === 'percentage') return (amount * this.value) / 100;
    return this.value;
  }
}

Promotion.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.ENUM('percentage', 'fixed'), allowNull: false },
    value: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    productId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'products', key: 'id' },
    },
    minOrderValue: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    startDate: { type: DataTypes.DATE, allowNull: false },
    endDate: { type: DataTypes.DATE, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    sequelize,
    tableName: 'promotions',
    timestamps: true,
    updatedAt: false,
  }
);
