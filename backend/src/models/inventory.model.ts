import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export class Inventory extends Model {
  declare id: string;
  declare storeId: string;
  declare productId: string;
  declare quantity: number;
  declare lowStockThreshold: number;
  declare lastUpdated: Date;

  async adjustQuantity(delta: number): Promise<void> {
    const newQty = this.quantity + delta;
    if (newQty < 0) throw new Error('Tồn kho không đủ');
    this.quantity = newQty;
    this.lastUpdated = new Date();
    await this.save();
  }
}

Inventory.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    storeId: { type: DataTypes.UUID, allowNull: false, references: { model: 'stores', key: 'id' } },
    productId: { type: DataTypes.UUID, allowNull: false, references: { model: 'products', key: 'id' } },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lowStockThreshold: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
    lastUpdated: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'inventory',
    timestamps: false,
    indexes: [
      { unique: true, fields: ['storeId', 'productId'] },
    ],
  }
);
