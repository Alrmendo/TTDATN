import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export class Product extends Model {
  declare id: string;
  declare productName: string;
  declare sku: string;
  declare categoryId: string;
  declare description: string | null;
  declare price: number;
  declare costPrice: number | null;
  declare isActive: boolean;
}

Product.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    productName: { type: DataTypes.STRING, allowNull: false },
    sku: { type: DataTypes.STRING, allowNull: false, unique: true },
    categoryId: { type: DataTypes.UUID, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: true },
    price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    costPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    sequelize,
    tableName: 'products',
    timestamps: true,
  }
);
