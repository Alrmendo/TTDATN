// CONFIRMED from your models/index.ts that inventory.model.ts already exists
// and exports `{ Inventory }`, with associations
// (Inventory.belongsTo(Store), Inventory.belongsTo(Product) — no alias)
// registered centrally in index.ts, NOT inside this file. This reference
// matches that pattern — only use it to reconcile field names if your real
// file's columns differ (e.g. if `lowStockThreshold`/`lastUpdated` are named
// differently, or `adjustQuantity` isn't implemented yet per the README).

import { DataTypes, Model, Optional, Transaction } from 'sequelize';
import { sequelize } from '../config/database';

interface InventoryAttributes {
  id: string;
  storeId: string;
  productId: string;
  quantity: number;
  lowStockThreshold: number;
  lastUpdated: Date;
}

type InventoryCreationAttributes = Optional<
  InventoryAttributes,
  'id' | 'quantity' | 'lowStockThreshold' | 'lastUpdated'
>;

class Inventory
  extends Model<InventoryAttributes, InventoryCreationAttributes>
  implements InventoryAttributes
{
  public id!: string;
  public storeId!: string;
  public productId!: string;
  public quantity!: number;
  public lowStockThreshold!: number;
  public lastUpdated!: Date;

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
    modelName: 'Inventory',
    tableName: 'inventory',
    timestamps: false,
    indexes: [{ unique: true, fields: ['storeId', 'productId'] }],
  }
);

// NOTE: associations (belongsTo Store/Product) are registered in models/index.ts,
// not here — keep it that way, don't duplicate them in this file.

export { Inventory };
