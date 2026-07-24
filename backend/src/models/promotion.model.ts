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
    // DECIMAL columns come back as strings from Postgres — coerce explicitly
    const min = this.minOrderValue != null ? Number(this.minOrderValue) : 0;
    if (this.productId === null && orderValue < min) return false;
    return true;
  }

  calculateDiscount(amount: number): number {
    // DECIMAL columns come back as strings from Postgres — coerce explicitly
    const v = Number(this.value);
    if (this.type === 'percentage') return (amount * v) / 100;
    return v;
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
