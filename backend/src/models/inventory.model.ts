import { Model, DataTypes, Transaction } from 'sequelize';
import { sequelize } from '../config/database';

export class Inventory extends Model {
  declare id: string;
  declare storeId: string;
  declare productId: string;
  declare quantity: number;
  declare lowStockThreshold: number;
  declare lastUpdated: Date;

  /**
   * `transaction` MUST be passed through when the caller already holds a
   * row lock on this record (e.g. InventoryService.updateInventory's
   * `t.LOCK.UPDATE`) — otherwise this save() runs on a separate pooled
   * connection and blocks forever waiting for the caller's own lock to
   * release, deadlocking the request.
   */
  async adjustQuantity(delta: number, transaction?: Transaction): Promise<void> {
    const newQty = this.quantity + delta;
    if (newQty < 0) throw new Error('Tồn kho không đủ');
    this.quantity = newQty;
    this.lastUpdated = new Date();
    await this.save({ transaction });
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
